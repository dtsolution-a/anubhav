'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Plus, Search, MoreVertical, Inbox, FolderKanban, Building2, Settings, LogOut,
  Link as LinkIcon, Copy, Trash2, X, Shuffle, ChevronRight, ExternalLink, MessageSquarePlus,
} from 'lucide-react';
import ChatScreen from './mobile/ChatScreen';
import NotifyButton from './NotifyButton';
import { ownerUnread } from './AdminUnread';
import { idOf, listTime, statusColor, setAppBadge } from './mobile/shared';

const ACCENT = '#FF7035';
const ACCENT_LT = 'rgba(255,112,53,0.14)';
const BG = '#0a0807';

const initials = (t) => (t || '?').trim().substring(0, 2).toUpperCase();
const PROJECT_COLORS = { active: '#fbbf24', 'in-review': '#a78bfa', delivered: '#4ade80' };
const pColor = (s) => PROJECT_COLORS[s] || ACCENT;
const rand = (n) => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const refId = (v) => (v && typeof v === 'object' ? v._id || v.id : v) || '';

const EMPTY_PROJECT = { title: '', description: '', previewUrl: '', status: 'active', agencyId: '', clientCode: '', deliveredOn: '' };
const EMPTY_ORG = { name: '', code: '', type: 'client', logoText: '', accentColor: '#FF7035', accentSecondary: '#FF9F00', tagline: '' };

