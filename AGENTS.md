# fxtrack

USD/LKR bank-rate tracker for Sri Lanka. Scrapes published buying/selling rates from banks and
the Central Bank, keeps history, and renders a focused comparison UI.

## Layout

- `packages/shared` — types and rate-field logic shared by worker and web (`Bank`, `Rate`,
  `Latest`, `Hist`, `Intra`, `WINS`, `field`/`pick`/`cmp`).
- `packages/worker` — scraper and data pipeline (Node, run from GitHub Actions).
- `packages/web` — Vue 3 + Vite + Tailwind SPA, deployed to GitHub Pages.
- `data/` — the committed dataset (see below).
- `packages/web/public/d/` — generated snapshot JSON, gitignored, written by `npm run snap`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server for the web app |
| `npm run build` | Production build of the web app |
| `npm run check` | Typecheck every workspace (`tsc` + `vue-tsc`) — run before committing |
| `npm run tick` | Scrape every source once, update `data/`, log a run |
| `npm run snap` | Rebuild `packages/web/public/d/*.json` from `data/` |
| `npm run backfill` | Rewrite the `cbsl` rows in `data/day.csv` from CBSL's spot endpoint |

## Data pipeline

`tick` (`packages/worker/src/job.ts`):

1. Runs every source's `run()` in parallel with `Promise.allSettled`.
2. A source that throws or returns no usable field is logged bad; it never aborts the run.
3. `save()` (`store.ts`) merges field-by-field into `data/day.csv` (a missing field never erases
   a previous one), appends changed ticks to `data/tick.csv`, and writes `data/latest.json`.
4. Every run appends to `data/runs.json` (last 48 kept) with `ok`/`bad` counts and error notes.
5. `job.ts` exits non-zero only if **every** source fails.

Data files:

- `data/day.csv` — one row per bank per Colombo day (`bank,d,tt_buy,tt_sell,n_buy,n_sell,mid`).
- `data/tick.csv` — append-only ticks whenever a value changes (`bank,ts,eff,...`).
- `data/latest.json` — newest `Rate` per bank; drives the board.
- `data/runs.json` — run health; surfaced on the site.

`snap` (`packages/worker/src/snap.ts`) turns `data/` into per-window JSON (`latest.json`,
`hist-<win>.json`, `intra-1d.json`, `health.json`) under `packages/web/public/d/`.

## Sources

Adapters live in `packages/worker/src/srcs/<id>.ts` and are registered in `srcs/index.ts`. Each
exports a `Src` (`Bank` + `run(): Promise<Quote>`). Current sources: `sampath`, `seylan`, `boc`,
`combank`, `peoples`, `ndb`, `ntb`, `nsb`, `dfcc`, `cbsl`.

Helpers:

- `lib/html.ts` — `rows`, `strip`, `num`, `plaus` (USD/LKR sanity band 100–2000), `usdRow`.
- `srcs/table.ts` — `trio` (notes/drafts/TT six-column layout), `cols` (explicit column map;
  throws on layout drift), `stamp` (effective time).
- `lib/time.ts` — Colombo calendar helpers and per-bank timestamp parsers.

Quirks worth remembering:

