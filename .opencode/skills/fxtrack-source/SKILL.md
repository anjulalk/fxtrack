---
name: fxtrack-source
description: Use when adding, fixing, or debugging a bank rate source/scraper in fxtrack (packages/worker/src/srcs). Triggers on "source", "scraper", "adapter", "bank rate", "no USD row", "layout drift", "403".
---

# Maintaining fxtrack sources

## Adapter contract

Each `packages/worker/src/srcs/<id>.ts` exports a `Src` and is registered in `srcs/index.ts`
(`SRCS`):

```ts
export const id: Src = {
  id, name, short, url, kind: 'bank' | 'cb',
  async run(): Promise<Quote> { /* ... */ },
}
```

`Quote` fields: `eff`, `ttBuy`, `ttSell`, `nBuy`, `nSell`, `mid`. `has()` treats a quote with any
non-null field as usable. A source that throws or returns nothing is logged bad and never aborts
the run (`job.ts` exits non-zero only if every source fails).

## Parsing

- `lib/html.ts`: `rows(html)`, `strip`, `num`, `plaus` (USD/LKR sanity band 100–2000), `usdRow`.
- `srcs/table.ts`:
  - `trio(html)` — the shared six-column order (notes, drafts/cheques, TT): BOC, ComBank,
    People's, NDB.
  - `cols(html, { n, ... })` — explicit column map for banks that differ; throws on layout drift
    (numeric-cell count mismatch). Use for NSB (reverses notes/TT) and DFCC (collapses selling).
  - `stamp(html, re, parser)` — first regex match parsed by a `lib/time.ts` parser (`dmyDot`,
    `isoish`, `dmySlash`, `dmyMonth`, `monthDMY`).
- JSON APIs: `sampath` and `seylan` (`get(url, { headers: { accept: 'application/json' } }).json()`).

Never guess a column — a transposed read passes silently. `plaus` and `probe.ts`'s ordering checks
are the guards.

## Networking (`lib/net.ts`)

`get(url, init?, ms?)`:

- Sends a browser `User-Agent` (mandatory — BOC/NSB/NTB/ComBank 403 without one).
- Retries transient failures 3× with backoff (timeouts, `fetch failed`, 5xx, 429); non-403/429 4xx
  are not retried.
- On a 403 it relays the GET: through `FX_PROXY` if set (a `{url}` placeholder is substituted,
  otherwise the target is appended), else Google's `<host-with-dashes>.translate.goog`. POST is
  never relayed.

If a new source 403s from CI but works locally, suspect the CloudFront WAF. Check whether its apex
resolves to a non-CloudFront origin (the NTB fix) before relying on the relay. Full evidence is in
`AGENTS.md` → "Failure modes & diagnosis".

## Verify

1. `npm run check` (tsc + vue-tsc).
2. `packages/worker/test/probe.ts` — fetches every source and checks `ttBuy < ttSell`,
   `nBuy <= ttBuy`, `nSell >= ttSell`.
3. `dump.ts <id>` / `head.ts <url> <n>` — inspect parsed rows for a page.
4. `npm run tick` — expect `ok 10 bad 0` from a residential connection.
5. To exercise the relay without a blocked IP: bundle a script that stubs `globalThis.fetch` to
   return `403` for the bank host, call the adapter's `run()`, and confirm the reader still parses.
