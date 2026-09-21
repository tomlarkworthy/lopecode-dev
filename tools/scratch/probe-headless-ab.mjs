// A/B: does options.headless actually move the BAKED bootconf.headless in the emitted bundle?
// This is the user's bug: their export carried "headless": false, so the inspector rendered
// lopepage-2's md cells into <body> alongside the frame it mounts itself.
import { chromium } from 'playwright';
const file = 'file:///Users/tom.larkworthy/dev/lopecode-dev/lopecode/notebooks/@tomlarkworthy_exporter-3.html';
const browser = await chromium.launch({ args: ['--disable-web-security'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await page.goto(file, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__ojs_runtime, null, { timeout: 60000 });
await page.waitForTimeout(9000);

const out = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  let mod = null;
  for (const v of rt._variables) if (v._name === 'exportToHTML') { mod = v._module; break; }
  if (!mod) return { error: 'exportToHTML not in runtime' };
  const exportToHTML = await mod.value('exportToHTML');
  const res = {};
  for (const h of [true, false]) {
    try {
      const r = await exportToHTML({ mains: rt.mains, runtime: rt, options: { headless: h, title: 'probe' } });
      const src = r?.source ?? r;
      const m = String(src).match(/"headless"\s*:\s*(true|false)/);
      res['passed_' + h] = { baked: m ? m[1] : '(no bootconf headless found)', bytes: String(src).length };
    } catch (e) { res['passed_' + h] = { error: String(e).slice(0, 140) }; }
  }
  // and with headless omitted entirely -> must fall back to bootconf (true in this notebook)
  try {
    const r = await exportToHTML({ mains: rt.mains, runtime: rt, options: { title: 'probe' } });
    const src = r?.source ?? r;
    const m = String(src).match(/"headless"\s*:\s*(true|false)/);
    res.omitted = { baked: m ? m[1] : '(none)' };
  } catch (e) { res.omitted = { error: String(e).slice(0, 140) }; }
  // what this notebook itself booted with
  try {
    const c = JSON.parse(new TextDecoder().decode(window.lopecode.contentSync('bootconf.json').bytes));
    res.thisNotebookBootconf = { headless: c.headless, mains: c.mains };
  } catch (e) { res.thisNotebookBootconf = String(e).slice(0, 80); }
  return res;
});
console.log(JSON.stringify(out, null, 2));
console.log('pageerrors:', errs.length, errs.slice(0, 3));
await browser.close();
