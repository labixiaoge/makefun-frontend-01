// Routing and boot: hash routes for the four surfaces.
//
//   #/                              the bounty board
//   #/bounty/<slug>                 one bounty's page
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard (?view=overall|performance)
//   #/profile/<handle>              an account's public profile
//
// window.__shotReady is false while a route loads and true once its data has
// rendered, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, errorPage, leaderboard, profile } from './views.js';
import { timeLeft } from './format.js';

const app = document.getElementById('app');

// Board controls live in module state; changing them re-renders only the list.
const boardState = { q: '', cat: '', sort: 'deadline' };
let boardData = null;

function parseHash() {
  const [path, query = ''] = location.hash.replace(/^#/, '').split('?');
  return { path, params: new URLSearchParams(query) };
}

function loading(text) {
  app.innerHTML = `<p class="loading" role="status">${text}</p>`;
}

/** Refresh every on-screen countdown once a minute, without re-fetching. */
function tick() {
  for (const el of document.querySelectorAll('[data-deadline]')) {
    el.textContent = timeLeft(el.dataset.deadline);
  }
}
setInterval(tick, 30_000);

function wireBoardFilter() {
  const form = document.getElementById('board-filter');
  if (!form) return;
  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('input', () => {
    boardState.q = form.q.value;
    boardState.cat = form.cat.value;
    boardState.sort = form.sort.value;
    const list = document.getElementById('board-list');
    if (boardData && list) {
      // Re-render the list alone; the filter form keeps focus and state.
      const tmp = document.createElement('div');
      tmp.innerHTML = board(boardData, boardState);
      list.replaceWith(tmp.querySelector('#board-list'));
    }
  });
}

async function render() {
  window.__shotReady = false;
  const { path, params } = parseHash();
  const bountyMatch = path.match(/^\/bounty\/([^/]+)\/leaderboard$/);
  const singleMatch = path.match(/^\/bounty\/([^/]+)$/);
  const profileMatch = path.match(/^\/profile\/([^/]+)$/);
  try {
    if (bountyMatch) {
      const slug = decodeURIComponent(bountyMatch[1]);
      loading('Loading leaderboard…');
      const lb = await getLeaderboard(slug, params.get('view') || undefined);
      document.title = `${lb.competition?.title ?? slug} leaderboard | make.fun`;
      app.innerHTML = leaderboard(lb, slug);
    } else if (singleMatch) {
      const slug = decodeURIComponent(singleMatch[1]);
      loading('Loading bounty…');
      const b = await getBounty(slug);
      document.title = `${b.title} | make.fun`;
      app.innerHTML = bounty(b);
    } else if (profileMatch) {
      const handle = decodeURIComponent(profileMatch[1]);
      loading('Loading profile…');
      const p = await getProfile(handle);
      document.title = `${p.display_name ?? p.handle} | make.fun`;
      app.innerHTML = profile(p);
    } else {
      loading('Loading bounties…');
      boardData = await getBounties();
      document.title = 'Open bounties | make.fun';
      app.innerHTML = board(boardData, boardState);
      wireBoardFilter();
    }
  } catch (err) {
    document.title = 'make.fun';
    app.innerHTML = errorPage(err.message);
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
