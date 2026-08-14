// Does the page show life during the model's hidden reasoning pass, and does the
// reading survive the token budget? Samples the fortune panel while it streams.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = process.argv[2] || resolve('lopebooks/notebooks/@tomlarkworthy_tarot.html');
const url = file.startsWith('http') ? file : `file://${file}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
const app = () => page.locator('.tarot-app').first();

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForSelector('.tarot-app', { timeout: 90000 });
await page.waitForTimeout(6000);

await app().locator('input[autocomplete="given-name"]').fill('Tom');
await app().locator('input[autocomplete="given-name"]').dispatchEvent('input');
await page.waitForTimeout(1200);
await app().locator('textarea').first().fill('Will my project ship?');
await app().locator('textarea').first().dispatchEvent('input');
await page.waitForTimeout(1800);

const spot = await page.evaluate(() => {
  const c = document.querySelectorAll('.tarot-app image.card');
  const r = c[c.length - 1].getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.click(spot.x, spot.y);
await page.waitForTimeout(1400);
for (let i = 0; i < 3; i++) { await page.mouse.click(spot.x, spot.y); await page.waitForTimeout(800); }

// sample the panel every 250ms and record when each phase first appears
const t0 = Date.now();
const marks = {};
let last = '';
for (let i = 0; i < 160; i++) {
  const t = await page.evaluate(() => {
    const b = document.querySelector('.tarot-app .reading');
    return { text: b ? b.innerText.trim() : '', thinking: !!(b && b.querySelector('.tarot-thinking')) };
  });
  const now = Date.now() - t0;
  if (t.thinking && !marks.shuffling && /Shuffling/.test(t.text)) marks.shuffling = now;
  if (t.thinking && !marks.studies && /studies/.test(t.text)) marks.studies = now;
  if (!t.thinking && t.text && !marks.firstProse) marks.firstProse = now;
  if (t.text === last && t.text.length > 200 && !t.thinking) { marks.settled = now; break; }
  last = t.text;
  await page.waitForTimeout(250);
}
console.log('ms after the 3rd pick:');
console.log('  "Shuffling…"                 ', marks.shuffling ?? 'never');
console.log('  "The reader studies…" (live) ', marks.studies ?? 'never');
console.log('  first prose on screen        ', marks.firstProse ?? 'never');
console.log('  settled                      ', marks.settled ?? 'never');
console.log('  final length                 ', last.length);
console.log('  dead air (no visible change) ', marks.firstProse != null && marks.studies != null
  ? (marks.firstProse - marks.studies) + 'ms of animated waiting' : 'n/a');
await browser.close();
