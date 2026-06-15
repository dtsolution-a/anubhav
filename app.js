// ============================================================
//  अनुभवः — Anubhavah | Core App Logic
//  All data hardcoded as per initial build phase
// ============================================================

// ── SESSION MANAGEMENT (ID never goes in URL) ────────────────
const _SID = 'anx_s'; // obscure key name

function _setSession(id) {
  try { sessionStorage.setItem(_SID, btoa(id)); } catch(e) {}
}

function _getSession() {
  try { const v = sessionStorage.getItem(_SID); return v ? atob(v) : null; } catch(e) { return null; }
}

function _clearSession() {
  try { sessionStorage.removeItem(_SID); } catch(e) {}
}

// ── DEVICE CONFIGURATIONS ────────────────────────────────────
const DEVICES = [
  { id: 'desktop',     label: 'Desktop',       icon: 'monitor', frameClass: 'device-desktop' },
  { id: 'macbook_air', label: 'MacBook Air',   icon: 'laptop',  frameClass: 'device-laptop-air' },
  { id: 'macbook_pro', label: 'MacBook Pro',   icon: 'laptop',  frameClass: 'device-laptop-pro' },
  { id: 'ipad',        label: 'iPad Pro',      icon: 'tablet',  frameClass: 'device-ipad' },
  { id: 'iphone16',    label: 'iPhone 16',     icon: 'phone',   frameClass: 'device-iphone' },
  { id: 'iphone16max', label: 'iPhone 16 Max', icon: 'phone',   frameClass: 'device-iphone-max' },
];

const DEVICE_ICONS = {
  monitor: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>`,
  laptop:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55A1 1 0 0 1 20.37 20H3.63a1 1 0 0 1-.9-1.45L4 16"/></svg>`,
  tablet:  `<svg width="13" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  phone:   `<svg width="11" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
};

// ── DATA REGISTRY ────────────────────────────────────────────

const BRANDS = {
  dt_solution: {
    id: 'dt_solution',
    name: 'DT Solution',
    tagline: 'Transforming visions into reality',
    accentColor: '#FF2200',
    accentSecondary: '#FF5500',
    accentGradient: 'linear-gradient(135deg,#FF2200 0%,#FF5500 100%)',
    accentGlow: 'rgba(255,34,0,0.32)',
    accentLight: 'rgba(255,34,0,0.1)',
    logoText: 'DTS',
    logoSubText: 'DT Solution',
    expLabel: 'DT Solution Experience Centre',
    expSubLabel: 'Crafted with precision by DT Solution',
    bgBase: '#050505',
  },
  medialoop: {
    id: 'medialoop',
    name: 'Medialoop',
    tagline: 'We engineer digital systems that think, grow, and outperform',
    accentColor: '#FF2D6B',
    accentSecondary: '#FF6B00',
    accentGradient: 'linear-gradient(135deg,#FF2D6B 0%,#FF6B00 100%)',
    accentGlow: 'rgba(255,45,107,0.32)',
    accentLight: 'rgba(255,45,107,0.1)',
    logoText: 'ML',
    logoSubText: 'Medialoop',
    expLabel: 'Medialoop Experience Centre',
    expSubLabel: 'Crafted with excellence by Medialoop',
    bgBase: '#080810',
  },
};

