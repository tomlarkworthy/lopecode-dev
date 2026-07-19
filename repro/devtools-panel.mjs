// Does merely having DevTools open on a given panel reproduce the crash on reload?
// usage: node repro/devtools-panel.mjs <panelTabText> <url> [reps]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import fs from 'node:fs';

const panel = process.argv[2] || 'Performance';
const url = process.argv[3];
const reps = Number(process.argv[4] || 3);

async function run() {
  const profile = '/tmp/lope-dt-panel';
  fs.rmSync(profile, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(profile, {
    headless: false, args: ['--auto-open-devtools-for-tabs'], viewport: null,
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  let crashed = false;
  page.on('crash', () => { crashed = true; });

  try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(4000);

  // Find the DevTools frontend page and select the requested panel by its tab.
  const dt = ctx.pages().find(p => p.url().startsWith('devtools://'));
  if (!dt) { console.log('  (no devtools page found)'); }
  else {
    try {
      await dt.waitForTimeout(2000);
      const tab = dt.locator(`[aria-label="${panel}"], [role="tab"]:has-text("${panel}")`).first();
      await tab.click({ timeout: 10000 });
      await dt.waitForTimeout(4000);
      console.log(`  selected panel: ${panel}`);
    } catch (e) { console.log('  panel select failed:', String(e).split('\n')[0].slice(0, 120)); }
  }

  for (let i = 0; i < reps && !crashed; i++) {
    try { await page.reload({ waitUntil: 'load', timeout: 120000 }); } catch {}
    await page.waitForTimeout(6000);
    console.log(`  reload ${i + 1}: ${crashed ? 'CRASH' : 'ok'}`);
  }
  await ctx.close().catch(() => {});
  return crashed;
}

console.log(`panel=${panel} url=${url}`);
console.log(await run() ? 'RESULT: CRASHED' : 'RESULT: survived');
