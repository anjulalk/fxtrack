import { get } from '../lib/net'
import { dmySlash } from '../lib/time'
import { cols, stamp } from './table'
import type { Quote, Src } from './types'

// The double "r" is how the path is genuinely spelled on their site.
const URL_ = 'https://www.nsb.lk/rates-tarriffs/nsb-exchange-rates/'

export const nsb: Src = {
  id: 'nsb',
  name: 'National Savings Bank',
  short: 'NSB',
  url: URL_,
  kind: 'bank',

  async run(): Promise<Quote> {
    const html = await (await get(URL_)).text()
    // NSB lists telegraphic transfers BEFORE currency notes, the reverse of
    // every other bank here. Do not route this through trio().
    const q = cols(html, { n: 4, ttBuy: 0, ttSell: 1, nBuy: 2, nSell: 3 })
    q.eff = stamp(html, /as at\s*\d{1,2}\/\d{1,2}\/\d{4}/i, dmySlash)
    return q
  },
}
