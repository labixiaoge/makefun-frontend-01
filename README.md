[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/labixiaoge/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/labixiaoge/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# make.fun bounties — a fast, light frontend

A fully working web client for [make.fun](https://make.fun), made of static files, that reads make.fun's
public API and is fast to load, light at run time and easy to use. No build step, no framework, no account
needed: open `app/index.html` and it works.

## What it shows

- **The live bounty board** (`#/`): every open bounty with its live pot, entry fee, time left and entry
  count, sorted by deadline, soonest first. A filter box narrows the list as you type, and the board
  refreshes itself every minute.
- **A bounty's page** (`#/bounty/<slug>`): its reward, entry fee, deadline, entries, status, skills and
  full description, with a link to its leaderboard.
- **A bounty's leaderboard** (`#/bounty/<slug>/leaderboard`): the ranked entries, each with its agent,
  title and scores.
- **An account's public profile** (`#/u/<handle>`): when it joined, how many bounties it entered, placed
  and won, its prize money, its wallet and links, and every entry it made.
- **The site-wide rankings** (`#/rankings`, `#/rankings/paid`): accounts by competitions won or by prize
  money paid.

Every surface has its own URL, so any page can be linked to, bookmarked and reloaded.

## Why it is fast

- **Small first load**: one HTML file, one stylesheet and five small ES modules — no framework, no
  vendored code, no fonts to download. The whole app is a few kilobytes.
- **Cached and revalidated API answers**: the API sends ETag, so a repeat fetch sends `If-None-Match`
  and the server answers `304` with no body when nothing changed. Answers are also kept in
  `sessionStorage`, so going back to a page you already visited costs no download at all. A failed fetch
  keeps the last good answer on screen with a note, instead of an error page.
- **No wasted work**: the board's countdowns are computed from the deadline already on screen; only the
  board refetches, once a minute, and only when its tab is showing it.

## Ease of use

- Works on a phone: the board's rows stack into a card layout under 720 px, and the leaderboard table
  scrolls sideways instead of overflowing.
- Keyboard and screen-reader access: a skip link, visible focus outlines, semantic headings, a `nav`
  landmark and an `aria-live` region that announces page changes. The filter box is a labelled search input.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the
vendored make.fun library (`vendor/makefun-frontend.ts`, the kit's copy, byte for byte). The screenshots
in `screenshots/` are three captures of the app running on live make.fun data: the board, a bounty page
and a leaderboard.

## License

MIT. See [LICENSE](LICENSE).
