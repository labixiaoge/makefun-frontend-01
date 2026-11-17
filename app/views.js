// Views for the four surfaces: board, bounty page, leaderboard, profile.
// Each renders into an element and fetches what it needs through api.js.
import { getJson, bountyUrl, profileUrl } from './api.js';
import { esc, money, moneyShort, timeLeft, dateShort, plural, md } from './format.js';

const BOARD_LIMIT = 48;
const DETAIL_BATCH = 6;

function loading(text) {
  return '<p class="loading" role="status">' + esc(text || 'Loading…') + '</p>';
}

function errorBox(err) {
  return '<div class="err" role="alert"><strong>Could not load this page.</strong><br>' +
    esc(err && err.message ? err.message : String(err)) +
    '<br><a href="#/">Back to the bounty board</a></div>';
}

function cardHtml(b) {
  const slug = esc(b.slug);
  const desc = (b.description || '').split('\n')[0];
  const skills = Array.isArray(b.skills) ? b.skills.slice(0, 4) : [];
  return '<article class="card" data-slug="' + slug + '">' +
    '<h3><a href="#/bounty/' + slug + '">' + esc(b.title) + '</a></h3>' +
    (desc ? '<p class="desc">' + esc(desc) + '</p>' : '') +
    '<div class="stats">' +
      '<span>Reward <b class="pot" data-pot>' + moneyShort(b.rewardAmount) + '</b></span>' +
      '<span data-fee>Fee —</span>' +
      '<span><b>' + esc(timeLeft(b.deadline)) + '</b></span>' +
      '<span>' + plural(b.submissionCount ?? 0, 'entry') + '</span>' +
    '</div>' +
    '<div class="meta">' + esc(b.category || '') + (b.sponsor && b.sponsor.name ? ' · ' + esc(b.sponsor.name) : '') + '</div>' +
    (skills.length ? '<div class="tags">' + skills.map((s) => '<span class="tag">' + esc(s) + '</span>').join('') + '</div>' : '') +
    '<div><a class="btn ghost" href="#/bounty/' + slug + '">View bounty</a></div>' +
    '</article>';
}

// Fill a card's live pot and entry fee from its detail response.
function fillCard(card, detail) {
  const pot = card.querySelector('[data-pot]');
  if (pot && detail.potUsd != null) pot.textContent = moneyShort(detail.potUsd);
  const fee = card.querySelector('[data-fee]');
  if (fee) {
    fee.textContent = detail.entryFeeUsd != null && Number(detail.entryFeeUsd) > 0
      ? 'Fee ' + money(detail.entryFeeUsd)
      : 'Fee free';
  }
}

async function fillDetailsInBatches(root, slugs) {
  for (let i = 0; i < slugs.length; i += DETAIL_BATCH) {
    const batch = slugs.slice(i, i + DETAIL_BATCH);
    await Promise.all(batch.map(async (slug) => {
      const card = root.querySelector('[data-slug="' + slug + '"]');
      if (!card || !document.contains(card)) return;
      try {
        const { data } = await getJson('/competitions/' + encodeURIComponent(slug));
        if (document.contains(card)) fillCard(card, data);
      } catch {
        // leave the list reward in place; the bounty page has the full detail
      }
    }));
  }
}

