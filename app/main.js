// A make.fun frontend: the board of open bounties, a page for each bounty, its leaderboard,
// and an account's public profile, on hash routes.
//
//   #/                          the board
//   #/bounty/<slug>             one bounty
//   #/bounty/<slug>/leaderboard that bounty's leaderboard
//   #/u/<handle>                an account's public profile
//   #/rankings                  the site-wide rankings (by wins; #/rankings/paid by prize money)
//
// window.__shotReady is false while a page loads and true once its data is on screen, so a
// screenshot script knows when to capture. The board refreshes every 60 seconds with the
// API's ETag revalidation, so a repeat fetch costs nothing when nothing changed.

import { getBounties, getBounty, getLeaderboard, getProfile, getRankings } from './api.js';
import { board, bounty, leaderboard, profile, rankings } from './views.js';

const app = document.getElementById('app');
let refreshTimer = 0;

function loading(message) {
  app.innerHTML = `<p role="status">${message}</p>`;
}

function failed(err) {
  app.innerHTML = `<p role="alert">Could not load this page: ${err.message}. <a href="#/">Back to the board</a></p>`;
  window.__shotReady = true;
}

function wireBoardFilter() {
  const input = document.getElementById('filter');
  const list = document.getElementById('board');
  if (!input || !list) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    for (const li of list.children) {
      li.style.display = q && !li.textContent.toLowerCase().includes(q) ? 'none' : '';
    }
  });
}

async function render() {
  window.__shotReady = false;
  window.clearTimeout(refreshTimer);
  const hash = location.hash || '#/';
  try {
    let match;
    if ((match = hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/))) {
      const slug = decodeURIComponent(match[1]);
      loading('Loading the leaderboard…');
      const { data, fromCache } = await getLeaderboard(slug);
      document.title = `Leaderboard · ${data.competition?.title ?? slug} | make.fun bounties`;
      app.innerHTML = leaderboard(data, slug, fromCache);
    } else if ((match = hash.match(/^#\/bounty\/([^/]+)$/))) {
      const slug = decodeURIComponent(match[1]);
      loading('Loading the bounty…');
      const { data, fromCache } = await getBounty(slug);
      document.title = `${data.title} | make.fun bounties`;
      app.innerHTML = bounty(data, fromCache);
    } else if ((match = hash.match(/^#\/u\/([^/]+)$/))) {
      const handle = decodeURIComponent(match[1]);
      loading('Loading the profile…');
      const { data, fromCache } = await getProfile(handle);
      document.title = `@${data.handle} | make.fun bounties`;
      app.innerHTML = profile(data, fromCache);
    } else if ((match = hash.match(/^#\/rankings(?:\/(paid))?$/))) {
      const order = match[1] === 'paid' ? 'paid' : 'wins';
      loading('Loading the rankings…');
      const { data, fromCache } = await getRankings(order);
      document.title = 'Rankings | make.fun bounties';
      app.innerHTML = rankings(data, order, fromCache);
    } else {
      loading('Loading the board…');
      const { data, fromCache } = await getBounties();
      document.title = 'make.fun bounties';
      app.innerHTML = board(data, fromCache);
      wireBoardFilter();
      // Keep the board fresh without re-downloading what did not change.
      refreshTimer = window.setTimeout(() => {
        if ((location.hash || '#/') === '#/') render();
      }, 60000);
    }
  } catch (err) {
    failed(err);
    return;
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
