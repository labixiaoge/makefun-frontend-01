// A make.fun frontend: board, bounty page, leaderboard and agent profile,
// on hash routes so every surface has its own URL.
//
//   #/                          the board
//   #/bounty/<slug>             one bounty
//   #/bounty/<slug>/leaderboard its leaderboard
//   #/agent/<handle>            an agent's public profile
//
// window.__shotReady is false while a page loads and true once its data is
// on screen, so a screenshot script knows when to capture. After each
// route renders, focus moves to the page heading, so keyboard and
// screen-reader users land on the new content.

import { clearCache, getBounties, getBounty, getLeaderboard, getProfile, getRankings } from './api.js';
import { board, bounty, failure, leaderboard, loading, profile } from './views.js';

const app = document.getElementById('app');
let currentSearch = '';
let currentSort = 'pot';

/** Move focus to the page heading after a route renders, so keyboard and
 *  screen-reader users land on the new content. Only the heading takes
 *  focus: the main landmark never shows a focus ring. */
function focusHeading() {
  const h1 = app.querySelector('h1');
  if (h1) {
    h1.setAttribute('tabindex', '-1');
    h1.focus({ preventScroll: true });
  }
}

async function render() {
  window.__shotReady = false;
  const hash = location.hash || '#/';
  const bountyMatch = hash.match(/^#\/bounty\/([^/]+)(?:\/(leaderboard))?$/);
  const agentMatch = hash.match(/^#\/agent\/([^/]+)$/);
  try {
    if (bountyMatch) {
      const slug = decodeURIComponent(bountyMatch[1]);
      if (bountyMatch[2] === 'leaderboard') {
        app.innerHTML = loading('leaderboard');
        const data = await getLeaderboard(slug);
        document.title = `Leaderboard | ${data.competition?.title ?? slug} | make.fun bounties`;
        app.innerHTML = leaderboard(data, slug);
      } else {
        app.innerHTML = loading('bounty');
        const b = await getBounty(slug);
        document.title = `${b.title} | make.fun bounties`;
        app.innerHTML = bounty(b);
      }
    } else if (agentMatch) {
      const handle = decodeURIComponent(agentMatch[1]);
      app.innerHTML = loading('profile');
      const [prof, ranks] = await Promise.all([
        getProfile(handle).catch(() => ({ handle })),
        getRankings(handle).catch(() => ({ rankings: [] })),
      ]);
      document.title = `${prof.handle ?? handle} | make.fun bounties`;
      app.innerHTML = profile({ ...prof, rankings: ranks.rankings ?? ranks }, handle);
    } else {
      app.innerHTML = loading('bounties');
      const data = await getBounties();
      document.title = 'make.fun bounties';
      app.innerHTML = board(data, { q: currentSearch, sort: currentSort });
      const search = app.querySelector('input[name="q"]');
      const sort = app.querySelector('select[name="sort"]');
      if (search) {
        search.addEventListener('input', () => {
          currentSearch = search.value;
          const pos = search.selectionStart;
          app.innerHTML = board(data, { q: currentSearch, sort: currentSort });
          const next = app.querySelector('input[name="q"]');
          if (next) {
            next.focus();
            next.setSelectionRange(pos, pos);
          }
          wireBoard(data);
        });
      }
      wireBoard(data);
    }
  } catch (err) {
    clearCache();
    document.title = 'Error | make.fun bounties';
    app.innerHTML = failure(err.message || 'The make.fun API did not answer.', hash);
  }
  window.scrollTo(0, 0);
  focusHeading();
  window.__shotReady = true;
}

/** Wire the board's sort control after a render (the search input wires itself). */
function wireBoard(data) {
  const sort = app.querySelector('select[name="sort"]');
  if (!sort) return;
  sort.addEventListener('change', () => {
    currentSort = sort.value;
    app.innerHTML = board(data, { q: currentSearch, sort: currentSort });
    wireBoard(data);
  });
}

window.addEventListener('hashchange', render);
render();
