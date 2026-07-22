'use client';
import { useCallback, useEffect, useState } from 'react';

export default function PromptDrawer({ isOpen, promptText, title, targetUrl, onClose }) {
  const [copied, setCopied] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [promptText]);

  const openTarget = useCallback(() => {
    if (targetUrl) window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }, [targetUrl]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col animate-slide-right"
        style={{ width: 'min(480px, 100vw)', background: 'var(--bc-surface)', borderLeft: '1px solid var(--bc-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--bc-border)' }}>
          <h2 className="font-medium text-base" style={{ color: 'var(--bc-text)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: 'var(--bc-text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Prompt text */}
        <div className="flex-1 overflow-y-auto p-5">
          <pre
            className="whitespace-pre-wrap text-sm leading-relaxed rounded-xl p-4 select-all"
            style={{ color: 'var(--bc-text)', background: 'var(--bc-bg)', fontFamily: 'inherit', border: '1px solid var(--bc-border)' }}
          >
            {promptText}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'var(--bc-border)' }}>
          <button
            onClick={copy}
            className="flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors"
            style={copied
              ? { background: 'var(--bc-success)', color: '#fff' }
              : { background: 'var(--bc-accent)', color: '#fff' }
            }
          >
            {copied ? '✓ Скопійовано' : 'Копіювати'}
          </button>
          {targetUrl && (
            <button
              onClick={openTarget}
              className="flex-1 py-2.5 rounded-xl font-medium text-sm border transition-colors"
              style={{ color: 'var(--bc-accent)', borderColor: 'var(--bc-accent)', background: 'var(--bc-accent-light)' }}
            >
              Відкрити AI ↗
            </button>
          )}
        </div>
      </div>
    </>
  );
}
