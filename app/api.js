// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Every answer is cached and revalidated: the API sends ETag, so a repeat fetch sends
// If-None-Match and the server answers 304 with no body when nothing changed. The cache
// lives in memory and in sessionStorage, so going back to a page you already visited
// costs no download at all. A failed fetch keeps the last good answer on screen.

const API = 'https://make.fun/api';
const memory = new Map();

function cacheKey(path) {
  return `mf:${path}`;
}

function readCache(path) {
  const hit = memory.get(path);
  if (hit) return hit;
  try {
    const raw = sessionStorage.getItem(cacheKey(path));
    if (raw) {
      const parsed = JSON.parse(raw);
      memory.set(path, parsed);
      return parsed;
    }
  } catch {
    // Private mode or a full store: the in-memory cache still works.
  }
  return null;
}

function writeCache(path, entry) {
  memory.set(path, entry);
  try {
    sessionStorage.setItem(cacheKey(path), JSON.stringify(entry));
  } catch {
    // Ignore a full store; the in-memory cache still works.
  }
}

async function get(path) {
  const cached = readCache(path);
  const headers = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  let res;
  try {
    res = await fetch(API + path, { headers });
  } catch (err) {
    if (cached) return { data: cached.data, fromCache: true };
    throw err;
  }
  if (res.status === 304 && cached) return { data: cached.data, fromCache: true };
  if (!res.ok) {
    if (cached) return { data: cached.data, fromCache: true };
    throw new Error(`make.fun answered ${res.status} for ${path}`);
  }
  const data = await res.json();
  const etag = res.headers.get('etag');
  writeCache(path, { data, etag, at: Date.now() });
  return { data, fromCache: false };
}

/** The open bounties: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: { entries: [...], columns: [...] }. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile, by its handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** The site-wide rankings: accounts by competitions won or prize money paid.
 * The query key is `order` (wins|paid); an earlier version sent `by`, which the API ignored,
 * so the "by prize money" page always showed the wins order. */
export const getRankings = (order = 'wins') => get(`/rankings?order=${encodeURIComponent(order)}`);
