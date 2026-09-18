const n2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const n0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const sign2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

export const DASH = '\u2014'

export function rate(v: number | null | undefined): string {
  return v == null ? DASH : n2.format(v)
}

export function money(v: number | null | undefined): string {
  return v == null ? DASH : n0.format(Math.round(v))
}

export function delta(v: number | null | undefined): string {
  return v == null ? DASH : sign2.format(v)
}

export function pct(v: number | null | undefined, dp = 2): string {
  if (v == null || !Number.isFinite(v)) return DASH
  return `${v >= 0 ? '+' : ''}${v.toFixed(dp)}%`
}

const CO = 'Asia/Colombo'

export function day(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export function clock(ts: number): string {
  return new Date(ts * 1000).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: CO,
  })
}

export function ago(ts: number, now = Date.now() / 1000): string {
  const s = Math.max(0, Math.round(now - ts))
  if (s < 90) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
