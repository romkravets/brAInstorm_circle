import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, 'sessions');

const SITES = {
  claude: { name: 'Claude', url: 'https://claude.ai/new',         file: 'claude.json' },
  gemini: { name: 'Gemini', url: 'https://gemini.google.com/app', file: 'gemini.json' },
};

export async function loginSite(siteKey) {
  const site = SITES[siteKey];
  if (!site) throw new Error(`Невідомий сайт: ${siteKey}. Доступні: claude, gemini`);

  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  const sessionFile = path.join(SESSIONS_DIR, site.file);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`\nВідкриваю ${site.name}...`);
  await page.goto(site.url);

  console.log(`\nЗалогінься в ${site.name} в браузері, потім натисни Enter в терміналі...`);
  await new Promise(r => process.stdin.once('data', r));

  await context.storageState({ path: sessionFile });
  await browser.close();

  console.log(`✅ Сесія ${site.name} збережена → ${sessionFile}`);
}

export function sessionExists(siteKey) {
  const site = SITES[siteKey];
  return fs.existsSync(path.join(SESSIONS_DIR, site.file));
}

export async function createContext(browser, siteKey) {
  const site = SITES[siteKey];
  if (!site) throw new Error(`Невідомий сайт: ${siteKey}`);

  const sessionFile = path.join(SESSIONS_DIR, site.file);
  if (!fs.existsSync(sessionFile)) {
    throw new Error(`Немає сесії для ${site.name}. Запусти: npm run login:${siteKey}`);
  }

  return browser.newContext({
    storageState: sessionFile,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
}
