'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderKanban, Zap, MessageSquare, Building } from 'lucide-react';

// ── Shared Admin Sidebar ────────────────────────────────────────────────────
function AdminSidebar({ active, onLogout }) {
  const navItems = [
    { href: '/admin',          label: 'Dashboard',      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { href: '/admin/projects', label: 'Projects',       icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
    { href: '/admin/orgs',     label: 'Organizations',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
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
        const projects  = await projectsRes.json() || [];
        const revisions = await revsRes.json() || [];
        const orgs      = await orgsRes.json() || [];
        setStats({
          projects:       projects.length  || 0,
          activeProjects: projects.filter(p => p.status === 'active').length || 0,
          openRevisions:  revisions.length || 0,
          orgs:           orgs.length      || 0,
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
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const statCards = [
    { label: 'Total Projects',  value: stats.projects,       icon: <FolderKanban size={24} />, color: 'rgba(255,255,255,0.04)' },
    { label: 'Active Projects', value: stats.activeProjects,  icon: <Zap size={24} />, color: 'rgba(251,191,36,0.06)'  },
    { label: 'Open Revisions',  value: stats.openRevisions,   icon: <MessageSquare size={24} />, color: 'rgba(255,112,53,0.06)'  },
    { label: 'Total Orgs',      value: stats.orgs,            icon: <Building size={24} />, color: 'rgba(74,222,128,0.06)'  },
  ];

  return (
    <div className="sidebar-layout">
      <div className="bg-grid" />
      <AdminSidebar active="Dashboard" onLogout={handleLogout} />

      <main className="main-content">
        <div className="glow-orb" style={{ width: 400, height: 200, top: '-5%', left: '50%', background: 'var(--accent-glow)' }} />

        <header style={{ marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--bg-border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.78rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Owner Portal</p>
              <h1 className="page-title">Admin Dashboard</h1>
              <p className="page-sub" style={{ marginTop: '0.35rem' }}>Overview of all projects, revisions, and organizations.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/admin/projects?action=new')} className="btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Project
              </button>
              <button onClick={() => router.push('/admin/orgs?action=new')} className="btn-ghost">New Organization</button>
            </div>
          </div>
        </header>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'4rem', textAlign:'center' }}>
            <div className="spinner" style={{ width:40, height:40, marginBottom:'2rem' }} />
            <h2 style={{ fontSize:'1.5rem', fontWeight:600, color:'var(--accent)', marginBottom:'0.5rem', fontFamily:'serif', letterSpacing:'1px' }}>धैर्यं सर्वत्र साधनम्।</h2>
            <p style={{ fontSize:'0.9rem', color:'var(--text-muted)', maxWidth:'300px', lineHeight:1.5 }}>Patience is the key to accomplishing everything.</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: '1rem', marginBottom: '3rem' }}>
              {statCards.map((s, i) => (
                <div key={i}
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-lg)', padding: '1.4rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', transition: 'border-color 0.2s, transform 0.2s', position: 'relative', overflow: 'hidden', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bg-border-h)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)';   e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: s.color, borderRadius: 'inherit', pointerEvents: 'none' }} />
                  <div style={{ fontSize: '1.25rem', position: 'relative' }}>{s.icon}</div>
                  <div style={{ fontFamily: 'var(--font-head)', fontSize: '2rem', fontWeight: 800, lineHeight: 1, position: 'relative' }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', position: 'relative' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent Revisions */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 className="section-title" style={{ margin: 0 }}>Recent Open Revisions</h2>
                <span className="section-count">{recentRevisions.length}</span>
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
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>No open revisions found.</td></tr>
                  ) : (
                    recentRevisions.map(rev => {
                      const projId = typeof rev.projectId === 'object' && rev.projectId !== null
                        ? (rev.projectId._id || rev.projectId.id) : rev.projectId;
                      const projTitle = typeof rev.projectId === 'object' && rev.projectId !== null
                        ? rev.projectId.title : (rev.projectTitle || rev.projectId);
                      return (
                        <tr key={rev.id || rev._id}>
                          <td style={{ fontWeight: 500 }}>{projTitle}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{rev.raisedByName || rev.raisedBy || '—'}</td>
                          <td><span className="badge badge-open">{rev.status || 'open'}</span></td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>{new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td>
                            <Link href={`/admin/projects/${projId}?tab=revisions`} style={{ color: 'var(--accent)', fontSize: '0.83rem', fontWeight: 600 }}>View →</Link>
                          </td>
                        </tr>
                      );
                    })
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
