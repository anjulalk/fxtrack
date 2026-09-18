import { get } from '../lib/net'
import { dmyDot } from '../lib/time'
import { stamp, trio } from './table'
import type { Quote, Src } from './types'

const URL_ = 'https://www.boc.lk/rates-tariff'

export const boc: Src = {
  id: 'boc',
  name: 'Bank of Ceylon',
  short: 'BOC',
  url: URL_,
  kind: 'bank',

  async run(): Promise<Quote> {
    const html = await (await get(URL_)).text()
    const q = trio(html)
    if (!q) throw new Error('boc: no USD row')
    // The only source timestamped to the second.
    q.eff = stamp(html, /\d{1,2}\.\d{1,2}\.\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*[AP]\.?M\.?/i, dmyDot)
    return q
  },
}