- `trio` is only for the shared six-column order (BOC, ComBank, People's, NDB). `nsb` reverses
  notes/TT and `dfcc` collapses selling columns — both use `cols`.
- `nsb`'s path really is `/rates-tarriffs/...` (double r). `dfcc` needs
  `/rates-and-tariff/exchange-rates`; the short path 308-loops.
- `sampath` and `seylan` are JSON APIs, not HTML.
- `cbsl` POSTs to a PHP endpoint and is a single mid rate (`kind: 'cb'`), not a dealable bank rate.

## Networking (`packages/worker/src/lib/net.ts`)

- A browser `User-Agent` is mandatory: BOC, NSB, NTB and ComBank return 403 without one.
- **CloudFront WAF**: BOC and ComBank (and NTB's `www`) sit behind a CloudFront WAF that rejects
  every cloud/CI egress IP with 403, so GitHub Actions can never reach them directly.
  - NTB scrapes its apex origin instead of `www`.
  - BOC/ComBank have no unblocked origin, so `get()` relays any 403: through `FX_PROXY` when set
    (a `{url}` placeholder is replaced with the encoded target, otherwise the target is appended),
    else through Google's translation proxy (`<host-with-dashes>.translate.goog`). Only GET is relayed.
- Transient failures (timeouts, `fetch failed`, 5xx, 429) retry 3× with exponential backoff;
  other 4xx are not retried.
- Env: `FX_PROXY` (optional relay URL template), `FX_DATA` (data dir override).

## CI

- `.github/workflows/tick.yml` — scheduled scrapes + deploy; each publication window is hit
  several times because GitHub's schedule is best-effort.
- `.github/workflows/backfill.yml` — daily CBSL history refresh.
- `.github/workflows/deploy.yml` — rebuild/deploy on code pushes (ignores `data/**`).
- Actions are pinned to `node24` releases: `actions/checkout@v7`, `actions/setup-node@v7`,
  `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`. Bump these together — Node 20
  runners are deprecated.
- The tick step reads `secrets.FX_PROXY` (optional; unset falls back to the reader).
- Data commits are made by `fxtrack bot` with `GITHUB_TOKEN`, which does not retrigger workflows.

## Deploy

Served from the repo root on a custom subdomain (`packages/web/public/CNAME`). Build with
`BASE_PATH=/ SITE_URL=<origin> npm run build`. `SITE_URL` only affects the sitemap; keep it in
step with the canonical/social tags in `packages/web/index.html`.

## Web behaviour

- The board (`packages/web/src/lib/store.ts`) drops any bank whose last read is older than 24h
  (`STALE`), so a persistently failing source disappears rather than showing a stale number.
- `cbsl` is a reference line, not a board row (`kind: 'cb'`).

## Failure modes & diagnosis

### CloudFront WAF blocks CI (BOC, ComBank)

Diagnosed 2026-09-22. Symptom: `data/runs.json` shows
`boc: HTTP 403 https://www.boc.lk/rates-tariff` and `combank: HTTP 403 https://www.combank.lk/rates-tariff`
on every scheduled run; once each passes the 24h `STALE` window the board drops them (9 banks → 7).

Timeline: the first CI run (2026-09-18T08:59Z) was `ok 10`; from 2026-09-18T09:15Z onward both
403'd on every run until the relay fix landed (manual run 2026-09-22T20:13Z → `ok 10 bad 0`).

Evidence gathered:

- Both return `200` from a residential IP (local `npm run tick` = `ok 10 bad 0`).
- A datacenter fetcher gets CloudFront's own block page:
  `403 ERROR ... Request blocked. ... Generated by cloudfront (CloudFront)`.
- Headers show CloudFront in front of an nginx origin behind an AWS ALB:
  `via: 1.1 ....cloudfront.net`, `x-amz-cf-id`, `x-amz-cf-pop`, `set-cookie: AWSALB=...`.
- It is **IP-based, not header-based**: the exact headers that succeed locally still 403 from
  cloud/CI egress, and no UA/`sec-fetch`/`accept-encoding` tweak changes it.

Why there is no origin bypass (unlike NTB): NTB's `www` is CloudFront but its apex
`nationstrust.com` resolves straight to an Azure origin. BOC's apex `boc.lk` is *also* CloudFront
(`CNAME d231ync9qvk2mh.cloudfront.net`) and `combank.lk` has no A record. DNS enumeration found no
non-CloudFront rates origin — `online.boc.lk` (103.99.100.26) is the online-banking host (Apache)
and 403s on `/rates-tariff`.

Proxy testing (2026-09-22): `allorigins` 520, `codetabs` 522, `corsproxy.io` 401 (needs key),
`corsproxy.org` returned its own landing page (not a proxy), `thingproxy` failed,
`test.cors.workers.dev`/`cors.eu.org`/`api.cors.lol` 429, `proxy.corsfix.com` 400. Only Google
Translate's proxy (`<host-with-dashes>.translate.goog`) returned the real page, with rates and
effective timestamps that parse.

Fix: `get()` relays any 403 through `FX_PROXY` when set, else `translate.goog` (see Networking).

### Intermittent timeouts (NTB, NDB, People's)

Occasional `The operation was aborted due to timeout` at the 15s limit, or `no USD row` when a
response is truncated. Fixed by retrying transient failures (timeouts, `fetch failed`, 5xx, 429)
3× with backoff; non-403/429 4xx are never retried.

### Node 20 action deprecation

Warning: "Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced
to run on Node.js 24...". Fixed by bumping to `checkout@v7`, `setup-node@v7`,
`upload-pages-artifact@v5` (drops the internal `upload-artifact@v4`), `deploy-pages@v5`.

### Re-running the diagnosis

- Read run history: `git fetch origin && git show origin/main:data/runs.json` (each entry has
  `ok`/`bad` counts and a `note` with the error strings).
- Live run state: `https://api.github.com/repos/<owner>/<repo>/actions/workflows/tick.yml/runs`.
- Confirm a datacenter block: fetch the URL through a datacenter service (or the `webfetch` tool)
  and look for CloudFront's `Request blocked` body.
- Exercise the relay locally: bundle a script that stubs `globalThis.fetch` to return `403` for
  the bank host, then call the adapter's `run()`; the real reader should still parse a quote.

## Conventions

- Conventional-commit subjects: `feat:`, `fix(<area>):`, `style(web):`, `ci(tick):`, `data: ...`.
- Comments explain *why* (scraping workarounds, layout drift), not *what*.
- Run `npm run check` before committing.
- Never commit `packages/web/public/d/` or `.tmp/` (both gitignored).

## Git / sync

- If git has no identity configured, pass one inline (`git -c user.name=... -c user.email=...`)
  for the commit/rebase rather than changing global config.
- The scheduled bot pushes `data:` commits to `main`, so rebase before pushing:
  `git fetch origin && git rebase origin/main && git push origin main`.
- Don't commit locally generated `data/` changes unless intentionally refreshing data — they can
  conflict with the bot's commits.

## Verifying a change

- Typecheck: `npm run check`.
- Source sanity: `packages/worker/test/probe.ts` fetches every source and checks buy/sell ordering;
  `dump.ts` and `head.ts` inspect parsed rows for a URL.
- A full local `npm run tick` should report `ok 10 bad 0` on a residential connection.
