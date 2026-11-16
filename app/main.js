// A make.fun frontend: the board of live bounties, a page for each bounty with
// its leaderboard and entries, and public profiles — on hash routes:
//
//   #/                              the board (search, filters, sort, pages)
//   #/bounty/<slug>                 one bounty: overview, rewards, rules
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/bounty/<slug>/entries         that bounty's entries
//   #/u/<handle>                    an account's public profile
//   #/rankings                      the site-wide rankings
//   #/latest                        the newest graded entries
//
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture. Filters, search and
// paging update only the list, never the whole page, so focus is never lost.

import { getBounty, getLatestEntries, getLeaderboard, getProfile, getRankings, getSiteStats, listBounties, listSubmissions } from './api.js';
import { timeLeft } from './format.js';
import { boardControls, boardRow, bountyOverview, bountyPage, entriesTable, errorView, latestList, leaderboardTable, pager, profilePage, rankingsTable, statsStrip, takesEntries } from './views.js';

const app = document.getElementById('app');
const BOARD_PAGE_SIZE = 20;
const TABLE_PAGE_SIZE = 25;

/** The board's filter state: search, status, category, sort, page. */
const boardState = { q: '', status: 'open', category: '', sort: 'deadline', page: 1 };
let boardData = null;
let boardStatusLoaded = '';

/** Sort a bounty list by the board's sort key. */
function sortBounties(list, sort) {
  const pot = (b) => Number(b.potUsd ?? b.rewardAmount ?? 0);
  const by = {
    deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    pot: (a, b) => pot(b) - pot(a),
    entries: (a, b) => (b.submissionCount || 0) - (a.submissionCount || 0),
    newest: (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0),
  };
  return [...list].sort(by[sort] || by.deadline);
}

