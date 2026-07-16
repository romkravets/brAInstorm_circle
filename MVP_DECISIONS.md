# Brainstorm Circle — MVP Рішення

> Доповнення до `BRAINSTORM_CIRCLE.md`. Тут зафіксовані рішення по вузьких місцях + що лишилось обговорити.

---

## Прийняті рішення

### 1. Стек — Next.js 14 (App Router, JSX, Tailwind CSS)

Замість Pure HTML/JS одного файлу.

**Чому:**

- Природна структура файлів без болю масштабу
- localhost → Clipboard API працює без fallback
- Можна додати API route для опційного AI-синтезу пізніше (не в MVP)
- Deploy на Vercel одною командою

**Що НЕ використовуємо в MVP:**

- Бекенд / база даних (все в localStorage)
- Auth
- API routes (поки що)

---

### 2. Дистиляція — мульти-промпт збирач

Кнопка "Дистилювати" **не генерує текст сама** — вона:

1. Бере всі відповіді поточного раунду
2. Вставляє їх у шаблон "мульти-синтез промпт" (з `BRAINSTORM_CIRCLE.md` §11)
3. Відкриває PromptDrawer з готовим промптом для копіювання
4. Юзер: копіює → вставляє в будь-який AI → отримує справжній синтез → вставляє результат назад у поле "Вижимка"

```
[Дистилювати] → PromptDrawer з мульти-промптом → юзер копіює → AI → вставляє назад
```

**Чому:** Це on-brand з філософією "без API" і дає реальний AI-синтез, а не шаблон.

**Поле "Вижимка"** — просто editable textarea під картками раунду, де юзер зберігає фінальний текст після синтезу.

---

### 3. Мульти-промпти (N×(N-1) проблема)

Кнопка "Надіслати іншим" відкриває **мікро-попап** зі списком решти учасників:

```
[→ Надіслати]
  ┌──────────────┐
  │ ● Gemini     │
  │ ● GPT-4o     │
  └──────────────┘
```

Клік на учасника → генерує промпт `відповідь source → target` відповідно до поточного режиму → відкриває PromptDrawer.

Для одного учасника (коли в сесії лише 2 AI) — попап не з'являється, промпт генерується одразу.

---

### 4. Структура файлів

```
brainstorm-circle/
├── app/
│   ├── layout.jsx
│   ├── page.jsx            ← головна, завантажує сесію з localStorage
│   └── globals.css
├── components/
│   ├── QuestionBar.jsx     ← textarea питання + таби режиму
│   ├── ParticipantPanel.jsx ← ліва панель: список AI + прогрес + "Додати AI"
│   ├── ParticipantCard.jsx  ← картка: dot + ім'я + textarea + footer-кнопки
│   ├── PromptDrawer.jsx     ← right drawer з промптом + кнопка "Копіювати"
│   ├── SynthesisBlock.jsx   ← вижимка + кнопка "Дистилювати"
│   ├── RoundTabs.jsx        ← таблетки раундів + "Новий раунд"
│   └── Onboarding.jsx       ← 3-кроковий онбординг для нових юзерів
├── lib/
│   ├── types.js             ← JSDoc типи: Session, Participant, Round
│   ├── storage.js           ← localStorage read/write + debounced autosave (2s)
│   └── promptTemplates.js   ← 4 режими × (cross / multi / depth) промпти
└── hooks/
    └── useSession.js        ← useReducer: стан сесії + dispatch actions
```

---

### 5. Автосейв та ключі localStorage

```js
// Ключ активної сесії
'bc_session_current'  → StoredSession (version: '2.0')

// Індекс всіх сесій (для майбутньої multi-session підтримки)
'bc_sessions_index'   → SessionIndex

// Автосейв: debounce 2s після будь-якої зміни
// Індикатор у хедері: "Збережено 2хв тому"
```

---

### 6. Онбординг — 3 кроки

Показується лише якщо `bc_session_current` відсутній у localStorage:

```
Крок 1: Введи питання
  → Введи своє питання в поле вгорі. Чим конкретніше — тим кращі відповіді.

Крок 2: Постав кожному AI
  → Натисни "Копіювати промпт" поруч з учасником → відкрий Claude/Gemini/GPT →
    встав промпт → отримай відповідь → встав назад у картку.

Крок 3: Дистилюй результат
  → Натисни "Дистилювати" → отримаєш мульти-промпт для фінального синтезу.
```

---

### 7. Дизайн-система — без змін

