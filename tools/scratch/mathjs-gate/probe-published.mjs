// Boot a published Observable module in a bare runtime and report per-cell errors.
import { Runtime } from '@observablehq/runtime';
const slug = process.argv[2];
const define = (await import(`https://api.observablehq.com/${slug}.js?v=4`)).default;
const errors = [], ok = new Set();
const rt = new Runtime();
rt.module(define, (name) => ({
  pending() {},
  fulfilled() { if (name) ok.add(name); },
  rejected(e) { errors.push(`${name}: ${e?.message ?? e}`); }
}));
await new Promise((r) => setTimeout(r, 20000));
console.log(`${slug}: ${ok.size} fulfilled, ${errors.length} rejected`);
for (const e of errors.slice(0, 25)) console.log('  ' + e);
process.exit(0);
