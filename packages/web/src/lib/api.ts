import type { Hist, Latest, WinId } from '@fxtrack/shared'

async function j<T>(path: string): Promise<T> {
  const r = await fetch(path, { headers: { accept: 'application/json' } })
  if (!r.ok) throw new Error(`${r.status} on ${path}`)
  return (await r.json()) as T
}

export const getLatest = () => j<Latest>('/d/latest.json')
export const getHist = (w: WinId) => j<Hist>(`/d/hist-${w}.json`)
