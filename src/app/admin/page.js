'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ projects: 0, activeProjects: 0, openRevisions: 0, orgs: 0 });
  const [recentRevisions, setRecentRevisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsRes, revsRes, orgsRes] = await Promise.all([
          fetch('/api/projects').catch(() => ({ json: () => [] })),
          fetch('/api/revisions?status=open').catch(() => ({ json: () => [] })),
          fetch('/api/orgs').catch(() => ({ json: () => [] }))
        ]);
        const projects = await projectsRes.json() || [];
        const revisions = await revsRes.json() || [];
        const orgs = await orgsRes.json() || [];

        setStats({
          projects: projects.length || 0,
          activeProjects: projects.filter((p) => p.status === 'active').length || 0,
          openRevisions: revisions.length || 0,
          orgs: orgs.length || 0,
        });
        setRecentRevisions(revisions.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="sidebar-layout"><div className="bg-grid" />
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">DTS</div>
          <div className="sidebar-brand-name">Anubhavah</div>
        </div>
        <nav className="sidebar-nav">
          <Link href="/admin" className="sidebar-nav-item active">Dashboard</Link>
          <Link href="/admin/projects" className="sidebar-nav-item">Projects</Link>
          <Link href="/admin/orgs" className="sidebar-nav-item">Organizations</Link>
        </nav>
        <div className="sidebar-spacer"></div>
        <div className="sidebar-footer">
          <div style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>अनुभवः</div>
          <button onClick={handleLogout} className="btn-danger">Logout</button>
        </div>
      </aside>
      
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-sub">Overview of your operations</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => router.push('/admin/projects/new')} className="btn-primary">New Project</button>
            <button onClick={() => router.push('/admin/orgs/new')} className="btn-ghost">New Organization</button>
          </div>
        </div>

        {loading ? (
          <div className="spinner"></div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Projects</div>
                <div className="stat-value">{stats.projects}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Active Projects</div>
                <div className="stat-value">{stats.activeProjects}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Open Revisions</div>
                <div className="stat-value">{stats.openRevisions}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Orgs</div>
                <div className="stat-value">{stats.orgs}</div>
              </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
              <div className="section-header">
                <h2 className="section-title">Recent Open Revisions</h2>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Raised By</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRevisions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-state">No open revisions found.</td>
                    </tr>
                  ) : (
                    recentRevisions.map(rev => (
                      <tr key={rev.id || rev._id}>
                        <td>{rev.projectTitle || rev.projectId}</td>
                        <td>{rev.raisedBy}</td>
                        <td><span className="badge badge-open">{rev.status || 'open'}</span></td>
                        <td>{new Date(rev.createdAt).toLocaleDateString()}</td>
                        <td>
                          <Link href={`/admin/projects/${rev.projectId}?tab=revisions`} className="accent-text">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