export async function renderBoard(root) {
  root.innerHTML = '<h1 tabindex="-1">Live bounty board</h1>' +
    '<p class="mut">Open bounties on make.fun, with each reward as its live pot, its entry fee and its time left. Data is fetched live from the public API and revalidated with ETags.</p>' +
    '<div class="toolbar">' +
      '<input type="search" id="q" placeholder="Search bounties…" aria-label="Search bounties">' +
      '<select id="sort" aria-label="Sort bounties">' +
        '<option value="deadline">Closing soonest</option>' +
        '<option value="pot">Biggest reward</option>' +
        '<option value="entries">Most entries</option>' +
        '<option value="title">Title A–Z</option>' +
      '</select>' +
      '<span class="count" id="count" role="status"></span>' +
    '</div>' +
    '<div id="board">' + loading('Loading open bounties…') + '</div>';
  const board = root.querySelector('#board');
  const count = root.querySelector('#count');
  const q = root.querySelector('#q');
  const sort = root.querySelector('#sort');
  let items = [];
  let timer = null;

  const apply = () => {
    const needle = q.value.trim().toLowerCase();
    let list = items.filter((b) => {
      if (!needle) return true;
      const hay = ((b.title || '') + ' ' + (b.description || '') + ' ' + (b.category || '') + ' ' + ((b.skills || []).join(' '))).toLowerCase();
      return hay.includes(needle);
    });
    const key = sort.value;
    list = list.slice().sort((a, b) => {
      if (key === 'pot') return (Number(b.rewardAmount) || 0) - (Number(a.rewardAmount) || 0);
      if (key === 'entries') return (b.submissionCount || 0) - (a.submissionCount || 0);
      if (key === 'title') return String(a.title).localeCompare(String(b.title));
      return Date.parse(a.deadline) - Date.parse(b.deadline);
    });
    count.textContent = list.length + ' of ' + items.length + ' open';
    board.innerHTML = list.length
      ? '<div class="grid">' + list.map(cardHtml).join('') + '</div>'
      : '<p class="mut">No bounties match that search.</p>';
    fillDetailsInBatches(board, list.map((b) => b.slug));
  };

  q.addEventListener('input', apply);
  sort.addEventListener('change', apply);
  timer = setInterval(() => {
    // keep the countdowns honest without refetching
    board.querySelectorAll('[data-slug]').forEach((card) => {
      const b = items.find((x) => x.slug === card.getAttribute('data-slug'));
      if (!b) return;
      const stats = card.querySelectorAll('.stats span');
      if (stats.length >= 3) stats[2].innerHTML = '<b>' + esc(timeLeft(b.deadline)) + '</b>';
    });
  }, 30000);

  try {
    const { data } = await getJson('/competitions?status=open&limit=' + BOARD_LIMIT);
    items = data.items || [];
    apply();
  } catch (err) {
    clearInterval(timer);
    board.innerHTML = errorBox(err);
  }
}

function rewardsTable(rewardsNow, rewardAmount) {
  if (!Array.isArray(rewardsNow) || !rewardsNow.length) {
    return '<p class="mut">Reward ' + money(rewardAmount) + ' split over the paid places.</p>';
  }
  return '<ul class="rewards">' + rewardsNow.map((r) => {
    const place = r.place;
    const label = place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : place + 'th';
    return '<li><b>' + esc(label) + ' · ' + money(r.amountUsd ?? r.baseUsd) + '</b>' +
      (r.feeShareUsd != null && Number(r.feeShareUsd) > 0 ? '<span class="mut small">includes ' + money(r.feeShareUsd) + ' from entry fees</span>' : '') +
      '</li>';
  }).join('') + '</ul>';
}

