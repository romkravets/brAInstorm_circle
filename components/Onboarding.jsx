'use client';
import { useState } from 'react';

const STEPS = [
  {
    emoji: '❓',
    title: 'Введи питання',
    desc: 'Сформулюй що хочеш дослідити. Чим конкретніше — тим кращі відповіді від AI.',
    example: '"Яку базу даних обрати для real-time чату — PostgreSQL чи Redis?"',
  },
  {
    emoji: '🤖',
    title: 'Постав кожному AI',
    desc: 'Натисни "Копіювати промпт" → відкрий AI у новій вкладці → встав → отримай відповідь → встав назад у картку.',
    example: 'Або додай локальну Ollama-модель — вона відповість автоматично ⚡',
  },
  {
    emoji: '🔮',
    title: 'Дистилюй результат',
    desc: 'Натисни "Дистилювати" — отримаєш мульти-синтез промпт. Встав в будь-який AI → скопіюй результат → збережи у Вижимку.',
    example: 'Найкраща відповідь народжується не від одного AI, а від діалогу між ними.',
  },
];

export default function Onboarding({ onStart }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bc-bg)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🧠</div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--bc-text)' }}>Brainstorm Circle</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--bc-text-muted)' }}>
            Колективний мозковий штурм з кількома AI
          </p>
        </div>

        {/* Step card */}
        <div
          className="rounded-2xl p-6 mb-6 animate-slide-bottom"
          key={step}
          style={{ background: 'var(--bc-surface)', border: '1px solid var(--bc-border)' }}
        >
          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all"
                style={{ background: i <= step ? 'var(--bc-accent)' : 'var(--bc-border)' }}
              />
            ))}
          </div>

          <div className="text-3xl mb-3">{current.emoji}</div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--bc-text)' }}>
            Крок {step + 1}: {current.title}
          </h2>
          <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--bc-text-muted)' }}>
            {current.desc}
          </p>
          <p className="text-xs px-3 py-2 rounded-xl italic" style={{ background: 'var(--bc-accent-light)', color: 'var(--bc-accent-text)' }}>
            {current.example}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-xl font-medium text-sm border transition-colors"
              style={{ color: 'var(--bc-text-muted)', borderColor: 'var(--bc-border)' }}
            >
              ← Назад
            </button>
          )}
          <button
            onClick={() => isLast ? onStart() : setStep(s => s + 1)}
            className="flex-1 py-3 rounded-xl font-medium text-sm transition-colors"
            style={{ background: 'var(--bc-accent)', color: '#fff' }}
          >
            {isLast ? 'Розпочати →' : 'Далі →'}
          </button>
        </div>

        <button
          onClick={onStart}
          className="w-full mt-3 text-sm text-center"
          style={{ color: 'var(--bc-text-hint)' }}
        >
          Пропустити
        </button>
      </div>
    </div>
  );
}
