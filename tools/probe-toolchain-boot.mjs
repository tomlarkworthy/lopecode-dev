// Is the 2.5MB AssemblyScript compiler paid for at boot, or only when the rebuild button is pressed?
import { chromium } from 'playwright';
import { resolve } from 'path';
const browser = await chromium.launch({ headless: true, args: ['--disable-background-timer-throttling'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.addInitScript(() => {
  window.__cs = [];
  let installed = null;
  Object.defineProperty(window, 'lopecode', {
    configurable: true, get: () => installed,
    set: (v) => { installed = v;
      if (v && typeof v.contentSync === 'function' && !v.__w) {
        const orig = v.contentSync.bind(v);
        v.contentSync = (id) => { const t = performance.now(); try { return orig(id); } finally { window.__cs.push({ id: String(id).slice(0, 70), at: Math.round(t), ms: Math.round(performance.now() - t) }); } };
        v.__w = true;
      } },
  });
});
await page.goto('file://' + resolve(process.argv[2]), { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForSelector('#lopepage-2 .observablehq', { timeout: 60000 });
await page.waitForTimeout(15000);
console.log(JSON.stringify(await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  let tc = null, wr = null;
  for (const v of rt._variables) {
    if (String(v._name) === 'toolchain') tc = v._value !== undefined;
    if (String(v._name) === 'wasmRebuild') wr = v._value;
  }
  return {
    toolchainResolvedAtBoot: tc,
    wasmRebuild: wr,
    asAttachmentReads: window.__cs.filter((c) => /assembly-script/.test(c.id)),
    totalContentSyncMs: Math.round(window.__cs.reduce((a, b) => a + b.ms, 0)),
  };
}), null, 1));
await browser.close();
