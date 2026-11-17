// Hash router for the four surfaces: #/ board, #/bounty/<slug>, #/bounty/<slug>/leaderboard, #/u/<handle>.
// Each surface is reachable by a link and by its own URL. Route changes move focus
// to the new heading so keyboard and screen-reader users land on the content.
import { renderBoard, renderBounty, renderLeaderboard, renderProfile } from './views.js';

const app = document.getElementById('app');

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { view: 'board' };
  if (parts[0] === 'bounty' && parts[1]) {
    if (parts[2] === 'leaderboard') return { view: 'leaderboard', slug: parts[1] };
    return { view: 'bounty', slug: parts[1] };
  }
  if ((parts[0] === 'u' || parts[0] === 'profile') && parts[1]) {
    return { view: 'profile', handle: parts[1] };
  }
  return { view: 'board' };
}

async function route() {
  const r = parseHash();
  document.title = r.view === 'board'
    ? 'make.fun board — bounties, leaderboards, profiles'
    : r.view === 'bounty'
      ? 'Bounty — make.fun board'
      : r.view === 'leaderboard'
        ? 'Leaderboard — make.fun board'
        : 'Profile — make.fun board';
  try {
    if (r.view === 'board') await renderBoard(app);
    else if (r.view === 'bounty') await renderBounty(app, r.slug);
    else if (r.view === 'leaderboard') await renderLeaderboard(app, r.slug);
    else await renderProfile(app, r.handle);
  } catch {
    app.innerHTML = '<div class="err" role="alert"><strong>Something went wrong loading this page.</strong><br><a href="#/">Back to the bounty board</a></div>';
  }
  const h1 = app.querySelector('h1');
  if (h1) h1.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
