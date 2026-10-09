'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/lib/useDesktop';
import ClientMobileApp from '@/components/ClientMobileApp';

// The client portal: chat-style app on phones, two-pane app (plus live preview) on laptops.
export default function ExperiencePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const narrow = useIsMobile(700);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/experience')
      .then(r => {
        if (r.status === 401 || r.status === 403) { router.push('/'); return null; }
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .catch(() => setError('Failed to load experience data.'))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  if (loading || narrow === null) return (
    <div style={{ minHeight: '100dvh', background: '#0a0807', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: '2rem' }}>
      <span className="spinner" style={{ width: 40, height: 40, marginBottom: '2rem' }} />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '0.5rem', fontFamily: 'serif', letterSpacing: '1px' }}>धैर्यं सर्वत्र साधनम्।</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '300px', lineHeight: 1.5 }}>Patience is the key to accomplishing everything.</p>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: '100dvh', background: '#0a0807', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a09890', fontFamily: 'Inter,sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '1rem' }}>{error || 'Experience not found.'}</p>
        <button className="btn-ghost" onClick={() => router.push('/')}>← Back</button>
      </div>
    </div>
  );

  const { project, clientOrg, brand } = data;
  const B = brand || {};
  const accent = B.accentColor || '#FF7035';
  const accentLt = /^#[0-9a-f]{6}$/i.test(accent) ? `${accent}22` : (B.accentLight || 'rgba(255,112,53,0.1)');

  return (
    <div style={{ '--accent': accent, '--accent-secondary': B.accentSecondary || '#FF9F00', '--accent-glow': B.accentGlow || 'rgba(255,112,53,0.28)', '--accent-light': accentLt }}>
      <ClientMobileApp
        layout={narrow ? 'mobile' : 'desktop'}
        project={project}
        clientOrg={clientOrg}
        brand={B}
        accent={accent}
        accentLt={accentLt}
        bgBase={B.bgBase || '#0a0807'}
        onLogout={logout}
      />
    </div>
  );
}
