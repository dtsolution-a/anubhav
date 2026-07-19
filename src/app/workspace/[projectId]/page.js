'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function ProjectDetail({ params }) {
  const { projectId } = params;
  
  const [session, setSession] = useState(null);
  const [project, setProject] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('preview');
  
  // Preview State
  const [deviceFrame, setDeviceFrame] = useState('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Revision State
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionTitle, setRevisionTitle] = useState('');
  const [revisionDesc, setRevisionDesc] = useState('');
  const [revisionImg, setRevisionImg] = useState('');
  const [expandedRevisionId, setExpandedRevisionId] = useState(null);
  const [replyText, setReplyText] = useState('');
  
  // Notes State
  const [noteLabel, setNoteLabel] = useState('');
  const [noteValue, setNoteValue] = useState('');
  
  const fileInputRef = useRef(null);
  const replyFileInputRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [sessRes, projRes, revRes, notesRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/revisions?projectId=${projectId}`),
          fetch(`/api/notes?projectId=${projectId}`)
        ]);

        if (!sessRes.ok) throw new Error('Failed to load session');
        const sess = await sessRes.json();
        setSession(sess);

        if (!projRes.ok) throw new Error('Failed to load project');
        const proj = await projRes.json();
        setProject(proj);

        if (revRes.ok) {
          const revs = await revRes.json();
          setRevisions(revs);
        }
        
        if (notesRes.ok) {
          const nts = await notesRes.json();
          setNotes(nts);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleFileChange = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Mock upload - in reality would POST /api/upload
        setter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitRevision = async (e) => {
    e.preventDefault();
    try {
      // Mocking actual API call since /api/upload is mentioned but /api/revisions takes imageUrl
      const newRevRes = await fetch('/api/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          title: revisionTitle, 
          message: revisionDesc, 
          imageUrl: revisionImg 
        })
      });
      if (!newRevRes.ok) throw new Error('Failed to create revision');
      const newRev = await newRevRes.json();
      setRevisions([newRev, ...revisions]);
      setIsRevisionModalOpen(false);
      setRevisionTitle('');
      setRevisionDesc('');
      setRevisionImg('');
    } catch (err) {
      console.error(err);
      alert('Failed to submit revision');
    }
  };

  const submitReply = async (revId) => {
    if (!replyText.trim()) return;
    try {
      const replyRes = await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _addMessage: { message: replyText, imageUrl: null } // skipping img for reply for brevity
        })
      });
      if (!replyRes.ok) throw new Error('Failed to post reply');
      const updatedRev = await replyRes.json();
      setRevisions(revisions.map(r => r.id === revId ? updatedRev : r));
      setReplyText('');
    } catch (err) {
      console.error(err);
      alert('Failed to post reply');
    }
  };

  const updateRevisionStatus = async (revId, newStatus) => {
    try {
      const res = await fetch(`/api/revisions/${revId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updatedRev = await res.json();
      setRevisions(revisions.map(r => r.id === revId ? updatedRev : r));
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const submitNote = async (e) => {
    e.preventDefault();
    if (!noteLabel || !noteValue) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, label: noteLabel, value: noteValue })
      });
      if (!res.ok) throw new Error('Failed to add note');
      const newNote = await res.json();
      setNotes([...notes, newNote]);
      setNoteLabel('');
      setNoteValue('');
    } catch (err) {
      console.error(err);
      alert('Failed to add note');
    }
  };

  const deleteNote = async (entryId) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, entryId })
      });
      if (!res.ok) throw new Error('Failed to delete note');
      setNotes(notes.filter(n => n.id !== entryId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete note');
    }
  };

  const getDocIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'quotation': return '📄';
      case 'invoice': return '💰';
      case 'contract': return '📋';
      case 'nda': return '🔒';
      default: return '📎';
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

  if (error || !project) {
    return (
      <div className="sidebar-layout">
        <div className="main-content">
          <div className="empty-state">
            <h3 className="empty-state-title">Error Loading Project</h3>
            <p className="empty-state-sub">{error || 'Project not found'}</p>
            <Link href="/workspace" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}>Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const branding = session?.org?.branding || { accentColor: '#FF7035', accentSecondary: '#FF9F00' };

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
          <Link href="/workspace" className="sidebar-nav-item">Dashboard</Link>
          <Link href="/workspace" className="sidebar-nav-item">Projects</Link>
          <Link href="/workspace" className="sidebar-nav-item">Revisions</Link>
        </nav>
        
        <div className="sidebar-spacer"></div>
        
        <div className="sidebar-footer">
          <div style={{ fontFamily: 'Noto Sans Devanagari', marginBottom: '1rem', color: 'var(--accent)' }}>अनुभवः</div>
          <button onClick={handleLogout} className="btn-ghost" style={{ width: '100%', textAlign: 'left' }}>
            Logout
          </button>
        </div>
      </div>

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="bg-grid"></div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/workspace" style={{ color: '#888', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span>&larr;</span> Back to Dashboard
          </Link>
        </div>

        <header className="page-header animate-in" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>{project.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className={`badge badge-${project.status.toLowerCase()}`}>{project.status}</span>
                {project.status === 'delivered' && project.previewUrl && (
                  <a href={project.previewUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '0.9rem', textDecoration: 'none' }}>
                    Open External &#8599;
                  </a>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="tabs-bar animate-in" style={{ animationDelay: '0.1s' }}>
          <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
          <button className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>Documents</button>
          <button className={`tab-btn ${activeTab === 'revisions' ? 'active' : ''}`} onClick={() => setActiveTab('revisions')}>Revisions</button>
          <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>Notes</button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="animate-in" style={{ animationDelay: '0.2s', flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {activeTab === 'preview' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="device-bar">
                <div className="device-opts">
                  <button className={`device-opt ${deviceFrame === 'desktop' ? 'active' : ''}`} onClick={() => setDeviceFrame('desktop')}>Desktop</button>
                  <button className={`device-opt ${deviceFrame === 'air' ? 'active' : ''}`} onClick={() => setDeviceFrame('air')}>MacBook Air</button>
                  <button className={`device-opt ${deviceFrame === 'pro' ? 'active' : ''}`} onClick={() => setDeviceFrame('pro')}>MacBook Pro</button>
                  <button className={`device-opt ${deviceFrame === 'ipad' ? 'active' : ''}`} onClick={() => setDeviceFrame('ipad')}>iPad</button>
                  <button className={`device-opt ${deviceFrame === 'iphone' ? 'active' : ''}`} onClick={() => setDeviceFrame('iphone')}>iPhone 16</button>
                </div>
                <button className="btn-icon" onClick={() => setIsFullscreen(true)} title="Fullscreen">⛶</button>
              </div>

              <div className="preview-wrap" style={{ flex: 1, minHeight: '600px' }}>
                <div className="preview-toolbar">
                  <div className="toolbar-dots">
                    <div className="dot dot-r"></div>
                    <div className="dot dot-y"></div>
                    <div className="dot dot-g"></div>
                  </div>
                  <div className="toolbar-url">
                    {project.status === 'delivered' ? project.previewUrl || 'about:blank' : 'Preview Mode — Confidential'}
                  </div>
                </div>
                <div className={`iframe-area frame-${deviceFrame}`}>
                  <iframe src={project.previewUrl || 'about:blank'} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview"></iframe>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="card">
              <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Project Documents</h2>
              {(!project.documents || project.documents.length === 0) ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📄</div>
                  <h3 className="empty-state-title">No documents attached yet.</h3>
                  <p className="empty-state-sub">Ask your project manager.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {project.documents.map((doc, idx) => (
                    <div key={idx} className="doc-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="doc-icon" style={{ fontSize: '1.5rem' }}>{getDocIcon(doc.type)}</span>
                        <div>
                          <div className="doc-label" style={{ fontWeight: 500 }}>{doc.label}</div>
                          <span className="doc-type badge" style={{ fontSize: '0.7rem', marginTop: '0.25rem', display: 'inline-block' }}>{doc.type}</span>
                        </div>
                      </div>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="btn-ghost">Open</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'revisions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}>Revisions & Feedback</h2>
                <button className="btn-primary" onClick={() => setIsRevisionModalOpen(true)}>Raise Revision</button>
              </div>

              {revisions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💬</div>
                  <h3 className="empty-state-title">No Revisions</h3>
                  <p className="empty-state-sub">Everything looks good! Raise a revision if you need changes.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {revisions.map(rev => (
                    <div key={rev.id} className="card-sm">
                      <div 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                        onClick={() => setExpandedRevisionId(expandedRevisionId === rev.id ? null : rev.id)}
                      >
                        <div>
                          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{rev.title}</h3>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#888' }}>
                            <span>By: {rev.raisedBy || 'Agency'}</span>
                            <span>Date: {new Date(rev.createdAt).toLocaleDateString()}</span>
                            <span>{rev.messages?.length || 0} messages</span>
                          </div>
                        </div>
                        <span className={`badge badge-${rev.status.toLowerCase()}`}>{rev.status}</span>
                      </div>

                      {expandedRevisionId === rev.id && (
                        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            {(rev.messages || []).map((msg, i) => {
                              const isMe = msg.authorOrgId === session?.orgId;
                              return (
                                <div key={i} className={`thread-msg ${isMe ? 'by-me' : ''}`} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem', color: '#888' }}>
                                    <span className="thread-author">{msg.authorName}</span>
                                    <span className="thread-time">{new Date(msg.timestamp || Date.now()).toLocaleTimeString()}</span>
                                  </div>
                                  <div className="thread-text" style={{ padding: '0.75rem', backgroundColor: isMe ? 'var(--accent)' : '#1a1614', borderRadius: '8px', color: isMe ? '#000' : '#fff' }}>
                                    {msg.message}
                                  </div>
                                  {msg.imageUrl && (
                                    <img src={msg.imageUrl} alt="attachment" className="thread-img" style={{ maxWidth: '100%', marginTop: '0.5rem', borderRadius: '4px' }} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          
                          {rev.status !== 'closed' && rev.status !== 'resolved' && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                              <textarea 
                                className="textarea" 
                                placeholder="Type a reply..." 
                                value={replyText} 
                                onChange={(e) => setReplyText(e.target.value)}
                                style={{ minHeight: '80px' }}
                              ></textarea>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button className="btn-primary" onClick={() => submitReply(rev.id)}>Reply</button>
                                  <button className="btn-ghost" onClick={() => updateRevisionStatus(rev.id, 'resolved')}>Mark Resolved</button>
                                  <button className="btn-danger" onClick={() => updateRevisionStatus(rev.id, 'closed')}>Close</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="card">
              <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 159, 0, 0.1)', border: '1px solid rgba(255, 159, 0, 0.3)', borderRadius: '8px', color: 'var(--accent-secondary)', marginBottom: '2rem' }}>
                <strong>Note:</strong> These notes are private to your organization only.
              </div>

              <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Private Notes</h2>
              
              <form onSubmit={submitNote} style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#110e0c', padding: '1.5rem', borderRadius: '8px' }}>
                <div className="form-group">
                  <label className="form-label">Label (e.g. Server Credentials)</label>
                  <input type="text" className="input" value={noteLabel} onChange={(e) => setNoteLabel(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Value</label>
                  <textarea className="textarea" value={noteValue} onChange={(e) => setNoteValue(e.target.value)} required style={{ fontFamily: 'monospace' }}></textarea>
                </div>
                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>Add Note</button>
              </form>

              {notes.length === 0 ? (
                <p style={{ color: '#888' }}>No private notes yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {notes.map(note => (
                    <div key={note.id} className="note-entry" style={{ backgroundColor: '#1a1614', padding: '1rem', borderRadius: '8px', position: 'relative' }}>
                      <button 
                        onClick={() => deleteNote(note.id)} 
                        className="btn-danger" 
                        style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        Delete
                      </button>
                      <div className="note-label" style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>{note.label}</div>
                      <div className="note-value" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#ccc', backgroundColor: '#0a0807', padding: '1rem', borderRadius: '4px' }}>
                        {note.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Revision Modal */}
      {isRevisionModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-box card" style={{ width: '100%', maxWidth: '500px' }}>
            <div className="modal-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Raise Revision</h2>
              <button onClick={() => setIsRevisionModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            <form onSubmit={submitRevision} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input type="text" className="input" value={revisionTitle} onChange={(e) => setRevisionTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="textarea" value={revisionDesc} onChange={(e) => setRevisionDesc(e.target.value)} required style={{ minHeight: '100px' }}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Attachment (Optional)</label>
                <input type="file" className="input" accept="image/*" onChange={(e) => handleFileChange(e, setRevisionImg)} ref={fileInputRef} />
                {revisionImg && <img src={revisionImg} alt="Preview" style={{ marginTop: '0.5rem', maxHeight: '100px', borderRadius: '4px' }} />}
              </div>
              <div className="modal-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setIsRevisionModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Submit Revision</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {isFullscreen && (
        <div className="fs-modal open" style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div className="fs-modal-header" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111' }}>
            <div style={{ color: '#888' }}>{project?.title} - Preview</div>
            <button className="btn-ghost" onClick={() => setIsFullscreen(false)}>Close Fullscreen</button>
          </div>
          <div style={{ flex: 1 }}>
            <iframe src={project?.previewUrl || 'about:blank'} style={{ width: '100%', height: '100%', border: 'none' }} title="Fullscreen Preview"></iframe>
          </div>
        </div>
      )}

    </div>
  );
}
