import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
const browser = await chromium.launch({ headless: false });
for (const u of process.argv.slice(2)) {
  const page = await browser.newPage();
  try { await page.goto(u, { waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(6000);
  const m = await page.evaluate(() => ({
    nodes: document.getElementsByTagName('*').length,
    audio: !!(window.__ojs_runtime),
    ctxs: (performance.getEntriesByType('resource')||[]).length,
  })).catch(e => ({err: String(e).slice(0,80)}));
  console.log(u.replace(/^.*\//,''), JSON.stringify(m));
  await page.close();
}
await browser.close();
