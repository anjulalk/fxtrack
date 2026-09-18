import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * CBSL's indicative spot mid — the benchmark bank margins are priced against.
 * The same endpoint the hourly scrape hits will serve an arbitrary date range,
 * so a single request rebuilds the whole series and heals any missed days.
 *
 * This replaced the monthly buying/selling workbook, which trails the current
 * day by up to a month and so can never keep a live baseline current.
 */
const URL_SPOT = 'https://www.cbsl.gov.lk/cbsl_custom/exrates/exrates_results_spot_mid.php'

// The series itself begins 2010-05-07; asking from earlier just returns all of it.
const FROM = '2005-01-01'
const MIN_ROWS = 100
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
const BANK = 'cbsl'
const HEAD = 'bank,d,tt_buy,tt_sell,n_buy,n_sell,mid'

function root() {
  let d = process.cwd()
  for (;;) {
    if (existsSync(join(d, 'package-lock.json'))) return d
    const up = dirname(d)
    if (up === d) return process.cwd()
    d = up
  }
}

const OUT = join(process.env.FX_DATA ?? join(root(), 'data'), 'day.csv')

function asNum(v) {
  const n = Number(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** The response is one small static table, so a split this crude is enough. */
function* rows(html) {
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    yield [...tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      c[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim(),
    )
  }
}

// Must match the serializer in src/store.ts or rows would churn on every run.
const s = (v) => (v == null ? '' : String(Math.round(v * 1e4) / 1e4))

const main = async () => {
  const to = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)
  process.stdout.write(`fetching CBSL spot ${FROM} → ${to}… `)

  const body = new URLSearchParams()
  body.append('rangeType', 'dates')
  body.append('txtStart', FROM)
  body.append('txtEnd', to)
  body.append('chk_cur[]', 'USD~US Dollar')
  body.append('submit_button', 'Submit')

  const res = await fetch(URL_SPOT, {
    method: 'POST',
    body: body.toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  console.log(`${(html.length / 1024).toFixed(0)} KB`)

  const mids = new Map()
  let skipped = 0

  for (const c of rows(html)) {
    const d = c[0]
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      skipped++
      continue
    }
    const v = asNum(c[1])
    if (v == null) {
      skipped++
      continue
    }
    mids.set(d, v)
  }

  // This rewrites the whole block, so a truncated response must not wipe history.
  if (mids.size < MIN_ROWS) throw new Error(`cbsl: only ${mids.size} spot rows, refusing to write`)

  // Scraped bank rows are preserved verbatim; only the CBSL block is replaced.
  const kept = existsSync(OUT)
    ? readFileSync(OUT, 'utf8')
        .split('\n')
        .slice(1)
        .filter((l) => l && !l.startsWith(`${BANK},`))
    : []

  const made = [...mids].map(([d, v]) => `${BANK},${d},,,,,${s(v)}`)
  const all = [...kept, ...made].sort((a, b) => {
    const [ab, ad] = a.split(',')
    const [bb, bd] = b.split(',')
    return ad < bd ? -1 : ad > bd ? 1 : ab < bb ? -1 : ab > bb ? 1 : 0
  })

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, `${HEAD}\n${all.join('\n')}\n`)

  const days = [...mids.keys()].sort()
  console.log(`cbsl rows: ${mids.size}  skipped: ${skipped}  kept other: ${kept.length}`)
  console.log(`range: ${days[0]} → ${days[days.length - 1]}`)
  console.log(`wrote ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
