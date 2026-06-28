'use client';

export default function ParticipantPanel({ participants, currentRound, onAdd, onSelectParticipant }) {
  const filledCount = participants.filter(p => currentRound.responses[p.id]).length;

  return (
    <aside
      className="hidden md:flex flex-col w-[200px] lg:w-[240px] flex-shrink-0 border-r h-full"
      style={{ borderColor: 'var(--bc-border)', background: 'var(--bc-surface)' }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--bc-border)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm" style={{ color: 'var(--bc-text)' }}>Учасники</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bc-accent-light)', color: 'var(--bc-accent-text)' }}>
            {participants.length}
          </span>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-1.5 mt-2">
          {participants.map(p => (
            <div
              key={p.id}
              className="w-2.5 h-2.5 rounded-full transition-colors"
              style={{ background: currentRound.responses[p.id] ? p.color.dot : 'var(--bc-border)' }}
              title={p.name}
            />
          ))}
          <span className="text-xs ml-1" style={{ color: 'var(--bc-text-hint)' }}>
            {filledCount}/{participants.length}
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {participants.map(p => {
          const filled  = !!currentRound.responses[p.id];
          return (
            <button
              key={p.id}
              onClick={() => onSelectParticipant(p.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color.dot }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--bc-text)' }}>{p.name}</div>
                <div className="text-xs truncate" style={{ color: 'var(--bc-text-hint)' }}>{p.role}</div>
              </div>
              <span className="text-sm flex-shrink-0">
                {filled ? <span style={{ color: 'var(--bc-success)' }}>✓</span> : <span style={{ color: 'var(--bc-border)' }}>○</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Add button */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--bc-border)' }}>
        <button
          onClick={onAdd}
          className="w-full py-2 rounded-xl text-sm font-medium transition-colors"
          style={{ color: 'var(--bc-accent)', border: '1px dashed var(--bc-accent)', background: 'var(--bc-accent-light)' }}
        >
          + Додати AI
        </button>
      </div>
    </aside>
  );
}
