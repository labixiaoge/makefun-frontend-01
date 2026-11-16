// Small helpers for showing API values.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00', 0.5 or '631.50') as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
}

/** A count as '1,234' or '8.2k'. */
export function compact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (n >= 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString('en-US');
}

/** A deadline as a date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** The time until a deadline: '2d 4h left', '35m left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** A time since an instant: '3h ago', '2d ago'. */
export function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return 'just now';
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return `${Math.floor(ms / 60000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** A leaderboard value in micro units (776000) as a rate ('0.776'). */
export function microRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return (n / 1e6).toFixed(3).replace(/0$/, '');
}

/** '1 entry' or '3 entries'. */
export function plural(n, one, many) {
  return `${compact(n)} ${Number(n) === 1 ? one : many}`;
}
