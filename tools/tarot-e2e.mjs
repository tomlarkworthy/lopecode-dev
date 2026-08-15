// End-to-end: type a name + question, spread the fan, pick 3 cards, stream a reading,
// then re-open the generated share URL and check it replays the same reading.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve('lopebooks/notebooks/@tomlarkworthy_tarot.html');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));

const app = () => page.locator('.tarot-app').first();

await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForSelector('.tarot-app', { timeout: 90000 });
await page.waitForTimeout(6000);

const state = () => page.evaluate(async () =>
  await window.__ojs_runtime.mains.get('@tomlarkworthy/tarot').value('transitions'));

console.log('initial state:', await state());

// --- name ---------------------------------------------------------------
await app().locator('input[autocomplete="given-name"]').fill('Tom');
await app().locator('input[autocomplete="given-name"]').dispatchEvent('input');
await page.waitForTimeout(1500);
console.log('after name:', await state());

// --- question -----------------------------------------------------------
await app().locator('textarea').first().fill('Will my project ship?');
await app().locator('textarea').first().dispatchEvent('input');
await page.waitForTimeout(1500);
console.log('after question:', await state());

// --- spread the fan, then pick three ------------------------------------
const backs = app().locator('use.card');
console.log('fan size:', await backs.count());

// Cards overlap, so a user just clicks the fan and hits whatever is on top.
// Click the same spot repeatedly: once to spread, then three times to pick.
// (Each picked card sets pointer-events:none, exposing the next one down.)
// Take the real on-screen rect of the topmost card rather than guessing at the viewBox.
const spot = await page.evaluate(() => {
  const cards = document.querySelectorAll('.tarot-app use.card');
  const r = cards[cards.length - 1].getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, rect: [r.x, r.y, r.width, r.height] };
});
console.log('top card rect:', spot.rect.map(Math.round));

await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(1500);
console.log('after spread:', await state());

for (let i = 0; i < 3; i++) {
  await page.mouse.click(spot.x, spot.y);
  await page.waitForTimeout(900);
}
console.log('after 3 picks:', await state());

// --- wait for the streamed reading --------------------------------------
const readingText = async () => (await app().locator('.reading').first().innerText()).trim();
let text = '';
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(1000);
  text = await readingText();
  if (text.length > 80 && !text.endsWith('…')) {
    const again = await new Promise(r => setTimeout(async () => r(await readingText()), 1500));
    if (again === text) break;
    text = again;
  }
}
console.log('\n--- READING (%d chars) ---\n%s\n', text.length, text.slice(0, 500));

const shownCards = await app().locator('.board image').count();
const labels = await app().locator('.board text').allTextContents();
console.log('cards displayed:', shownCards, labels);

// --- share url ----------------------------------------------------------
const shareUrl = await app().locator('input.url').inputValue();
console.log('share url length:', shareUrl.length);

// --- replay -------------------------------------------------------------
const q = shareUrl.slice(shareUrl.indexOf('?'));
const page2 = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
const errs2 = [];
page2.on('pageerror', (e) => errs2.push(String(e).slice(0, 180)));
await page2.goto(`file://${file}${q}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page2.waitForSelector('.tarot-app', { timeout: 90000 });
await page2.waitForTimeout(9000);

const replay = await page2.evaluate(() => {
  const app = document.querySelector('.tarot-app');
  return {
    name: app.querySelector('input[autocomplete="given-name"]').value,
    question: app.querySelector('textarea').value,
    reading: app.querySelector('.reading').innerText.trim(),
    cards: app.querySelectorAll('.board image').length,
  };
});
console.log('\n--- REPLAY ---');
console.log('name:', replay.name, '| question:', replay.question, '| cards:', replay.cards);
console.log('reading matches original:', replay.reading === text);
if (replay.reading !== text) console.log('replayed reading (first 300):', replay.reading.slice(0, 300));

await page.screenshot({ path: 'tools/screenshots/tarot-reading.png', fullPage: false });

// --- restart ------------------------------------------------------------
await app().locator('button', { hasText: 'Ask another question' }).click();
await page.waitForTimeout(2500);
console.log('after restart:', await state(), '| reading cleared:', (await readingText()) === '');
await page2.screenshot({ path: 'tools/screenshots/tarot-replay.png', fullPage: false });
console.log('\npage errors:', errs.length ? errs.slice(0, 4) : 'none', '| replay errors:', errs2.length ? errs2.slice(0, 4) : 'none');
await browser.close();
