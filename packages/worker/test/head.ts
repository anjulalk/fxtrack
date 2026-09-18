import { rows } from '../src/lib/html'
import { get } from '../src/lib/net'

const url = process.argv[2]!
const n = Number(process.argv[3] ?? 30)

const rs = rows(await (await get(url)).text())
console.log(`${rs.length} rows`)
rs.slice(0, n).forEach((r, i) => console.log(`[${i}] ${JSON.stringify(r)}`))
