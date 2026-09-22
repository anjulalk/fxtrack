/**
 * Workers send no User-Agent by default, and BOC, NSB, Nations Trust and
 * Commercial Bank all answer 403 without one.
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

export type Get = (url: string, init?: RequestInit) => Promise<Response>

const TIMEOUT = 15_000
const TRIES = 3
const BACKOFF = 400

class HttpError extends Error {
  constructor(
    readonly status: number,
    url: string,
  ) {
    super(`HTTP ${status} ${url}`)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * CloudFront's WAF rejects every cloud/CI egress IP for BOC and ComBank, so a
 * direct request from GitHub Actions can never succeed. A 403 is retried
 * through `FX_PROXY` when set (a `{url}` placeholder is substituted with the
 * encoded target, otherwise the target is appended), and through Google's
 * translation proxy when not — Google fetches the page from its own addresses.
 */
function relay(url: string): string {
  const t = process.env.FX_PROXY
  if (t)
    return t.includes('{url}') ? t.replace('{url}', encodeURIComponent(url)) : t + encodeURIComponent(url)

  const u = new URL(url)
  u.hostname = `${u.hostname.replace(/\./g, '-')}.translate.goog`
  u.searchParams.set('_x_tr_sl', 'auto')
  u.searchParams.set('_x_tr_tl', 'en')
  u.searchParams.set('_x_tr_hl', 'en')
  return u.toString()
}

async function attempt(url: string, init: RequestInit, ms: number): Promise<Response> {
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

  if (!res.ok) throw new HttpError(res.status, url)
  return res
}

/** A 4xx other than 403/429 is a bad request, so another attempt cannot help. */
const retriable = (e: unknown): boolean =>
  !(e instanceof HttpError) || e.status === 429 || e.status >= 500

async function relayed(url: string, init: RequestInit, ms: number, cause: HttpError): Promise<Response> {
  // A relay can only replay a GET; nothing here POSTs to a blocked host.
  if ((init.method ?? 'GET').toUpperCase() !== 'GET') throw cause

  const via = relay(url)
  for (let i = 0; i < TRIES; i++) {
    try {
      return await attempt(via, { headers: init.headers }, ms)
    } catch (e) {
      if (!retriable(e) || i === TRIES - 1)
        throw new Error(`${cause.message} (relay ${via}: ${e instanceof Error ? e.message : String(e)})`)
      await sleep(BACKOFF * 2 ** i)
    }
  }
  throw cause
}

export async function get(url: string, init: RequestInit = {}, ms = TIMEOUT): Promise<Response> {
  for (let i = 0; i < TRIES; i++) {
    try {
      return await attempt(url, init, ms)
    } catch (e) {
      if (e instanceof HttpError && e.status === 403) return relayed(url, init, ms, e)
      if (!retriable(e) || i === TRIES - 1) throw e
      await sleep(BACKOFF * 2 ** i)
    }
  }
  throw new Error(`HTTP failed ${url}`)
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