export async function renderBounty(root, slug) {
  root.innerHTML = '<div id="bounty">' + loading('Loading bounty…') + '</div>';
  const host = root.querySelector('#bounty');
  try {
    const { data: b } = await getJson('/competitions/' + encodeURIComponent(slug));
    const pot = b.potUsd != null ? money(b.potUsd) : money(b.rewardAmount);
    const fee = b.entryFeeUsd != null ? money(b.entryFeeUsd) : '—';
    const skills = Array.isArray(b.skills) ? b.skills : [];
    host.innerHTML =
      '<p class="small"><a href="#/">← All bounties</a> · <a href="' + esc(bountyUrl(slug)) + '" rel="noopener">Open on make.fun ↗</a></p>' +
      '<h1 tabindex="-1">' + esc(b.title) + '</h1>' +
      '<p class="mut">' + esc(b.category || '') + (b.sponsor && b.sponsor.name ? ' · sponsored by ' + esc(b.sponsor.name) : '') +
      ' · ' + plural(b.submissionCount ?? 0, 'entry') + ' · status: ' + esc(b.status || 'open') + '</p>' +
      '<dl class="kv">' +
        '<div><dt>Live pot</dt><dd class="pot">' + esc(pot) + '</dd></div>' +
        '<div><dt>Base reward</dt><dd>' + money(b.rewardAmount) + '</dd></div>' +
        '<div><dt>Entry fee</dt><dd>' + esc(fee) + '</dd></div>' +
        '<div><dt>Time left</dt><dd>' + esc(timeLeft(b.deadline)) + '</dd></div>' +
        '<div><dt>Deadline</dt><dd>' + esc(dateShort(b.deadline)) + '</dd></div>' +
      '</dl>' +
      '<h2>Rewards</h2>' + rewardsTable(b.rewardsNow, b.rewardAmount) +
      '<h2>About this bounty</h2><div class="prose">' + md(b.description || '') + '</div>' +
      (skills.length ? '<h2>Skills</h2><div class="tags">' + skills.map((s) => '<span class="tag">' + esc(s) + '</span>').join('') + '</div>' : '') +
      '<h2>Leaderboard — top 5</h2><div id="lb-mini">' + loading('Loading leaderboard…') + '</div>' +
      '<p><a class="btn" href="#/bounty/' + esc(slug) + '/leaderboard">Full leaderboard</a> ' +
      '<a class="btn ghost" href="' + esc(bountyUrl(slug)) + '" rel="noopener">Enter on make.fun ↗</a></p>';
    const mini = host.querySelector('#lb-mini');
    try {
      const { data: lb } = await getJson('/competitions/' + encodeURIComponent(slug) + '/leaderboard?limit=5');
      const entries = lb.entries || [];
      mini.innerHTML = entries.length
        ? '<div class="tbl-wrap"><table><thead><tr><th>Rank</th><th>Agent</th><th>Entry</th><th class="num">Win rate</th></tr></thead><tbody>' +
          entries.slice(0, 5).map((e) => '<tr><td>' + esc(e.rank) + '</td><td><a href="#/u/' + esc(e.handle) + '">' + esc(e.handle) + '</a></td><td>' + esc(e.title || '') + '</td><td class="num">' + winRate(e) + '</td></tr>').join('') +
          '</tbody></table></div>'
        : '<p class="mut">No ranked entries yet.</p>';
    } catch {
      mini.innerHTML = '<p class="mut">Leaderboard is not available right now.</p>';
    }
  } catch (err) {
    host.innerHTML = errorBox(err);
  }
}

export function winRate(entry) {
  const v = entry && entry.values ? Number(entry.values.judge) : NaN;
  if (!Number.isFinite(v)) return '—';
  return (v / 10000).toFixed(1) + '%';
}

function sizeKb(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return '—';
  return (n / 1024).toFixed(0) + ' KB';
}

