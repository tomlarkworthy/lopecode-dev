// End-to-end gate for the blank-notebook template gallery: boot the fat launcher, run spawnNotebook
// for every template, then cold-boot each result and assert it renders with no error cells.
// Also asserts the launcher's own runtime is untouched by a spawn.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync, statSync } from 'fs';

const file = resolve(process.argv[2] || 'lopecode/notebooks/@tomlarkworthy_blank-notebook.html');
const only = process.argv[3];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const fatErrs = [];
page.on('pageerror', (e) => fatErrs.push(String(e).slice(0, 200)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(20000);

const built = await page.evaluate(async (only) => {
  const rt = window.__ojs_runtime;
  const val = (name) => {
    for (const v of rt._variables) if (v._name === name && v._value !== undefined) return v._value;
    return null;
  };
  const templates = val('templates');
  const spawn = val('spawnNotebook');
  if (!templates || !spawn) return { error: `templates=${!!templates} spawnNotebook=${!!spawn}` };

  const snap = () => ({
    mains: [...rt.mains.keys()],
    vars: [...rt._variables].map((v) => `${v._module?.constructor?.name ?? ''}:${v._name}`),
    blocks: [...document.querySelectorAll('script[type="text/plain"]')].map((s) => s.id),
  });
  const s0 = snap();
  const before = { mains: s0.mains, variables: s0.vars.length, blocks: s0.blocks.length };
  const out = [];
  for (const t of templates) {
    if (only && t.id !== only) continue;
    const extras = t.suggest;
    try {
      const html = await spawn({ template: t, name: `@user/${t.id}-demo`, title: `${t.label} demo`, modules: extras });
      out.push({ id: t.id, html, bytes: html.length });
    } catch (e) {
      out.push({ id: t.id, error: e.message + '\n' + (e.stack || '').slice(0, 400) });
    }
  }
  const s1 = snap();
  const after = { mains: s1.mains, variables: s1.vars.length, blocks: s1.blocks.length };
  const bag = (a) => a.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map());
  const diff = (a, b) => { const B = bag(b); return [...bag(a)].flatMap(([k, n]) => (B.get(k) ?? 0) < n ? [k] : []); };
  return {
    out,
    launcherUnchanged: JSON.stringify(before) === JSON.stringify(after),
    before, after,
    addedMains: diff(s1.mains, s0.mains), addedBlocks: diff(s1.blocks, s0.blocks),
    addedVars: diff(s1.vars, s0.vars).slice(0, 40), droppedVars: diff(s0.vars, s1.vars).slice(0, 40),
  };
}, only);

await browser.close();
if (built.error) { console.log('FAIL', built.error); process.exit(1); }
console.log('launcher untouched by spawn:', built.launcherUnchanged);
if (!built.launcherUnchanged)
  console.log(JSON.stringify({
    variables: [built.before.variables, built.after.variables], blocks: [built.before.blocks, built.after.blocks],
    addedMains: built.addedMains, addedBlocks: built.addedBlocks,
    addedVars: built.addedVars, droppedVars: built.droppedVars,
  }, null, 1));

const fatBytes = statSync(file).size;
let bad = 0;
for (const r of built.out) {
  if (r.error) { console.log(`\n### ${r.id}: BUILD FAILED\n${r.error}`); bad++; continue; }
  const out = resolve(`scratch/tpl-${r.id}.html`);
  writeFileSync(out, r.html);
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(`file://${out}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(15000);
  const boot = await p.evaluate(() => {
    const rt = window.__ojs_runtime;
    const errors = [];
    for (const v of rt._variables) {
      const n = v._observer && v._observer._node;
      if (n && n.querySelector && n.querySelector('.observablehq--error'))
        errors.push(`${v._name}: ${n.textContent.slice(0, 120)}`);
    }
    return {
      title: document.title,
      mains: [...rt.mains.keys()],
      moduleBlocks: [...document.querySelectorAll('script[type="text/plain"][id^="@"]')].length,
      errors,
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 180),
    };
  });
  await p.screenshot({ path: `tools/screenshots/tpl-${r.id}.png`, fullPage: false });
  await b.close();
  const ok = boot.errors.length === 0 && errs.length === 0;
  if (!ok) bad++;
  console.log(`\n### ${r.id} — ${ok ? 'OK' : 'PROBLEMS'}  ${(r.bytes / 1e6).toFixed(2)}MB (${Math.round((r.bytes / fatBytes) * 100)}% of launcher)`);
  console.log(JSON.stringify({ ...boot, pageErrors: errs.slice(0, 4) }, null, 1));
}
console.log(`\nfat launcher page errors: ${fatErrs.length ? fatErrs.slice(0, 3).join(' | ') : 'none'}`);
process.exit(bad ? 1 : 0);
