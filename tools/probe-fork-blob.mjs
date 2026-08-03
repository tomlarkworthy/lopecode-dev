// "Fork it" opens the generated notebook as a blob: URL rather than from disk. Blob forks have a
// different base URL, so module/attachment resolution can differ from the downloaded file — this
// probe drives the real button path and compares the two.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

const file = resolve('lopecode/notebooks/@tomlarkworthy_blank-notebook.html');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
const page = await ctx.newPage();
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(20000);

const spec = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const t = val('templates')[0];
  const { html, hash } = await val('spawnNotebook')({
    template: t, name: '@user/forktest', title: 'Fork test',
    modules: ['@tomlarkworthy/annotate'], tutorial: true,
  });
  return { html, hash };
});
writeFileSync(resolve('scratch/forktest.html'), spec.html);

const inspect = async (p, label) => {
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await p.waitForTimeout(16000);
  const r = await p.evaluate(() => {
    const rt = window.__ojs_runtime;
    const bad = [];
    for (const v of rt._variables) {
      const n = v._observer && v._observer._node;
      const txt = n && n.textContent ? n.textContent : '';
      if (/RuntimeError|ReferenceError|is not defined/.test(txt)) bad.push(`${v._name}: ${txt.slice(0, 70)}`);
    }
    const body = document.body.innerText;
    return {
      url: location.href.slice(0, 30),
      hash: location.hash.slice(0, 70),
      mains: rt.mains.size,
      hasPrisemirrorErr: /prosemirror is not defined/.test(body),
      runtimeErrorsInBody: (body.match(/RuntimeError/g) || []).length,
      badCells: bad.slice(0, 6),
    };
  });
  console.log(label, JSON.stringify({ ...r, pageErrors: errs.slice(0, 3) }, null, 1));
  return r;
};

// 1. downloaded-file path
const p1 = await ctx.newPage();
await p1.goto(`file://${resolve('scratch/forktest.html')}${spec.hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await inspect(p1, 'FILE  ');
await p1.screenshot({ path: 'tools/screenshots/fork-file.png' });

// 2. blob: path, driven the way the button drives it
const [popup] = await Promise.all([
  ctx.waitForEvent('page'),
  page.evaluate(async ({ html, hash }) => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url + hash, '_blank');
  }, spec),
]);
await popup.waitForLoadState('domcontentloaded');
await inspect(popup, 'BLOB  ');
await popup.screenshot({ path: 'tools/screenshots/fork-blob.png' });

await browser.close();
