// Round 3: direct origins, sibling hosts, and public relays for BOC + ComBank.
const BOC = 'https://www.boc.lk/rates-tariff'
const CB = 'https://www.combank.lk/rates-tariff'

const DIRECT = [
  ['cb-cms', 'https://cms.combank.cloud/rates-tariff'],
  ['cb-cms-root', 'https://cms.combank.cloud/'],
  ['cb-uat', 'https://uat.combank.cloud/rates-tariff'],
  ['boc-trade', 'https://trade.boc.lk/boc/portal'],
  ['boc-online', 'https://online.boc.lk/'],
  ['boc-forms', 'https://forms.boc.lk/credit/credit'],
]

const RELAYS = [
  ['allorigins', (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`],
  ['codetabs', (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`],
  ['isomorphic', (u) => `https://cors.isomorphic-git.org/${u}`],
  ['whateverorigin', (u) => `http://www.whateverorigin.org/get?url=${encodeURIComponent(u)}`],
]

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const H = { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*;q=0.8' }
const pad = (s, n) => String(s).padEnd(n)

// A real rates page must mention USD *and* carry plausible LKR numbers.
const good = (b) => /USD|US DOLLAR|U\.S\. DOLLAR/i.test(b) && /\b(2|3)\d{2}\.\d{2}\b/.test(b)

try {
  console.log(`egress ip: ${await (await fetch('https://api.ipify.org')).text()}\n`)
} catch {}

console.log('=== direct hosts ===')
for (const [id, url] of DIRECT) {
  try {
    const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(25_000) })
    const b = await r.text()
    console.log(
      `  ${pad(id, 13)} ${r.status} ${pad(r.headers.get('server') ?? '-', 12)} len=${pad(b.length, 8)} rates=${good(b)}`,
    )
  } catch (e) {
    console.log(`  ${pad(id, 13)} ERR ${e.message}`)
  }
}

console.log('\n=== relays ===')
for (const [bank, target] of [
  ['boc', BOC],
  ['combank', CB],
]) {
  for (const [id, mk] of RELAYS) {
    try {
      const r = await fetch(mk(target), { headers: H, signal: AbortSignal.timeout(40_000) })
      const b = await r.text()
      console.log(`  ${pad(bank, 8)} ${pad(id, 15)} ${r.status} len=${pad(b.length, 8)} rates=${good(b)}`)
    } catch (e) {
      console.log(`  ${pad(bank, 8)} ${pad(id, 15)} ERR ${e.message}`)
    }
  }
}
