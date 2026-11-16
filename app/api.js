// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Every request goes through one cache: a response stays fresh for 30 s,
// an ETag answer of 304 reuses the stored body, and identical requests in
// flight share a single fetch, so a re-visit inside the minute costs one
// conditional request at most and a re-render costs nothing.

const API = 'https://make.fun/api';
const FRESH_MS = 30_000;

/** url -> { at, etag, body } of the last good answer. */
const cache = new Map();
/** url -> the fetch already running for it. */
const inflight = new Map();

async function get(path) {
  const url = API + path;
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && now - hit.at < FRESH_MS) return hit.body;
  if (inflight.has(url)) return inflight.get(url);
  const job = (async () => {
    const headers = {};
    if (hit?.etag) headers['if-none-match'] = hit.etag;
    let res;
    try {
      res = await fetch(url, { headers });
    } catch (err) {
      throw new Error(`could not reach make.fun (${err.message})`);
    }
    if (res.status === 304 && hit) {
      hit.at = now;
      return hit.body;
    }
    if (!res.ok) {
      const err = new Error(`make.fun answered ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const etag = res.headers.get('etag');
    const body = await res.json();
    cache.set(url, { at: now, etag, body });
    return body;
  })();
  inflight.set(url, job);
  try {
    return await job;
  } finally {
    inflight.delete(url);
  }
}

/** The open bounties: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: { competition, phase, view, views, columns, entries }. */
export const getLeaderboard = (slug, view = 'performance') =>
  get(`/competitions/${encodeURIComponent(slug)}/leaderboard?view=${encodeURIComponent(view)}`);

/** A person's public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** A person's ranking summary, by handle. */
export const getRankings = (handle) => get(`/rankings/${encodeURIComponent(handle)}`);
