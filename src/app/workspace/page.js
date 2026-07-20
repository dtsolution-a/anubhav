'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, FolderKanban, MessageSquare, LogOut, CheckCircle, Zap } from 'lucide-react';

export default function WorkspaceDashboard() {
  const [session, setSession]             = useState(null);
  const [projects, setProjects]           = useState([]);
  const [openRevisionsCount, setOpenRevisionsCount] = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [sessRes, projRes, revRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/projects'),
          fetch('/api/revisions?status=open'),
        ]);

        if (!sessRes.ok) {
          if (sessRes.status === 401) window.location.href = '/';
          throw new Error('Failed to load session');
        }
        setSession(await sessRes.json());

        if (!projRes.ok) throw new Error('Failed to load projects');
        setProjects(await projRes.json());

        if (revRes.ok) {
          const revs = await revRes.json();
          setOpenRevisionsCount(revs.length || 0);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  if (loading) return (
    <div className="sidebar-layout">
      <div className="main-content" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div className="spinner" style={{ width:36, height:36 }} />
      </div>
    </div>
  );

  if (error) return (
    <div className="sidebar-layout">
      <div className="main-content">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Error Loading Dashboard</h3>
          <p className="empty-state-sub">{error}</p>
        </div>
      </div>
    </div>
  );

  const branding = session?.org?.branding || { accentColor: '#FF7035', accentSecondary: '#FF9F00' };
  const activeProjects    = projects.filter(p => p.status === 'active' || p.status === 'progress' || p.status === 'in-review').length;
  const deliveredProjects = projects.filter(p => p.status === 'delivered').length;

  const stats = [
    { label:'Total Projects',  value: projects.length,    icon: <FolderKanban size={24} />, color:'rgba(255,255,255,0.06)' },
    { label:'Active',          value: activeProjects,      icon: <Zap size={24} />, color:'rgba(251,191,36,0.06)'  },
    { label:'Delivered',       value: deliveredProjects,   icon: <CheckCircle size={24} />, color:'rgba(74,222,128,0.06)'  },
    { label:'Open Revisions',  value: openRevisionsCount,  icon: <MessageSquare size={24} />, color:'rgba(255,112,53,0.06)'  },
  ];

  return (
    <div className="sidebar-layout" style={{ '--accent': branding.accentColor, '--accent-secondary': branding.accentSecondary }}>
      <div className="bg-grid" />

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark" style={{ background: `linear-gradient(135deg, ${branding.accentColor}, ${branding.accentSecondary})` }}>
            {(session?.org?.name || 'W').substring(0,2).toUpperCase()}
          </div>
          <div>
            <div className="sidebar-brand-name">{session?.org?.name || 'Workspace'}</div>
            <div className="sidebar-brand-sub">Agency Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link href="/workspace" className="sidebar-nav-item active">
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link href="/workspace" className="sidebar-nav-item">
            <FolderKanban size={16} />
            Projects
          </Link>
          <Link href="/workspace" className="sidebar-nav-item">
            <MessageSquare size={16} />
            Revisions
            {openRevisionsCount > 0 && (
              <span style={{ marginLeft:'auto', background:'var(--accent)', color:'#000', borderRadius:'100px', padding:'0.05rem 0.45rem', fontSize:'0.68rem', fontWeight:700 }}>
                {openRevisionsCount}
              </span>
            )}
          </Link>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <div style={{ fontFamily:'Noto Sans Devanagari', fontSize:'0.9rem', color:'var(--accent)', marginBottom:'0.5rem' }}>अनुभवः</div>
          <button onClick={handleLogout} className="btn-ghost" style={{ width:'100%', justifyContent:'flex-start' }}>
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        <div className="glow-orb" style={{ width:400, height:200, top:'-5%', left:'40%', background:'var(--accent-glow)' }} />

        {/* Header */}
        <header className="page-header animate-in" style={{ marginBottom:'2.5rem' }}>
          <div>
            <p style={{ fontSize:'0.78rem', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'0.5rem' }}>Agency Portal</p>
            <h1 className="page-title">
              Welcome back, <span className="accent-text">{session?.user?.name || session?.org?.name || 'Agency'}</span>
            </h1>
            <p className="page-sub" style={{ marginTop:'0.4rem' }}>Here's an overview of your active projects and revisions.</p>
          </div>
        </header>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))', gap:'1rem', marginBottom:'3rem', animationDelay:'0.1s' }} className="animate-in">
          {stats.map((s, i) => (
            <div
              key={i}
              style={{
                background:'var(--bg-surface)',
                border:'1px solid var(--bg-border)',
                borderRadius:'var(--radius-lg)',
                padding:'1.4rem 1.5rem',
                display:'flex',
                flexDirection:'column',
                gap:'0.6rem',
                transition:'border-color 0.2s, transform 0.2s',
                cursor:'default',
                position:'relative',
                overflow:'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bg-border-h)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)';   e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ position:'absolute', inset:0, background:s.color, borderRadius:'inherit', pointerEvents:'none' }} />
              <div style={{ fontSize:'1.25rem', position:'relative' }}>{s.icon}</div>
              <div style={{ fontFamily:'var(--font-head)', fontSize:'2rem', fontWeight:800, lineHeight:1, position:'relative' }}>{s.value}</div>
              <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', position:'relative' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Projects section */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }} className="animate-in">
          <h2 className="section-title">Your Projects</h2>
          <span className="section-count">{projects.length}</span>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state animate-in">
            <div className="empty-state-icon">📁</div>
            <h3 className="empty-state-title">No Projects Found</h3>
            <p className="empty-state-sub">You don't have any active projects yet. Contact the owner to get started.</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'1.25rem' }} className="animate-in">
            {projects.map(project => {
              const id = project._id || project.id;
              return (
                <div
                  key={id}
                  style={{
                    background:'var(--bg-surface)',
                    border:'1px solid var(--bg-border)',
                    borderRadius:'var(--radius-xl)',
                    padding:'1.75rem',
                    display:'flex',
                    flexDirection:'column',
                    gap:'1rem',
                    transition:'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bg-border-h)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
                    <div style={{ width:42, height:42, borderRadius:'10px', background:'var(--accent-gradient)', color:'#000', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-head)', fontSize:'0.85rem', fontWeight:800, flexShrink:0 }}>
                      {project.title.substring(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <h3 style={{ margin:0, fontSize:'1rem', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{project.title}</h3>
                    </div>
                    <span className={`badge badge-${project.status?.toLowerCase()}`}>{project.status}</span>
                  </div>

                  <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', lineHeight:1.55, flex:1, minHeight:'40px' }}>
                    {project.description
                      ? (project.description.length > 90 ? project.description.substring(0,90) + '…' : project.description)
                      : 'No description provided.'}
                  </p>

                  {project.deliveredOn && (
                    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'0.35rem' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Delivered {project.deliveredOn}
                    </div>
                  )}

                  <Link
                    href={`/workspace/${id}`}
                    className="btn-primary"
                    style={{ display:'block', textAlign:'center', textDecoration:'none', marginTop:'auto' }}
                  >
                    View Project →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
