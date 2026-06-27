# Brainstorm Circle — Повна технічна специфікація

> Версія: 2.0-MVP  
> Стек: Next.js 14 (App Router, JSX), Tailwind CSS, localStorage  
> Deploy: Vercel

---

## Зміст

1. [Концепція та еволюція](#1-концепція-та-еволюція)
2. [Режими роботи учасників](#2-режими-роботи-учасників)
3. [Архітектура](#3-архітектура)
4. [Модель даних](#4-модель-даних)
5. [State Management](#5-state-management)
6. [localStorage схема](#6-localstorage-схема)
7. [Компоненти детально](#7-компоненти-детально)
8. [Промпт-шаблони](#8-промпт-шаблони)
9. [Дизайн-система](#9-дизайн-система)
10. [Онбординг](#10-онбординг)
11. [API Routes](#11-api-routes)
12. [Структура файлів](#12-структура-файлів)
13. [Відкриті питання](#13-відкриті-питання)

---

## 1. Концепція та еволюція

### Що таке Brainstorm Circle

Інструмент для оркестрування мозкового штурму між кількома AI-моделями в одному вікні. Центральна метафора: **круглий стіл**, де кожен AI — учасник з власним кольором і роллю, юзер — модератор.

### Три рівні автоматизації

```
Рівень 1: Мануальний (MVP базовий)
  Юзер отримує згенерований промпт → копіює → відкриває браузер-вкладку → вставляє
  → отримує відповідь → копіює → вставляє назад у картку
  Підходить для: Claude.ai, ChatGPT, Gemini (безкоштовні плани)

Рівень 2: Локальний AI (MVP розширений — Ollama)
  Ollama запущений локально → API на localhost:11434
  Brainstorm Circle → /api/local-ai → Ollama → відповідь автоматично у картку
  Моделі: Llama3, Mistral, Gemma, Qwen, DeepSeek-R1 тощо
  Підходить для: розробники, privacy-орієнтовані юзери, нульова вартість

Рівень 3: Cloud API (після MVP)
  Юзер вводить API ключ (Anthropic / OpenAI / Gemini) у налаштуваннях
  Brainstorm Circle → /api/cloud-ai → провайдер → відповідь автоматично у картку
  Підходить для: платні аккаунти, enterprise
```

### Чому це не те ж саме що LangChain / CrewAI

Brainstorm Circle відрізняється:
- Юзер завжди контролює кожен крок і може редагувати відповіді
- Немає автономних агентів — тільки "зупинись, покажи мені, я вирішую далі"
- Підтримує мікс мануальних і автоматичних учасників в одній сесії
- Без коду, без конфігурації — просто браузер

---

## 2. Режими роботи учасників

Кожен учасник (`Participant`) має `mode` — як він відповідає:

```js
participant.respondMode:
  'manual'     — юзер copy-paste вручну (дефолт для Claude.ai, ChatGPT тощо)
  'ollama'     — авто через Ollama API (localhost:11434)
  'api'        — авто через cloud API (ключ зберігається в учасника, після MVP)
```

### Preset-список учасників при додаванні

```
Ім'я          respondMode   URL / model
──────────────────────────────────────────────────────
Claude         manual        claude.ai/new
Gemini         manual        gemini.google.com
GPT-4o         manual        chatgpt.com
Mistral        manual        chat.mistral.ai
Perplexity     manual        perplexity.ai
Grok           manual        grok.com
DeepSeek       manual        chat.deepseek.com
Copilot        manual        copilot.microsoft.com
──────────────────────────────────────────────────────
Llama 3.1      ollama        model: llama3.1
Mistral 7B     ollama        model: mistral
Gemma 2        ollama        model: gemma2
Qwen 2.5       ollama        model: qwen2.5
DeepSeek-R1    ollama        model: deepseek-r1
Phi-4          ollama        model: phi4
──────────────────────────────────────────────────────
Інший AI...    manual        [юзер вводить URL]
Інша модель... ollama        [юзер вводить model name]
```

Кнопка "Відкрити ↗" доступна тільки для `respondMode: 'manual'`.  
Для `ollama` — кнопка "Запустити ▶" яка тригерить авто-відповідь.

### Індикатор статусу в картці

```
respondMode: 'manual'  →  🔗 Мануально        (сірий badge)
respondMode: 'ollama'  →  ⚡ Ollama            (зелений badge)
respondMode: 'api'     →  ☁️ API               (синій badge)

Під час авто-відповіді:
  ⟳ Генерує...         (анімований spinner в cartці)
```

---

## 3. Архітектура

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App (браузер)                   │
│                                                             │
│  useSession (useReducer)                                    │
│       ↕ dispatch actions                                    │
│  localStorage (autosave 2s debounce)                        │
│                                                             │
│  Компоненти:                                                │
│  QuestionBar → ParticipantPanel → ParticipantCard           │
│  PromptDrawer ← (triggered by будь-яка кнопка промпту)     │
│  SynthesisBlock ← (triggered by "Дистилювати")             │
│  RoundTabs ← (triggered by "Новий раунд")                  │
└──────────────────────┬──────────────────────────────────────┘
                       │ fetch (тільки для Ollama учасників)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  Next.js API Routes                         │
│                                                             │
│  /api/local-ai     → Ollama proxy (localhost:11434)        │
│  /api/check-ollama → перевірка чи Ollama запущений         │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  Ollama (localhost:11434) — запущений на машині юзера       │
│  Моделі: llama3.1, mistral, gemma2, qwen2.5 тощо           │
└─────────────────────────────────────────────────────────────┘
```

### Потік даних

```
Юзер вводить питання
    → dispatch({ type: 'SET_QUESTION', question })
    → autosave до localStorage (debounced 2s)
    → QuestionBar рендерить питання

Юзер натискає "Копіювати промпт" (manual)
    → generatePrompt(session, participantId, targetId)
    → відкриває PromptDrawer з текстом
    → Clipboard.copy()
    → Юзер відкриває AI у новій вкладці, вставляє, отримує відповідь

Юзер вставляє відповідь у textarea
    → dispatch({ type: 'SET_RESPONSE', roundId, participantId, text })
    → autosave

Юзер натискає "Запустити ▶" (ollama)
    → dispatch({ type: 'SET_LOADING', participantId, true })
    → fetch('/api/local-ai', { model, prompt })
    → dispatch({ type: 'SET_RESPONSE', ... })
    → dispatch({ type: 'SET_LOADING', participantId, false })

Юзер натискає "Дистилювати"
    → generateMultiPrompt(session, currentRound)
    → відкриває PromptDrawer з мульти-синтез промптом
    → юзер копіює → вставляє в AI → отримує синтез → вставляє у SynthesisBlock
```

---

## 4. Модель даних

```typescript
// ── Кольори учасника ──────────────────────────────────────────
interface ColorConfig {
  dot:    string;  // '#534AB7' — колір dot-аватара і акцентів
  bg:     string;  // '#EEEDFE' — фон картки
  text:   string;  // '#3C3489' — текст заголовка
  border: string;  // '#AFA9EC' — рамка картки
}

// ── Учасник ──────────────────────────────────────────────────
interface Participant {
  id:           string;        // nanoid()
  name:         string;        // 'Claude', 'Gemini', 'Llama 3.1'
  color:        ColorConfig;   // авто-призначено з PARTICIPANT_COLORS[]
  role:         string;        // 'Аналітик' | 'Критик' | 'Синтезатор' | custom
  respondMode:  'manual' | 'ollama' | 'api';
  url:          string;        // для manual: claude.ai/new; для ollama: ''
  ollamaModel:  string;        // для ollama: 'llama3.1'; інакше ''
  addedAt:      number;        // timestamp
}

// ── Раунд ───────────────────────────────────────────────────
interface Round {
  id:          number;          // 1, 2, 3...
  label:       string;          // 'Раунд 1' (можна перейменувати)
  responses:   Record<string, string>;  // participantId → текст відповіді
  synthesis:   string;          // текст вижимки (юзер пише після дистиляції)
  createdAt:   number;
  completedAt: number | null;   // null = в роботі
}

// ── Сесія ───────────────────────────────────────────────────
interface Session {
  id:           string;        // nanoid()
  title:        string;        // 'Нова сесія' → редагується юзером
  question:     string;        // центральне питання
  mode:         'synthesis' | 'debate' | 'critique' | 'depth';
  participants: Participant[];
  rounds:       Round[];
  currentRound: number;        // id активного раунду
  createdAt:    number;
  updatedAt:    number;
}
```

### Константа кольорів (авто-призначення по черзі)

```js
// lib/colors.js
export const PARTICIPANT_COLORS = [
  { dot: '#534AB7', bg: '#EEEDFE', text: '#3C3489', border: '#AFA9EC' }, // фіолетовий
  { dot: '#0F6E56', bg: '#E6F5F1', text: '#0A5240', border: '#7DC5B5' }, // зелений
  { dot: '#A32D2D', bg: '#FDEAEA', text: '#7A1E1E', border: '#E8A0A0' }, // червоний
  { dot: '#854F0B', bg: '#FAEEDA', text: '#6A3D08', border: '#D9A96A' }, // золотий
  { dot: '#1565C0', bg: '#E3F0FF', text: '#0D47A1', border: '#90BBF0' }, // синій
  { dot: '#6A1B9A', bg: '#F3E5F5', text: '#4A148C', border: '#CE93D8' }, // пурпурний
  { dot: '#00695C', bg: '#E0F2F1', text: '#004D40', border: '#80CBC4' }, // бірюзовий
  { dot: '#E65100', bg: '#FBE9E7', text: '#BF360C', border: '#FFAB91' }, // помаранчевий
];

export function getNextColor(participants) {
  return PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length];
}
```

### Preset-список AI (для діалогу додавання)

```js
// lib/participants.js
export const AI_PRESETS = [
  // ── Cloud (manual) ────────────────────────────────
  { name: 'Claude',     respondMode: 'manual', url: 'https://claude.ai/new',              ollamaModel: '', role: 'Аналітик' },
  { name: 'Gemini',     respondMode: 'manual', url: 'https://gemini.google.com',          ollamaModel: '', role: 'Аналітик' },
  { name: 'GPT-4o',     respondMode: 'manual', url: 'https://chatgpt.com',                ollamaModel: '', role: 'Аналітик' },
  { name: 'Mistral',    respondMode: 'manual', url: 'https://chat.mistral.ai',            ollamaModel: '', role: 'Аналітик' },
  { name: 'Perplexity', respondMode: 'manual', url: 'https://perplexity.ai',             ollamaModel: '', role: 'Аналітик' },
  { name: 'Grok',       respondMode: 'manual', url: 'https://grok.com',                  ollamaModel: '', role: 'Аналітик' },
  { name: 'DeepSeek',   respondMode: 'manual', url: 'https://chat.deepseek.com',         ollamaModel: '', role: 'Аналітик' },
  { name: 'Copilot',    respondMode: 'manual', url: 'https://copilot.microsoft.com',     ollamaModel: '', role: 'Аналітик' },
  // ── Local Ollama ──────────────────────────────────
  { name: 'Llama 3.1',     respondMode: 'ollama', url: '', ollamaModel: 'llama3.1',    role: 'Аналітик' },
  { name: 'Mistral 7B',    respondMode: 'ollama', url: '', ollamaModel: 'mistral',     role: 'Аналітик' },
  { name: 'Gemma 2',       respondMode: 'ollama', url: '', ollamaModel: 'gemma2',      role: 'Аналітик' },
  { name: 'Qwen 2.5',      respondMode: 'ollama', url: '', ollamaModel: 'qwen2.5',     role: 'Аналітик' },
  { name: 'DeepSeek-R1',   respondMode: 'ollama', url: '', ollamaModel: 'deepseek-r1', role: 'Критик'   },
  { name: 'Phi-4',          respondMode: 'ollama', url: '', ollamaModel: 'phi4',        role: 'Аналітик' },
];
```

---

## 5. State Management

### useSession — useReducer

```js
// hooks/useSession.js

const initialSession = {
  id: nanoid(),
  title: 'Нова сесія',
  question: '',
  mode: 'synthesis',
  participants: [
    { ...AI_PRESETS[0], id: nanoid(), color: PARTICIPANT_COLORS[0], addedAt: Date.now() }, // Claude
    { ...AI_PRESETS[1], id: nanoid(), color: PARTICIPANT_COLORS[1], addedAt: Date.now() }, // Gemini
  ],
  rounds: [{ id: 1, label: 'Раунд 1', responses: {}, synthesis: '', createdAt: Date.now(), completedAt: null }],
  currentRound: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

function sessionReducer(state, action) {
  switch (action.type) {

    case 'LOAD_SESSION':
      return action.session;

    case 'SET_QUESTION':
      return { ...state, question: action.question, updatedAt: Date.now() };

    case 'SET_MODE':
      return { ...state, mode: action.mode, updatedAt: Date.now() };

    case 'SET_TITLE':
      return { ...state, title: action.title, updatedAt: Date.now() };

    case 'ADD_PARTICIPANT': {
      const color = getNextColor(state.participants);
      const newP = { ...action.preset, id: nanoid(), color, addedAt: Date.now() };
      return { ...state, participants: [...state.participants, newP], updatedAt: Date.now() };
    }

    case 'REMOVE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.filter(p => p.id !== action.participantId),
        updatedAt: Date.now(),
      };

    case 'UPDATE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.map(p =>
          p.id === action.participantId ? { ...p, ...action.updates } : p
        ),
        updatedAt: Date.now(),
      };

    case 'SET_RESPONSE': {
      const rounds = state.rounds.map(r =>
        r.id === action.roundId
          ? { ...r, responses: { ...r.responses, [action.participantId]: action.text } }
          : r
      );
      return { ...state, rounds, updatedAt: Date.now() };
    }

    case 'SET_SYNTHESIS': {
      const rounds = state.rounds.map(r =>
        r.id === action.roundId ? { ...r, synthesis: action.text } : r
      );
      return { ...state, rounds, updatedAt: Date.now() };
    }

    case 'RENAME_ROUND': {
      const rounds = state.rounds.map(r =>
        r.id === action.roundId ? { ...r, label: action.label } : r
      );
      return { ...state, rounds, updatedAt: Date.now() };
    }

    case 'NEW_ROUND': {
      const newId = Math.max(...state.rounds.map(r => r.id)) + 1;
      const completedRounds = state.rounds.map(r =>
        r.id === state.currentRound ? { ...r, completedAt: Date.now() } : r
      );
      return {
        ...state,
        rounds: [...completedRounds, { id: newId, label: `Раунд ${newId}`, responses: {}, synthesis: '', createdAt: Date.now(), completedAt: null }],
        currentRound: newId,
        updatedAt: Date.now(),
      };
    }

    case 'SWITCH_ROUND':
      return { ...state, currentRound: action.roundId };

    default:
      return state;
  }
}
```

### Autosave

```js
// hooks/useSession.js (продовження)

export function useSession() {
  const [session, dispatch] = useReducer(sessionReducer, null, () => {
    const saved = loadSession(); // з localStorage
    return saved ?? initialSession;
  });

  const [savedAt, setSavedAt] = useState(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSession(session);
      setSavedAt(Date.now());
    }, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [session]);

  return { session, dispatch, savedAt };
}
```

### Індикатор збереження (хедер)

```
Стан           Текст
──────────────────────────────
Змінився       (нічого — просто debounce тікає)
Збережений     "Збережено 2хв тому"
Помилка        "⚠ Не вдалось зберегти"
```

---

## 6. localStorage схема

```js
// lib/storage.js

const SESSION_KEY = 'bc_session_current';
const INDEX_KEY   = 'bc_sessions_index';
const VERSION     = '2.0';

export function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ version: VERSION, session }));
    // Оновлюємо індекс
    const index = loadIndex();
    const entry = { id: session.id, title: session.title, updatedAt: session.updatedAt, participantCount: session.participants.length, roundCount: session.rounds.length };
    const updated = index.filter(e => e.id !== session.id);
    localStorage.setItem(INDEX_KEY, JSON.stringify([entry, ...updated].slice(0, 10)));
  } catch (e) {
    console.warn('BC: save failed', e);
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { version, session } = JSON.parse(raw);
    if (version !== VERSION) return null; // міграція не передбачена в MVP
    return session;
  } catch {
    return null;
  }
}

export function loadIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]');
  } catch {
    return [];
  }
}
```

### Ліміти

```
Максимум раундів:     50
Максимум учасників:  10
Максимум сесій:      10 (у bc_sessions_index, для майбутнього multi-session)
Довжина відповіді:   без обмежень (localStorage квота ~5MB)
```

---

## 7. Компоненти детально

### page.jsx — головна

```
Стани:
  showOnboarding: true якщо localStorage порожній

Рендер:
  if (showOnboarding) → <Onboarding onStart={() => setShowOnboarding(false)} />
  else:
    <div class="flex h-screen overflow-hidden">
      <ParticipantPanel />           ← ліва колонка (240px fixed)
      <main class="flex-1 flex flex-col overflow-y-auto">
        <Header />                   ← назва + savedAt + "Новий раунд" + "Експорт"
        <QuestionBar />
        <RoundTabs />
        <div class="cards-grid">
          {participants.map → <ParticipantCard />}
        </div>
        <SynthesisBlock />
      </main>
    </div>
    <PromptDrawer />                 ← overlay drawer справа, z-50
```

---

### QuestionBar.jsx

```
Props:
  question: string
  mode: 'synthesis' | 'debate' | 'critique' | 'depth'
  onChange: (question) => void
  onModeChange: (mode) => void

Стани textarea:
  empty   → placeholder "Введи питання для мозкового штурму..."
            + підказка "Чим конкретніше — тим кращі відповіді"
  focused → рамка акцентного кольору (#534AB7)
  filled  → показує кількість слів + кнопка "Копіювати питання"

Таби режиму (під textarea):
  [Синтез ✨]  [Дебати ⚔️]  [Критика 🔍]  [Глибина 🌊]
  Активний таб — підкреслення акцентом

Tooltip для кожного режиму (при hover):
  Синтез  → "AI доповнюють один одного, шукають спільне"
  Дебати  → "AI сперечаються, критикують позиції інших"
  Критика → "Кожен AI оцінює відповідь попереднього за шкалою 1-10"
  Глибина → "Кожен раунд будується на попередньому"
```

---

### ParticipantPanel.jsx (ліва колонка)

```
Props:
  participants: Participant[]
  currentRound: Round
  onAdd: () => void
  onSelect: (participantId) => void

Рендер:
  ┌────────────────┐
  │ Учасники (3)   │
  │ + кнопка       │
  ├────────────────┤
  │ ● Claude    ✓  │  ← заповнено (response.length > 0)
  │ ⚡ Llama    ⟳  │  ← генерує (loading)
  │ ● Gemini    ○  │  ← порожньо
  ├────────────────┤
  │ + Додати AI    │
  └────────────────┘

Індикатор прогресу під списком:
  "2 з 3 AI відповіли"
  ●●○  (filled dots)

Клік на учасника → скролить до його картки (scrollIntoView)
```

---

### ParticipantCard.jsx

```
Props:
  participant: Participant
  response: string
  isLoading: boolean
  roundIndex: number
  onResponseChange: (text) => void
  onPromptRequest: (type, sourceId, targetId?) => void

Стани картки:
  empty    → border-dashed, textarea placeholder "Вставте відповідь від {name}..."
  filled   → border solid кольором учасника, легкий bg
  loading  → spinner overlay на textarea, "Генерує..." текст
  expanded → fullscreen modal для зручного читання довгої відповіді

Структура:
  ┌─────────────────────────────────────────────┐
  │ ● {name}  [{mode badge}]  [↗ Відкрити] [⋯] │  ← header
  ├─────────────────────────────────────────────┤
  │                                             │
  │  <textarea>                                 │
  │  (auto-resize, мін 120px)                   │
  │                                             │
  ├─────────────────────────────────────────────┤
  │ [→ Надіслати]  [↓ Поглибити]  [⤢ Розгорнути]│  ← footer
  └─────────────────────────────────────────────┘

Кнопка "Відкрити ↗":
  respondMode==='manual' → відкриває participant.url в новій вкладці
  respondMode==='ollama' → замінюється на "▶ Запустити" → тригерить /api/local-ai

Кнопка "Надіслати →":
  participants.length === 2 → відразу генерує промпт для іншого учасника
  participants.length >= 3  → показує мікро-попап з вибором таргета:
    ┌─────────────┐
    │ ● Gemini    │
    │ ● GPT-4o    │
    └─────────────┘

Кнопка "Поглибити ↓":
  Генерує "depth" промпт для цього ж учасника з урахуванням поточної відповіді
  Відкриває PromptDrawer

Кнопка "⤢ Розгорнути":
  Відкриває fullscreen modal з відповіддю (тільки читання + кнопка "Закрити")

"⋯ Меню" (три крапки):
  → Перейменувати учасника
  → Змінити роль
  → Видалити учасника
```

---

### PromptDrawer.jsx

```
Props:
  isOpen: boolean
  promptText: string
  title: string          // "Промпт для Gemini" / "Мульти-синтез" тощо
  targetUrl?: string     // якщо є — показує кнопку "Відкрити AI →"
  onClose: () => void

Рендер:
  Right drawer (slide-in від правого краю), 480px шириною
  Overlay backdrop (click → закрити)

  ┌────────────────────────────────────────┐
  │ Промпт для Gemini              [✕]    │
  ├────────────────────────────────────────┤
  │                                        │
  │  [текст промпту — монопростір]         │
  │  (selectable, не редагується)          │
  │                                        │
  ├────────────────────────────────────────┤
  │ [Копіювати ✓]    [Відкрити Gemini →]  │
  └────────────────────────────────────────┘

Після копіювання:
  Кнопка "Копіювати" → "Скопійовано ✓" (2 секунди)
```

---

### SynthesisBlock.jsx

```
Props:
  synthesis: string
  participants: Participant[]
  responses: Record<string, string>
  onSynthesisChange: (text) => void
  onDistillRequest: () => void   // тригерить PromptDrawer з мульти-промптом

Стани:
  no_responses   → "Дистиляція з'явиться після того як AI відповідять"
                   (сірий, прозорий)
  partial        → "1 з 3 AI відповіли — додай більше відповідей для кращого синтезу"
  ready          → активна кнопка "Дистилювати"
  has_synthesis  → показує textarea з вижимкою (редагується)

Структура при has_synthesis:
  ┌──────────────────────────────────────────┐
  │ 🔮 Вижимка раунду                        │
  ├──────────────────────────────────────────┤
  │ <textarea>                               │
  │ (редагується юзером після копіювання     │
  │  результату синтезу з AI)                │
  ├──────────────────────────────────────────┤
  │ [🔀 Дистилювати знову]  [📋 Копіювати]  │
  └──────────────────────────────────────────┘
```

---

### RoundTabs.jsx

```
Props:
  rounds: Round[]
  currentRound: number
  onSwitch: (roundId) => void
  onNewRound: () => void
  onRename: (roundId, label) => void

Рендер:
  Горизонтальний рядок таблеток:
  [Раунд 1 ✓]  [Раунд 2 ●]  [+ Новий раунд]

  ✓ = completed (completedAt != null)
  ● = активний

Подвійний клік на таблетку → inline edit назви раунду
```

---

### AddParticipantModal.jsx

```
Відкривається при "+ Додати AI"

Крок 1: Вибір з preset-сітки
  ┌────────────────────────────────────────────┐
  │ Обери учасника                             │
  ├─────────────────────────────────────────────┤
  │  Cloud AI (мануально)                      │
  │  [Claude] [Gemini] [GPT-4o] [Mistral] ...  │
  ├─────────────────────────────────────────────┤
  │  Локальні (Ollama)                         │
  │  [Llama 3.1] [Gemma 2] [Qwen 2.5] ...     │
  │  ℹ️ Потребує Ollama на localhost:11434      │
  ├─────────────────────────────────────────────┤
  │  [Інший AI...]  [Інша модель Ollama...]    │
  └─────────────────────────────────────────────┘

Крок 2 (тільки для "Інший AI"):
  Ім'я:  [_____________]
  URL:   [https://...]
  Роль:  [Аналітик ▼]  (Аналітик / Критик / Синтезатор / Власна)

Крок 2 (для "Інша модель Ollama"):
  Ім'я:   [_____________]
  Модель: [llama3.1     ]  (підказка: "введи назву моделі як в Ollama")
  Роль:   [Аналітик ▼]
```

---

### Header.jsx

```
┌──────────────────────────────────────────────────────────────┐
│  🧠 {session.title}  [✎]   Збережено 2хв тому   [Експорт MD] │
└──────────────────────────────────────────────────────────────┘

[✎] → inline edit назви сесії
[Експорт MD] → генерує і завантажує .md файл сесії
```

---

## 8. Промпт-шаблони

```js
// lib/promptTemplates.js

// ── Утиліти ──────────────────────────────────────────────────
function allResponses(round, participants) {
  return participants
    .filter(p => round.responses[p.id])
    .map(p => `[${p.name}]:\n${round.responses[p.id]}`)
    .join('\n\n');
}

function prevRoundsSummary(rounds, currentRoundId, participants) {
  return rounds
    .filter(r => r.id < currentRoundId && r.completedAt)
    .map(r => `=== ${r.label} ===\n${allResponses(r, participants)}${r.synthesis ? `\n\n[Вижимка]: ${r.synthesis}` : ''}`)
    .join('\n\n');
}

// ── Основний генератор ────────────────────────────────────────
export function generatePrompt({ type, mode, session, sourceParticipant, targetParticipant, round }) {
  const { question, rounds } = session;
  const sourceResponse = round.responses[sourceParticipant?.id] ?? '';

  // Перший раунд — без контексту попередніх
  // Другий раунд+ — depth mode включає резюме

  if (type === 'initial') {
    // Перший промпт для учасника (ще немає відповідей інших)
    return initialPrompt({ question, mode, targetParticipant });
  }

  if (type === 'cross') {
    // Відповідь sourceParticipant → надіслати targetParticipant
    return crossPrompt({ question, mode, sourceParticipant, sourceResponse, targetParticipant });
  }

  if (type === 'deepen') {
    // Поглибити відповідь одного учасника
    return deepenPrompt({ question, mode, sourceParticipant, sourceResponse, round, rounds, session });
  }

  if (type === 'multi') {
    // Дистиляція: всі відповіді → одному AI
    return multiPrompt({ question, round, session });
  }
}

// ── Шаблони по режиму ─────────────────────────────────────────

function initialPrompt({ question, mode, targetParticipant }) {
  // Перший раунд, немає контексту
  const modeInstruction = {
    synthesis: 'Дай розгорнуту відповідь. Будь конкретним і структурованим.',
    debate:    'Займи чітку позицію і захищай її. Наведи сильні аргументи.',
    critique:  'Проаналізуй питання критично. Знайди слабкі місця в очевидних відповідях.',
    depth:     'Дай глибоку відповідь. Не зупиняйся на поверхні.',
  }[mode];

  return `[Питання]: ${question}

${modeInstruction}`;
}

function crossPrompt({ question, mode, sourceParticipant, sourceResponse, targetParticipant }) {
  if (mode === 'synthesis') return `[Питання]: ${question}

[${sourceParticipant.name} пропонує]:
${sourceResponse}

Твоє завдання — СИНТЕЗ:
1. Що з цього ти повністю підтримуєш? Чому?
2. Що можна розвинути або уточнити?
3. Яку додаткову перспективу ти додаєш, якої тут немає?
Будь конкретним, без повторення вже сказаного.`;

  if (mode === 'debate') return `[Питання]: ${question}

[Позиція ${sourceParticipant.name}]:
${sourceResponse}

Твоє завдання — ЗАПЕРЕЧИТИ:
1. Знайди найслабший аргумент у цій позиції
2. Поясни чому ти не погоджуєшся
3. Запропонуй свою альтернативну позицію
Говори впевнено, захищай свою точку зору.`;

  if (mode === 'critique') return `[Питання]: ${question}

[Відповідь для аналізу — ${sourceParticipant.name}]:
${sourceResponse}

Твоє завдання — КРИТИЧНИЙ АНАЛІЗ:
1. Некоректні припущення або логічні помилки
2. Що упущено або недооцінено
3. Де відповідь занадто загальна — конкретизуй
4. Загальна оцінка (1-10) з поясненням`;

  if (mode === 'depth') return `[Питання]: ${question}

[${sourceParticipant.name} пише]:
${sourceResponse}

Твоє завдання — ПОГЛИБИТИ:
1. Яке питання залишилось без відповіді в цьому тексті?
2. Де є найбільша невизначеність?
3. Що б ти дослідив глибше?
Не повторюй — рухайся далі.`;
}

function deepenPrompt({ question, mode, sourceParticipant, sourceResponse, round, rounds, session }) {
  const prev = prevRoundsSummary(rounds, round.id, session.participants);
  const prevSection = prev ? `\n\n${prev}\n` : '';
  const roundNum = round.id;

  return `[Питання]: ${question}
${prevSection}
=== РЕЗЮМЕ РАУНДУ ${roundNum} ===
[${sourceParticipant.name}]:
${sourceResponse}

Ми переходимо до РАУНДУ ${roundNum + 1}.
На основі всього сказаного вище:
1. Яке питання залишилось без відповіді?
2. Де є найбільша невизначеність?
3. Що б ти дослідив глибше?
Не повторюй — рухайся далі.`;
}

function multiPrompt({ question, round, session }) {
  const parts = session.participants
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
```

---

## 9. Дизайн-система

### CSS Variables (globals.css)

```css
:root {
  /* Нейтральні */
  --bc-bg:           #FAFAF8;
  --bc-surface:      #FFFFFF;
  --bc-border:       #E8E6E0;
  --bc-border-hover: #C8C6C0;
  --bc-text:         #1A1917;
  --bc-text-muted:   #6B6966;
  --bc-text-hint:    #9B9895;

  /* Акцент */
  --bc-accent:       #534AB7;
  --bc-accent-light: #EEEDFE;
  --bc-accent-text:  #3C3489;

  /* Вижимка */
  --bc-synthesis:    #854F0B;
  --bc-synthesis-bg: #FAEEDA;

  /* Семантичні */
  --bc-success:      #0F6E56;
  --bc-danger:       #A32D2D;
  --bc-loading:      #1565C0;
}
```

### Layout

```
Desktop (≥1024px):
  Ліва панель: 240px fixed
  Головна: flex-1, overflow-y-auto

Tablet (768–1023px):
  Ліва панель: 200px
  Картки: 2 колонки

Mobile (< 768px):
  Ліва панель: прихована (відкривається по кнопці)
  Картки: 1 колонка
  Bottom nav: [Питання] [Учасники] [Вижимка]
```

### Картки учасників — Grid

```css
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
  padding: 16px;
}
```

### Типографіка

```css
.bc-title    { font-size: 22px; font-weight: 500; line-height: 1.3; }
.bc-question { font-size: 18px; font-weight: 500; line-height: 1.4; }
.bc-card-h   { font-size: 15px; font-weight: 500; line-height: 1.5; }
.bc-body     { font-size: 14px; font-weight: 400; line-height: 1.6; }
.bc-small    { font-size: 13px; font-weight: 400; line-height: 1.5; }
.bc-label    { font-size: 12px; font-weight: 400; line-height: 1.4; }
.bc-badge    { font-size: 11px; font-weight: 500; line-height: 1.3; }
```

---

## 10. Онбординг

Показується якщо `loadSession()` повертає `null` (перший запуск).  
Дві стартові картки вже є (Claude + Gemini) але заблоковані — юзер спочатку проходить онбординг.

```
┌──────────────────────────────────────────────────────┐
│          🧠 Brainstorm Circle                        │
│                                                      │
│  Найкраща відповідь народжується                     │
│  не від одного AI, а від діалогу між ними           │
│                                                      │
│  ●──────────●──────────●                            │
│  1          2          3                             │
│                                                      │
│  Крок 1: Введи питання                              │
│  ──────────────────────                             │
│  Сформулюй що хочеш дослідити.                      │
│  Чим конкретніше — тим кращі відповіді.             │
│                                                      │
│  Наприклад:                                          │
│  "Як налаштувати dual-ISP failover на MikroTik?"    │
│  "Яку базу даних обрати для real-time чату?"        │
│                                                      │
│                    [Почати →]                        │
└──────────────────────────────────────────────────────┘

Крок 2: Постав кожному AI
  Для кожного учасника:
  1. Натисни "Копіювати промпт" (або "▶ Запустити" для Ollama)
  2. Відкрий AI у новій вкладці (кнопка "Відкрити ↗")
  3. Встав промпт → отримай відповідь
  4. Встав відповідь назад у картку

Крок 3: Дистилюй результат
  Коли всі відповіли:
  Натисни "Дистилювати" — отримаєш мульти-синтез промпт
  для фінального підсумку від будь-якого AI.
```

---

## 11. API Routes

### /api/local-ai (Ollama proxy)

```js
// app/api/local-ai/route.js
// POST { model: string, prompt: string, systemPrompt?: string }
// → { ok: true, response: string } | { ok: false, error: string }

export async function POST(req) {
  const { model, prompt, systemPrompt } = await req.json();

  if (!model || !prompt) {
    return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
  }

  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(120000), // 2 хвилини для повільних моделей
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `ollama_${res.status}` });
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, response: data.response ?? '' });
  } catch (e) {
    const isTimeout  = e.name === 'TimeoutError';
    const isRefused  = e.cause?.code === 'ECONNREFUSED';
    return NextResponse.json({
      ok: false,
      error: isRefused ? 'ollama_not_running' : isTimeout ? 'ollama_timeout' : 'ollama_error',
    });
  }
}
```

**Обробка помилок у UI:**

```
error: 'ollama_not_running'
  → "Ollama не запущений. Запусти: ollama serve"
  → кнопка "Як встановити Ollama?"

