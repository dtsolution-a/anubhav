'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Plus, LogOut, Trash2, Lock, MessageSquarePlus, Send } from 'lucide-react';
import ChatScreen from './mobile/ChatScreen';
import NotifyButton from './NotifyButton';
import { listTime, rowUnread, statusColor, setAppBadge } from './mobile/shared';

// Phone experience for the end client: request list -> chat, like WhatsApp.
// The list runs on the lightweight /api/activity feed; a full thread is only fetched for the open chat.
export default function ClientMobileApp({ project, clientOrg, brand, accent, accentLt, bgBase, onLogout }) {
  const projectId = String(project._id || project.id);
  const [rows, setRows] = useState(null);
  const [fulls, setFulls] = useState({});
  const [screen, setScreen] = useState('home'); // home | chat | new
  const [openId, setOpenId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const sendingRef = useRef(false);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch('/api/activity');
      if (!res.ok) return;
      const list = await res.json();
      setRows(list.filter(r => r.projectId === projectId));
    } catch { setRows(prev => prev || []); }
  }, [projectId]);

  const loadFull = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/revisions/${id}`);
      if (!res.ok) return;
      const rev = await res.json();
      setFulls(prev => {
        const cur = prev[id];
        if (cur && sendingRef.current) return prev;
        if (cur && (cur.thread?.length || 0) === (rev.thread?.length || 0) && cur.status === rev.status) return prev;
        return { ...prev, [id]: rev };
      });
    } catch {}
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // lists refresh every 8s while visible; the open chat polls just its own thread, faster
  useEffect(() => {
    if (screen === 'new') return;
    const t = setInterval(() => {
      if (document.hidden) return;
      if (screen === 'chat' && openId) loadFull(openId); else loadList();
    }, screen === 'chat' ? 4000 : 8000);
    return () => clearInterval(t);
  }, [screen, openId, loadList, loadFull]);

  useEffect(() => { if (screen === 'chat' && openId) loadFull(openId); }, [screen, openId, loadFull]);

  // phone back button / swipe-back moves between screens
  useEffect(() => {
    history.replaceState({ anx: 'home' }, '');
    const onPop = (e) => {
      const s = e.state?.anx || 'home';
      setScreen(s);
      if (s === 'home') { setOpenId(null); loadList(); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [loadList]);

  const go = (s, id = null) => { history.pushState({ anx: s }, ''); setOpenId(id); setScreen(s); };
  const back = () => history.back();

  // app icon badge = unread replies
  const totalUnread = (rows || []).reduce((n, r) => n + rowUnread(r, 'client'), 0);
  useEffect(() => { setAppBadge(totalUnread); }, [totalUnread, screen, openId]);

  // notification tap -> open that conversation
  const deepRef = useRef(false);
  useEffect(() => {
    if (deepRef.current || rows === null) return;
    deepRef.current = true;
    const rid = new URLSearchParams(window.location.search).get('rev');
    if (rid && rows.some(r => r.id === rid)) go('chat', rid);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const rev = openId ? fulls[openId] : null;

  async function send(msg, img) {
    const revId = openId;
    const optimistic = { authorType: 'client', authorName: 'You', message: msg || 'Uploaded an image', imageUrl: img, timestamp: new Date().toISOString(), _optimistic: true };
    sendingRef.current = true;
    setFulls(p => ({ ...p, [revId]: { ...p[revId], thread: [...(p[revId].thread || []), optimistic] } }));
    try {
      const res = await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _addMessage: { message: msg || 'Uploaded an image', imageUrl: img } }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setFulls(p => ({ ...p, [revId]: { ...p[revId], ...updated } }));
      return true;
    } catch {
      setFulls(p => ({ ...p, [revId]: { ...p[revId], thread: (p[revId].thread || []).filter(m => !m._optimistic) } }));
      alert('Message not sent. Please check your connection and try again.');
      return false;
    } finally { sendingRef.current = false; }
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
      const id = String(created._id || created.id);
      setFulls(p => ({ ...p, [id]: created }));
      setNewTitle(''); setNewDesc('');
      loadList();
      history.replaceState({ anx: 'chat' }, ''); // back from the chat returns to the list
      setOpenId(id);
      setScreen('chat');
    } catch {
      alert('Could not send your request. Please try again.');
    } finally { setCreating(false); }
  }

  async function remove() {
    if (!openId || !confirm('Delete this request from your view?')) return;
    try {
      const res = await fetch(`/api/revisions/${openId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setRows(prev => (prev || []).filter(r => r.id !== openId));
      back();
    } catch { alert('Failed to delete.'); }
  }

  if (screen === 'new') return (
    <div className="wa-screen" style={{ background: bgBase }}>
      <div className="wa-head">
        <button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button>
        <div className="wa-title" style={{ flex: 1 }}>New request</div>
      </div>
      <form className="wa-body wa-form" onSubmit={create}>
        <p className="wa-hint">Tell us what you would like changed. Our team will reply right here.</p>
        <input className="input" placeholder="What needs to change? (e.g. Logo color)" value={newTitle} onChange={e => setNewTitle(e.target.value)} required autoFocus />
        <textarea className="textarea" placeholder="Add details..." value={newDesc} onChange={e => setNewDesc(e.target.value)} required style={{ minHeight: 150 }} />
        <button type="submit" disabled={creating} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: accent, color: '#000', minHeight: 48 }}>
          {creating ? 'Sending…' : <><Send size={16} /> Send request</>}
        </button>
      </form>
    </div>
  );

  if (screen === 'chat') {
    const row = (rows || []).find(r => r.id === openId);
    if (!rev) return (
      <div className="wa-screen" style={{ background: bgBase }}>
        <div className="wa-head">
          <button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button>
          <div className="wa-title">{row?.title || 'Loading…'}</div>
        </div>
        <div className="wa-body"><p className="wa-empty" style={{ marginTop: '3rem' }}>Opening conversation…</p></div>
      </div>
    );
    const closed = rev.status === 'closed' || rev.status === 'resolved';
    return (
      <ChatScreen
        rev={rev} myType="client" accent={accent} accentLt={accentLt} bgBase={bgBase}
        onBack={back} onSend={send}
        actions={<button className="btn-icon" style={{ color: '#ef4444' }} onClick={remove} aria-label="Delete"><Trash2 size={18} /></button>}
        footerOverride={closed ? (
          <div className="wa-closed">
            <span>This request is {rev.status}.</span>
            <button className="btn-ghost" onClick={() => { history.replaceState({ anx: 'new' }, ''); setScreen('new'); }}>New request</button>
          </div>
        ) : null}
      />
    );
  }

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
        <NotifyButton accent={accent} />
        <div className="wa-note"><Lock size={14} /> Website preview opens on desktop only. Share your changes here instead.</div>

        {rows === null && (
          <div className="wa-skel">{[0, 1, 2].map(i => <div key={i} className="wa-skel-row"><i /><span><b /><b /></span></div>)}</div>
        )}

        {rows && rows.length === 0 && (
          <div className="wa-blank">
            <div className="wa-blank-icon" style={{ background: accentLt, color: accent }}><MessageSquarePlus size={30} /></div>
            <h3>No requests yet</h3>
            <p>Need a change? Send us a message and we will take care of it.</p>
            <button className="btn-primary" style={{ background: accent, color: '#000' }} onClick={() => go('new')}>Send first request</button>
          </div>
        )}

        {(rows || []).map(r => {
          const unread = rowUnread(r, 'client');
          return (
            <div key={r.id} className="wa-row" onClick={() => go('chat', r.id)}>
              <div className="wa-avatar" style={{ background: accentLt, color: accent }}>{(r.title || '?')[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="wa-row-top">
                  <span className="wa-title" style={unread ? { fontWeight: 700 } : undefined}>{r.title}</span>
                  <span className="wa-time" style={unread ? { color: accent } : undefined}>{listTime(new Date(r.lastAt))}</span>
                </div>
                <div className="wa-row-top">
                  <span className="wa-preview">{r.lastType === 'client' ? 'You: ' : ''}{r.lastHasImage && !r.lastMessage ? '📷 Photo' : r.lastMessage}</span>
                  {unread > 0
                    ? <span className="wa-badge" style={{ background: accent }}>{unread}</span>
                    : <span className="wa-status" style={{ color: statusColor(r.status, accent) }}>{r.status}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rows && rows.length > 0 && (
        <button className="wa-fab wa-fab-ext" style={{ background: accent }} onClick={() => go('new')}>
          <Plus size={22} /> New request
        </button>
      )}
    </div>
  );
}
