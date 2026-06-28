function allResponses(round, participants) {
  return participants
    .filter(p => round.responses[p.id])
    .map(p => `[${p.name}]:\n${round.responses[p.id]}`)
    .join('\n\n');
}

function prevRoundsSummary(rounds, currentRoundId, participants) {
  return rounds
    .filter(r => r.id < currentRoundId && r.completedAt)
    .map(r => {
      const resp = allResponses(r, participants);
      const syn  = r.synthesis ? `\n\n[Вижимка]: ${r.synthesis}` : '';
      return `=== ${r.label} ===\n${resp}${syn}`;
    })
    .join('\n\n');
}

// ── Initial prompt (first round, no other responses yet) ─────
function initialPrompt(question, mode) {
  const instructions = {
    synthesis: 'Дай розгорнуту відповідь. Будь конкретним і структурованим.',
    debate:    'Займи чітку позицію і захищай її аргументами.',
    critique:  'Проаналізуй питання критично. Знайди слабкі місця в очевидних відповідях.',
    depth:     'Дай глибоку відповідь. Не зупиняйся на поверхні.',
  };
  return `[Питання]: ${question}\n\n${instructions[mode] ?? instructions.synthesis}`;
}

// ── Cross prompt (response from source → target) ─────────────
function crossPrompt(question, mode, sourceName, sourceResponse) {
  if (mode === 'synthesis') return `[Питання]: ${question}

[${sourceName} пропонує]:
${sourceResponse}

Твоє завдання — СИНТЕЗ:
1. Що з цього ти повністю підтримуєш? Чому?
2. Що можна розвинути або уточнити?
3. Яку додаткову перспективу ти додаєш, якої тут немає?
Будь конкретним, без повторення вже сказаного.`;

  if (mode === 'debate') return `[Питання]: ${question}

[Позиція ${sourceName}]:
${sourceResponse}

Твоє завдання — ЗАПЕРЕЧИТИ:
1. Знайди найслабший аргумент у цій позиції
2. Поясни чому ти не погоджуєшся
3. Запропонуй свою альтернативну позицію
Говори впевнено, захищай свою точку зору.`;

  if (mode === 'critique') return `[Питання]: ${question}

[Відповідь для аналізу — ${sourceName}]:
${sourceResponse}

Твоє завдання — КРИТИЧНИЙ АНАЛІЗ:
1. Некоректні припущення або логічні помилки
2. Що упущено або недооцінено
3. Де відповідь занадто загальна — конкретизуй
4. Загальна оцінка (1-10) з поясненням`;

  // depth
  return `[Питання]: ${question}

[${sourceName} пише]:
${sourceResponse}

Твоє завдання — ПОГЛИБИТИ:
1. Яке питання залишилось без відповіді в цьому тексті?
2. Де є найбільша невизначеність?
3. Що б ти дослідив глибше?
Не повторюй — рухайся далі.`;
}

// ── Deepen prompt (same participant, new round) ───────────────
function deepenPrompt(question, mode, sourceName, sourceResponse, round, rounds, participants) {
  const prev      = prevRoundsSummary(rounds, round.id, participants);
  const prevBlock = prev ? `\n\n${prev}\n` : '';
  const roundNum  = round.id;

  return `[Питання]: ${question}
${prevBlock}
=== РЕЗЮМЕ РАУНДУ ${roundNum} ===
[${sourceName}]:
${sourceResponse}

Ми переходимо до РАУНДУ ${roundNum + 1}.
На основі всього сказаного вище:
1. Яке питання залишилось без відповіді?
2. Де є найбільша невизначеність?
3. Що б ти дослідив глибше?
Не повторюй — рухайся далі.`;
}

// ── Multi-synthesis prompt (all → one AI) ────────────────────
function multiPrompt(question, round, participants) {
  const parts = participants
    .filter(p => round.responses[p.id])
    .map(p => `[${p.name}]:\n${round.responses[p.id]}`)
    .join('\n\n');

  return `[Питання]: ${question}

=== ПОГЛЯДИ УЧАСНИКІВ ===

${parts}

Твоє завдання — СИНТЕЗ ВСІХ ТОЧОК ЗОРУ:
1. Де учасники сходяться — це найімовірніша істина
2. Де суперечать — проаналізуй причину розбіжностей
3. Твоя фінальна позиція з урахуванням всього
Будь конкретним. Не перераховуй — синтезуй.`;
}

// ── Public API ────────────────────────────────────────────────
export function generatePrompt({ type, mode, question, sourceName, sourceResponse, round, rounds, participants }) {
  switch (type) {
    case 'initial':
      return initialPrompt(question, mode);
    case 'cross':
      return crossPrompt(question, mode, sourceName, sourceResponse);
    case 'deepen':
      return deepenPrompt(question, mode, sourceName, sourceResponse, round, rounds, participants);
    case 'multi':
      return multiPrompt(question, round, participants);
    default:
      return initialPrompt(question, mode);
  }
}

export const MODE_LABELS = {
  synthesis: 'Синтез ✨',
  debate:    'Дебати ⚔️',
  critique:  'Критика 🔍',
  depth:     'Глибина 🌊',
};

export const MODE_TOOLTIPS = {
  synthesis: 'AI доповнюють один одного, шукають спільне',
  debate:    'AI сперечаються, критикують позиції інших',
  critique:  'Кожен AI оцінює відповідь попереднього (1-10)',
  depth:     'Кожен раунд будується на попередньому',
};
