'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Plus, LogOut, Link as LinkIcon, Lock, MoreVertical, Paperclip, Send, Trash2, X, FolderKanban, MessageSquarePlus } from 'lucide-react';
import ChatScreen from './mobile/ChatScreen';
import PreviewLock from './PreviewLock';
import { idOf, timeOf, listTime, unreadFor, statusColor, fileToDataUrl } from './mobile/shared';

const projIdOf = (rev) => String(rev.projectId?._id || rev.projectId || '');
const initials = (t) => (t || '?').trim().substring(0, 2).toUpperCase();
const docIcon = (type) => ({ quotation: '📄', invoice: '💰', contract: '📋', nda: '🔒' }[type?.toLowerCase()] || '📎');

// Phone experience for agencies: projects -> project -> request chat, like WhatsApp.
export default function AgencyMobileApp({ initialProjectId = null }) {
  const [session, setSession] = useState(null);
  const [projects, setProjects] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // navigation: home | project | chat | new | note
  const [nav, setNav] = useState({ s: initialProjectId ? 'project' : 'home', pid: initialProjectId, rid: null });
  const [tab, setTab] = useState('requests');
  const [detail, setDetail] = useState(null); // full project (documents)
  const [notes, setNotes] = useState([]);
  const [menu, setMenu] = useState(false);
  const sendingRef = useRef(false);

  // new request form
  const [nTitle, setNTitle] = useState('');
  const [nDesc, setNDesc] = useState('');
  const [nImg, setNImg] = useState(null);
  const [saving, setSaving] = useState(false);
  // note form
  const [noteLabel, setNoteLabel] = useState('');
  const [noteValue, setNoteValue] = useState('');

  const branding = session?.org?.branding || {};
  const accent = branding.accentColor || '#FF7035';
  const accentLt = /^#[0-9a-f]{6}$/i.test(accent) ? `${accent}22` : 'rgba(255,112,53,0.12)';
  const bgBase = '#0a0807';
  const myType = session?.type || 'agency';

  const loadAll = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([fetch('/api/projects'), fetch('/api/revisions')]);
      if (p.status === 401) { window.location.href = '/'; return; }
      if (p.ok) setProjects(await p.json());
      if (r.ok && !sendingRef.current) setRevisions(await r.json());
    } catch {} finally { setLoaded(true); }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then(r => (r.ok ? r.json() : null)).then(s => s && setSession(s)).catch(() => {});
    loadAll();
  }, [loadAll]);

  // keep lists fresh; the open chat polls just its own thread, faster
  useEffect(() => {
    if (nav.s === 'new' || nav.s === 'note') return;
    const t = setInterval(() => {
      if (document.hidden) return;
      if (nav.s === 'chat' && nav.rid) pollOne(nav.rid); else loadAll();
    }, nav.s === 'chat' ? 4000 : 10000);
    return () => clearInterval(t);
  }, [nav.s, nav.rid, loadAll]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pollOne(rid) {
    try {
      const res = await fetch(`/api/revisions/${rid}`);
      if (!res.ok || sendingRef.current) return;
      const upd = await res.json();
      setRevisions(prev => {
        const cur = prev.find(r => idOf(r) === rid);
        if (!cur) return prev;
        if ((upd.thread?.length || 0) === (cur.thread?.length || 0) && upd.status === cur.status) return prev;
        return prev.map(r => (idOf(r) === rid ? { ...cur, ...upd, projectId: cur.projectId } : r));
      });
    } catch {}
  }

  // project documents + notes when a project opens
  useEffect(() => {
    if (!nav.pid) return;
    setDetail(null); setNotes([]);
    fetch(`/api/projects/${nav.pid}`).then(r => (r.ok ? r.json() : null)).then(d => d && setDetail(d)).catch(() => {});
    fetch(`/api/notes?projectId=${nav.pid}`).then(r => (r.ok ? r.json() : [])).then(setNotes).catch(() => {});
  }, [nav.pid]);

  // phone back button / swipe-back
  useEffect(() => {
    history.replaceState({ anx: nav }, '');
    const onPop = (e) => { setNav(e.state?.anx || { s: 'home', pid: null, rid: null }); setMenu(false); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (next) => { history.pushState({ anx: next }, ''); setNav(next); setMenu(false); };
  const back = () => history.back();

  const project = projects.find(p => idOf(p) === nav.pid) || detail;
  const projRevs = revisions.filter(r => projIdOf(r) === String(nav.pid));
  const rev = nav.rid ? revisions.find(r => idOf(r) === nav.rid) : null;

  const lastOf = (r) => { const t = r.thread || []; return t[t.length - 1]; };
  const activity = (r) => { const l = lastOf(r); return (l ? timeOf(l) : new Date(r.createdAt)).getTime() || 0; };

  // ── actions ──
  async function send(msg, img) {
    const rid = idOf(rev);
    const optimistic = { authorType: myType, authorName: session?.org?.name || 'You', message: msg || 'Uploaded an image', imageUrl: img, timestamp: new Date().toISOString(), _optimistic: true };
    sendingRef.current = true;
    setRevisions(prev => prev.map(r => idOf(r) === rid ? { ...r, thread: [...(r.thread || []), optimistic] } : r));
    try {
      const res = await fetch(`/api/revisions/${rid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _addMessage: { message: msg || 'Uploaded an image', imageUrl: img } }),
      });
      if (!res.ok) throw new Error();
      const upd = await res.json();
      setRevisions(prev => prev.map(r => idOf(r) === rid ? { ...r, ...upd, projectId: r.projectId } : r));
      return true;
    } catch {
      setRevisions(prev => prev.map(r => idOf(r) === rid ? { ...r, thread: (r.thread || []).filter(m => !m._optimistic) } : r));
      alert('Message not sent. Please check your connection and try again.');
      return false;
    } finally { sendingRef.current = false; }
  }

  async function setStatus(status) {
    setMenu(false);
    const rid = idOf(rev);
    try {
      const res = await fetch(`/api/revisions/${rid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const upd = await res.json();
      setRevisions(prev => prev.map(r => idOf(r) === rid ? { ...r, ...upd, projectId: r.projectId } : r));
    } catch { alert('Failed to update status'); }
  }

  async function createRequest(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/revisions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: nav.pid, title: nTitle, message: nDesc, imageUrl: nImg || '' }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setRevisions(prev => [{ ...created, projectId: { _id: nav.pid, title: project?.title } }, ...prev]);
      setNTitle(''); setNDesc(''); setNImg(null);
      const next = { s: 'chat', pid: nav.pid, rid: idOf(created) };
      history.replaceState({ anx: next }, ''); // back from the chat returns to the project
      setNav(next);
    } catch { alert('Could not send your request. Please try again.'); } finally { setSaving(false); }
  }

  async function addNote(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: nav.pid, label: noteLabel, value: noteValue }),
      });
      if (!res.ok) throw new Error();
      setNotes(await res.json());
      setNoteLabel(''); setNoteValue('');
      back();
    } catch { alert('Failed to add note'); }
  }

  async function deleteNote(entryId) {
    if (!confirm('Delete this note?')) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: nav.pid, entryId }),
      });
      if (!res.ok) throw new Error();
      setNotes(await res.json());
    } catch { alert('Failed to delete note'); }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  function copyClientLink() {
    const code = project?.clientCode;
    if (!code) { alert('No client code for this project.'); return; }
    const url = `${window.location.origin}/?access=${btoa(code)}`;
    navigator.clipboard?.writeText(url).then(() => alert('Secure client login link copied!'), () => prompt('Copy this link:', url));
  }

  // ── screens ──
  if (nav.s === 'new') return (
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
        <button type="submit" disabled={saving} className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: accent, color: '#000', minHeight: 48 }}>
          {saving ? 'Sending…' : <><Send size={16} /> Send request</>}
        </button>
      </form>
    </div>
  );

  if (nav.s === 'note') return (
    <div className="wa-screen" style={{ background: bgBase }}>
      <div className="wa-head">
        <button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button>
        <div className="wa-title" style={{ flex: 1 }}>New note</div>
      </div>
      <form className="wa-body wa-form" onSubmit={addNote}>
        <input className="input" placeholder="Label (e.g. Server credentials)" value={noteLabel} onChange={e => setNoteLabel(e.target.value)} required autoFocus />
        <textarea className="textarea" placeholder="Value" value={noteValue} onChange={e => setNoteValue(e.target.value)} required style={{ minHeight: 140, fontFamily: 'monospace' }} />
        <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: accent, color: '#000', minHeight: 48 }}>Save note</button>
      </form>
    </div>
  );

  if (nav.s === 'chat' && rev) {
    const closed = rev.status === 'closed' || rev.status === 'resolved';
    return (
      <>
        <ChatScreen
          rev={rev} myType={myType} accent={accent} accentLt={accentLt} bgBase={bgBase}
          onBack={back} onSend={send}
          actions={!closed && <button className="btn-icon" onClick={() => setMenu(true)} aria-label="Actions"><MoreVertical size={20} /></button>}
          footerOverride={closed ? <div className="wa-closed"><span>This request is {rev.status}.</span></div> : null}
        />
        {menu && (
          <div className="wa-sheet-bg" onClick={() => setMenu(false)}>
            <div className="wa-sheet" onClick={e => e.stopPropagation()}>
              <div className="wa-sheet-title">Update request</div>
              {rev.status !== 'in-progress' && <button onClick={() => setStatus('in-progress')}>Mark in progress</button>}
              <button style={{ color: '#4ade80' }} onClick={() => setStatus('resolved')}>Mark as resolved</button>
              <button style={{ color: '#ef4444' }} onClick={() => setStatus('closed')}>Close request</button>
              <button onClick={() => setMenu(false)}>Cancel</button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── project screen ──
  if (nav.s === 'project' && project) {
    const sorted = [...projRevs].sort((a, b) => activity(b) - activity(a));
    const openCount = projRevs.filter(r => r.status === 'open' || r.status === 'in-progress').length;
    return (
      <div className="wa-screen" style={{ background: bgBase }}>
        <div className="wa-head">
          <button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button>
          <div className="wa-avatar" style={{ background: accentLt, color: accent, fontSize: '0.85rem' }}>{initials(project.title)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wa-title">{project.title}</div>
            <div className="wa-sub" style={{ color: statusColor(project.status?.toLowerCase(), accent) }}>{project.status}</div>
          </div>
          <button className="btn-icon" onClick={copyClientLink} aria-label="Copy client link"><LinkIcon size={19} /></button>
        </div>

        <div className="wa-tabs">
          {[['requests', `Requests${openCount ? ` (${openCount})` : ''}`], ['documents', 'Documents'], ['notes', 'Notes'], ['preview', 'Preview']].map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} style={tab === k ? { background: accent, color: '#000' } : undefined} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        <div className="wa-body">
          {tab === 'requests' && (
            <>
              {sorted.length === 0 && (
                <div className="wa-blank">
                  <div className="wa-blank-icon" style={{ background: accentLt, color: accent }}><MessageSquarePlus size={30} /></div>
                  <h3>No requests yet</h3>
                  <p>Need a change on this project? Send a request and we will get on it.</p>
                  <button className="btn-primary" style={{ background: accent, color: '#000' }} onClick={() => go({ s: 'new', pid: nav.pid, rid: null })}>Send first request</button>
                </div>
              )}
              {sorted.map(r => {
                const last = lastOf(r);
                const unread = unreadFor(r, myType);
                return (
                  <div key={idOf(r)} className="wa-row" onClick={() => go({ s: 'chat', pid: nav.pid, rid: idOf(r) })}>
                    <div className="wa-avatar" style={{ background: accentLt, color: accent }}>{(r.title || '?')[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="wa-row-top">
                        <span className="wa-title" style={unread ? { fontWeight: 700 } : undefined}>{r.title}</span>
                        <span className="wa-time" style={unread ? { color: accent } : undefined}>{listTime(new Date(activity(r)))}</span>
                      </div>
                      <div className="wa-row-top">
                        <span className="wa-preview">{last ? `${last.authorType === myType ? 'You: ' : ''}${last.message}` : (r.message || 'No messages')}</span>
                        {unread > 0
                          ? <span className="wa-badge" style={{ background: accent }}>{unread}</span>
                          : <span className="wa-status" style={{ color: statusColor(r.status, accent) }}>{r.status}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === 'documents' && (
            <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {!detail && <p className="wa-empty">Loading…</p>}
              {detail && !(detail.documents || []).length && <p className="wa-empty" style={{ marginTop: '2rem' }}>No documents yet. Ask your project manager to attach them.</p>}
              {(detail?.documents || []).map((d, i) => (
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

          {tab === 'notes' && (
            <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {!notes.length && <p className="wa-empty" style={{ marginTop: '2rem' }}>No private notes yet.</p>}
              {notes.map(n => (
                <div key={n._id || n.id} className="wa-note-card">
                  <div className="wa-note-top">
                    <span>{n.label}</span>
                    <button onClick={() => deleteNote(n._id || n.id)} aria-label="Delete note"><Trash2 size={16} /></button>
                  </div>
                  <pre>{n.value}</pre>
                </div>
              ))}
              <button className="btn-ghost" style={{ justifyContent: 'center', minHeight: 46 }} onClick={() => go({ s: 'note', pid: nav.pid, rid: null })}><Plus size={16} /> Add note</button>
            </div>
          )}

          {tab === 'preview' && (
            <div style={{ padding: '1rem' }}>
              <PreviewLock />
              {project.description && <p style={{ marginTop: '1rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{project.description}</p>}
              {project.deliveredOn && <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Delivered {project.deliveredOn}</p>}
            </div>
          )}
        </div>

        {tab === 'requests' && sorted.length > 0 && (
          <button className="wa-fab wa-fab-ext" style={{ background: accent }} onClick={() => go({ s: 'new', pid: nav.pid, rid: null })}>
            <Plus size={22} /> New request
          </button>
        )}
      </div>
    );
  }

  // ── home: projects as chat rows ──
  const rows = projects.map(p => {
    const pr = revisions.filter(r => projIdOf(r) === String(idOf(p)));
    const latest = [...pr].sort((a, b) => activity(b) - activity(a))[0];
    const last = latest && lastOf(latest);
    return { p, latest, last, unread: pr.reduce((n, r) => n + unreadFor(r, myType), 0), time: latest ? activity(latest) : 0 };
  }).sort((a, b) => b.time - a.time);

  const active = projects.filter(p => ['active', 'progress', 'in-review'].includes(p.status)).length;
  const delivered = projects.filter(p => p.status === 'delivered').length;
  const openReqs = revisions.filter(r => r.status === 'open' || r.status === 'in-progress').length;

  return (
    <div className="wa-screen wa-home" style={{ background: bgBase }}>
      <div className="wa-head wa-home-head">
        <div className="wa-avatar" style={{ background: `linear-gradient(135deg, ${accent}, ${branding.accentSecondary || accent})`, color: '#fff', fontSize: '0.8rem' }}>
          {branding.logoText || initials(session?.org?.name || 'W')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wa-title">{session?.org?.name || 'Workspace'}</div>
          <div className="wa-sub" style={{ textTransform: 'none' }}>Agency Portal</div>
        </div>
        <button className="btn-icon" onClick={logout} aria-label="Logout"><LogOut size={20} /></button>
      </div>

      <div className="wa-body">
        <div className="wa-chips">
          <span><b>{projects.length}</b> projects</span>
          <span><b>{active}</b> active</span>
          <span><b>{delivered}</b> delivered</span>
          <span style={openReqs ? { color: accent, borderColor: accent } : undefined}><b>{openReqs}</b> open requests</span>
        </div>

        {!loaded && <p className="wa-empty" style={{ marginTop: '3rem' }}>Loading…</p>}
        {loaded && !projects.length && (
          <div className="wa-blank">
            <div className="wa-blank-icon" style={{ background: accentLt, color: accent }}><FolderKanban size={30} /></div>
            <h3>No projects yet</h3>
            <p>Your projects will show up here once the team adds them.</p>
          </div>
        )}

        {rows.map(({ p, last, unread, time }) => (
          <div key={idOf(p)} className="wa-row" onClick={() => { setTab('requests'); go({ s: 'project', pid: idOf(p), rid: null }); }}>
            <div className="wa-avatar" style={{ background: accentLt, color: accent, fontSize: '0.9rem' }}>{initials(p.title)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="wa-row-top">
                <span className="wa-title" style={unread ? { fontWeight: 700 } : undefined}>{p.title}</span>
                <span className="wa-time" style={unread ? { color: accent } : undefined}>{time ? listTime(new Date(time)) : ''}</span>
              </div>
              <div className="wa-row-top">
                <span className="wa-preview">{last ? `${last.authorType === myType ? 'You: ' : ''}${last.message}` : (p.description || 'No requests yet')}</span>
                {unread > 0
                  ? <span className="wa-badge" style={{ background: accent }}>{unread}</span>
                  : <span className="wa-status" style={{ color: statusColor(p.status?.toLowerCase(), accent) }}>{p.status}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
