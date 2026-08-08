// Run a published module in a bare Observable runtime and report which cells error — the site's
// own page is not needed to see that. Defaults to @tomlarkworthy/annotate; pass another slug.
//   node tools/probe-observable-annotate.mjs @tomlarkworthy/command-palette
import { chromium } from 'playwright';
const SLUG = process.argv[2] || '@tomlarkworthy/annotate';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on('console', (m) => { if (/error/i.test(m.text())) console.log('[console]', m.text().slice(0, 160)); });
// The module URL only exists for a PUBLISHED notebook; a private one 404s and the import
// throws, which used to leave ok:0/errors:0 — a silent pass that says the opposite of the
// truth. Record the load failure and exit non-zero on it, or on no cell computing at all.
await page.setContent(`<!doctype html><html><body><script type="module">
  window.__errs = [];
  window.__ok = [];
  window.__loadError = null;
  try {
    const {Runtime, Inspector} = await import("https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js");
    const define = (await import("https://api.observablehq.com/${SLUG}.js?v=4")).default;
    const rt = new Runtime();
    rt.module(define, (name) => ({
      pending() {}, fulfilled(v) { if (name) window.__ok.push(name); },
      rejected(err) { window.__errs.push((name || "(anonymous)") + ": " + String(err).slice(0, 90)); }
    }));
  } catch (e) {
    window.__loadError = String(e).slice(0, 200);
  }
  window.__booted = true;
</script></body></html>`, { waitUntil: 'load' });
const started = await page.waitForFunction(() => window.__booted === true, { timeout: 60000 })
  .then(() => true).catch(() => false);
await page.waitForTimeout(15000);
const r = await page.evaluate(() => ({
  ok: window.__ok.length, errs: [...new Set(window.__errs)], loadError: window.__loadError
}));
console.log(SLUG);
if (!started) console.log('the probe page never finished its module script');
if (r.loadError) console.log('could not load the module:', r.loadError);
console.log(`ok: ${r.ok}\nerrors: ${r.errs.length}`);
if (r.errs.length) console.log(r.errs.join('\n'));
await browser.close();
if (!started || r.loadError || r.ok === 0) {
  console.log('FAIL — nothing was verified' +
    (r.loadError ? ' (a 404 here means the notebook is not published)' : ''));
  process.exit(1);
}
if (r.errs.length) process.exit(1);
console.log('PASS');
