import { get } from '../lib/net'
import { isoish } from '../lib/time'
import { stamp, trio } from './table'
import type { Quote, Src } from './types'

const URL_ = 'https://www.combank.lk/rates-tariff'

export const combank: Src = {
  id: 'combank',
  name: 'Commercial Bank of Ceylon',
  short: 'ComBank',
  url: URL_,
  kind: 'bank',

  async run(): Promise<Quote> {
    const html = await (await get(URL_)).text()
    const q = trio(html)
    if (!q) throw new Error('combank: no USD row')
    q.eff = stamp(html, /as at\s*\d{4}-\d{2}-\d{2}/i, isoish)
    return q
  },
}
