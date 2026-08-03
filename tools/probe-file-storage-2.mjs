// Probe 2: file:// localStorage across engines + persistence across a browser restart (same profile).
import { chromium, firefox, webkit } from 'playwright';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'filestore2-'));
const a = join(dir, 'a.html');
const b = join(dir, 'b.html');
writeFileSync(a, '<!doctype html><meta charset=utf8><title>a</title>');
writeFileSync(b, '<!doctype html><meta charset=utf8><title>b</title>');

const probe = () => {
  const out = { origin: location.origin, isSecureContext };
  const t = (n, f) => { try { out[n] = f(); } catch (e) { out[n] = 'THROWS: ' + e.name; } };
  t('read_existing', () => localStorage.getItem('tok'));
  t('write', () => { localStorage.setItem('tok', 'refresh-token-abc'); return localStorage.getItem('tok'); });
  t('subtle', () => typeof crypto.subtle);
  return out;
};

for (const [name, type] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const profile = mkdtempSync(join(tmpdir(), 'prof-' + name + '-'));
  try {
    // pass 1
    let ctx = await type.launchPersistentContext(profile, {});
    let p = await ctx.newPage();
    await p.goto('file://' + a);
    console.log(`[${name}] pass1 on a.html:`, JSON.stringify(await p.evaluate(probe)));
    await p.goto('file://' + b);
    console.log(`[${name}] pass1 on b.html (different file, same origin?):`,
      JSON.stringify(await p.evaluate(() => { try { return localStorage.getItem('tok'); } catch (e) { return 'THROWS: ' + e.name; } })));
    await ctx.close();
    // pass 2 — browser restarted, same profile
    ctx = await type.launchPersistentContext(profile, {});
    p = await ctx.newPage();
    await p.goto('file://' + a);
    console.log(`[${name}] pass2 after restart:`,
      JSON.stringify(await p.evaluate(() => { try { return localStorage.getItem('tok'); } catch (e) { return 'THROWS: ' + e.name; } })));
    await ctx.close();
  } catch (e) {
    console.log(`[${name}] UNAVAILABLE: ${e.message.split('\n')[0]}`);
  }
}
