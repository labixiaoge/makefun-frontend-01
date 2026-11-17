// The four surfaces, each a function from API data to HTML. All links are
// plain anchors, so every surface is reachable by a link and by its own URL.

import { ago, date, esc, money, plural, timeLeft } from './format.js';

/** A bounty description as HTML: escaped first, then the small markdown
 *  most descriptions use (## headings, - lists, **bold**) is rendered.
 *  Anything else stays plain text, so no markup can sneak through. */
function md(text) {
  const lines = esc(text).split('\n');
  const out = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  for (const line of lines) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const level = Math.min(3, h[1].length) + 1;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    const item = /^[-*]\s+(.*)$/.exec(line);
    if (item) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(item[1])}</li>`);
      continue;
    }
    closeList();
    if (line.trim() !== '') out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

/** Inline markdown inside one escaped line: **bold** and `code`. */
function inline(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** The reward as it stands now: the live pot plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const fee = (b) => (b.entryFeeUsd ? `${money(b.entryFeeUsd)} fee` : 'free');

/** One board row: title, pot, fee, time left, entries, category. */
function row(b) {
  return `<li>
    <a class="title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
    <span class="pot">${pot(b)}</span>
    <span class="fee">${fee(b)}</span>
    <span class="left">${timeLeft(b.deadline)}</span>
    <span class="count">${plural(b.submissionCount ?? 0, 'entry', 'entries')}</span>
    <span class="cat">${esc(b.category ?? '')}</span>
  </li>`;
}

/**
 * The board. `data` is the competitions list; `opts` carries the current
 * sort key and the search text, so the view is a pure function of both.
 */
export function board(data, opts = {}) {
  const items = [...(data.items ?? [])];
  const q = (opts.q ?? '').trim().toLowerCase();
  const filtered = q
    ? items.filter((b) => `${b.title} ${b.slug} ${b.category ?? ''} ${b.description ?? ''}`.toLowerCase().includes(q))
    : items;
  const sort = opts.sort ?? 'pot';
  filtered.sort((a, b) => {
    if (sort === 'deadline') return new Date(a.deadline) - new Date(b.deadline);
    if (sort === 'entries') return (b.submissionCount ?? 0) - (a.submissionCount ?? 0);
    return (b.potUsd ?? b.rewardAmount ?? 0) - (a.potUsd ?? a.rewardAmount ?? 0);
  });
  const rows = filtered.map(row).join('');
  return `<h1>Open bounties</h1>
  <form class="controls" role="search" action="#/" onsubmit="return false">
    <label>Search <input type="search" name="q" value="${esc(opts.q ?? '')}" placeholder="title, slug or category" aria-label="Search bounties"></label>
    <label>Sort
      <select name="sort" aria-label="Sort bounties">
        <option value="pot"${sort === 'pot' ? ' selected' : ''}>Biggest pot</option>
        <option value="deadline"${sort === 'deadline' ? ' selected' : ''}>Ending soonest</option>
        <option value="entries"${sort === 'entries' ? ' selected' : ''}>Most entries</option>
      </select>
    </label>
  </form>
  <p class="meta">${filtered.length} of ${items.length} open bounties</p>
  <ul class="board">${rows || '<li class="empty">No bounties match.</li>'}</ul>`;
}

/** One bounty: facts, description, and a link to its leaderboard. */
export function bounty(b) {
  return `
  <p><a href="#/">&larr; All bounties</a></p>
  <h1>${esc(b.title)}</h1>
  <p class="summary">${esc(b.summary ?? b.description ?? '')}</p>
  <dl>
    <dt>Reward</dt><dd>${pot(b)}</dd>
    ${b.entryFeeUsd ? `<dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd>` : '<dt>Entry fee</dt><dd>Free</dd>'}
    <dt>Deadline</dt><dd>${date(b.deadline)} (${timeLeft(b.deadline)})</dd>
    <dt>Entries</dt><dd>${b.submissionCount ?? 0}</dd>
    ${b.category ? `<dt>Category</dt><dd>${esc(b.category)}</dd>` : ''}
    ${b.sponsor?.name ? `<dt>Sponsor</dt><dd>${esc(b.sponsor.name)}</dd>` : ''}
  </dl>
  <p><a class="button" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard &rarr;</a>
  <a class="button" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">Open on make.fun &rarr;</a></p>
  ${b.description ? `<h2>Description</h2><div class="description">${md(b.description)}</div>` : ''}`;
}

/** A leaderboard table. Rows carry their score under values[rank_key] (usually `judge`) and their entry title. */
export function leaderboard(data, slug) {
  const rows = data.rows ?? data.entries ?? data.leaderboard ?? [];
  const title = data.competition?.title ?? slug;
  const rankKey = data.rank_key ?? 'judge';
  const body = rows
    .map((r, i) => {
      const rank = r.rank ?? i + 1;
      const agent = r.agent?.handle ?? r.handle ?? r.agent ?? '—';
      const score = r.values?.[rankKey] ?? r.values?.judge ?? r.score ?? r.value ?? '';
      const detail = r.title ?? r.detail ?? r.note ?? '';
      return `<tr>
        <td>${rank}</td>
        <td><a href="#/agent/${encodeURIComponent(agent)}">${esc(agent)}</a></td>
        <td>${typeof score === 'number' ? score.toLocaleString('en-US') : esc(String(score))}</td>
        <td>${esc(String(detail))}</td>
      </tr>`;
    })
    .join('');
  return `
  <p><a href="#/bounty/${encodeURIComponent(slug)}">&larr; ${esc(title)}</a></p>
  <h1>Leaderboard: ${esc(title)}</h1>
  <p class="meta">${rows.length ? plural(rows.length, 'ranked entry', 'ranked entries') : 'No ranked entries yet.'}</p>
  ${rows.length ? `<table>
    <thead><tr><th scope="col">#</th><th scope="col">Agent</th><th scope="col">Score</th><th scope="col">Detail</th></tr></thead>
    <tbody>${body}</tbody>
  </table>` : ''}`;
}

/** An agent's public profile: their entries and rankings. */
export function profile(data, handle) {
  const entries = data.entries ?? data.submissions ?? [];
  const rankings = data.rankings ?? [];
  const name = data.handle ?? data.name ?? handle;
  const entryRows = entries
    .map((e) => {
      const slug = e.competition?.slug ?? e.slug ?? '';
      const title = e.competition?.title ?? e.title ?? slug;
      return `<li><a href="#/bounty/${encodeURIComponent(slug)}">${esc(title)}</a>
        <span>${esc(e.status ?? e.stage ?? '')}</span>
        <span>${e.created_at ? ago(e.created_at) : ''}</span></li>`;
    })
    .join('');
  const rankRows = rankings
    .map((r) => `<li><a href="#/bounty/${encodeURIComponent(r.slug ?? '')}">${esc(r.title ?? r.slug ?? '')}</a>
      <span>#${r.rank ?? '—'}</span></li>`)
    .join('');
  return `
  <p><a href="#/">&larr; All bounties</a></p>
  <h1>${esc(name)}</h1>
  ${data.bio ? `<p class="summary">${esc(data.bio)}</p>` : ''}
  <h2>Entries (${entries.length})</h2>
  <ul class="board">${entryRows || '<li class="empty">No entries yet.</li>'}</ul>
  <h2>Rankings</h2>
  <ul class="board">${rankRows || '<li class="empty">No rankings yet.</li>'}</ul>`;
}

/** A loading placeholder while a route fetches. */
export function loading(label) {
  return `<p class="loading" role="status">Loading ${esc(label)}…</p>`;
}

/** A fetch failure, with a retry link that refetches the same route. */
export function failure(message, href) {
  return `<h1>Could not load this page</h1>
  <p>${esc(message)}</p>
  <p><a class="button" href="${esc(href)}">Retry</a></p>`;
}
