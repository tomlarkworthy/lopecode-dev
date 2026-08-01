// What identity does a cell have on observablehq.com? Load the published mirror and report,
// per cell: the DOM container's attributes, whether the runtime is reachable, whether each
// variable's observer exposes a node, and what pid the sdk would compute for it.
import { chromium } from 'playwright';

const URL = process.argv[2] || 'https://observablehq.com/@tomlarkworthy/annotate';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1200 } });
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(20000);

for (const f of page.frames()) {
  const out = await f.evaluate(() => {
    const rt = window.__ojs_runtime;
    const res = { url: location.href, hasRuntime: !!rt, cells: [], sample: null };
    // Every element that carries the runtime's cell class, plus whatever wraps it.
    const divs = [...document.querySelectorAll('.observablehq')].filter(
      (d) => !d.parentElement || !d.parentElement.closest('.observablehq'));
    res.cellCount = divs.length;
    const attrs = (el) => el ? el.tagName.toLowerCase() +
      [...el.attributes].map((a) => `[${a.name}="${String(a.value).slice(0, 60)}"]`).join('') : 'none';
    res.sample = divs.slice(0, 6).map((d) => ({
      self: attrs(d), parent: attrs(d.parentElement), grand: attrs(d.parentElement && d.parentElement.parentElement),
      text: (d.textContent || '').trim().slice(0, 40)
    }));
    if (rt) {
      for (const v of rt._variables) {
        const n = v._observer && v._observer._node;
        res.cells.push({
          name: v._name || '(anon)',
          mod: (v._module && v._module._name) || (v._module === rt._main ? 'main' : '?'),
          node: n ? (n.nodeType === 1 ? attrs(n) : 'text/' + n.nodeType) : null,
          connected: n && n.isConnected,
          pid: v.pid || null
        });
      }
    }
    return res;
  }).catch((e) => ({ url: f.url(), error: String(e).slice(0, 120) }));
  if (out.error) { console.log('[frame]', out.url, out.error); continue; }
  console.log('=== frame', out.url, 'runtime:', out.hasRuntime, 'cell divs:', out.cellCount);
  for (const s of (out.sample || [])) console.log('   ', s.self, '\n      parent:', s.parent, '\n      text:', JSON.stringify(s.text));
  const named = (out.cells || []).filter((c) => c.name !== '(anon)');
  console.log('   variables:', (out.cells || []).length, 'named:', named.length,
    'with node:', (out.cells || []).filter((c) => c.node).length,
    'with pid:', (out.cells || []).filter((c) => c.pid).length);
  for (const c of named.slice(0, 12)) console.log('     ', c.name, '|', c.mod, '|', c.node, '| pid:', c.pid);
}
await page.screenshot({ path: 'tools/screenshots/observable-annotate.png', fullPage: false });
await browser.close();
