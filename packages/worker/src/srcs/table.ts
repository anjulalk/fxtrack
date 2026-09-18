import { num, plaus, rows, usdRow } from '../lib/html'
import type { Quote } from './types'

/**
 * ComBank, BOC, People's and NDB all publish the same six numeric columns in the
 * same order: currency notes, then a paper-instrument pair (cheques / drafts /
 * TCs), then telegraphic transfers.
 *
 * This is deliberately NOT generic. NSB reverses the order and DFCC collapses the
 * selling columns, so neither may use this helper.
 */
export function trio(html: string): Quote | null {
  const row = usdRow(rows(html))
  if (!row) return null

  const nums: number[] = []
  for (const c of row) {
    const v = num(c)
    if (v != null) nums.push(v)
  }
  if (nums.length < 6) return null

  const [nBuy, nSell, , , ttBuy, ttSell] = nums.slice(-6) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]

  const q: Quote = {
    nBuy: plaus(nBuy),
    nSell: plaus(nSell),
    ttBuy: plaus(ttBuy),
    ttSell: plaus(ttSell),
  }
  return q.ttBuy != null || q.ttSell != null ? q : null
}

/** Pulls the first match of `re` out of the page for the effective timestamp. */
export function stamp(html: string, re: RegExp, parse: (s: string) => string | null): string | null {
  const m = re.exec(html)
  return m ? parse(m[0]) : null
}

/**
 * Explicit column map for banks that do NOT follow the notes/drafts/TT layout.
 * Indices address the USD row's numeric cells, left to right.
 *
 * `n` is the expected count. A mismatch throws rather than guessing, so a bank
 * reshuffling its table surfaces as a failed run instead of silently wrong rates.
 */
export interface ColMap {
  n: number
  ttBuy?: number
  ttSell?: number
  nBuy?: number
  nSell?: number
}

export function cols(html: string, m: ColMap): Quote {
  const row = usdRow(rows(html))
  if (!row) throw new Error('no USD row')

  const nums: number[] = []
  for (const c of row) {
    const v = num(c)
    if (v != null) nums.push(v)
  }
  if (nums.length !== m.n) {
    throw new Error(`layout drift: want ${m.n} numeric cells, got ${nums.length} [${nums}]`)
  }

  const at = (i?: number) => (i == null ? null : plaus(nums[i] ?? null))
  return { ttBuy: at(m.ttBuy), ttSell: at(m.ttSell), nBuy: at(m.nBuy), nSell: at(m.nSell) }
}
