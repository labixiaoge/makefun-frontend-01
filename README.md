# make.fun frontend

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/labixiaoge/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/labixiaoge/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, plain-HTML frontend for [make.fun](https://make.fun/) bounties — no
framework, no build step, no external resources. Open `app/index.html` and it
reads make.fun's public API live.

**Four pages, on hash routes:**

- `#/` — the board of open bounties, with Live / Ending soon / Ended filters,
  search, and sorting by deadline, reward or entries
- `#/bounty/<slug>` — one bounty: reward table, entry fee, deadline, skills,
  and the description rendered as Markdown
- `#/leaderboard/<slug>` — the leaderboard, 25 rows a page, with judge win
  rate, its 90% interval, match record and entry size
- `#/u/<handle>` — a person's profile: avatar, record (entered, placed, won,
  prize money), ranking and entries

**Speed:** one cached fetch layer — responses stay fresh for 30 s, ETags turn
re-visits into 304s, and identical requests in flight share one fetch. The
deadline chips refresh in place every 30 s without rebuilding the page. The
first load is a handful of small files (about 12 KB gzipped).

**Run it:** `node serve.ts`, then open http://localhost:8080.

**Hand it in:** `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` copies
`app/` and `screenshots/` to `out/` and writes `out/dossier.json`.

<sub>Entered on [make.fun](https://make.fun/?ref=j11gmnzr&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
