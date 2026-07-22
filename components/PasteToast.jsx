'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function PasteToast({ toast, onConfirm, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (typeof document === 'undefined' || !toast) return null;

  const preview = toast.text.slice(0, 80) + (toast.text.length > 80 ? '...' : '');

  return createPortal(
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-bottom"
      style={{ width: 'min(480px, calc(100vw - 32px))' }}
    >
      <div
        className="rounded-2xl shadow-xl p-4"
        style={{ background: 'var(--bc-surface)', border: '1px solid var(--bc-border)' }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--bc-text)' }}>
          📋 Вставити відповідь у картку <span style={{ color: 'var(--bc-accent)' }}>{toast.participantName}</span>?
        </p>
        <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--bc-text-muted)' }}>
          «{preview}»
        </p>
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--bc-text-muted)', border: '1px solid var(--bc-border)' }}
          >
            Пропустити
          </button>
          <button
            onClick={() => { onConfirm(toast); onDismiss(); }}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--bc-accent)', color: '#fff' }}
          >
            Так →
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
