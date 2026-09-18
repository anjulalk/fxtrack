/** Sri Lanka is a fixed UTC+05:30 with no DST, so a plain offset is safe. */
export const CO_OFF = 5.5 * 3600

const p2 = (n: number) => String(n).padStart(2, '0')

/** Calendar day in Asia/Colombo for a unix timestamp. */
export function dayCo(ts: number): string {
  return new Date((ts + CO_OFF) * 1000).toISOString().slice(0, 10)
}

/** Truncates a unix timestamp to the top of its hour. */
export function hour(ts: number): number {
  return Math.floor(ts / 3600) * 3600
}

const MON: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

function h24(h: number, ap?: string): number {
  if (!ap) return h
  if (ap.toLowerCase().startsWith('p')) return h === 12 ? 12 : h + 12
  return h === 12 ? 0 : h
}

/** Sampath: "Friday, September 18 2026, 10:35:19 AM" */
export function monthDMY(s: string): string | null {
  const m = /([A-Za-z]{3,})\s+(\d{1,2})\s+(\d{4})(?:,\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]\.?M\.?)?)?/i.exec(s)
  if (!m) return null
  const mo = MON[m[1]!.slice(0, 3).toLowerCase()]
  if (!mo) return null
  const date = `${m[3]}-${mo}-${p2(Number(m[2]))}`
  if (!m[4]) return date
  return `${date}T${p2(h24(Number(m[4]), m[7]))}:${m[5]}:${m[6] ?? '00'}`
}

/** BOC: "18.09.2026 12:40:06 PM" */
export function dmyDot(s: string): string | null {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]\.?M\.?)?)?/i.exec(s)
  if (!m) return null
  const date = `${m[3]}-${p2(Number(m[2]))}-${p2(Number(m[1]))}`
  if (!m[4]) return date
  return `${date}T${p2(h24(Number(m[4]), m[7]))}:${m[5]}:${m[6] ?? '00'}`
}

/** Seylan / People's / NDB / ComBank: "2026-09-18 12:44:39pm", "2026-09-18" */
export function isoish(s: string): string | null {
  const m = /(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?)?/i.exec(s)
  if (!m) return null
  const date = `${m[1]}-${m[2]}-${m[3]}`
  if (!m[4]) return date
  return `${date}T${p2(h24(Number(m[4]), m[7]))}:${m[5]}:${m[6] ?? '00'}`
}

/** NSB: "18/09/2026" — day first, unlike ComBank's ISO. */
export function dmySlash(s: string): string | null {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s)
  if (!m) return null
  return `${m[3]}-${p2(Number(m[2]))}-${p2(Number(m[1]))}`
}

/** NTB / DFCC: "18 September 2026 12:10 PM", "18 September 2026" */
export function dmyMonth(s: string): string | null {
  const m =
    /(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})(?:[\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]\.?M\.?)?)?/i.exec(
      s,
    )
  if (!m) return null
  const mo = MON[m[2]!.slice(0, 3).toLowerCase()]
  if (!mo) return null
  const date = `${m[3]}-${mo}-${p2(Number(m[1]))}`
  if (!m[4]) return date
  return `${date}T${p2(h24(Number(m[4]), m[7]))}:${m[5]}:${m[6] ?? '00'}`
}
