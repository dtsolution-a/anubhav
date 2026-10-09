'use client';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Paperclip, Send, X, Check } from 'lucide-react';
import { idOf, timeOf, hhmm, dayLabel, setSeen, fileToDataUrl, statusColor } from './shared';

// WhatsApp-style conversation screen shared by the client and agency phone apps.
// onSend(text, image) must resolve true on success so a failed send can be restored.
export default function ChatScreen({ rev, myType, accent, accentLt, bgBase, onBack, actions, onSend, footerOverride, nameFor }) {
  const [text, setText] = useState('');
  const [img, setImg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(null);
  const bodyRef = useRef(null);
  const taRef = useRef(null);
  const stickRef = useRef(true);
  const thread = rev.thread || [];
  const revId = idOf(rev);

  // mark as read and keep the newest message in view
  useEffect(() => {
    setSeen(revId, thread.length);
    const el = bodyRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [revId, thread.length]);

  const onScroll = () => {
    const el = bodyRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  async function submit() {
    const msg = text.trim();
    if ((!msg && !img) || busy) return;
    const sentText = text, sentImg = img;
    setBusy(true); setText(''); setImg(null);
    if (taRef.current) taRef.current.style.height = 'auto';
    stickRef.current = true;
    const ok = await onSend(msg, sentImg);
    if (!ok) { setText(sentText); setImg(sentImg); }
    setBusy(false);
  }

  let lastDay = '';
  return (
    <div className="wa-screen" style={{ background: bgBase }}>
      <div className="wa-head">
        <button className="btn-icon" onClick={onBack} aria-label="Back"><ArrowLeft size={22} /></button>
        <div className="wa-avatar" style={{ background: accentLt, color: accent }}>{(rev.title || '?')[0].toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wa-title">{rev.title}</div>
          <div className="wa-sub" style={{ color: statusColor(rev.status, accent) }}>{rev.status}</div>
        </div>
        {actions}
      </div>

      <div className="wa-body wa-chat-bg" ref={bodyRef} onScroll={onScroll}>
        {thread.length === 0 && <p className="wa-empty">No messages yet — say hello below.</p>}
        {thread.map((m, i) => {
          const mine = m.authorType === myType;
          const d = timeOf(m);
          const valid = !isNaN(d.getTime());
          const label = valid ? dayLabel(d) : '';
          const showDay = valid && label !== lastDay;
          if (showDay) lastDay = label;
          const prev = thread[i - 1];
          const sameAuthor = prev && prev.authorType === m.authorType && prev.authorName === m.authorName && !showDay;
          const name = nameFor ? nameFor(m) : (m.authorType === 'owner' ? 'Saarthi - DT Solution' : m.authorName);
          return (
            <div key={m._id || i}>
              {showDay && <div className="wa-day"><span>{label}</span></div>}
              <div className={`wa-msg ${mine ? 'mine' : 'theirs'}`} style={{ marginTop: sameAuthor ? 3 : 10 }}>
                <div className={`wa-bubble ${mine ? 'mine' : 'theirs'}`} style={mine ? { background: accent } : undefined}>
                  {!mine && !sameAuthor && <div className="wa-author" style={{ color: accent }}>{name}</div>}
                  {m.imageUrl && <img src={m.imageUrl} alt="attachment" loading="lazy" decoding="async" onClick={() => setViewer(m.imageUrl)} />}
                  {m.message && !(m.imageUrl && m.message === 'Uploaded an image') && <span className="wa-text">{m.message}</span>}
                  <span className="wa-meta">{valid && hhmm(d)}{mine && <Check size={13} style={{ opacity: m._optimistic ? 0.35 : 0.8 }} />}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="wa-footer">
        {footerOverride || (
          <>
            {img && (
              <div className="wa-attach">
                <img src={img} alt="preview" />
                <button onClick={() => setImg(null)} aria-label="Remove"><X size={14} /></button>
              </div>
            )}
            <div className="wa-composer">
              <label className="wa-clip" aria-label="Attach photo">
                <input type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setImg(await fileToDataUrl(f)); }} />
                <Paperclip size={22} />
              </label>
              <textarea
                ref={taRef}
                rows={1}
                className="wa-input"
                placeholder="Message"
                value={text}
                onChange={e => setText(e.target.value)}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
              />
              <button className="wa-send" style={{ background: accent }} disabled={busy || (!text.trim() && !img)} onClick={submit} aria-label="Send"><Send size={20} /></button>
            </div>
          </>
        )}
      </div>

      {viewer && (
        <div className="wa-viewer" onClick={() => setViewer(null)}>
          <button aria-label="Close"><X size={24} /></button>
          <img src={viewer} alt="preview" />
        </div>
      )}
    </div>
  );
}
