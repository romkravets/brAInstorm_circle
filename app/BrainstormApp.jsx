'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from '../hooks/useSession.js';
import { useOllama }  from '../hooks/useOllama.js';
import { useClipboardPaste } from '../hooks/useClipboardPaste.js';
import { useOllama } from '../hooks/useOllama.js';
import { useSession } from '../hooks/useSession.js';
import { generatePrompt } from '../lib/promptTemplates.js';

import AddParticipantModal from '../components/AddParticipantModal.jsx';
import Header from '../components/Header.jsx';
import Onboarding from '../components/Onboarding.jsx';
import ParticipantCard from '../components/ParticipantCard.jsx';
import ParticipantPanel from '../components/ParticipantPanel.jsx';
import PasteToast from '../components/PasteToast.jsx';
import PromptDrawer from '../components/PromptDrawer.jsx';
import QuestionBar from '../components/QuestionBar.jsx';
import RoundTabs from '../components/RoundTabs.jsx';
import SynthesisBlock from '../components/SynthesisBlock.jsx';

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
    if (round.crossCheck?.agreements?.length || round.crossCheck?.conflicts?.length || round.crossCheck?.missing?.length) {
      lines.push('### Cross-check');
      if (round.crossCheck.agreements.length) lines.push('- Збігаються:', ...round.crossCheck.agreements.map((item) => `  - ${item}`));
      if (round.crossCheck.conflicts.length) lines.push('- Розбіжності:', ...round.crossCheck.conflicts.map((item) => `  - ${item}`));
      if (round.crossCheck.missing.length) lines.push('- Пропущено:', ...round.crossCheck.missing.map((item) => `  - ${item}`));
      lines.push('');
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
  const { session, dispatch, savedAt, isNew, currentRound, runMeta, participantMeta } = useSession();
  const { askOllama } = useOllama();

  const [showOnboarding, setShowOnboarding] = useState(isNew);
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [activeCardId,   setActiveCardId]   = useState(null);
  const [pasteToast,     setPasteToast]     = useState(null); // { text, participantName, participantId }
  const [isAutoSynthesizing, setIsAutoSynthesizing] = useState(false);

  // Prompt drawer state
  const [drawer, setDrawer] = useState({ key: 0, open: false, title: '', text: '', url: '' });

  useEffect(() => {
    if (isNew) setShowOnboarding(true);
  }, [isNew]);

  function openDrawer(title, text, url = '') {
    setDrawer((prev) => ({ key: prev.key + 1, open: true, title, text, url }));
  }

  const buildInitialPrompt = useCallback((participant) => {
    const prompt = generatePrompt({
      type: 'initial',
      mode: session.mode,
      question: session.question,
      sourceName: '',
      sourceResponse: '',
      round: currentRound,
      rounds: session.rounds,
      participants: session.participants,
    });

    return participant?.role ? `${prompt}\n\n[Твоя роль]: ${participant.role}` : prompt;
  }, [session, currentRound]);

  const callGenerateEndpoint = useCallback(async (payload) => {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'ollama_error');
    }
    return data;
  }, []);

  const callRunRoundEndpoint = useCallback(async (payload) => {
    const response = await fetch('/api/brainstorm/run-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'ollama_error');
    }
    return data;
  }, []);

  const callSynthesizeEndpoint = useCallback(async (payload) => {
    const response = await fetch('/api/brainstorm/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'ollama_error');
    }
    return data;
  }, []);

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
    const startedAt = Date.now();
    const prompt = buildInitialPrompt(participant);

    dispatch({ type: 'START_ROUND_RUN', total: 1, stage: 'generating' });
    dispatch({ type: 'SET_PARTICIPANT_RUNNING', participantId: participant.id });
    try {
      const result = await callGenerateEndpoint({ provider: 'ollama', model: participant.ollamaModel, prompt });
      dispatch({ type: 'SET_RESPONSE', roundId: currentRound.id, participantId: participant.id, text: result.text });
      dispatch({ type: 'SET_PARTICIPANT_DONE', participantId: participant.id, latencyMs: result.latencyMs ?? (Date.now() - startedAt) });
      dispatch({ type: 'FINISH_ROUND_RUN', stage: 'idle' });
    } catch (error) {
      dispatch({ type: 'SET_PARTICIPANT_ERROR', participantId: participant.id, error: error?.message || 'run_error' });
      dispatch({ type: 'FAIL_ROUND_RUN', error: error?.message || 'run_error' });
      throw error;
    }
  }, [buildInitialPrompt, callGenerateEndpoint, currentRound.id, dispatch]);

  const handleAutoSynthesize = useCallback(async (responsesOverride = null) => {
    const synthesisModel = session.participants.find((participant) => participant.respondMode !== 'manual')?.ollamaModel;
    const responseEntries = responsesOverride
      ? session.participants
          .filter((participant) => responsesOverride[participant.id])
          .map((participant) => ({ participantId: participant.id, name: participant.name, text: responsesOverride[participant.id] }))
      : session.participants
          .filter((participant) => currentRound.responses[participant.id])
          .map((participant) => ({ participantId: participant.id, name: participant.name, text: currentRound.responses[participant.id] }));

    if (!synthesisModel || responseEntries.length < 2) {
      throw new Error('no_runnable_participants');
    }

    setIsAutoSynthesizing(true);
    dispatch({ type: 'SET_RUN_STAGE', stage: 'synthesis' });

    try {
      const result = await callSynthesizeEndpoint({
        question: session.question,
        mode: session.mode,
        responses: responseEntries,
        provider: 'ollama',
        model: synthesisModel,
        format: 'decision_brief',
      });
      dispatch({ type: 'SET_SYNTHESIS', roundId: currentRound.id, text: result.synthesis });
      return result;
    } finally {
      setIsAutoSynthesizing(false);
    }
  }, [callSynthesizeEndpoint, currentRound.id, currentRound.responses, dispatch, session]);

  const handleRunRoundAuto = useCallback(async () => {
    const runnableParticipants = session.participants.filter((participant) => participant.respondMode !== 'manual');
    dispatch({ type: 'START_ROUND_RUN', total: runnableParticipants.length, stage: 'generating' });
    runnableParticipants.forEach((participant) => {
      dispatch({ type: 'SET_PARTICIPANT_RUNNING', participantId: participant.id });
    });

    try {
      const result = await callRunRoundEndpoint({
        question: session.question,
        mode: session.mode,
        participants: session.participants,
        round: currentRound,
        rounds: session.rounds,
        settings: {
          crossCheck: true,
          crossCheckModel: runnableParticipants[0]?.ollamaModel || '',
          timeoutMs: 120000,
        },
      });

      runnableParticipants.forEach((participant) => {
        const text = result.responses?.[participant.id];
        const meta = result.participantMeta?.[participant.id] ?? {};

        if (text) {
          dispatch({ type: 'SET_RESPONSE', roundId: currentRound.id, participantId: participant.id, text });
          dispatch({ type: 'SET_PARTICIPANT_DONE', participantId: participant.id, latencyMs: meta.latencyMs ?? null });
          return;
        }

        if (meta.status === 'error') {
          dispatch({ type: 'SET_PARTICIPANT_ERROR', participantId: participant.id, error: meta.error || 'ollama_error' });
        }
      });

      const successCount = Object.keys(result.responses ?? {}).length;

      dispatch({ type: 'SET_CROSS_CHECK', roundId: currentRound.id, crossCheck: result.crossCheck });

      if (successCount >= 2) {
        await handleAutoSynthesize(result.responses);
      }

      if (successCount > 0) {
        dispatch({ type: 'FINISH_ROUND_RUN', stage: 'idle' });
      } else {
        dispatch({ type: 'FAIL_ROUND_RUN', error: result.errors?.[0]?.error || 'run_failed' });
      }
    } catch (error) {
      dispatch({ type: 'FAIL_ROUND_RUN', error: error?.message || 'run_failed' });
    }
  }, [callRunRoundEndpoint, currentRound, dispatch, handleAutoSynthesize, session]);

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

  const mobilePromptParticipant = session.participants.find(p => p.id === activeCardId) ?? session.participants[0] ?? null;

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
            runMeta={runMeta}
          isRunActive={runMeta?.status === 'running'}
          onReset={({ title }) => dispatch({ type: 'SET_TITLE', title })}
          onExport={() => exportMarkdown(session)}
            onRunRoundAuto={handleRunRoundAuto}
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
              <div key={`${currentRound.id}:${p.id}`} id={`card-${p.id}`}>
                <ParticipantCard
                  participant={p}
                  response={currentRound.responses[p.id] ?? ''}
                  isLoading={participantMeta?.[p.id]?.status === 'running'}
                  runStatus={participantMeta?.[p.id]?.status ?? 'idle'}
                  runError={participantMeta?.[p.id]?.error ?? ''}
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
              crossCheck={currentRound.crossCheck}
              participants={session.participants}
              responses={currentRound.responses}
              onSynthesisChange={text => dispatch({ type: 'SET_SYNTHESIS', roundId: currentRound.id, text })}
              onDistillRequest={() => handlePromptRequest('multi', null, null)}
              onAutoSynthesize={() => handleAutoSynthesize()}
              isAutoSynthesizing={isAutoSynthesizing}
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
            { emoji: '📋', label: 'Промпт',   action: () => mobilePromptParticipant && handlePromptRequest('initial', mobilePromptParticipant, null) },
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
        key={drawer.key}
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