Використовуємо кольори з `BRAINSTORM_CIRCLE.md` §5 без змін:

- Фон: `#FAFAF8`, поверхня: `#FFFFFF`, акцент: `#534AB7`
- Вижимка: `#854F0B` / `#FAEEDA`
- Tailwind CSS через кастомні CSS variables (не хардкод класи)

---

## Фінальні рішення по відкритих питаннях

### ✅ A. Кольори учасників — авто-призначення

Фіксований масив з 8 кольорів, призначаються по черзі при додаванні учасника:

```js
const PARTICIPANT_COLORS = [
  { dot: "#534AB7", bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC" }, // фіолетовий
  { dot: "#0F6E56", bg: "#E6F5F1", text: "#0A5240", border: "#7DC5B5" }, // зелений
  { dot: "#A32D2D", bg: "#FDEAEA", text: "#7A1E1E", border: "#E8A0A0" }, // червоний
  { dot: "#854F0B", bg: "#FAEEDA", text: "#6A3D08", border: "#D9A96A" }, // золотий
  { dot: "#1565C0", bg: "#E3F0FF", text: "#0D47A1", border: "#90BBF0" }, // синій
  { dot: "#6A1B9A", bg: "#F3E5F5", text: "#4A148C", border: "#CE93D8" }, // пурпурний
  { dot: "#00695C", bg: "#E0F2F1", text: "#004D40", border: "#80CBC4" }, // бірюзовий
  { dot: "#E65100", bg: "#FBE9E7", text: "#BF360C", border: "#FFAB91" }, // помаранчевий
];
```

---

### ✅ B. "Новий раунд" vs "Глибина" — це різні речі

- **"Новий раунд"** (UI-дія) — завжди створює порожні картки. Попередній раунд іде в архів. Питання лишається.
- **"Глибина"** (режим) — визначає ЩО потрапляє в промпт. При Глибина + раунд 2+ → промпт автоматично включає `=== РЕЗЮМЕ РАУНДУ N ===`.

Тобто вони ортогональні. "Новий раунд" = дія. "Глибина" = режим генерації промптів.

---

### ✅ C. Учасники за замовчуванням — 2 з вибором

Стартові 2: **Claude** + **Gemini**.

При натисканні "+ Додати AI" — вибір з preset-списку:

```
● Claude          → claude.ai/new
● Gemini          → gemini.google.com
● GPT-4o          → chatgpt.com
● Mistral         → chat.mistral.ai
● Perplexity      → perplexity.ai
● Grok            → grok.com
● DeepSeek        → chat.deepseek.com
● Copilot         → copilot.microsoft.com
● Інший AI...     → [поле для імені + URL]
```

---

### ✅ D. "Відкрити ↗" — авто-detect + кастом

- Відомі AI → авто URL з таблиці вище, відкривається в новій вкладці
- "Інший AI" → юзер вводить URL при додаванні
- URL зберігається в `participant.url`

---

### ✅ E. Deploy — Vercel

```bash
npx create-next-app brainstorm-circle
vercel
```

Назва проєкту: **`brainstorm-circle`**

---

## Не беремо в MVP (відкладено)

- Темна тема
- Кілька сесій (multi-session)
- Drag & drop карток
- Таймер раунду
- Webhook / Notion інтеграція
- Шаблони питань
- Server-side збереження (PostgreSQL)

---

## Оновлення 2026-07-17 — Automation Phase

Після рев'ю поточного коду затверджено наступний крок: додати one-click автоматизацію брейншторму для нетехнічних юзерів, не ламаючи manual сценарій.

### Що фіксуємо в коді першою чергою

1. `ParticipantCard` переводимо на controlled textarea для коректного перемикання раундів.
2. `BrainstormApp` переходить з прямого виклику Ollama на route handlers.
3. `useSession` отримує run lifecycle state (`runMeta`, `participantMeta`) і нові reducer actions.

### Які route handlers додаємо

1. `GET /api/health/ollama`
2. `POST /api/ai/generate`
3. `POST /api/brainstorm/run-round`
4. `POST /api/brainstorm/synthesize`

### Принцип виконання

- Manual mode залишається доступним як fallback.
- Auto-mode запускає раунд і фінальну вижимку з одного потоку.
- Часткові помилки не скасовують успішні відповіді інших учасників.

Implementation-level payloads, action contracts і acceptance criteria винесені в окремий документ:

- `IMPLEMENTATION_SPEC.md`
