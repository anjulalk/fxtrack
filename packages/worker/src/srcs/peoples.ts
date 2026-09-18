import { get } from '../lib/net'
import { isoish } from '../lib/time'
import { stamp, trio } from './table'
import type { Quote, Src } from './types'

const URL_ = 'https://www.peoplesbank.lk/exchange-rates/'

export const peoples: Src = {
  id: 'peoples',
  name: "People's Bank",
  short: "People's",
  url: URL_,
  kind: 'bank',

  async run(): Promise<Quote> {
    const html = await (await get(URL_)).text()
    const q = trio(html)
    if (!q) throw new Error('peoples: no USD row')
    q.eff = stamp(
      html,
      /Indicative Exchange Rates\s*-\s*\d{4}-\d{2}-\d{2}[^<]*/i,
      isoish,
    )
    return q
  },
}
