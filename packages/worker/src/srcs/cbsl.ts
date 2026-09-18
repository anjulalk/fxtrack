import { num, plaus, rows } from '../lib/html'
import { post } from '../lib/net'
import { dayCo } from '../lib/time'
import type { Quote, Src } from './types'

const URL_ = 'https://www.cbsl.gov.lk/cbsl_custom/exrates/exrates_results_spot_mid.php'

/**
 * The official indicative spot rate. It is a single mid rate with no buy/sell
 * split, so it is a benchmark to price bank margins against, not a dealable rate.
 *
 * CBSL's separate TT buy/sell lookup runs weeks behind, so history for this
 * source comes from the bulk spreadsheet instead (see `hist.ts`).
 */
export const cbsl: Src = {
  id: 'cbsl',
  name: 'Central Bank of Sri Lanka',
  short: 'CBSL',
  url: 'https://www.cbsl.gov.lk/en/rates-and-indicators/exchange-rates/exchange-rate-usd-spot',
  kind: 'cb',

  async run(): Promise<Quote> {
    const now = Math.floor(Date.now() / 1000)
    // Widen the window so weekends and public holidays still return a row.
    const html = await (
      await post(URL_, {
        rangeType: 'dates',
        txtStart: dayCo(now - 12 * 86400),
        txtEnd: dayCo(now),
        'chk_cur[]': 'USD~US Dollar',
        submit_button: 'Submit',
      })
    ).text()

    let eff: string | null = null
    let mid: number | null = null

    for (const r of rows(html)) {
      const d = r[0]?.trim()
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue
      const v = plaus(num(r[1]))
      if (v == null) continue
      if (eff == null || d > eff) {
        eff = d
        mid = v
      }
    }

    if (mid == null) throw new Error('cbsl: no spot row in window')
    return { mid, eff }
  },
}
