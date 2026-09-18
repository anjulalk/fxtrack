// Two parallel hunts:
//   1. guess origin hostnames for the CloudFront-fronted banks
//   2. see whether CBSL itself publishes per-commercial-bank rates
import { promises as dns } from 'node:dns'

const SUBS = [
  'origin', 'origin-www', 'www2', 'www1', 'web', 'cms', 'new', 'portal',
  'api', 'rates', 'backend', 'site', 'corp', 'public', 'live', 'old',
]
const ZONES = ['boc.lk', 'combank.lk', 'combank.cloud', 'nationstrust.com']

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

console.log('=== origin hostname sweep ===')
const jobs = []
for (const z of ZONES)
  for (const s of SUBS) {
    const h = `${s}.${z}`
    jobs.push(
      dns
        .resolve4(h)
        .then(async (a) => {
          let cname = ''
          try {
            cname = (await dns.resolveCname(h)).join(',')
          } catch {}
          const cf = /cloudfront/i.test(cname) || /^(18|13|52|54|65|99|143|204|205)\./.test(a[0])
          console.log(`  ${h.padEnd(30)} ${a.join(',').padEnd(40)} ${cf ? 'CF' : '<-- CANDIDATE'} ${cname}`)
        })
        .catch(() => {}),
    )
  }
await Promise.all(jobs)

console.log('\n=== CBSL per-bank commercial rates? ===')
const CBSL = [
  'https://www.cbsl.gov.lk/en/rates-and-indicators/exchange-rates/commercial-bank-rates',
  'https://www.cbsl.gov.lk/en/rates-and-indicators/exchange-rates/daily-exchange-rates',
  'https://www.cbsl.gov.lk/en/rates-and-indicators/exchange-rates',
]
for (const u of CBSL) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(25_000) })
    const b = await r.text()
    const hits = ['Bank of Ceylon', 'Commercial Bank', 'Nations Trust', 'Sampath', 'People']
      .filter((n) => new RegExp(n, 'i').test(b))
    console.log(`  ${r.status} len=${String(b.length).padEnd(8)} banks=[${hits.join(', ')}] ${u}`)
  } catch (e) {
    console.log(`  ERR ${e.message} ${u}`)
  }
}
