'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WorkspaceDashboard() {
  const [session, setSession] = useState(null);
  const [projects, setProjects] = useState([]);
  const [openRevisionsCount, setOpenRevisionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch session
        const sessionRes = await fetch('/api/auth/me');
        if (!sessionRes.ok) {
          if (sessionRes.status === 401) window.location.href = '/login';
          throw new Error('Failed to load session');
        }
        const sessionData = await sessionRes.json();
        setSession(sessionData);

        // Fetch projects
        const projectsRes = await fetch('/api/projects');
        if (!projectsRes.ok) throw new Error('Failed to load projects');
        const projectsData = await projectsRes.json();
        setProjects(projectsData);

        // Fetch open revisions count
        const revisionsRes = await fetch('/api/revisions?status=open');
        if (revisionsRes.ok) {
          const revisionsData = await revisionsRes.json();
          setOpenRevisionsCount(revisionsData.length || 0);
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
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (loading) {
    return (
      <div className="sidebar-layout">
        <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sidebar-layout">
        <div className="main-content">
          <div className="empty-state">
            <h3 className="empty-state-title">Error Loading Dashboard</h3>
            <p className="empty-state-sub">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const branding = session?.org?.branding || { accentColor: '#FF7035', accentSecondary: '#FF9F00' };
  
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'progress').length;
  const deliveredProjects = projects.filter(p => p.status === 'delivered').length;

  return (
    <div 
      className="sidebar-layout" 
      style={{ 
        '--accent': branding.accentColor, 
        '--accent-secondary': branding.accentSecondary 
      }}
    >
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark"></div>
          <div>
            <div className="sidebar-brand-name">{session?.org?.name || 'Workspace'}</div>
            <div className="sidebar-brand-sub">Agency Portal</div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <Link href="/workspace" className="sidebar-nav-item active">Dashboard</Link>
          <Link href="/workspace/projects" className="sidebar-nav-item">Projects</Link>
          <Link href="/workspace/revisions" className="sidebar-nav-item">Revisions</Link>
        </nav>
        
        <div className="sidebar-spacer"></div>
        
        <div className="sidebar-footer">
          <div style={{ fontFamily: 'Noto Sans Devanagari', marginBottom: '1rem', color: 'var(--accent)' }}>अनुभवः</div>
          <button onClick={handleLogout} className="btn-ghost" style={{ width: '100%', textAlign: 'left' }}>
            Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="bg-grid"></div>
        <div className="glow-orb" style={{ top: '-10%', left: '50%' }}></div>
        
        <header className="page-header animate-in">
          <h1 className="page-title">Welcome back, <span className="accent-text">{session?.user?.name || 'Agency'}</span></h1>
          <p className="page-sub">Here is an overview of your active projects and revisions.</p>
        </header>

        <div className="stats-grid animate-in" style={{ animationDelay: '0.1s' }}>
          <div className="stat-card card">
            <div className="stat-label">Total Projects</div>
            <div className="stat-value">{projects.length}</div>
          </div>
          <div className="stat-card card">
            <div className="stat-label">Active</div>
            <div className="stat-value">{activeProjects}</div>
          </div>
          <div className="stat-card card">
            <div className="stat-label">Delivered</div>
            <div className="stat-value">{deliveredProjects}</div>
          </div>
          <div className="stat-card card">
            <div className="stat-label">Open Revisions</div>
            <div className="stat-value">{openRevisionsCount}</div>
          </div>
        </div>

        <div className="section-header animate-in" style={{ animationDelay: '0.2s', marginTop: '3rem' }}>
          <h2 className="section-title">Your Projects</h2>
          <span className="section-count">{projects.length}</span>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state animate-in" style={{ animationDelay: '0.3s' }}>
            <div className="empty-state-icon">📁</div>
            <h3 className="empty-state-title">No Projects Found</h3>
            <p className="empty-state-sub">You don't have any active projects yet.</p>
          </div>
        ) : (
          <div className="stats-grid animate-in" style={{ animationDelay: '0.3s' }}>
            {projects.map((project) => (
              <div key={project.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {project.title.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{project.title}</h3>
                  </div>
                  <span className={`badge badge-${project.status.toLowerCase()}`}>
                    {project.status}
                  </span>
                </div>
                <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem', minHeight: '40px' }}>
                  {project.description?.substring(0, 80) || 'No description provided.'}
                  {project.description?.length > 80 ? '...' : ''}
                </p>
                <Link href={`/workspace/${project.id}`} className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  View Project
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
