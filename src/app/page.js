'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css';

export default function LandingPage() {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [shake, setShake]     = useState(false);
  const inputRef = useRef(null);
  const router   = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get('access');
    if (access) {
      try {
        const decoded = atob(access);
        setCode(decoded);
        handleSubmit(null, decoded);
      } catch (err) {
        triggerError('Invalid access link.');
      }
    } else {
      inputRef.current?.focus();
    }
  }, []);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0a0807', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#fff', textAlign:'center', padding:'2rem' }}>
      <span className="spinner" style={{ width:40, height:40, marginBottom:'2rem' }} />
      <h2 style={{ fontSize:'1.5rem', fontWeight:600, color:'var(--accent)', marginBottom:'0.5rem', fontFamily:'serif', letterSpacing:'1px' }}>अ न भ व :</h2>
      <p style={{ fontSize:'0.9rem', color:'var(--text-muted)', maxWidth:'300px', lineHeight:1.5 }}>Patience is the key to accomplishing everything.</p>
    </div>
  );

  async function handleSubmit(e, overrideCode) {
    e?.preventDefault();
    const finalCode = (overrideCode || code || '').toString();
    const trimmed = finalCode.trim().toUpperCase();
    if (!trimmed) { triggerError('Please enter your Experience ID.'); return; }

    setLoading(true);
    setError('');

    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) { triggerError(data.error || 'Invalid ID.'); setLoading(false); return; }

      // Redirect to appropriate portal
      router.push(data.redirect);
    } catch {
      triggerError('Connection error. Please try again.');
      setLoading(false);
    }
  }

  function triggerError(msg) {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div className={styles.page}>
      <div className="bg-grid" />
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div className={`${styles.content} animate-in`}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.wordmark}>
            <span className={`sanskrit-text ${styles.sanskrit}`}>अनुभवः</span>
            <span className={styles.roman}>Anubhavaḥ</span>
          </div>
          <p className={styles.descriptor}>Experience Centre</p>
        </div>

        {/* ID Entry Card */}
        <div className={`${styles.card} ${shake ? styles.shake : ''}`}>
          <p className={styles.cardLabel}>Enter your Experience ID to continue</p>
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              type="text"
              className={`input ${styles.codeInput}`}
              placeholder="e.g. EXP-2025-XX"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={handleKey}
              autoComplete="off"
              spellCheck={false}
              maxLength={12}
              disabled={loading}
            />
            <button
              className={`btn-primary ${styles.submitBtn}`}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <span className="spinner" style={{ width:18, height:18 }} /> : (
                <>
                  <span>Enter</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <p className={styles.footer}>
          Powered by <span style={{ fontFamily: 'var(--font-deva)', fontSize: '1rem' }}>अनुभवः</span> &nbsp;·&nbsp; Secured access only
        </p>
      </div>
    </div>
  );
}
