import type { Kind } from '@fxtrack/shared'

export const CARD_MARKUP = 0.04
export const DCC_MARKUP = 0.035

export function quote(v: number, k: Kind): number {
  return k === 'card' ? v * (1 + CARD_MARKUP) : v
}
