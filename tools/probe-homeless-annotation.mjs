// A note whose anchor names no module used to land in a synthesised @tomlarkworthy/annotate-data.
// It should now land in @tomlarkworthy/annotate itself, and nothing should be registered in
// runtime.mains that the file does not declare.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2] || 'lopecode/notebooks/quick_start.html');
const DATA = '@tomlarkworthy/annotate-data';
const SELF = '@tomlarkworthy/annotate';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(18000);

const out = await page.evaluate(async ({ DATA, SELF }) => {
  const rt = window.__ojs_runtime;
  let store = null;
  for (const v of rt._variables)
    if (v._name === 'a2Store' && v._value && typeof v._value.create === 'function') store = v._value;
  if (!store) return { error: 'a2Store not found' };

  const before = { dataInMains: rt.mains.has(DATA), mains: rt.mains.size };

  // An anchor with no module at all — the homeless case.
  const rec = store.create({ surface: 'text', quote: { prefix: '', exact: 'probe', suffix: '' } }, {});

  const modName = (m) => { for (const [k, v] of rt.mains) if (v === m) return k; return '(unregistered)'; };
  const homeOf = store.homeOf ? store.homeOf(rec) : null;
  // where did the cells actually get defined?
  let cellModule = null;
  for (const v of rt._variables)
    if (v._name === 'annotation_' + rec.id) cellModule = modName(v._module);

  return {
    dataInMainsBefore: before.dataInMains,
    dataInMainsAfter: rt.mains.has(DATA),
    mainsGrew: rt.mains.size - before.mains,
    recordHome: rec.home,
    homeOfResolvesTo: homeOf ? modName(homeOf) : null,
    cellsLandedIn: cellModule,
    correct: rec.home === SELF && cellModule === SELF && !rt.mains.has(DATA),
  };
}, { DATA, SELF });

console.log(JSON.stringify(out, null, 2));
console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
