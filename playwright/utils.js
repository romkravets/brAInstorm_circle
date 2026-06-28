export async function humanWait(min, max) {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  await new Promise(r => setTimeout(r, ms));
}

export async function screenshot(page, name) {
  const file = `./debug/${name}-${Date.now()}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  📸 Скріншот: ${file}`);
}

// Try multiple selectors, return first visible one
export async function findEl(page, selectors, timeout = 5000) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      return el;
    } catch {
      // next
    }
  }
  return null;
}
