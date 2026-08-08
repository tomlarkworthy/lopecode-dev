// Run a published module in a bare Observable runtime and report which cells error — the site's
// own page is not needed to see that. Defaults to @tomlarkworthy/annotate; pass another slug.
//   node tools/probe-observable-annotate.mjs @tomlarkworthy/command-palette
import { chromium } from 'playwright';
const SLUG = process.argv[2] || '@tomlarkworthy/annotate';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on('console', (m) => { if (/error/i.test(m.text())) console.log('[console]', m.text().slice(0, 160)); });
await page.setContent(`<!doctype html><html><body><script type="module">
  window.__errs = [];
  window.__ok = [];
  const {Runtime, Inspector} = await import("https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js");
  const define = (await import("https://api.observablehq.com/${SLUG}.js?v=4")).default;
  const rt = new Runtime();
  rt.module(define, (name) => ({
    pending() {}, fulfilled(v) { if (name) window.__ok.push(name); },
    rejected(err) { window.__errs.push((name || "(anonymous)") + ": " + String(err).slice(0, 90)); }
  }));
  window.__booted = true;
</script></body></html>`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__booted === true, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(15000);
console.log(SLUG);
console.log(await page.evaluate(() => `ok: ${window.__ok.length}\nerrors: ${window.__errs.length}\n` + [...new Set(window.__errs)].join('\n')));
await browser.close();
