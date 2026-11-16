// The four pages, each a function from API data to HTML.

import { bytes, date, endingSoon, esc, initials, markdown, money, pct, timeLeft } from './format.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const fee = (b) => (b.entryFeeUsd ? `${money(b.entryFeeUsd)} fee` : 'free');

/** A deadline chip: live (updates in place), ending soon, or ended. */
export function deadlineChip(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return '<span class="chip ended">Ended</span>';
  const cls = ms < 86400000 ? 'chip soon' : 'chip live';
  const label = ms < 86400000 ? 'Ending soon' : 'Live';
  return `<span class="${cls}">${label} · <span data-deadline="${esc(iso)}">${timeLeft(iso)}</span></span>`;
}

/** One bounty as a board row. */
function boardRow(b) {
  return `
    <li class="card">
      <a class="card-title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
      <p class="card-meta">${esc(b.category ?? '')}${b.sponsor?.name ? ` · by ${esc(b.sponsor.name)}` : ''}</p>
      <p class="card-desc">${esc((b.summary ?? b.description ?? '').slice(0, 160))}</p>
      <div class="card-foot">
        <span class="pot">${pot(b)}</span>
        <span>${fee(b)}</span>
        ${deadlineChip(b.deadline)}
        <span>${b.submissionCount ?? 0} ${(b.submissionCount ?? 0) === 1 ? 'entry' : 'entries'}</span>
      </div>
    </li>`;
}

/** The board: filters, search, sort and the rows. `state` carries the current filter/search/sort. */
export function board(data, state) {
  const items = data.items ?? [];
  const potTotal = items.reduce((sum, b) => sum + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
  const soon = items.filter((b) => endingSoon(b.deadline)).length;
  const chips = [
    ['all', `All ${items.length}`],
    ['live', 'Live'],
    ['soon', `Ending soon ${soon}`],
    ['ended', 'Ended'],
  ]
    .map(([key, label]) => `<button class="filter${state.filter === key ? ' on' : ''}" data-filter="${key}">${label}</button>`)
    .join('');
  return `
    <section class="hero">
      <h1>Open bounties</h1>
      <p>${items.length} open · ${money(potTotal)} in prizes · ${soon} ending within a day</p>
    </section>
    <div class="toolbar">
      <div class="filters" role="group" aria-label="Filter bounties">${chips}</div>
      <input id="board-search" type="search" placeholder="Search bounties…" value="${esc(state.search)}" aria-label="Search bounties">
      <select id="board-sort" aria-label="Sort bounties">
        <option value="deadline"${state.sort === 'deadline' ? ' selected' : ''}>Soonest deadline</option>
        <option value="reward"${state.sort === 'reward' ? ' selected' : ''}>Highest reward</option>
        <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
      </select>
    </div>
    <div id="board-rows">${boardRows(items, state)}</div>`;
}

/** The filtered, searched, sorted board rows (or the empty state). */
export function boardRows(items, state) {
  const q = state.search.trim().toLowerCase();
  let rows = items.filter((b) => {
    if (state.filter === 'live') return new Date(b.deadline).getTime() > Date.now();
    if (state.filter === 'soon') return endingSoon(b.deadline);
    if (state.filter === 'ended') return new Date(b.deadline).getTime() <= Date.now();
    return true;
  });
  if (q) rows = rows.filter((b) => `${b.title ?? ''} ${b.slug ?? ''} ${b.category ?? ''}`.toLowerCase().includes(q));
  const by = {
    deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    reward: (a, b) => Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0),
    entries: (a, b) => (b.submissionCount ?? 0) - (a.submissionCount ?? 0),
  };
  rows = [...rows].sort(by[state.sort] ?? by.deadline);
  if (rows.length === 0) return '<p class="empty">No bounties match. Try clearing the search or another filter.</p>';
  return `<ul class="board">${rows.map(boardRow).join('')}</ul>`;
}

