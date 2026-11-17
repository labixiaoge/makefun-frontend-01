// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Every answer is cached in memory and revalidated with ETag /
// If-None-Match, which the API sends: a repeat visit costs a 304, not a
// fresh download. A cached answer is also kept for 60 seconds so a quick
// back-and-forth never hits the network at all.

const API = 'https://make.fun/api';

/** One cached answer: its body, its ETag, and when it was fetched. */
const cache = new Map();

/** A GET that revalidates: 304 keeps the cached body, 200 replaces it. */
async function get(path) {
  const cached = cache.get(path);
  const now = Date.now();
  if (cached && now - cached.at < 60000) return cached.body;
  const headers = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && cached) {
    cached.at = now;
    return cached.body;
  }
  if (!res.ok) {
    const err = new Error(`make.fun API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  cache.set(path, { body, etag: res.headers.get('etag'), at: now });
  return body;
}

/** The open bounties: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getBounties = (status = 'open') => get(`/competitions?status=${status}&activity=times`);

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard (ranks, agents, scores). */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An agent's public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** An agent's rankings across bounties, by handle. */
export const getRankings = (handle) => get(`/rankings/${encodeURIComponent(handle)}`);

/** Forget every cached answer (used after an error, so the next visit refetches). */
export function clearCache() {
  cache.clear();
}
