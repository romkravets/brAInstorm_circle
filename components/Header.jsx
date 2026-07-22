'use client';
import { useEffect, useRef, useState } from 'react';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10)  return 'щойно';
  if (diff < 60)  return `${diff}с тому`;
  if (diff < 3600) return `${Math.floor(diff / 60)}хв тому`;
  return `${Math.floor(diff / 3600)}год тому`;
}

function getStageLabel(stage) {
  if (stage === 'generating') return 'Генерація';
  if (stage === 'synthesis') return 'Синтез';
  if (stage === 'cross_check') return 'Порівняння';
  return 'Очікування';
}

function getRunErrorMessage(error) {
  const messages = {
    no_runnable_participants: 'Додай хоча б одного auto-учасника.',
    timeout: 'Одна з моделей відповідає занадто довго.',
    ollama_unreachable: 'Ollama не запущений.',
    model_not_found: 'Одна з моделей не встановлена.',
    ollama_error: 'Під час запиту до Ollama сталася помилка.',
  };
  return messages[error] || 'Автозапуск завершився з помилкою.';
}

export default function Header({
  session,
  savedAt,
  onRename,
  onResetSession,
  onClearCurrentRound,
  onKeepOnlyCurrentRound,
  onExport,
  onNewRound,
  onRunRoundAuto,
  runMeta,
  isRunActive = false,
}) {
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal,  setTitleVal]  = useState(session.title);
  const [tick,      setTick]      = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const titleRef = useRef(null);
  const menuRef = useRef(null);

  // refresh "X хв тому" every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  function commitTitle() {
    if (titleVal.trim()) onRename({ title: titleVal.trim() });
    setEditTitle(false);
  }

  const lastError = runMeta?.errors?.[runMeta.errors.length - 1] ?? '';

  return (
    <header
      className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
      style={{ background: 'var(--bc-surface)', borderColor: 'var(--bc-border)' }}
    >
      <span className="text-xl">🧠</span>

      {/* Session title */}
      {editTitle ? (
        <input
          ref={titleRef}
          autoFocus
          value={titleVal}
          onChange={e => setTitleVal(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditTitle(false); }}
          className="font-medium text-base outline-none border-b"
          style={{ color: 'var(--bc-text)', borderColor: 'var(--bc-accent)', background: 'transparent', minWidth: 120 }}
        />
      ) : (
        <button
          onClick={() => {
            setTitleVal(session.title);
            setEditTitle(true);
          }}
          className="font-medium text-base hover:opacity-70 transition-opacity text-left"
          style={{ color: 'var(--bc-text)' }}
          title="Клік — перейменувати"
        >
          {session.title}
        </button>
      )}

      {/* Saved indicator */}
      {savedAt && (
        <span className="text-xs hidden sm:block" style={{ color: 'var(--bc-text-hint)' }}>
          Збережено {timeAgo(savedAt)}
        </span>
      )}

      {runMeta?.status === 'running' && (
        <span className="text-xs hidden lg:block" style={{ color: 'var(--bc-accent)' }}>
          {getStageLabel(runMeta.stage)} · {runMeta.completed}/{runMeta.total}
        </span>
      )}

      {runMeta?.status === 'failed' && lastError && (
        <span className="text-xs hidden lg:block" style={{ color: 'var(--bc-danger)' }}>
          {getRunErrorMessage(lastError)}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((value) => !value)}
            disabled={isRunActive}
            className="px-3 py-1.5 rounded-lg text-sm transition-colors border"
            style={isRunActive
              ? { color: 'var(--bc-text-hint)', borderColor: 'var(--bc-border)', cursor: 'not-allowed' }
              : { color: 'var(--bc-text-muted)', borderColor: 'var(--bc-border)' }
            }
            title="Дії із сесією"
          >
            Очистити ▾
          </button>

          {menuOpen && !isRunActive && (
            <div
              className="absolute right-0 top-full z-20 mt-2 min-w-56 rounded-xl border py-1 shadow-xl"
              style={{ background: 'var(--bc-surface)', borderColor: 'var(--bc-border)' }}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (window.confirm('Почати нову сесію і скинути всі раунди та відповіді?')) {
                    onResetSession();
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                style={{ color: 'var(--bc-danger)' }}
              >
                Нова сесія
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (window.confirm('Очистити відповіді, cross-check і вижимку поточного раунду?')) {
                    onClearCurrentRound();
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                style={{ color: 'var(--bc-text)' }}
              >
                Очистити поточний раунд
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (window.confirm('Видалити всі інші раунди і залишити лише поточний?')) {
                    onKeepOnlyCurrentRound();
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                style={{ color: 'var(--bc-text)' }}
              >
                Видалити інші раунди
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onRunRoundAuto}
          disabled={isRunActive}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hidden md:block"
          style={isRunActive
            ? { color: 'var(--bc-text-hint)', background: 'var(--bc-border)', cursor: 'not-allowed' }
            : { color: '#fff', background: 'var(--bc-accent)' }
          }
        >
          ▶ Автораунд
        </button>

        {/* New round */}
        <button
          onClick={onNewRound}
          disabled={isRunActive}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hidden md:block"
          style={isRunActive
            ? { color: 'var(--bc-text-hint)', background: 'var(--bc-border)', cursor: 'not-allowed' }
            : { color: 'var(--bc-accent)', background: 'var(--bc-accent-light)' }
          }
        >
          + Раунд
        </button>

        {/* Export MD */}
        <button
          onClick={onExport}
          className="px-3 py-1.5 rounded-lg text-sm transition-colors border"
          style={{ color: 'var(--bc-text-muted)', borderColor: 'var(--bc-border)' }}
          title="Експорт у Markdown"
        >
          ↓ MD
        </button>
      </div>
    </header>
  );
}
