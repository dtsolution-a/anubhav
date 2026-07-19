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
      const res = await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error();
      const updatedRev = await res.json();
      setRevisions(prev => prev.map(r => (r.id || r._id) === revId ? updatedRev : r));
      showToast(`Revision marked as ${status}`);
    } catch (err) {
      showToast('Update failed', 'error');
    }
  };

  const handleReplyRevision = async (revId) => {
    const msg = replyMsg[revId];
    if (!msg) return;
    try {
      const res = await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _addMessage: { message: msg } })
      });
      if (!res.ok) throw new Error();
      const updatedRev = await res.json();
      setRevisions(prev => prev.map(r => (r.id || r._id) === revId ? updatedRev : r));
      setReplyMsg({ ...replyMsg, [revId]: '' });
      showToast('Reply sent');
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
    <div className="sidebar-layout">
      <div className="bg-grid" />
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
                      <div key={revId} style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', overflow: 'hidden' }}>
                        <div 
                          style={{ display: 'flex', justifyContent: 'space-between', padding: '1.25rem', cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.2s' }} 
                          onClick={() => setExpandedRev(isExpanded ? null : revId)}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                              <strong style={{ fontSize: '1.1rem' }}>{rev.title}</strong>
                              <span className={`badge badge-${rev.status}`}>{rev.status}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                              Raised by <span style={{ color: 'var(--text)' }}>{rev.raisedByName || 'Unknown'}</span> on {new Date(rev.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <span>{rev.thread?.length || 0} messages</span>
                            <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                              {rev.thread?.map((msg, i) => {
                                const isOwner = msg.authorType === 'owner';
                                const isClient = msg.authorType === 'client';
                                return (
                                  <div key={i} style={{ alignSelf: isOwner ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                    <div style={{ display: 'flex', justifyContent: isOwner ? 'flex-end' : 'flex-start', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      <span style={{ fontWeight: 600, color: isOwner ? 'var(--accent)' : (isClient ? '#4facfe' : '#a8ff78') }}>
                                        {msg.authorName} ({msg.authorType})
                                      </span>
                                      <span style={{ margin: '0 0.5rem' }}>•</span>
                                      <span>{new Date(msg.timestamp || msg.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div style={{ 
                                      padding: '0.85rem 1rem', 
                                      background: isOwner ? 'var(--accent)' : 'rgba(255,255,255,0.05)', 
                                      color: isOwner ? '#000' : '#fff',
                                      borderRadius: '12px',
                                      borderBottomRightRadius: isOwner ? '4px' : '12px',
                                      borderBottomLeftRadius: isOwner ? '12px' : '4px',
                                      lineHeight: 1.5
                                    }}>
                                      {msg.message}
                                    </div>
                                    {msg.imageUrl && (
                                      <img src={msg.imageUrl} alt="attachment" style={{ maxWidth: '100%', marginTop: '0.5rem', borderRadius: '8px' }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {rev.status !== 'closed' && rev.status !== 'resolved' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <textarea 
                                    className="textarea" 
                                    placeholder="Type your reply here..." 
                                    value={replyMsg[revId] || ''} 
                                    onChange={e => setReplyMsg({...replyMsg, [revId]: e.target.value})} 
                                    style={{ flex: 1, minHeight: '60px', borderRadius: '8px' }}
                                  ></textarea>
                                  <button className="btn-primary" onClick={() => handleReplyRevision(revId)} style={{ padding: '0 1.5rem' }}>Send</button>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                  <button className="btn-ghost" onClick={() => handleRevisionStatus(revId, 'in-progress')}>Mark In-Progress</button>
                                  <button className="btn-ghost" onClick={() => handleRevisionStatus(revId, 'resolved')}>Mark Resolved</button>
                                  <button className="btn-danger" onClick={() => handleRevisionStatus(revId, 'closed')}>Close Revision</button>
                                </div>
                              </div>
                            )}
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
