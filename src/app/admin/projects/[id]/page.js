'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Paperclip } from 'lucide-react';

// ── Shared Admin Sidebar ────────────────────────────────────────────────────
function AdminSidebar({ active, onLogout }) {
  const navItems = [
    { href: '/admin',          label: 'Dashboard',     icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { href: '/admin/projects', label: 'Projects',      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
    { href: '/admin/orgs',     label: 'Organizations', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark" style={{ background: 'linear-gradient(135deg,#FF7035,#FF9F00)', color: '#000', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>DT</div>
        <div>
          <div className="sidebar-brand-name">DT Solution</div>
          <div className="sidebar-brand-sub">Owner Portal</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className={`sidebar-nav-item ${active === item.label ? 'active' : ''}`}>
            {item.icon}{item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-footer">
        <div style={{ fontFamily: 'Noto Sans Devanagari', fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>अनुभवः</div>
        <button onClick={onLogout} className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

// ── Author colour by role ───────────────────────────────────────────────────
const authorColor = (type) => {
  if (type === 'owner')  return '#FF7035';
  if (type === 'client') return '#4facfe';
  return '#a8ff78'; // agency
};

// ── Role display label (no "owner" label shown) ─────────────────────────────
const roleLabel = (type) => {
  if (type === 'owner')  return 'You';
  if (type === 'client') return 'Client';
  return 'Agency';
};

export default function AdminProjectDetails({ params }) {
  const router = useRouter();
  const { id } = params;

  const [project,   setProject]   = useState(null);
  const [orgs,      setOrgs]      = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('details');
  const [toast,     setToast]     = useState(null);

  const [formData,     setFormData]     = useState({});
  const [docForm,      setDocForm]      = useState({ label: '', url: '', type: 'other' });
  const [replyMsg,     setReplyMsg]     = useState({});
  const [replyImgs,    setReplyImgs]    = useState({});
  const [expandedRev,  setExpandedRev]  = useState(null);
  const [sendingReply, setSendingReply] = useState(false);

  const chatEndRefs = useRef({});

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [projRes, orgRes, revRes] = await Promise.all([
        fetch(`/api/projects/${id}`).catch(() => null),
        fetch('/api/orgs').catch(() => null),
        fetch(`/api/revisions?projectId=${id}`).catch(() => null),
      ]);
      const p = projRes ? await projRes.json() : null;
      if (p) { setProject(p); setFormData(p); }
      setOrgs(orgRes   ? await orgRes.json()  : []);
      setRevisions(revRes ? await revRes.json() : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Polling: silently fetch open revision every 4s ─────────────────────────
  const pollRevision = useCallback(async (revId) => {
    try {
      const res = await fetch(`/api/revisions/${revId}`);
      if (!res.ok) return;
      const updated = await res.json();
      setRevisions(prev => {
        const existing = prev.find(r => (r._id || r.id) === revId);
        if (!existing) return prev;
        if (
          (updated.thread?.length || 0) !== (existing.thread?.length || 0) ||
          updated.status !== existing.status
        ) {
          return prev.map(r => (r._id || r.id) === revId ? updated : r);
        }
        return prev;
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!expandedRev) return;
    pollRevision(expandedRev);
    const interval = setInterval(() => pollRevision(expandedRev), 4000);
    return () => clearInterval(interval);
  }, [expandedRev, pollRevision]);

  // Auto-scroll chat
  useEffect(() => {
    if (expandedRev && chatEndRefs.current[expandedRev]) {
      chatEndRefs.current[expandedRev].scrollIntoView({ behavior: 'smooth' });
    }
  }, [expandedRev, revisions]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Project save ────────────────────────────────────────────────────────────
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formData.title, description: formData.description, previewUrl: formData.previewUrl, status: formData.status, agencyId: formData.agencyId, clientCode: formData.clientCode, deliveredOn: formData.deliveredOn }),
      });
      if (!res.ok) throw new Error();
      showToast('Project updated successfully');
      fetchData();
    } catch { showToast('Update failed', 'error'); }
  };

  // ── Documents ───────────────────────────────────────────────────────────────
  const handleAddDocument = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _addDocument: docForm }) });
      if (!res.ok) throw new Error();
      showToast('Document added');
      setDocForm({ label: '', url: '', type: 'other' });
      fetchData();
    } catch { showToast('Add document failed', 'error'); }
  };

  const handleRemoveDocument = async (docId) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _removeDocumentId: docId }) });
      if (!res.ok) throw new Error();
      showToast('Document removed');
      fetchData();
    } catch { showToast('Remove failed', 'error'); }
  };

  // ── Revisions ───────────────────────────────────────────────────────────────
  const handleRevisionStatus = async (revId, status) => {
    try {
      const res = await fetch(`/api/revisions/${revId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setRevisions(prev => prev.map(r => (r.id || r._id) === revId ? updated : r));
      showToast(`Marked as ${status}`);
    } catch { showToast('Update failed', 'error'); }
  };

  const handleDeleteRevision = async (revId) => {
    if (!confirm('Are you sure you want to permanently delete this revision?')) return;
    try {
      const res = await fetch(`/api/revisions/${revId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setRevisions(prev => prev.filter(r => (r._id || r.id) !== revId));
      if (expandedRev === revId) setExpandedRev(null);
    } catch {
      alert('Failed to delete revision');
    }
  };

  const handlePaste = (e, revId) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onloadend = () => setReplyImgs(prev => ({ ...prev, [revId]: reader.result }));
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const handleReplyRevision = async (revId) => {
    const msg = replyMsg[revId]?.trim();
    const img = replyImgs[revId];
    if ((!msg && !img) || sendingReply) return;

    // Optimistic update
    const optimistic = { _optimistic: true, authorType: 'owner', authorName: 'DT Solution', message: msg || 'Uploaded an image', imageUrl: img, timestamp: new Date().toISOString() };
    setRevisions(prev => prev.map(r => {
      if ((r._id || r.id) !== revId) return r;
      return { ...r, thread: [...(r.thread || []), optimistic] };
    }));
    setReplyMsg(prev => ({ ...prev, [revId]: '' }));
    setReplyImgs(prev => ({ ...prev, [revId]: null }));
    setSendingReply(true);

    try {
      const res = await fetch(`/api/revisions/${revId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _addMessage: { message: msg || 'Uploaded an image', imageUrl: img } }) });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setRevisions(prev => prev.map(r => (r.id || r._id) === revId ? updated : r));
      showToast('Reply sent');
    } catch {
      setRevisions(prev => prev.map(r => {
        if ((r._id || r.id) !== revId) return r;
        return { ...r, thread: (r.thread || []).filter(m => !m._optimistic) };
      }));
      setReplyMsg(prev => ({ ...prev, [revId]: msg }));
      showToast('Failed to reply', 'error');
    } finally { setSendingReply(false); }
  };

  const handleReplyKeyDown = (e, revId) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReplyRevision(revId); }
  };

  const getDocIcon = (type) => ({ quotation: '📄', invoice: '💰', contract: '📋', nda: '🔒' }[type] || '📎');

  if (loading) return (
    <div className="sidebar-layout">
      <div className="bg-grid" />
      <AdminSidebar active="Projects" onLogout={handleLogout} />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </main>
    </div>
  );

  if (!project) return (
    <div className="sidebar-layout">
      <div className="bg-grid" />
      <AdminSidebar active="Projects" onLogout={handleLogout} />
      <main className="main-content">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Project Not Found</h3>
          <Link href="/admin/projects" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex', textDecoration: 'none' }}>← Back to Projects</Link>
        </div>
      </main>
    </div>
  );

  const agencyOrgs = orgs.filter(o => o.type === 'agency');
  const openRevCount = revisions.filter(r => r.status === 'open' || r.status === 'in-progress').length;

  return (
    <div className="sidebar-layout">
      <div className="bg-grid" />
      <AdminSidebar active="Projects" onLogout={handleLogout} />

      <main className="main-content">
        {/* Toast */}
        {toast && (
          <div className="toast-root">
            <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
          </div>
        )}

        {/* Back */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/admin/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.83rem', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Projects
          </Link>
        </div>

        {/* Header */}
        <header style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--bg-border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>{project.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span className={`badge badge-${project.status?.toLowerCase()}`}>{project.status}</span>
                {project.clientCode && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Code: <strong style={{ color: 'var(--text-secondary)' }}>{project.clientCode}</strong></span>}
                {project.deliveredOn && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Delivered: {project.deliveredOn}</span>}
              </div>
            </div>
            {project.previewUrl && (
              <a href={project.previewUrl} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize: '0.83rem' }}>Open Preview ↗</a>
            )}
          </div>
        </header>

        {/* Tabs */}
        <div className="tabs-bar" style={{ marginBottom: '2rem' }}>
          {[
            { key: 'details',   label: 'Details',   icon: '⚙' },
            { key: 'documents', label: 'Documents',  icon: '📎' },
            { key: 'revisions', label: 'Revisions',  icon: '💬', count: openRevCount },
          ].map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              <span>{t.icon}</span>{t.label}
              {t.count > 0 && <span style={{ background: 'var(--accent)', color: '#000', borderRadius: '100px', padding: '0 0.4rem', fontSize: '0.68rem', fontWeight: 700, marginLeft: '0.2rem' }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ── Details Tab ── */}
        {tab === 'details' && (
          <div className="animate-in">
            <form onSubmit={handleSaveDetails} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '640px' }}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input type="text" className="input" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="textarea" rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Preview URL</label>
                <input type="url" className="input" value={formData.previewUrl || ''} onChange={e => setFormData({ ...formData, previewUrl: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="select" value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="in-review">In Review</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Agency</label>
                  <select className="select" value={formData.agencyId || ''} onChange={e => setFormData({ ...formData, agencyId: e.target.value })}>
                    <option value="">Select Agency</option>
                    {agencyOrgs.map(o => <option key={o.id || o._id} value={o.id || o._id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Client Code</label>
                  <input type="text" className="input" value={formData.clientCode || ''} onChange={e => setFormData({ ...formData, clientCode: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivered On</label>
                  <input type="text" className="input" placeholder="e.g. March 2025" value={formData.deliveredOn || ''} onChange={e => setFormData({ ...formData, deliveredOn: e.target.value })} />
                </div>
              </div>
              <div>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Documents Tab ── */}
        {tab === 'documents' && (
          <div className="animate-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 className="section-title">Project Documents</h2>
              <span className="section-count">{project.documents?.length || 0} files</span>
            </div>

            {(project.documents || []).length === 0 ? (
              <div className="empty-state" style={{ marginBottom: '2rem' }}>
                <div className="empty-state-icon">📄</div>
                <h3 className="empty-state-title">No documents attached yet.</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
                {project.documents.map(doc => (
                  <div key={doc.id || doc._id} className="doc-item">
                    <div className="doc-icon" style={{ background: 'var(--accent-light)', fontSize: '1.2rem' }}>{getDocIcon(doc.type)}</div>
                    <div style={{ flex: 1 }}>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="doc-label accent-text">{doc.label}</a>
                      <span className="badge" style={{ marginLeft: '0.5rem', fontSize: '0.68rem' }}>{doc.type}</span>
                    </div>
                    <button className="btn-danger" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }} onClick={() => handleRemoveDocument(doc.id || doc._id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <h3 className="section-title" style={{ marginBottom: '1.25rem' }}>Add Document</h3>
              <form onSubmit={handleAddDocument}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Label</label>
                    <input type="text" className="input" required value={docForm.label} onChange={e => setDocForm({ ...docForm, label: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">URL</label>
                    <input type="url" className="input" required value={docForm.url} onChange={e => setDocForm({ ...docForm, url: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Type</label>
                    <select className="select" value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value })}>
                      <option value="quotation">Quotation</option>
                      <option value="invoice">Invoice</option>
                      <option value="contract">Contract</option>
                      <option value="nda">NDA</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary">Add</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Revisions Tab ── */}
        {tab === 'revisions' && (
          <div className="animate-in">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div>
                <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>Revisions & Feedback</h2>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                  {revisions.length === 0 ? 'No revisions yet.' : `${revisions.length} revision${revisions.length !== 1 ? 's' : ''} total`}
                </p>
              </div>
            </div>

            {revisions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3 className="empty-state-title">No Revisions Found</h3>
                <p className="empty-state-sub">No revisions have been raised for this project yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {revisions.map(rev => {
                  const revId      = rev.id || rev._id;
                  const isExpanded = expandedRev === revId;
                  return (
                    <div key={revId} className="rev-card" style={{ boxShadow: isExpanded ? '0 8px 32px rgba(0,0,0,0.3)' : 'none' }}>
                      {/* Card Header */}
                      <div
                        className="rev-card-header"
                        onClick={() => setExpandedRev(isExpanded ? null : revId)}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '1rem', fontWeight: 600 }}>{rev.title}</strong>
                            <span className={`badge badge-${(rev.status || 'open').replace('-', '')}`}>{rev.status}</span>
                            {rev.isDeletedByClient && (
                              <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>Deleted by Client</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Raised by <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{rev.raisedByName || 'Unknown'}</span>
                            {' '}· {new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' '}· {rev.thread?.length || 0} message{(rev.thread?.length || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <button 
                            className="btn-ghost" 
                            style={{ color: '#ef4444', padding: '0.3rem', fontSize: '0.8rem' }}
                            onClick={(e) => { e.stopPropagation(); handleDeleteRevision(revId); }}
                            title="Permanently Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s ease', color: 'var(--text-muted)', flexShrink: 0 }}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--bg-border)' }}>
                          {/* Chat messages */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', maxHeight: '420px', overflowY: 'auto' }}>
                            {(rev.thread || []).length === 0 && (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No messages yet. Reply below to start the conversation.</p>
                            )}
                            {(rev.thread || []).map((msg, i) => {
                              const isMe    = msg.authorType === 'owner';
                              const color   = authorColor(msg.authorType);
                              const time    = new Date(msg.timestamp || msg.createdAt);
                              const isValid = !isNaN(time.getTime());
                              const roleStr = msg.authorType === 'owner' ? 'Saarthi - DT Solution' : msg.authorName;

                              return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', animationDelay: `${i * 0.04}s` }} className="chat-msg-in">
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, color }}>{roleStr}</span>
                                    <span style={{ color: 'var(--bg-border-h)' }}>·</span>
                                    <span style={{ textTransform: 'capitalize' }}>{roleLabel(msg.authorType)}</span>
                                    {isValid && (
                                      <>
                                        <span style={{ color: 'var(--bg-border-h)' }}>·</span>
                                        <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </>
                                    )}
                                    {msg._optimistic && <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Sending…</span>}
                                  </div>
                                  <div style={{
                                    padding: '0.85rem 1.15rem',
                                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                    maxWidth: '72%',
                                    fontSize: '0.88rem',
                                    lineHeight: 1.55,
                                    wordBreak: 'break-word',
                                    background: isMe ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.06)',
                                    color: isMe ? '#0a0807' : 'var(--text-primary)',
                                    border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                    opacity: msg._optimistic ? 0.7 : 1,
                                    transition: 'opacity 0.3s',
                                    boxShadow: isMe ? '0 4px 16px var(--accent-glow)' : 'none',
                                  }}>
                                    {msg.message}
                                  </div>
                                  {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="attachment" style={{ maxWidth: '280px', marginTop: '0.5rem', borderRadius: '10px', border: '1px solid var(--bg-border)' }} />
                                  )}
                                </div>
                              );
                            })}
                            <div ref={el => { if (el) chatEndRefs.current[revId] = el; }} />
                          </div>

                          {/* Status buttons */}
                          {rev.status !== 'closed' && rev.status !== 'resolved' && (
                            <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1.5rem 0.75rem', flexWrap: 'wrap' }}>
                              <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }} onClick={() => handleRevisionStatus(revId, 'in-progress')}>Mark In-Progress</button>
                              <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }} onClick={() => handleRevisionStatus(revId, 'resolved')}>✓ Resolve</button>
                              <button className="btn-danger" style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }} onClick={() => handleRevisionStatus(revId, 'closed')}>Close</button>
                            </div>
                          )}

                          {/* Chat input */}
                          {rev.status !== 'closed' && rev.status !== 'resolved' ? (
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', padding: '1rem 1.5rem', background: 'var(--bg-surface-2)', borderTop: '1px solid var(--bg-border)' }}>
                              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', transition: 'all 0.2s', flexShrink: 0 }}>
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setReplyImgs(prev => ({ ...prev, [revId]: reader.result }));
                                    reader.readAsDataURL(file);
                                  }
                                }} />
                                <Paperclip size={20} />
                              </label>
                              <textarea
                                placeholder="Type a message… (paste images) (Enter to send, Shift+Enter for new line)"
                                value={replyMsg[revId] || ''}
                                onChange={e => setReplyMsg(prev => ({ ...prev, [revId]: e.target.value }))}
                                onKeyDown={e => handleReplyKeyDown(e, revId)}
                                onPaste={e => handlePaste(e, revId)}
                                rows={1}
                                style={{ flex: 1, minHeight: '44px', maxHeight: '120px', padding: '0.65rem 1.1rem', borderRadius: '22px', resize: 'none', border: '1.5px solid var(--bg-border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, transition: 'border-color 0.2s' }}
                                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={e => e.target.style.borderColor = 'var(--bg-border)'}
                              />
                              <button
                                onClick={() => handleReplyRevision(revId)}
                                disabled={(!replyMsg[revId]?.trim() && !replyImgs[revId]) || sendingReply}
                                style={{ width: '44px', height: '44px', borderRadius: '50%', background: (replyMsg[revId]?.trim() || replyImgs[revId]) ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)', color: (replyMsg[revId]?.trim() || replyImgs[revId]) ? '#000' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s', cursor: (replyMsg[revId]?.trim() || replyImgs[revId]) ? 'pointer' : 'not-allowed', border: 'none', boxShadow: (replyMsg[revId]?.trim() || replyImgs[revId]) ? '0 4px 12px var(--accent-glow)' : 'none' }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                              </button>
                            </div>
                          ) : (
                            <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-surface-2)', borderTop: '1px solid var(--bg-border)', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                              This revision is {rev.status}. No further replies.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
