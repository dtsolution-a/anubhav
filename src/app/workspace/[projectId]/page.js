'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { LayoutDashboard, FolderKanban, MessageSquare, LogOut, Monitor, Paperclip, Lock, Link as LinkIcon } from 'lucide-react';

export default function ProjectDetail({ params }) {
  const { projectId } = params;

  const [session, setSession]       = useState(null);
  const [project, setProject]       = useState(null);
  const [revisions, setRevisions]   = useState([]);
  const [notes, setNotes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [activeTab, setActiveTab]   = useState('preview');

  // Preview
  const [deviceFrame, setDeviceFrame]   = useState('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Revision state
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionTitle, setRevisionTitle] = useState('');
  const [revisionDesc, setRevisionDesc]   = useState('');
  const [revisionImg, setRevisionImg]     = useState('');
  const [expandedRevisionId, setExpandedRevisionId] = useState(null);

  // ── Role display label (no "owner" label shown) ─────────────────────────────
  const roleLabel = (type) => {
    if (type === 'owner')  return 'DT Solution';
    if (type === 'client') return 'Client';
    return 'Agency';
  };

  const [replyTexts, setReplyTexts] = useState({});   // per-revision reply text
  const [replyImgs, setReplyImgs] = useState({}); // per-revision attached images
  const [sendingReply, setSendingReply] = useState(false);

  // Notes state
  const [noteLabel, setNoteLabel] = useState('');
  const [noteValue, setNoteValue] = useState('');

  const fileInputRef      = useRef(null);
  const chatEndRefs       = useRef({});

  // ── Fetch all data ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessRes, projRes, revRes, notesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/revisions?projectId=${projectId}`),
        fetch(`/api/notes?projectId=${projectId}`)
      ]);

      if (!sessRes.ok) throw new Error('Failed to load session');
      setSession(await sessRes.json());

      if (!projRes.ok) throw new Error('Failed to load project');
      setProject(await projRes.json());

      if (revRes.ok)   setRevisions(await revRes.json());
      if (notesRes.ok) setNotes(await notesRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId, fetchData]);

  // Auto-scroll chat to bottom when expanded revision changes or thread updates
  useEffect(() => {
    if (expandedRevisionId && chatEndRefs.current[expandedRevisionId]) {
      chatEndRefs.current[expandedRevisionId].scrollIntoView({ behavior: 'smooth' });
    }
  }, [expandedRevisionId, revisions]);

  // ── Silent polling — fetch latest revision thread every 4s when open ──
  const pollRevision = useCallback(async (revId) => {
    try {
      const res = await fetch(`/api/revisions/${revId}`);
      if (!res.ok) return;
      const updated = await res.json();
      setRevisions(prev => {
        const existing = prev.find(r => (r._id || r.id) === revId);
        if (!existing) return prev;
        // Only update if thread length actually changed (new message came in)
        if ((updated.thread?.length || 0) !== (existing.thread?.length || 0)) {
          return prev.map(r => (r._id || r.id) === revId ? updated : r);
        }
        // Also update status if it changed
        if (updated.status !== existing.status) {
          return prev.map(r => (r._id || r.id) === revId ? updated : r);
        }
        return prev; // no change, don't re-render
      });
    } catch { /* silent fail */ }
  }, []);

  useEffect(() => {
    if (!expandedRevisionId) return;
    // Poll immediately once
    pollRevision(expandedRevisionId);
    // Then every 4 seconds
    const interval = setInterval(() => pollRevision(expandedRevisionId), 4000);
    return () => clearInterval(interval);
  }, [expandedRevisionId, pollRevision]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e, revId) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onloadend = () => setReplyImages(prev => ({ ...prev, [revId]: reader.result }));
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  // ── Raise new revision ──────────────────────────────────────────
  const submitRevision = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: revisionTitle, message: revisionDesc, imageUrl: revisionImg })
      });
      if (!res.ok) throw new Error('Failed to create revision');
      const newRev = await res.json();
      setRevisions(prev => [newRev, ...prev]);
      setIsRevisionModalOpen(false);
      setRevisionTitle(''); setRevisionDesc(''); setRevisionImg('');
      setExpandedRevisionId(newRev._id || newRev.id);
    } catch (err) {
      alert('Failed to submit revision');
    }
  };

  // ── Send reply (optimistic update) ─────────────────────────────
  const submitReply = async (revId) => {
    const msg = replyTexts[revId];
    const img = replyImgs[revId];
    if ((!msg && !img) || sendingReply) return;

    // optimistic
    const optId = Date.now().toString();
    const optimisticMsg = {
      _id: optId,
      _optimistic: true,
      authorOrgId: String(session?.orgId),
      authorType: session?.type,
      authorName: session?.org?.name || 'You',
      message: msg || 'Uploaded an image',
      imageUrl: img,
      timestamp: new Date().toISOString()
    };
    setRevisions(prev => prev.map(r => r.id === revId || r._id === revId ? { ...r, thread: [...(r.thread||[]), optimisticMsg] } : r));
    setReplyTexts(prev => ({ ...prev, [revId]: '' }));
    setReplyImgs(prev => ({ ...prev, [revId]: null }));
    setSendingReply(true);

    try {
      const res = await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _addMessage: { message: msg || 'Uploaded an image', imageUrl: img } })
      });
      if (!res.ok) throw new Error();
      const updatedRev = await res.json();
      // Replace optimistic with real data
      setRevisions(prev => prev.map(r => (r._id || r.id) === revId ? updatedRev : r));
    } catch {
      // Revert optimistic update
      setRevisions(prev => prev.map(r => {
        if ((r._id || r.id) !== revId) return r;
        return { ...r, thread: (r.thread || []).filter(m => !m._optimistic) };
      }));
      setReplyTexts(prev => ({ ...prev, [revId]: msg }));
      alert('Failed to post reply');
    } finally {
      setSendingReply(false);
    }
  };

  // ── Handle Enter to send ────────────────────────────────────────
  const handleReplyKeyDown = (e, revId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitReply(revId);
    }
  };

  // ── Update revision status ──────────────────────────────────────
  const updateRevisionStatus = async (revId, newStatus) => {
    try {
      const res = await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error();
      const updatedRev = await res.json();
      setRevisions(prev => prev.map(r => (r._id || r.id) === revId ? updatedRev : r));
    } catch {
      alert('Failed to update status');
    }
  };

  // ── Notes ───────────────────────────────────────────────────────
  const submitNote = async (e) => {
    e.preventDefault();
    if (!noteLabel || !noteValue) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, label: noteLabel, value: noteValue })
      });
      if (!res.ok) throw new Error();
      const newNote = await res.json();
      setNotes(prev => [...prev, newNote]);
      setNoteLabel(''); setNoteValue('');
    } catch { alert('Failed to add note'); }
  };

  const deleteNote = async (entryId) => {
    try {
      await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, entryId })
      });
      setNotes(prev => prev.filter(n => n.id !== entryId));
    } catch { alert('Failed to delete note'); }
  };

  const getDocIcon = (type) => {
    const map = { quotation: '📄', invoice: '💰', contract: '📋', nda: '🔒' };
    return map[type?.toLowerCase()] || '📎';
  };

  // ── Author color mapping ────────────────────────────────────────
  const authorColor = (type) => {
    if (type === 'owner')  return '#FF7035';
    if (type === 'client') return '#4facfe';
    return '#a8ff78'; // agency
  };

  // ── Loading / Error states ──────────────────────────────────────
  if (loading) return (
    <div className="sidebar-layout">
      <div className="main-content" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div className="spinner" style={{ width:36, height:36 }} />
      </div>
    </div>
  );

  if (error || !project) return (
    <div className="sidebar-layout">
      <div className="main-content">
        <div className="empty-state">
          <div className="empty-state-icon">⚠️</div>
          <h3 className="empty-state-title">Error Loading Project</h3>
          <p className="empty-state-sub">{error || 'Project not found'}</p>
          <Link href="/workspace" className="btn-primary" style={{ marginTop:'1.5rem', display:'inline-flex', textDecoration:'none' }}>← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );

  const branding = session?.org?.branding || { accentColor: '#FF7035', accentSecondary: '#FF9F00' };

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
          <Link href="/workspace" className="sidebar-nav-item">
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link href="/workspace" className="sidebar-nav-item active">
            <FolderKanban size={16} />
            Projects
          </Link>
          <Link href="/workspace" className="sidebar-nav-item">
            <MessageSquare size={16} />
            Revisions
          </Link>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <div style={{ fontFamily: 'Noto Sans Devanagari', fontSize:'0.9rem', color:'var(--accent)', marginBottom:'0.5rem' }}>अनुभवः</div>
          <button onClick={handleLogout} className="btn-ghost" style={{ width:'100%', justifyContent:'flex-start' }}>
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        {/* Back link */}
        <div style={{ marginBottom:'1.5rem' }}>
          <Link href="/workspace" style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', color:'var(--text-muted)', fontSize:'0.83rem', textDecoration:'none', transition:'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Page Header */}
        <header style={{ marginBottom:'2rem', paddingBottom:'1.5rem', borderBottom:'1px solid var(--bg-border)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap' }}>
            <div>
              <h1 className="page-title" style={{ marginBottom:'0.6rem' }}>{project.title}</h1>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
                <span className={`badge badge-${project.status?.toLowerCase()}`}>{project.status}</span>
                {project.previewUrl && (
                  <a href={project.previewUrl} target="_blank" rel="noreferrer"
                    style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', color:'var(--accent)', fontSize:'0.82rem', textDecoration:'none' }}>
                    Open Live ↗
                  </a>
                )}
                {project.deliveredOn && (
                  <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Delivered {project.deliveredOn}</span>
                )}
              </div>
              {project.description && (
                <p style={{ marginTop:'0.75rem', fontSize:'0.88rem', color:'var(--text-muted)', maxWidth:'600px', lineHeight:1.6 }}>{project.description}</p>
              )}
            </div>
            <div>
              <button 
                className="btn-primary" 
                style={{ display:'inline-flex', alignItems:'center', gap:'0.4rem', fontSize:'0.8rem', padding:'0.5rem 1rem' }}
                onClick={() => {
                  const url = `${window.location.origin}/experience?project=${project._id || project.id}&client=${project.clientCode || 'CODE'}`;
                  navigator.clipboard.writeText(url);
                  alert('Client Share URL copied to clipboard!');
                }}
              >
                <LinkIcon size={14} />
                Copy Client Link
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="tabs-bar" style={{ marginBottom:'2rem' }}>
          {[
            { key:'preview',   label:'Preview',    icon: <Monitor size={16} /> },
            { key:'documents', label:'Documents',  icon: <Paperclip size={16} /> },
            { key:'revisions', label:'Revisions',  icon: <MessageSquare size={16} />, count: revisions.filter(r => r.status === 'open' || r.status === 'in-progress').length },
            { key:'notes',     label:'Notes',      icon: <Lock size={16} /> },
          ].map(tab => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.count > 0 && (
                <span style={{ background:'var(--accent)', color:'#000', borderRadius:'100px', padding:'0 0.4rem', fontSize:'0.68rem', fontWeight:700, marginLeft:'0.2rem' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Preview Tab ── */}
        {activeTab === 'preview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }} className="animate-in">
            <div className="device-bar">
              <div className="device-opts">
                {[
                  { id:'desktop', label:'Desktop', icon:'🖥' },
                  { id:'air',     label:'MacBook Air', icon:'💻' },
                  { id:'pro',     label:'MacBook Pro', icon:'💻' },
                  { id:'ipad',    label:'iPad', icon:'📱' },
                  { id:'iphone',  label:'iPhone', icon:'📱' },
                ].map(d => (
                  <button key={d.id} className={`device-opt ${deviceFrame === d.id ? 'active' : ''}`} onClick={() => setDeviceFrame(d.id)}>
                    <span>{d.icon}</span>{d.label}
                  </button>
                ))}
              </div>
              <button className="btn-icon" onClick={() => setIsFullscreen(true)} title="Fullscreen">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
            </div>
            <div className="preview-wrap" style={{ minHeight:'60vh' }}>
              <div className="preview-toolbar">
                <div className="toolbar-dots">
                  <div className="dot dot-r"/><div className="dot dot-y"/><div className="dot dot-g"/>
                </div>
                <div className="toolbar-url">
                  {project.previewUrl || 'No preview URL set'}
                </div>
              </div>
              <div className={`iframe-area frame-${deviceFrame}`}>
                <iframe src={project.previewUrl || 'about:blank'} style={{ width:'100%', height:'100%', border:'none' }} title="Preview" />
              </div>
            </div>
          </div>
        )}

        {/* ── Documents Tab ── */}
        {activeTab === 'documents' && (
          <div className="animate-in">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
              <h2 className="section-title">Project Documents</h2>
              <span className="section-count">{project.documents?.length || 0} files</span>
            </div>
            {(!project.documents || project.documents.length === 0) ? (
              <div className="empty-state">
                <div className="empty-state-icon">📄</div>
                <h3 className="empty-state-title">No documents yet</h3>
                <p className="empty-state-sub">Ask your project manager to attach documents.</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                {project.documents.map((doc, idx) => (
                  <div key={idx} className="doc-item">
                    <div className="doc-icon" style={{ background:'var(--accent-light)', fontSize:'1.2rem' }}>{getDocIcon(doc.type)}</div>
                    <div style={{ flex:1 }}>
                      <div className="doc-label">{doc.label}</div>
                      <span className="doc-type badge" style={{ marginTop:'0.25rem', display:'inline-block' }}>{doc.type}</span>
                    </div>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="btn-ghost" style={{ fontSize:'0.8rem' }}>
                      Open ↗
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Revisions Tab ── */}
        {activeTab === 'revisions' && (
          <div className="animate-in">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'2rem' }}>
              <div>
                <h2 className="section-title" style={{ marginBottom:'0.25rem' }}>Revisions & Feedback</h2>
                <p style={{ fontSize:'0.83rem', color:'var(--text-muted)' }}>
                  {revisions.length === 0 ? 'No revisions raised yet.' : `${revisions.length} revision${revisions.length !== 1 ? 's' : ''} total`}
                </p>
              </div>
              <button className="btn-primary" onClick={() => setIsRevisionModalOpen(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Raise Revision
              </button>
            </div>

            {revisions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h3 className="empty-state-title">All Clear!</h3>
                <p className="empty-state-sub">No revisions have been raised for this project.</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
                {revisions.map(rev => {
                  const revId      = rev._id || rev.id;
                  const isExpanded = expandedRevisionId === revId;
                  const myOrgId    = session?.orgId;

                  return (
                    <div key={revId} className="rev-card" style={{ background:'var(--bg-surface)', border:'1px solid var(--bg-border)', borderRadius:'var(--radius-xl)', overflow:'hidden', transition:'border-color 0.2s, box-shadow 0.2s', boxShadow: isExpanded ? '0 8px 32px rgba(0,0,0,0.3)' : 'none' }}>
                      {/* Card Header */}
                      <div
                        className="rev-card-header"
                        style={{ padding:'1.25rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', background: isExpanded ? 'rgba(255,255,255,0.015)' : 'transparent', transition:'background 0.2s', userSelect:'none' }}
                        onClick={() => setExpandedRevisionId(isExpanded ? null : revId)}
                      >
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.35rem', flexWrap:'wrap' }}>
                            <strong style={{ fontSize:'1rem', fontWeight:600 }}>{rev.title}</strong>
                            <span className={`badge badge-${(rev.status || 'open').replace('-', '')}`}>{rev.status}</span>
                          </div>
                          <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                            Raised by{' '}
                            <span style={{ color:'var(--text-secondary)', fontWeight:500 }}>{rev.raisedByName || 'Unknown'}</span>
                            {' '}· {new Date(rev.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                            {' '}· {rev.thread?.length || 0} message{(rev.thread?.length || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginLeft:'1rem', flexShrink:0 }}>
                          <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition:'transform 0.25s ease', color:'var(--text-muted)' }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                      </div>

                      {/* Expanded chat */}
                      {isExpanded && (
                        <div style={{ borderTop:'1px solid var(--bg-border)' }}>
                          {/* Chat messages */}
                          <div
                            className="chat-container"
                            style={{ display:'flex', flexDirection:'column', gap:'1rem', padding:'1.5rem', maxHeight:'420px', overflowY:'auto' }}
                          >
                            {(rev.thread || []).length === 0 && (
                              <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', textAlign:'center', padding:'1rem' }}>No messages yet. Start the conversation below.</p>
                            )}
                            {(rev.thread || []).map((msg, i) => {
                              const isMe     = String(msg.authorOrgId) === String(myOrgId);
                              const color    = authorColor(msg.authorType);
                              const time     = new Date(msg.timestamp || msg.createdAt);
                              const isValid  = !isNaN(time.getTime());
                              const roleStr  = msg.authorType === 'owner' ? 'Saarthi - DT Solution' : msg.authorName;

                              return (
                                <div
                                  key={i}
                                  className={`chat-row ${isMe ? 'mine' : 'theirs'} chat-msg-in`}
                                  style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start', animationDelay:`${i * 0.04}s` }}
                                >
                                  <div className="chat-meta" style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:'0.3rem', display:'flex', gap:'0.4rem', alignItems:'center' }}>
                                    <span style={{ fontWeight:600, color }}>{roleStr}</span>
                                    <span style={{ color:'var(--bg-border-h)' }}>·</span>
                                    <span>{roleLabel(msg.authorType)}</span>
                                    {isValid && (
                                      <>
                                        <span style={{ color:'var(--bg-border-h)' }}>·</span>
                                        <span>{time.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                                      </>
                                    )}
                                    {msg._optimistic && <span style={{ opacity:0.5, fontStyle:'italic' }}>Sending…</span>}
                                  </div>
                                  <div
                                    className={`chat-bubble ${isMe ? 'mine' : 'theirs'}`}
                                    style={{
                                      padding:'0.85rem 1.15rem',
                                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                      maxWidth:'72%',
                                      fontSize:'0.88rem',
                                      lineHeight:1.55,
                                      wordBreak:'break-word',
                                      background: isMe ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.06)',
                                      color: isMe ? '#0a0807' : 'var(--text-primary)',
                                      border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                      opacity: msg._optimistic ? 0.7 : 1,
                                      transition:'opacity 0.3s',
                                    }}
                                  >
                                    {msg.message}
                                  </div>
                                  {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="attachment" style={{ maxWidth:'280px', marginTop:'0.5rem', borderRadius:'10px', border:'1px solid var(--bg-border)' }} />
                                  )}
                                </div>
                              );
                            })}
                            {/* Scroll anchor */}
                            <div ref={el => { if (el) chatEndRefs.current[revId] = el; }} />
                          </div>

                          {/* Status actions */}
                          {rev.status !== 'closed' && rev.status !== 'resolved' && (
                            <div style={{ display:'flex', gap:'0.5rem', padding:'0 1.5rem 0.75rem', flexWrap:'wrap' }}>
                              <button className="btn-ghost" style={{ fontSize:'0.78rem', padding:'0.4rem 0.85rem' }} onClick={() => updateRevisionStatus(revId, 'in-progress')}>
                                Mark In-Progress
                              </button>
                              <button className="btn-ghost" style={{ fontSize:'0.78rem', padding:'0.4rem 0.85rem' }} onClick={() => updateRevisionStatus(revId, 'resolved')}>
                                ✓ Resolve
                              </button>
                              <button className="btn-danger" style={{ fontSize:'0.78rem', padding:'0.4rem 0.85rem' }} onClick={() => updateRevisionStatus(revId, 'closed')}>
                                Close
                              </button>
                            </div>
                          )}

                          {/* Chat Input */}
                          {rev.status !== 'closed' && rev.status !== 'resolved' ? (
                            <div className="chat-input-bar" style={{ display:'flex', gap:'0.75rem', alignItems:'flex-end', padding:'1rem 1.5rem', background:'var(--bg-surface-2)', borderTop:'1px solid var(--bg-border)' }}>
                              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', transition: 'all 0.2s', flexShrink: 0 }}>
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setReplyImgs(prev => ({ ...prev, [revId]: reader.result }));
                                    reader.readAsDataURL(file);
                                  }
                                }} />
                                <Paperclip size={20} />
                              </label>
                              <textarea
                                className="chat-textarea"
                                placeholder="Type a message… (paste images) (Enter to send, Shift+Enter for new line)"
                                value={replyTexts[revId] || ''}
                                onChange={e => setReplyTexts(prev => ({ ...prev, [revId]: e.target.value }))}
                                onKeyDown={e => handleReplyKeyDown(e, revId)}
                                onPaste={e => handlePaste(e, revId)}
                                rows={1}
                                style={{ flex:1, minHeight:'44px', maxHeight:'120px', padding:'0.65rem 1.1rem', borderRadius:'22px', resize:'none', border:'1.5px solid var(--bg-border)', background:'var(--bg-base)', color:'var(--text-primary)', fontSize:'0.88rem', outline:'none', fontFamily:'inherit', lineHeight:1.5 }}
                              />
                              <button
                                onClick={() => submitReply(revId)}
                                disabled={(!replyTexts[revId]?.trim() && !replyImgs[revId]) || sendingReply}
                                style={{ width:'44px', height:'44px', borderRadius:'50%', background: (replyTexts[revId]?.trim() || replyImgs[revId]) ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)', color: (replyTexts[revId]?.trim() || replyImgs[revId]) ? '#000' : 'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s', cursor: (replyTexts[revId]?.trim() || replyImgs[revId]) ? 'pointer' : 'not-allowed', border:'none', boxShadow: (replyTexts[revId]?.trim() || replyImgs[revId]) ? '0 4px 12px var(--accent-glow)' : 'none' }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                              </button>
                            </div>
                          ) : (
                            <div style={{ padding:'1rem 1.5rem', background:'var(--bg-surface-2)', borderTop:'1px solid var(--bg-border)', fontSize:'0.82rem', color:'var(--text-muted)', textAlign:'center' }}>
                              This revision is {rev.status}. No further replies.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Notes Tab ── */}
        {activeTab === 'notes' && (
          <div className="animate-in">
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'1rem 1.25rem', background:'rgba(255,159,0,0.08)', border:'1px solid rgba(255,159,0,0.2)', borderRadius:'var(--radius-md)', marginBottom:'2rem' }}>
              <span style={{ fontSize:'1rem' }}>🔒</span>
              <div>
                <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--accent-secondary)', marginBottom:'0.1rem' }}>Private Notes</div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Only visible to your organization. Never shared with clients or the owner.</div>
              </div>
            </div>

            <h2 className="section-title" style={{ marginBottom:'1.5rem' }}>Private Notes</h2>

            <form onSubmit={submitNote} style={{ marginBottom:'2rem', display:'flex', flexDirection:'column', gap:'1rem', background:'var(--bg-surface-2)', padding:'1.5rem', borderRadius:'var(--radius-lg)', border:'1px solid var(--bg-border)' }}>
              <div className="form-group">
                <label className="form-label">Label</label>
                <input type="text" className="input" placeholder="e.g. Server Credentials" value={noteLabel} onChange={e => setNoteLabel(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Value</label>
                <textarea className="textarea" placeholder="Enter the note value…" value={noteValue} onChange={e => setNoteValue(e.target.value)} required style={{ fontFamily:'monospace', minHeight:'80px' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ alignSelf:'flex-start' }}>Add Note</button>
            </form>

            {notes.length === 0 ? (
              <p style={{ color:'var(--text-muted)', fontSize:'0.88rem' }}>No notes added yet.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                {notes.map(note => (
                  <div key={note.id} style={{ background:'var(--bg-surface)', border:'1px solid var(--bg-border)', borderRadius:'var(--radius-lg)', padding:'1.25rem 1.5rem', position:'relative' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
                      <div style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{note.label}</div>
                      <button onClick={() => deleteNote(note.id)} className="btn-danger" style={{ padding:'0.25rem 0.6rem', fontSize:'0.75rem' }}>Delete</button>
                    </div>
                    <div style={{ fontFamily:'monospace', fontSize:'0.85rem', whiteSpace:'pre-wrap', color:'var(--text-secondary)', background:'var(--bg-base)', padding:'0.85rem 1rem', borderRadius:'var(--radius-sm)' }}>
                      {note.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Raise Revision Modal ── */}
      {isRevisionModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRevisionModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Raise a Revision</span>
              <button className="btn-icon" onClick={() => setIsRevisionModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={submitRevision} className="modal-body">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input type="text" className="input" placeholder="e.g. Change hero section color" value={revisionTitle} onChange={e => setRevisionTitle(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="textarea" placeholder="Describe what needs to be changed…" value={revisionDesc} onChange={e => setRevisionDesc(e.target.value)} required style={{ minHeight:'100px' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Attachment (Optional)</label>
                <input type="file" className="input" accept="image/*" onChange={e => handleFileChange(e, setRevisionImg)} ref={fileInputRef} />
                {revisionImg && <img src={revisionImg} alt="Preview" style={{ marginTop:'0.5rem', maxHeight:'120px', borderRadius:'8px' }} />}
              </div>
              <div className="modal-footer" style={{ padding:0, borderTop:'none', justifyContent:'flex-end', display:'flex', gap:'0.75rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setIsRevisionModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Revision</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Fullscreen Preview Modal ── */}
      {isFullscreen && (
        <div style={{ position:'fixed', inset:0, backgroundColor:'#000', zIndex:1000, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'0.75rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-surface)', borderBottom:'1px solid var(--bg-border)' }}>
            <span style={{ fontSize:'0.88rem', color:'var(--text-secondary)' }}>{project.title} — Full Preview</span>
            <button className="btn-ghost" onClick={() => setIsFullscreen(false)}>✕ Close</button>
          </div>
          <iframe src={project.previewUrl || 'about:blank'} style={{ flex:1, border:'none', width:'100%' }} title="Fullscreen Preview" />
        </div>
      )}
    </div>
  );
}
