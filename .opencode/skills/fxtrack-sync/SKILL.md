---
name: fxtrack-sync
description: Use when committing, rebasing, pushing, or syncing fxtrack changes, bumping GitHub Actions versions, or checking tick/data status. Triggers on "sync", "commit", "push", "tick status", "how many banks", "CI".
---

# Syncing fxtrack

## Before committing

- `npm run check` must pass.
- Stage only intended files. Never commit `packages/web/public/d/` or `.tmp/` (both gitignored).
- Don't commit locally generated `data/` changes unless intentionally refreshing data — the bot
  pushes `data:` commits to `main` and they will conflict.

## Identity

If git has no identity configured, pass one inline for the commit/rebase rather than changing
global config:

```
git -c user.name="..." -c user.email="..." commit -m "..."
```

## Sync

The scheduled bot pushes `data:` commits, so rebase before pushing:

```
git fetch origin
git rebase origin/main
git push origin main
```

## Tick status

- Run history: `git fetch origin && git show origin/main:data/runs.json` (last 48 runs, each with
  `ok`/`bad` counts and a `note` of error strings).
- Live run state:
  `https://api.github.com/repos/<owner>/<repo>/actions/workflows/tick.yml/runs`.
- `data/latest.json` holds the newest `Rate` per bank. The board
  (`packages/web/src/lib/store.ts`) drops any bank whose `ts` is older than 24h, so
  `9 retail banks − stale = visible` (a healthy run shows all 9 + `cbsl`).
- No tick since a code change? Trigger **Actions → tick → Run workflow** (workflow_dispatch is
  enabled) or wait for the next cron (`04:10`, `04:40`, `05:10`, `05:25` UTC, then the same pattern
  at `07/08`, `10/11`, `13/14`).

## Action versions

Keep the `node24` releases together across all workflows — Node 20 runners are deprecated:

`actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-pages-artifact@v5`,
`actions/deploy-pages@v5`.

The tick step reads the optional `secrets.FX_PROXY`; when unset, `get()` falls back to the reader.
