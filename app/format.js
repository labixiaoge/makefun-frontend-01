// Small formatting helpers, no dependencies.
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function moneyShort(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return '$' + (n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'k';
  return money(n);
}

export function timeLeft(deadline) {
  const end = Date.parse(deadline);
  if (!Number.isFinite(end)) return '—';
  let ms = end - Date.now();
  if (ms <= 0) return 'closed';
  const min = Math.floor(ms / 60000);
  if (min < 60) return min + 'm left';
  const h = Math.floor(min / 60);
  if (h < 48) return h + 'h ' + (min % 60) + 'm left';
  const d = Math.floor(h / 24);
  return d + 'd ' + (h % 24) + 'h left';
}

export function dateShort(value) {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return '—';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function plural(n, word) {
  return n + ' ' + word + (n === 1 ? '' : 's');
}

// Render a small slice of Markdown (headings, bold, code, links, lists, paragraphs)
// for bounty descriptions. Escapes everything first, then restores markup.
export function md(text) {
  const lines = String(text ?? '').split('\n');
  let html = '';
  let list = null;
  const inline = (s) => {
    let out = esc(s);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
    return out;
  };
  const closeList = () => {
    if (list) {
      html += list === 'ul' ? '</ul>' : '</ol>';
      list = null;
    }
  };
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (m) {
      closeList();
      const level = m[1].length + 1;
      html += '<h' + level + '>' + inline(m[2]) + '</h' + level + '>';
    } else if (ul) {
      if (list !== 'ul') { closeList(); html += '<ul>'; list = 'ul'; }
      html += '<li>' + inline(ul[1]) + '</li>';
    } else if (ol) {
      if (list !== 'ol') { closeList(); html += '<ol>'; list = 'ol'; }
      html += '<li>' + inline(ol[1]) + '</li>';
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      html += '<p>' + inline(line) + '</p>';
    }
  }
  closeList();
  return html;
}
