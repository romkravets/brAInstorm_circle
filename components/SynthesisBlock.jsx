'use client';
import { useCallback, useState } from 'react';

export default function SynthesisBlock({
  synthesis,
  crossCheck,
  participants,
  responses,
  onSynthesisChange,
  onDistillRequest,
  onAutoSynthesize,
  isAutoSynthesizing = false,
}) {
  const [copied, setCopied] = useState(false);

  const filledCount = participants.filter(p => responses[p.id]).length;
  const canDistill  = filledCount >= 2;
  const canAutoSynthesize = canDistill && typeof onAutoSynthesize === 'function';
  const hasCrossCheck = (crossCheck?.agreements?.length ?? 0) > 0
    || (crossCheck?.conflicts?.length ?? 0) > 0
    || (crossCheck?.missing?.length ?? 0) > 0;

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
        <div className="flex items-center gap-2">
          {canAutoSynthesize && (
            <button
              onClick={onAutoSynthesize}
              disabled={isAutoSynthesizing}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={isAutoSynthesizing
                ? { background: 'var(--bc-border)', color: 'var(--bc-text-hint)', cursor: 'not-allowed' }
                : { background: 'var(--bc-accent)', color: '#fff', cursor: 'pointer' }
              }
            >
              {isAutoSynthesizing ? '⟳ Автосинтез...' : '⚡ Автосинтез'}
            </button>
          )}

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
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        {hasCrossCheck && (
          <div className="mb-4 rounded-xl border p-3" style={{ background: 'var(--bc-surface)', borderColor: 'var(--bc-border)' }}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--bc-text-hint)' }}>
              Cross-check summary
            </p>

            {crossCheck.agreements.length > 0 && (
              <div className="mb-3 last:mb-0">
                <p className="mb-1 text-sm font-medium" style={{ color: 'var(--bc-success)' }}>Збігаються</p>
                <ul className="space-y-1 text-sm" style={{ color: 'var(--bc-text)' }}>
                  {crossCheck.agreements.map((item, index) => (
                    <li key={`agreement-${index}`}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {crossCheck.conflicts.length > 0 && (
              <div className="mb-3 last:mb-0">
                <p className="mb-1 text-sm font-medium" style={{ color: 'var(--bc-danger)' }}>Розбіжності</p>
                <ul className="space-y-1 text-sm" style={{ color: 'var(--bc-text)' }}>
                  {crossCheck.conflicts.map((item, index) => (
                    <li key={`conflict-${index}`}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {crossCheck.missing.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium" style={{ color: 'var(--bc-accent)' }}>Що ще не покрито</p>
                <ul className="space-y-1 text-sm" style={{ color: 'var(--bc-text)' }}>
                  {crossCheck.missing.map((item, index) => (
                    <li key={`missing-${index}`}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!canDistill && !synthesis ? (
          <p className="text-sm" style={{ color: 'var(--bc-text-hint)' }}>
            Дистиляція з’явиться після того як мінімум 2 AI відповідять.
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
