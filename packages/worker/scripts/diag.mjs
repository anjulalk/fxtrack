// Throwaway probe: works out why some banks answer 403 from a CI runner but
// not from a laptop. Run via the diag workflow, read the table, then delete.
const URLS = {
  boc: 'https://www.boc.lk/rates-tariff',
  combank: 'https://www.combank.lk/rates-tariff',
  ntb: 'https://www.nationstrust.com/exchange-rates',
  sampath: 'https://www.sampath.lk/api/exchange-rates',
}

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

const VARIANTS = {
  current: {
    'user-agent': CHROME,
    accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
  },

  // A full navigation request as Chrome actually sends it.
  full: {
    'user-agent': CHROME,
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'accept-encoding': 'gzip, deflate, br',
    'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'cache-control': 'max-age=0',
  },

}

const WAF = ['server', 'cf-ray', 'cf-mitigated', 'x-iinfo', 'x-sucuri-id', 'x-cdn', 'via']

const pad = (s, n) => String(s).padEnd(n)

try {
  const ip = await (await fetch('https://api.ipify.org')).text()
  console.log(`egress ip: ${ip}\n`)
} catch {
  console.log('egress ip: unknown\n')
}

for (const [id, url] of Object.entries(URLS)) {
  for (const [name, headers] of Object.entries(VARIANTS)) {
    try {
      const r = await fetch(url, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
      })
      const tags = WAF.map((h) => [h, r.headers.get(h)])
        .filter(([, v]) => v)
        .map(([h, v]) => `${h}=${v}`)
        .join(' ')
      const body = await r.text()
      console.log(`${pad(id, 9)} ${pad(name, 10)} ${r.status}  ${pad(body.length, 8)} ${tags}`)
      if (!r.ok) console.log(`    ${body.replace(/\s+/g, ' ').slice(0, 320)}`)
    } catch (e) {
      console.log(`${pad(id, 9)} ${pad(name, 10)} ERR  ${e.message}`)
    }
  }
  console.log('')
}

// Can a public text-extraction relay reach the blocked origins instead?
console.log('--- relay: r.jina.ai ---')
for (const [id, url] of Object.entries(URLS)) {
  if (id === 'sampath') continue
  try {
    const r = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'user-agent': CHROME, 'x-respond-with': 'html' },
      signal: AbortSignal.timeout(45_000),
    })
    const body = await r.text()
    const hit = /\d{2,3}\.\d{2,4}/.test(body)
    console.log(`${pad(id, 9)} ${r.status}  ${pad(body.length, 8)} numbers=${hit}`)
  } catch (e) {
    console.log(`${pad(id, 9)} ERR  ${e.message}`)
  }
}
