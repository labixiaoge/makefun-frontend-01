// The views: each a function from API data to HTML. Nothing here fetches;
// main.js fetches and hands the data in, so a view can be re-rendered from
// the cache without another request.

import { compact, date, esc, microRate, money, plural, timeAgo, timeLeft } from './format.js';

const API_ORIGIN = 'https://make.fun';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
export const potOf = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
export const feeOf = (b) => (b.entryFeeUsd != null && Number(b.entryFeeUsd) > 0 ? `${money(b.entryFeeUsd)} entry fee` : 'Free entry');

/** Whether a board row still takes entries: status open is not enough, a
 *  bounty past its deadline still reads open until results are published. */
export function takesEntries(b) {
  return b.status === 'open' && new Date(b.deadline).getTime() > Date.now();
}

/** An API image URL made absolute. Avatar and entry images are the API's
 *  own answers, so they may load from where they point. */
export function imageUrl(src) {
  if (!src) return '';
  return src.startsWith('http') ? src : API_ORIGIN + src;
}

/** An avatar <img>: crossorigin first, as the API's images require it. */
export function avatarImg(src, name, cls = 'avatar') {
  const url = imageUrl(src);
  if (!url) return `<span class="${cls} avatar-fallback" aria-hidden="true">${esc((name || '?')[0].toUpperCase())}</span>`;
  return `<img class="${cls}" crossorigin="anonymous" loading="lazy" src="${esc(url)}" alt="">`;
}

/** One board row: title, category, live pot, entry fee, time left, entries. */
export function boardRow(b) {
  const open = takesEntries(b);
  return `<li class="row${open ? '' : ' row-closed'}">
    <a class="row-title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
    <span class="row-cat">${esc(b.category || '')}</span>
    <span class="row-pot" title="Live pot">${potOf(b)}</span>
    <span class="row-fee">${feeOf(b)}</span>
    <span class="row-time" data-deadline="${esc(b.deadline)}">${open ? timeLeft(b.deadline) : 'ended'}</span>
    <span class="row-entries">${plural(b.submissionCount, 'entry', 'entries')}</span>
  </li>`;
}

/** The board's controls: search, status, category, sort. */
export function boardControls(categories, state) {
  const cats = categories.map((c) => `<option value="${esc(c)}"${state.category === c ? ' selected' : ''}>${esc(c)}</option>`).join('');
  return `<div class="controls" role="search">
    <label>Search <input id="q" type="search" value="${esc(state.q)}" placeholder="Search bounties…" autocomplete="off"></label>
    <label>Status <select id="f-status">
      <option value="open"${state.status === 'open' ? ' selected' : ''}>Open for entries</option>
      <option value="all"${state.status === 'all' ? ' selected' : ''}>All bounties</option>
      <option value="closed"${state.status === 'closed' ? ' selected' : ''}>Closed</option>
    </select></label>
    <label>Category <select id="f-cat"><option value="">All categories</option>${cats}</select></label>
    <label>Sort <select id="f-sort">
      <option value="deadline"${state.sort === 'deadline' ? ' selected' : ''}>Ending soonest</option>
      <option value="pot"${state.sort === 'pot' ? ' selected' : ''}>Largest pot</option>
      <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
      <option value="newest"${state.sort === 'newest' ? ' selected' : ''}>Newest</option>
    </select></label>
  </div>`;
}

/** The site totals strip shown above the board. */
export function statsStrip(stats) {
  if (!stats || !stats.entries) return '';
  return `<p class="strip" aria-label="Site totals">${compact(stats.entries.total)} entries all time · live data from make.fun</p>`;
}