error: 'ollama_timeout'
  → "Модель довго відповідає. Спробуй легшу модель або зачекай."

error: 'ollama_error'
  → "Помилка Ollama. Перевір чи встановлена модель: ollama pull {model}"
```

---

### /api/check-ollama

```js
// app/api/check-ollama/route.js
// GET → { running: boolean, models: string[] }

export async function GET() {
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return NextResponse.json({ running: false, models: [] });
    const data = await res.json();
    const models = (data.models ?? []).map(m => m.name);
    return NextResponse.json({ running: true, models });
  } catch {
    return NextResponse.json({ running: false, models: [] });
  }
}
```

Викликається при додаванні учасника Ollama — показує які моделі вже завантажені.

---

## 12. Структура файлів

```
brainstorm-circle/
├── app/
│   ├── layout.jsx               ← Inter font, metadata
│   ├── page.jsx                 ← головна SPA-сторінка
│   ├── globals.css              ← CSS variables + базові стилі
│   └── api/
│       └── (порожньо в MVP — Ollama через браузер напряму)
├── components/
│   ├── Header.jsx
│   ├── QuestionBar.jsx
│   ├── ParticipantPanel.jsx
│   ├── ParticipantCard.jsx
│   ├── PromptDrawer.jsx
│   ├── SynthesisBlock.jsx
│   ├── RoundTabs.jsx
│   ├── AddParticipantModal.jsx
│   ├── Onboarding.jsx
│   └── PasteToast.jsx           ← toast для clipboard auto-paste
├── hooks/
│   ├── useSession.js            ← useReducer + autosave
│   ├── useOllama.js             ← fetch до localhost:11434, checkOllama()
│   └── useClipboardPaste.js     ← window focus → clipboard → PasteToast
├── lib/
│   ├── types.js                 ← JSDoc типи
│   ├── storage.js               ← localStorage wrapper
│   ├── colors.js                ← PARTICIPANT_COLORS + getNextColor
│   ├── participants.js          ← AI_PRESETS
│   └── promptTemplates.js       ← generatePrompt + всі шаблони
├── public/
│   └── favicon.ico
├── next.config.mjs
├── tailwind.config.mjs
├── package.json
└── .env.local                   ← (порожній для MVP, для майбутніх API ключів)
```

---

## 13. Відкриті питання

### ✅ Ollama CORS — вирішено

Браузер робить fetch **напряму** до `http://localhost:11434/api/generate` без API route.