const ID_REGISTRY = {
  // ── CLIENT IDs ─────────────────────────────────────────────
  CL22MDL: {
    type: 'client',
    entityName: 'Medialoop',
    ownerBrand: BRANDS.dt_solution,
    previewUrl: 'https://experience-psi.vercel.app/',
    previewLabel: 'Medialoop — Website Preview',
    isActive: true, // under dev → no URL, no Open Live
  },
  CL31BBM: {
    type: 'client',
    entityName: 'BBM',
    ownerBrand: BRANDS.medialoop,
    previewUrl: 'https://bbm-eight.vercel.app/',
    previewLabel: 'BBM — Website Preview',
    isActive: true, // under dev → no URL, no Open Live
  },
  CL32SHAH: {
    type: 'client',
    entityName: 'Shah',
    ownerBrand: BRANDS.medialoop,
    previewUrl: 'https://shah-omega.vercel.app/',
    previewLabel: 'Shah — Website Preview',
    isActive: true, // under dev → no URL, no Open Live
  },

  // ── AGENCY IDs ─────────────────────────────────────────────
  AG23MDL: {
    type: 'agency',
    agencyBrand: BRANDS.medialoop,
    stats: { active: 2, delivered: 2 },
    projects: [
      {
        id: 'proj_bbm',
        clientName: 'BBM',
        clientInitials: 'BBM',
        clientId: 'CL31BBM',
        previewUrl: 'https://bbm-eight.vercel.app/',
        previewLabel: 'BBM — In Development',
        status: 'active',
        description: 'Digital brand identity & full website — currently in active development phase',
        deliveredOn: null,
        isActive: true,
      },
      {
        id: 'proj_shah',
        clientName: 'Shah Engineering',
        clientInitials: 'Shah',
        clientId: 'CL32SHAH',
        previewUrl: 'https://shah-omega.vercel.app/',
        previewLabel: 'Shah — In Development',
        status: 'active',
        description: 'Digital brand identity & full website — currently in active development phase',
        deliveredOn: null,
        isActive: true,
      },
      {
        id: 'proj_patel',
        clientName: 'Patel Packaging',
        clientInitials: 'PP',
        clientId: null,
        previewUrl: 'https://patelpackaging.com/',
        previewLabel: 'Patel Packaging — Live Website',
        status: 'delivered',
        description: 'Industrial packaging solutions — complete web presence designed & delivered',
        deliveredOn: 'March 2025',
        isActive: false,
      },
      {
        id: 'proj_bdp',
        clientName: 'Blue Diamond Production',
        clientInitials: 'BD',
        clientId: null,
        previewUrl: 'https://bluediamondproduction.in/',
        previewLabel: 'Blue Diamond Production — Live Website',
        status: 'delivered',
        description: 'Entertainment & media production brand — full website designed & delivered',
        deliveredOn: 'April 2025',
        isActive: false,
      },
    ],
  },
};

// ── ROUTER ───────────────────────────────────────────────────

function getRoute() {
  return window.location.hash.replace('#', '') || '/';
}

function navigate(path) {
  window.location.hash = path;
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  render();
  checkMobileHint();
});

function render() {
  const route = getRoute();
  const app = document.getElementById('app');

  if (route === '/' || route === '') {
    renderLanding(app);

  } else if (route === '/experience') {
    // Validate session — no direct URL access allowed
    const id = _getSession();
    if (!id || !ID_REGISTRY[id] || ID_REGISTRY[id].type !== 'client') {
      _clearSession();
      navigate('/');
      return;
    }
    renderClientExperience(app, id);

  } else if (route === '/workspace') {
    // Validate session — no direct URL access allowed
    const id = _getSession();
    if (!id || !ID_REGISTRY[id] || ID_REGISTRY[id].type !== 'agency') {
      _clearSession();
      navigate('/');
      return;
    }
    renderAgencyWorkspace(app, id);

  } else {
    // Any unknown route → back to landing
    navigate('/');
  }
}

// ── LANDING PAGE ─────────────────────────────────────────────

