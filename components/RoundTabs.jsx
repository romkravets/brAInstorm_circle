'use client';
import { useState, useRef, useEffect } from 'react';

export default function RoundTabs({ rounds, currentRound, onSwitch, onNewRound, onRename }) {
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingId !== null) inputRef.current?.focus();
  }, [editingId]);

  function startEdit(round) {
    setEditingId(round.id);
    setEditLabel(round.label);
  }

  function commitEdit() {
    if (editingId !== null && editLabel.trim()) {
      onRename(editingId, editLabel.trim());
    }
    setEditingId(null);
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-none border-b"
      style={{ borderColor: 'var(--bc-border)' }}
    >
      {rounds.map(round => {
        const isActive    = round.id === currentRound;
        const isCompleted = !!round.completedAt;

        return (
          <div key={round.id} className="flex-shrink-0">
            {editingId === round.id ? (
              <input
                ref={inputRef}
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                className="px-3 py-1.5 rounded-lg text-sm border outline-none"
                style={{ borderColor: 'var(--bc-accent)', color: 'var(--bc-text)', background: 'var(--bc-surface)', width: 100 }}
              />
            ) : (
              <button
                onClick={() => onSwitch(round.id)}
                onDoubleClick={() => startEdit(round)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
                style={
                  isActive
                    ? { background: 'var(--bc-accent)', color: '#fff' }
                    : { background: 'var(--bc-surface)', color: 'var(--bc-text-muted)', border: '1px solid var(--bc-border)' }
                }
                title="Подвійний клік — перейменувати"
              >
                {round.label}
                {isCompleted && !isActive && <span style={{ color: 'var(--bc-success)' }}>✓</span>}
                {isActive && !isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80 inline-block" />}
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onNewRound}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{ color: 'var(--bc-accent)', border: '1px dashed var(--bc-accent)', background: 'transparent' }}
      >
        + Новий раунд
      </button>
    </div>
  );
}