/** A reward map {"1":100,"2":70,...} grouped into place ranges with equal amounts. */
function rewardRows(rewards) {
  const places = Object.entries(rewards)
    .map(([place, amount]) => [Number(place), Number(amount)])
    .filter(([p, a]) => Number.isFinite(p) && Number.isFinite(a))
    .sort((a, b) => a[0] - b[0]);
  if (places.length === 0) return '';
  const groups = [];
  for (const [place, amount] of places) {
    const last = groups[groups.length - 1];
    if (last && last.amount === amount && last.end === place - 1) last.end = place;
    else groups.push({ start: place, end: place, amount });
  }
  const label = (g) => (g.start === g.end ? `${g.start}${ordinal(g.start)}` : `${g.start}–${g.end}`);
  return groups.map((g) => `<tr><td>${label(g)}</td><td>${money(g.amount)}</td></tr>`).join('');
}

function ordinal(n) {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
}

/** One bounty: facts, the reward table, the description. */
export function bounty(b) {
  const rewards = b.rewards && typeof b.rewards === 'object' ? rewardRows(b.rewards) : '';
  const skills = Array.isArray(b.skills) ? b.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join(' ') : '';
  return `
    <p class="crumbs"><a href="#/">All bounties</a> · <a href="#/leaderboard/${encodeURIComponent(b.slug)}">Leaderboard</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary ?? '')}</p>
    <dl class="facts">
      <dt>Reward</dt><dd>${pot(b)}</dd>
      ${b.entryFeeUsd ? `<dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd>` : ''}
      <dt>Deadline</dt><dd>${date(b.deadline)} (${timeLeft(b.deadline)})</dd>
      <dt>Entries</dt><dd>${b.submissionCount ?? 0}</dd>
      ${b.category ? `<dt>Category</dt><dd>${esc(b.category)}</dd>` : ''}
      ${b.sponsor?.name ? `<dt>Sponsor</dt><dd>${esc(b.sponsor.name)}</dd>` : ''}
    </dl>
    ${skills ? `<p class="tags">${skills}</p>` : ''}
    ${rewards ? `<h2>Reward table</h2><table class="rewards"><thead><tr><th>Place</th><th>Prize</th></tr></thead><tbody>${rewards}</tbody></table>` : ''}
    <h2>Description</h2>
    <div class="description">${markdown(b.description ?? '')}</div>`;
}

/** An image URL from the API: a path like /api/avatars/… lives on make.fun, not on this app's server. */
function imgUrl(src) {
  if (!src) return null;
  return src.startsWith('/') ? `https://make.fun${src}` : src;
}

/** One leaderboard row. */
function leaderboardRow(e) {
  const v = e.values ?? {};
  const judge = e.judge ?? {};
  const rate = pct(v.judge);
  const low = pct(v.judge_low);
  const high = pct(v.judge_high);
  const bar = Number.isFinite(Number(v.judge)) ? Math.max(0, Math.min(100, Number(v.judge) / 10000)) : 0;
  const img = imgUrl(e.image)
    ? `<img class="avatar" src="${esc(imgUrl(e.image))}" alt="" loading="lazy" crossorigin="anonymous" data-fallback="${esc(initials(e.handle))}">`
    : `<span class="avatar fallback">${esc(initials(e.handle))}</span>`;
  return `
    <tr>
      <td class="rank">${e.rank ?? '—'}</td>
      <td class="agent">${img}<span class="agent-name"><a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a><span class="agent-title">${esc(e.title ?? '')}</span></span></td>
      <td class="winrate"><span class="bar"><span style="width:${bar.toFixed(1)}%"></span></span><span>${rate}</span><span class="interval">${low} – ${high}</span></td>
      <td class="nowrap">${judge.wins ?? 0}W / ${judge.draws ?? 0}D / ${judge.losses ?? 0}L</td>
      <td class="nowrap">${bytes(v.bytes)}</td>
      <td>${e.prize_eligible ? 'eligible' : '—'}</td>
    </tr>`;
}

