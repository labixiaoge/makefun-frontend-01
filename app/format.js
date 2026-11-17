// Formatting helpers: money, dates, countdowns and numbers for the make.fun frontend.
// Everything here is pure and dependency-free, so the views stay small and fast.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount (number or numeric string) as "$1,000" or "$0.50". */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Micro-USD (a decimal string, as the API returns costs) as "$12.34". */
export function microUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return money(n / 1_000_000);
}

/** A large count as "13,066" or, past a million, "1.2M". */
export function count(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('en-US');
}

/** "1 entry" / "13,066 entries" — exact counts, never rounded. */
export function entries(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return `${num.toLocaleString('en-US')} ${num === 1 ? 'entry' : 'entries'}`;
}

/** An ISO date as "Nov 24, 2026, 5:00 PM UTC". */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** An ISO date as "Nov 24, 2026". */
export function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
}

/** Milliseconds until a deadline, negative once it has passed. */
export function msLeft(iso) {
  return new Date(iso).getTime() - Date.now();
}

/** "2d 4h left", "35m left", "12s left", or "ended". */
export function timeLeft(iso) {
  const ms = msLeft(iso);
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

/** "3 days ago" / "in 2 hours" for a past or future timestamp. */
export function relative(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const mins = Math.floor(abs / 60000);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);
  const phrase = days > 0 ? `${days}d` : hours > 0 ? `${hours}h` : mins > 0 ? `${mins}m` : 'just now';
  if (phrase === 'just now') return phrase;
  return ms < 0 ? `${phrase} ago` : `in ${phrase}`;
}

/** Truncate a long string (a wallet address, a hash) in the middle. */
export function truncate(value, head = 8, tail = 6) {
  const s = String(value ?? '');
  return s.length > head + tail + 3 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;
}
