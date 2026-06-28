'use client';
import { useState, useCallback } from 'react';
import { useSession } from '../hooks/useSession.js';
import { useOllama }  from '../hooks/useOllama.js';
import { useClipboardPaste } from '../hooks/useClipboardPaste.js';
import { generatePrompt }    from '../lib/promptTemplates.js';

import Onboarding          from '../components/Onboarding.jsx';
import Header              from '../components/Header.jsx';
import QuestionBar         from '../components/QuestionBar.jsx';
import ParticipantPanel    from '../components/ParticipantPanel.jsx';
import ParticipantCard     from '../components/ParticipantCard.jsx';
import RoundTabs           from '../components/RoundTabs.jsx';
import SynthesisBlock      from '../components/SynthesisBlock.jsx';
import PromptDrawer        from '../components/PromptDrawer.jsx';
import PasteToast          from '../components/PasteToast.jsx';
import AddParticipantModal from '../components/AddParticipantModal.jsx';

function exportMarkdown(session) {
  const lines = [
    `# ${session.title}`,
    `**Питання**: ${session.question}`,
    `**Режим**: ${session.mode}`,
    `**Дата**: ${new Date(session.createdAt).toLocaleDateString('uk-UA')}`,
    '',
    '---',
    '',
  ];
  for (const round of session.rounds) {
    lines.push(`## ${round.label}`, '');
    for (const p of session.participants) {
      if (round.responses[p.id]) {
        lines.push(`### ${p.name}`, round.responses[p.id], '');
      }
    }
    if (round.synthesis) lines.push('### Вижимка', round.synthesis, '');
    lines.push('---', '');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `${session.title}.md` });
  a.click();
  URL.revokeObjectURL(url);
}

