import type { Bank } from '@fxtrack/shared'

/** What one adapter returns for a single poll. */
export interface Quote {
  eff?: string | null
  ttBuy?: number | null
  ttSell?: number | null
  nBuy?: number | null
  nSell?: number | null
  mid?: number | null
}

export interface Src extends Bank {
  run(): Promise<Quote>
}

export function has(q: Quote): boolean {
  return (
    q.ttBuy != null ||
    q.ttSell != null ||
    q.nBuy != null ||
    q.nSell != null ||
    q.mid != null
  )
}
