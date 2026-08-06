// Repro: a save-in-place taken AFTER an annotation has been created writes the
// @tomlarkworthy/annotate block as id="<unknown 0.xxx>" while bootconf still
// lists the real name, so the saved file 404s to api.observablehq.com and boots
// with no annotations.
//
// Boot a healthy file, create one annotation on the host module through
// a2Store.create (annotate's own public API), then export and read back the ids.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2] || 'lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html');
const HOST = process.argv[3] || '@tomlarkworthy/coded-landmark-tracking';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(Number(process.argv[4] || 30000));

const survey = async (label) => page.evaluate(async ({ label, HOST }) => {
  const rt = window.__ojs_runtime;
  const NAME = '@tomlarkworthy/annotate';
  const annotate = rt.mains.get(NAME) ?? null;
  const host = rt.mains.get(HOST) ?? null;
  const byName = (n) => {
    for (const v of rt._variables) if (v._name === n && typeof v._value === 'function') return v._value;
    return null;
  };

  // the module var annotate injects into the host, and what it points at
  const injected = [];
  for (const v of rt._variables) {
    if (v._module === host && typeof v._name === 'string' && v._name.startsWith('module ')) {
      injected.push({ name: v._name, isAnnotateMain: v._value === annotate, hasValue: v._value != null });
    }
  }

  let mmSize = null, mmAnnotate = null, mmEntry = null;
  try {
    const mm = await byName('moduleMap')();
    mmSize = mm.size;
    const e = annotate ? mm.get(annotate) : null;
    mmAnnotate = e ? e.name : '<ABSENT>';
    mmEntry = e ? { name: e.name, type: e.type ?? null, variableName: e.variable?._name ?? null, hostIsHost: e.variable?._module === host } : null;
  } catch (e) { mmSize = 'threw ' + String(e).slice(0, 100); }

  let exported;
  try {
    const resp = await byName('exportToHTML')({ mains: new Map(rt.mains), runtime: rt, options: { hash: '' } });
    const html = String(resp?.source ?? resp);
    const ids = [...html.matchAll(/<script id="([^"]+)"/g)].map((m) => m[1]);
    let boot = null;
    for (const m of html.matchAll(/<script[^>]*id="bootconf\.json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try { boot = JSON.parse(m[1]); } catch {}
    }
    exported = {
      annotateBlockPresent: ids.includes(NAME),
      unknownBlockIds: ids.filter((i) => i.startsWith('<unknown')),
      unknownModuleDefines: [...new Set([...html.matchAll(/main\.define\("module (<unknown [^"]+)"/g)].map((m) => m[1]))],
      bootconfMains: boot?.mains ?? null,
    };
  } catch (e) { exported = { error: String(e).slice(0, 200) }; }

  return { label, annotateInMains: rt.mains.has(NAME), injectedModuleVarsInHost: injected, moduleMapSize: mmSize, moduleMapNameForAnnotate: mmAnnotate, moduleMapEntryForAnnotate: mmEntry, exported };
}, { label, HOST });

const before = await survey('before creating an annotation');

const created = await page.evaluate(async (HOST) => {
  const rt = window.__ojs_runtime;
  const annotate = rt.mains.get('@tomlarkworthy/annotate');
  if (!annotate) return 'annotate not in mains';
  const store = await annotate.value('a2Store');
  const a = store.create({ module: HOST, cell: 'row_md' }, { src: 'md`probe note`' });
  return a ? { id: a.id, home: a.home, varName: a.varName } : 'create returned null';
}, HOST);

await page.waitForTimeout(4000);
const after = await survey('after creating an annotation');

console.log(JSON.stringify({ before, created, after }, null, 2));
console.log('page errors:', errs.length ? errs.slice(0, 5) : 'none');
await browser.close();
