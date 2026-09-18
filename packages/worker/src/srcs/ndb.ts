import { get } from '../lib/net'
import { isoish } from '../lib/time'
import { stamp, trio } from './table'
import type { Quote, Src } from './types'

const URL_ = 'https://www.ndbbank.com/rates/exchange-rates'

export const ndb: Src = {
  id: 'ndb',
  name: 'NDB Bank',
  short: 'NDB',
  url: URL_,
  kind: 'bank',

  async run(): Promise<Quote> {
    const html = await (await get(URL_)).text()
    const q = trio(html)
    if (!q) throw new Error('ndb: no USD row')
    q.eff = stamp(html, /Last Updated On:\s*\d{4}-\d{2}-\d{2}/i, isoish)
    return q
  },
}
