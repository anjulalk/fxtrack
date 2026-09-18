import { cmp, lowBetter, pick, type Col, type Kind, type Mode, type Rate } from '@fxtrack/shared'

function tail(col: Col, n: number): number[] {
  const out: number[] = []
  for (let i = Math.max(0, col.length - n); i < col.length; i++) {
    const v = col[i]
    if (v != null) out.push(v)
  }
  return out
}

export interface Stat {
  n: number
  first: number | null
  last: number | null
  min: number | null
  max: number | null
  avg: number | null
  chg: number | null
  chgPct: number | null
  /** Where `last` sits inside [min, max]. 0 = at the low, 1 = at the high. */
  pos: number | null
}

const EMPTY: Stat = {
  n: 0,
  first: null,
  last: null,
  min: null,
  max: null,
  avg: null,
  chg: null,
  chgPct: null,
  pos: null,
}

export function stat(col: Col, window = col.length): Stat {
  const v = tail(col, window)
  if (!v.length) return EMPTY

  const first = v[0]!
  const last = v[v.length - 1]!
  let min = first
  let max = first
  let sum = 0
  for (const x of v) {
    if (x < min) min = x
    if (x > max) max = x
    sum += x
  }

  const chg = last - first
  return {
    n: v.length,
    first,
    last,
    min,
    max,
    avg: sum / v.length,
    chg,
    chgPct: first === 0 ? null : (chg / first) * 100,
    pos: max === min ? 0.5 : (last - min) / (max - min),
  }
}

/** 0 = worst moment in the window for this user, 1 = best. */
export function score(s: Stat, m: Mode): number | null {
  if (s.pos == null) return null
  return lowBetter(m) ? 1 - s.pos : s.pos
}

export type Grade = 'great' | 'good' | 'fair' | 'poor'

export function grade(sc: number | null): Grade | null {
  if (sc == null) return null
  if (sc >= 0.75) return 'great'
  if (sc >= 0.5) return 'good'
  if (sc >= 0.25) return 'fair'
  return 'poor'
}

export interface Row {
  rate: Rate
  v: number
  /** Difference from the best available rate, in LKR. */
  gap: number
}

/** Ranks banks best-first for what the user is trying to do. */
export function rank(rates: Rate[], m: Mode, k: Kind): Row[] {
  const by = cmp(m)
  const rows: Row[] = []
  for (const r of rates) {
    const v = pick(r, m, k)
    if (v != null && v > 0) rows.push({ rate: r, v, gap: 0 })
  }
  rows.sort((a, b) => by(a.v, b.v))
  const top = rows[0]?.v
  if (top != null) for (const r of rows) r.gap = Math.abs(r.v - top)
  return rows
}
