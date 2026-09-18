// Candidate sweep: which hostnames/paths for the blocked banks are reachable
// from a CI runner? Run via the diag workflow.
const CANDS = [
  ['boc-www', 'https://www.boc.lk/rates-tariff'],
  ['boc-apex', 'https://boc.lk/rates-tariff'],
  ['boc-home', 'https://www.boc.lk/'],
  ['cb-www', 'https://www.combank.lk/rates-tariff'],
  ['cb-apex', 'https://combank.lk/rates-tariff'],
  ['cb-home', 'https://www.combank.lk/'],
  ['ntb-www', 'https://www.nationstrust.com/exchange-rates'],
  ['ntb-apex', 'https://nationstrust.com/exchange-rates'],
  ['ntb-si', 'https://www.nationstrust.com/si/exchange-rates'],
  ['ntb-home', 'https://www.nationstrust.com/'],
]

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

const H = {
  'user-agent': UA,
  accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
}

const pad = (s, n) => String(s).padEnd(n)

try {
  console.log(`egress ip: ${await (await fetch('https://api.ipify.org')).text()}\n`)
} catch {}

for (const [id, url] of CANDS) {
  for (const mode of ['manual', 'follow']) {
    try {
      const r = await fetch(url, { headers: H, redirect: mode, signal: AbortSignal.timeout(25_000) })
      const body = mode === 'follow' ? await r.text() : ''
      const loc = r.headers.get('location')
      const srv = r.headers.get('server') ?? '-'
      const usd = mode === 'follow' && /USD|U\.S\. DOLLAR|US DOLLAR/i.test(body)
      console.log(
        `${pad(id, 12)} ${pad(mode, 7)} ${r.status} ${pad(srv, 12)} len=${pad(body.length, 8)}` +
          `${usd ? ' USD=yes' : ''}${loc ? ` -> ${loc.slice(0, 70)}` : ''}`,
      )
    } catch (e) {
      console.log(`${pad(id, 12)} ${pad(mode, 7)} ERR ${e.message}`)
    }
  }
}