API route `/api/local-ai` — **видаляємо** (не потрібен).

Юзеру одноразово:
```bash
OLLAMA_ORIGINS=* ollama serve
```

Ollama hook у браузері:
```js
// hooks/useOllama.js
async function askOllama(model, prompt) {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
  });
  const data = await res.json();
  return data.response;
}
```

Перевірка чи Ollama запущений (при відкритті AddParticipantModal для Ollama):
```js
async function checkOllama() {
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    return { running: true, models: data.models?.map(m => m.name) ?? [] };
  } catch {
    return { running: false, models: [] };
  }
}
```

### ✅ Назва проєкту

`brainstorm-circle` — в `package.json`, репозиторії, Vercel.

---

### ✅ Експорт Markdown — формат

```markdown
# {session.title}
**Питання**: {question}
**Режим**: {mode}
**Дата**: {date}

---

## Раунд 1

### Claude
{response}

### Gemini
{response}

### Вижимка
{synthesis}

---
## Раунд 2
...
```

### ✅ Mobile — responsive в MVP

Робимо responsive. Bottom nav для мобільних:

```
[🔍 Питання] [👥 Учасники] [💬 Відповіді] [🔮 Вижимка]
```

Breakpoints:
- `< 768px` — mobile: 1 колонка карток, bottom nav, панель учасників = drawer знизу
- `768–1023px` — tablet: 2 колонки карток, панель учасників = 200px
- `≥ 1024px` — desktop: auto-fill grid, панель = 240px fixed

