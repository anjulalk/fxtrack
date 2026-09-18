import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WINS, type Bank } from '@fxtrack/shared'
import { SRCS } from './srcs/index'
import { buildHist, buildIntra, buildLatest, readRuns, root } from './store'

const BANKS: Bank[] = SRCS.map(({ id, name, short, url, kind }) => ({ id, name, short, url, kind }))

const out = process.argv[2] ?? join(root(), 'packages', 'web', 'public', 'd')
mkdirSync(out, { recursive: true })

function w(f: string, v: unknown): void {
  const body = JSON.stringify(v)
  writeFileSync(join(out, f), body)
  console.log(`  ${f.padEnd(16)} ${(body.length / 1024).toFixed(1)} KB`)
}

console.log(`wrote ${out}`)
w('latest.json', buildLatest(BANKS))
for (const win of WINS) {
  if (win.intra) w(`intra-${win.id}.json`, buildIntra(BANKS.map((b) => b.id), 24))
  else w(`hist-${win.id}.json`, buildHist(win.days))
}
w('health.json', { srcs: SRCS.length, runs: readRuns().slice(-12).reverse() })
