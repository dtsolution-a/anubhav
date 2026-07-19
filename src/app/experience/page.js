'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const DEVICES = [
  { id: 'desktop', label: 'Desktop',     icon: '🖥', frameClass: 'frame-desktop' },
  { id: 'air',     label: 'MacBook Air', icon: '💻', frameClass: 'frame-air'     },
  { id: 'pro',     label: 'MacBook Pro', icon: '💻', frameClass: 'frame-pro'     },
  { id: 'ipad',    label: 'iPad Pro',    icon: '📱', frameClass: 'frame-ipad'    },
  { id: 'iphone',  label: 'iPhone 16',   icon: '📱', frameClass: 'frame-iphone'  },
];

export default function ExperiencePage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [device, setDevice]   = useState('desktop');
  const [active, setActive]   = useState(false); // iframe activated
  const [fsOpen, setFsOpen]   = useState(false);
  const router = useRouter();
  const fsRef  = useRef(null);

  useEffect(() => {
    fetch('/api/experience')
      .then(r => {
        if (r.status === 401 || r.status === 403) { router.push('/'); return null; }
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .catch(() => setError('Failed to load experience data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setFsOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0a0807', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span className="spinner" style={{ width:32, height:32 }} />
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight:'100vh', background:'#0a0807', display:'flex', alignItems:'center', justifyContent:'center', color:'#a09890', fontFamily:'Inter,sans-serif' }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ marginBottom:'1rem' }}>{error || 'Experience not found.'}</p>
        <button className="btn-ghost" onClick={() => router.push('/')}>← Back</button>
      </div>
    </div>
  );

  const { project, clientOrg, brand } = data;
  const B = brand || {};
  const accent    = B.accentColor     || '#FF7035';
  const accentSec = B.accentSecondary || '#FF9F00';
  const accentGlow= B.accentGlow      || 'rgba(255,112,53,0.28)';
  const accentLt  = B.accentLight     || 'rgba(255,112,53,0.1)';
  const bgBase    = B.bgBase          || '#0a0807';
  const currentDevice = DEVICES.find(d => d.id === device) || DEVICES[0];

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background: bgBase, '--accent': accent, '--accent-secondary': accentSec, '--accent-glow': accentGlow, '--accent-light': accentLt, '--accent-gradient': `linear-gradient(135deg,${accent},${accentSec})` }}>
      <div className="bg-grid" />

      {/* ── Header ── */}
      <header style={{ position:'sticky', top:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.85rem 2rem', background:`${bgBase}cc`, backdropFilter:'blur(20px)', borderBottom:'1px solid var(--bg-border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
          <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${accent},${accentSec})`, color:'#fff', fontFamily:'Outfit,sans-serif', fontSize:'0.75rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {B.logoText || '◆'}
          </div>
          <span style={{ fontFamily:'Outfit,sans-serif', fontWeight:600, fontSize:'0.9rem', color:'#f4f0ec' }}>{B.name || brand?.name}</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.72rem', fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color: accent, background: accentLt, border:`1px solid ${accent}55`, borderRadius:100, padding:'0.28rem 0.85rem' }}>
          <span className="badge-dot" style={{ background: accent }} />
          Experience Centre
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <span style={{ fontSize:'1rem', fontFamily:'Noto Sans Devanagari, serif', color:'var(--text-muted)', lineHeight:1.4 }}>अनुभवः</span>
          <button className="btn-ghost" style={{ fontSize:'0.76rem', padding:'0.28rem 0.7rem' }} onClick={logout}>Exit</button>
        </div>
      </header>

      {/* ── Hero ── */}
      <div style={{ padding:'2.5rem 2rem 1.5rem', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div className="glow-orb" style={{ width:500, height:250, background: accentGlow, top:-60, left:'50%', transform:'translateX(-50%)' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <p style={{ fontSize:'0.75rem', letterSpacing:'0.26em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'0.7rem' }}>Welcome,</p>
          <h1 style={{ fontFamily:'Outfit,sans-serif', fontSize:'clamp(1.6rem,3vw,2.4rem)', fontWeight:800, letterSpacing:'-0.02em', color:'#f4f0ec', marginBottom:'0.6rem' }}>
            {project.title}
          </h1>
          <p style={{ fontSize:'0.88rem', color:'var(--text-secondary)', marginBottom:'1rem' }}>
            Crafted with excellence by <strong style={{ color:'#f4f0ec' }}>{B.name}</strong>
          </p>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', fontSize:'0.78rem', color:'var(--text-secondary)', background:'rgba(255,255,255,0.04)', border:'1px solid var(--bg-border)', borderRadius:100, padding:'0.35rem 1rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {clientOrg?.name}
          </div>
        </div>
      </div>

      {/* ── Device selector ── */}
      <div className="device-bar" style={{ background:'var(--bg-surface)', position:'relative', zIndex:10 }}>
        <div className="device-opts">
          {DEVICES.map(d => (
            <button
              key={d.id}
              className={`device-opt ${device === d.id ? 'active' : ''}`}
              style={device === d.id ? { background: accent, color:'#fff' } : {}}
              onClick={() => { setDevice(d.id); setActive(false); }}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
        <button className="btn-ghost" style={{ fontSize:'0.75rem', gap:'0.4rem' }} onClick={() => setFsOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          Full Screen
        </button>
      </div>

      {/* ── Preview ── */}
      <div style={{ flex:1, padding:'1.5rem 2rem 2rem', maxWidth:1280, margin:'0 auto', width:'100%' }}>
        <div className="preview-wrap">
          <div className="preview-toolbar">
            <div className="toolbar-dots"><div className="dot dot-r"/><div className="dot dot-y"/><div className="dot dot-g"/></div>
            <div className="toolbar-url" style={{ color: project.status === 'delivered' ? 'var(--text-muted)' : 'rgba(255,180,50,0.65)', background: project.status === 'delivered' ? 'var(--bg-base)' : 'rgba(255,180,50,0.04)' }}>
              {project.status === 'delivered' ? (project.previewUrl || 'No URL') : '🔒 Preview Mode — Confidential'}
            </div>
            {project.status === 'delivered' && project.previewUrl && (
              <a href={project.previewUrl} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize:'0.73rem', padding:'0.32rem 0.75rem' }}>
                Open Live ↗
              </a>
            )}
          </div>

          <div className={`iframe-area ${currentDevice.frameClass}`}>
            {!active ? (
              <div
                onClick={() => setActive(true)}
                style={{ position:'absolute', inset:0, background:'rgba(8,8,14,0.78)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'0.75rem', cursor:'pointer', zIndex:5, backdropFilter:'blur(8px)' }}
              >
                <div style={{ width:68, height:68, borderRadius:'50%', background:`linear-gradient(135deg,${accent},${accentSec})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 8px 32px ${accentGlow}` }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                <p style={{ fontFamily:'Outfit,sans-serif', fontWeight:600, color:'#f4f0ec' }}>Click to Preview</p>
                <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{currentDevice.label} view</span>
              </div>
            ) : null}
            {project.previewUrl && (
              <iframe
                src={project.previewUrl}
                title={project.title}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                style={{ width:'100%', height:'100%', border:'none', display:'block' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.6rem', padding:'1rem', borderTop:'1px solid var(--bg-border)', fontSize:'0.76rem', color:'var(--text-muted)', background: bgBase }}>
        <span>Powered by</span>
        <span style={{ fontFamily:'Noto Sans Devanagari, serif', fontSize:'0.88rem', color:'var(--text-secondary)' }}>अनुभवः</span>
        <span>·</span>
        <button className="btn-ghost" style={{ fontSize:'0.76rem', padding:'0.28rem 0.7rem' }} onClick={logout}>← Back</button>
      </footer>

      {/* ── Fullscreen Modal ── */}
      <div className={`fs-modal ${fsOpen ? 'open' : ''}`}>
        <div className="fs-modal-header">
          <span style={{ fontFamily:'Outfit,sans-serif', fontWeight:600, fontSize:'0.88rem' }}>{project.title} — Full Preview</span>
          <button className="btn-icon" onClick={() => setFsOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {project.previewUrl && fsOpen && (
          <iframe src={project.previewUrl} title="Full Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" style={{ flex:1, border:'none', width:'100%' }} />
        )}
      </div>
    </div>
  );
}