export default function Page() {
  const { session, dispatch, savedAt, isNew, currentRound, resetSession } = useSession();
  const { askOllama } = useOllama();

  const [showOnboarding, setShowOnboarding] = useState(isNew);
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [activeCardId,   setActiveCardId]   = useState(null);
  const [loadingIds,     setLoadingIds]     = useState(new Set());
  const [pasteToast,     setPasteToast]     = useState(null); // { text, participantName, participantId }

  // Prompt drawer state
  const [drawer, setDrawer] = useState({ open: false, title: '', text: '', url: '' });

  function openDrawer(title, text, url = '') {
    setDrawer({ open: true, title, text, url });
  }

  // ── Prompt request handler ───────────────────────────────────
  const handlePromptRequest = useCallback((type, sourceParticipant, targetParticipant) => {
    const prompt = generatePrompt({
      type,
      mode:             session.mode,
      question:         session.question,
      sourceName:       sourceParticipant?.name ?? '',
      sourceResponse:   currentRound.responses[sourceParticipant?.id] ?? '',
      round:            currentRound,
      rounds:           session.rounds,
      participants:     session.participants,
    });

    const title = type === 'multi'   ? 'Мульти-синтез промпт'
                : type === 'initial' ? `Промпт для ${sourceParticipant?.name}`
                : type === 'cross'   ? `Відповідь ${sourceParticipant?.name} → ${targetParticipant?.name}`
                :                      `Поглибити — ${sourceParticipant?.name}`;

    const url = type === 'initial' || type === 'cross' || type === 'deepen'
      ? (targetParticipant?.url || sourceParticipant?.url || '')
      : '';

    openDrawer(title, prompt, url);
  }, [session, currentRound]);

  // ── Ollama runner ────────────────────────────────────────────
  const handleRunOllama = useCallback(async (participant) => {
    const prompt = generatePrompt({
      type:           'initial',
      mode:           session.mode,
      question:       session.question,
      sourceName:     '',
      sourceResponse: '',
      round:          currentRound,
      rounds:         session.rounds,
      participants:   session.participants,
    });

    setLoadingIds(prev => new Set(prev).add(participant.id));
    try {
      const response = await askOllama(participant.ollamaModel, prompt);
      dispatch({ type: 'SET_RESPONSE', roundId: currentRound.id, participantId: participant.id, text: response });
    } finally {
      setLoadingIds(prev => { const s = new Set(prev); s.delete(participant.id); return s; });
    }
  }, [session, currentRound, askOllama, dispatch]);

  // ── Clipboard paste ──────────────────────────────────────────
  useClipboardPaste({
    participants:        session.participants,
    currentRound,
    activeParticipantId: activeCardId,
    onPaste: ({ text, targetParticipant }) => {
      setPasteToast({ text, participantName: targetParticipant.name, participantId: targetParticipant.id });
    },
  });

  function confirmPaste({ text, participantId }) {
    dispatch({ type: 'SET_RESPONSE', roundId: currentRound.id, participantId, text });
  }

  // ── Scroll to card ───────────────────────────────────────────
  function scrollToCard(participantId) {
    setActiveCardId(participantId);
    document.getElementById(`card-${participantId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (showOnboarding) {
    return <Onboarding onStart={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bc-bg)' }}>
      {/* Left panel */}
      <ParticipantPanel
        participants={session.participants}
        currentRound={currentRound}
        onAdd={() => setShowAddModal(true)}
        onSelectParticipant={scrollToCard}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          session={session}
          savedAt={savedAt}
          onReset={({ title }) => dispatch({ type: 'SET_TITLE', title })}
          onExport={() => exportMarkdown(session)}
          onNewRound={() => dispatch({ type: 'NEW_ROUND' })}
        />

        <QuestionBar
          question={session.question}
          mode={session.mode}
          onQuestionChange={q => dispatch({ type: 'SET_QUESTION', question: q })}
          onModeChange={m => dispatch({ type: 'SET_MODE', mode: m })}
        />

        <RoundTabs
          rounds={session.rounds}
          currentRound={session.currentRound}
          onSwitch={id => dispatch({ type: 'SWITCH_ROUND', roundId: id })}
          onNewRound={() => dispatch({ type: 'NEW_ROUND' })}
          onRename={(id, label) => dispatch({ type: 'RENAME_ROUND', roundId: id, label })}
        />

        {/* Cards grid */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
          >
            {session.participants.map(p => (
              <div key={p.id} id={`card-${p.id}`}>
                <ParticipantCard
                  participant={p}
                  response={currentRound.responses[p.id] ?? ''}
                  isLoading={loadingIds.has(p.id)}
                  isActive={activeCardId === p.id}
                  otherParticipants={session.participants.filter(x => x.id !== p.id)}
                  onResponseChange={text => dispatch({ type: 'SET_RESPONSE', roundId: currentRound.id, participantId: p.id, text })}
                  onPromptRequest={handlePromptRequest}
                  onRunOllama={handleRunOllama}
                  onSetActive={() => setActiveCardId(p.id)}
                />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <SynthesisBlock
              synthesis={currentRound.synthesis}
              participants={session.participants}
              responses={currentRound.responses}
              onSynthesisChange={text => dispatch({ type: 'SET_SYNTHESIS', roundId: currentRound.id, text })}
              onDistillRequest={() => handlePromptRequest('multi', null, null)}
            />
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 border-t flex"
          style={{ background: 'var(--bc-surface)', borderColor: 'var(--bc-border)' }}
        >
          {[
            { emoji: '👥', label: 'Учасники', action: () => setShowAddModal(true) },
            { emoji: '📋', label: 'Промпт',   action: () => handlePromptRequest('initial', session.participants[0], null) },
            { emoji: '🔀', label: 'Синтез',   action: () => handlePromptRequest('multi', null, null) },
            { emoji: '+ Раунд', label: '',    action: () => dispatch({ type: 'NEW_ROUND' }) },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="flex-1 flex flex-col items-center justify-center py-3 text-xs gap-0.5"
              style={{ color: 'var(--bc-text-muted)' }}
            >
              <span className="text-lg leading-none">{item.emoji}</span>
              {item.label && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Overlays */}
      <PromptDrawer
        isOpen={drawer.open}
        promptText={drawer.text}
        title={drawer.title}
        targetUrl={drawer.url}
        onClose={() => setDrawer(d => ({ ...d, open: false }))}
      />

      <PasteToast
        toast={pasteToast}
        onConfirm={confirmPaste}
        onDismiss={() => setPasteToast(null)}
      />

      {showAddModal && (
        <AddParticipantModal
          onAdd={preset => dispatch({ type: 'ADD_PARTICIPANT', preset })}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
