import { Lock } from 'lucide-react';

export default function PreviewLock({ compact = false }) {
  return (
    <div className="preview-lock" style={compact ? { minHeight: 0, padding: '1.5rem 1rem' } : undefined}>
      <div className="preview-lock-icon"><Lock size={22} /></div>
      <h3>Preview is locked on this device</h3>
      <p>Website previews are available only on a desktop or laptop. Open this link on a computer to view the live preview.</p>
    </div>
  );
}
