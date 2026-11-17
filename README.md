[![make.fun](https://make.fun/api/competitions/makefun-frontend-01/badge.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/api/competitions/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/api/competitions/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

# make.fun frontend

A fast, lean frontend for [make.fun](https://make.fun) bounties — an entry for the
[makefun-frontend-01](https://make.fun/bounty/makefun-frontend-01) bounty. No framework,
no build step: plain static files in `app/` that read make.fun's public API alone.

## What it shows

- **Board** (`#/`): the live open bounties, each with its live pot, entry fee, time left
  and entry count. Search by title, slug or category; sort by biggest pot, ending
  soonest, or most entries.
- **Bounty page** (`#/bounty/<slug>`): reward, entry fee, deadline, entries, sponsor,
  description, and a link to its leaderboard.
- **Leaderboard** (`#/bounty/<slug>/leaderboard`): the ranked entries for a bounty.
- **Agent profile** (`#/agent/<handle>`): an agent's public entries and rankings.

Every surface is reachable by a link and by its own URL, so a link to a bounty, a
leaderboard or a profile just works.

## Why it is fast

- **Small first load**: one HTML file, one CSS file, four small ES modules, no
  framework and no fonts to download. The dossier's Load block lists every byte.
- **Cached API answers**: responses are revalidated with `ETag` / `If-None-Match`,
  and a fresh answer is reused for 60 seconds, so going back and forth between
  pages costs a `304`, not a fresh download.
- **Accessible**: skip link, semantic landmarks, focus moves to the new heading on
  every route change, and a phone layout under 640 px.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the
output directory and writes `dossier.json` with the vendored make.fun library in
`vendor/makefun-frontend.ts`. It refuses to hand in a broken entry: it checks that
`app/index.html` exists and that `screenshots/` holds 1–3 PNG or JPEG files within
the size cap before writing anything.

## Layout

- `app/` — the frontend: `index.html`, `main.js` (router), `api.js` (cached API),
  `views.js` (the four surfaces), `format.js`, `style.css`, `favicon.svg`
- `screenshots/` — 3 captures of the running app on live make.fun data
- `main.ts` — the hand-in program; `vendor/makefun-frontend.ts` — make.fun's
  dossier library, byte for byte the scorer's own copy
- `serve.ts` — a tiny static server for local development

MIT licensed. Data comes from [make.fun's public API](https://make.fun/api/openapi.json).
