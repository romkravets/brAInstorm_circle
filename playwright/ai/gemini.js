import { humanWait, screenshot, findEl } from '../utils.js';

const SEL = {
  input: [
    'div.ql-editor[contenteditable="true"]',
    'rich-textarea div[contenteditable="true"]',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
  ],
  send: [
    'button[aria-label="Send message"]',
    'button.send-button',
    'button[data-testid="send-button"]',
  ],
  stop: [
    'button[aria-label="Stop generating"]',
    'button[aria-label="Stop response"]',
    '.stop-button',
  ],
  response: [
    'model-response .response-container',
    '.response-container-content .markdown',
    'message-content .markdown',
    '.model-response-text',
    '.response-container',
  ],
};

export async function askGemini(page, prompt) {
  await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await humanWait(2500, 3500);

  const input = await findEl(page, SEL.input);
  if (!input) {
    await screenshot(page, 'gemini-no-input');
    throw new Error('Gemini: не знайшов поле вводу (дивись debug/gemini-no-input-*.png)');
  }

  await input.click();
  await humanWait(400, 600);
  await page.keyboard.insertText(prompt);
  await humanWait(800, 1200);

  const sendBtn = await findEl(page, SEL.send, 3000);
  if (sendBtn) {
    await sendBtn.click();
  } else {
    await page.keyboard.press('Enter');
  }

  await humanWait(2000, 3000);

  // Wait for stop button to appear then disappear
  try {
    await page.waitForSelector(SEL.stop[0], { timeout: 8000 });
    await page.waitForSelector(SEL.stop[0], { state: 'hidden', timeout: 120000 });
  } catch {
    // Done already
  }

  await humanWait(1500, 2000);

  for (const sel of SEL.response) {
    const els = await page.locator(sel).all();
    if (els.length > 0) {
      return (await els[els.length - 1].innerText()).trim();
    }
  }

  await screenshot(page, 'gemini-no-response');
  throw new Error('Gemini: не знайшов текст відповіді (дивись debug/)');
}
