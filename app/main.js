// A make.fun frontend: the board of open bounties, a page for each, a
// leaderboard and a profile, on hash routes.
//
//   #/                          the board
//   #/bounty/<slug>             one bounty
//   #/leaderboard/<slug>        that bounty's leaderboard
//   #/u/<handle>                a person's profile
//
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile, getRankings } from './api.js';
import { board, boardRows, bounty, leaderboard, profile } from './views.js';
import { timeLeft } from './format.js';

const app = document.getElementById('app');

/** Board toolbar state, kept across re-renders of the rows only. */
const boardState = { filter: 'all', search: '', sort: 'deadline' };
let boardItems = null;

function notFound(what) {
  document.title = `${what} not found | make.fun bounties`;
  app.innerHTML = `<h1>Not found</h1><p class="empty">That ${what} does not exist. It may have been removed, or the link is wrong.</p><p><a href="#/">Back to all bounties</a></p>`;
}

/** Swap a broken avatar image for its initials fallback. */
function wireAvatars(root) {
  root.querySelectorAll('img.avatar').forEach((img) => {
    img.addEventListener('error', () => {
      const span = document.createElement('span');
      span.className = 'avatar fallback';
      span.textContent = img.dataset.fallback ?? '?';
      img.replaceWith(span);
    });
  });
}

function showError(err) {
  document.title = 'Something went wrong | make.fun bounties';
  const detail = err?.status === 404 ? 'make.fun has no such page.' : `(${escText(err?.message ?? 'network error')})`;
  app.innerHTML = `<h1>Could not load this page</h1><p class="empty">${detail} Check your connection and try again.</p><p><button id="retry">Retry</button> <a href="#/">Back to all bounties</a></p>`;
  document.getElementById('retry')?.addEventListener('click', render);
}

function escText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function renderBoard() {
  document.title = 'make.fun bounties';
  if (!boardItems) {
    app.innerHTML = '<p>Loading…</p>';
    boardItems = (await getBounties()).items ?? [];
  }
  app.innerHTML = board({ items: boardItems }, boardState);
  wireAvatars(app);
  const search = document.getElementById('board-search');
  const sort = document.getElementById('board-sort');
  search?.addEventListener('input', () => {
    boardState.search = search.value;
    refreshBoardRows();
  });
  sort?.addEventListener('change', () => {
    boardState.sort = sort.value;
    refreshBoardRows();
  });
  app.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      boardState.filter = btn.dataset.filter;
      app.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('on', b === btn));
      refreshBoardRows();
    });
  });
}

function refreshBoardRows() {
  const rows = document.getElementById('board-rows');
  if (rows) {
    rows.innerHTML = boardRows(boardItems, boardState);
    wireAvatars(rows);
  }
}

async function renderBounty(slug) {
  app.innerHTML = '<p>Loading…</p>';
  let b;
  try {
    b = await getBounty(slug);
  } catch (err) {
    if (err?.status === 404) return notFound('bounty');
    throw err;
  }
  document.title = `${b.title} | make.fun bounties`;
  app.innerHTML = bounty(b);
  wireAvatars(app);
}

async function renderLeaderboard(slug, view, page) {
  app.innerHTML = '<p>Loading…</p>';
  let data;
  try {
    data = await getLeaderboard(slug, view);
  } catch (err) {
    if (err?.status === 404) return notFound('leaderboard');
    throw err;
  }
  document.title = `Leaderboard · ${data.competition?.title ?? slug} | make.fun bounties`;
  app.innerHTML = leaderboard(data, page);
  wireAvatars(app);
  app.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      location.hash = `#/leaderboard/${encodeURIComponent(slug)}?view=${encodeURIComponent(btn.dataset.view)}`;
    });
  });
  app.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = Number(btn.dataset.page);
      if (Number.isFinite(p)) renderLeaderboardPage(slug, view, p);
    });
  });
}

async function renderLeaderboardPage(slug, view, page) {
  const data = await getLeaderboard(slug, view);
  app.innerHTML = leaderboard(data, page);
  wireAvatars(app);
  app.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      location.hash = `#/leaderboard/${encodeURIComponent(slug)}?view=${encodeURIComponent(btn.dataset.view)}`;
    });
  });
  app.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = Number(btn.dataset.page);
      if (Number.isFinite(p)) renderLeaderboardPage(slug, view, p);
    });
  });
  window.scrollTo(0, 0);
}

async function renderProfile(handle) {
  app.innerHTML = '<p>Loading…</p>';
  let p;
  try {
    p = await getProfile(handle);
  } catch (err) {
    if (err?.status === 404) return notFound('profile');
    throw err;
  }
  let rankings = null;
  try {
    rankings = await getRankings(handle);
  } catch {
    rankings = null;
  }
  document.title = `${p.display_name ?? p.handle} | make.fun bounties`;
  app.innerHTML = profile(p, rankings);
  wireAvatars(app);
}

async function render() {
  // __shotSeq counts renders: automation waits for it to rise, so it never
  // mistakes the previous page's ready flag for this render's.
  window.__shotSeq = (window.__shotSeq ?? 0) + 1;
  window.__shotReady = false;
  try {
    const hash = location.hash || '#/';
    const [pathPart, queryPart] = hash.slice(2).split('?');
    const query = new URLSearchParams(queryPart ?? '');
    const bountyMatch = pathPart.match(/^bounty\/(.+)$/);
    const boardMatch = pathPart.match(/^leaderboard\/(.+)$/);
    const profileMatch = pathPart.match(/^u\/(.+)$/);
    if (bountyMatch) {
      await renderBounty(decodeURIComponent(bountyMatch[1]));
    } else if (boardMatch) {
      await renderLeaderboard(decodeURIComponent(boardMatch[1]), query.get('view') ?? 'performance', Number(query.get('page') ?? 1) || 1);
    } else if (profileMatch) {
      await renderProfile(decodeURIComponent(profileMatch[1]));
    } else {
      await renderBoard();
    }
  } catch (err) {
    showError(err);
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

/** Every 30 s, refresh the deadline chips in place without rebuilding the page. */
setInterval(() => {
  document.querySelectorAll('[data-deadline]').forEach((el) => {
    el.textContent = timeLeft(el.dataset.deadline);
  });
}, 30_000);

window.addEventListener('hashchange', render);
render();
