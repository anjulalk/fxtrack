// Does any GitHub-hosted runner flavour reach the CloudFront-blocked banks?
const T = [
  ['boc', 'https://www.boc.lk/rates-tariff'],
  ['combank', 'https://www.combank.lk/rates-tariff'],
  ['ntb-apex', 'https://nationstrust.com/exchange-rates'],
]

const H = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
}

const good = (b) => /USD|US DOLLAR|U\.S\. DOLLAR/i.test(b) && /\b(2|3)\d{2}\.\d{2}\b/.test(b)

let ip = '?'
try {
  ip = await (await fetch('https://api.ipify.org')).text()
} catch {}

for (const [id, url] of T) {
  try {
    const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(25_000) })
    const b = await r.text()
    console.log(`RESULT ${process.platform} ip=${ip} ${id.padEnd(9)} ${r.status} rates=${good(b)}`)
  } catch (e) {
    console.log(`RESULT ${process.platform} ip=${ip} ${id.padEnd(9)} ERR ${e.message}`)
  }
}
