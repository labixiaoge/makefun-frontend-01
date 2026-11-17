// make.fun's public API: read-only GET requests, open to any origin (CORS).
// Full API description: https://make.fun/api/openapi.json
//
// Caching: every answer is kept in memory with its ETag. A fresh answer (under
// 60 s old) is reused without a request; an older one is revalidated with
// If-None-Match, and the API's minute-bound ETags answer 304 while the minute
// holds, so a re-render usually costs no bytes at all.

const API = 'https://make.fun/api';
const FRESH_MS = 60_000;

// url -> { etag, body, at }
const cache = new Map();

async function get(path) {
  const url = API + path;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.body;
  const headers = {};
  if (hit?.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    return hit.body;
  }
  if (!res.ok) throw new Error(`make.fun API ${res.status} for ${path}`);
  const body = await res.json();
  cache.set(url, { etag: res.headers.get('etag'), body, at: Date.now() });
  return body;
}

/** The live bounties: { items: [...] }. activity=times keeps the payload small. */
export function getBounties() {
  return get('/competitions?status=open&activity=times');
}

/** One bounty, by its slug, with rewards, phases, rules and description. */
export function getBounty(slug) {
  return get(`/competitions/${encodeURIComponent(slug)}`);
}

/** A bounty's leaderboard: columns, views and ranked entries. */
export function getLeaderboard(slug, view, limit = 50) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (view) query.set('view', view);
  return get(`/competitions/${encodeURIComponent(slug)}/leaderboard?${query}`);
}

/** An account's public profile: record, bio, links and solutions. */
export function getProfile(handle) {
  return get(`/profiles/${encodeURIComponent(handle)}`);
}
