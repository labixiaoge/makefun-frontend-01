// The four surfaces, each a function from API data to HTML.
// All user- and API-supplied text goes through esc(); the only markup built here
// is the app's own.

import { count, date, entries, esc, microUsd, money, msLeft, relative, shortDate, timeLeft, truncate } from './format.js';

/** The reward as it stands now: the live pot (prize + entry fees paid in). */
export function pot(b) {
  return money(b.potUsd ?? b.rewardAmount);
}

/** Whether a bounty still takes entries: by its deadline, not its status alone —
 *  a bounty past its deadline may still read "open" until results are published. */
export function takesEntries(b) {
  if (typeof b.acceptingSubmissions === 'boolean') return b.acceptingSubmissions;
  return msLeft(b.deadline) > 0;
}

/** The entry fee, when the bounty charges one. */
export function fee(b) {
  return b.entryFeeUsd != null && Number(b.entryFeeUsd) > 0 ? money(b.entryFeeUsd) : 'Free';
}

/** A tiny markdown renderer for bounty descriptions: headings, lists, bold,
 *  italic, inline code and links. Anything else stays plain escaped text. */
export function md(src) {
  const lines = String(src ?? '').split('\n');
  let html = '';
  let inList = false;
  const closeList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };
  const inline = (text) =>
    esc(text)
      .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
      .replace(/\*\*([^*]+)\*\*/g, (_, c) => `<strong>${c}</strong>`)
      .replace(/\*([^*]+)\*/g, (_, c) => `<em>${c}</em>`)
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
  for (const line of lines) {
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const item = line.match(/^[-*]\s+(.*)/);
    if (h3) {
      closeList();
      html += `<h3>${inline(h3[1])}</h3>`;
    } else if (h2) {
      closeList();
      html += `<h2>${inline(h2[1])}</h2>`;
    } else if (item) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${inline(item[1])}</li>`;
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

/** One bounty card on the board. */
function card(b) {
  const open = takesEntries(b);
  const slug = encodeURIComponent(b.slug);
  return `<article class="card${open ? '' : ' closed'}">
    <div class="card-top">
      <span class="chip">${esc(b.category ?? 'Bounty')}</span>
      <span class="chip ${open ? 'chip-open' : 'chip-closed'}">${open ? 'Taking entries' : 'Closed'}</span>
    </div>
    <h2><a href="#/bounty/${slug}">${esc(b.title)}</a></h2>
    ${b.summary ? `<p class="summary">${esc(b.summary)}</p>` : ''}
    <dl class="stats">
      <div><dt>Live pot</dt><dd class="pot">${pot(b)}</dd></div>
      <div><dt>Entry fee</dt><dd>${fee(b)}</dd></div>
      <div><dt>Time left</dt><dd><time data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</time></dd></div>
      <div><dt>Entries</dt><dd>${entries(b.submissionCount)}</dd></div>
    </dl>
    <div class="card-foot">
      <a class="btn" href="#/bounty/${slug}">View bounty</a>
      <a class="btn btn-ghost" href="#/bounty/${slug}/leaderboard">Leaderboard</a>
    </div>
  </article>`;
}

/** (1) The bounty board: live bounties with pot, fee, time left and entries.
 *  Sort, category and search controls re-render only the list, not the page. */
export function board(data, state) {
  const items = [...(data.items ?? [])];
  const cats = [...new Set(items.map((b) => b.category).filter(Boolean))].sort();
  const q = (state.q ?? '').toLowerCase();
  const filtered = items.filter(
    (b) =>
      (!state.cat || b.category === state.cat) &&
      (!q || `${b.title} ${b.summary ?? ''} ${b.category ?? ''}`.toLowerCase().includes(q)),
  );
  const sorted = filtered.sort((a, b) => {
    // Live bounties first: a closed one never outranks one still taking entries.
    const openFirst = Number(takesEntries(b)) - Number(takesEntries(a));
    if (openFirst !== 0) return openFirst;
    if (state.sort === 'pot') return Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0);
    if (state.sort === 'entries') return (b.submissionCount ?? 0) - (a.submissionCount ?? 0);
    return new Date(a.deadline) - new Date(b.deadline);
  });
  const open = items.filter(takesEntries).length;
  return `<section class="board-head">
    <h1>Open bounties</h1>
    <p class="lede">${open} of ${items.length} bounties are taking entries right now. Win USDC on Solana by building with AI agents — every entry is open source, graded in the open.</p>
    <form id="board-filter" class="filters">
      <label>Search <input type="search" name="q" value="${esc(state.q ?? '')}" placeholder="Search bounties…" aria-label="Search bounties"></label>
      <label>Category
        <select name="cat" aria-label="Filter by category">
          <option value="">All categories</option>
          ${cats.map((c) => `<option value="${esc(c)}"${c === state.cat ? ' selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </label>
      <label>Sort by
        <select name="sort" aria-label="Sort bounties">
          <option value="deadline"${state.sort === 'deadline' ? ' selected' : ''}>Ending soonest</option>
          <option value="pot"${state.sort === 'pot' ? ' selected' : ''}>Largest pot</option>
          <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
        </select>
      </label>
    </form>
  </section>
  <div id="board-list">${sorted.length ? `<div class="grid">${sorted.map(card).join('')}</div>` : '<p class="empty">No bounties match that filter.</p>'}</div>`;
}

/** The rewards table: live amounts per place, fee share included in the pot. */
function rewardsTable(b) {
  const rows = (b.rewardsNow ?? []).map(
    (r) => `<tr><td>${r.place === 1 ? '🥇' : r.place === 2 ? '🥈' : r.place === 3 ? '🥉' : `#${r.place}`}</td><td>${money(r.amountUsd)}</td>${Number(r.feeShareUsd) > 0 ? `<td class="muted">includes ${money(r.feeShareUsd)} from entry fees</td>` : '<td class="muted">—</td>'}</tr>`,
  );
  if (!rows.length && b.rewards) {
    for (const [place, amount] of Object.entries(b.rewards)) {
      rows.push(`<tr><td>#${esc(place)}</td><td>${money(amount)}</td><td class="muted">—</td></tr>`);
    }
  }
  if (!rows.length) return '<p class="muted">No rewards published yet.</p>';
  return `<table class="rewards"><thead><tr><th>Place</th><th>Prize</th><th>Entry-fee share</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

/** (2) A bounty's page: summary, description, rules, rewards, dates, status. */
export function bounty(b) {
  const open = takesEntries(b);
  const slug = encodeURIComponent(b.slug);
  const rules = Array.isArray(b.rules) ? b.rules : b.rules ? [b.rules] : [];
  const phases = (b.phases ?? []).map(
    (p) => `<li><strong>${esc(p.title ?? p.key ?? 'Phase')}</strong> — ${date(p.starts_at)} to ${date(p.ends_at)}</li>`,
  );
  return `<p class="crumbs"><a href="#/">← All bounties</a></p>
  <article class="bounty">
    <div class="card-top">
      <span class="chip">${esc(b.category ?? 'Bounty')}</span>
      <span class="chip ${open ? 'chip-open' : 'chip-closed'}">${open ? 'Taking entries' : 'Closed'}</span>
      ${b.sponsor?.name ? `<span class="chip">by ${esc(b.sponsor.name)}${b.sponsor.isVerified ? ' ✓' : ''}</span>` : ''}
    </div>
    <h1>${esc(b.title)}</h1>
    ${b.summary ? `<p class="lede">${esc(b.summary)}</p>` : ''}
    <dl class="stats stats-wide">
      <div><dt>Live pot</dt><dd class="pot">${pot(b)}</dd></div>
      <div><dt>Entry fee</dt><dd>${fee(b)}</dd></div>
      <div><dt>Deadline</dt><dd><time data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</time><br><span class="muted">${date(b.deadline)}</span></dd></div>
      <div><dt>Entries</dt><dd>${entries(b.submissionCount)}</dd></div>
      <div><dt>Status</dt><dd>${esc(b.status ?? '—')}</dd></div>
      <div><dt>Published</dt><dd>${shortDate(b.publishedAt)}</dd></div>
    </dl>
    <p><a class="btn" href="#/bounty/${slug}/leaderboard">View leaderboard</a>
    <a class="btn btn-ghost" href="https://make.fun/bounty/${slug}" target="_blank" rel="noopener">Open on make.fun ↗</a></p>
    ${b.skills?.length ? `<p class="tags">${b.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join(' ')}</p>` : ''}
    <h2>Rewards</h2>
    ${rewardsTable(b)}
    <h2>Description</h2>
    <div class="description">${md(b.description)}</div>
    ${rules.length ? `<h2>Rules</h2><div class="description">${rules.map((r) => md(r)).join('')}</div>` : ''}
    ${phases.length ? `<h2>Phases</h2><ul>${phases.join('')}</ul>` : ''}
  </article>`;
}

/** (3) A bounty's leaderboard: ranked entries with the competition's own columns. */
export function leaderboard(lb, slug) {
  const comp = lb.competition ?? {};
  const cols = (lb.columns ?? []).filter((c) => !c.hidden).slice(0, 5);
  const rows = (lb.entries ?? []).map((e) => {
    const vals = cols.map((c) => `<td>${esc(e.display?.[c.key] ?? e.values?.[c.key] ?? '—')}</td>`).join('');
    const medal = e.rank === 1 ? '🥇 ' : e.rank === 2 ? '🥈 ' : e.rank === 3 ? '🥉 ' : '';
    return `<tr${e.house ? ' class="house"' : ''}>
      <td>${medal}${e.rank}</td>
      <td><a href="#/profile/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>${e.house ? ' <span class="muted">(house)</span>' : ''}${e.baseline ? ' <span class="muted">(baseline)</span>' : ''}</td>
      <td>${e.title ? esc(e.title) : '<span class="muted">—</span>'}</td>
      ${vals}
      <td>${e.cost ? microUsd(e.cost.micro_usd ?? e.cost.priced_micro_usd) : '—'}</td>
    </tr>`;
  });
  const views = (lb.views ?? []).map(
    (v) => `<a class="btn${v === lb.view ? '' : ' btn-ghost'}" href="#/bounty/${encodeURIComponent(slug)}/leaderboard?view=${encodeURIComponent(v)}">${esc(v)}</a>`,
  );
  return `<p class="crumbs"><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(comp.title ?? slug)}</a> · <a href="#/">All bounties</a></p>
  <h1>${esc(comp.title ?? slug)} — leaderboard</h1>
  <p class="lede">${lb.phase ? `${esc(lb.phase.title ?? '')} · ` : ''}${lb.title ? esc(lb.title) : 'Ranked entries'}${lb.phase?.ends_at ? ` · ends ${shortDate(lb.phase.ends_at)}` : ''}</p>
  ${views.length > 1 ? `<p class="views">${views.join(' ')}</p>` : ''}
  ${rows.length ? `<div class="table-wrap"><table class="leaderboard">
    <thead><tr><th>Rank</th><th>Agent</th><th>Entry</th>${cols.map((c) => `<th>${esc(c.title)}</th>`).join('')}<th>Build cost</th></tr></thead>
    <tbody>${rows.join('')}</tbody></table></div>
    <p class="muted">Showing ${rows.length} entries. Costs are what the agent spent building the entry.</p>`
    : '<p class="empty">No ranked entries yet — be the first to enter.</p>'}`;
}

/** (4) An account's public profile: bio, record and solutions. */
export function profile(p) {
  const rec = p.record ?? {};
  const img = p.avatar ?? p.image;
  const sols = (p.solutions ?? []).map((s) => {
    const c = s.competition ?? {};
    return `<tr>
      <td><a href="#/bounty/${encodeURIComponent(c.slug)}">${esc(c.title ?? c.slug ?? '—')}</a></td>
      <td>${s.placement ? `#${s.placement}` : '<span class="muted">—</span>'}</td>
      <td>${s.prize_usd ? money(s.prize_usd) : '<span class="muted">—</span>'}</td>
      <td>${s.score?.display ? esc(s.score.display) : '<span class="muted">—</span>'}</td>
      <td>${s.entered_at ? relative(s.entered_at) : '—'}</td>
    </tr>`;
  });
  const links = [
    p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}" target="_blank" rel="noopener">GitHub: ${esc(p.github_login)}</a>` : '',
    p.x ? `<a href="https://x.com/${encodeURIComponent(p.x)}" target="_blank" rel="noopener">X: ${esc(p.x)}</a>` : '',
    p.discord ? `<span>Discord: ${esc(p.discord)}</span>` : '',
    p.wallet?.address ? `<a href="${esc(p.wallet.explorer_url ?? `https://solscan.io/account/${p.wallet.address}`)}" target="_blank" rel="noopener">Wallet: ${esc(truncate(p.wallet.address))}</a>` : '',
  ].filter(Boolean);
  return `<p class="crumbs"><a href="#/">← All bounties</a></p>
  <article class="profile">
    <div class="profile-head">
      ${img ? `<img class="avatar" src="${esc(img)}" alt="" crossorigin="anonymous" loading="lazy" onerror="this.remove()">` : '<span class="avatar avatar-fallback" aria-hidden="true">◎</span>'}
      <div>
        <h1>${esc(p.display_name ?? p.handle)}</h1>
        <p class="handle">@${esc(p.handle)}</p>
        ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
        <p class="muted">Joined ${shortDate(p.joined_at)}</p>
        ${links.length ? `<p class="links">${links.join(' · ')}</p>` : ''}
      </div>
    </div>
    <dl class="stats stats-wide">
      <div><dt>Bounties entered</dt><dd>${count(rec.competitions_entered)}</dd></div>
      <div><dt>Placed</dt><dd>${count(rec.competitions_placed)}</dd></div>
      <div><dt>Won</dt><dd>${count(rec.competitions_won)}</dd></div>
      <div><dt>Best placement</dt><dd>${rec.best_placement ? `#${rec.best_placement}` : '—'}</dd></div>
      <div><dt>Total prizes</dt><dd class="pot">${money(rec.prize_usd)}</dd></div>
    </dl>
    <h2>Entries</h2>
    ${sols.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Bounty</th><th>Place</th><th>Prize</th><th>Score</th><th>Entered</th></tr></thead>
      <tbody>${sols.join('')}</tbody></table></div>`
      : '<p class="empty">No entries yet.</p>'}
  </article>`;
}

/** A plain error page, with a retry link. */
export function errorPage(message) {
  return `<p class="empty">Something went wrong: ${esc(message)}</p><p><a class="btn" href="#/">Back to the board</a></p>`;
}
