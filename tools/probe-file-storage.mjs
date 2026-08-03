// Probe: what web-storage / crypto / fetch capabilities exist on a file:// page in Chromium?
import { chromium } from 'playwright';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'filestore-'));
const page1 = join(dir, 'a.html');
const page2 = join(dir, 'sub-b.html');
const probe = `<!doctype html><meta charset=utf8><title>probe</title><body><pre id=out></pre>`;
writeFileSync(page1, probe);
writeFileSync(page2, probe);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const p = await ctx.newPage();

const report = async (page, url, label) => {
  await page.goto(url);
  const r = await page.evaluate(() => {
    const out = { origin: location.origin, isSecureContext, crossOriginIsolated };
    const t = (name, fn) => { try { out[name] = fn(); } catch (e) { out[name] = 'THROWS: ' + e.name + ': ' + e.message; } };
    t('localStorage_write', () => { localStorage.setItem('k', 'v1'); return localStorage.getItem('k'); });
    t('sessionStorage_write', () => { sessionStorage.setItem('s', 'v'); return sessionStorage.getItem('s'); });
    t('indexedDB', () => typeof indexedDB);
    t('cookie_write', () => { document.cookie = 'c=1'; return document.cookie || '(empty)'; });
    t('crypto_subtle', () => typeof crypto.subtle);
    t('crypto_getRandomValues', () => typeof crypto.getRandomValues);
    t('caches', () => typeof caches);
    return out;
  });
  console.log(`--- ${label} (${url}) ---`);
  console.log(JSON.stringify(r, null, 2));
  return r;
};

await report(p, 'file://' + page1, 'file page A');
// does a DIFFERENT file:// page see A's localStorage?
await p.goto('file://' + page2);
const shared = await p.evaluate(() => { try { return localStorage.getItem('k'); } catch (e) { return 'THROWS: ' + e.message; } });
console.log('--- file page B sees A\'s localStorage key? ---');
console.log(JSON.stringify({ value: shared }));

// persistence across a fresh context in the same browser (i.e. a "reload later" scenario)
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto('file://' + page1);
const afterNewCtx = await p2.evaluate(() => { try { return localStorage.getItem('k'); } catch (e) { return 'THROWS: ' + e.message; } });
console.log('--- fresh browser context sees it? (expect null: contexts are isolated) ---');
console.log(JSON.stringify({ value: afterNewCtx }));

// CORS reachability of the AWS endpoints we'd need, from a file:// (Origin: null) page
const endpoints = [
  ['cognito-idp', 'https://cognito-idp.us-east-1.amazonaws.com/'],
  ['cognito-identity', 'https://cognito-identity.us-east-1.amazonaws.com/'],
  ['monitoring(cloudwatch)', 'https://monitoring.us-east-1.amazonaws.com/'],
];
await p.goto('file://' + page1);
for (const [name, url] of endpoints) {
  const res = await p.evaluate(async (u) => {
    try {
      // A signed-style request: JSON body + x-amz-target => triggers a CORS preflight.
      const r = await fetch(u, {
        method: 'POST',
        headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': 'Probe.Probe' },
        body: '{}',
      });
      return { ok: r.ok, status: r.status, type: r.type };
    } catch (e) { return { error: e.name + ': ' + e.message }; }
  }, url);
  console.log(`--- CORS probe ${name} ---`, JSON.stringify(res));
}

await browser.close();
