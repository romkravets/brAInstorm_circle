import { chromium } from 'playwright';
import fs from 'fs';
import { createContext } from './auth.js';
import { askClaude } from './ai/claude.js';
import { askGemini } from './ai/gemini.js';
import { generatePrompt } from '../lib/promptTemplates.js';
import { humanWait } from './utils.js';

const BRAINSTORM_URL = 'http://localhost:3000';
const SESSION_KEY    = 'bc_session_current';

function getSiteKey(url) {
  if (url?.includes('claude.ai'))      return 'claude';
  if (url?.includes('gemini.google'))  return 'gemini';
  return null;
}

export async function runRound() {
  if (!fs.existsSync('./debug')) fs.mkdirSync('./debug');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  try {
    // ── 1. Read session from brAInstorm ────────────────────────
    const appPage = await browser.newPage();
    await appPage.goto(BRAINSTORM_URL, { waitUntil: 'domcontentloaded' });
    await humanWait(1000, 1500);

    const raw = await appPage.evaluate(k => localStorage.getItem(k), SESSION_KEY);
    if (!raw) {
      throw new Error(`Немає сесії. Відкрий ${BRAINSTORM_URL}, введи питання і зачекай автосейв (2с).`);
    }

    const { session } = JSON.parse(raw);
    const currentRound = session.rounds.find(r => r.id === session.currentRound) ?? session.rounds[0];

    console.log(`\n📋 Сесія:  "${session.title}"`);
    console.log(`❓ Питання: "${session.question}"`);
    console.log(`🔄 Раунд:  ${currentRound.label}  (режим: ${session.mode})\n`);

    if (!session.question?.trim()) {
      throw new Error('Немає питання. Введи питання в brAInstorm і зачекай автосейв.');
    }

    // ── 2. Визначаємо кого треба спитати ──────────────────────
    const toAsk = session.participants.filter(p => {
      const siteKey = getSiteKey(p.url);
      if (!siteKey) {
        console.log(`⏭  ${p.name}: не підтримується (тільки Claude і Gemini)`);
        return false;
      }
      if (currentRound.responses[p.id]) {
        console.log(`✅ ${p.name}: відповідь вже є, пропуск`);
        return false;
      }
      return true;
    });

    if (toAsk.length === 0) {
      console.log('\nВсі учасники вже відповіли в цьому раунді!');
      return;
    }

    // ── 3. Запитуємо кожного AI ────────────────────────────────
    const responses = { ...currentRound.responses };

    for (const participant of toAsk) {
      const siteKey = getSiteKey(participant.url);
      console.log(`\n🤖 Запитую ${participant.name}...`);

      // Будуємо промпт: якщо є чужі відповіді — cross, інакше initial
      const otherEntry = Object.entries(responses).find(
        ([id, text]) => id !== participant.id && text
      );
      const promptParams = otherEntry
        ? {
            type:           'cross',
            sourceName:     session.participants.find(p => p.id === otherEntry[0])?.name ?? 'AI',
            sourceResponse: otherEntry[1],
          }
        : { type: 'initial', sourceName: '', sourceResponse: '' };

      const prompt = generatePrompt({
        ...promptParams,
        mode:         session.mode,
        question:     session.question,
        round:        currentRound,
        rounds:       session.rounds,
        participants: session.participants,
      });

      // Відкриваємо AI у новому контексті зі збереженою сесією
      let ctx;
      try {
        ctx = await createContext(browser, siteKey);
      } catch (e) {
        console.error(`  ❌ ${e.message}`);
        continue;
      }

      const aiPage = await ctx.newPage();
      try {
        const response = siteKey === 'claude'
          ? await askClaude(aiPage, prompt)
          : await askGemini(aiPage, prompt);

        responses[participant.id] = response;
        console.log(`  ✅ ${participant.name}: отримано ${response.length} символів`);
      } catch (e) {
        console.error(`  ❌ ${participant.name}: ${e.message}`);
      } finally {
        await aiPage.close();
        await ctx.close();
      }

      await humanWait(1500, 2500);
    }

    // ── 4. Записуємо відповіді назад у localStorage ────────────
    const updatedSession = {
      ...session,
      updatedAt: Date.now(),
      rounds: session.rounds.map(r =>
        r.id === currentRound.id ? { ...r, responses } : r
      ),
    };

    await appPage.evaluate(([key, val]) => {
      localStorage.setItem(key, JSON.stringify({ version: '2.0', session: val }));
    }, [SESSION_KEY, updatedSession]);

    await appPage.reload({ waitUntil: 'domcontentloaded' });

    console.log('\n✨ Готово! Відповіді в brAInstorm оновлено.');
    console.log('Натисни Enter щоб закрити браузер...');
    await new Promise(r => process.stdin.once('data', r));

  } finally {
    await browser.close();
  }
}
