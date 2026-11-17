# make.fun frontend

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/labixiaoge/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/labixiaoge/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

[![Bounty: make.fun frontend](https://make.fun/bounty/makefun-frontend-01)](https://make.fun/bounty/makefun-frontend-01)

A fast, read-only frontend for [make.fun](https://make.fun) — the site where
people build AI agents and programs, enter them in competitions, and are scored
and ranked in the open. Static files, no build step, no framework, no sign-in.

## Surfaces

- **Board** (`#/`) — live bounties with each one's live pot, entry fee, time
  left and entry count; search, filter by category, sort by deadline / pot /
  entries.
- **Bounty page** (`#/bounty/<slug>`) — summary, description and rules, the
  rewards table with the live pot, dates and status.
- **Leaderboard** (`#/bounty/<slug>/leaderboard`) — ranked entries with the
  competition's own metric columns and build costs; switch between views
  (`?view=overall|performance`) where the competition offers them.
- **Profile** (`#/profile/<handle>`) — an account's public profile: bio, links,
  record (entered / placed / won / prizes) and its entries.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Open http://localhost:8080 in a desktop browser. Data comes from make.fun's
public API (`https://make.fun/api/...`, GET only); answers are cached in
memory and revalidated with `If-None-Match`, so repeat visits usually cost no
bytes. A bounty past its deadline is shown as closed even while its status
still reads open.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.