---

## Автоматизація copy-paste

### Рівень 1 — Clipboard Detection (в MVP)

Коли юзер повертається у вкладку BC після копіювання відповіді з будь-якого AI:

```
Юзер: копіює відповідь у Claude.ai → перемикається в BC-вкладку
BC: window focus + clipboard має текст довше 50 символів
→ toast знизу: "Вставити відповідь у картку Claude? [Так] [Ні]"
→ клік "Так" → текст потрапляє у першу порожню картку (або ту що в фокусі)
```

**Реалізація** (`hooks/useClipboardPaste.js`):

```js
export function useClipboardPaste({ participants, currentRound, dispatch, activeParticipantId }) {
  useEffect(() => {
    async function onFocus() {
      try {
        const text = await navigator.clipboard.readText();
        if (!text || text.length < 50) return;

        // Шукаємо першу порожню картку (або активну)
        const target = activeParticipantId
          ? participants.find(p => p.id === activeParticipantId)
          : participants.find(p => !currentRound.responses[p.id]);

        if (!target) return;

        // Показуємо toast
        showPasteToast({
          participantName: target.name,
          text,
          onConfirm: () => dispatch({
            type: 'SET_RESPONSE',
            roundId: currentRound.id,
            participantId: target.id,
            text,
          }),
        });
      } catch {
        // Clipboard permission denied — мовчимо
      }
    }

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [participants, currentRound, activeParticipantId]);
}
```

