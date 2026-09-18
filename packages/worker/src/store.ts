import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Bank, Hist, Intra, Latest, Rate, Ser } from '@fxtrack/shared'
import { dayCo } from './lib/time'
import type { Quote } from './srcs/types'

// Walks up to the workspace root so the data directory resolves the same way
// whether a script is run from the repo root or from inside a package.
export function root(): string {
  let d = process.cwd()
  for (;;) {
    if (existsSync(join(d, 'package-lock.json'))) return d
    const up = dirname(d)
    if (up === d) return process.cwd()
    d = up
  }
}

const DIR = process.env.FX_DATA ?? join(root(), 'data')
const F_DAY = join(DIR, 'day.csv')
const F_TICK = join(DIR, 'tick.csv')
const F_LATEST = join(DIR, 'latest.json')
const F_RUNS = join(DIR, 'runs.json')

const DAY_HEAD = 'bank,d,tt_buy,tt_sell,n_buy,n_sell,mid'
const TICK_HEAD = 'bank,ts,eff,tt_buy,tt_sell,n_buy,n_sell,mid'

export const FLD = ['ttBuy', 'ttSell', 'nBuy', 'nSell', 'mid'] as const

export interface Day {
  bank: string
  d: string
  ttBuy: number | null
  ttSell: number | null
  nBuy: number | null
  nSell: number | null
  mid: number | null
}

export interface Tick extends Omit<Day, 'd'> {
  ts: number
  eff: string | null
}

export interface Run {
  ts: number
  ok: number
  bad: number
  ms: number
  note: string
}

// Both writers share this so a value never re-serialises differently and
// produces a spurious diff. Trims float noise without padding zeros.
const s = (v: number | null): string => (v == null ? '' : String(Math.round(v * 1e4) / 1e4))
const p = (x: string): number | null => (x === '' ? null : Number(x))

function lines(f: string): string[] {
  if (!existsSync(f)) return []
  return readFileSync(f, 'utf8').split('\n').slice(1).filter(Boolean)
}

function put(f: string, body: string): void {
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, body)
}

export function readDay(): Day[] {
  return lines(F_DAY).map((l) => {
    const c = l.split(',')
    return {
      bank: c[0]!,
      d: c[1]!,
      ttBuy: p(c[2]!),
      ttSell: p(c[3]!),
      nBuy: p(c[4]!),
      nSell: p(c[5]!),
      mid: p(c[6]!),
    }
  })
}

export function writeDay(rows: Day[]): void {
  rows.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.bank < b.bank ? -1 : a.bank > b.bank ? 1 : 0))
  const body = rows.map((r) => `${r.bank},${r.d},${s(r.ttBuy)},${s(r.ttSell)},${s(r.nBuy)},${s(r.nSell)},${s(r.mid)}`)
  put(F_DAY, `${DAY_HEAD}\n${body.join('\n')}\n`)
}

export function readTick(): Tick[] {
  return lines(F_TICK).map((l) => {
    const c = l.split(',')
    return {
      bank: c[0]!,
      ts: Number(c[1]),
      eff: c[2] === '' ? null : c[2]!,
      ttBuy: p(c[3]!),
      ttSell: p(c[4]!),
      nBuy: p(c[5]!),
      nSell: p(c[6]!),
      mid: p(c[7]!),
    }
  })
}

function addTicks(ts: Tick[]): void {
  const body = ts
    .map(
      (t) =>
        `${t.bank},${t.ts},${t.eff ?? ''},${s(t.ttBuy)},${s(t.ttSell)},${s(t.nBuy)},${s(t.nSell)},${s(t.mid)}`,
    )
    .join('\n')
  if (!existsSync(F_TICK)) {
    put(F_TICK, `${TICK_HEAD}\n${body}\n`)
    return
  }
  appendFileSync(F_TICK, `${body}\n`)
}

export function readLatest(): Record<string, Rate> {
  if (!existsSync(F_LATEST)) return {}
  return JSON.parse(readFileSync(F_LATEST, 'utf8')) as Record<string, Rate>
}

export function readRuns(): Run[] {
  if (!existsSync(F_RUNS)) return []
  return JSON.parse(readFileSync(F_RUNS, 'utf8')) as Run[]
}

const RUNS_KEEP = 48

export function logRun(r: Run): void {
  const all = [...readRuns(), { ...r, note: r.note.slice(0, 900) }].slice(-RUNS_KEEP)
  put(F_RUNS, `${JSON.stringify(all, null, 0)}\n`)
}

const same = (a: Tick, q: Quote): boolean => FLD.every((f) => (a[f] ?? null) === (q[f] ?? null))

