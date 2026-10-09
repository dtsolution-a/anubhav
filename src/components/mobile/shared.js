const seenKey = (id) => `anx_seen_${id}`;

export const getSeen = (id) => {
  try { return parseInt(localStorage.getItem(seenKey(id)) || '0', 10) || 0; } catch { return 0; }
};
// A conversation never opened on this device and quiet for 2 days is old news, not unread
export const hasSeen = (id) => { try { return localStorage.getItem(seenKey(id)) !== null; } catch { return true; } };
const STALE_MS = 2 * 24 * 3600 * 1000;
export const isStale = (id, lastAt) => !hasSeen(id) && lastAt && Date.now() - new Date(lastAt).getTime() > STALE_MS;
export const setSeen = (id, n) => { try { localStorage.setItem(seenKey(id), String(n)); } catch {} };

export const idOf = (r) => r._id || r.id;
export const timeOf = (m) => new Date(m.timestamp || m.createdAt);
export const hhmm = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function dayLabel(d) {
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export function listTime(d) {
  if (isNaN(d.getTime())) return '';
  return d.toDateString() === new Date().toDateString()
    ? hhmm(d)
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

// Messages from the other side that have not been opened yet
export function unreadFor(rev, myType) {
  const t = rev.thread || [];
  const last = t[t.length - 1];
  if (isStale(idOf(rev), last && (last.timestamp || last.createdAt))) return 0;
  return t.slice(getSeen(idOf(rev))).filter(m => m.authorType !== myType).length;
}

// Same idea as unreadFor, but from an /api/activity row (no full thread needed)
export function rowUnread(row, myType) {
  if (!row.lastType || row.lastType === myType || isStale(row.id, row.lastAt)) return 0;
  return Math.max(0, row.count - getSeen(row.id));
}

// Phone photos are huge; shrink before sending as base64
export function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export const statusColor = (s, accent) =>
  s === 'resolved' ? '#a8ff78' : s === 'closed' ? '#888' : s === 'in-progress' ? '#38bdf8' : accent;

// Number on the installed app's home screen icon (iOS 16.4+, Android, desktop PWAs)
export function setAppBadge(n) {
  try {
    if (n > 0) navigator.setAppBadge?.(n); else navigator.clearAppBadge?.();
  } catch {}
}
