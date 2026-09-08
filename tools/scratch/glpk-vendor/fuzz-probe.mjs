// Dry-run the property before shipping it as a notebook test.
// The generator mirrors @tomlarkworthy/expression-fuzzer, where the test will live.
import { importNotebookModule } from '../../notebook-import.ts';
const S = process.env.S;
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const math = require(S + '/math15.cjs');
const m = await importNotebookModule('modules/@tomlarkworthy/glpk-canonicalization.js', {
  overrides: { math, DEBUG: false, Generators: { input: () => (function* () {})() }, Inputs: { toggle: () => ({}) } }
});
const extract = await m.value('extract');

const mulberry32 = (a) => () => {
  let t = (a += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const testRules = {
  C: [['EN', 'OP', 'EN']],
  EN: [['I'], ['V'], ['I'], ['V'], ['MN', '*', 'M'], ['M', '*', 'MN'], ['EN', '+', 'EN']],
  E: [['I'], ['I'], ['I'], ['M', '*', 'M'], ['E', '+', 'E']],
  MN: [['I'], ['V'], ['I'], ['V'], ['M', '*', 'M'], ['(', 'EN', '+', 'EN', ')']],
  M: [['I'], ['I'], ['I'], ['M', '*', 'M'], ['(', 'E', '+', 'E', ')']],
  V: [['x'], ['y']],
  I: [['-2'], ['-1'], ['0'], ['1'], ['2']],
  OP: [['<='], ['=='], ['>=']]
};
const sample = (symbol, rules, rng, maxDepth = 100) => {
  if (maxDepth === 0) throw new Error('max depth reached');
  const options = rules[symbol];
  if (!options) return symbol;
  return options[Math.floor(rng() * options.length)].map((c) => sample(c, rules, rng, maxDepth - 1));
};
const traverse = (t) => (Array.isArray(t) ? t.map(traverse).join('') : t);

const N = Number(process.argv[2] ?? 300);
const t0 = Date.now();
let checked = 0, skipped = 0;
const fails = [];
for (let seed = 0; seed < N; seed++) {
  let expression;
  try { expression = traverse(sample('C', testRules, mulberry32(seed))); }
  catch { skipped++; continue; }
  if (!expression.includes('x') && !expression.includes('y')) { skipped++; continue; }
  try {
    const { vars, bounds } = extract(expression);
    const names = vars.map((v) => v.name);
    if (new Set(names).size !== names.length) throw new Error(`duplicate variable: ${JSON.stringify(vars)}`);
    for (const { coef, name } of vars) {
      if (!Number.isFinite(coef)) throw new Error(`coef not finite: ${coef}`);
      if (typeof name !== 'string') throw new Error(`name not a string: ${name}`);
    }
    for (const [k, v] of Object.entries(bounds))
      if (!Number.isFinite(v)) throw new Error(`bound ${k} not finite: ${v}`);
    for (const [x, y] of [[0, 0], [1, -1], [-3, 2], [7, 5]]) {
      const expected = math.evaluate(expression, { x, y });
      const lhs = vars.reduce((a, { coef, name }) => a + coef * ({ x, y })[name], 0);
      const actual =
        (bounds.upper === undefined || lhs <= bounds.upper + 1e-9) &&
        (bounds.lower === undefined || lhs >= bounds.lower - 1e-9);
      if (expected !== actual)
        throw new Error(`at x=${x},y=${y} expected ${expected}, canonical form says ${actual}`);
    }
    checked++;
  } catch (err) { fails.push([seed, expression, err.message]); }
}
console.log(`${N} seeds: ${checked} checked, ${skipped} skipped, ${fails.length} failed, ${Date.now() - t0} ms`);
for (const [seed, e, msg] of fails.slice(0, 8)) console.log(`  seed ${seed}: ${e}\n    ${msg}`);
