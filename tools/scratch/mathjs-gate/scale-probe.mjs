// Time canonicalize() against term count. Reuses the notebook's own cells.
import { importNotebookModule } from '../../notebook-import.ts';
const S = process.env.S;
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const math = require(S + '/math15.cjs');
const m = await importNotebookModule('modules/@tomlarkworthy/glpk-canonicalization.js', {
  overrides: { math, DEBUG: false, Generators: { input: () => (function* () {})() }, useConstantsToRHSFn: process.env.UC === "1" }
});
const canonicalize = await m.value('canonicalize');
for (const n of [10, 100, 300, 1000, 3000]) {
  const terms = Array.from({ length: n }).map((_, i) => `x${i}`).join(' + ');
  let t = Date.now();
  const c = canonicalize(terms + ' > 0');
  const tc = Date.now() - t;
  t = Date.now();
  const s = c.toString();
  console.log(`n=${n}\tcanonicalize ${tc} ms\ttoString ${Date.now() - t} ms\tlen ${s.length}`);
}