/**
 * A missing field must never erase one a source published earlier, so day rows
 * merge field-by-field rather than being replaced outright.
 */
export function save(hits: { id: string; ts: number; q: Quote }[]): number {
  const day = readDay()
  const at = new Map(day.map((r, i) => [`${r.bank}|${r.d}`, i]))

  const last = new Map<string, Tick>()
  for (const t of readTick()) last.set(t.bank, t)

  const lat = readLatest()
  const fresh: Tick[] = []

  for (const { id, ts, q } of hits) {
    const d = dayCo(ts)
    const k = `${id}|${d}`
    const i = at.get(k)

    if (i == null) {
      at.set(k, day.length)
      day.push({
        bank: id,
        d,
        ttBuy: q.ttBuy ?? null,
        ttSell: q.ttSell ?? null,
        nBuy: q.nBuy ?? null,
        nSell: q.nSell ?? null,
        mid: q.mid ?? null,
      })
    } else {
      const row = day[i]!
      for (const f of FLD) if (q[f] != null) row[f] = q[f]!
    }

    const prev = last.get(id)
    const t: Tick = {
      bank: id,
      ts,
      eff: q.eff ?? null,
      ttBuy: q.ttBuy ?? null,
      ttSell: q.ttSell ?? null,
      nBuy: q.nBuy ?? null,
      nSell: q.nSell ?? null,
      mid: q.mid ?? null,
    }
    if (!prev || !same(prev, q)) fresh.push(t)

    lat[id] = { bank: id, ts, eff: t.eff, ttBuy: t.ttBuy, ttSell: t.ttSell, nBuy: t.nBuy, nSell: t.nSell, mid: t.mid }
  }

  writeDay(day)
  if (fresh.length) addTicks(fresh)
  put(F_LATEST, `${JSON.stringify(lat, null, 0)}\n`)
  return fresh.length
}

const now = () => Math.floor(Date.now() / 1000)

export function buildLatest(banks: Bank[]): Latest {
  const lat = readLatest()
  return { gen: now(), banks, rates: banks.map((b) => lat[b.id]).filter((r): r is Rate => !!r) }
}

/** `n` trims the axis to the most recent n days so each window ships its own file. */
export function buildHist(n?: number): Hist {
  const rows = readDay()
  const all = [...new Set(rows.map((r) => r.d))].sort()
  const days = n != null && n < all.length ? all.slice(-n) : all
  const at = new Map(days.map((d, i) => [d, i]))

  const ser: Record<string, Ser> = {}
  const blank = (): Ser => ({
    ttBuy: new Array(days.length).fill(null),
    ttSell: new Array(days.length).fill(null),
    nBuy: new Array(days.length).fill(null),
    nSell: new Array(days.length).fill(null),
    mid: new Array(days.length).fill(null),
  })

  for (const r of rows) {
    const i = at.get(r.d)
    if (i == null) continue
    const x = (ser[r.bank] ??= blank())
    x.ttBuy[i] = r.ttBuy
    x.ttSell[i] = r.ttSell
    x.nBuy[i] = r.nBuy
    x.nSell[i] = r.nSell
    x.mid[i] = r.mid
  }

  return { gen: now(), days, ser }
}

export function buildIntra(ids: string[], hours = 24): Intra {
  const ticks = readTick().sort((a, b) => a.ts - b.ts)
  const runs = readRuns().map((r) => r.ts)
  const to = now()
  const from = to - hours * 3600
  const points = [
    ...new Set([...runs, ...ticks.map((t) => t.ts)].filter((ts) => ts >= from && ts <= to)),
  ].sort((a, b) => a - b)
  const ser: Record<string, Ser> = {}
  const blank = (): Ser => ({
    ttBuy: new Array(points.length).fill(null),
    ttSell: new Array(points.length).fill(null),
    nBuy: new Array(points.length).fill(null),
    nSell: new Array(points.length).fill(null),
    mid: new Array(points.length).fill(null),
  })
  for (const id of ids) ser[id] = blank()

  const state = new Map<string, Tick>()
  let j = 0
  for (let i = 0; i < points.length; i++) {
    const ts = points[i]!
    while (j < ticks.length && ticks[j]!.ts <= ts) {
      const tick = ticks[j]!
      state.set(tick.bank, tick)
      j++
    }
    for (const [id, tick] of state) {
      const x = (ser[id] ??= blank())
      x.ttBuy[i] = tick.ttBuy
      x.ttSell[i] = tick.ttSell
      x.nBuy[i] = tick.nBuy
      x.nSell[i] = tick.nSell
      x.mid[i] = tick.mid
    }
  }

  return { gen: now(), ts: points, ser }
}