/** The live rewards table: place, base prize, entry-fee share, total now. */
export function rewardsTable(b) {
  const live = Array.isArray(b.rewardsNow) && b.rewardsNow.length > 0 ? b.rewardsNow : null;
  const rows = live
    ? live.map((r) => `<tr><td>${r.place}</td><td>${money(r.baseUsd)}</td><td>${money(r.feeShareUsd)}</td><td><strong>${money(r.amountUsd)}</strong></td></tr>`).join('')
    : Object.entries(b.rewards || {})
        .sort((a, c) => Number(a[0]) - Number(c[0]))
        .map(([place, amount]) => `<tr><td>${place}</td><td>${money(amount)}</td><td>—</td><td><strong>${money(amount)}</strong></td></tr>`)
        .join('');
  if (!rows) return '';
  return `<h2>Rewards</h2>
  <p>Live pot <strong>${potOf(b)}</strong> — the base ${money(b.rewardAmount)} plus entry fees paid in.</p>
  <table class="rewards"><thead><tr><th scope="col">Place</th><th scope="col">Base prize</th><th scope="col">From entry fees</th><th scope="col">Pays now</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** One bounty: summary, facts, rewards, dates, description, rules, tabs. */
export function bountyPage(b, tab) {
  const open = b.acceptingSubmissions !== false && takesEntries(b);
  const tabs = [
    ['overview', 'Overview', `#/bounty/${encodeURIComponent(b.slug)}`],
    ['leaderboard', 'Leaderboard', `#/bounty/${encodeURIComponent(b.slug)}/leaderboard`],
    ['entries', 'Entries', `#/bounty/${encodeURIComponent(b.slug)}/entries`],
  ]
    .map(([key, label, href]) => `<a role="tab" aria-selected="${tab === key}" href="${href}">${label}</a>`)
    .join('');
  return `<p class="crumb"><a href="#/">All bounties</a></p>
  <h1>${esc(b.title)}</h1>
  <p class="summary">${esc(b.summary || '')}</p>
  <ul class="chips" aria-label="Key facts">
    <li><strong>${potOf(b)}</strong> live pot</li>
    <li>${feeOf(b)}</li>
    <li><span data-deadline="${esc(b.deadline)}">${open ? timeLeft(b.deadline) : 'ended'}</span></li>
    <li>${plural(b.submissionCount, 'entry', 'entries')}</li>
    <li>${open ? 'Open for entries' : 'Closed for entries'}</li>
  </ul>
  <dl class="facts">
    <dt>Deadline</dt><dd>${date(b.deadline)}</dd>
    ${b.publishedAt ? `<dt>Published</dt><dd>${date(b.publishedAt)}</dd>` : ''}
    <dt>Category</dt><dd>${esc(b.category || '—')}</dd>
    ${b.skills?.length ? `<dt>Skills</dt><dd>${b.skills.map(esc).join(', ')}</dd>` : ''}
    <dt>Status</dt><dd>${esc(b.status || '—')}</dd>
  </dl>
  <nav class="tabs" role="tablist" aria-label="Bounty sections">${tabs}</nav>
  <div id="tab-body">${tab === 'overview' ? bountyOverview(b) : '<p>Loading…</p>'}</div>`;
}

/** The overview tab: rewards, description, rules. */
export function bountyOverview(b) {
  return `${rewardsTable(b)}
  <h2>Description</h2>
  <div class="description">${esc(b.description || '')}</div>
  ${b.rules ? `<h2>Rules</h2><div class="description">${esc(b.rules)}</div>` : ''}`;
}

