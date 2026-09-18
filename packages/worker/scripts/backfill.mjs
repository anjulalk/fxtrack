import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import ExcelJS from 'exceljs'

const URL_XLSX =
  'https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/statistics/sheets/IF_Buying_Selling_Exchange_Rates.xlsx'

const SHEET = '2005-2026'
const FIRST = 8
const C_DATE = 2
const C_BUY = 3
const C_SELL = 4
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

function asDate(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  if (v && typeof v === 'object' && v.result instanceof Date) return v.result
  return null
}

function asNum(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v && typeof v === 'object' && typeof v.result === 'number') return v.result
  const n = Number(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

const iso = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`

// Must match the serializer in src/store.ts or rows would churn on every run.
const s = (v) => (v == null ? '' : String(Math.round(v * 1e4) / 1e4))

const main = async () => {
  process.stdout.write('fetching CBSL workbook… ')
  const res = await fetch(URL_XLSX)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  console.log(`${(buf.length / 1024).toFixed(0)} KB`)

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)

  const ws = wb.getWorksheet(SHEET)
  if (!ws) throw new Error(`sheet "${SHEET}" not found: ${wb.worksheets.map((w) => w.name)}`)

  const rows = []
  let skipped = 0

  ws.eachRow((row, n) => {
    if (n < FIRST) return
    // Interleaved "Average <Month>" summary rows have no real date; drop them.
    const d = asDate(row.getCell(C_DATE).value)
    if (!d) {
      skipped++
      return
    }
    const buy = asNum(row.getCell(C_BUY).value)
    const sell = asNum(row.getCell(C_SELL).value)
    if (buy == null && sell == null) {
      skipped++
      return
    }
    rows.push({ d: iso(d), buy, sell })
  })

  // Scraped bank rows are preserved verbatim; only the CBSL block is replaced.
  const kept = existsSync(OUT)
    ? readFileSync(OUT, 'utf8')
        .split('\n')
        .slice(1)
        .filter((l) => l && !l.startsWith(`${BANK},`))
    : []

  const made = rows.map((r) => `${BANK},${r.d},${s(r.buy)},${s(r.sell)},,,`)
  const all = [...kept, ...made].sort((a, b) => {
    const [ab, ad] = a.split(',')
    const [bb, bd] = b.split(',')
    return ad < bd ? -1 : ad > bd ? 1 : ab < bb ? -1 : ab > bb ? 1 : 0
  })

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, `${HEAD}\n${all.join('\n')}\n`)

  console.log(`cbsl rows: ${rows.length}  skipped: ${skipped}  kept other: ${kept.length}`)
  console.log(`range: ${rows[0]?.d} → ${rows[rows.length - 1]?.d}`)
  console.log(`wrote ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
