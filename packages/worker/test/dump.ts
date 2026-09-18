import { rows } from '../src/lib/html'
import { get } from '../src/lib/net'

const TARGETS: Record<string, string> = {
  boc: 'https://www.boc.lk/rates-tariff',
  ndb: 'https://www.ndbbank.com/rates/exchange-rates',
  combank: 'https://www.combank.lk/rates-tariff',
  peoples: 'https://www.peoplesbank.lk/exchange-rates/',
}

const want = process.argv.slice(2)

for (const [id, url] of Object.entries(TARGETS)) {
  if (want.length && !want.includes(id)) continue
  const html = await (await get(url)).text()
  const rs = rows(html)
  console.log(`\n===== ${id}  (${rs.length} rows, ${html.length} bytes) =====`)

  rs.forEach((r, i) => {
    if (!r.some((c) => /\bUSD\b|DOLLAR/i.test(c))) return
    console.log(`[${i}] ${JSON.stringify(r)}`)
    // Header context helps identify which table this row belongs to.
    for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
      console.log(`   hdr[${j}] ${JSON.stringify(rs[j])}`)
    }
  })
}