function renderLanding(app) {
  app.innerHTML = `
    <div class="landing-page">
      <div class="landing-bg-grid"></div>
      <div class="landing-glow-orb orb-1"></div>
      <div class="landing-glow-orb orb-2"></div>

      <div class="landing-content">
        <div class="anubhavah-brand animate-in" style="animation-delay:0s">
          <div class="sanskrit-wordmark">
            <div class="sanskrit-wrapper">
              <span class="sanskrit-text">अनुभवः</span>
            </div>
            <span class="roman-text">Anubhavaḥ</span>
          </div>
          <p class="brand-descriptor">Experience Centre</p>
        </div>

        <div class="id-entry-card animate-in" style="animation-delay:0.15s">
          <p class="id-label">Enter your Experience ID to continue</p>
          <div class="id-input-row">
            <input
              type="text"
              id="experience-id-input"
              class="id-input"
              placeholder="e.g. EXP-2025-XX"
              autocomplete="off"
              spellcheck="false"
              maxlength="10"
            />
            <button class="id-submit-btn" id="id-submit-btn" onclick="handleIdSubmit()">
              <span>Enter</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
          <div class="id-error" id="id-error" style="display:none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span id="id-error-msg">Invalid ID. Please check and try again.</span>
          </div>
        </div>

        <p class="landing-footer-text animate-in" style="animation-delay:0.3s">
          Your exclusive gateway to curated digital experiences
        </p>
      </div>
    </div>
  `;

  const input = document.getElementById('experience-id-input');
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handleIdSubmit(); });
  input.addEventListener('input', e => {
    const pos = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(pos, pos);
    document.getElementById('id-error').style.display = 'none';
  });
}

function handleIdSubmit() {
  const input = document.getElementById('experience-id-input');
  const id = input.value.trim().toUpperCase();
  const errorEl = document.getElementById('id-error');
  const errorMsg = document.getElementById('id-error-msg');

  if (!id) { showLandingError(errorEl, errorMsg, 'Please enter your Experience ID.'); shakeInput(input); return; }

  const entry = ID_REGISTRY[id];
  if (!entry) { showLandingError(errorEl, errorMsg, 'Invalid ID. Please check and try again.'); shakeInput(input); return; }

  // Store ID in session — NEVER put it in the URL
  _setSession(id);

  document.querySelector('.landing-content').classList.add('animate-out');
  setTimeout(() => {
    if (entry.type === 'client') navigate('/experience');
    else if (entry.type === 'agency') navigate('/workspace');
  }, 380);
}

function showLandingError(el, msgEl, msg) { msgEl.textContent = msg; el.style.display = 'flex'; }
function shakeInput(input) { input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 500); }

// Safe back navigation — clears session
function navigateBack() { _clearSession(); navigate('/'); }

// ── CLIENT EXPERIENCE PAGE ───────────────────────────────────