export async function renderLeaderboard(root, slug) {
  root.innerHTML = '<div id="lb">' + loading('Loading leaderboard…') + '</div>';
  const host = root.querySelector('#lb');
  try {
    const { data: lb } = await getJson('/competitions/' + encodeURIComponent(slug) + '/leaderboard?limit=100');
    const entries = lb.entries || [];
    const comp = lb.competition || {};
    host.innerHTML =
      '<p class="small"><a href="#/bounty/' + esc(slug) + '">← Back to the bounty</a></p>' +
      '<h1 tabindex="-1">Leaderboard — ' + esc(comp.title || slug) + '</h1>' +
      '<p class="mut">' + esc(entries.length) + ' ranked entries · ranked by judge win rate · smaller dossier wins ties.</p>' +
      (entries.length
        ? '<div class="tbl-wrap"><table><thead><tr><th>Rank</th><th>Agent</th><th>Entry</th><th class="num">Win rate</th><th class="num">Interval</th><th class="num">Size</th><th>Valid</th></tr></thead><tbody>' +
          entries.map((e) => {
            const low = e.values && Number.isFinite(Number(e.values.judge_low)) ? (Number(e.values.judge_low) / 10000).toFixed(1) + '%' : '—';
            const high = e.values && Number.isFinite(Number(e.values.judge_high)) ? (Number(e.values.judge_high) / 10000).toFixed(1) + '%' : '—';
            return '<tr><td>' + esc(e.rank) + '</td>' +
              '<td><a href="#/u/' + esc(e.handle) + '">' + esc(e.handle) + '</a></td>' +
              '<td>' + esc(e.title || '') + '</td>' +
              '<td class="num"><b>' + winRate(e) + '</b></td>' +
              '<td class="num">' + low + ' – ' + high + '</td>' +
              '<td class="num">' + sizeKb(e.values ? e.values.bytes : null) + '</td>' +
              '<td>' + (e.values && Number(e.values.valid) === 1 ? 'yes' : '—') + '</td></tr>';
          }).join('') +
          '</tbody></table></div>'
        : '<p class="mut">No ranked entries yet.</p>');
  } catch (err) {
    host.innerHTML = errorBox(err);
  }
}

export async function renderProfile(root, handle) {
  root.innerHTML = '<div id="prof">' + loading('Loading profile…') + '</div>';
  const host = root.querySelector('#prof');
  try {
    const { data: p } = await getJson('/profiles/' + encodeURIComponent(handle));
    const rec = p.record || {};
    const sols = Array.isArray(p.solutions) ? p.solutions : [];
    const avatar = p.image || p.avatar;
    host.innerHTML =
      '<p class="small"><a href="#/">← All bounties</a> · <a href="' + esc(profileUrl(handle)) + '" rel="noopener">Open on make.fun ↗</a></p>' +
      '<h1 tabindex="-1">' + (avatar ? '<img class="avatar" src="' + esc(avatar) + '" alt="" width="44" height="44"> ' : '') + esc(p.display_name || p.handle) + '</h1>' +
      '<p class="mut">@' + esc(p.handle) + (p.joined_at ? ' · joined ' + esc(dateShort(p.joined_at)) : '') +
      (p.wallet && p.wallet.address ? ' · wallet ' + esc(p.wallet.address.slice(0, 6)) + '…' + esc(p.wallet.address.slice(-4)) : '') + '</p>' +
      (p.bio ? '<p>' + esc(p.bio) + '</p>' : '') +
      '<dl class="kv">' +
        '<div><dt>Entered</dt><dd>' + (rec.competitions_entered ?? 0) + '</dd></div>' +
        '<div><dt>Placed</dt><dd>' + (rec.competitions_placed ?? 0) + '</dd></div>' +
        '<div><dt>Won</dt><dd>' + (rec.competitions_won ?? 0) + '</dd></div>' +
        '<div><dt>Best place</dt><dd>' + (rec.best_placement != null ? '#' + rec.best_placement : '—') + '</dd></div>' +
        '<div><dt>Prize money</dt><dd>' + money(rec.prize_usd) + '</dd></div>' +
      '</dl>' +
      '<h2>Entries</h2>' +
      (sols.length
        ? '<ul class="sol">' + sols.map((s) => {
            const c = s.competition || {};
            return '<li><h3><a href="#/bounty/' + esc(c.slug) + '">' + esc(s.title || c.title || '') + '</a></h3>' +
              '<div class="row"><span>' + esc(c.title || '') + '</span>' +
              (s.placement != null ? '<span>placed #' + esc(s.placement) + '</span>' : '') +
              (s.prize_usd != null ? '<span>won ' + money(s.prize_usd) + '</span>' : '') +
              (s.score ? '<span>score ' + esc(s.score.display ?? s.score.value) + '</span>' : '') +
              '<span>' + esc(c.status || '') + '</span></div></li>';
          }).join('') + '</ul>'
        : '<p class="mut">No public entries yet.</p>');
  } catch (err) {
    host.innerHTML = errorBox(err);
  }
}
