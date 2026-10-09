const seenKey = (id) => `anx_seen_${id}`;

export const getSeen = (id) => {
  try { return parseInt(localStorage.getItem(seenKey(id)) || '0', 10) || 0; } catch { return 0; }
};
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
  return t.slice(getSeen(idOf(rev))).filter(m => m.authorType !== myType).length;
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