function renderClientExperience(app, id) {
  const entry = ID_REGISTRY[id];
  if (!entry || entry.type !== 'client') { renderNotFound(app); return; }

  const brand = entry.ownerBrand;

  // Build device selector buttons
  const deviceBtns = DEVICES.map((d, i) => `
    <button
      class="device-opt${i === 0 ? ' active' : ''}"
      data-frame="${d.frameClass}"
      onclick="switchDevice(this)"
      title="${d.label}"
    >${DEVICE_ICONS[d.icon]}<span>${d.label}</span></button>
  `).join('');

  // Toolbar: active = locked, delivered = URL visible
  const toolbarUrl = entry.isActive
    ? `<div class="toolbar-url-bar restricted">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Preview Mode — Confidential</span>
      </div>`
    : `<div class="toolbar-url-bar">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>${entry.previewUrl}</span>
      </div>
      <button class="toolbar-open-btn" onclick="window.open('${entry.previewUrl}','_blank')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Open Live
      </button>`;

  app.innerHTML = `
    <div class="exp-page"
      style="--accent:${brand.accentColor};--accent-secondary:${brand.accentSecondary};--accent-gradient:${brand.accentGradient};--accent-glow:${brand.accentGlow};--accent-light:${brand.accentLight};--bg-brand:${brand.bgBase}">

      <!-- Header -->
      <header class="exp-header animate-in">
        <div class="exp-header-left">
          <div class="brand-logo-pill">
            <span class="logo-mark">${brand.logoText}</span>
            <span class="logo-name">${brand.logoSubText}</span>
          </div>
        </div>
        <div class="exp-header-center">
          <span class="exp-centre-badge">
            <span class="badge-dot"></span>Experience Centre
          </span>
        </div>
        <div class="exp-header-right">
          <span class="anubhavah-micro">अनुभवः</span>
        </div>
      </header>

      <!-- Hero -->
      <section class="exp-hero animate-in" style="animation-delay:0.1s">
        <div class="exp-glow-orb"></div>
        <div class="exp-hero-inner">
          <p class="exp-welcome-tag">Welcome to</p>
          <h1 class="exp-hero-title">${brand.expLabel}</h1>
          <p class="exp-hero-sub">${brand.expSubLabel}</p>
          <div class="exp-client-name-tag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Previewing for: <strong>${entry.entityName}</strong>
          </div>
        </div>
      </section>

      <!-- Device Selector Bar -->
      <div class="device-selector-bar animate-in" style="animation-delay:0.18s">
        <div class="device-options-group">${deviceBtns}</div>
        <button class="device-fullscreen-btn" onclick="openExpFullscreen()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          Full Screen
        </button>
      </div>

      <!-- Preview Section -->
      <section class="exp-preview-section animate-in" style="animation-delay:0.22s">
        <div class="preview-container">
          <div class="preview-toolbar">
            <div class="toolbar-dots">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
            </div>
            ${toolbarUrl}
          </div>
          <div class="iframe-wrapper device-desktop" id="iframe-wrapper">
            <div class="device-frame-inner" id="device-frame-inner">
              <iframe
                id="preview-iframe"
                src="${entry.previewUrl}"
                title="${entry.previewLabel}"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              ></iframe>
              <div class="iframe-overlay" id="iframe-overlay" onclick="dismissOverlay()">
                <div class="iframe-overlay-content">
                  <div class="iframe-play-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                  <p>Click to explore</p>
                  <span>${entry.previewLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="exp-footer animate-in" style="animation-delay:0.3s">
        <span>Powered by</span>
        <span class="footer-anubhavah">अनुभवः</span>
        <span class="footer-dot">·</span>
        <button class="back-btn" onclick="navigateBack()">← Back</button>
      </footer>
    </div>

    <!-- Fullscreen Modal -->
    <div class="fullscreen-modal" id="exp-fullscreen-modal">
      <div class="modal-header" style="--accent:${brand.accentColor};--accent-light:${brand.accentLight}">
        <div class="modal-header-left">
          <div class="brand-logo-pill">
            <span class="logo-mark">${brand.logoText}</span>
            <span class="logo-name">${brand.logoSubText}</span>
          </div>
          ${entry.isActive ? '<span class="modal-lock-badge">🔒 Preview Mode — Confidential</span>' : ''}
        </div>
        <button class="modal-close-btn" onclick="closeExpFullscreen()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <iframe
        src="${entry.previewUrl}"
        title="${entry.previewLabel}"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      ></iframe>
    </div>
  `;
}

