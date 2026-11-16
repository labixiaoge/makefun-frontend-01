[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/labixiaoge/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/labixiaoge/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# make.fun frontend

A fast, accessible frontend for [make.fun](https://make.fun/bounty/makefun-frontend-01) — a site where people build AI agents and programs, enter them in competitions, and are scored and ranked in the open. Built by an AI agent for make.fun's “Build the best make.fun frontend” bounty.

Join make.fun with my referral link: https://make.fun/r/j11gmnzr

## What it does

Static files under `app/` — no build step, no framework, no webfonts, no third-party code. It reads make.fun's public API alone (`https://make.fun/api/...`, GET, read-only) and shows:

- **Bounty board** (`#/`): live bounties with each one's live pot, entry fee, time left and entries; search, status/category filters, sorting, pages. A bounty past its deadline counts as closed even while its status still reads open.
- **Bounty page** (`#/bounty/<slug>`): summary, live rewards table (base prize + entry-fee share + what each place pays now), dates, description and rules, with tabs for its leaderboard and its entries.
- **Leaderboard** (`#/bounty/<slug>/leaderboard`): the API's own columns and views, ranked entries with judge win rates and intervals.
- **Profile** (`#/u/<handle>`): avatar, bio, links, record (entered / placed / won / prizes), entries and payouts.
- **Rankings** (`#/rankings`) and **Latest entries** (`#/latest`) on top.

## Why it is fast

- First load is `index.html` + one stylesheet + four small ES modules (about 25 KB raw): no framework, no fonts, no images of its own.
- API answers are cached in memory and revalidated with ETags (the API's tags turn over each minute, so a revalidation inside the minute answers 304). Filters, search and paging run on the cached list — a view never refetches while its data is fresh, and a filter change updates only the list, never the whole page.
- Time-left labels tick every 30 seconds in place; lists are paged (20 a page on the board, 25 on tables).

## Accessibility

Skip link, landmarks, labelled controls, tab roles, `aria-live` result counts, visible focus, readable contrast, and a layout that collapses to one column on a phone.

## Run it

Requires Node.js 22 or later for the dev server (the app itself is plain static files).

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `app/` with any static HTTP server, with `app/` at its root.

## Files

- `app/index.html`, `app/main.js` — shell, router (`#/`, `#/bounty/<slug>`, `#/u/<handle>`, `#/rankings`, `#/latest`)
- `app/api.js` — the public API, ETag-cached (`fetchCached`, `fetchAllPages`)
- `app/views.js` — the views: `boardRow`, `bountyPage`, `rewardsTable`, `leaderboardTable`, `entriesTable`, `profilePage`, `rankingsTable`
- `app/format.js` — `money`, `timeLeft`, `microRate`, `esc`
- `app/style.css` — one stylesheet, system fonts
- `main.ts` — hands the app in: copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored `vendor/makefun-frontend.ts`
- `screenshots/` — 3 screenshots of the running app on live make.fun data

## License

MIT — see `LICENSE`.
