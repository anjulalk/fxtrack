/** What the user is trying to do with their dollars. */
export type Mode = 'buy' | 'sell'

/** Which board a quote came from: wire transfer vs physical cash. */
export type Kind = 'tt' | 'note'

export interface Bank {
  id: string
  name: string
  short: string
  url: string
  /** `cb` = central bank indicative rate, not a dealable retail rate. */
  kind: 'bank' | 'cb'
}

/** One observation of a bank's USD/LKR board. */
export interface Rate {
  bank: string
  /** When we observed it, unix seconds. */
  ts: number
  /** Effective time as declared by the bank, if published. */
  eff: string | null
  ttBuy: number | null
  ttSell: number | null
  nBuy: number | null
  nSell: number | null
  /** Single indicative mid rate. Only the central bank publishes one. */
  mid: number | null
}

export interface Latest {
  gen: number
  banks: Bank[]
  rates: Rate[]
}

export type Col = (number | null)[]

/** Columnar series; every array is index-aligned with the parent's time axis. */
export interface Ser {
  ttBuy: Col
  ttSell: Col
  nBuy: Col
  nSell: Col
  mid: Col
}

/** Daily close series covering all of recorded history. */
export interface Hist {
  gen: number
  days: string[]
  ser: Record<string, Ser>
}

/** Hourly detail for the recent window. */
export interface Intra {
  gen: number
  ts: number[]
  ser: Record<string, Ser>
}

export const FIELDS = ['ttBuy', 'ttSell', 'nBuy', 'nSell'] as const
export type Field = (typeof FIELDS)[number]

/**
 * The rate that matters to the user. A customer buying USD pays the bank's
 * selling rate; a customer selling USD receives the bank's buying rate.
 */
export function field(m: Mode, k: Kind): Field {
  if (k === 'tt') return m === 'buy' ? 'ttSell' : 'ttBuy'
  return m === 'buy' ? 'nSell' : 'nBuy'
}

export function pick(r: Rate, m: Mode, k: Kind): number | null {
  return r[field(m, k)]
}

/** Buying USD: cheaper is better. Selling USD: higher is better. */
export function lowBetter(m: Mode): boolean {
  return m === 'buy'
}

/** Sorts best-for-the-user first. */
export function cmp(m: Mode): (a: number, b: number) => number {
  return lowBetter(m) ? (a, b) => a - b : (a, b) => b - a
}

/**
 * Chart windows. Each one ships as its own snapshot file, so opening the site
 * downloads only the span on screen instead of the whole 20-year backlog.
 */
export const WINS = [
  { id: '7d', label: '7D', days: 7 },
  { id: '1m', label: '1M', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: '1y', label: '1Y', days: 365 },
  { id: 'all', label: 'All', days: Number.MAX_SAFE_INTEGER },
] as const

export type WinId = (typeof WINS)[number]['id']
