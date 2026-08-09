// probe-observable-annotate.mjs reports a count; this reports which names fulfilled, which is
// what you need after adding cells (a count can go up for the wrong reason).
import { chromium } from 'playwright';
const SLUG = process.argv[2];
const WANT = process.argv.slice(3);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><body><script type="module">
  window.__ok = []; window.__errs = []; window.__loadError = null;
  try {
    const {Runtime} = await import("https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js");
    const define = (await import("https://api.observablehq.com/${SLUG}.js?v=4")).default;
    new Runtime().module(define, (name) => ({
      pending() {}, fulfilled() { if (name) window.__ok.push(name); },
      rejected(err) { window.__errs.push((name || "(anon)") + ": " + String(err).slice(0, 120)); }
    }));
  } catch (e) { window.__loadError = String(e).slice(0, 200); }
  window.__booted = true;
</script></body></html>`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__booted === true, { timeout: 60000 });
await page.waitForTimeout(15000);
const r = await page.evaluate(() => ({ ok: window.__ok, errs: [...new Set(window.__errs)], loadError: window.__loadError }));
console.log(SLUG, r.loadError ? "LOAD ERROR " + r.loadError : "");
console.log("errors:", r.errs.length ? r.errs : "none");
for (const w of WANT) console.log(r.ok.includes(w) ? `  ok      ${w}` : `  MISSING ${w}`);
await browser.close();
process.exit(r.errs.length || WANT.some((w) => !r.ok.includes(w)) ? 1 : 0);
