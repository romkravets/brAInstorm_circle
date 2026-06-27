# Brainstorm Circle — Rules for Claude

Проєкт: Next.js 14 App Router, JSX, Tailwind CSS, localStorage, Ollama (localhost:11434).
Повна специфікація: `SPEC.md`. Рішення по архітектурі: `MVP_DECISIONS.md`.

---

## Загальні правила

- Пиши лише те що потрібно для поточного завдання — ніяких "на майбутнє"
- Не додавай коментарі що пояснюють ЩО робить код — тільки ЧОМУ (неочевидні рішення)
- Не створюй нові файли якщо можна додати в існуючий
- Не рефактори код що не стосується поточного завдання
- Без `console.log` в production коді — тільки `console.warn` для handled errors

---

## Next.js 14

### Server vs Client components

```
Server Component (дефолт, без 'use client'):
  - layout.jsx
  - Статичні обгортки без state/effects

Client Component ('use client' вгорі):
  - Все що має useState, useEffect, useReducer
  - Все що слухає браузерні події (focus, click)
  - Все що читає localStorage або clipboard
  - Всі інтерактивні компоненти в цьому проєкті
```

- `page.jsx` — Client Component (має `useSession`)
- Не роби Server Components заради принципу якщо все одно потрібен state

### App Router

- Файли роутів: тільки `route.js` в `app/api/*/`
- В MVP API routes відсутні — не створюй їх без потреби
- `layout.jsx` — мінімальний: fonts, metadata, `<body>`

---

## React

### Стан

- Весь стан сесії — через `useSession` (useReducer), не окремі useState
- `dispatch` — єдиний спосіб змінювати сесію
- Локальний UI-стан (isOpen, hover, loading) — useState в компоненті
- Не дублюй стан: якщо можна вирахувати з session — не зберігай окремо

```js
// ✅ Вираховуємо з state
const filledCount = participants.filter(p => round.responses[p.id]).length;

// ❌ Не зберігаємо окремо
const [filledCount, setFilledCount] = useState(0);
```

### Props

- Передавай мінімум props — не прокидай весь session якщо потрібне одне поле
- Деструктуруй props у сигнатурі функції
- Callback props: `on` + дієслово (`onResponseChange`, `onClose`, `onPromptRequest`)

### Effects

- `useEffect` тільки для side effects (підписки, browser API, external sync)
- Завжди повертай cleanup функцію якщо є підписка або таймер

```js
// ✅
useEffect(() => {
  window.addEventListener('focus', handler);
  return () => window.removeEventListener('focus', handler);
}, []);
```

- Не використовуй useEffect для трансформації даних — роби це при рендері

### Keys

- Key в списках — завжди `participant.id` або `round.id`, не індекс масиву

---

## Безпека

### localStorage

- Завжди wrap в try/catch — QuotaExceededError або SecurityError можливі
- Не зберігай чутливі дані (API ключі — після MVP в httpOnly cookie, не localStorage)
- Валідуй при зчитуванні: перевіряй `version` поле перед використанням

```js
// ✅
export function loadSession() {
  try {
    const raw = localStorage.getItem('bc_session_current');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== '2.0') return null;
    return parsed.session ?? null;
  } catch {
    return null;
  }
}
```

### Clipboard API

- Завжди wrap `navigator.clipboard.readText()` в try/catch
- Не показуй toast якщо clipboard text < 50 символів (уникаємо false positives)
- Не логуй вміст буфера

```js
// ✅
try {
  const text = await navigator.clipboard.readText();
  if (text && text.length >= 50) handlePaste(text);
} catch {
  // Permission denied або не підтримується — мовчимо
}
```

### Ollama fetch (браузер → localhost:11434)

- Завжди `AbortSignal.timeout(120_000)` — моделі можуть відповідати довго
- Валідуй `model` і `prompt` перед fetch — не відправляй порожні запити
- Не показуй технічні деталі помилки Ollama юзеру — тільки людський текст

```js
// ✅ Людські помилки
const ERROR_MESSAGES = {
  ollama_not_running: 'Ollama не запущений. Запусти: OLLAMA_ORIGINS=* ollama serve',
  ollama_timeout:     'Модель відповідає занадто довго. Спробуй легшу модель.',
  ollama_error:       'Помилка Ollama. Перевір: ollama pull {model}',
};
```

### XSS — рендеринг відповідей AI

- Відповіді AI відображаються як plain text — тільки `{variable}` в JSX
- Текст з localStorage — тільки через React JSX interpolation, не через raw DOM
- Не використовуй raw HTML вставку для відповідей AI — це головний XSS-вектор
- Якщо потрібен Markdown рендер — тільки `react-markdown` з `rehype-sanitize`

### URL безпека

- `participant.url` відкривається через `window.open(url, '_blank', 'noopener,noreferrer')`
- Завжди `noopener,noreferrer` для зовнішніх посилань
- Валідуй URL перед збереженням: тільки `https://` або `http://localhost`

