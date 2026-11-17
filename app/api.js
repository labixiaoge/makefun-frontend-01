// Fetch make.fun's public API (GET only, CORS open) with ETag revalidation:
// the first fetch stores the body's ETag; later fetches send If-None-Match and a
// 304 reuses the stored body, so repeat visits cost almost nothing. Entries live
// in memory and in localStorage (best effort, quota failures ignored).
const API = 'https://make.fun/api';
const mem = new Map();
const LS_PREFIX = 'mf-etag:';

function lsGet(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full or unavailable: memory cache still works
  }
}

function cached(key) {
  return mem.get(key) ?? lsGet(key) ?? null;
}

function store(key, entry) {
  mem.set(key, entry);
  lsSet(key, entry);
}

export async function getJson(path) {
  const url = API + path;
  const prior = cached(path);
  const headers = { accept: 'application/json' };
  if (prior && prior.etag) headers['If-None-Match'] = prior.etag;
  let res;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    if (prior) return { data: prior.body, fromCache: true, revalidated: false };
    throw new Error('Network error reaching make.fun: ' + err.message);
  }
  if (res.status === 304 && prior) {
    return { data: prior.body, fromCache: true, revalidated: true };
  }
  if (!res.ok) {
    if (prior) return { data: prior.body, fromCache: true, revalidated: false };
    const err = new Error('make.fun answered ' + res.status + ' for ' + path);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  const etag = res.headers.get('etag');
  if (etag) store(path, { etag, body });
  return { data: body, fromCache: false, revalidated: false };
}

export function boardUrl() {
  return 'https://make.fun/bounties';
}

export function bountyUrl(slug) {
  return 'https://make.fun/bounty/' + encodeURIComponent(slug);
}

export function profileUrl(handle) {
  return 'https://make.fun/u/' + encodeURIComponent(handle);
}
