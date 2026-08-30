// `prosemirror is not defined` showed up in a real fork but not in the gate. Sweep the optional
// module combinations to find which tick breaks md (or any other cell).
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

const file = resolve('lopecode/notebooks/quick_start.html');
const OPT = [
  '@tomlarkworthy/annotate',
  '@tomlarkworthy/svg-lens',
  '@tomlarkworthy/grid-container',
  '@tomlarkworthy/claude-code-pairing',
  '@tomlarkworthy/at-write',
  '@tomlarkworthy/local-change-history',
];
const COMBOS = [
  [],
  ...OPT.map((m) => [m]),          // each alone
  OPT,                             // everything
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(20000);

const results = [];
for (const [i, modules] of COMBOS.entries()) {
  const built = await page.evaluate(async ({ modules }) => {
    const rt = window.__ojs_runtime;
    const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
    try {
      const { html, hash } = await val('spawnNotebook')({
        template: val('templates')[0], name: '@user/combo', title: 'Combo', modules, tutorial: true,
      });
      return { html, hash };
    } catch (e) { return { error: e.message }; }
  }, { modules });

  const label = modules.length ? modules.map((m) => m.split('/')[1]).join('+') : '(none)';
  if (built.error) { console.log(`${label}: BUILD FAILED ${built.error}`); continue; }
  const out = resolve(`scratch/combo-${i}.html`);
  writeFileSync(out, built.html);

  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
  await p.goto(`file://${out}${built.hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(15000);
  const r = await p.evaluate(() => {
    const body = document.body.innerText;
    const undef = [...new Set((body.match(/(\w+) is not defined/g) || []))];
    return { runtimeErrors: (body.match(/RuntimeError/g) || []).length, undef };
  });
  await b.close();
  const ok = r.runtimeErrors === 0;
  results.push({ label, ...r, ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(60)} ${r.runtimeErrors} RuntimeError ${JSON.stringify(r.undef)}`);
}
await browser.close();
console.log(`\n${results.filter((r) => !r.ok).length} failing combination(s)`);
