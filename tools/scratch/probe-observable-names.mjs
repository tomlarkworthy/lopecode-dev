// Variant of tools/probe-observable-annotate.mjs that reports DISTINCT fulfilled names.
// The original counts fulfilment events (a recomputing cell counts again) and skips anonymous
// cells, so its `ok` moved 59 -> 51 -> 55 -> 55 across runs of an unchanged notebook.
// run: node tools/scratch/probe-observable-names.mjs @tomlarkworthy/cell-map-2
import { chromium } from 'playwright';
const SLUG = process.argv[2];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(`<!doctype html><html><body><script type="module">
  window.__ok = new Set(); window.__anonOk = 0; window.__errs = []; window.__loadError = null;
  try {
    const {Runtime} = await import("https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/dist/runtime.js");
    const define = (await import("https://api.observablehq.com/${SLUG}.js?v=4")).default;
    new Runtime().module(define, (name) => ({
      pending() {},
      fulfilled() { if (name) window.__ok.add(name); else window.__anonOk++; },
      rejected(err) { window.__errs.push((name || "(anonymous)") + ": " + String(err).slice(0, 90)); }
    }));
  } catch (e) { window.__loadError = String(e).slice(0, 200); }
  window.__booted = true;
</script></body></html>`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__booted === true, { timeout: 60000 });
await page.waitForTimeout(15000);
const r = await page.evaluate(() => ({
  names: [...window.__ok].sort(), anon: window.__anonOk, errs: [...new Set(window.__errs)], loadError: window.__loadError
}));
await browser.close();
if (r.loadError) console.log('LOAD ERROR', r.loadError);
console.log(`distinct named fulfilled: ${r.names.length}`);
console.log(r.names.join('\n'));
console.log(`anonymous fulfilment events: ${r.anon}`);
console.log(`errors: ${r.errs.length}`);
if (r.errs.length) console.log(r.errs.join('\n'));
