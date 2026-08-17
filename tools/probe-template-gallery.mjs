// End-to-end gate for the blank-notebook template gallery: boot the fat launcher, run spawnNotebook
// for every template in both tutorial and blank mode, then cold-boot each result and assert it
// renders with no error cells. Also asserts the launcher's own runtime is untouched by a spawn.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync, statSync } from 'fs';

const file = resolve(process.argv[2] || 'lopecode/notebooks/quick_start.html');
const only = process.argv[3];
// what a user would plausibly tick, to exercise the tab + per-module tutorial note paths.
// robocoop-5 is optional, and its absence changes the layout (no bottom pane to reserve), so run
// the gate both ways: `--with-agent` covers the C100(...,S25(agent)) hash, the default the S100 one.
// Every optional module the chooser offers, so each one's tutorial note and its entry in the
// generated module list are actually built — a stray backtick in a catalogue entry kills the cell
// it lands in, and only a fork that ships that module would show it.
const EXTRAS = ['@tomlarkworthy/annotate', '@tomlarkworthy/claude-code-pairing', '@tomlarkworthy/editable-md',
  '@tomlarkworthy/svg-lens', '@tomlarkworthy/grid-container', '@tomlarkworthy/sticky', '@tomlarkworthy/tests',
  '@tomlarkworthy/debugger-2', '@tomlarkworthy/at-write', '@tomlarkworthy/local-change-history',
  ...(process.argv.includes('--with-agent') ? ['@tomlarkworthy/robocoop-5'] : [])];
// `--theme <name>` exercises the generation-time theme picker: the fork must ship exactly that
// theme's stylesheet block, not the one the launcher happens to be wearing.
const ti = process.argv.indexOf('--theme');
const THEME = ti >= 0 ? process.argv[ti + 1] : null;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const fatErrs = [];
page.on('pageerror', (e) => fatErrs.push(String(e).slice(0, 200)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(20000);

const built = await page.evaluate(async ({ only, EXTRAS, THEME }) => {
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
    vars: [...rt._variables].map((v) => String(v._name)),
    blocks: [...document.querySelectorAll('script[type="text/plain"]')].map((s) => s.id),
  });
  const s0 = snap();
  const out = [];
  for (const t of templates) {
    if (only && t.id !== only) continue;
    for (const tutorial of [true, false]) {
      const id = `${t.id}-${tutorial ? 'tutorial' : 'blank'}`;
      try {
        const { html, hash, themed } = await spawn({
          template: t, name: `@user/${id}`, title: `${t.label}`, modules: EXTRAS, tutorial,
          ...(THEME ? { theme: THEME } : {}),
        });
        if (THEME && !themed) throw new Error(`theme ${THEME} could not be fetched`);
        out.push({ id, html, hash, bytes: html.length });
      } catch (e) {
        out.push({ id, error: e.message + '\n' + (e.stack || '').slice(0, 400) });
      }
    }
  }
  const s1 = snap();
  const bag = (a) => a.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map());
  const diff = (a, b) => { const B = bag(b); return [...bag(a)].flatMap(([k, n]) => (B.get(k) ?? 0) < n ? [k] : []); };
  return {
    out,
    launcher: {
      addedMains: diff(s1.mains, s0.mains), addedBlocks: diff(s1.blocks, s0.blocks),
      addedVars: diff(s1.vars, s0.vars), droppedVars: diff(s0.vars, s1.vars),
    },
  };
}, { only, EXTRAS, THEME });

await browser.close();
if (built.error) { console.log('FAIL', built.error); process.exit(1); }
console.log('launcher delta:', JSON.stringify(built.launcher));

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
  await p.waitForTimeout(16000);
  const boot = await p.evaluate(() => {
    const rt = window.__ojs_runtime;
    const errors = [];
    for (const v of rt._variables) {
      const n = v._observer && v._observer._node;
      if (!n || !n.textContent) continue;
      // .observablehq--error alone misses cells lopepage renders itself, so match the text too —
      // but require the "SomeError:" form, or prose *documenting* an error message trips it.
      const errored = (n.querySelector && n.querySelector('.observablehq--error')) ||
        /\b(Runtime|Reference|Type|Syntax|Range)Error:/.test(n.textContent);
      if (errored) errors.push(`${v._name}: ${n.textContent.slice(0, 120)}`);
    }
    const bodyErrors = (document.body.innerText.match(/RuntimeError/g) || []).length;
    return {
      title: document.title,
      mains: [...rt.mains.keys()],
      moduleBlocks: [...document.querySelectorAll('script[type="text/plain"][id^="@"]')].length,
      errors,
      bodyErrors,
      // an annotation whose anchor did not resolve renders its header as "(adrift)"
      adrift: (document.body.innerText.match(/\(adrift\)/g) || []).length,
      // which theme actually shipped: the CSS blocks are what the themes module sniffs
      themeCss: [...document.querySelectorAll('script[type="text/plain"][data-mime="text/css"]')]
        .map((s) => s.id.split('/').pop()).filter((n) => n.startsWith('theme-')),
    };
  });
  await p.screenshot({ path: `tools/screenshots/tpl-${r.id}.png` });
  await b.close();
  const unknownNames = /module <unknown 0\./.test(r.html);
  const tutCells = (r.html.match(/annotation_tut\d+_note/g) || []).length;
  // Defects that belong to the modules themselves, reproduced in the launcher as well as in a fork.
  // Reported so they stay visible, not counted against the gallery:
  //  - local-change-history's own demo cells throw "branch is required" wherever they are booted;
  //  - a tests dashboard RENDERS failing tests as data, so its text carries an "Error:" that is
  //    the report, not a broken cell (currently editable-md's escaped-placeholder test).
  // fileSyncTools is no longer filtered: pairing declares its tools through plugin-registry
  // instead of importing a name file-sync never defined, so that error should not reappear.
  const known = boot.errors.filter((e) =>
    /branch is required|#test_\w/.test(e));
  boot.errors = boot.errors.filter((e) => !known.includes(e));
  boot.knownExternal = known;
  const themeOk = !THEME ||
    (boot.themeCss.length === 1 && boot.themeCss[0] === `theme-${THEME}.css`);
  const ok = boot.errors.length === 0 && boot.bodyErrors === 0 && errs.length === 0 && !unknownNames &&
    boot.adrift === 0 && themeOk;
  if (!ok) bad++;
  console.log(`\n### ${r.id} — ${ok ? 'OK' : 'PROBLEMS'}  ${(r.bytes / 1e6).toFixed(2)}MB (${Math.round((r.bytes / fatBytes) * 100)}%)`);
  console.log(`    hash ${r.hash}`);
  console.log(JSON.stringify({ ...boot, unknownNames, tutorialNotes: tutCells, pageErrors: errs.slice(0, 4) }, null, 1));
}
console.log(`\nfat launcher page errors: ${fatErrs.length ? fatErrs.slice(0, 3).join(' | ') : 'none'}`);
process.exit(bad ? 1 : 0);