**Toast компонент** (`components/PasteToast.jsx`):

```
┌────────────────────────────────────────────────┐
│ 📋 Вставити відповідь у картку Gemini?         │
│ "На мою думку, найкращим підходом є..."        │  ← перші 80 символів
│                          [Пропустити]  [Так →] │
└────────────────────────────────────────────────┘
```

- Автозакривається через 8 секунд якщо юзер не реагує
- Якщо всі картки заповнені — toast не показується
- Дозвіл на clipboard запитується один раз браузером

**Активна картка** — коли юзер клікає на картку, вона стає "активною" (`activeParticipantId`). Toast буде вставляти саме туди, а не в першу порожню. Так юзер може явно сказати "ця відповідь — для GPT-4o".

---

### Рівень 2 — Browser Extension (після MVP v1)

Chrome/Firefox extension що інжектить кнопку **"→ BC"** в claude.ai, chatgpt.com, gemini.google.com поруч з кожною відповіддю AI. Клік → відповідь летить у BC-вкладку через `BroadcastChannel` без жодного copy-paste.

Окремий репозиторій `brainstorm-circle-extension` після релізу v1.

---

## Не в MVP

- Темна тема
- Multi-session (список сесій) — localStorage index готовий, UI ні
- Cloud API ключі (Anthropic/OpenAI/Gemini)
- Drag & drop карток
- Шаблони питань
- Webhook / Notion
- Sharing по URL (потребує backend)
- Auth
- Browser Extension (Рівень 2 автоматизації)
