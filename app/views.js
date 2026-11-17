// The pages, each a function from API data to HTML. Every value from the API is escaped
// before it reaches the page, and every link is a hash route, so each surface has its own URL.

import { date, esc, money, num, shortWallet, timeLeft } from './format.js';

/** The reward as it stands now: the live pot when the bounty has one, else its prize. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const fee = (b) => (Number(b.entryFeeUsd) > 0 ? `${money(b.entryFeeUsd)} entry` : 'free entry');

/** A stale-data note, shown when the page is rendering the last good answer after a failed fetch. */
const staleNote = (fromCache) =>
  fromCache ? '<p class="stale" role="status">Showing the last saved copy — make.fun did not answer just now.</p>' : '';

/** The board: every open bounty, with its live pot, fee, time left and entry count. */
export function board(data, fromCache) {
  const items = [...(data.items ?? [])].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const rows = items
    .map(
      (b) => `
      <li>
        <a class="title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
        <span class="pot">${pot(b)}</span>
        <span class="fee">${fee(b)}</span>
        <span class="left">${timeLeft(b.deadline)}</span>
        <span class="count">${num(b.submissionCount)} ${b.submissionCount === 1 ? 'entry' : 'entries'}</span>
      </li>`,
    )
    .join('');
  return `
    <h1>Open bounties</h1>
    <p class="lede">${items.length} open — sorted by deadline, soonest first.</p>
    ${staleNote(fromCache)}
    <p><label>Filter <input id="filter" type="search" placeholder="Search bounties…" aria-label="Filter bounties"></label></p>
    <ul class="board" id="board">${rows}</ul>`;
}

/** One bounty: its reward, fee, deadline, entries, description, and a link to its leaderboard. */
export function bounty(b, fromCache) {
  const skills = (b.skills ?? []).map((s) => `<li>${esc(s)}</li>`).join('');
  return `
    <p><a href="#/">&larr; All bounties</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary ?? '')}</p>
    ${staleNote(fromCache)}
    <dl>
      <dt>Reward</dt><dd>${pot(b)}</dd>
      <dt>Entry fee</dt><dd>${Number(b.entryFeeUsd) > 0 ? money(b.entryFeeUsd) : 'Free'}</dd>
      <dt>Deadline</dt><dd>${date(b.deadline)} (${timeLeft(b.deadline)})</dd>
      <dt>Entries</dt><dd>${num(b.submissionCount)}</dd>
      <dt>Status</dt><dd>${esc(b.status ?? '')}</dd>
      ${b.category ? `<dt>Category</dt><dd>${esc(b.category)}</dd>` : ''}
    </dl>
    ${skills ? `<h2>Skills</h2><ul class="tags">${skills}</ul>` : ''}
    <p><a class="button" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">See the leaderboard &rarr;</a></p>
    <h2>Description</h2>
    <div class="description">${esc(b.description ?? '')}</div>`;
}

/** A bounty's leaderboard: ranked entries with their scores, handles and titles.
 * The API puts each entry's scores in `values` (numbers) and `display` (strings), not in a
 * `scores` object: judge win rates are micro units (956066 means 95.6066%), `bytes` is a byte
 * count, and `valid` is 1 or 0. The first version of this view read a `scores` field that does
 * not exist, so every cell showed a dash; this one reads the real fields and formats them. */
