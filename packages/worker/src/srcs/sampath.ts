import { get } from '../lib/net'
import { plaus } from '../lib/html'
import { monthDMY } from '../lib/time'
import type { Quote, Src } from './types'

const TT = 'https://www.sampath.lk/api/exchange-rates'
const NOTES = 'https://www.sampath.lk/api/currency-rates'

interface TtRow {
  CurrCode?: string
  TTBUY?: string
  TTSEL?: string
  RateWEF?: string
}

interface NoteRow {
  CurrCode?: string
  ByOVC?: string
}

const json = async <T>(u: string): Promise<T> =>
  (await get(u, { headers: { accept: 'application/json' } })).json() as Promise<T>

const f = (s?: string): number | null => (s == null ? null : plaus(Number.parseFloat(s)))

export const sampath: Src = {
  id: 'sampath',
  name: 'Sampath Bank',
  short: 'Sampath',
  url: 'https://www.sampath.lk/rates/exchange-rates',
  kind: 'bank',

  async run(): Promise<Quote> {
    const [tt, notes] = await Promise.allSettled([
      json<{ data?: TtRow[] }>(TT),
      json<{ data?: NoteRow[] }>(NOTES),
    ])

    if (tt.status !== 'fulfilled') throw tt.reason
    const row = tt.value.data?.find((r) => r.CurrCode === 'USD')
    if (!row) throw new Error('sampath: no USD row')

    const q: Quote = {
      ttBuy: f(row.TTBUY),
      ttSell: f(row.TTSEL),
      eff: row.RateWEF ? monthDMY(row.RateWEF) : null,
    }

    // Notes are split into USD(L) and USD(S); large denominations are the
    // headline cash rate. There is no notes-selling field on this endpoint.
    if (notes.status === 'fulfilled') {
      const big = notes.value.data?.find((r) => r.CurrCode === 'USD(L)')
      q.nBuy = f(big?.ByOVC)
    }

    return q
  },
}
