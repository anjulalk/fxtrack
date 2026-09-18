/**
 * Workers send no User-Agent by default, and BOC, NSB, Nations Trust and
 * Commercial Bank all answer 403 without one.
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

export type Get = (url: string, init?: RequestInit) => Promise<Response>

export async function get(url: string, init: RequestInit = {}, ms = 15_000): Promise<Response> {
  const h = new Headers(init.headers)
  if (!h.has('user-agent')) h.set('user-agent', UA)
  if (!h.has('accept'))
    h.set('accept', 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8')
  if (!h.has('accept-language')) h.set('accept-language', 'en-US,en;q=0.9')

  const res = await fetch(url, {
    ...init,
    headers: h,
    redirect: 'follow',
    signal: AbortSignal.timeout(ms),
    cf: { cacheTtl: 0, cacheEverything: false },
  } as RequestInit)

  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res
}

/** Builds an urlencoded body, repeating keys for array values. */
export function form(o: Record<string, string | string[]>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v)) for (const x of v) p.append(k, x)
    else p.append(k, v)
  }
  return p.toString()
}

export function post(url: string, body: Record<string, string | string[]>, ms?: number) {
  return get(
    url,
    {
      method: 'POST',
      body: form(body),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    },
    ms,
  )
}
