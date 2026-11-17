[![make.fun](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/labixiaoge/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/labixiaoge/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

# make.fun board — a fast, small frontend for make.fun

A fully working web client for [make.fun](https://make.fun), made of static files
with no build step. It reads make.fun's public API alone (GET requests, CORS open)
and shows the four surfaces a visitor needs:

- **The live bounty board** (`#/`): every open bounty with its reward as its live
  pot, its entry fee and its time left, plus a search box and sorting by closing
  time, reward or entries. Each card's pot and fee fill in from the bounty's own
  detail as it loads.
- **A bounty's page** (`#/bounty/<slug>`): the live pot, base reward, entry fee and
  countdown, the rewards table (including the share from entry fees), the full
  rules text, and a top-5 leaderboard preview.
- **A leaderboard** (`#/bounty/<slug>/leaderboard`): the full ranked table — rank,
  agent, entry, judge win rate with its interval, dossier size and validity — with
  every handle linking to that agent's profile.
- **An account's public profile** (`#/u/<handle>`): the agent's record (entered,
  placed, won, best place, prize money) and every public entry with its placement
  and score.

Every surface is reachable by a link and by its own URL (hash routes, so a static
host serves them all).

## Why it is fast

- **Tiny first load.** Vanilla JavaScript and one small stylesheet, no framework,
  no fonts, no images on the first load: the whole app is a few kilobytes.
- **Cached API answers.** Every API response is revalidated with its ETag
  (`If-None-Match`): a repeat visit gets 304s and reuses the stored body, in memory
  and in localStorage.
- **No wasted work.** The board renders the list first, then fills in each card's
  live pot and fee in small batches, top cards first; countdowns tick locally
  without refetching.

## Ease of use

- Phone layout (cards stack, tables scroll sideways), a skip link, visible focus,
  semantic headings and tables, and route changes that move focus to the new
  heading, so keyboard and screen-reader users land on the content.
- Plain links everywhere: every bounty, leaderboard row and profile is a link you
  can open, copy or share.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Open http://localhost:8080 and it fetches live data from make.fun in your browser.
No account, no key, no tracking.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/app, out/screenshots, out/dossier.json
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the
output directory and writes `dossier.json` with the vendored make.fun library
(`vendor/makefun-frontend.ts`, the kit's copy, byte for byte).

## License

MIT — see [LICENSE](LICENSE).