function switchDevice(btn) {
  document.querySelectorAll('.device-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const wrapper = document.getElementById('iframe-wrapper');
  if (!wrapper) return;
  wrapper.className = `iframe-wrapper ${btn.dataset.frame}`;
}

function openExpFullscreen() {
  const modal = document.getElementById('exp-fullscreen-modal');
  if (modal) { modal.classList.add('modal-visible'); }
}

function closeExpFullscreen() {
  const modal = document.getElementById('exp-fullscreen-modal');
  if (modal) { modal.classList.remove('modal-visible'); }
}

function dismissOverlay() {
  const ov = document.getElementById('iframe-overlay');
  if (ov) { ov.style.opacity = '0'; setTimeout(() => ov.remove(), 300); }
}

// ── AGENCY WORKSPACE PAGE ────────────────────────────────────

function renderAgencyWorkspace(app, id) {
  const entry = ID_REGISTRY[id];
  if (!entry || entry.type !== 'agency') { renderNotFound(app); return; }

  const brand = entry.agencyBrand;

  const projectCards = entry.projects.map(p => {
    const statusClass = p.isActive ? 'status-active' : 'status-delivered';
    const statusLabel = p.isActive ? '◉ In Progress' : '✓ Delivered';

    const clientIdRow = p.clientId
      ? `<div class="project-detail-item">
          <span class="detail-label">Client ID</span>
          <span class="detail-value client-id-chip" onclick="copyToClipboard('${p.clientId}', this)">
            ${p.clientId}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </span>
        </div>` : '';

    const timeRow = p.isActive
      ? `<div class="project-detail-item"><span class="detail-label">Phase</span><span class="detail-value" style="color:#fbbf24">Development</span></div>`
      : `<div class="project-detail-item"><span class="detail-label">Delivered</span><span class="detail-value">${p.deliveredOn}</span></div>`;

    // Preview action: always opens agency modal (URL hidden for active)
    const previewBtn = `<button class="btn-primary" onclick="openAgencyModal('${encodeURIComponent(p.previewUrl)}','${escStr(p.previewLabel)}',${p.isActive})">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      ${p.isActive ? 'Preview' : 'View Site'}
    </button>`;

    // Open Live: only for delivered
    const openLiveBtn = !p.isActive
      ? `<button class="btn-ghost" onclick="window.open('${p.previewUrl}','_blank')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open Live
        </button>` : '';

    return `
      <div class="project-card animate-in">
        <div class="project-card-header">
          <div class="project-client-avatar">${p.clientInitials}</div>
          <div class="project-card-meta">
            <h3 class="project-client-name">${p.clientName}</h3>
            <span class="project-status ${statusClass}">${statusLabel}</span>
          </div>
        </div>
        <p class="project-description">${p.description}</p>
        <div class="project-detail-row">
          ${clientIdRow}
          ${timeRow}
        </div>
        <div class="project-card-actions">
          ${previewBtn}
          ${openLiveBtn}
        </div>
      </div>`;
  }).join('');

  app.innerHTML = `
    <div class="workspace-page"
      style="--accent:${brand.accentColor};--accent-secondary:${brand.accentSecondary};--accent-gradient:${brand.accentGradient};--accent-glow:${brand.accentGlow};--accent-light:${brand.accentLight};--bg-brand:${brand.bgBase}">
      <div class="workspace-bg-grid"></div>

      <!-- Sidebar -->
      <aside class="workspace-sidebar animate-in">
        <div class="sidebar-logo">
          <div class="sidebar-logo-mark">${brand.logoText}</div>
          <div class="sidebar-logo-text">
            <span class="sidebar-brand-name">${brand.logoSubText}</span>
            <span class="sidebar-brand-sub">Agency Portal</span>
          </div>
        </div>
        <nav class="sidebar-nav">
          <a class="sidebar-nav-item active" href="#">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Projects
          </a>
        </nav>
        <div class="sidebar-spacer"></div>
        <div class="sidebar-footer">
          <span>Powered by</span>
          <span class="sidebar-anubhavah">अनुभवः</span>
        </div>
        <button class="sidebar-back-btn" onclick="navigateBack()">← Exit</button>
      </aside>

      <!-- Main -->
      <main class="workspace-main">
        <!-- Header -->
        <div class="workspace-header animate-in">
          <div>
            <h1 class="workspace-title">Welcome back, <span class="accent-text">${brand.name}</span></h1>
            <p class="workspace-subtitle">Overview of your projects &amp; deliveries</p>
          </div>
          <span class="exp-centre-badge"><span class="badge-dot"></span>Workspace</span>
        </div>

        <!-- Mobile Top Bar (shows on tablet/phone instead of sidebar) -->
      <div class="workspace-mobile-bar">
        <div class="mobile-bar-brand">
          <div class="mobile-bar-logo">${brand.logoText}</div>
          <span class="mobile-bar-name">${brand.name}</span>
        </div>
        <button class="mobile-bar-exit" onclick="navigateBack()">Exit ✕</button>
      </div>
        <div class="stats-row animate-in" style="animation-delay:0.1s">
          <div class="stat-card">
            <div class="stat-icon" style="background:${brand.accentLight};color:${brand.accentColor}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <div class="stat-value" style="background:${brand.accentGradient};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">${entry.stats.active}</div>
              <div class="stat-label">Active Projects</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(74,222,128,0.12);color:#4ade80">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div class="stat-value" style="color:#4ade80">${entry.stats.delivered}</div>
              <div class="stat-label">Delivered</div>
            </div>
          </div>
        </div>

        <!-- Projects -->
        <div class="projects-section animate-in" style="animation-delay:0.2s">
          <div class="section-header">
            <h2 class="section-title">Projects</h2>
            <span class="section-count">${entry.projects.length} total</span>
          </div>
          <div class="projects-grid">${projectCards}</div>
        </div>
      </main>
    </div>

    <!-- Agency Preview Modal -->
    <div class="fullscreen-modal" id="agency-modal">
      <div class="modal-header" style="--accent:${brand.accentColor};--accent-light:${brand.accentLight}">
        <div class="modal-header-left">
          <div class="brand-logo-pill">
            <span class="logo-mark">${brand.logoText}</span>
            <span class="logo-name">${brand.logoSubText}</span>
          </div>
          <span id="agency-modal-label" class="modal-lock-badge"></span>
        </div>
        <button class="modal-close-btn" onclick="closeAgencyModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <iframe id="agency-modal-iframe" src="" loading="lazy" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
    </div>
  `;
}

function openAgencyModal(encodedUrl, label, isActive) {
  const url = decodeURIComponent(encodedUrl);
  const modal = document.getElementById('agency-modal');
  const iframe = document.getElementById('agency-modal-iframe');
  const labelEl = document.getElementById('agency-modal-label');
  if (!modal || !iframe) return;
  iframe.src = url;
  labelEl.textContent = isActive ? '🔒 Preview — Confidential' : label;
  modal.classList.add('modal-visible');
}

function closeAgencyModal() {
  const modal = document.getElementById('agency-modal');
  if (modal) {
    modal.classList.remove('modal-visible');
    setTimeout(() => {
      const iframe = document.getElementById('agency-modal-iframe');
      if (iframe) iframe.src = '';
    }, 300);
  }
}

// ── NOT FOUND ────────────────────────────────────────────────

function renderNotFound(app) {
  app.innerHTML = `
    <div class="notfound-page">
      <div class="landing-bg-grid"></div>
      <div class="nf-content animate-in">
        <div class="sanskrit-wordmark" style="margin-bottom:1.5rem">
          <div class="sanskrit-wrapper"><span class="sanskrit-text" style="font-size:2.2rem">अनुभवः</span></div>
        </div>
        <h2 class="nf-title">404</h2>
        <p class="nf-sub">This experience could not be found.</p>
        <button class="btn-primary-neutral" onclick="navigate('/')">← Return Home</button>
      </div>
    </div>
  `;
}

// ── HELPERS ──────────────────────────────────────────────────

function copyToClipboard(text, el) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = el.innerHTML;
    el.innerHTML = '✓ Copied!';
    el.style.color = '#4ade80';
    setTimeout(() => { el.innerHTML = orig; el.style.color = ''; }, 1500);
  });
}

function escStr(s) { return s.replace(/'/g, "\\'"); }

// ── MOBILE HINT BANNER ──────────────────────────────────────────

function checkMobileHint() {
  const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) return;
  if (localStorage.getItem('anx_mob_ok')) return;

  const banner = document.createElement('div');
  banner.id = 'mobile-hint';
  banner.className = 'mobile-hint-banner';
  banner.innerHTML = `
    <div class="mobile-hint-inner">
      <div class="mobile-hint-icon">💻</div>
      <div class="mobile-hint-text">
        <strong>Best viewed on Desktop</strong>
        <p>For the full experience, we recommend opening this on a laptop or desktop browser.</p>
      </div>
      <button class="mobile-hint-dismiss" onclick="dismissMobileHint()">Got it</button>
    </div>
  `;
  document.body.appendChild(banner);
  // Slight delay so animation plays
  setTimeout(() => banner.classList.add('visible'), 100);
}

function dismissMobileHint() {
  const banner = document.getElementById('mobile-hint');
  if (banner) {
    banner.classList.remove('visible');
    setTimeout(() => banner.remove(), 400);
  }
  localStorage.setItem('anx_mob_ok', '1');
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeExpFullscreen();
    closeAgencyModal();
  }
});
