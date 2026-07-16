# Brainstorm Circle

Інструмент для колективного брейншторму між кількома AI-моделями.

## Що це зараз

Поточний застосунок:

- Next.js 16 (App Router)
- Локальне збереження сесії через localStorage
- Ручний режим (prompt copy-paste)
- Локальний авто-режим через Ollama

## Ключові документи

- Product vision: BRAINSTORM_CIRCLE.md
- MVP decisions: MVP_DECISIONS.md
- Detailed product spec: SPEC.md
- Automation implementation plan: IMPLEMENTATION_SPEC.md

## Запуск

```bash
npm install
npm run dev
```

Відкрий http://localhost:3000

## Поточний фокус (Automation Phase)

Мета фази: перейти від ручного copy-paste до one-click orchestration для нетехнічних користувачів.

План включає:

- Розширення reducer-моделі стану сесії
- Controlled input для карток учасників
- Нові App Router API handlers для генерації та оркестрації
- Автоматичний синтез результату раунду

Деталі payload/schema/action contracts описані в IMPLEMENTATION_SPEC.md.

## Структура (основне)

```text
app/
  BrainstormApp.jsx
  page.js
  layout.js
  globals.css
components/
  ParticipantCard.jsx
  ParticipantPanel.jsx
  QuestionBar.jsx
  RoundTabs.jsx
  SynthesisBlock.jsx
  PromptDrawer.jsx
hooks/
  useSession.js
  useOllama.js
lib/
  promptTemplates.js
  participants.js
  storage.js
```
