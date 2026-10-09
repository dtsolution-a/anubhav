'use client';
import { useState, useEffect } from 'react';
import { getSeen, setAppBadge } from './mobile/shared';

// Unread = messages from clients/agencies the owner has not opened yet (tracked per device)
export const ownerUnread = (row) =>
  row.lastType && row.lastType !== 'owner' ? Math.max(0, row.count - getSeen(row.id)) : 0;

// Polls the lightweight activity feed. Pauses while the tab is hidden.
export function useActivity(intervalMs = 10000) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/activity');
        if (res.ok && !stop) setRows(await res.json());
      } catch {}
    };
    load();
    const t = setInterval(load, intervalMs);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [intervalMs]);
  return rows;
}

// Pill for the sidebar. Also puts the count in the tab title and on the app icon.
export default function AdminUnreadBadge() {
  const rows = useActivity(12000);
  const total = (rows || []).reduce((n, r) => n + ownerUnread(r), 0);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '');
    document.title = total > 0 ? `(${total}) ${base}` : base;
    setAppBadge(total);
    return () => { document.title = base; };
  }, [total]);

  if (!total) return null;
  return <span className="nav-pill">{total > 99 ? '99+' : total}</span>;
}
