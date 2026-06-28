'use client';
import { useState, useCallback } from 'react';
import { MODE_LABELS, MODE_TOOLTIPS } from '../lib/promptTemplates.js';

const MODES = ['synthesis', 'debate', 'critique', 'depth'];

export default function QuestionBar({ question, mode, onQuestionChange, onModeChange }) {
  const [copied, setCopied] = useState(false);

  const wordCount = question.trim() ? question.trim().split(/\s+/).length : 0;

  const copyQuestion = useCallback(async () => {
    if (!question) return;
    try {
      await navigator.clipboard.writeText(question);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [question]);

  return (
    <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--bc-border)' }}>
      {/* Question textarea */}
      <div
        className="relative rounded-xl border-2 transition-colors"
        style={{ borderColor: question ? 'var(--bc-accent)' : 'var(--bc-border)', background: 'var(--bc-surface)' }}
      >
        <textarea
          className="w-full px-4 pt-3 pb-2 rounded-xl bg-transparent outline-none text-base leading-relaxed"
          style={{ color: 'var(--bc-text)', minHeight: 72, maxHeight: 200 }}
          placeholder="Введи питання для мозкового штурму..."
          value={question}
          onChange={e => onQuestionChange(e.target.value)}
        />
        {question && (
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="text-xs" style={{ color: 'var(--bc-text-hint)' }}>{wordCount} {wordCount === 1 ? 'слово' : 'слів'}</span>
            <button
              onClick={copyQuestion}
              className="text-xs px-3 py-1 rounded-lg transition-colors"
              style={{ color: copied ? 'var(--bc-success)' : 'var(--bc-accent)', background: 'var(--bc-accent-light)' }}
            >
              {copied ? '✓ Скопійовано' : 'Копіювати питання'}
            </button>
          </div>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {MODES.map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            title={MODE_TOOLTIPS[m]}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={
              mode === m
                ? { background: 'var(--bc-accent)', color: '#fff' }
                : { background: 'var(--bc-surface)', color: 'var(--bc-text-muted)', border: '1px solid var(--bc-border)' }
            }
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  );
}
