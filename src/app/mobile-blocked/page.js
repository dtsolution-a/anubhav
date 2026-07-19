export default function MobileBlocked() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0807',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.2rem',
      }}>
        <div style={{
          width: 80, height: 80,
          background: 'rgba(255,112,53,0.1)',
          border: '1px solid rgba(255,112,53,0.25)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem',
        }}>
          💻
        </div>

        <div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#f4f0ec',
            marginBottom: '0.6rem',
            lineHeight: 1.3,
          }}>
            Desktop Access Required
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#a09890', lineHeight: 1.65 }}>
            अनुभवः is optimized for desktop browsers only. Please open this link on a laptop or desktop computer for the full experience.
          </p>
        </div>

        <div style={{
          background: 'rgba(255,112,53,0.07)',
          border: '1px solid rgba(255,112,53,0.18)',
          borderRadius: 12,
          padding: '0.85rem 1.2rem',
          fontSize: '0.78rem',
          color: '#FF9F00',
          letterSpacing: '0.04em',
        }}>
          This platform is not available on mobile devices.
        </div>

        <p style={{ fontSize: '0.7rem', color: '#605850', letterSpacing: '0.06em' }}>
          अनुभवः — Experience Centre
        </p>
      </div>
    </div>
  );
}
