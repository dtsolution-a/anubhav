'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminProjectDetails({ params }) {
  const router = useRouter();
  const { id } = params;
  
  const [project, setProject] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('details'); // details, documents, revisions
  const [toast, setToast] = useState(null);

  // Form states
  const [formData, setFormData] = useState({});
  const [docForm, setDocForm] = useState({ label: '', url: '', type: 'other' });
  const [replyMsg, setReplyMsg] = useState({});
  const [expandedRev, setExpandedRev] = useState(null);

  const fetchData = async () => {
    try {
      const [projRes, orgRes, revRes] = await Promise.all([
        fetch(`/api/projects/${id}`).catch(() => null),
        fetch('/api/orgs').catch(() => null),
        fetch(`/api/revisions?projectId=${id}`).catch(() => null)
      ]);
      const p = projRes ? await projRes.json() : null;
      if (p) {
        setProject(p);
        setFormData(p);
      }
      setOrgs(orgRes ? await orgRes.json() : []);
      setRevisions(revRes ? await revRes.json() : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          previewUrl: formData.previewUrl,
          status: formData.status,
          agencyId: formData.agencyId,
          clientCode: formData.clientCode,
          deliveredOn: formData.deliveredOn
        })
      });
      if (!res.ok) throw new Error();
      showToast('Project updated successfully');
      fetchData();
    } catch (err) {
      showToast('Update failed', 'error');
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _addDocument: docForm })
      });
      if (!res.ok) throw new Error();
      showToast('Document added');
      setDocForm({ label: '', url: '', type: 'other' });
      fetchData();
    } catch (err) {
      showToast('Add document failed', 'error');
    }
  };

  const handleRemoveDocument = async (docId) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _removeDocumentId: docId })
      });
      if (!res.ok) throw new Error();
      showToast('Document removed');
      fetchData();
    } catch (err) {
      showToast('Remove document failed', 'error');
    }
  };

  const handleRevisionStatus = async (revId, status) => {
    try {
      await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      showToast(`Revision marked as ${status}`);
      fetchData();
    } catch (err) {
      showToast('Update failed', 'error');
    }
  };

  const handleReplyRevision = async (revId) => {
    const msg = replyMsg[revId];
    if (!msg) return;
    try {
      await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _addMessage: { message: msg } })
      });
      setReplyMsg({ ...replyMsg, [revId]: '' });
      showToast('Reply sent');
      fetchData();
    } catch (err) {
      showToast('Failed to reply', 'error');
    }
  };

  const getDocIcon = (type) => {
    switch (type) {
      case 'quotation': return '📄';
      case 'invoice': return '💰';
      case 'contract': return '📋';
      case 'nda': return '🔒';
      default: return '📎';
    }
  };

  if (loading) return <div className="sidebar-layout"><main className="main-content"><div className="spinner"></div></main></div>;
  if (!project) return <div className="sidebar-layout"><main className="main-content">Project not found</main></div>;

  const agencyOrgs = orgs.filter(o => o.type === 'agency');

  return (
    <div className="sidebar-layout bg-grid">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">DTS</div>
          <div className="sidebar-brand-name">Anubhavah</div>
        </div>
        <nav className="sidebar-nav">
          <Link href="/admin" className="sidebar-nav-item">Dashboard</Link>
          <Link href="/admin/projects" className="sidebar-nav-item active">Projects</Link>
          <Link href="/admin/orgs" className="sidebar-nav-item">Organizations</Link>
        </nav>
        <div className="sidebar-spacer"></div>
        <div className="sidebar-footer">
          <div style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>अनुभवः</div>
          <button onClick={handleLogout} className="btn-danger">Logout</button>
        </div>
      </aside>

      <main className="main-content">
        {toast && (
          <div className="toast-root">
            <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
          </div>
        )}

        <div className="page-header">
          <div>
            <h1 className="page-title">{project.title}</h1>
            <p className="page-sub">Project ID: {id}</p>
          </div>
          <button onClick={() => router.push('/admin/projects')} className="btn-ghost">Back</button>
        </div>

        <div className="tabs-bar">
          <button className={`tab-btn ${tab === 'details' ? 'active' : ''}`} onClick={() => setTab('details')}>Details</button>
          <button className={`tab-btn ${tab === 'documents' ? 'active' : ''}`} onClick={() => setTab('documents')}>Documents</button>
          <button className={`tab-btn ${tab === 'revisions' ? 'active' : ''}`} onClick={() => setTab('revisions')}>Revisions</button>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          {tab === 'details' && (
            <form onSubmit={handleSaveDetails}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input type="text" className="input" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="textarea" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Preview URL</label>
                <input type="url" className="input" value={formData.previewUrl || ''} onChange={e => setFormData({...formData, previewUrl: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="select" value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="in-review">In Review</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Agency ID</label>
                <select className="select" value={formData.agencyId || ''} onChange={e => setFormData({...formData, agencyId: e.target.value})}>
                  <option value="">Select Agency</option>
                  {agencyOrgs.map(o => <option key={o.id||o._id} value={o.id||o._id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Client Code</label>
                <input type="text" className="input" value={formData.clientCode || ''} onChange={e => setFormData({...formData, clientCode: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Delivered On</label>
                <input type="text" className="input" value={formData.deliveredOn || ''} onChange={e => setFormData({...formData, deliveredOn: e.target.value})} />
              </div>
              <button type="submit" className="btn-primary">Save Changes</button>
            </form>
          )}

          {tab === 'documents' && (
            <div>
              <h3 className="section-title">Documents</h3>
              <div style={{ marginBottom: '20px' }}>
                {(project.documents || []).length === 0 ? <p className="empty-state">No documents attached.</p> : (
                  project.documents.map(doc => (
                    <div key={doc.id || doc._id} className="doc-item">
                      <div className="doc-icon">{getDocIcon(doc.type)}</div>
                      <div style={{ flex: 1 }}>
                        <a href={doc.url} target="_blank" rel="noreferrer" className="doc-label accent-text">{doc.label}</a>
                        <span className="badge" style={{ marginLeft: '10px' }}>{doc.type}</span>
                      </div>
                      <button className="btn-danger" onClick={() => handleRemoveDocument(doc.id || doc._id)}>Remove</button>
                    </div>
                  ))
                )}
              </div>
              <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
              <h3 className="section-title">Add Document</h3>
              <form onSubmit={handleAddDocument} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Label</label>
                  <input type="text" className="input" required value={docForm.label} onChange={e => setDocForm({...docForm, label: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label className="form-label">URL</label>
                  <input type="url" className="input" required value={docForm.url} onChange={e => setDocForm({...docForm, url: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Type</label>
                  <select className="select" value={docForm.type} onChange={e => setDocForm({...docForm, type: e.target.value})}>
                    <option value="quotation">Quotation</option>
                    <option value="invoice">Invoice</option>
                    <option value="contract">Contract</option>
                    <option value="nda">NDA</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary">Add</button>
              </form>
            </div>
          )}

          {tab === 'revisions' && (
            <div>
              <h3 className="section-title">Revisions</h3>
              {revisions.length === 0 ? <p className="empty-state">No revisions found.</p> : (
                revisions.map(rev => {
                  const revId = rev.id || rev._id;
                  const isExpanded = expandedRev === revId;
                  return (
                    <div key={revId} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpandedRev(isExpanded ? null : revId)}>
                        <div>
                          <strong>{rev.title}</strong> <span className={`badge badge-${rev.status}`}>{rev.status}</span>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Raised by {rev.raisedBy} on {new Date(rev.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div>
                          {rev.thread?.length || 0} msgs {isExpanded ? '▲' : '▼'}
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: '15px', padding: '15px', background: 'var(--surface)', borderRadius: '8px' }}>
                          <div style={{ marginBottom: '15px' }}>
                            {rev.thread?.map((msg, i) => (
                              <div key={i} className={`thread-msg ${msg.role === 'owner' ? 'by-me' : ''}`}>
                                <div className="thread-author">{msg.authorName} ({msg.role}) <span className="thread-time">{new Date(msg.createdAt).toLocaleString()}</span></div>
                                <div className="thread-text">{msg.message}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <textarea className="textarea" placeholder="Reply..." value={replyMsg[revId] || ''} onChange={e => setReplyMsg({...replyMsg, [revId]: e.target.value})} style={{ flex: 1 }}></textarea>
                            <button className="btn-primary" onClick={() => handleReplyRevision(revId)}>Send</button>
                          </div>
                          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                            <button className="btn-ghost" onClick={() => handleRevisionStatus(revId, 'in-progress')}>Mark In-Progress</button>
                            <button className="btn-ghost" onClick={() => handleRevisionStatus(revId, 'resolved')}>Mark Resolved</button>
                            <button className="btn-danger" onClick={() => handleRevisionStatus(revId, 'closed')}>Close</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
