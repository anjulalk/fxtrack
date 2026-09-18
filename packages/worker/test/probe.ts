import { SRCS } from '../src/srcs/index'

type Out = Record<string, unknown>

const res: Out[] = await Promise.all(
  SRCS.map(async (s): Promise<Out> => {
    const t = Date.now()
    try {
      const q = await s.run()
      return { id: s.id, ms: Date.now() - t, ...q }
    } catch (e) {
      return { id: s.id, ms: Date.now() - t, err: e instanceof Error ? e.message : String(e) }
    }
  }),
)

res.sort((a, b) => String(a.id).localeCompare(String(b.id)))
console.table(res)

const n = (v: unknown) => (typeof v === 'number' ? v : null)
const bad: string[] = []

for (const r of res) {
  const id = String(r.id)
  if (r.err) {
    bad.push(`${id}: ${r.err}`)
    continue
  }

  const nb = n(r.nBuy)
  const ns = n(r.nSell)
  const tb = n(r.ttBuy)
  const ts = n(r.ttSell)

  if (n(r.mid) != null && tb == null) continue

  if (tb == null || ts == null) bad.push(`${id}: missing TT pair`)
  else if (tb >= ts) bad.push(`${id}: ttBuy ${tb} >= ttSell ${ts}`)

  // Cash is always worse for the customer than a wire. A transposed column map
  // breaks this long before a human would notice the rates look off.
  if (nb != null && tb != null && nb > tb) bad.push(`${id}: nBuy ${nb} > ttBuy ${tb}`)
  if (ns != null && ts != null && ns < ts) bad.push(`${id}: nSell ${ns} < ttSell ${ts}`)
}

const okCount = res.length - res.filter((r) => r.err).length
console.log(`\n${okCount}/${res.length} fetched`)

if (bad.length) {
  console.log(`\n${bad.length} problem(s):`)
  for (const b of bad) console.log(`  x ${b}`)
  process.exitCode = 1
} else {
  console.log('all sanity checks passed')
}