```js
// ✅
function isSafeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || (u.protocol === 'http:' && u.hostname === 'localhost');
  } catch {
    return false;
  }
}
```

---

## Продуктивність

### Re-renders

- `useCallback` для callback функцій що передаються в дочірні компоненти
- `useMemo` тільки для справді дорогих обчислень (не для кожного масиву)
- Компоненти що не залежать від session — поза `page.jsx`

### Autosave debounce

- Debounce строго 2000ms — не менше, щоб не бити localStorage на кожен символ
- `clearTimeout` у cleanup useEffect

```js
// ✅
useEffect(() => {
  const timer = setTimeout(() => saveSession(session), 2000);
  return () => clearTimeout(timer);
}, [session]);
```

### Textarea auto-resize

- CSS `field-sizing: content` (нативний auto-resize) або JS `textarea.style.height = textarea.scrollHeight + 'px'`
- Встановлюй мінімальну висоту через CSS (`min-height: 120px`), не через JS

### Images та assets

- В MVP немає зображень — не додавай `next/image` без потреби
- Іконки — тільки inline SVG або Unicode emoji, без icon-бібліотек

### Bundle

- Не імпортуй бібліотеки без крайньої необхідності
- `nanoid` — єдина зовнішня залежність для ID генерації
- Якщо потрібна утиліта з lodash — напиши її вручну (3 рядки), не ставь lodash

---

## Tailwind CSS

### Кольори

- Не хардкод hex в className — тільки CSS variables через `style` або tailwind config

```jsx
// ✅
<div style={{ backgroundColor: participant.color.bg, borderColor: participant.color.border }}>

// ❌
<div className="bg-[#EEEDFE] border-[#AFA9EC]">
```

- Динамічні кольори учасника завжди через `style={{ ... }}`, не через dynamic className

### Responsive

- Mobile-first: базові стилі для mobile, `md:` і `lg:` для більших екранів
- Breakpoints: `< 768px` mobile, `md` tablet, `lg` desktop
- Bottom nav: `className="fixed bottom-0 ... md:hidden"`
- Ліва панель: `className="hidden md:flex w-[200px] lg:w-[240px]"`

### Анімації

- Drawer slide-in: `transition-transform duration-200 ease-out`
- Toast появляється: `animate-in slide-in-from-bottom-4 duration-200`
- Spinner: CSS animation, не JS setInterval

### Класи

- Не більше 8-10 класів на один елемент — якщо більше, витягни в змінну або компонент
- Порядок: layout → spacing → sizing → colors → typography → effects

---

## Компоненти — специфіка

### ParticipantCard

- `textarea` — `onChange` з debounce 300ms перед dispatch (не на кожен символ)
- Розгорнутий режим (fullscreen) — через portal `createPortal(content, document.body)`
- "⋯ Меню" — простий `<details><summary>` або position:absolute dropdown, без бібліотек

### PromptDrawer

- Drawer overlay — `onClick={onClose}` на backdrop, `e.stopPropagation()` на вмісті
- Закривається на `Escape` клавішу: `useEffect` з `keydown` listener

```js
useEffect(() => {
  if (!isOpen) return;
  const handler = (e) => { if (e.key === 'Escape') onClose(); };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [isOpen, onClose]);
```

### PasteToast

- Автозакривається через 8 секунд (`setTimeout` з cleanup)
- Рендериться через portal щоб не залежати від layout
- Показується одночасно не більше одного toast

### AddParticipantModal

- Перевіряє Ollama статус тільки коли юзер відкрив секцію "Локальні моделі"
- `checkOllama()` з timeout 2000ms — не блокує відкриття модалки

---

## Структура файлів — правила

```
components/   ← тільки UI компоненти, без бізнес-логіки
hooks/        ← state, side effects, browser API
lib/          ← чисті функції, константи, утиліти (без React)
app/          ← Next.js routing, layout
```

- `lib/*.js` — тільки pure functions та константи, без React hooks
- Якщо функція використовує `useState`/`useEffect` — вона в `hooks/`
- Якщо функція не використовує React — вона в `lib/`
- Один компонент — один файл. Без barrel `index.js` в MVP.

---

## Що НЕ робити

- Не встановлюй `axios` — є `fetch`
- Не встановлюй `date-fns` — є `Intl.DateTimeFormat`
- Не встановлюй `uuid` — є `nanoid` (менший)
- Не встановлюй `classnames`/`clsx` — є template literals
- Не встановлюй `react-query` — стан в `useSession`, async в hooks
- Не встановлюй UI-бібліотеки (shadcn, radix, MUI) — пишемо свої компоненти
- Не роби `key={Math.random()}` — завжди стабільний id
- Не роби `style={{ margin: '16px' }}` якщо є Tailwind клас
- Не додавай `eslint-disable` без коментаря чому
