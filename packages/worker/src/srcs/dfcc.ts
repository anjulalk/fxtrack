import { get } from '../lib/net'
import { dmyMonth } from '../lib/time'
import { cols, stamp } from './table'
import type { Quote, Src } from './types'

// Only the path under /rates-and-tariff/ resolves; the short /exchange-rates
// path sits in a 308 redirect loop.
const URL_ = 'https://www.dfcc.lk/rates-and-tariff/exchange-rates'

export const dfcc: Src = {
  id: 'dfcc',
  name: 'DFCC Bank',
  short: 'DFCC',
  url: URL_,
  kind: 'bank',

  async run(): Promise<Quote> {
    const html = await (await get(URL_)).text()
    // Columns are grouped buying-then-selling rather than in buy/sell pairs,
    // and one selling column is shared between demand drafts and TT.
    const q = cols(html, { n: 5, nBuy: 1, ttBuy: 2, ttSell: 3, nSell: 4 })
    q.eff = stamp(html, /Date[\s\S]{0,40}?\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}/i, dmyMonth)
    return q
  },
}
