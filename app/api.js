// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
// Every answer is cached in memory and revalidated with its ETag: the API's
// ETags are bound to the minute, so a revalidation inside the same minute
// answers 304 and costs no download. A view never refetches while its data
// is fresh, and filters run on the cached list instead of the network.

const API = 'https://make.fun/api';
const CACHE_TTL_MS = 60000;
const PAGE_LIMIT = 100;

const cache = new Map();

/** One GET, cached and revalidated with ETag. Throws {status} on HTTP errors. */
export async function fetchCached(path, ttlMs = CACHE_TTL_MS) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.at < ttlMs) return hit.data;
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && hit) {
    hit.at = now;
    return hit.data;
  }
  if (!res.ok) {
    const error = new Error(`make.fun API ${res.status} for ${path}`);
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  cache.set(path, { data, etag: res.headers.get('etag'), at: now });
  return data;
}

/** A list endpoint that pages with next_cursor, followed until it ends. */
export async function fetchAllPages(path) {
  const items = [];
  let cursor = null;
  for (let page = 0; page < 20; page++) {
    const url = cursor ? `${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(cursor)}` : path;
    const data = await fetchCached(url);
    const list = Array.isArray(data) ? data : data.items || [];
    items.push(...list);
    cursor = Array.isArray(data) ? null : data.next_cursor || null;
    if (!cursor) break;
  }
  return items;
}

/** The bounty board: open bounties, or every bounty when status is 'all'.
 *  The API's statuses are open and resolved only: 'closed' means resolved. */
export const listBounties = (status = 'open') =>
  status === 'all'
    ? Promise.all([fetchAllPages('/competitions?status=open&activity=times'), fetchAllPages('/competitions?status=resolved&activity=times')]).then(([a, b]) => [...a, ...b])
    : fetchAllPages(`/competitions?status=${status === 'closed' ? 'resolved' : status}&activity=times`);

/** One bounty, by its slug. */
export const getBounty = (slug) => fetchCached(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: { competition, phase, views, columns, entries }. */
export const getLeaderboard = (slug, view) =>
  fetchCached(`/competitions/${encodeURIComponent(slug)}/leaderboard${view ? `?view=${encodeURIComponent(view)}` : ''}`);

/** A bounty's entries, newest first. */
export const listSubmissions = (slug) => fetchAllPages(`/competitions/${encodeURIComponent(slug)}/submissions?limit=${PAGE_LIMIT}`);

/** An account's public profile, by its handle. */
export const getProfile = (handle) => fetchCached(`/profiles/${encodeURIComponent(handle)}`);

/** The site-wide rankings, by wins or by payout. */
export const getRankings = (order = 'wins') => fetchCached(`/rankings?limit=50&order=${encodeURIComponent(order)}`);

/** The newest entries whose grade has finished, across the site. */
export const getLatestEntries = () => fetchCached('/activity/entries/latest');

/** Site totals: entries, lines of code, tokens burned, prizes paid. */
export const getSiteStats = () => fetchCached('/activity/stats');
