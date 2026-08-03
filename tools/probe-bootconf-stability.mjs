// Is bootconf.mains a fixed point? A notebook whose runtime registers mains the file does not
// declare will grow a new entry every time it is saved. Boots the file, exports it the way
// save-in-place does, and compares the two mains lists.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const file = resolve(process.argv[2] || 'lopecode/notebooks/@tomlarkworthy_blank-notebook.html');

// The exporter's own source carries a TEMPLATE bootconf, so take the last block that parses.
const readBootconf = (html) => {
  let boot = null;
  const re = /<script[^>]*id="bootconf\.json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) { try { boot = JSON.parse(m[1]); } catch (e) {} }
  return boot;
};
const onDisk = readBootconf(readFileSync(file, 'utf-8'));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(18000);

const out = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const byName = (n) => {
    for (const v of rt._variables) if (v._name === n && typeof v._value === 'function') return v._value;
    return null;
  };
  const DATA = '@tomlarkworthy/annotate-data';
  const dataMod = rt.mains.get(DATA);
  let dataVars = [];
  if (dataMod) for (const v of rt._variables) if (v._module === dataMod && typeof v._name === 'string') dataVars.push(v._name);

  const resp = await byName('exportToHTML')({ mains: new Map(rt.mains), runtime: rt, options: { hash: '' } });
  const html = resp?.source ?? resp;
  return {
    runtimeMains: [...rt.mains.keys()].sort(),
    dataModuleCells: dataVars.sort(),
    paintedBoxes: document.querySelectorAll('[data-ann-id]').length,
    exportedHtml: html,
  };
});

const exported = readBootconf(out.exportedHtml);
const setOf = (a) => new Set(a || []);
const disk = setOf(onDisk.mains), exp = setOf(exported.mains), live = setOf(out.runtimeMains);
const diff = (a, b) => [...a].filter((x) => !b.has(x));

console.log(JSON.stringify({
  onDiskMains: onDisk.mains.length,
  exportedMains: exported.mains.length,
  runtimeMains: out.runtimeMains.length,
  addedBySaving: diff(exp, disk),
  lostBySaving: diff(disk, exp),
  runtimeNotDeclared: diff(live, disk),
  stable: diff(exp, disk).length === 0 && diff(disk, exp).length === 0,
  annotateDataCells: out.dataModuleCells,
  paintedBoxes: out.paintedBoxes,
}, null, 2));
console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