export function leaderboard(data, slug, fromCache) {
  const entries = data.entries ?? [];
  const columns = (data.columns ?? []).filter((c) => !c.hidden);
  const score = (e, key) => {
    const shown = e.display?.[key];
    const value = e.values?.[key];
    if (key === 'valid') return value === 1 || shown === '1' ? '✓' : '—';
    if (key === 'bytes') {
      const n = Number(value ?? shown);
      if (!Number.isFinite(n)) return '—';
      return n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;
    }
    if (key === 'judge' || key === 'judge_low' || key === 'judge_high') {
      const n = Number(value ?? shown);
      if (!Number.isFinite(n)) return '—';
      return `${(n / 10000).toFixed(1)}%`;
    }
    return shown != null ? esc(shown) : value != null ? esc(value) : '—';
  };
  const head = columns.map((c) => `<th scope="col">${esc(c.title)}</th>`).join('');
  const rows = entries
    .map((e) => {
      const cells = columns.map((c) => `<td>${score(e, c.key)}</td>`).join('');
      return `<tr>
        <td>${num(e.rank)}</td>
        <td><a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a></td>
        <td>${esc(e.title ?? '')}</td>
        ${cells}
      </tr>`;
    })
    .join('');
  return `
    <p><a href="#/bounty/${encodeURIComponent(slug)}">&larr; ${esc(data.competition?.title ?? slug)}</a></p>
    <h1>Leaderboard</h1>
    <p class="lede">${esc(data.competition?.title ?? slug)} — ${entries.length} ranked ${entries.length === 1 ? 'entry' : 'entries'}.</p>
    ${staleNote(fromCache)}
    <div class="table-wrap"><table>
      <thead><tr><th scope="col">#</th><th scope="col">Agent</th><th scope="col">Entry</th>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

/** An account's public profile: its record and its entries. */
export function profile(p, fromCache) {
  const r = p.record ?? {};
  const rows = (p.solutions ?? [])
    .map(
      (s) => `
      <li>
        <a href="#/bounty/${encodeURIComponent(s.competition.slug)}">${esc(s.competition.title)}</a>
        <span>${esc(s.title)}</span>
        <span>${s.placement ? `#${num(s.placement)}` : 'unplaced'}</span>
        <span>${s.prize_usd ? money(s.prize_usd) : ''}</span>
      </li>`,
    )
    .join('');
  return `
    <h1>${esc(p.display_name ?? p.handle)}</h1>
    <p class="lede">@${esc(p.handle)}${p.bio ? ` — ${esc(p.bio)}` : ''}</p>
    ${staleNote(fromCache)}
    <dl>
      <dt>Joined</dt><dd>${date(p.joined_at)}</dd>
      <dt>Entered</dt><dd>${num(r.competitions_entered)} bounties</dd>
      <dt>Placed</dt><dd>${num(r.competitions_placed)} · won ${num(r.competitions_won)}</dd>
      <dt>Prize money</dt><dd>${money(r.prize_usd ?? 0)}</dd>
      ${p.wallet?.address ? `<dt>Wallet</dt><dd><a href="${esc(p.wallet.explorer_url)}">${shortWallet(p.wallet.address)}</a></dd>` : ''}
      ${p.github_login ? `<dt>GitHub</dt><dd><a href="https://github.com/${encodeURIComponent(p.github_login)}">${esc(p.github_login)}</a></dd>` : ''}
      ${p.x ? `<dt>X</dt><dd><a href="https://x.com/${encodeURIComponent(p.x)}">@${esc(p.x)}</a></dd>` : ''}
    </dl>
    <h2>Entries</h2>
    ${rows ? `<ul class="board">${rows}</ul>` : '<p>No entries yet.</p>'}`;
}

/** The site-wide rankings: accounts by competitions won or prize money paid.
 * Each row carries its record nested under `record` (competitions_won, prize_usd); the first
 * version read those fields off the row itself, so every row showed zeroes. */
export function rankings(data, by, fromCache) {
  const rows = (data.items ?? [])
    .map(
      (r) => `
      <li>
        <span>${num(r.rank)}</span>
        <a href="#/u/${encodeURIComponent(r.handle)}">${esc(r.display_name ?? r.handle)}</a>
        <span>${num(r.record?.competitions_won ?? 0)} won</span>
        <span>${money(r.record?.prize_usd ?? 0)}</span>
      </li>`,
    )
    .join('');
  return `
    <h1>Rankings</h1>
    <p class="lede">${num(data.total ?? 0)} accounts ranked by ${by === 'paid' ? 'prize money paid' : 'competitions won'}.</p>
    ${staleNote(fromCache)}
    <p><a href="#/rankings" aria-current="${by === 'wins' ? 'page' : 'false'}">By wins</a> · <a href="#/rankings/paid" aria-current="${by === 'paid' ? 'page' : 'false'}">By prize money</a></p>
    <ul class="board">${rows}</ul>`;
}
