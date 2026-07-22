import { humanWait, screenshot, findEl } from '../utils.js';

// Selectors — in order of preference
const SEL = {
  input: [
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"]',
    'fieldset div[contenteditable]',
  ],
  send: [
    'button[aria-label="Send message"]',
    'button[aria-label="Надіслати"]',
    'button[data-testid="send-button"]',
  ],
  stop: [
    'button[aria-label="Stop generating"]',
    'button[aria-label="Stop"]',
    'button[data-testid="stop-button"]',
  ],
  response: [
    '.font-claude-message',
    '[data-testid="assistant-message"] .prose',
    '[data-testid="assistant-message"]',
    '.prose',
  ],
};

export async function askClaude(page, prompt) {
  await page.goto('https://claude.ai/new', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await humanWait(2000, 3000);

  // Find and fill input
  const input = await findEl(page, SEL.input);
  if (!input) {
    await screenshot(page, 'claude-no-input');
    throw new Error('claude.ai: не знайшов поле вводу (дивись debug/claude-no-input-*.png)');
  }

  await input.click();
  await humanWait(300, 500);

  // Use insertText for ProseMirror — no char-by-char delay, no clipboard permission needed
  await page.keyboard.insertText(prompt);
  await humanWait(800, 1200);

  // Send
  const sendBtn = await findEl(page, SEL.send, 3000);
  if (sendBtn) {
    await sendBtn.click();
  } else {
    await page.keyboard.press('Enter');
  }

  // Wait for generation
  await humanWait(2000, 3000);

  // Wait until "Stop" button disappears (= done generating)
  try {
    const stopSel = SEL.stop[0];
    await page.waitForSelector(stopSel, { timeout: 8000 });
    await page.waitForSelector(stopSel, { state: 'hidden', timeout: 120000 });
  } catch {
    // Finished before we could catch it — that's fine
  }

  await humanWait(1000, 1500);

  // Extract last response
  for (const sel of SEL.response) {
    const els = await page.locator(sel).all();
    if (els.length > 0) {
      return (await els[els.length - 1].innerText()).trim();
    }
  }

  await screenshot(page, 'claude-no-response');
  throw new Error('claude.ai: не знайшов текст відповіді (дивись debug/)');
}