/** The board list after the search, category and status filters. */
function filteredBoard() {
  const q = boardState.q.trim().toLowerCase();
  return (boardData || []).filter((b) => {
    if (boardState.status === 'open' && !takesEntries(b)) return false;
    if (boardState.status === 'closed' && takesEntries(b)) return false;
    if (boardState.category && b.category !== boardState.category) return false;
    if (q && !`${b.title} ${b.summary || ''} ${b.category || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Re-render only the board's list, count and pager: the controls keep focus. */
function updateBoardList() {
  const list = sortBounties(filteredBoard(), boardState.sort);
  const pages = Math.max(1, Math.ceil(list.length / BOARD_PAGE_SIZE));
  boardState.page = Math.min(boardState.page, pages);
  const slice = list.slice((boardState.page - 1) * BOARD_PAGE_SIZE, boardState.page * BOARD_PAGE_SIZE);
  const listEl = document.getElementById('board-list');
  const countEl = document.getElementById('board-count');
  const pagerEl = document.getElementById('board-pager');
  if (!listEl) return;
  listEl.innerHTML = slice.length
    ? slice.map(boardRow).join('')
    : '<li class="notice">No bounties match these filters.</li>';
  if (countEl) countEl.textContent = `${list.length} ${list.length === 1 ? 'bounty' : 'bounties'}`;
  if (pagerEl) pagerEl.innerHTML = pager(boardState.page, pages, 'Board');
}

/** The board page: stats, controls, list. Fetches once per status. */
async function renderBoard() {
  if (boardStatusLoaded !== boardState.status || !boardData) {
    app.innerHTML = '<p>Loading…</p>';
    const [bounties, stats] = await Promise.all([listBounties(boardState.status), getSiteStats().catch(() => null)]);
    boardData = bounties;
    boardStatusLoaded = boardState.status;
    const categories = [...new Set(bounties.map((b) => b.category).filter(Boolean))].sort();
    app.innerHTML = `<h1>Open bounties</h1>${statsStrip(stats)}
      ${boardControls(categories, boardState)}
      <p id="board-count" aria-live="polite"></p>
      <ul id="board-list" class="board"></ul>
      <div id="board-pager"></div>`;
    document.getElementById('q').addEventListener('input', (e) => {
      boardState.q = e.target.value;
      boardState.page = 1;
      updateBoardList();
    });
    document.getElementById('f-status').addEventListener('change', (e) => {
      boardState.status = e.target.value;
      boardState.page = 1;
      renderBoard();
    });
    document.getElementById('f-cat').addEventListener('change', (e) => {
      boardState.category = e.target.value;
      boardState.page = 1;
      updateBoardList();
    });
    document.getElementById('f-sort').addEventListener('change', (e) => {
      boardState.sort = e.target.value;
      boardState.page = 1;
      updateBoardList();
    });
    document.getElementById('board-pager').addEventListener('click', (e) => {
      const button = e.target.closest('button[data-page]');
      if (!button || button.disabled) return;
      boardState.page = Number(button.dataset.page);
      updateBoardList();
    });
  }
  document.title = 'make.fun — bounties, leaderboards & profiles';
  updateBoardList();
}

/** One bounty page: overview now, leaderboard and entries on their tabs. */
async function renderBounty(slug, tab, view) {
  app.innerHTML = '<p>Loading…</p>';
  const b = await getBounty(slug);
  document.title = `${b.title} | make.fun bounties`;
  app.innerHTML = bountyPage(b, tab);
  const body = document.getElementById('tab-body');
  if (tab === 'leaderboard') {
    try {
      const lb = await getLeaderboard(slug, view);
      body.innerHTML = leaderboardTab(lb, slug, 1);
      body.addEventListener('click', leaderboardPager);
    } catch {
      body.innerHTML = '<p class="notice">The leaderboard is not available for this bounty yet.</p>';
    }
  } else if (tab === 'entries') {
    const subs = await listSubmissions(slug);
    body.innerHTML = entriesTable(subs.slice(0, TABLE_PAGE_SIZE));
  }
}

/** A leaderboard tab: view switcher, table, pager. */
function leaderboardTab(lb, slug, page) {
  const views = lb.views || [];
  const switcher =
    views.length > 1
      ? `<p role="group" aria-label="Leaderboard view">${views
          .map((v) => `<a class="chip-link${lb.view === v ? ' chip-on' : ''}" href="#/bounty/${encodeURIComponent(slug)}/leaderboard?view=${encodeURIComponent(v)}">${v}</a>`)
          .join(' ')}</p>`
      : '';
  const entries = lb.entries || [];
  const pages = Math.max(1, Math.ceil(entries.length / TABLE_PAGE_SIZE));
  const slice = { ...lb, entries: entries.slice((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE) };
  return `${switcher}${leaderboardTable(slice)}${pager(page, pages, 'Leaderboard')}`;
}

/** Pager clicks inside a leaderboard tab, kept in the same view. */
function leaderboardPager(e) {
  const button = e.target.closest('button[data-page]');
  if (!button || button.disabled) return;
  const match = location.hash.match(/^#\/bounty\/([^/]+)\/leaderboard/);
  if (!match) return;
  const slug = decodeURIComponent(match[1]);
  const view = new URLSearchParams(location.hash.split('?')[1] || '').get('view');
  getLeaderboard(slug, view).then((lb) => {
    const body = document.getElementById('tab-body');
    if (body) body.innerHTML = leaderboardTab(lb, slug, Number(button.dataset.page));
  });
}

/** An account's public profile. */
async function renderProfile(handle) {
  app.innerHTML = '<p>Loading…</p>';
  const p = await getProfile(handle);
  document.title = `${p.display_name || p.handle} | make.fun`;
  app.innerHTML = profilePage(p);
}

/** The site-wide rankings, by wins or by payout. */
async function renderRankings(order) {
  app.innerHTML = '<p>Loading…</p>';
  const data = await getRankings(order);
  document.title = 'Rankings | make.fun';
  const rows = data.items || [];
  app.innerHTML = `<h1>Rankings</h1>
    <p role="group" aria-label="Rank by">
      <a class="chip-link${order === 'wins' ? ' chip-on' : ''}" href="#/rankings?order=wins">Most wins</a>
      <a class="chip-link${order === 'payout' ? ' chip-on' : ''}" href="#/rankings?order=payout">Most paid out</a>
    </p>${rankingsTable(rows, order)}`;
}

/** The newest graded entries across the site. */
async function renderLatest() {
  app.innerHTML = '<p>Loading…</p>';
  const data = await getLatestEntries();
  document.title = 'Latest entries | make.fun';
  const items = data.entries || data.items || (Array.isArray(data) ? data : []);
  app.innerHTML = `<h1>Latest entries</h1>${latestList(items)}`;
}

/** Route the hash to a page. */
async function render() {
  window.__shotReady = false;
  const [path, query] = location.hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query || '');
  try {
    const bounty = path.match(/^\/bounty\/([^/]+)(?:\/(leaderboard|entries))?$/);
    const profile = path.match(/^\/u\/([^/]+)$/);
    if (path === '/' || path === '') {
      await renderBoard();
    } else if (bounty) {
      await renderBounty(decodeURIComponent(bounty[1]), bounty[2] || 'overview', params.get('view'));
    } else if (profile) {
      await renderProfile(decodeURIComponent(profile[1]));
    } else if (path === '/rankings') {
      await renderRankings(params.get('order') || 'wins');
    } else if (path === '/latest') {
      await renderLatest();
    } else {
      app.innerHTML = '<h1>Page not found</h1><p><a href="#/">Back to bounties</a></p>';
    }
  } catch (error) {
    document.title = 'make.fun bounties';
    app.innerHTML = errorView(error.status === 404 ? 'That bounty or account does not exist.' : `The make.fun API did not answer (${error.message}). Check the connection and try again.`);
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

/** The time-left labels tick every 30 seconds without a re-render. */
setInterval(() => {
  document.querySelectorAll('[data-deadline]').forEach((el) => {
    el.textContent = timeLeft(el.dataset.deadline);
  });
}, 30000);

/** A broken avatar hides itself instead of showing a broken image. */
document.addEventListener(
  'error',
  (e) => {
    if (e.target.tagName === 'IMG') e.target.style.visibility = 'hidden';
  },
  true,
);

/** '/' focuses the board search. */
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) {
    const q = document.getElementById('q');
    if (q) {
      e.preventDefault();
      q.focus();
    }
  }
});

window.addEventListener('hashchange', render);
render();
