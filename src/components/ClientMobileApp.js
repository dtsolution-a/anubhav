'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Plus, LogOut, Paperclip, Send, Trash2, Lock, X, MessageSquarePlus, Check } from 'lucide-react';

const seenKey = (id) => `anx_seen_${id}`;
const getSeen = (id) => {
  try { return parseInt(localStorage.getItem(seenKey(id)) || '0', 10) || 0; } catch { return 0; }
};
const setSeen = (id, n) => { try { localStorage.setItem(seenKey(id), String(n)); } catch {} };

// Phone photos are huge; shrink before sending as base64
function fileToDataUrl(file) {
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

const idOf = (r) => r._id || r.id;
const timeOf = (m) => new Date(m.timestamp || m.createdAt);
const hhmm = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function dayLabel(d) {
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function listTime(d) {
  return d.toDateString() === new Date().toDateString()
    ? hhmm(d)
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function ClientMobileApp({ project, clientOrg, brand, accent, accentLt, bgBase, onLogout }) {
  const projectId = project._id || project.id;
  const [revisions, setRevisions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState('home'); // home | chat | new
  const [openId, setOpenId] = useState(null);
  const [text, setText] = useState('');
  const [img, setImg] = useState(null);
  const [sending, setSending] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [, bump] = useState(0); // re-render after seen counts change
  const bodyRef = useRef(null);
  const taRef = useRef(null);
  const stickRef = useRef(true);
  const sendingRef = useRef(false);

  // ── data ──
  const loadList = useCallback(async () => {
    try {
      const res = await fetch(`/api/revisions?projectId=${projectId}`);
      if (!res.ok) return;
      const list = await res.json();
      setRevisions(prev => {
        // keep optimistic messages while a send is in flight
        if (sendingRef.current) return prev;
        return list;
      });
    } catch {} finally { setLoaded(true); }
  }, [projectId]);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    if (screen === 'new') return;
    const t = setInterval(() => { if (!document.hidden) loadList(); }, screen === 'chat' ? 4000 : 7000);
    return () => clearInterval(t);
  }, [screen, loadList]);

  // ── navigation with the phone's back button/gesture ──
  useEffect(() => {
    history.replaceState({ anx: 'home' }, '');
    const onPop = (e) => {
      const s = e.state?.anx || 'home';
      setScreen(s);
      if (s === 'home') setOpenId(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (s, id = null) => {
    history.pushState({ anx: s }, '');
    setOpenId(id);
    setScreen(s);
    stickRef.current = true;
  };
  const back = () => history.back();

  const rev = openId ? revisions.find(r => idOf(r) === openId) : null;
  const thread = rev?.thread || [];

  // mark as seen + keep scrolled to the newest message
  useEffect(() => {
    if (screen !== 'chat' || !rev) return;
    setSeen(openId, thread.length);
    bump(n => n + 1);
    const el = bodyRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [screen, openId, thread.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = bodyRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  // ── actions ──
  async function attach(file) {
    if (file) setImg(await fileToDataUrl(file));
  }

  async function send() {
    const msg = text.trim();
    if ((!msg && !img) || !rev || sending) return;
    const revId = idOf(rev);
    const optimistic = { authorType: 'client', authorName: 'You', message: msg || 'Uploaded an image', imageUrl: img, timestamp: new Date().toISOString(), _optimistic: true };
    const sentText = text, sentImg = img;
    sendingRef.current = true; setSending(true);
    setRevisions(prev => prev.map(r => idOf(r) === revId ? { ...r, thread: [...(r.thread || []), optimistic] } : r));
    setText(''); setImg(null);
    if (taRef.current) taRef.current.style.height = 'auto';
    stickRef.current = true;
    try {
      const res = await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _addMessage: { message: msg || 'Uploaded an image', imageUrl: sentImg } }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setRevisions(prev => prev.map(r => idOf(r) === revId ? updated : r));
    } catch {
      setRevisions(prev => prev.map(r => idOf(r) === revId ? { ...r, thread: (r.thread || []).filter(m => !m._optimistic) } : r));
      setText(sentText); setImg(sentImg);
      alert('Message not sent. Please check your connection and try again.');
    } finally {
      sendingRef.current = false; setSending(false);
    }
  }

  async function create(e) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: newTitle, message: newDesc }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setRevisions(prev => [created, ...prev]);
      setNewTitle(''); setNewDesc('');
      // replace the "new" screen with the chat so back returns to the list
      history.replaceState({ anx: 'chat' }, '');
      setOpenId(idOf(created));
      setScreen('chat');
    } catch {
      alert('Could not send your request. Please try again.');
    } finally { setCreating(false); }
  }

  async function remove() {
    if (!rev || !confirm('Delete this request from your view?')) return;
    const revId = idOf(rev);
    try {
      const res = await fetch(`/api/revisions/${revId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setRevisions(prev => prev.filter(r => idOf(r) !== revId));
      back();
    } catch { alert('Failed to delete.'); }
  }

  const closed = rev && (rev.status === 'closed' || rev.status === 'resolved');
  const statusColor = (s) => (s === 'resolved' ? '#a8ff78' : s === 'closed' ? '#888' : accent);
  const unreadOf = (r) => {
    const t = r.thread || [];
    const seen = getSeen(idOf(r));
    return t.slice(seen).filter(m => m.authorType !== 'client').length;
  };

  // ── screens ──
  if (screen === 'new') return (
    <div className="wa-screen" style={{ background: bgBase }}>
      <div className="wa-head">
        <button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button>
        <div className="wa-title" style={{ flex: 1 }}>New request</div>
      </div>
      <form className="wa-body wa-form" onSubmit={create}>
        <p className="wa-hint">Tell us what you'd like changed. Our team will reply right here.</p>
        <input className="input" placeholder="What needs to change? (e.g. Logo color)" value={newTitle} onChange={e => setNewTitle(e.target.value)} required autoFocus />
        <textarea className="textarea" placeholder="Add details..." value={newDesc} onChange={e => setNewDesc(e.target.value)} required style={{ minHeight: 150 }} />
        <button type="submit" disabled={creating} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: accent, color: '#000', minHeight: 48 }}>
          {creating ? 'Sending…' : <><Send size={16} /> Send request</>}
        </button>
      </form>
    </div>
  );

  if (screen === 'chat' && rev) {
    let lastDay = '';
    return (
      <div className="wa-screen" style={{ background: bgBase }}>
        <div className="wa-head">
          <button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button>
          <div className="wa-avatar" style={{ background: accentLt, color: accent }}>{(rev.title || '?')[0].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wa-title">{rev.title}</div>
            <div className="wa-sub" style={{ color: statusColor(rev.status) }}>{rev.status}</div>
          </div>
          <button className="btn-icon" style={{ color: '#ef4444' }} onClick={remove} aria-label="Delete"><Trash2 size={18} /></button>
        </div>

        <div className="wa-body wa-chat-bg" ref={bodyRef} onScroll={onScroll}>
          {thread.length === 0 && <p className="wa-empty">No messages yet — say hello below.</p>}
          {thread.map((m, i) => {
            const mine = m.authorType === 'client';
            const d = timeOf(m);
            const valid = !isNaN(d.getTime());
            const label = valid ? dayLabel(d) : '';
            const showDay = valid && label !== lastDay;
            if (showDay) lastDay = label;
            const prev = thread[i - 1];
            const sameAuthor = prev && prev.authorType === m.authorType && !showDay;
            const name = m.authorType === 'owner' ? 'Saarthi - DT Solution' : m.authorName;
            return (
              <div key={i}>
                {showDay && <div className="wa-day"><span>{label}</span></div>}
                <div className={`wa-msg ${mine ? 'mine' : 'theirs'}`} style={{ marginTop: sameAuthor ? 3 : 10 }}>
                  <div className={`wa-bubble ${mine ? 'mine' : 'theirs'}`} style={mine ? { background: accent } : undefined}>
                    {!mine && !sameAuthor && <div className="wa-author" style={{ color: accent }}>{name}</div>}
                    {m.imageUrl && <img src={m.imageUrl} alt="attachment" onClick={() => setViewer(m.imageUrl)} />}
                    {m.message && !(m.imageUrl && m.message === 'Uploaded an image') && <span className="wa-text">{m.message}</span>}
                    <span className="wa-meta">{valid && hhmm(d)}{mine && <Check size={13} style={{ opacity: m._optimistic ? 0.35 : 0.8 }} />}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="wa-footer">
          {closed ? (
            <div className="wa-closed">
              <span>This request is {rev.status}.</span>
              <button className="btn-ghost" onClick={() => { history.replaceState({ anx: 'new' }, ''); setScreen('new'); }}>New request</button>
            </div>
          ) : (
            <>
              {img && (
                <div className="wa-attach">
                  <img src={img} alt="preview" />
                  <button onClick={() => setImg(null)} aria-label="Remove"><X size={14} /></button>
                </div>
              )}
              <div className="wa-composer">
                <label className="wa-clip" aria-label="Attach photo">
                  <input type="file" accept="image/*" hidden onChange={e => { attach(e.target.files?.[0]); e.target.value = ''; }} />
                  <Paperclip size={22} />
                </label>
                <textarea
                  ref={taRef}
                  rows={1}
                  className="wa-input"
                  placeholder="Message"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                />
                <button className="wa-send" style={{ background: accent }} disabled={sending || (!text.trim() && !img)} onClick={send} aria-label="Send"><Send size={20} /></button>
              </div>
            </>
          )}
        </div>

        {viewer && (
          <div className="wa-viewer" onClick={() => setViewer(null)}>
            <button aria-label="Close"><X size={24} /></button>
            <img src={viewer} alt="preview" />
          </div>
        )}
      </div>
    );
  }

  // home
  return (
    <div className="wa-screen wa-home" style={{ background: bgBase }}>
      <div className="wa-head wa-home-head">
        <div className="wa-avatar" style={{ background: `linear-gradient(135deg, ${accent}, ${brand?.accentSecondary || accent})`, color: '#fff', fontSize: '0.8rem' }}>
          {brand?.logoText || '◆'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wa-title">{project.title}</div>
          <div className="wa-sub" style={{ textTransform: 'none' }}>{clientOrg?.name} · by {brand?.name}</div>
        </div>
        <button className="btn-icon" onClick={onLogout} aria-label="Exit"><LogOut size={20} /></button>
      </div>

      <div className="wa-body">
        <div className="wa-note">
          <Lock size={14} /> Website preview opens on desktop only. Share your changes here instead.
        </div>

        {!loaded && <p className="wa-empty" style={{ marginTop: '3rem' }}>Loading…</p>}

        {loaded && revisions.length === 0 && (
          <div className="wa-blank">
            <div className="wa-blank-icon" style={{ background: accentLt, color: accent }}><MessageSquarePlus size={30} /></div>
            <h3>No requests yet</h3>
            <p>Need a change? Send us a message and we'll take care of it.</p>
            <button className="btn-primary" style={{ background: accent, color: '#000' }} onClick={() => go('new')}>Send first request</button>
          </div>
        )}

        {revisions.map(r => {
          const t = r.thread || [];
          const last = t[t.length - 1];
          const when = new Date(last?.timestamp || last?.createdAt || r.createdAt);
          const unread = unreadOf(r);
          return (
            <div key={idOf(r)} className="wa-row" onClick={() => go('chat', idOf(r))}>
              <div className="wa-avatar" style={{ background: accentLt, color: accent }}>{(r.title || '?')[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="wa-row-top">
                  <span className="wa-title" style={unread ? { fontWeight: 700 } : undefined}>{r.title}</span>
                  <span className="wa-time" style={unread ? { color: accent } : undefined}>{listTime(when)}</span>
                </div>
                <div className="wa-row-top">
                  <span className="wa-preview">{last ? `${last.authorType === 'client' ? 'You: ' : ''}${last.message}` : (r.message || 'No messages')}</span>
                  {unread > 0
                    ? <span className="wa-badge" style={{ background: accent }}>{unread}</span>
                    : <span className="wa-status" style={{ color: statusColor(r.status) }}>{r.status}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {revisions.length > 0 && (
        <button className="wa-fab wa-fab-ext" style={{ background: accent }} onClick={() => go('new')}>
          <Plus size={22} /> New request
        </button>
      )}
    </div>
  );
}
