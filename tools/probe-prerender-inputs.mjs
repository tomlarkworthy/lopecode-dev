// Does the prerender snapshot carry the styles its content needs? The snapshot is hoisted into a
// shadow root, so anything the live page got from a <style> in document.head is missing from it —
// Observable Inputs inject theirs there, which is why prerendered forms flash unstyled.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2]);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 180000 });

// Read the snapshot while it is still up.
const early = await page.evaluate(() => {
  const host = document.getElementById('lope-prerender');
  const root = host && host.shadowRoot;
  const el = root && root.querySelector('.__ns__ button, .__ns__ input, .__ns__');
  const cs = el && getComputedStyle(el);
  return {
    hoisted: !!root,
    styleBlocksInSnapshot: root ? root.querySelectorAll('style').length : 0,
    nsRulesInSnapshot: root
      ? [...root.querySelectorAll('style')].filter((s) => s.textContent.includes('.__ns__')).length
      : 0,
    sample: el ? el.className : null,
    font: cs ? cs.font : null,
    display: cs ? cs.display : null,
  };
});

await page.waitForFunction(() => !document.getElementById('lope-prerender'), null, { timeout: 60000 }).catch(() => {});

const late = await page.evaluate(() => {
  const heads = [...document.head.querySelectorAll('style')].map((s) => ({
    id: s.id || null,
    chars: s.textContent.length,
    ns: s.textContent.includes('.__ns__'),
  }));
  const el = document.querySelector('.__ns__ button, .__ns__ input, .__ns__');
  const cs = el && getComputedStyle(el);
  return { headStyles: heads, font: cs ? cs.font : null, display: cs ? cs.display : null };
});

console.log(JSON.stringify({ early, late }, null, 1));
await browser.close();
