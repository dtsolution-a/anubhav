'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Plus, LogOut, Trash2, Lock, MessageSquarePlus, Send } from 'lucide-react';
import ChatScreen from './mobile/ChatScreen';
import { idOf, timeOf, listTime, unreadFor, statusColor } from './mobile/shared';

// Phone experience for the end client: request list -> chat, like WhatsApp.
export default function ClientMobileApp({ project, clientOrg, brand, accent, accentLt, bgBase, onLogout }) {
  const projectId = project._id || project.id;
  const [revisions, setRevisions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState('home'); // home | chat | new
  const [openId, setOpenId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const sendingRef = useRef(false);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch(`/api/revisions?projectId=${projectId}`);
      if (!res.ok) return;
      const list = await res.json();
      // keep optimistic messages while a send is in flight
      setRevisions(prev => (sendingRef.current ? prev : list));
    } catch {} finally { setLoaded(true); }
  }, [projectId]);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    if (screen === 'new') return;
    const t = setInterval(() => { if (!document.hidden) loadList(); }, screen === 'chat' ? 4000 : 7000);
    return () => clearInterval(t);
  }, [screen, loadList]);

  // phone back button / swipe-back moves between screens
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

  const go = (s, id = null) => { history.pushState({ anx: s }, ''); setOpenId(id); setScreen(s); };
  const back = () => history.back();

  const rev = openId ? revisions.find(r => idOf(r) === openId) : null;

  async function send(msg, img) {
    const revId = idOf(rev);
    const optimistic = { authorType: 'client', authorName: 'You', message: msg || 'Uploaded an image', imageUrl: img, timestamp: new Date().toISOString(), _optimistic: true };
    sendingRef.current = true;
    setRevisions(prev => prev.map(r => idOf(r) === revId ? { ...r, thread: [...(r.thread || []), optimistic] } : r));
    try {
      const res = await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _addMessage: { message: msg || 'Uploaded an image', imageUrl: img } }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setRevisions(prev => prev.map(r => idOf(r) === revId ? updated : r));
      return true;
    } catch {
      setRevisions(prev => prev.map(r => idOf(r) === revId ? { ...r, thread: (r.thread || []).filter(m => !m._optimistic) } : r));
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
      setRevisions(prev => [created, ...prev]);
      setNewTitle(''); setNewDesc('');
      history.replaceState({ anx: 'chat' }, ''); // back from the chat returns to the list
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

  if (screen === 'chat' && rev) {
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
        <div className="wa-note"><Lock size={14} /> Website preview opens on desktop only. Share your changes here instead.</div>

        {!loaded && <p className="wa-empty" style={{ marginTop: '3rem' }}>Loading…</p>}

        {loaded && revisions.length === 0 && (
          <div className="wa-blank">
            <div className="wa-blank-icon" style={{ background: accentLt, color: accent }}><MessageSquarePlus size={30} /></div>
            <h3>No requests yet</h3>
            <p>Need a change? Send us a message and we will take care of it.</p>
            <button className="btn-primary" style={{ background: accent, color: '#000' }} onClick={() => go('new')}>Send first request</button>
          </div>
        )}

        {revisions.map(r => {
          const t = r.thread || [];
          const last = t[t.length - 1];
          const when = last ? timeOf(last) : new Date(r.createdAt);
          const unread = unreadFor(r, 'client');
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
                    : <span className="wa-status" style={{ color: statusColor(r.status, accent) }}>{r.status}</span>}
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
