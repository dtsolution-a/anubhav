'use client';
import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

function keyToBytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Turns push notifications on/off for this device.
// variant "banner": a dismissible prompt; "button": a normal button that also shows state.
export default function NotifyButton({ variant = 'banner', accent = 'var(--accent)' }) {
  const [state, setState] = useState('checking'); // checking | on | off | denied | needs-install | unsupported
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try { if (variant === 'banner' && localStorage.getItem('anx_notify_dismissed') === '1') setHidden(true); } catch {}
    (async () => {
      const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        // iPhone Safari only exposes push once the app is added to the Home Screen
        return setState(ios && !standalone ? 'needs-install' : 'unsupported');
      }
      if (Notification.permission === 'denied') return setState('denied');
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setState(sub && Notification.permission === 'granted' ? 'on' : 'off');
      } catch { setState('unsupported'); }
    })();
  }, [variant]);

  async function enable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) { alert('Notifications work in the installed app. Please open the live site and try again.'); return; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return; }
      const { key, enabled } = await (await fetch('/api/push/key')).json();
      if (!enabled) { alert('Notifications are not configured on the server yet.'); return; }
      const sub = (await reg.pushManager.getSubscription()) ||
        await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error();
      setState('on');
    } catch {
      alert('Could not turn on notifications. Please try again.');
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState('off');
    } catch {} finally { setBusy(false); }
  }

  if (state === 'checking') return null;

  if (variant === 'banner') {
    if (hidden || state === 'on' || state === 'unsupported') return null;
    const dismiss = () => { setHidden(true); try { localStorage.setItem('anx_notify_dismissed', '1'); } catch {} };
    return (
      <div className="notify-banner">
        <Bell size={18} style={{ color: accent, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {state === 'needs-install' && <span>Add this app to your Home Screen (Share → Add to Home Screen) to get reply notifications.</span>}
          {state === 'denied' && <span>Notifications are blocked. Enable them in your phone Settings for this app.</span>}
          {state === 'off' && <span>Get notified the moment someone replies.</span>}
        </div>
        {state === 'off' && <button className="btn-primary notify-btn" style={{ background: accent, color: '#000' }} disabled={busy} onClick={enable}>Enable</button>}
        <button className="notify-x" onClick={dismiss} aria-label="Dismiss"><X size={15} /></button>
      </div>
    );
  }

  if (state === 'unsupported') return null;
  const on = state === 'on';
  return (
    <button
      className="btn-ghost"
      disabled={busy || state === 'needs-install' || state === 'denied'}
      onClick={on ? disable : enable}
      title={state === 'needs-install' ? 'Install the app to enable notifications' : state === 'denied' ? 'Blocked in browser settings' : ''}
      style={on ? { color: accent, borderColor: accent } : undefined}
    >
      {on ? <Bell size={15} /> : <BellOff size={15} />}
      {on ? 'Notifications on' : state === 'denied' ? 'Notifications blocked' : state === 'needs-install' ? 'Install app for alerts' : 'Enable notifications'}
    </button>
  );
}
