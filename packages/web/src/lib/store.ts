import { computed, reactive, ref, shallowRef, toRefs, watch } from 'vue'
import {
  field,
  WINS,
  type Bank,
  type Col,
  type Hist,
  type Intra,
  type Latest,
  type WinId,
} from '@fxtrack/shared'
import { getHist, getLatest } from './api'
import { quote } from './fees'
import { loadSettings, saveSettings } from './settings'
import { grade, rank, score, stat, type Row } from './stats'

export const WINDOWS = WINS
export type { WinId }

const CB = 'cbsl'

const restored = loadSettings()
const state = reactive(restored.value)
const settingRefs = toRefs(state)
let seeded = restored.found

export const mode = settingRefs.mode
export const kind = settingRefs.kind
export const win = settingRefs.win
export const amount = settingRefs.amount
export const picks = settingRefs.picks

if (restored.migrated) saveSettings(state)
watch(
  state,
  () => {
    if (restored.supported) saveSettings(state)
  },
  { deep: true },
)

export const latest = shallowRef<Latest | null>(null)
type Snap = Hist | Intra

export const hist = shallowRef<Snap | null>(null)
export const busy = ref(true)
export const winBusy = ref(false)
export const err = ref<string | null>(null)

const cache = new Map<WinId, Snap>()
const now = ref(Math.floor(Date.now() / 1000))
if (typeof window !== 'undefined') {
  window.setInterval(() => {
    now.value = Math.floor(Date.now() / 1000)
  }, 60_000)
}

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
    seedPicks()
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

/** A card can only ever buy dollars, so that board has no sell side. */
watch(mode, (m) => {
  if (m === 'sell' && kind.value === 'card') kind.value = 'tt'
})

const activeWindow = computed(() => WINDOWS.find((w) => w.id === win.value)!)
export const winDays = computed(() =>
  activeWindow.value.intra ? Number.MAX_SAFE_INTEGER : activeWindow.value.days,
)

function axis(h: Snap): number[] {
  if ('ts' in h) return h.ts
  return h.days.map((d) => Date.parse(`${d}T00:00:00Z`) / 1000)
}

export const bankMap = computed(() => {
  const m = new Map<string, Bank>()
  for (const b of latest.value?.banks ?? []) m.set(b.id, b)
  return m
})

/**
 * Scrapes run four times a day, so the longest honest gap is the ~15h
 * overnight one. A full day with no fresh read means the number we hold is
 * last-known rather than current, so the bank is dropped from the board.
 */
const STALE = 24 * 3600

export const stale = computed(() => {
  const l = latest.value
  const s = new Set<string>()
  if (l) for (const r of l.rates) if (now.value - r.ts > STALE) s.add(r.bank)
  return s
})

export function icon(id: string): string {
  return `${import.meta.env.BASE_URL}banks/${id}.png`
}

/** Retail banks only; the central bank rate is a reference, not a dealable price. */
export const rows = computed<Row[]>(() => {
  const l = latest.value
  if (!l) return []
  const s = stale.value
  const out = rank(
    l.rates.filter((r) => bankMap.value.get(r.bank)?.kind === 'bank' && !s.has(r.bank)),
    mode.value,
    kind.value,
  )
  if (kind.value !== 'card') return out
  return out.map((r) => ({ ...r, v: quote(r.v, kind.value), gap: quote(r.gap, kind.value) }))
})

export const bestRows = computed<Row[]>(() => {
  const top = rows.value[0]?.v
  return top == null ? [] : rows.value.filter((r) => r.v === top)
})

export const worstRows = computed<Row[]>(() => {
  const f = rows.value
  const bottom = f[f.length - 1]?.v
  return bottom == null ? [] : f.filter((r) => r.v === bottom)
})

export const best = computed(() => bestRows.value[0] ?? null)
export const worst = computed(() => worstRows.value[0] ?? null)

export const compareRows = computed<Row[]>(() => {
  const out: Row[] = []
  const seen = new Set<string>()
  for (const r of [...bestRows.value, ...rows.value.filter((r) => picks.value.includes(r.rate.bank))]) {
    if (seen.has(r.rate.bank)) continue
    seen.add(r.rate.bank)
    out.push(r)
  }
  return out
})

function seedPicks(): void {
  if (seeded) return
  const ids = [...bestRows.value, ...worstRows.value].map((r) => r.rate.bank)
  if (!ids.length) return
  picks.value = [...new Set(ids)]
  seeded = true
}

/** Spread between the best and worst bank right now, on the amount entered. */
export const save = computed(() => {
  const b = best.value
  const w = worst.value
  if (!b || !w) return 0
  return Math.abs(w.v - b.v) * amount.value
})

/** Daily series of the best rate available across banks, for the chart. */
export interface Plot {
  ts: number[]
  vals: Col
}

export const bestSeries = computed<Plot>(() => {
  const h = hist.value
  if (!h) return { ts: [], vals: [] }

  const f = field(mode.value, kind.value)
  const low = mode.value === 'buy'
  const all = axis(h)
  const cols: Col[] = []
  for (const [id, s] of Object.entries(h.ser)) {
    if (bankMap.value.get(id)?.kind !== 'bank') continue
    if (stale.value.has(id)) continue
    cols.push(s[f])
  }

  const vals: Col = all.map((_, i) => {
    let acc: number | null = null
    for (const c of cols) {
      const v = c[i]
      if (v == null) continue
      if (acc == null || (low ? v < acc : v > acc)) acc = v
    }
    return acc == null ? null : quote(acc, kind.value)
  })

  const n = winDays.value
  if (n >= all.length) return { ts: all, vals }
  return { ts: all.slice(-n), vals: vals.slice(-n) }
})

/**
 * CBSL's indicative spot mid, on the same axis as `bestSeries`. It is the
 * benchmark the market prices off, not a dealable rate, so the distance between
 * a bank's line and this one is the margin that bank is charging.
 *
 * A mid has no buy/sell side, so the baseline is the same line in either mode.
 */
export const cbslSeries = computed<Plot>(() => {
  const h = hist.value
  const s = h?.ser[CB]
  if (!h || !s) return { ts: [], vals: [] }

  const vals = s.mid
  const all = axis(h)
  const n = winDays.value
  if (n >= all.length) return { ts: all, vals }
  return { ts: all.slice(-n), vals: vals.slice(-n) }
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

/** Distinct hues for compared banks; readable on the paper canvas. */
const PALETTE = [
  '#2563eb',
  '#c2185b',
  '#a8790d',
  '#157a58',
  '#7c3aed',
  '#c1603c',
  '#0e7490',
  '#4d7c0f',
  '#b3323f',
  '#525252',
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
  ts: number[]
  vals: Col
}

/** One series per compared bank, sliced to the same axis as `bestSeries`. */
export const picked = computed<Line[]>(() => {
  const h = hist.value
  if (!h) return []

  const f = field(mode.value, kind.value)
  const n = winDays.value
  const all = axis(h)
  const ts = n >= all.length ? all : all.slice(-n)

  return picks.value.flatMap((id) => {
    const s = h.ser[id]
    if (!s || stale.value.has(id)) return []
    const raw = s[f]
    return [
      {
        id,
        name: bankMap.value.get(id)?.name ?? id,
        color: tint.value.get(id) ?? PALETTE[0]!,
        ts,
        vals: (n >= raw.length ? raw : raw.slice(-n)).map((v) =>
          v == null ? null : quote(v, kind.value),
        ),
      },
    ]
  })
})