/** A leaderboard table, driven by the API's own columns. */
export function leaderboardTable(lb) {
  const entries = lb.entries || [];
  if (!entries.length) {
    return `<p class="notice">No scores yet — results publish after the deadline. Entries below are still listed on the Entries tab.</p>`;
  }
  const columns = (lb.columns || []).filter((c) => !c.hidden);
  const head = `<th scope="col">#</th><th scope="col">Entrant</th><th scope="col">Entry</th>${columns
    .map((c) => `<th scope="col">${esc(c.title)}</th>`)
    .join('')}`;
  const rows = entries
    .map((e) => {
      const value = (c) => {
        const raw = e.values?.[c.key];
        if (raw == null) return '—';
        if (c.key === 'valid') return Number(raw) ? 'Yes' : 'No';
        if (String(c.source || '').endsWith('_micro') || ['judge', 'judge_low', 'judge_high'].includes(c.key)) return microRate(raw);
        return esc(e.display?.[c.key] ?? String(raw));
      };
      return `<tr>
        <td>${e.rank ?? '—'}</td>
        <td><a class="who" href="#/u/${encodeURIComponent(e.handle)}">${avatarImg(e.image, e.handle)}${esc(e.handle)}</a>${e.prize_rank ? ` <span class="prize">pays #${e.prize_rank}</span>` : ''}</td>
        <td>${esc(e.title || '')}</td>
        ${columns.map((c) => `<td>${value(c)}</td>`).join('')}
      </tr>`;
    })
    .join('');
  return `<table class="leader"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

/** A bounty's entries, newest first. */
export function entriesTable(subs) {
  if (!subs.length) return '<p class="notice">No entries yet.</p>';
  return `<ol class="entries">${subs
    .map(
      (s) => `<li>
        <a class="who" href="#/u/${encodeURIComponent(s.handle)}">${avatarImg(s.image, s.handle)}${esc(s.handle)}</a>
        <span class="entry-title">${esc(s.title || '')}</span>
        <span>${esc(s.status || '')}</span>
        <span>${timeAgo(s.created_at)}</span>
        ${s.rank ? `<span>rank #${s.rank}</span>` : ''}
      </li>`,
    )
    .join('')}</ol>`;
}

/** An account's public profile. */
export function profilePage(p) {
  const r = p.record || {};
  const links = [
    p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub: ${esc(p.github_login)}</a>` : '',
    p.x ? `<a href="https://x.com/${encodeURIComponent(p.x)}">X: ${esc(p.x)}</a>` : '',
    p.discord ? `<span>Discord: ${esc(p.discord)}</span>` : '',
    p.wallet?.address ? `<a href="${esc(p.wallet.explorer_url || '')}">Wallet ${esc(p.wallet.address.slice(0, 4))}…${esc(p.wallet.address.slice(-4))}</a>` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const solutions = (p.solutions || [])
    .map((s) => `<li><a href="#/bounty/${encodeURIComponent(s.slug || s.competition || '')}">${esc(s.title || s.slug || 'Entry')}</a>${s.placement ? ` — placed #${s.placement}` : ''}</li>`)
    .join('');
  const payouts = (p.payouts || [])
    .map((x) => `<li>${money(x.amount_usd ?? x.amount)} — ${esc(x.competition || x.title || '')}</li>`)
    .join('');
  return `<div class="profile-head">
    ${avatarImg(p.avatar?.url || p.image, p.display_name || p.handle, 'avatar-lg')}
    <div><h1>${esc(p.display_name || p.handle)}</h1><p class="handle">@${esc(p.handle)}</p>
    ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}${links ? `<p>${links}</p>` : ''}
    <p class="muted">Joined ${p.joined_at ? date(p.joined_at) : '—'}</p></div>
  </div>
  <ul class="chips" aria-label="Record">
    <li><strong>${compact(r.competitions_entered)}</strong> entered</li>
    <li><strong>${compact(r.competitions_placed)}</strong> placed</li>
    <li><strong>${compact(r.competitions_won)}</strong> won</li>
    <li><strong>${compact(r.podium_finishes)}</strong> podiums</li>
    <li><strong>${money(r.prize_usd)}</strong> prizes</li>
  </ul>
  <h2>Entries</h2>
  ${solutions ? `<ul class="plain">${solutions}</ul>` : '<p class="notice">No entries yet.</p>'}
  ${payouts ? `<h2>Payouts</h2><ul class="plain">${payouts}</ul>` : ''}`;
}

/** The site-wide rankings. */
export function rankingsTable(rows, order) {
  if (!rows.length) return '<p class="notice">No rankings yet.</p>';
  return `<table class="leader"><thead><tr><th scope="col">#</th><th scope="col">Account</th><th scope="col">Entered</th><th scope="col">Placed</th><th scope="col">Won</th><th scope="col">Best</th><th scope="col">Prizes</th></tr></thead><tbody>
  ${rows
    .map(
      (r) => `<tr><td>${r.rank}</td>
      <td><a class="who" href="#/u/${encodeURIComponent(r.handle)}">${avatarImg(r.avatar?.url || r.image, r.handle)}${esc(r.display_name || r.handle)}</a></td>
      <td>${compact(r.record?.competitions_entered)}</td><td>${compact(r.record?.competitions_placed)}</td>
      <td>${compact(r.record?.competitions_won)}</td><td>${r.record?.best_placement ? `#${r.record.best_placement}` : '—'}</td>
      <td>${money(r.record?.prize_usd)}</td></tr>`,
    )
    .join('')}</tbody></table>`;
}

/** The newest graded entries across the site. */
export function latestList(items) {
  if (!items.length) return '<p class="notice">Nothing yet.</p>';
  return `<ol class="entries">${items
    .map(
      (s) => `<li>
        <a class="who" href="#/u/${encodeURIComponent(s.handle)}">${avatarImg(s.image, s.handle)}${esc(s.handle)}</a>
        <span class="entry-title">${esc(s.entry_title || s.title || '')}</span>
        ${s.competition ? `<a href="#/bounty/${encodeURIComponent(s.competition.slug || s.competition)}">${esc(s.competition.title || s.competition.slug || s.competition)}</a>` : ''}
        <span>${timeAgo(s.created_at || s.received_at)}</span>
      </li>`,
    )
    .join('')}</ol>`;
}

/** A page for a fetch that failed: what happened, and a retry. */
export function errorView(message) {
  return `<h1>Couldn’t load this page</h1><p>${esc(message)}</p><p><a class="button" href="${esc(location.hash || '#/')}">Try again</a> <a href="#/">Back to bounties</a></p>`;
}

/** Pager buttons for a paginated list. */
export function pager(page, pages, label) {
  if (pages <= 1) return '';
  return `<nav class="pager" aria-label="${esc(label)} pages">
    <button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>← Previous</button>
    <span aria-live="polite">Page ${page} of ${pages}</span>
    <button data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Next →</button>
  </nav>`;
}
