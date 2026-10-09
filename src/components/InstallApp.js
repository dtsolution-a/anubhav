'use client';
import { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

// "Install app" card for the login page. Android/Chrome get a one-tap install,
// iPhone/iPad (Safari has no install API) get the Add to Home Screen steps.
export default function InstallApp() {
  const [deferred, setDeferred] = useState(null);
  const [mode, setMode] = useState(null); // 'native' | 'ios' | null
  const [steps, setSteps] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem('anx_install_dismissed') === '1') setHidden(true); } catch {}
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) { setHidden(true); return; }

    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    if (isIos) setMode('ios');

    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); setMode('native'); };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden || !mode) return null;

  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem('anx_install_dismissed', '1'); } catch {}
  };

  async function install() {
    if (mode === 'native' && deferred) {
      deferred.prompt();
      await deferred.userChoice.catch(() => {});
      setDeferred(null);
      setHidden(true);
    } else {
      setSteps(s => !s);
    }
  }

  return (
    <div className="install-card">
      <button className="install-x" onClick={dismiss} aria-label="Dismiss"><X size={16} /></button>
      <div className="install-row">
        <div className="install-icon"><Download size={20} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="install-title">Get the app</div>
          <div className="install-sub">Install अनुभवः on your phone for one-tap access.</div>
        </div>
        <button className="btn-primary install-btn" onClick={install}>{mode === 'ios' ? (steps ? 'Hide' : 'How?') : 'Install'}</button>
      </div>
      {mode === 'ios' && steps && (
        <ol className="install-steps">
          <li>Open this page in <b>Safari</b>.</li>
          <li>Tap the <b>Share</b> button <Share size={14} style={{ verticalAlign: '-2px' }} /> at the bottom.</li>
          <li>Choose <b>Add to Home Screen</b> <PlusSquare size={14} style={{ verticalAlign: '-2px' }} />, then tap <b>Add</b>.</li>
        </ol>
      )}
    </div>
  );
}
