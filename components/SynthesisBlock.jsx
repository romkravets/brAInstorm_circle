'use client';
import { useState, useCallback } from 'react';

export default function SynthesisBlock({ synthesis, participants, responses, onSynthesisChange, onDistillRequest }) {
  const [copied, setCopied] = useState(false);

  const filledCount = participants.filter(p => responses[p.id]).length;
  const canDistill  = filledCount >= 2;

  const copySynthesis = useCallback(async () => {
    if (!synthesis) return;
    try {
      await navigator.clipboard.writeText(synthesis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [synthesis]);

  return (
    <div className="mx-4 mb-4 rounded-2xl border" style={{ borderColor: 'var(--bc-synthesis)', background: 'var(--bc-synthesis-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🔮</span>
          <span className="font-medium text-sm" style={{ color: 'var(--bc-synthesis)' }}>Вижимка раунду</span>
          {filledCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bc-synthesis)', color: '#fff' }}>
              {filledCount} з {participants.length}
            </span>
          )}
        </div>
        <button
          onClick={onDistillRequest}
          disabled={!canDistill}
          className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={canDistill
            ? { background: 'var(--bc-synthesis)', color: '#fff', cursor: 'pointer' }
            : { background: 'transparent', color: 'var(--bc-text-hint)', cursor: 'not-allowed', border: '1px solid var(--bc-border)' }
          }
        >
          🔀 Дистилювати
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        {!canDistill && !synthesis ? (
          <p className="text-sm" style={{ color: 'var(--bc-text-hint)' }}>
            Дистиляція з'явиться після того як мінімум 2 AI відповідять.
          </p>
        ) : (
          <>
            <textarea
              className="w-full rounded-xl px-3 py-2 text-sm outline-none border transition-colors"
              style={{ background: 'var(--bc-surface)', color: 'var(--bc-text)', borderColor: 'var(--bc-border)', minHeight: 80 }}
              placeholder="Вставте сюди результат синтезу від AI..."
              value={synthesis}
              onChange={e => onSynthesisChange(e.target.value)}
            />
            {synthesis && (
              <button
                onClick={copySynthesis}
                className="mt-2 text-xs px-3 py-1 rounded-lg transition-colors"
                style={{ color: copied ? 'var(--bc-success)' : 'var(--bc-synthesis)', background: 'var(--bc-surface)' }}
              >
                {copied ? '✓ Скопійовано' : '📋 Копіювати вижимку'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
