// Why does an import cell render as "<unknown 0.42>"? Inspect a page's module vars, the runtime
// module map, and what moduleVarInfo/importedModule return.
// Answer, for the record: module naming resolves the name out of the module var's definition
// SOURCE (module-map resolve_modules -> toolchain findModuleName -> extractModuleInfo). A
// definition whose specifier is not a string literal — a closed-over `/${name}.js?v=4`, or no
// import() at all — is unnameable, and the "<unknown N>" is then baked into the exported file.
import { chromium } from 'playwright';
import { resolve } from 'path';
const file = resolve(process.argv[2] || 'scratch/tpl-ui.html');
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(15000);
console.log(JSON.stringify(await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const fn = (name) => { for (const v of rt._variables) if (v._name === name && typeof v._value === 'function') return v._value; };
  const moduleMap = fn('moduleMap'), moduleVarInfo = fn('moduleVarInfo'), importedModule = fn('importedModule');
  const extract = fn('extractObservableNotebookNameFromSpecifier');
  const mm = await moduleMap(rt);
  const seed = rt.mains.get([...rt.mains.keys()].find((k) => k.startsWith('@user/')));
  const out = [];
  for (const v of rt._variables) {
    if (v._module !== seed) continue;
    if (typeof v._name === 'string' && v._name.startsWith('module ')) {
      const info = await moduleVarInfo(v, mm);
      out.push({ kind: 'moduleVar', name: v._name, hasValue: v._value !== undefined,
        inMap: !!(v._value && mm.get(v._value)), specifier: info?.specifier, infoName: info?.name,
        extracted: info?.specifier ? extract(info.specifier) : null,
        def: String(v._definition).slice(0, 120) });
    } else if (v._name === 'gridContainer' || v._name === 'runtime') {
      const src = await importedModule(v);
      out.push({ kind: 'bridge', name: v._name, sourceInMap: !!(src && mm.get(src)),
        sourceName: src ? mm.get(src)?.name : null,
        sameAsModuleVarValue: v._inputs?.[0]?._value === src, input0: v._inputs?.[0]?._name });
    }
  }
  return { mapSize: mm.size, mapNames: [...mm.values()].map((i) => i.name).sort(), out };
}), null, 1));
await b.close();
