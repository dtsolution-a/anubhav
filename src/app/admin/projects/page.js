'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminProjects() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    title: '', description: '', previewUrl: '', status: 'active', agencyId: '', clientCode: '', deliveredOn: ''
  });

  const fetchData = async () => {
    try {
      const [projRes, orgRes] = await Promise.all([
        fetch('/api/projects').catch(() => ({ json: () => [] })),
        fetch('/api/orgs').catch(() => ({ json: () => [] }))
      ]);
      setProjects((await projRes.json()) || []);
      setOrgs((await orgRes.json()) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to create');
      showToast('Project created successfully!');
      setShowModal(false);
      setFormData({ title: '', description: '', previewUrl: '', status: 'active', agencyId: '', clientCode: '', deliveredOn: '' });
      fetchData();
    } catch (err) {
      showToast('Error creating project', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      showToast('Project deleted');
      fetchData();
    } catch (err) {
      showToast('Error deleting project', 'error');
    }
  };

  // Safe fallback if 'new' URL triggers open modal
  useEffect(() => {
    if (window.location.pathname.endsWith('/new')) {
      setShowModal(true);
    }
  }, []);

  const agencyOrgs = orgs.filter((o) => o.type === 'agency');

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
            <h1 className="page-title">Projects</h1>
            <p className="page-sub">Manage all client projects</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">New Project</button>
        </div>

        {loading ? <div className="spinner"></div> : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Agency</th>
                  <th>Client Code</th>
                  <th>Status</th>
                  <th>Preview URL</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id || p._id}>
                    <td>{p.title}</td>
                    <td>{orgs.find((o) => o.id === p.agencyId || o._id === p.agencyId)?.name || p.agencyId || '-'}</td>
                    <td>{p.clientCode || '-'}</td>
                    <td><span className={`badge badge-${p.status === 'in-review' ? 'review' : p.status}`}>{p.status}</span></td>
                    <td>
                      {p.previewUrl ? (
                        <a href={p.previewUrl} target="_blank" rel="noreferrer" className="accent-text">Link</a>
                      ) : '-'}
                    </td>
                    <td>
                      <Link href={`/admin/projects/${p.id || p._id}`} className="btn-ghost" style={{ padding: '5px 10px', marginRight: '5px' }}>Edit</Link>
                      <button onClick={() => handleDelete(p.id || p._id)} className="btn-danger" style={{ padding: '5px 10px' }}>Del</button>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr><td colSpan="6" className="empty-state">No projects found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">New Project</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon">x</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreate} id="create-project-form">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input type="text" className="input" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="textarea" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Preview URL</label>
                  <input type="url" className="input" value={formData.previewUrl} onChange={e => setFormData({...formData, previewUrl: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="select" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="in-review">In Review</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Agency ID</label>
                  <select className="select" value={formData.agencyId} onChange={e => setFormData({...formData, agencyId: e.target.value})}>
                    <option value="">Select Agency</option>
                    {agencyOrgs.map((o) => <option key={o.id||o._id} value={o.id||o._id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Client Code</label>
                  <input type="text" className="input" value={formData.clientCode} onChange={e => setFormData({...formData, clientCode: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivered On</label>
                  <input type="text" className="input" placeholder="e.g. March 2025" value={formData.deliveredOn} onChange={e => setFormData({...formData, deliveredOn: e.target.value})} />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button type="submit" form="create-project-form" className="btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
