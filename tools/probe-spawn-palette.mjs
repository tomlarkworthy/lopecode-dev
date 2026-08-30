// Does ⌘K still work in a notebook spawned from the quick_start chooser? Spawns one per template,
// cold-boots it, and probes the palette (open + module finder + cell search).
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

const launcher = resolve('lopecode/notebooks/quick_start.html');
const FLAGS = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
const only = process.argv[2];

const browser = await chromium.launch({ headless: true, args: FLAGS });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
await page.goto(`file://${launcher}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(20000);

const tpls = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const val = n => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  return val('templates').map(t => ({ id: t.id, modules: t.modules, suggest: t.suggest || [] }));
});
console.log('templates:', JSON.stringify(tpls));

for (const t of tpls) {
  if (only && t.id !== only) continue;
  const spec = await page.evaluate(async (id) => {
    const rt = window.__ojs_runtime;
    const val = n => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
    const t = val('templates').find(x => x.id === id);
    const { html, hash } = await val('spawnNotebook')({
      template: t, name: '@user/fork-' + id, title: 'Fork ' + id,
      modules: t.suggest || [], tutorial: true,
    });
    return { html, hash };
  }, t.id);
  const out = resolve(`scratch/palette-fork-${t.id}.html`);
  writeFileSync(out, spec.html);
  console.log(`\n=== ${t.id} — ${(spec.html.length / 1e6).toFixed(2)}MB, hash ${spec.hash}`);

  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 130)));
  await p.goto(`file://${out}${spec.hash || ''}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(20000);

  const diag = await p.evaluate(() => {
    const rt = window.__ojs_runtime;
    const vals = {};
    for (const v of rt._variables) if (v._name && v._value !== undefined) vals[v._name] = v._value;
    const named = new Set([...rt._variables].filter(v => v._name).map(v => v._name));
    return {
      mains: [...rt.mains.keys()],
      hasCPBlock: !!document.getElementById('@tomlarkworthy/command-palette'),
      hasPRBlock: !!document.getElementById('@tomlarkworthy/plugin-registry'),
      overlayInDom: !!document.querySelector('#lopecode-command-palette, [class*=command-palette]'),
      defined: ['commandPaletteOverlay', 'commandPaletteKeybinding', 'commandProviders', 'command_provider_sync',
        'moduleFinderPlugin', 'cellSearchPlugin', 'plugins', 'lp2_background_jobs', 'currentModules']
        .map(n => `${n}=${named.has(n) ? (n in vals ? String(vals[n]).slice(0, 40) : 'PENDING/ERR') : 'UNDEFINED'}`),
    };
  });
  console.log(JSON.stringify(diag, null, 1));

  await p.keyboard.press('Meta+k');
  await p.waitForTimeout(1200);
  const opened = await p.evaluate(() => {
    const o = document.querySelector('#lopecode-command-palette, [class*=command-palette]');
    return !!o && getComputedStyle(o).display !== 'none' && o.offsetHeight > 0;
  });
  console.log('⌘K opens palette:', opened);
  if (opened) {
    await p.keyboard.type('lopepage', { delay: 25 });
    await p.waitForTimeout(1000);
    console.log('module search:', JSON.stringify((await p.evaluate(() => {
      const o = document.querySelector('#lopecode-command-palette, [class*=command-palette]');
      return o ? o.innerText.slice(0, 200) : '';
    }))));
  }
  if (errs.length) console.log('pageerrors:', errs.slice(0, 5));
  await p.close();
}

await browser.close();
