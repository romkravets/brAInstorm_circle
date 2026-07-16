'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ollamaErrorMessage } from '../hooks/useOllama.js';

export default function ParticipantCard({
  participant, response, isLoading, isActive, otherParticipants,
  onResponseChange, onPromptRequest, onRunOllama, onSetActive,
  runStatus = 'idle', runError = '',
}) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [expanded,    setExpanded]    = useState(false);
  const [sendMenu,    setSendMenu]    = useState(false);
  const [ollamaError, setOllamaError] = useState('');
  const [mounted,     setMounted]     = useState(false);
  const [draft,       setDraft]       = useState(response);
  const debounceRef   = useRef(null);
  const menuRef       = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setDraft(response ?? '');
  }, [response]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleTextChange = useCallback((text) => {
    setDraft(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onResponseChange(text), 300);
  }, [onResponseChange]);

  const handleRunOllama = useCallback(async () => {
    setOllamaError('');
    try {
      await onRunOllama(participant);
    } catch (e) {
      setOllamaError(ollamaErrorMessage(e, participant.ollamaModel));
    }
  }, [onRunOllama, participant]);

  const { color, name, respondMode, url } = participant;
  const cardText = draft ?? '';
  const isEmpty = !cardText;
  const cardError = runError || ollamaError;

  const cardStyle = {
    background: isEmpty ? 'var(--bc-surface)' : color.bg,
    borderWidth: '2px',
    borderStyle: isEmpty ? 'dashed' : 'solid',
    borderColor: isActive ? color.dot : (isEmpty ? 'var(--bc-border)' : color.border),
  };

  return (
    <>
      <div
        className="rounded-2xl flex flex-col transition-all cursor-pointer"
        style={cardStyle}
        onClick={onSetActive}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color.dot }} />
          <span className="font-medium text-sm flex-1 truncate" style={{ color: color.text }}>{name}</span>

          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
            {respondMode === 'ollama' ? '⚡ Ollama' : respondMode === 'api' ? '☁️ API' : '🔗 Manual'}
          </span>

          {/* Open AI link (manual only) */}
          {respondMode === 'manual' && url && (
            <button
              onClick={(e) => { e.stopPropagation(); window.open(url, '_blank', 'noopener,noreferrer'); }}
              className="text-xs px-2 py-1 rounded-lg transition-colors"
              style={{ color: color.text, background: color.bg }}
              title={`Відкрити ${name}`}
            >
              ↗
            </button>
          )}

          {/* Three-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--bc-text-muted)' }}
            >
              ⋯
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-xl shadow-xl py-1 min-w-40"
                style={{ background: 'var(--bc-surface)', border: '1px solid var(--bc-border)' }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => { onPromptRequest('initial', participant, null); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50"
                  style={{ color: 'var(--bc-text)' }}
                >
                  📋 Початковий промпт
                </button>
                <button
                  onClick={() => { setExpanded(true); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50"
                  style={{ color: 'var(--bc-text)' }}
                >
                  ⤢ Розгорнути
                </button>
                <div className="my-1 border-t" style={{ borderColor: 'var(--bc-border)' }} />
                <button
                  onClick={() => { setDraft(''); onResponseChange(''); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50"
                  style={{ color: 'var(--bc-danger)' }}
                >
                  🗑 Очистити відповідь
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Response textarea */}
        <div className="px-4 pb-2 flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl z-10"
              style={{ background: `${color.bg}cc` }}>
              <div className="flex items-center gap-2" style={{ color: color.text }}>
                <svg className="spinner w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                <span className="text-sm">Генерує...</span>
              </div>
            </div>
          )}
          <textarea
            className="w-full bg-transparent outline-none text-sm leading-relaxed"
            style={{ color: 'var(--bc-text)', minHeight: 120 }}
            placeholder={`Вставте відповідь від ${name}...`}
            value={cardText}
            onChange={e => handleTextChange(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
        </div>

        {/* Ollama error */}
        {cardError && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#fdeaea', color: 'var(--bc-danger)' }}>
            {cardError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 pb-3 pt-1 border-t" style={{ borderColor: isEmpty ? 'var(--bc-border)' : color.border }}>
          {/* Ollama run button */}
          {respondMode === 'ollama' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRunOllama(); }}
              disabled={isLoading || runStatus === 'running'}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: (isLoading || runStatus === 'running') ? 'var(--bc-border)' : color.dot, color: '#fff', cursor: (isLoading || runStatus === 'running') ? 'not-allowed' : 'pointer' }}
            >
              {(isLoading || runStatus === 'running') ? '⟳ Генерує...' : '▶ Запустити'}
            </button>
          )}

          {/* Send to others */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setSendMenu(v => !v); }}
              disabled={!cardText}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={cardText
                ? { color: color.text, background: color.bg, border: `1px solid ${color.border}` }
                : { color: 'var(--bc-text-hint)', cursor: 'not-allowed' }
              }
            >
              → Надіслати
            </button>
            {sendMenu && (
              <div
                className="absolute left-0 bottom-full mb-1 z-20 rounded-xl shadow-xl py-1 min-w-37.5"
                style={{ background: 'var(--bc-surface)', border: '1px solid var(--bc-border)' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Targets rendered by parent via onPromptRequest callback — see page.jsx */}
                <SendTargetList
                  targets={otherParticipants}
                  onSelect={(target) => {
                    onPromptRequest('cross', participant, target);
                    setSendMenu(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Deepen */}
          <button
            onClick={(e) => { e.stopPropagation(); onPromptRequest('deepen', participant, null); }}
            disabled={!cardText}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={cardText
              ? { color: color.text, background: color.bg, border: `1px solid ${color.border}` }
              : { color: 'var(--bc-text-hint)', cursor: 'not-allowed' }
            }
          >
            ↓ Поглибити
          </button>

          {/* Expand */}
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className="ml-auto px-2 py-1.5 rounded-lg text-xs transition-colors"
            style={{ color: 'var(--bc-text-muted)' }}
            title="Розгорнути"
          >
            ⤢
          </button>
        </div>
      </div>

      {/* Fullscreen expanded modal */}
      {mounted && expanded && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl"
            style={{ background: 'var(--bc-surface)' }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--bc-border)' }}>
              <div className="w-3 h-3 rounded-full" style={{ background: color.dot }} />
              <span className="font-medium" style={{ color: color.text }}>{name}</span>
              <button
                onClick={() => setExpanded(false)}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                style={{ color: 'var(--bc-text-muted)' }}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--bc-text)' }}>
                {response || <span style={{ color: 'var(--bc-text-hint)' }}>Відповідь ще не додана</span>}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function SendTargetList({ targets, onSelect }) {
  if (!targets?.length) {
    return (
      <div className="px-4 py-2 text-xs" style={{ color: 'var(--bc-text-hint)' }}>
        Додайте більше учасників
      </div>
    );
  }
  return targets.map(t => (
    <button
      key={t.id}
      onClick={() => onSelect(t)}
      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors hover:bg-gray-50"
      style={{ color: 'var(--bc-text)' }}
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color.dot }} />
      {t.name}
    </button>
  ));
}
