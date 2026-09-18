const TAG = /<[^>]*>/g
const WS = /\s+/g

const ENT: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

export function ents(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, g: string) => {
    if (g[0] === '#') {
      const code = g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    return ENT[g.toLowerCase()] ?? m
  })
}

/** Tags out, entities decoded, whitespace collapsed. */
export function strip(s: string): string {
  return ents(s.replace(TAG, ' ')).replace(WS, ' ').trim()
}

/** Every <tr> in the document, as arrays of cell text. */
export function rows(html: string): string[][] {
  const out: string[][] = []
  const tr = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  let m: RegExpExecArray | null
  while ((m = tr.exec(html))) {
    const cells: string[] = []
    const td = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi
    let c: RegExpExecArray | null
    while ((c = td.exec(m[1]!))) cells.push(strip(c[1]!))
    if (cells.length) out.push(cells)
  }
  return out
}

/** First number in a messy cell: "LKR 302.50 *" -> 302.5 */
export function num(s: string | null | undefined): number | null {
  if (!s) return null
  const m = /-?\d[\d,]*(?:\.\d+)?/.exec(s)
  if (!m) return null
  const v = Number(m[0].replace(/,/g, ''))
  return Number.isFinite(v) ? v : null
}

/**
 * USD/LKR sanity band. Guards against silently scraping the wrong column
 * (a JPY rate, a percentage, a year) when a bank reshuffles its table.
 */
export function plaus(v: number | null): number | null {
  return v != null && v >= 100 && v <= 2000 ? v : null
}

/** Finds the row whose cells identify USD. */
export function usdRow(rs: string[][], re = /\bUSD\b|U\.?S\.?\s*DOLLAR|UNITED STATES DOLLAR/i): string[] | null {
  for (const r of rs) {
    for (const c of r) if (re.test(c)) return r
  }
  return null
}
