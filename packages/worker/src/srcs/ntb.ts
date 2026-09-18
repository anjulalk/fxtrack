import { get } from '../lib/net'
import { dmyMonth } from '../lib/time'
import { cols, stamp } from './table'
import type { Quote, Src } from './types'

const URL_ = 'https://www.nationstrust.com/exchange-rates'

export const ntb: Src = {
  id: 'ntb',
  name: 'Nations Trust Bank',
  short: 'NTB',
  url: URL_,
  kind: 'bank',

  async run(): Promise<Quote> {
    const html = await (await get(URL_)).text()
    // Seven numeric columns: notes, demand draft, TT, then a trailing import
    // bill rate that would poison a "last six columns" read.
    const q = cols(html, { n: 7, nBuy: 0, nSell: 1, ttBuy: 4, ttSell: 5 })
    q.eff = stamp(html, /\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\s+\d{1,2}:\d{2}\s*[AP]\.?M\.?/i, dmyMonth)
    return q
  },
}
