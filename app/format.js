// Small helpers for showing API values.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00' or 0.5) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
}

/** A byte count as '660.8 KB' / '1.2 MB'. */
export function bytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
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
  if (!Number.isFinite(ms) || ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** Whether a deadline is under a day away (and still open). */
export function endingSoon(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 && ms < 86400000;
}

/** A micro-unit value (e.g. judge win rate 950587) as '95.06%'. */
export function pct(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(2)}%`;
}

/** Two or three letters for an avatar fallback, from a handle or name. */
export function initials(name) {
  const parts = String(name ?? '').split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Inline Markdown: `code`, **bold**, *italic*, [text](url). Input is escaped first. */
function inline(text) {
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => `<a href="${url}" target="_blank" rel="noopener">${label}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return out;
}

/**
 * A small Markdown renderer for bounty descriptions: headings, paragraphs,
 * bullet lists, fenced code, inline code/bold/italic/links. Anything else is
 * plain text. Safe: every line is escaped before markup is added.
 */
export function markdown(src) {
  const lines = String(src ?? '').split('\n');
  const html = [];
  let list = null;
  let fence = null;
  const closeList = () => {
    if (list) {
      html.push('</ul>');
      list = null;
    }
  };
  for (const line of lines) {
    if (fence !== null) {
      if (line.trim().startsWith('```')) {
        html.push('</code></pre>');
        fence = null;
      } else {
        html.push(`${esc(line)}\n`);
      }
      continue;
    }
    if (line.trim().startsWith('```')) {
      closeList();
      fence = true;
      html.push('<pre><code>');
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      html.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (!list) {
        html.push('<ul>');
        list = true;
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    if (line.trim() === '') {
      closeList();
      continue;
    }
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  if (fence !== null) html.push('</code></pre>');
  return html.join('\n');
}
