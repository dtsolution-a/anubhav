'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Plus, Search, MoreVertical, Inbox, FolderKanban, Settings, LogOut, Link as LinkIcon,
  Paperclip, Send, Trash2, X, MessageSquarePlus,
} from 'lucide-react';
import ChatScreen from './mobile/ChatScreen';
import PreviewLock from './PreviewLock';
import NotifyButton from './NotifyButton';
import { useDesktop } from '@/lib/useDesktop';
import { idOf, listTime, rowUnread, statusColor, fileToDataUrl, setAppBadge } from './mobile/shared';

const initials = (t) => (t || '?').trim().substring(0, 2).toUpperCase();
const docIcon = (type) => ({ quotation: '📄', invoice: '💰', contract: '📋', nda: '🔒' }[type?.toLowerCase()] || '📎');
const PROJECT_COLORS = { active: '#fbbf24', progress: '#38bdf8', 'in-review': '#a78bfa', delivered: '#4ade80' };

// Phone experience for agencies: Inbox / Projects / Settings, like WhatsApp.
// Lists run on the lightweight /api/activity feed; full threads load only for the open chat.
export default function AgencyMobileApp({ initialProjectId = null, layout = 'mobile' }) {
  const desktop = layout === 'desktop';
  const canPreview = useDesktop() === true;
  const [rootTab, setRootTab] = useState(initialProjectId ? 'projects' : 'inbox');
  const [device, setDevice] = useState('desktop');
  const [fullscreen, setFullscreen] = useState(false);
  const [session, setSession] = useState(null);
  const [projects, setProjects] = useState(null);
  const [activity, setActivity] = useState(null);
  const [fulls, setFulls] = useState({});
  const [nav, setNav] = useState({ s: initialProjectId ? 'project' : 'inbox', pid: initialProjectId, rid: null });
  const [ptab, setPtab] = useState('requests');
  const [notes, setNotes] = useState([]);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [nTitle, setNTitle] = useState('');
  const [nDesc, setNDesc] = useState('');
  const [nImg, setNImg] = useState(null);
  const [noteLabel, setNoteLabel] = useState('');
  const [noteValue, setNoteValue] = useState('');
  const sendingRef = useRef(false);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // branding comes from the agency org attached to its projects
  const agencyOrg = (projects || []).map(p => p.agencyId).find(a => a && typeof a === 'object');
  const branding = agencyOrg?.branding || {};
  const accent = /^#[0-9a-f]{6}$/i.test(branding.accentColor || '') ? branding.accentColor : '#FF7035';
  const accentLt = `${accent}22`;
  const bgBase = '#0a0807';
  const orgName = agencyOrg?.name || session?.name || 'Workspace';
  const myType = 'agency';

  // ── data ──
  const loadActivity = useCallback(async () => {
    try {
      const r = await fetch('/api/activity');
      if (r.status === 401) { window.location.href = '/'; return; }
      if (r.ok) setActivity(await r.json());
    } catch { setActivity(prev => prev || []); }
  }, []);
  const loadProjects = useCallback(async () => {
    try { const r = await fetch('/api/projects'); setProjects(r.ok ? await r.json() : []); } catch { setProjects(prev => prev || []); }
  }, []);

  const loadFull = useCallback(async (id) => {
    try {
      const r = await fetch(`/api/revisions/${id}`);
      if (!r.ok) return;
      const rev = await r.json();
      setFulls(prev => {
        const cur = prev[id];
        if (cur && sendingRef.current) return prev;
        if (cur && (cur.thread?.length || 0) === (rev.thread?.length || 0) && cur.status === rev.status) return prev;
        return { ...prev, [id]: rev };
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then(r => (r.ok ? r.json() : null)).then(s => s && setSession(s.session || s)).catch(() => {});
    loadProjects(); loadActivity();
  }, [loadProjects, loadActivity]);

  useEffect(() => {
    if (nav.s === 'new' || nav.s === 'note') return;
    const t = setInterval(() => {
      if (document.hidden) return;
      if (nav.s === 'chat' && nav.rid) loadFull(nav.rid); else loadActivity();
    }, nav.s === 'chat' ? 4000 : 8000);
    return () => clearInterval(t);
  }, [nav.s, nav.rid, loadActivity, loadFull]);

  useEffect(() => { if (nav.s === 'chat' && nav.rid) loadFull(nav.rid); }, [nav.s, nav.rid, loadFull]);

  useEffect(() => {
    if (!nav.pid) return;
    setNotes([]);
    fetch(`/api/notes?projectId=${nav.pid}`).then(r => (r.ok ? r.json() : [])).then(setNotes).catch(() => {});
  }, [nav.pid]);

  // phone back button / swipe-back
  useEffect(() => {
    history.replaceState({ anx: nav }, '');
    const onPop = (e) => { setNav(e.state?.anx || { s: 'inbox' }); setSheet(false); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const push = (next) => { history.pushState({ anx: next }, ''); setNav(next); setSheet(false); setQ(''); };
  const root = (s) => { const next = { s }; history.replaceState({ anx: next }, ''); setNav(next); setRootTab(s); setQ(''); setFilter('all'); };
  useEffect(() => { if (['inbox', 'projects', 'more'].includes(nav.s)) setRootTab(nav.s); }, [nav.s]);
  const back = () => history.back();

  // notification tap -> open that conversation
  const deepRef = useRef(false);
  useEffect(() => {
    if (deepRef.current || activity === null) return;
    deepRef.current = true;
    const rid = new URLSearchParams(window.location.search).get('rev');
    const row = rid && activity.find(r => r.id === rid);
    if (row) push({ s: 'chat', pid: row.projectId, rid });
  }, [activity]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalUnread = (activity || []).reduce((n, r) => n + rowUnread(r, myType), 0);
  useEffect(() => { setAppBadge(totalUnread); }, [totalUnread, nav]);

  const project = (projects || []).find(p => idOf(p) === nav.pid);
  const projRows = (activity || []).filter(r => r.projectId === String(nav.pid));
  const match = (...vals) => !q.trim() || vals.some(v => (v || '').toLowerCase().includes(q.trim().toLowerCase()));
  const sub = (r) => `${r.lastType === myType ? 'You: ' : r.lastName ? r.lastName + ': ' : ''}${r.lastHasImage && !r.lastMessage ? '📷 Photo' : r.lastMessage}`;

  // ── actions ──
  async function send(msg, img) {
    const id = nav.rid;
    const optimistic = { authorType: myType, authorName: orgName, message: msg || 'Uploaded an image', imageUrl: img, timestamp: new Date().toISOString(), _optimistic: true };
    sendingRef.current = true;
    setFulls(p => ({ ...p, [id]: { ...p[id], thread: [...(p[id].thread || []), optimistic] } }));
    try {
      const r = await fetch(`/api/revisions/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _addMessage: { message: msg || 'Uploaded an image', imageUrl: img } }),
      });
      if (!r.ok) throw new Error();
      const upd = await r.json();
      setFulls(p => ({ ...p, [id]: { ...p[id], ...upd } }));
      loadActivity();
      return true;
    } catch {
      setFulls(p => ({ ...p, [id]: { ...p[id], thread: (p[id].thread || []).filter(m => !m._optimistic) } }));
      alert('Message not sent. Please check your connection and try again.');
      return false;
    } finally { sendingRef.current = false; }
  }

  async function setStatus(status) {
    setSheet(false);
    const id = nav.rid;
    try {
      const r = await fetch(`/api/revisions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!r.ok) throw new Error();
      const upd = await r.json();
      setFulls(p => ({ ...p, [id]: { ...p[id], ...upd } }));
      loadActivity(); flash(`Marked as ${status}`);
    } catch { flash('Update failed'); }
  }

  async function createRequest(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const r = await fetch('/api/revisions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: nav.pid, title: nTitle, message: nDesc, imageUrl: nImg || '' }),
      });
      if (!r.ok) throw new Error();
      const created = await r.json();
      const id = String(created._id || created.id);
      setFulls(p => ({ ...p, [id]: { ...created, projectId: { _id: nav.pid, title: project?.title } } }));
      setNTitle(''); setNDesc(''); setNImg(null);
      loadActivity();
      const next = { s: 'chat', pid: nav.pid, rid: id };
      history.replaceState({ anx: next }, ''); // back from the chat returns to the project
      setNav(next);
    } catch { flash('Could not send your request'); } finally { setSaving(false); }
  }

  async function addNote(e) {
    e.preventDefault();
    try {
      const r = await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: nav.pid, label: noteLabel, value: noteValue }),
      });
      if (!r.ok) throw new Error();
      setNotes(await r.json());
      setNoteLabel(''); setNoteValue('');
      back();
    } catch { flash('Failed to add note'); }
  }

  async function deleteNote(entryId) {
    if (!confirm('Delete this note?')) return;
    try {
      const r = await fetch('/api/notes', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: nav.pid, entryId }),
      });
      if (!r.ok) throw new Error();
      setNotes(await r.json());
    } catch { flash('Failed to delete note'); }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  const copyText = (text, msg) => navigator.clipboard?.writeText(text).then(() => flash(msg), () => prompt('Copy this:', text));

  // ── shared chrome (plain functions, so inputs keep focus while typing) ──
  const toastEl = () => (toast ? <div className="wa-toast">{toast}</div> : null);
  const tabBarEl = () => (
    <div className="wa-tabbar">
      {[['inbox', 'Inbox', Inbox, totalUnread], ['projects', 'Projects', FolderKanban, 0], ['more', 'Settings', Settings, 0]].map(([k, label, Icon, badge]) => (
        <button key={k} className={(desktop ? rootTab : nav.s) === k ? 'on' : ''} onClick={() => root(k)}>
          <span className="wa-tab-ic"><Icon size={22} />{badge > 0 && <i className="wa-tab-badge">{badge > 99 ? '99+' : badge}</i>}</span>
          {label}
        </button>
      ))}
    </div>
  );
  const tabbar = () => (desktop ? null : tabBarEl());
  const searchBox = (placeholder) => (
    <div className="wa-search">
      <Search size={16} />
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} />
      {q && <button onClick={() => setQ('')} aria-label="Clear"><X size={15} /></button>}
    </div>
  );
  const chips = (items) => (
    <div className="wa-chips-row">
      {items.map(([k, label]) => (
        <button key={k} className={filter === k ? 'on' : ''} style={filter === k ? { background: accent, color: '#000' } : undefined} onClick={() => setFilter(k)}>{label}</button>
      ))}
    </div>
  );
  const skeleton = () => <div className="wa-skel">{[0, 1, 2, 3].map(i => <div key={i} className="wa-skel-row"><i /><span><b /><b /></span></div>)}</div>;
  const convRow = (r, showProject) => {
    const unread = rowUnread(r, myType);
    return (
      <div key={r.id} className="wa-row" onClick={() => push({ s: 'chat', pid: r.projectId, rid: r.id })}>
        <div className="wa-avatar" style={{ background: accentLt, color: accent }}>{((showProject ? r.projectTitle : r.title) || '?')[0].toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wa-row-top">
            <span className="wa-title" style={unread ? { fontWeight: 700 } : undefined}>
              {showProject ? r.projectTitle : r.title}
              {showProject && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {r.title}</span>}
            </span>
            <span className="wa-time" style={unread ? { color: accent } : undefined}>{listTime(new Date(r.lastAt))}</span>
          </div>
          <div className="wa-row-top">
            <span className="wa-preview">{sub(r)}</span>
            {unread > 0
              ? <span className="wa-badge" style={{ background: accent }}>{unread}</span>
              : <span className="wa-status" style={{ color: statusColor(r.status, accent) }}>{r.status}</span>}
          </div>
        </div>
      </div>
    );
  };

  // the portal's own brand colour drives tabs, pills and highlights
  const shell = (children) => <div style={{ '--accent': accent, '--accent-light': accentLt }}>{children}{toastEl()}</div>;

  // ── CHAT ──
  const screenChat = () => {
    const rev = fulls[nav.rid];
    const row = (activity || []).find(r => r.id === nav.rid);
    if (!rev) return (
      <div className="wa-screen" style={{ background: bgBase }}>
        <div className="wa-head"><button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button><div className="wa-title">{row?.title || 'Loading…'}</div></div>
        <div className="wa-body"><p className="wa-empty" style={{ marginTop: '3rem' }}>Opening conversation…</p></div>
      </div>
    );
    const closed = rev.status === 'closed' || rev.status === 'resolved';
    return (
      <>
        <ChatScreen
          rev={{ ...rev, title: `${row?.projectTitle ? row.projectTitle + ' · ' : ''}${rev.title}` }}
          myType={myType} accent={accent} accentLt={accentLt} bgBase={bgBase}
          onBack={back} onSend={send}
          actions={<button className="btn-icon" onClick={() => setSheet(true)} aria-label="Actions"><MoreVertical size={20} /></button>}
          footerOverride={closed ? <div className="wa-closed"><span>This request is {rev.status}.</span><button className="btn-ghost" onClick={() => setStatus('open')}>Reopen</button></div> : null}
        />
        {sheet && (
          <div className="wa-sheet-bg" onClick={() => setSheet(false)}>
            <div className="wa-sheet" onClick={e => e.stopPropagation()}>
              <div className="wa-sheet-title">Update request</div>
              {rev.status !== 'in-progress' && !closed && <button onClick={() => setStatus('in-progress')}>Mark in progress</button>}
              {!closed && <button style={{ color: '#4ade80' }} onClick={() => setStatus('resolved')}>Mark as resolved</button>}
              {!closed && <button style={{ color: '#ef4444' }} onClick={() => setStatus('closed')}>Close request</button>}
              {closed && <button onClick={() => setStatus('open')}>Reopen</button>}
              <button onClick={() => setSheet(false)}>Cancel</button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── NEW REQUEST ──
  const screenNew = () => (
    <div className="wa-screen" style={{ background: bgBase }}>
      <div className="wa-head">
        <button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wa-title">New request</div>
          <div className="wa-sub" style={{ textTransform: 'none' }}>{project?.title}</div>
        </div>
      </div>
      <form className="wa-body wa-form" onSubmit={createRequest}>
        <p className="wa-hint">Describe the change you need. The DT Solution team will reply in the chat.</p>
        <input className="input" placeholder="What needs to change?" value={nTitle} onChange={e => setNTitle(e.target.value)} required autoFocus />
        <textarea className="textarea" placeholder="Add details..." value={nDesc} onChange={e => setNDesc(e.target.value)} required style={{ minHeight: 150 }} />
        {nImg && (
          <div className="wa-attach" style={{ margin: 0 }}>
            <img src={nImg} alt="preview" />
            <button type="button" onClick={() => setNImg(null)} aria-label="Remove"><X size={14} /></button>
          </div>
        )}
        <label className="btn-ghost" style={{ justifyContent: 'center', minHeight: 46 }}>
          <input type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setNImg(await fileToDataUrl(f)); }} />
          <Paperclip size={18} /> {nImg ? 'Change photo' : 'Attach a photo (optional)'}
        </label>
        <button type="submit" disabled={saving} className="btn-primary wa-submit" style={{ background: accent, color: '#000' }}>
          {saving ? 'Sending…' : <><Send size={16} /> Send request</>}
        </button>
      </form>
    </div>
  );

  // ── NEW NOTE ──
  const screenNote = () => (
    <div className="wa-screen" style={{ background: bgBase }}>
      <div className="wa-head"><button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button><div className="wa-title" style={{ flex: 1 }}>New note</div></div>
      <form className="wa-body wa-form" onSubmit={addNote}>
        <input className="input" placeholder="Label (e.g. Server credentials)" value={noteLabel} onChange={e => setNoteLabel(e.target.value)} required autoFocus />
        <textarea className="textarea" placeholder="Value" value={noteValue} onChange={e => setNoteValue(e.target.value)} required style={{ minHeight: 140, fontFamily: 'monospace' }} />
        <button type="submit" className="btn-primary wa-submit" style={{ background: accent, color: '#000' }}>Save note</button>
      </form>
    </div>
  );

  // ── PROJECT ──
  const screenProject = () => {
    if (!project) return (
      <div className="wa-screen" style={{ background: bgBase }}>
        <div className="wa-head"><button className="btn-icon" onClick={() => root('projects')} aria-label="Back"><ArrowLeft size={22} /></button><div className="wa-title">Project</div></div>
        <div className="wa-body">{projects === null ? skeleton() : <p className="wa-empty" style={{ marginTop: '3rem' }}>Project not found.</p>}</div>
      </div>
    );
    const docs = project.documents || [];
    const openCount = projRows.filter(r => r.status === 'open' || r.status === 'in-progress').length;
    return (
      <div className="wa-screen" style={{ background: bgBase }}>
        <div className="wa-head">
          <button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button>
          <div className="wa-avatar" style={{ background: accentLt, color: accent, fontSize: '0.85rem' }}>{initials(project.title)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wa-title">{project.title}</div>
            <div className="wa-sub" style={{ color: PROJECT_COLORS[project.status] || accent }}>{project.status}</div>
          </div>
          {project.clientCode && <button className="btn-icon" onClick={() => copyText(`${window.location.origin}/?access=${btoa(project.clientCode)}`, 'Client login link copied')} aria-label="Copy client link"><LinkIcon size={19} /></button>}
        </div>

        <div className="wa-tabs">
          {[['requests', `Requests${openCount ? ` (${openCount})` : ''}`], ['documents', `Documents${docs.length ? ` (${docs.length})` : ''}`], ['notes', 'Notes'], ['preview', 'Preview']].map(([k, label]) => (
            <button key={k} className={ptab === k ? 'on' : ''} style={ptab === k ? { background: accent, color: '#000' } : undefined} onClick={() => setPtab(k)}>{label}</button>
          ))}
        </div>

        <div className="wa-body">
          {ptab === 'requests' && (
            <>
              {activity === null && skeleton()}
              {activity && !projRows.length && (
                <div className="wa-blank">
                  <div className="wa-blank-icon" style={{ background: accentLt, color: accent }}><MessageSquarePlus size={30} /></div>
                  <h3>No requests yet</h3>
                  <p>Need a change on this project? Send a request and we will get on it.</p>
                  <button className="btn-primary" style={{ background: accent, color: '#000' }} onClick={() => push({ s: 'new', pid: nav.pid })}>Send first request</button>
                </div>
              )}
              {projRows.map(r => convRow(r, false))}
            </>
          )}

          {ptab === 'documents' && (
            <div className="wa-form">
              {!docs.length && <p className="wa-empty" style={{ marginTop: '2rem' }}>No documents yet. Ask your project manager to attach them.</p>}
              {docs.map((d, i) => (
                <a key={i} href={d.url} target="_blank" rel="noreferrer" className="doc-item">
                  <div className="doc-icon" style={{ background: accentLt, fontSize: '1.2rem' }}>{docIcon(d.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="doc-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
                    <div className="doc-type">{d.type}</div>
                  </div>
                  <span style={{ color: accent, fontSize: '0.8rem' }}>Open ↗</span>
                </a>
              ))}
            </div>
          )}

          {ptab === 'notes' && (
            <div className="wa-form">
              {!notes.length && <p className="wa-empty" style={{ marginTop: '2rem' }}>No private notes yet.</p>}
              {notes.map(n => (
                <div key={n._id || n.id} className="wa-note-card">
                  <div className="wa-note-top"><span>{n.label}</span><button onClick={() => deleteNote(n._id || n.id)} aria-label="Delete note"><Trash2 size={16} /></button></div>
                  <pre>{n.value}</pre>
                </div>
              ))}
              <button className="btn-ghost" style={{ justifyContent: 'center', minHeight: 46 }} onClick={() => push({ s: 'note', pid: nav.pid })}><Plus size={16} /> Add note</button>
            </div>
          )}

          {ptab === 'preview' && desktop && canPreview && (
            <div style={{ padding: '1rem' }}>
              <div className="device-bar" style={{ borderRadius: 'var(--radius-lg)', marginBottom: '1rem', border: '1px solid var(--bg-border)' }}>
                <div className="device-opts">
                  {[['desktop', 'Desktop', '🖥'], ['air', 'MacBook Air', '💻'], ['pro', 'MacBook Pro', '💻'], ['ipad', 'iPad', '📱'], ['iphone', 'iPhone', '📱']].map(([id, label, icon]) => (
                    <button key={id} className={`device-opt ${device === id ? 'active' : ''}`} style={device === id ? { background: accent } : undefined} onClick={() => setDevice(id)}><span>{icon}</span>{label}</button>
                  ))}
                </div>
                <button className="btn-ghost" onClick={() => setFullscreen(true)}>Full screen</button>
              </div>
              <div className="preview-wrap">
                <div className="preview-toolbar">
                  <div className="toolbar-dots"><div className="dot dot-r" /><div className="dot dot-y" /><div className="dot dot-g" /></div>
                  <div className="toolbar-url">{project.status?.toLowerCase() === 'delivered' ? (project.previewUrl || 'No preview URL set') : 'Preview Mode - Link Hidden'}</div>
                </div>
                <div className={`iframe-area frame-${device}`}>
                  <iframe src={project.previewUrl || 'about:blank'} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview" />
                </div>
              </div>
              {fullscreen && (
                <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{project.title} — Full Preview</span>
                    <button className="btn-ghost" onClick={() => setFullscreen(false)}>✕ Close</button>
                  </div>
                  <iframe src={project.previewUrl || 'about:blank'} style={{ flex: 1, border: 'none', width: '100%' }} title="Fullscreen Preview" />
                </div>
              )}
            </div>
          )}

          {ptab === 'preview' && !(desktop && canPreview) && (
            <div style={{ padding: '1rem' }}>
              <PreviewLock />
              {project.description && <p style={{ marginTop: '1rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{project.description}</p>}
              {project.deliveredOn && <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Delivered {project.deliveredOn}</p>}
            </div>
          )}
        </div>

        {ptab === 'requests' && projRows.length > 0 && (
          <button className="wa-fab wa-fab-ext" style={{ background: accent }} onClick={() => push({ s: 'new', pid: nav.pid })}><Plus size={22} /> New request</button>
        )}
      </div>
    );
  }

  // ── PROJECTS TAB ──
  const screenProjects = () => {
    const list = (projects || []).filter(p => (filter === 'all' || p.status === filter) && match(p.title, p.clientCode, p.description));
    return (
      <div className="wa-screen" style={{ background: bgBase }}>
        <div className="wa-head wa-home-head"><div className="wa-title" style={{ flex: 1, fontSize: '1.25rem' }}>Projects</div></div>
        {searchBox('Search projects')}
        {chips([['all', 'All'], ['active', 'Active'], ['in-review', 'In review'], ['delivered', 'Delivered']])}
        <div className="wa-body">
          {projects === null && skeleton()}
          {projects && !list.length && <p className="wa-empty" style={{ marginTop: '3rem' }}>{projects.length ? 'No projects match.' : 'No projects yet. They will show up once the team adds them.'}</p>}
          {list.map(p => {
            const pr = (activity || []).filter(r => r.projectId === String(idOf(p)));
            const unread = pr.reduce((n, r) => n + rowUnread(r, myType), 0);
            const open = pr.filter(r => r.status === 'open' || r.status === 'in-progress').length;
            return (
              <div key={idOf(p)} className="wa-row" onClick={() => { setPtab('requests'); push({ s: 'project', pid: idOf(p) }); }}>
                <div className="wa-avatar" style={{ background: accentLt, color: accent, fontSize: '0.9rem' }}>{initials(p.title)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="wa-row-top">
                    <span className="wa-title" style={unread ? { fontWeight: 700 } : undefined}>{p.title}</span>
                    <span className="wa-status" style={{ color: PROJECT_COLORS[p.status] || accent }}>{p.status}</span>
                  </div>
                  <div className="wa-row-top">
                    <span className="wa-preview">{open ? `${open} open request${open > 1 ? 's' : ''}` : (p.description || 'No open requests')}</span>
                    {unread > 0 && <span className="wa-badge" style={{ background: accent }}>{unread}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {tabbar()}
      </div>
    );
  }

  // ── SETTINGS TAB ──
  const screenMore = () => (
    <div className="wa-screen" style={{ background: bgBase }}>
      <div className="wa-head wa-home-head"><div className="wa-title" style={{ fontSize: '1.25rem' }}>Settings</div></div>
      <div className="wa-body wa-form">
        <div className="wa-card">
          <div className="wa-card-title">{orgName}</div>
          <p className="wa-hint">Agency Portal{session?.code ? ` · ID ${session.code}` : ''}</p>
        </div>
        <div className="wa-card">
          <div className="wa-card-title">Notifications</div>
          <p className="wa-hint" style={{ marginBottom: '0.5rem' }}>Get an alert on this phone the moment the team replies.</p>
          <NotifyButton variant="button" accent={accent} />
        </div>
        <div className="wa-card">
          <div className="wa-card-title">At a glance</div>
          <div className="wa-stats">
            <div><b>{(projects || []).length}</b><span>Projects</span></div>
            <div><b>{(projects || []).filter(p => ['active', 'progress', 'in-review'].includes(p.status)).length}</b><span>Active</span></div>
            <div><b>{(projects || []).filter(p => p.status === 'delivered').length}</b><span>Delivered</span></div>
            <div><b>{(activity || []).filter(r => r.status === 'open' || r.status === 'in-progress').length}</b><span>Open chats</span></div>
          </div>
        </div>
        <button className="btn-danger" style={{ justifyContent: 'center', minHeight: 48 }} onClick={logout}><LogOut size={16} /> Logout</button>
      </div>
      {tabbar()}
    </div>
  );

  // ── INBOX ──
  const screenInbox = () => {
  const list = (activity || []).filter(r => {
    if (filter === 'unread' && !rowUnread(r, myType)) return false;
    if (filter === 'open' && !(r.status === 'open' || r.status === 'in-progress')) return false;
    if (filter === 'resolved' && !(r.status === 'resolved' || r.status === 'closed')) return false;
    return match(r.projectTitle, r.title, r.lastMessage, r.lastName);
  });
  return (
    <div className="wa-screen" style={{ background: bgBase }}>
      <div className="wa-head wa-home-head">
        <div className="wa-avatar" style={{ background: `linear-gradient(135deg, ${accent}, ${branding.accentSecondary || accent})`, color: '#fff', fontSize: '0.8rem' }}>
          {branding.logoText || initials(orgName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wa-title" style={{ fontSize: '1.1rem' }}>{orgName}</div>
          <div className="wa-sub" style={{ textTransform: 'none' }}>{totalUnread ? `${totalUnread} unread` : 'All caught up'}</div>
        </div>
      </div>
      {searchBox('Search chats')}
      {chips([['all', 'All'], ['unread', totalUnread ? `Unread (${totalUnread})` : 'Unread'], ['open', 'Open'], ['resolved', 'Resolved']])}
      <div className="wa-body">
        <NotifyButton accent={accent} />
        {activity === null && skeleton()}
        {activity && !list.length && (
          <div className="wa-blank">
            <div className="wa-blank-icon" style={{ background: accentLt, color: accent }}><MessageSquarePlus size={30} /></div>
            <h3>{activity.length ? 'No chats match' : 'No requests yet'}</h3>
            <p>{activity.length ? 'Try a different search or filter.' : 'Open a project and send your first request.'}</p>
            {!activity.length && <button className="btn-primary" style={{ background: accent, color: '#000' }} onClick={() => root('projects')}>Go to projects</button>}
          </div>
        )}
        {list.map(r => convRow(r, true))}
      </div>
      {tabbar()}
    </div>
  );
  };

  const DETAIL = { chat: screenChat, new: screenNew, note: screenNote, project: screenProject };
  const ROOT = { inbox: screenInbox, projects: screenProjects, more: screenMore };

  if (!desktop) return shell((DETAIL[nav.s] || ROOT[nav.s] || screenInbox)());

  // two-pane layout: side rail | list | conversation or project
  const rootFn = ROOT[rootTab] || screenInbox;
  const detailFn = DETAIL[nav.s];
  return shell(
    <div className="wa-desktop">
      <nav className="wa-rail">
        <div className="wa-rail-logo" style={{ background: `linear-gradient(135deg, ${accent}, ${branding.accentSecondary || accent})` }}>{branding.logoText || initials(orgName)}</div>
        {tabBarEl()}
        <div style={{ flex: 1 }} />
        <button className="wa-rail-out" onClick={logout} aria-label="Logout" title="Logout"><LogOut size={20} /></button>
      </nav>
      <section className="wa-left">{rootFn()}</section>
      <section className="wa-right">
        {detailFn ? detailFn() : (
          <div className="wa-placeholder">
            <div className="wa-blank-icon" style={{ background: accentLt, color: accent }}><MessageSquarePlus size={30} /></div>
            <h3>{orgName}</h3>
            <p>Select a conversation or project to get started.</p>
          </div>
        )}
      </section>
    </div>
  );
}