function Field({ label, children }) {
  return (
    <label className="wa-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

// Phone experience for the owner: Inbox / Projects / Clients / Settings, like WhatsApp.
export default function OwnerMobileApp({ layout = 'mobile' }) {
  const desktop = layout === 'desktop';
  const [rootTab, setRootTab] = useState('inbox');
  // ── navigation, driven by the URL the owner opened (also what notifications deep-link to) ──
  const initialNav = () => {
    const path = window.location.pathname;
    const q = new URLSearchParams(window.location.search);
    const m = path.match(/^\/admin\/projects\/([^/]+)/);
    if (m) return { s: q.get('rev') ? 'chat' : 'project', pid: m[1], rid: q.get('rev') || null, tab: 'inbox' };
    if (path.startsWith('/admin/projects')) return q.get('action') === 'new' ? { s: 'newproject' } : { s: 'projects' };
    if (path.startsWith('/admin/orgs')) return q.get('action') === 'new' ? { s: 'neworg' } : { s: 'orgs' };
    return { s: 'inbox' };
  };
  const [nav, setNav] = useState({ s: 'inbox' });
  const [ready, setReady] = useState(false);

  const [projects, setProjects] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [activity, setActivity] = useState(null);
  const [fulls, setFulls] = useState({}); // full revisions (with threads), by id
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [ptab, setPtab] = useState('chats');
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_PROJECT);
  const [orgForm, setOrgForm] = useState(EMPTY_ORG);
  const [docForm, setDocForm] = useState({ label: '', url: '', type: 'other' });
  const sendingRef = useRef(false);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // ── data ──
  const loadActivity = useCallback(async () => {
    try {
      const r = await fetch('/api/activity');
      if (r.status === 401) { window.location.href = '/'; return; }
      if (r.ok) setActivity(await r.json());
    } catch {}
  }, []);
  const loadProjects = useCallback(async () => {
    try { const r = await fetch('/api/projects'); if (r.ok) setProjects(await r.json()); } catch {}
  }, []);
  const loadOrgs = useCallback(async () => {
    try { const r = await fetch('/api/orgs'); if (r.ok) setOrgs(await r.json()); } catch {}
  }, []);

  useEffect(() => {
    const first = initialNav();
    setNav(first);
    history.replaceState({ anx: first }, '');
    setReady(true);
    loadActivity(); loadProjects(); loadOrgs();
    const onPop = (e) => { setNav(e.state?.anx || { s: 'inbox' }); setSheet(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the lists fresh (the open chat polls its own thread faster)
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden && nav.s !== 'chat') loadActivity(); }, 8000);
    return () => clearInterval(t);
  }, [nav.s, loadActivity]);

  const loadFull = useCallback(async (id) => {
    try {
      const r = await fetch(`/api/revisions/${id}`);
      if (!r.ok) return null;
      const rev = await r.json();
      setFulls(prev => {
        const cur = prev[id];
        if (cur && sendingRef.current) return prev;
        if (cur && (cur.thread?.length || 0) === (rev.thread?.length || 0) && cur.status === rev.status) return prev;
        return { ...prev, [id]: rev };
      });
      return rev;
    } catch { return null; }
  }, []);

  useEffect(() => {
    if (nav.s !== 'chat' || !nav.rid) return;
    loadFull(nav.rid);
    const t = setInterval(() => { if (!document.hidden) loadFull(nav.rid); }, 4000);
    return () => clearInterval(t);
  }, [nav.s, nav.rid, loadFull]);

  const totalUnread = (activity || []).reduce((n, r) => n + ownerUnread(r), 0);
  useEffect(() => { setAppBadge(totalUnread); }, [totalUnread, nav]);

  // ── navigation helpers ──
  const push = (next) => { history.pushState({ anx: next }, ''); setNav(next); setSheet(null); setQ(''); };
  const root = (s) => { const next = { s }; history.replaceState({ anx: next }, ''); setNav(next); setRootTab(s); setQ(''); setFilter('all'); };
  useEffect(() => { if (['inbox', 'projects', 'orgs', 'more'].includes(nav.s)) setRootTab(nav.s); }, [nav.s]);

  // unread count in the browser tab title
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '');
    document.title = totalUnread > 0 ? `(${totalUnread}) ${base}` : base;
    return () => { document.title = base; };
  }, [totalUnread]);
  const back = () => history.back();

  const project = projects.find(p => idOf(p) === nav.pid);
  const org = orgs.find(o => idOf(o) === nav.oid);
  const projRows = (activity || []).filter(r => r.projectId === String(nav.pid));
  const openCount = (pid) => (activity || []).filter(r => r.projectId === String(pid) && (r.status === 'open' || r.status === 'in-progress')).length;
  const agencies = orgs.filter(o => o.type === 'agency');

  const sub = (r) => `${r.lastType === 'owner' ? 'You: ' : r.lastName ? r.lastName + ': ' : ''}${r.lastHasImage && !r.lastMessage ? '📷 Photo' : r.lastMessage}`;
  const match = (...vals) => !q.trim() || vals.some(v => (v || '').toLowerCase().includes(q.trim().toLowerCase()));

  // ── actions ──
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  async function send(msg, img) {
    const id = nav.rid;
    const optimistic = { authorType: 'owner', authorName: 'DT Solution', message: msg || 'Uploaded an image', imageUrl: img, timestamp: new Date().toISOString(), _optimistic: true };
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
    setSheet(null);
    const id = nav.rid;
    try {
      const r = await fetch(`/api/revisions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!r.ok) throw new Error();
      const upd = await r.json();
      setFulls(p => ({ ...p, [id]: { ...p[id], ...upd } }));
      loadActivity(); flash(`Marked as ${status}`);
    } catch { flash('Update failed'); }
  }

  async function deleteRev() {
    setSheet(null);
    if (!confirm('Permanently delete this conversation?')) return;
    try {
      const r = await fetch(`/api/revisions/${nav.rid}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      loadActivity(); back(); flash('Conversation deleted');
    } catch { flash('Delete failed'); }
  }

  const projectBody = () => ({
    title: form.title, description: form.description, previewUrl: form.previewUrl, status: form.status,
    agencyId: form.agencyId || null, clientCode: form.clientCode ? form.clientCode.trim().toUpperCase() : null,
    deliveredOn: form.deliveredOn || null,
  });

  async function saveProject(e, creating) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const r = await fetch(creating ? '/api/projects' : `/api/projects/${nav.pid}`, {
        method: creating ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectBody()),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      await loadProjects();
      flash(creating ? 'Project created' : 'Saved');
      if (creating) {
        const created = data.project || data;
        const next = { s: 'project', pid: idOf(created) };
        history.replaceState({ anx: next }, ''); setNav(next); setPtab('details');
      }
    } catch { flash('Could not save'); } finally { setSaving(false); }
  }

  async function deleteProject() {
    if (!confirm(`Delete "${project?.title}"? This cannot be undone.`)) return;
    try {
      const r = await fetch(`/api/projects/${nav.pid}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      await loadProjects(); back(); flash('Project deleted');
    } catch { flash('Delete failed'); }
  }

  async function docAction(body) {
    try {
      const r = await fetch(`/api/projects/${nav.pid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      await loadProjects();
      return true;
    } catch { flash('Action failed'); return false; }
  }

  async function addDoc(e) {
    e.preventDefault();
    if (await docAction({ _addDocument: docForm })) { setDocForm({ label: '', url: '', type: 'other' }); flash('Document added'); }
  }

  async function saveOrg(e, creating) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const body = {
        name: orgForm.name, code: orgForm.code.trim().toUpperCase(), type: orgForm.type,
        branding: { ...(org?.branding || {}), logoText: orgForm.logoText, accentColor: orgForm.accentColor, accentSecondary: orgForm.accentSecondary, tagline: orgForm.tagline },
      };
      const r = await fetch(creating ? '/api/orgs' : `/api/orgs/${nav.oid}`, { method: creating ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 409) { flash('That code already exists'); return; }
      if (!r.ok) throw new Error();
      await loadOrgs(); flash(creating ? 'Created' : 'Saved'); back();
    } catch { flash('Could not save'); } finally { setSaving(false); }
  }

  async function deleteOrg() {
    if (!confirm(`Delete "${org?.name}"?`)) return;
    try {
      const r = await fetch(`/api/orgs/${nav.oid}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      await loadOrgs(); back(); flash('Deleted');
    } catch { flash('Delete failed'); }
  }

  const copy = (text, okMsg) =>
    navigator.clipboard?.writeText(text).then(() => flash(okMsg), () => prompt('Copy this:', text));
  const clientLink = (code) => `${window.location.origin}/?access=${btoa(code)}`;

  // ── shared chrome ──
  const toastNode = () => toast ? <div className="wa-toast">{toast}</div> : null;
  const toastEl = () => (desktop ? null : toastNode());
  const tabBarEl = () => (
    <div className="wa-tabbar">
      {[['inbox', 'Inbox', Inbox, totalUnread], ['projects', 'Projects', FolderKanban, 0], ['orgs', 'Clients', Building2, 0], ['more', 'Settings', Settings, 0]].map(([k, label, Icon, badge]) => (
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
        <button key={k} className={filter === k ? 'on' : ''} style={filter === k ? { background: ACCENT, color: '#000' } : undefined} onClick={() => setFilter(k)}>{label}</button>
      ))}
    </div>
  );

  if (!ready) return null;

  // ── CHAT ──
  const screenChat = () => {
    const rev = fulls[nav.rid];
    if (!rev) return (
      <div className="wa-screen" style={{ background: BG }}>
        <div className="wa-head"><button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button><div className="wa-title">Loading…</div></div>
        <div className="wa-body"><p className="wa-empty" style={{ marginTop: '3rem' }}>Opening conversation…</p></div>
      </div>
    );
    const row = (activity || []).find(r => r.id === nav.rid);
    return (
      <>
        <ChatScreen
          rev={{ ...rev, title: `${row?.projectTitle ? row.projectTitle + ' · ' : ''}${rev.title}` }}
          myType="owner" accent={ACCENT} accentLt={ACCENT_LT} bgBase={BG}
          onBack={back} onSend={send}
          actions={<button className="btn-icon" onClick={() => setSheet('chat')} aria-label="Actions"><MoreVertical size={20} /></button>}
        />
        {sheet === 'chat' && (
          <div className="wa-sheet-bg" onClick={() => setSheet(null)}>
            <div className="wa-sheet" onClick={e => e.stopPropagation()}>
              <div className="wa-sheet-title">Conversation</div>
              {rev.status !== 'in-progress' && <button onClick={() => setStatus('in-progress')}>Mark in progress</button>}
              {rev.status !== 'resolved' && <button style={{ color: '#4ade80' }} onClick={() => setStatus('resolved')}>Mark as resolved</button>}
              {rev.status !== 'closed' && <button onClick={() => setStatus('closed')}>Close</button>}
              {(rev.status === 'resolved' || rev.status === 'closed') && <button onClick={() => setStatus('open')}>Reopen</button>}
              {row?.projectId && <button onClick={() => { const pid = row.projectId; setSheet(null); push({ s: 'project', pid }); setPtab('chats'); }}>Open project</button>}
              <button style={{ color: '#ef4444' }} onClick={deleteRev}>Delete conversation</button>
              <button onClick={() => setSheet(null)}>Cancel</button>
            </div>
          </div>
        )}
        {toastEl()}
      </>
    );
  }

  // ── PROJECT FORMS / DETAIL ──
  const projectForm = (creating) => (
    <form className="wa-body wa-form" onSubmit={(e) => saveProject(e, creating)}>
      <Field label="Title"><input className="input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="Description"><textarea className="textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
      <Field label="Preview URL"><input className="input" type="url" inputMode="url" placeholder="https://" value={form.previewUrl} onChange={e => setForm({ ...form, previewUrl: e.target.value })} /></Field>
      <div className="wa-two">
        <Field label="Status">
          <select className="select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option><option value="in-review">In review</option><option value="delivered">Delivered</option>
          </select>
        </Field>
        <Field label="Agency">
          <select className="select" value={form.agencyId} onChange={e => setForm({ ...form, agencyId: e.target.value })}>
            <option value="">None</option>
            {agencies.map(a => <option key={idOf(a)} value={idOf(a)}>{a.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Client code">
        <div className="wa-inline">
          <input className="input" autoCapitalize="characters" value={form.clientCode} onChange={e => setForm({ ...form, clientCode: e.target.value.toUpperCase() })} />
          <button type="button" className="btn-ghost" onClick={() => setForm({ ...form, clientCode: `CL${rand(6)}` })} aria-label="Generate"><Shuffle size={16} /></button>
        </div>
      </Field>
      <Field label="Delivered on"><input className="input" placeholder="e.g. March 2025" value={form.deliveredOn} onChange={e => setForm({ ...form, deliveredOn: e.target.value })} /></Field>
      <button type="submit" disabled={saving} className="btn-primary wa-submit" style={{ background: ACCENT, color: '#000' }}>{saving ? 'Saving…' : creating ? 'Create project' : 'Save changes'}</button>
    </form>
  );

  const screenNewProject = () => (
    <div className="wa-screen" style={{ background: BG }}>
      <div className="wa-head"><button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button><div className="wa-title" style={{ flex: 1 }}>New project</div></div>
      {projectForm(true)}
      {toastEl()}
    </div>
  );

  const screenProject = () => {
    if (!project) return null;
    const docs = project.documents || [];
    return (
      <div className="wa-screen" style={{ background: BG }}>
        <div className="wa-head">
          <button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button>
          <div className="wa-avatar" style={{ background: ACCENT_LT, color: ACCENT, fontSize: '0.85rem' }}>{initials(project.title)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wa-title">{project.title}</div>
            <div className="wa-sub" style={{ color: pColor(project.status) }}>{project.status}</div>
          </div>
          {project.previewUrl && <a className="btn-icon" href={project.previewUrl} target="_blank" rel="noreferrer" aria-label="Open preview" title="Open preview"><ExternalLink size={19} /></a>}
          {project.clientCode && <button className="btn-icon" onClick={() => copy(clientLink(project.clientCode), 'Client link copied')} aria-label="Copy client link"><LinkIcon size={19} /></button>}
        </div>
        <div className="wa-tabs">
          {[['chats', `Chats${projRows.length ? ` (${projRows.length})` : ''}`], ['details', 'Details'], ['docs', `Docs${docs.length ? ` (${docs.length})` : ''}`]].map(([k, label]) => (
            <button key={k} className={ptab === k ? 'on' : ''} style={ptab === k ? { background: ACCENT, color: '#000' } : undefined}
              onClick={() => { setPtab(k); if (k === 'details') setForm({ ...EMPTY_PROJECT, ...project, agencyId: refId(project.agencyId), clientCode: project.clientCode || '', deliveredOn: project.deliveredOn || '', description: project.description || '', previewUrl: project.previewUrl || '' }); }}>{label}</button>
          ))}
        </div>

        {ptab === 'chats' && (
          <div className="wa-body">
            {!projRows.length && <p className="wa-empty" style={{ marginTop: '3rem' }}>No conversations for this project yet.</p>}
            {projRows.map(r => <ConvRow key={r.id} r={r} sub={sub(r)} onClick={() => push({ s: 'chat', rid: r.id, pid: nav.pid })} />)}
          </div>
        )}

        {ptab === 'details' && (
          <>
            {projectForm(false)}
          </>
        )}

        {ptab === 'docs' && (
          <div className="wa-body wa-form">
            {!docs.length && <p className="wa-empty">No documents yet.</p>}
            {docs.map(d => (
              <div key={idOf(d)} className="doc-item">
                <div className="doc-icon" style={{ background: ACCENT_LT, fontSize: '1.2rem' }}>{({ quotation: '📄', invoice: '💰', contract: '📋', nda: '🔒' })[d.type] || '📎'}</div>
                <a href={d.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0 }}>
                  <div className="doc-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
                  <div className="doc-type">{d.type}</div>
                </a>
                <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => confirm('Remove this document?') && docAction({ _removeDocumentId: idOf(d) })} aria-label="Remove"><Trash2 size={17} /></button>
              </div>
            ))}
            <form onSubmit={addDoc} className="wa-card">
              <div className="wa-card-title">Add document</div>
              <Field label="Label"><input className="input" required value={docForm.label} onChange={e => setDocForm({ ...docForm, label: e.target.value })} /></Field>
              <Field label="Link (URL)"><input className="input" type="url" inputMode="url" required placeholder="https://" value={docForm.url} onChange={e => setDocForm({ ...docForm, url: e.target.value })} /></Field>
              <Field label="Type">
                <select className="select" value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value })}>
                  <option value="quotation">Quotation</option><option value="invoice">Invoice</option><option value="contract">Contract</option>
                  <option value="nda">NDA</option><option value="proposal">Proposal</option><option value="other">Other</option>
                </select>
              </Field>
              <button type="submit" className="btn-primary wa-submit" style={{ background: ACCENT, color: '#000' }}>Add</button>
            </form>
          </div>
        )}

        {ptab === 'details' && (
          <div className="wa-footer" style={{ display: 'flex', gap: '0.6rem' }}>
            {project.clientCode && <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => copy(project.clientCode, 'Code copied')}><Copy size={15} /> Copy code</button>}
            <button className="btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={deleteProject}><Trash2 size={15} /> Delete</button>
          </div>
        )}
        {toastEl()}
      </div>
    );
  }

  // ── ORG FORM ──
  const screenOrg = () => {
    const creating = nav.s === 'neworg';
    return (
      <div className="wa-screen" style={{ background: BG }}>
        <div className="wa-head"><button className="btn-icon" onClick={back} aria-label="Back"><ArrowLeft size={22} /></button><div className="wa-title" style={{ flex: 1 }}>{creating ? 'New organization' : org?.name}</div></div>
        <form className="wa-body wa-form" onSubmit={(e) => saveOrg(e, creating)}>
          <Field label="Name"><input className="input" required value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} /></Field>
          <div className="wa-two">
            <Field label="Type">
              <select className="select" value={orgForm.type} onChange={e => setOrgForm({ ...orgForm, type: e.target.value })}>
                <option value="client">Client</option><option value="agency">Agency</option>
              </select>
            </Field>
            <Field label="Logo text"><input className="input" maxLength={4} placeholder="e.g. MT" value={orgForm.logoText} onChange={e => setOrgForm({ ...orgForm, logoText: e.target.value })} /></Field>
          </div>
          <Field label="Login code">
            <div className="wa-inline">
              <input className="input" required autoCapitalize="characters" maxLength={12} value={orgForm.code} onChange={e => setOrgForm({ ...orgForm, code: e.target.value.toUpperCase() })} />
              <button type="button" className="btn-ghost" onClick={() => setOrgForm({ ...orgForm, code: `${orgForm.type === 'agency' ? 'AG' : 'CL'}${rand(6)}` })} aria-label="Generate"><Shuffle size={16} /></button>
            </div>
          </Field>
          <div className="wa-two">
            <Field label="Accent"><input type="color" className="wa-color" value={orgForm.accentColor} onChange={e => setOrgForm({ ...orgForm, accentColor: e.target.value })} /></Field>
            <Field label="Secondary"><input type="color" className="wa-color" value={orgForm.accentSecondary} onChange={e => setOrgForm({ ...orgForm, accentSecondary: e.target.value })} /></Field>
          </div>
          <Field label="Tagline"><input className="input" value={orgForm.tagline} onChange={e => setOrgForm({ ...orgForm, tagline: e.target.value })} /></Field>
          <button type="submit" disabled={saving} className="btn-primary wa-submit" style={{ background: ACCENT, color: '#000' }}>{saving ? 'Saving…' : creating ? 'Create' : 'Save changes'}</button>
          {!creating && (
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => copy(org.code, 'Code copied')}><Copy size={15} /> Copy code</button>
              <button type="button" className="btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={deleteOrg}><Trash2 size={15} /> Delete</button>
            </div>
          )}
        </form>
        {toastEl()}
      </div>
    );
  }

  // ── ROOT TABS ──
  const screenProjects = () => {
    const list = projects.filter(p => (filter === 'all' || p.status === filter) && match(p.title, p.clientCode, p.agencyId?.name, p.clientOrgId?.name));
    return (
      <div className="wa-screen" style={{ background: BG }}>
        <div className="wa-head wa-home-head">
          <div className="wa-title" style={{ flex: 1, fontSize: '1.25rem' }}>Projects</div>
          <button className="btn-icon wa-add" style={{ background: ACCENT, color: '#000' }} onClick={() => { setForm(EMPTY_PROJECT); push({ s: 'newproject' }); }} aria-label="New project"><Plus size={22} /></button>
        </div>
        {searchBox("Search projects, codes, agencies")}
        {chips([['all', 'All'], ['active', 'Active'], ['in-review', 'In review'], ['delivered', 'Delivered']])}
        <div className="wa-body">
          {!list.length && <p className="wa-empty" style={{ marginTop: '3rem' }}>{projects.length ? 'No projects match.' : 'No projects yet. Tap + to add one.'}</p>}
          {list.map(p => {
            const oc = openCount(idOf(p));
            return (
              <div key={idOf(p)} className="wa-row" onClick={() => { setPtab('chats'); push({ s: 'project', pid: idOf(p) }); }}>
                <div className="wa-avatar" style={{ background: ACCENT_LT, color: ACCENT, fontSize: '0.9rem' }}>{initials(p.title)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="wa-row-top">
                    <span className="wa-title">{p.title}</span>
                    <span className="wa-status" style={{ color: pColor(p.status) }}>{p.status}</span>
                  </div>
                  <div className="wa-row-top">
                    <span className="wa-preview">{[p.agencyId?.name, p.clientCode].filter(Boolean).join(' · ') || 'No agency yet'}</span>
                    {oc > 0 && <span className="wa-badge" style={{ background: ACCENT }}>{oc}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {tabbar()}{toastEl()}
      </div>
    );
  }

  const screenOrgs = () => {
    const list = orgs.filter(o => o.type !== 'owner' && (filter === 'all' || o.type === filter) && match(o.name, o.code));
    return (
      <div className="wa-screen" style={{ background: BG }}>
        <div className="wa-head wa-home-head">
          <div className="wa-title" style={{ flex: 1, fontSize: '1.25rem' }}>Clients & Agencies</div>
          <button className="btn-icon wa-add" style={{ background: ACCENT, color: '#000' }} onClick={() => { setOrgForm(EMPTY_ORG); push({ s: 'neworg' }); }} aria-label="New organization"><Plus size={22} /></button>
        </div>
        {searchBox("Search name or code")}
        {chips([['all', 'All'], ['agency', 'Agencies'], ['client', 'Clients']])}
        <div className="wa-body">
          {!list.length && <p className="wa-empty" style={{ marginTop: '3rem' }}>Nothing here yet.</p>}
          {list.map(o => (
            <div key={idOf(o)} className="wa-row" onClick={() => {
              setOrgForm({ name: o.name || '', code: o.code || '', type: o.type, logoText: o.branding?.logoText || '', accentColor: o.branding?.accentColor || '#FF7035', accentSecondary: o.branding?.accentSecondary || '#FF9F00', tagline: o.branding?.tagline || '' });
              push({ s: 'org', oid: idOf(o) });
            }}>
              <div className="wa-avatar" style={{ background: `${o.branding?.accentColor || ACCENT}33`, color: o.branding?.accentColor || ACCENT, fontSize: '0.85rem' }}>{o.branding?.logoText || initials(o.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="wa-row-top"><span className="wa-title">{o.name}</span><span className="wa-status" style={{ color: o.type === 'agency' ? '#a78bfa' : '#38bdf8' }}>{o.type}</span></div>
                <div className="wa-row-top"><span className="wa-preview" style={{ fontFamily: 'monospace', letterSpacing: '0.06em' }}>{o.code}</span><ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /></div>
              </div>
            </div>
          ))}
        </div>
        {tabbar()}{toastEl()}
      </div>
    );
  }

  const screenMore = () => (
    <div className="wa-screen" style={{ background: BG }}>
      <div className="wa-head wa-home-head"><div className="wa-title" style={{ fontSize: '1.25rem' }}>Settings</div></div>
      <div className="wa-body wa-form">
        <div className="wa-card">
          <div className="wa-card-title">Notifications</div>
          <p className="wa-hint" style={{ marginBottom: '0.75rem' }}>Get an alert on this phone the moment a client or agency writes.</p>
          <NotifyButton variant="button" accent={ACCENT} />
        </div>
        <div className="wa-card">
          <div className="wa-card-title">At a glance</div>
          <div className="wa-stats">
            <div><b>{projects.length}</b><span>Projects</span></div>
            <div><b>{orgs.filter(o => o.type === 'agency').length}</b><span>Agencies</span></div>
            <div><b>{orgs.filter(o => o.type === 'client').length}</b><span>Clients</span></div>
            <div><b>{(activity || []).filter(r => r.status === 'open' || r.status === 'in-progress').length}</b><span>Open chats</span></div>
          </div>
        </div>
        <button className="btn-danger" style={{ justifyContent: 'center', minHeight: 48 }} onClick={logout}><LogOut size={16} /> Logout</button>
      </div>
      {tabbar()}{toastEl()}
    </div>
  );

  // inbox
  const screenInbox = () => {
  const list = (activity || []).filter(r => {
    if (filter === 'unread' && !ownerUnread(r)) return false;
    if (filter === 'open' && !(r.status === 'open' || r.status === 'in-progress')) return false;
    if (filter === 'resolved' && !(r.status === 'resolved' || r.status === 'closed')) return false;
    return match(r.projectTitle, r.title, r.lastMessage, r.lastName);
  });
  return (
    <div className="wa-screen" style={{ background: BG }}>
      <div className="wa-head wa-home-head">
        <div className="wa-avatar" style={{ background: 'linear-gradient(135deg,#FF7035,#FF9F00)', color: '#000', fontSize: '0.8rem' }}>DT</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wa-title" style={{ fontSize: '1.15rem' }}>Inbox</div>
          <div className="wa-sub" style={{ textTransform: 'none' }}>{totalUnread ? `${totalUnread} unread` : 'All caught up'}</div>
        </div>
      </div>
      {searchBox("Search chats")}
      {chips([['all', 'All'], ['unread', totalUnread ? `Unread (${totalUnread})` : 'Unread'], ['open', 'Open'], ['resolved', 'Resolved']])}
      <div className="wa-body">
        <NotifyButton accent={ACCENT} />
        {activity === null && <p className="wa-empty" style={{ marginTop: '3rem' }}>Loading…</p>}
        {activity && !list.length && <p className="wa-empty" style={{ marginTop: '3rem' }}>{activity.length ? 'No chats match.' : 'No conversations yet.'}</p>}
        {list.map(r => <ConvRow key={r.id} r={r} showProject sub={sub(r)} onClick={() => push({ s: 'chat', rid: r.id, pid: r.projectId })} />)}
      </div>
      {tabbar()}{toastEl()}
    </div>
  );
  };

  const DETAIL = { chat: screenChat, newproject: screenNewProject, project: screenProject, org: screenOrg, neworg: screenOrg };
  const ROOT = { inbox: screenInbox, projects: screenProjects, orgs: screenOrgs, more: screenMore };

  if (!desktop) return (DETAIL[nav.s] || ROOT[nav.s] || screenInbox)();

  // two-pane layout: side rail | list | conversation, project or form
  const rootFn = ROOT[rootTab] || screenInbox;
  const detailFn = DETAIL[nav.s];
  return (
    <div className="wa-desktop">
      <nav className="wa-rail">
        <div className="wa-rail-logo" style={{ background: 'linear-gradient(135deg,#FF7035,#FF9F00)', color: '#000' }}>DT</div>
        {tabBarEl()}
        <div style={{ flex: 1 }} />
        <button className="wa-rail-out" onClick={logout} aria-label="Logout" title="Logout"><LogOut size={20} /></button>
      </nav>
      <section className="wa-left">{rootFn()}</section>
      <section className="wa-right">
        {detailFn ? detailFn() : (
          <div className="wa-placeholder">
            <div className="wa-blank-icon" style={{ background: ACCENT_LT, color: ACCENT }}><MessageSquarePlus size={30} /></div>
            <h3>DT Solution</h3>
            <p>Select a conversation, project or client to get started.</p>
          </div>
        )}
      </section>
      {toastNode()}
    </div>
  );
}

function ConvRow({ r, sub, onClick, showProject }) {
  const unread = ownerUnread(r);
  const when = new Date(r.lastAt);
  return (
    <div className="wa-row" onClick={onClick}>
      <div className="wa-avatar" style={{ background: ACCENT_LT, color: ACCENT }}>{((showProject ? r.projectTitle : r.title) || '?')[0].toUpperCase()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="wa-row-top">
          <span className="wa-title" style={unread ? { fontWeight: 700 } : undefined}>
            {showProject ? r.projectTitle : r.title}
            {showProject && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {r.title}</span>}
          </span>
          <span className="wa-time" style={unread ? { color: ACCENT } : undefined}>{listTime(when)}</span>
        </div>
        <div className="wa-row-top">
          <span className="wa-preview">{sub}</span>
          {unread > 0
            ? <span className="wa-badge" style={{ background: ACCENT }}>{unread}</span>
            : <span className="wa-status" style={{ color: statusColor(r.status, ACCENT) }}>{r.status}</span>}
        </div>
      </div>
    </div>
  );
}
