import type { Hist, Latest, WinId } from '@fxtrack/shared'

// Resolved against the Vite base so the same build works at / and at /fxtrack/.
const B = import.meta.env.BASE_URL

async function j<T>(path: string): Promise<T> {
  const r = await fetch(path, { headers: { accept: 'application/json' } })
  if (!r.ok) throw new Error(`${r.status} on ${path}`)
  return (await r.json()) as T
}

export const getLatest = () => j<Latest>(`${B}d/latest.json`)
export const getHist = (w: WinId) => j<Hist>(`${B}d/hist-${w}.json`)
