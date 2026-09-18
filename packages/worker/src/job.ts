import { hour } from './lib/time'
import { has, SRCS } from './srcs/index'
import type { Quote } from './srcs/types'
import { logRun, save } from './store'

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

async function main(): Promise<void> {
  const t = Date.now()
  const ts = hour(Math.floor(t / 1000))
  const out = await Promise.allSettled(SRCS.map((s) => s.run()))

  const hits: { id: string; ts: number; q: Quote }[] = []
  const errs: string[] = []

  out.forEach((r, i) => {
    const s = SRCS[i]!
    if (r.status === 'rejected') errs.push(`${s.id}: ${msg(r.reason)}`)
    else if (!has(r.value)) errs.push(`${s.id}: no usable fields`)
    else hits.push({ id: s.id, ts, q: r.value })
  })

  const moved = hits.length ? save(hits) : 0
  const ms = Date.now() - t
  logRun({ ts: Math.floor(t / 1000), ok: hits.length, bad: errs.length, ms, note: errs.join(' | ') })

  console.log(`ok ${hits.length}  bad ${errs.length}  changed ${moved}  ${ms}ms`)
  for (const e of errs) console.log(`  ! ${e}`)

  // One bank redesigning its page is routine and must not stall the schedule;
  // every source failing means something systemic, so surface that loudly.
  if (!hits.length) process.exit(1)
}

main().catch((e: unknown) => {
  console.error(e)
  process.exit(1)
})
