'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // Revisions State
  const [revisions, setRevisions] = useState([]);
  const [showRevModal, setShowRevModal] = useState(false);
  const [revTitle, setRevTitle] = useState('');
  const [revDesc, setRevDesc] = useState('');
  const [replyText, setReplyText] = useState({});
  const [expandedRevId, setExpandedRevId] = useState(null);

  const router = useRouter();
  const fsRef  = useRef(null);

  useEffect(() => {
    fetch('/api/experience')
      .then(r => {
        if (r.status === 401 || r.status === 403) { router.push('/'); return null; }
        return r.json();
      })
      .then(d => { 
        if (d) {
          setData(d); 
          // Fetch revisions for this project
          if (d.project?._id) {
            fetch(`/api/revisions?projectId=${d.project._id}`)
              .then(res => res.json())
              .then(revs => setRevisions(revs))
              .catch(console.error);
          }
        } 
      })
      .catch(() => setError('Failed to load experience data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setFsOpen(false); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Silent polling: auto-fetch open revision thread every 4 seconds ──
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
    if (!expandedRevId) return;
    pollRevision(expandedRevId);
    const interval = setInterval(() => pollRevision(expandedRevId), 4000);
    return () => clearInterval(interval);
  }, [expandedRevId, pollRevision]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  const handleRaiseRevision = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: data.project._id, title: revTitle, message: revDesc })
      });
      if (!res.ok) throw new Error();
      const newRev = await res.json();
      setRevisions(prev => [newRev, ...prev]);
      setRevTitle('');
      setRevDesc('');
      setExpandedRevId(newRev._id || newRev.id);
    } catch (err) {
      alert('Failed to raise revision');
    }
  };

  const handleReplyRevision = async (revId) => {
    const msg = replyText[revId];
    if (!msg) return;
    try {
      const res = await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _addMessage: { message: msg } })
      });
      if (!res.ok) throw new Error();
      const updatedRev = await res.json();
      setRevisions(prev => prev.map(r => (r._id || r.id) === revId ? updatedRev : r));
      setReplyText({ ...replyText, [revId]: '' });
    } catch (err) {
      alert('Failed to post reply');
    }
  };

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
          <button 
            className="btn-ghost" 
            style={{ fontSize:'0.76rem', padding:'0.4rem 1rem', display:'flex', alignItems:'center', gap:'0.4rem', border:`1px solid ${accentLt}`, color: accent }} 
            onClick={() => setShowRevModal(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Revisions
          </button>
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

      {/* ── Revisions Modal ── */}
      {showRevModal && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', justifyContent:'flex-end', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}>
          <div style={{ width:'100%', maxWidth:'500px', height:'100%', background: bgBase, borderLeft:`1px solid ${accentLt}`, display:'flex', flexDirection:'column', boxShadow:'-10px 0 40px rgba(0,0,0,0.3)', animation:'slideInRight 0.3s ease' }}>
            <div style={{ padding:'1.5rem', borderBottom:'1px solid var(--bg-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontFamily:'Outfit,sans-serif', fontSize:'1.2rem', fontWeight:600, color:'#fff', margin:0 }}>Revisions & Feedback</h2>
              <button className="btn-icon" onClick={() => setShowRevModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div style={{ flex:1, overflowY:'auto', padding:'1.5rem' }}>
              <form onSubmit={handleRaiseRevision} style={{ background:'rgba(255,255,255,0.02)', padding:'1.25rem', borderRadius:'12px', border:`1px solid ${accentLt}`, marginBottom:'2rem' }}>
                <h3 style={{ fontSize:'0.9rem', color:'#fff', marginBottom:'1rem', marginTop:0 }}>Raise New Revision</h3>
                <input type="text" className="input" placeholder="Title (e.g. Change logo color)" value={revTitle} onChange={e => setRevTitle(e.target.value)} required style={{ marginBottom:'0.75rem', background:'rgba(0,0,0,0.3)' }} />
                <textarea className="textarea" placeholder="Describe the changes needed..." value={revDesc} onChange={e => setRevDesc(e.target.value)} required style={{ minHeight:'80px', marginBottom:'1rem', background:'rgba(0,0,0,0.3)' }}></textarea>
                <button type="submit" className="btn-primary" style={{ width:'100%', background: accent, color:'#000' }}>Submit Revision</button>
              </form>

              <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                {revisions.map(rev => {
                  const revId = rev._id || rev.id;
                  const isExpanded = expandedRevId === revId;
                  return (
                    <div key={revId} style={{ background:'rgba(255,255,255,0.02)', borderRadius:'12px', border:'1px solid rgba(255,255,255,0.05)', overflow:'hidden' }}>
                      <div 
                        style={{ padding:'1.25rem', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                        onClick={() => setExpandedRevId(isExpanded ? null : revId)}
                      >
                        <div>
                          <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginBottom:'0.25rem' }}>
                            <strong style={{ color:'#fff', fontSize:'0.95rem' }}>{rev.title}</strong>
                            <span style={{ fontSize:'0.65rem', padding:'0.15rem 0.5rem', borderRadius:'100px', background: rev.status==='resolved'?'#a8ff78':(rev.status==='closed'?'#333':accentLt), color:rev.status==='resolved'?'#000':(rev.status==='closed'?'#888':accent), textTransform:'uppercase', fontWeight:600 }}>{rev.status}</span>
                          </div>
                          <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{new Date(rev.createdAt).toLocaleDateString()}</div>
                        </div>
                        <span style={{ color:'var(--text-muted)', fontSize:'0.8rem', transform: isExpanded ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>▼</span>
                      </div>

                      {isExpanded && (
                        <div style={{ padding:'1.25rem', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display:'flex', flexDirection:'column', gap:'1rem', marginBottom:'1.5rem' }}>
                            {(rev.thread || []).map((msg, i) => {
                              const isMe = msg.authorType === 'client';
                              return (
                                <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth:'85%' }}>
                                  <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:'0.25rem', display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap:'0.4rem' }}>
                                    <strong style={{ color: isMe ? accent : '#fff' }}>{msg.authorName}</strong>
                                    <span>{new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                  </div>
                                  <div style={{ 
                                    padding:'0.75rem 1rem', 
                                    background: isMe ? accent : 'rgba(255,255,255,0.08)', 
                                    color: isMe ? '#000' : '#fff',
                                    borderRadius:'12px',
                                    borderBottomRightRadius: isMe ? '2px' : '12px',
                                    borderBottomLeftRadius: isMe ? '12px' : '2px',
                                    fontSize:'0.85rem',
                                    lineHeight:1.4
                                  }}>
                                    {msg.message}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {rev.status !== 'closed' && rev.status !== 'resolved' && (
                            <div style={{ display:'flex', gap:'0.5rem', alignItems:'flex-end' }}>
                              <textarea 
                                className="textarea" 
                                placeholder="Reply..." 
                                value={replyText[revId] || ''} 
                                onChange={e => setReplyText({...replyText, [revId]: e.target.value})} 
                                style={{ flex:1, minHeight:'44px', padding:'0.6rem 1rem', borderRadius:'24px', background:'rgba(0,0,0,0.3)' }}
                              ></textarea>
                              <button className="btn-primary" onClick={() => handleReplyRevision(revId)} style={{ background:accent, color:'#000', borderRadius:'50%', width:'44px', height:'44px', padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}} />
    </div>
  );
}
