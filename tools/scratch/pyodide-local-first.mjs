// Proves @tomlarkworthy/pyodide is local-first: node pyodide-local-first.mjs <notebook.html> [--offline]
// --offline: the browser context is offline and cdn.jsdelivr.net is blocked. Prints py.run output,
// status().loaded and every request that reached the CDN.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const file = resolve(process.argv[2]);
const offline = process.argv.includes('--offline');
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext();
const cdn = [];
await ctx.route('**/*', (route) => {
  const u = route.request().url();
  if (u.includes('cdn.jsdelivr.net/pyodide')) { cdn.push(u.split('/full/')[1] || u); if (offline) return route.abort(); }
  return route.continue();
});
if (offline) await ctx.setOffline(true);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
await page.goto('file://' + file, { waitUntil: 'load', timeout: 120000 });
const out = await page.evaluate(async () => {
  const t0 = Date.now();
  let m;
  while (!(m = window.__ojs_runtime?.mains?.get('@tomlarkworthy/pyodide')) && Date.now() - t0 < 60000) await new Promise(r => setTimeout(r, 200));
  if (!m) return { err: 'no pyodide module in mains' };
  const py = await m.value('py');
  const tool = await m.value('run_python');
  const r = await py.run('import numpy; print(numpy.arange(3).sum())', { disk: false });
  const t = await tool.execute({ code: '2**10', disk: false });
  return { ok: r.ok, stdout: r.stdout.trim(), stderr: r.stderr.slice(0, 300), ms: r.ms, loaded: py.status().loaded, tool: t.output, bootMs: t0 };
});
console.log(JSON.stringify({ offline, ...out, cdnRequests: cdn, pageErrors: errs.slice(0, 5) }, null, 1));
await b.close();
