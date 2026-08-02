// cellEditor mounts its shell but never its CodeMirror on observablehq.com. Everything the
// heavy editor needs resolves in the source module, so drive cloneDataflow directly and watch
// what the clone does.
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1200 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto('https://observablehq.com/@tomlarkworthy/annotate', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(22000);
const frame = page.frames().find((f) => f.url().includes('observableusercontent.com'));

console.log(await frame.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const home = ([...rt._variables].find((v) => v._name === 'a2Layer') || {})._module;
  const thunk = ([...rt._variables].find((v) => v._name === 'cellEditor' && v._module === home) || {})._value;
  await thunk();
  const mod = [...rt._variables].find((v) => v._name === 'cellEditor' && v._module !== home)._module;
  const clone = await mod.value('cloneDataflow');
  const template = await mod.value('editorTemplate');
  const out = ['template entries: ' + (Array.isArray(template) ? template.length : typeof template)];
  if (Array.isArray(template)) out.push('  names: ' + template.map((t) => t && (t.name || t._name || t[0])).slice(0, 12).join(', '));

  const seen = [];
  let dispose = null;
  try {
    dispose = clone(template, (name) => {
      seen.push(name);
      return {
        fulfilled: (v) => seen.push(`  ${name} -> ok ${v && v.constructor ? v.constructor.name : typeof v}`),
        rejected: (e) => seen.push(`  ${name} -> REJECTED ${String(e).slice(0, 100)}`)
      };
    });
  } catch (e) { out.push('clone threw: ' + String(e).slice(0, 200)); }
  await new Promise((r) => setTimeout(r, 6000));
  out.push('observer factory called for: ' + seen.filter((s) => !s.startsWith('  ')).join(', '));
  out.push(seen.filter((s) => s.startsWith('  ')).join('\n') || '  (no fulfilled/rejected callbacks fired)');
  if (dispose) dispose();
  return out.join('\n');
}));
await browser.close();
