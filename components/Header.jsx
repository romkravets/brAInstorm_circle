'use client';
import { useState, useRef, useEffect } from 'react';
import { generatePrompt } from '../lib/promptTemplates.js';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10)  return 'щойно';
  if (diff < 60)  return `${diff}с тому`;
  if (diff < 3600) return `${Math.floor(diff / 60)}хв тому`;
  return `${Math.floor(diff / 3600)}год тому`;
}

export default function Header({ session, savedAt, onReset, onExport, onNewRound }) {
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal,  setTitleVal]  = useState(session.title);
  const [tick,      setTick]      = useState(0);
  const titleRef = useRef(null);

  // refresh "X хв тому" every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setTitleVal(session.title); }, [session.title]);

  function commitTitle() {
    if (titleVal.trim()) onReset({ title: titleVal.trim() });
    setEditTitle(false);
  }

  return (
    <header
      className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
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
          onClick={() => setEditTitle(true)}
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

      <div className="ml-auto flex items-center gap-2">
        {/* New round */}
        <button
          onClick={onNewRound}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hidden md:block"
          style={{ color: 'var(--bc-accent)', background: 'var(--bc-accent-light)' }}
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
