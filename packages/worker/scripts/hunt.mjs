// Discovery pass: pull each blocked bank's page locally and surface any host or
// endpoint that might serve the same rates without the CloudFront edge in front.
import { promises as dns } from 'node:dns'

const PAGES = {
  boc: 'https://www.boc.lk/rates-tariff',
  combank: 'https://www.combank.lk/rates-tariff',
  ntb: 'https://www.nationstrust.com/exchange-rates',
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

const IGNORE =
  /googletagmanager|google-analytics|gstatic|googleapis|facebook|twitter|linkedin|youtube|instagram|w3\.org|schema\.org|jquery|bootstrapcdn|fontawesome|doubleclick|recaptcha/i

for (const [id, url] of Object.entries(PAGES)) {
  console.log(`\n===== ${id} =====`)
  const host = new URL(url).hostname
  const apex = host.replace(/^www\./, '')

  for (const h of new Set([host, apex])) {
    try {
      const a = await dns.resolve4(h)
      let cname = []
      try {
        cname = await dns.resolveCname(h)
      } catch {}
      console.log(`dns  ${h} -> ${a.join(', ')} ${cname.length ? `cname=${cname}` : ''}`)
    } catch (e) {
      console.log(`dns  ${h} -> ${e.code}`)
    }
  }

  const html = await (await fetch(url, { headers: { 'user-agent': UA } })).text()

  const hosts = new Map()
  for (const m of html.matchAll(/https?:\/\/([a-z0-9.-]+)[^\s"'<>)]*/gi)) {
    const [full, h] = m
    if (IGNORE.test(full)) continue
    if (!hosts.has(h)) hosts.set(h, full)
  }
  console.log('\nhosts referenced:')
  for (const [h, sample] of hosts) console.log(`  ${h.padEnd(34)} ${sample.slice(0, 92)}`)

  const eps = new Set()
  for (const re of [
    /["'](\/(?:api|wp-json|ajax|services|rest|data)\/[^"'\s]+)["']/gi,
    /(?:fetch|axios\.get|\$\.(?:get|ajax)|url)\s*[:(]\s*["']([^"']+)["']/gi,
    /admin-ajax\.php[^"'\s]*/gi,
  ]) {
    for (const m of html.matchAll(re)) eps.add(m[1] ?? m[0])
  }
  console.log('\ncandidate endpoints:')
  for (const e of [...eps].slice(0, 30)) console.log(`  ${e.slice(0, 110)}`)
}
