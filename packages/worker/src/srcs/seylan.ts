import { get } from '../lib/net'
import { plaus } from '../lib/html'
import { isoish } from '../lib/time'
import type { Quote, Src } from './types'

const URL_ = 'https://www.seylan.lk/api/exchange-rates-get-value/USD'

/** Keys arrive with escaped slashes in the raw JSON but are plain after parsing. */
interface Row {
  'Effective Date'?: string
  'Currency Notes Buying'?: string
  'Currency Notes Selling'?: string
  'Telegraphic Transfers Buying'?: string
  'Telegraphic Transfers Selling'?: string
}

const f = (s?: string): number | null => (s == null ? null : plaus(Number.parseFloat(s)))

export const seylan: Src = {
  id: 'seylan',
  name: 'Seylan Bank',
  short: 'Seylan',
  url: 'https://www.seylan.lk/rates-and-charges/exchange-rates',
  kind: 'bank',

  async run(): Promise<Quote> {
    const body = (await (await get(URL_, { headers: { accept: 'application/json' } })).json()) as
      | Row[]
      | Row
    const row = Array.isArray(body) ? body[0] : body
    if (!row) throw new Error('seylan: empty response')

    return {
      ttBuy: f(row['Telegraphic Transfers Buying']),
      ttSell: f(row['Telegraphic Transfers Selling']),
      nBuy: f(row['Currency Notes Buying']),
      nSell: f(row['Currency Notes Selling']),
      eff: row['Effective Date'] ? isoish(row['Effective Date']) : null,
    }
  },
}
