// @tomlarkworthy/annotate's module block comes out of a save-in-place named
// "<unknown 0.xxx>" while bootconf still lists the real name, so the saved file
// boots with no annotations (it 404s to api.observablehq.com instead).
// findModuleName() falls back to that when moduleMap has no entry for the
// module object. Boot a HEALTHY file, ask what the runtime and moduleMap know
// about annotate, then run the export and see what name it actually emits.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2] || 'lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(Number(process.argv[3] || 25000));

const out = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const NAME = '@tomlarkworthy/annotate';
  const byName = (n) => {
    for (const v of rt._variables) if (v._name === n && typeof v._value === 'function') return v._value;
    return null;
  };
  const short = (m) => {
    if (!m) return null;
    for (const [k, v] of rt.mains) if (v === m) return 'mains:' + k;
    for (const [k, v] of rt._modules) if (v === m) return '_modules:' + String(k).slice(0, 60);
    return 'UNREGISTERED';
  };

  const annotateMain = rt.mains.get(NAME) ?? null;

  // who provides the `annotation` import, and is that module registered anywhere?
  const annotationImports = [];
  for (const v of rt._variables) {
    if (v._name === 'annotation') {
      const src = (v._inputs ?? []).find((i) => typeof i._name === 'string' && i._name.startsWith('module '));
      annotationImports.push({
        hostModule: short(v._module),
        viaVariable: src?._name ?? null,
        provider: short(src?._value),
        providerIsAnnotateMain: !!annotateMain && src?._value === annotateMain,
      });
    }
  }

  // moduleMap's view
  let mapSize = null, mapForAnnotate = null, mapForProvider = null;
  const provider = annotationImports[0]
    ? (rt._variables && [...rt._variables].find((v) => v._name === annotationImports[0].viaVariable)?._value)
    : null;
  try {
    const mm = await byName('moduleMap')();
    mapSize = mm.size;
    mapForAnnotate = annotateMain ? (mm.get(annotateMain)?.name ?? '<ABSENT>') : '<no annotate main>';
    mapForProvider = provider ? (mm.get(provider)?.name ?? '<ABSENT>') : '<no provider>';
  } catch (e) {
    mapSize = 'moduleMap threw: ' + String(e).slice(0, 140);
  }

  // reproduce the export and read back the id it gave annotate
  let exported = null;
  try {
    const resp = await byName('exportToHTML')({ mains: new Map(rt.mains), runtime: rt, options: { hash: '' } });
    const html = resp?.source ?? resp;
    const ids = [...String(html).matchAll(/<script id="([^"]+)"/g)].map((m) => m[1]);
    let boot = null;
    for (const m of String(html).matchAll(/<script[^>]*id="bootconf\.json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try { boot = JSON.parse(m[1]); } catch {}
    }
    exported = {
      annotateBlockPresent: ids.includes(NAME),
      unknownIds: ids.filter((i) => i.startsWith('<unknown')),
      orphanDefines: [...String(html).matchAll(/main\.define\("module (<unknown [^"]+)"/g)].map((m) => m[1]),
      bootconfMains: boot?.mains ?? null,
    };
  } catch (e) {
    exported = { error: String(e).slice(0, 200) };
  }

  return {
    annotateInMains: rt.mains.has(NAME),
    mainsKeys: [...rt.mains.keys()],
    annotationImports,
    moduleMapSize: mapSize,
    moduleMapNameForAnnotate: mapForAnnotate,
    moduleMapNameForProvider: mapForProvider,
    exported,
  };
});

console.log(JSON.stringify(out, null, 2));
console.log('page errors:', errs.length ? errs.slice(0, 5) : 'none');
await browser.close();
