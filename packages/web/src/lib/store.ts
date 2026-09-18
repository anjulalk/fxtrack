import { computed, ref, shallowRef, watch } from 'vue'
import {
  field,
  WINS,
  type Bank,
  type Col,
  type Hist,
  type Kind,
  type Latest,
  type Mode,
  type WinId,
} from '@fxtrack/shared'
import { getHist, getLatest } from './api'
import { grade, rank, score, stat } from './stats'

export const WINDOWS = WINS
export type { WinId }

const CB = 'cbsl'

export const mode = ref<Mode>('buy')
export const kind = ref<Kind>('tt')
export const win = ref<WinId>('3m')
export const amount = ref(1000)

export const latest = shallowRef<Latest | null>(null)
export const hist = shallowRef<Hist | null>(null)
export const busy = ref(true)
export const winBusy = ref(false)
export const err = ref<string | null>(null)

const cache = new Map<WinId, Hist>()

/** One snapshot file per window, kept after the first fetch so switching back is instant. */
async function pull(w: WinId): Promise<void> {
  const hit = cache.get(w)
  if (hit) {
    hist.value = hit
    return
  }
  winBusy.value = true
  try {
    const h = await getHist(w)
    cache.set(w, h)
    if (win.value === w) hist.value = h
  } finally {
    if (win.value === w) winBusy.value = false
  }
}

export async function load(): Promise<void> {
  busy.value = true
  err.value = null
  try {
    const [a] = await Promise.all([getLatest(), pull(win.value)])
    latest.value = a
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

watch(win, (w) => {
  pull(w).catch((e) => {
    err.value = e instanceof Error ? e.message : String(e)
  })
})

export const winDays = computed(() => WINDOWS.find((w) => w.id === win.value)!.days)

export const bankMap = computed(() => {
  const m = new Map<string, Bank>()
  for (const b of latest.value?.banks ?? []) m.set(b.id, b)
  return m
})

/** Retail banks only; the central bank rate is a reference, not a dealable price. */
export const rows = computed(() => {
  const l = latest.value
  if (!l) return []
  const retail = l.rates.filter((r) => bankMap.value.get(r.bank)?.kind === 'bank')
  return rank(retail, mode.value, kind.value)
})

export const best = computed(() => rows.value[0] ?? null)
export const worst = computed(() => rows.value[rows.value.length - 1] ?? null)

/** Spread between the best and worst bank right now, on the amount entered. */
export const save = computed(() => {
  const b = best.value
  const w = worst.value
  if (!b || !w) return 0
  return Math.abs(w.v - b.v) * amount.value
})

/** Daily series of the best rate available across banks, for the chart. */
export const bestSeries = computed<{ days: string[]; vals: Col }>(() => {
  const h = hist.value
  if (!h) return { days: [], vals: [] }

  const f = field(mode.value, kind.value)
  const low = mode.value === 'buy'
  const cols: Col[] = []
  for (const [id, s] of Object.entries(h.ser)) {
    if (bankMap.value.get(id)?.kind !== 'bank') continue
    cols.push(s[f])
  }

  const vals: Col = h.days.map((_, i) => {
    let acc: number | null = null
    for (const c of cols) {
      const v = c[i]
      if (v == null) continue
      if (acc == null || (low ? v < acc : v > acc)) acc = v
    }
    return acc
  })

  const n = winDays.value
  if (n >= h.days.length) return { days: h.days, vals }
  return { days: h.days.slice(-n), vals: vals.slice(-n) }
})

/**
 * Central bank daily average, on the same axis as `bestSeries`. This is a
 * market reference spanning 20 years, not a dealable rate at any one bank.
 * Only TT is published, so cash mode still charts the wire average.
 */
export const cbslSeries = computed<{ days: string[]; vals: Col }>(() => {
  const h = hist.value
  const s = h?.ser[CB]
  if (!h || !s) return { days: [], vals: [] }

  const vals = s[field(mode.value, 'tt')]
  const n = winDays.value
  if (n >= h.days.length) return { days: h.days, vals }
  return { days: h.days.slice(-n), vals: vals.slice(-n) }
})

export const trend = computed(() => stat(bestSeries.value.vals))

/** Range stats for the market line. Deep history, so this is what drives timing. */
export const mkt = computed(() => stat(cbslSeries.value.vals))

const MIN_N = 10

/**
 * "Is now a good moment?" is a question about the market, not about one bank.
 * Per-bank history only starts when we do, so a fresh deploy would otherwise
 * grade a single observation as mid-range. The market average has 20 years.
 */
export const trendScore = computed(() =>
  mkt.value.n < MIN_N ? null : score(mkt.value, mode.value),
)
export const trendGrade = computed(() => grade(trendScore.value))

/** Distinct hues for compared banks; readable on the dark canvas. */
const PALETTE = [
  '#5b8dff',
  '#ff6ec7',
  '#ffc043',
  '#2ee6a8',
  '#a78bfa',
  '#ff8a5c',
  '#4dd0e1',
  '#c3e88d',
  '#f48fb1',
  '#9ccc65',
]

/** Colour is keyed to the bank, not to selection order, so it never shifts. */
export const tint = computed(() => {
  const m = new Map<string, string>()
  const ids = (latest.value?.banks ?? [])
    .filter((b) => b.kind === 'bank')
    .map((b) => b.id)
    .sort()
  ids.forEach((id, i) => m.set(id, PALETTE[i % PALETTE.length]!))
  return m
})

export const picks = ref<string[]>([])

export function toggle(id: string): void {
  const i = picks.value.indexOf(id)
  if (i === -1) picks.value = [...picks.value, id]
  else picks.value = picks.value.filter((x) => x !== id)
}

export function clearPicks(): void {
  picks.value = []
}

export interface Line {
  id: string
  name: string
  color: string
  days: string[]
  vals: Col
}

/** One series per compared bank, sliced to the same axis as `bestSeries`. */
export const picked = computed<Line[]>(() => {
  const h = hist.value
  if (!h) return []

  const f = field(mode.value, kind.value)
  const n = winDays.value
  const days = n >= h.days.length ? h.days : h.days.slice(-n)

  return picks.value.flatMap((id) => {
    const s = h.ser[id]
    if (!s) return []
    const raw = s[f]
    return [
      {
        id,
        name: bankMap.value.get(id)?.name ?? id,
        color: tint.value.get(id) ?? PALETTE[0]!,
        days,
        vals: n >= raw.length ? raw : raw.slice(-n),
      },
    ]
  })
})