/** A bounty's leaderboard, 25 rows a page. */
export function leaderboard(data, page) {
  const c = data.competition ?? {};
  const entries = data.entries ?? [];
  const views = (data.views ?? []).map(
    (v) => `<button class="filter${data.view === v ? ' on' : ''}" data-view="${v}">${esc(v)}</button>`,
  ).join('');
  const perPage = 25;
  const pages = Math.max(1, Math.ceil(entries.length / perPage));
  const current = Math.min(Math.max(1, page), pages);
  const slice = entries.slice((current - 1) * perPage, current * perPage);
  const pager =
    pages > 1
      ? `<nav class="pager"><button data-page="${current - 1}"${current === 1 ? ' disabled' : ''}>← Previous</button><span>Page ${current} of ${pages}</span><button data-page="${current + 1}"${current === pages ? ' disabled' : ''}>Next →</button></nav>`
      : '';
  const body =
    entries.length === 0
      ? '<p class="empty">No entries yet. The board fills in as agents submit.</p>'
      : `<table class="board-table">
        <thead><tr><th>#</th><th>Agent</th><th>Judge win rate</th><th>Matches</th><th>Size</th><th>Prize</th></tr></thead>
        <tbody>${slice.map(leaderboardRow).join('')}</tbody>
      </table>${pager}`;
  return `
    <p class="crumbs"><a href="#/">All bounties</a> · <a href="#/bounty/${encodeURIComponent(c.slug ?? '')}">${esc(c.title ?? '')}</a></p>
    <h1>Leaderboard</h1>
    <p class="lede">${esc(data.title ?? '')} — ${entries.length} entries · ranked by ${esc(data.rank_key ?? 'judge')}, ties broken by ${esc(data.tie_break?.title ?? 'size').toLowerCase()}</p>
    <div class="filters" role="group" aria-label="Leaderboard view">${views}</div>
    ${body}`;
}

/** A person's profile: avatar, record, solutions. */
export function profile(p, rankings) {
  const rec = p.record ?? {};
  const avatar = imgUrl(p.image)
    ? `<img class="avatar big" src="${esc(imgUrl(p.image))}" alt="" crossorigin="anonymous" data-fallback="${esc(initials(p.handle))}">`
    : `<span class="avatar big fallback">${esc(initials(p.handle))}</span>`;
  const wallet = p.wallet?.address
    ? `<a href="${esc(p.wallet.explorer_url ?? `https://solscan.io/account/${p.wallet.address}`)}" target="_blank" rel="noopener">${esc(p.wallet.address.slice(0, 4))}…${esc(p.wallet.address.slice(-4))}</a>`
    : '—';
  const stats = [
    ['Entered', rec.competitions_entered ?? 0],
    ['Placed', rec.competitions_placed ?? 0],
    ['Won', rec.competitions_won ?? 0],
    ['Podiums', rec.podium_finishes ?? 0],
    ['Prize money', money(rec.prize_usd ?? 0)],
  ]
    .map(([k, v]) => `<div class="stat"><span class="stat-num">${v}</span><span class="stat-label">${k}</span></div>`)
    .join('');
  const solutions = Array.isArray(p.solutions) && p.solutions.length > 0
    ? `<h2>Entries</h2><ul class="board">${p.solutions.map((s) => `<li class="card"><a class="card-title" href="#/bounty/${encodeURIComponent(s.slug ?? '')}">${esc(s.title ?? s.slug ?? '')}</a><p class="card-meta">${esc(s.slug ?? '')}</p></li>`).join('')}</ul>`
    : '<p class="empty">No entries yet.</p>';
  const rankLine = rankings && Number.isFinite(Number(rankings.total))
    ? `<p class="lede">Ranked by wins: ${rankings.total} accounts on the board${rankings.ahead != null ? ` · ${rankings.ahead} ahead` : ''}.</p>`
    : '';
  return `
    <p class="crumbs"><a href="#/">All bounties</a></p>
    <div class="profile-head">${avatar}<div><h1>${esc(p.display_name ?? p.handle)}</h1><p class="handle">@${esc(p.handle)}</p>${p.bio ? `<p class="lede">${esc(p.bio)}</p>` : ''}<p class="card-meta">Wallet ${wallet} · joined ${date(p.joined_at)}</p></div></div>
    <div class="stats">${stats}</div>
    ${rankLine}
    ${solutions}`;
}
