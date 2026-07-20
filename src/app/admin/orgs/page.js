'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function AdminOrgs() {
  const router = useRouter();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);

  const initialForm = {
    name: '', code: '', type: 'client',
    branding: { logoText: '', accentColor: '#FF7035', accentSecondary: '#FF9F00', backgroundBase: '#0a0807', tagline: '' }
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/orgs');
      if (res.ok) setOrgs(await res.json());
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editId ? `/api/orgs/${editId}` : '/api/orgs';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to save');
      showToast(`Organization ${editId ? 'updated' : 'created'}`);
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast('Error saving organization', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete organization?')) return;
    try {
      const res = await fetch(`/api/orgs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      showToast('Organization deleted');
      fetchData();
    } catch (err) {
      showToast('Error deleting', 'error');
    }
  };

  const openNew = () => {
    setEditId(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEdit = (org) => {
    setEditId(org.id || org._id);
    setFormData({
      name: org.name || '',
      code: org.code || '',
      type: org.type || 'client',
      branding: {
        logoText: org.branding?.logoText || '',
        accentColor: org.branding?.accentColor || '#FF7035',
        accentSecondary: org.branding?.accentSecondary || '#FF9F00',
        backgroundBase: org.branding?.backgroundBase || '#0a0807',
        tagline: org.branding?.tagline || ''
      }
    });
    setShowModal(true);
  };

  // Check route for '?action=new' fallback
  useEffect(() => {
    if (window.location.search.includes('action=new')) {
      openNew();
    }
  }, []);

  return (
    <div className="sidebar-layout"><div className="bg-grid" />
      <AdminSidebar active="Organizations" onLogout={handleLogout} />

      <main className="main-content">
        {toast && (
          <div className="toast-root">
            <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
          </div>
        )}

        <div className="page-header">
          <div>
            <h1 className="page-title">Organizations</h1>
            <p className="page-sub">Manage agencies and clients</p>
          </div>
          <button onClick={openNew} className="btn-primary">New Organization</button>
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4rem', textAlign:'center' }}>
            <div className="spinner" style={{ width:40, height:40, marginBottom:'2rem' }} />
            <h2 style={{ fontSize:'1.5rem', fontWeight:600, color:'var(--accent)', marginBottom:'0.5rem', fontFamily:'serif', letterSpacing:'1px' }}>धैर्यं सर्वत्र साधनम्।</h2>
            <p style={{ fontSize:'0.9rem', color:'var(--text-muted)', maxWidth:'300px', lineHeight:1.5 }}>Patience is the key to accomplishing everything.</p>
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map(org => (
                  <tr key={org.id || org._id}>
                    <td>{org.name}</td>
                    <td>{org.code}</td>
                    <td>
                      <span className="badge">
                        {org.type === 'owner' ? '👑 Owner' : org.type === 'agency' ? '💼 Agency' : '👤 Client'}
                      </span>
                    </td>
                    <td>{new Date(org.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => openEdit(org)} className="btn-ghost" style={{ padding: '5px 10px', marginRight: '5px' }}>Edit</button>
                      {org.type !== 'owner' && (
                        <button onClick={() => handleDelete(org.id || org._id)} className="btn-danger" style={{ padding: '5px 10px' }}>Del</button>
                      )}
                    </td>
                  </tr>
                ))}
                {orgs.length === 0 && (
                  <tr><td colSpan="5" className="empty-state">No organizations found.</td></tr>
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
              <h2 className="modal-title">{editId ? 'Edit Organization' : 'New Organization'}</h2>
              <button type="button" onClick={() => setShowModal(false)} className="btn-icon">x</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} id="org-form">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input type="text" className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Code *</label>
                  <input type="text" className="input" required placeholder="UPPERCASE" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="select" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="agency">Agency</option>
                    <option value="client">Client</option>
                    <option value="owner">Owner (System)</option>
                  </select>
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
                  <h3 className="section-title" style={{ marginBottom: '10px' }}>Branding</h3>
                  <div className="form-group">
                    <label className="form-label">Logo Text</label>
                    <input type="text" className="input" placeholder="e.g. ML" value={formData.branding.logoText} onChange={e => setFormData({...formData, branding: {...formData.branding, logoText: e.target.value}})} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Accent Color</label>
                      <input type="color" className="input" style={{ padding: '0 5px' }} value={formData.branding.accentColor} onChange={e => setFormData({...formData, branding: {...formData.branding, accentColor: e.target.value}})} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Accent Sec.</label>
                      <input type="color" className="input" style={{ padding: '0 5px' }} value={formData.branding.accentSecondary} onChange={e => setFormData({...formData, branding: {...formData.branding, accentSecondary: e.target.value}})} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Bg Base</label>
                      <input type="color" className="input" style={{ padding: '0 5px' }} value={formData.branding.backgroundBase} onChange={e => setFormData({...formData, branding: {...formData.branding, backgroundBase: e.target.value}})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tagline</label>
                    <input type="text" className="input" value={formData.branding.tagline} onChange={e => setFormData({...formData, branding: {...formData.branding, tagline: e.target.value}})} />
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button type="submit" form="org-form" className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
