// Differential check: original glpk-canonicalization cell functions vs this port, on one mathjs instance.
// Run: bun ports/glpk-canonicalization/differential.ts [--bench]
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LE = "/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment";
const SRC = "/Users/tom.larkworthy/dev/lopecode-dev/modules/@tomlarkworthy/glpk-canonicalization.js";
const P = await import(`${LE}/prelude.runtime.ts`);
Object.assign(globalThis, { mut: P.mut, freeze: P.freeze, ref: P.ref, action: P.action, equals: P.equals });
const src = readFileSync(SRC, "utf8");
const body = src.slice(0, src.indexOf("export default function define"));
const ids = [...body.matchAll(/^const (_\w+) = /gm)].map((m) => m[1]);
const ORIG = join(mkdtempSync(join(tmpdir(), "glpk-")), "orig.mjs");
writeFileSync(ORIG, body + `\nexport { ${ids.join(", ")} };\n`);
const O: Record<string, any> = await import(ORIG);
const C: Record<string, any> = await import(`${LE}/ports/glpk-canonicalization/cells.ts`);
const F: Record<string, any> = (await import(`${LE}/ports/glpk-canonicalization/foreign.runtime.ts`)).default;
const math = F.math;

// cell name -> original function, from the define() section
const byName: Record<string, (...a: any[]) => any> = {};
const deps: Record<string, string[]> = {};
for (const m of src.matchAll(/\$def\("(\w+)", "([^"]+)", (\[[^\]]*\]), \1\)/g)) {
  byName[m[2]] = O[m[1]];
  deps[m[2]] = JSON.parse(m[3]);
}

// ---- the two graphs -------------------------------------------------------------------------
const oLogs: string[] = [], pLogs: string[] = [];
function buildOrig(DEBUG: boolean) {
  const v: Record<string, any> = { math, DEBUG };
  const get = (n: string): any => {
    if (n in v) return v[n];
    return (v[n] = byName[n](...deps[n].map(get)));
  };
  return get;
}
function buildPort(DEBUG: boolean) {
  const v: Record<string, any> = { math, DEBUG, OperatorNode: F.OperatorNode, ConstantNode: F.ConstantNode, log: (...a: unknown[]) => pLogs.push(a.join(" ")) };
  const params = (f: Function) => {
    const s = f.toString();
    const m = s.match(/^\s*(?:async\s*)?(?:function\*?\s*\w*\s*)?\(([^)]*)\)/);
    return m ? m[1].split(",").map((x) => x.trim().split(/[\s:]/)[0]).filter(Boolean) : [];
  };
  const get = (n: string): any => {
    if (n in v) return v[n];
    return (v[n] = C[n](...params(C[n]).map(get)));
  };
  return get;
}
const o = buildOrig(false), p = buildPort(false);

// ---- comparison -----------------------------------------------------------------------------
const show = (x: unknown): string => {
  if (x && typeof x === "object" && "isNode" in x) return "node:" + String(x);
  if (typeof x === "function") return "fn";
  return JSON.stringify(x, (_k, y) => (y && typeof y === "object" && "isNode" in y ? "node:" + String(y) : Object.is(y, -0) ? "-0" : y));
};
const run = (f: () => unknown) => {
  try { return "ok:" + show(f()); } catch (e) { return "throw:" + (e as Error)?.message; }
};
let n = 0, bad = 0;
const diffs: string[] = [];
const counts: Record<string, number> = {};
function cmp(group: string, label: string, a: () => unknown, b: () => unknown) {
  n++;
  counts[group] = (counts[group] ?? 0) + 1;
  const x = run(a), y = run(b);
  if (x !== y) {
    bad++;
    diffs.push(`DIFF ${group} ${label}\n  orig ${x.slice(0, 240)}\n  port ${y.slice(0, 240)}`);
  }
}

// ---- inputs ---------------------------------------------------------------------------------
// every string literal in the original's test cells that parses
const testBodies = [...body.matchAll(/^const _\w+ = function _test_\w+\([^)]*\)[\s\S]*?\n\)?\};$/gm)].map((m) => m[0]);
const literals = new Set<string>();
for (const b of testBodies) for (const m of b.matchAll(/(["'])((?:(?!\1)[^\\\n])*)\1/g)) literals.add(m[2]);
const examples = [...literals].filter((s) => { try { math.parse(s); return /[<>=]|\d|[a-z]/.test(s); } catch { return false; } });

// seeded generator of linear (and some non-linear) comparisons
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
const VARS = ["x", "y", "z", "x1", "x2"];
const CONST = ["0", "1", "2", "3", "4", "5", "7", "1.5", "0.5", "10"];
function term(d: number): string {
  const r = rnd();
  if (d <= 0 || r < 0.25) return pick(CONST);
  if (r < 0.45) return pick(VARS);
  if (r < 0.6) return `${pick(CONST)} * ${pick(VARS)}`;
  if (r < 0.67) return `${pick(CONST)}${pick(VARS)}`;
  if (r < 0.77) return `-${term(d - 1)}`;
  if (r < 0.9) return `(${expr(d - 1)})`;
  if (r < 0.97) return `${term(d - 1)} * ${pick(CONST)}`;
  return `${pick(VARS)} * ${pick(VARS)}`; // non-linear
}
function expr(d: number): string {
  let s = term(d);
  const k = Math.floor(rnd() * 3);
  for (let i = 0; i < k; i++) s += ` ${pick(["+", "-"])} ${term(d)}`;
  return s;
}
const OPS = ["<", "<=", ">", ">=", "=="];
const generated: string[] = [];
for (let i = 0; i < 260; i++) generated.push(`${expr(2)} ${pick(OPS)} ${expr(2)}`);
// outside the module's domain: non-comparisons, function calls, strings, booleans, parenthesised comparisons
const odd = ["x", "5", "x + 1", "2x", "f(x) < 1", "x < unaryMinus(y)", "x < unaryMinus(3) * y", "(x < 1)", "(x + 1 < 2)",
  "x != 1", "x < y < z", "\"a\" < x", "true < x", "2 * \"3\" x <= 1", "x < -y", "-(-(-x)) < 2", "x ^ 2 < 1", "x / 2 < 1",
  "0 == 0", "-0 <= x", "x <= -0", "1e3 x >= 2", "x < 3 % 2", "x * 0 < 0", "sqrt(4) x < 1", "",
  "f(x)", "sqrt(4)", "unaryMinus(x)", "\"3\" * x <= 1", "true * x <= 1", "x < unaryMinus()", "x < unaryMinus(y, z)"];
const all = [...examples, ...generated, ...odd];
const parse = (s: string) => math.parse(s);

// ---- data cells -----------------------------------------------------------------------------
for (const c of ["ordering", "expandBrackets", "complexityToLHS"]) cmp("data", c, () => o(c), () => p(c));
cmp("data", "_70", () => O._1mmg8hg(math), () => p("_70"));
cmp("data", "multiplyOut identity", () => o("multiplyOut").map((f: unknown, i: number) => f === p("multiplyOut")[i]), () => p("multiplyOut").map(() => true));
cmp("data", "simplify2 identity", () => o("simplify2").length + ":" + o("simplify2").every((r: unknown, i: number) => r === p("simplify2")[i]), () => p("simplify2").length + ":true");
cmp("data", "constantsToRHS length", () => o("constantsToRHS").length, () => p("constantsToRHS").length);

// ---- every test: own deps, and crossed ------------------------------------------------------
const tests = Object.keys(byName).filter((k) => k.startsWith("test_"));
for (const t of tests) {
  const pf = C[t];
  const pparams = pf.toString().match(/^\(([^)]*)\)/)[1].split(",").map((x: string) => x.trim()).filter(Boolean);
  cmp("tests", `${t} own deps`, () => byName[t](...deps[t].map(o)), () => pf(...pparams.map(p)));
  cmp("tests", `${t} orig body on port deps`, () => byName[t](...deps[t].map(o)), () => byName[t](...deps[t].map(p)));
  cmp("tests", `${t} port body on orig deps`, () => byName[t](...deps[t].map(o)), () => pf(...pparams.map(o)));
}

// ---- functions over inputs ------------------------------------------------------------------
const ruleSets = ["ordering", "expandBrackets", "multiplyOut", "constantsToRHS", "complexityToLHS", "simplify2"];
for (const s of all) {
  for (const r of ruleSets) cmp(`check(${r})`, s, () => o("check")(o(r), s, ""), () => p("check")(p(r), s, ""));
  cmp("addZeroToRHS(string)", s, () => o("addZeroToRHS")(s), () => p("addZeroToRHS")(s));
  cmp("step2(string)", s, () => o("step2")(s), () => p("step2")(s));
  cmp("canonicalize", s, () => o("canonicalize")(s), () => p("canonicalize")(s));
  cmp("extract", s, () => o("extract")(s), () => p("extract")(s));
  let node: any;
  try { node = parse(s); } catch { continue; }
  cmp("simplifyStep", s, () => o("simplifyStep")(parse(s)), () => p("simplifyStep")(parse(s)));
  cmp("checkStep(addZeroToRHS)", s, () => o("checkStep")(o("addZeroToRHS"), s, ""), () => p("checkStep")(p("addZeroToRHS"), s, ""));
  cmp("constantsToRHSFn", s, () => o("constantsToRHSFn")(parse(s)), () => p("constantsToRHSFn")(parse(s)));
  cmp("isCanonical", s, () => o("isCanonical")(parse(s)), () => p("isCanonical")(parse(s)));
  for (const op of [{ op: "<", fn: "smaller" }, { op: ">=", fn: "largerEq" }]) {
    cmp("withOperator", `${s} ${op.op}`, () => o("withOperator")(parse(s), op), () => p("withOperator")(parse(s), op));
    cmp("isCanonical(withOperator)", `${s} ${op.op}`, () => o("isCanonical")(o("withOperator")(parse(s), op)), () => p("isCanonical")(p("withOperator")(parse(s), op)));
  }
  if (node.isOperatorNode && node.args.length === 2) {
    cmp("extractLHS", s, () => o("extractLHS")([], parse(s).args[0]), () => p("extractLHS")([], parse(s).args[0]));
    for (const op of ["<=", ">=", "==", "<"]) cmp("extractRHS", `${op} ${s}`, () => o("extractRHS")(op, parse(s).args[1]), () => p("extractRHS")(op, parse(s).args[1]));
  }
}

// ---- does the original mutate nodes it is given? run it on deep-frozen inputs ----------------
const deepFreeze = (x: any, seen = new Set()): any => {
  if (!x || typeof x !== "object" || seen.has(x)) return x;
  seen.add(x);
  for (const k of Object.keys(x)) deepFreeze(x[k], seen);
  return Object.freeze(x);
};
let frozenRuns = 0, frozenDiffer = 0;
const frozenFns: [string, (n: any) => unknown][] = [
  ["constantsToRHSFn", (n) => o("constantsToRHSFn")(n)], ["addZeroToRHS", (n) => o("addZeroToRHS")(n)],
  ["simplifyStep", (n) => o("simplifyStep")(n)], ["step2", (n) => o("step2")(n)], ["isCanonical", (n) => o("isCanonical")(n)],
  ["withOperator", (n) => o("withOperator")(n, { op: "<", fn: "smaller" })],
  ["extractLHS", (n) => (n.isOperatorNode ? o("extractLHS")([], n.args[0]) : null)],
];
const frozenDiffs: string[] = [];
for (const s of all) {
  let ok = true;
  try { parse(s); } catch { ok = false; }
  if (!ok) continue;
  for (const [name, f] of frozenFns) {
    frozenRuns++;
    const a = run(() => f(parse(s))), b = run(() => f(deepFreeze(parse(s))));
    if (a !== b) { frozenDiffer++; frozenDiffs.push(`${name} ${s}\n  plain  ${a.slice(0, 160)}\n  frozen ${b.slice(0, 160)}`); }
  }
}

// ---- DEBUG = true: same results, same log lines ----------------------------------------------
{
  const oLog: string[] = [];
  const realLog = console.log;
  const od = buildOrig(true), pd = buildPort(true);
  for (const s of examples.slice(0, 40)) {
    console.log = (...a: unknown[]) => oLog.push(a.join(" "));
    let x: string;
    try { x = run(() => od("step2")(s)); } finally { console.log = realLog; }
    const y = run(() => pd("step2")(s));
    n++; counts["step2 DEBUG"] = (counts["step2 DEBUG"] ?? 0) + 1;
    if (x !== y) { bad++; diffs.push(`DIFF step2 DEBUG ${s}\n  orig ${x}\n  port ${y}`); }
  }
  n++; counts["step2 DEBUG log lines"] = 1;
  if (oLog.join("\n") !== pLogs.join("\n")) { bad++; diffs.push(`DIFF DEBUG log lines: orig ${oLog.length} lines, port ${pLogs.length} lines`); }
}

for (const d of diffs) console.log(d);
console.log(`\ninputs: ${examples.length} literals from the original's tests, ${generated.length} generated, ${odd.length} outside the domain`);
console.log("comparisons per group:", JSON.stringify(counts));
console.log(`frozen-input runs of the original: ${frozenRuns}, results differing from unfrozen: ${frozenDiffer}`);
for (const d of frozenDiffs.slice(0, 10)) console.log("FROZEN " + d);
console.log(`${n} comparisons, ${bad} differ`);

// ---- timing: canonicalize over the canonicalize test inputs ----------------------------------
if (process.argv.includes("--bench")) {
  const inputs = tests.filter((t) => t.startsWith("test_canonicalize_") && t !== "test_canonicalize_scale_10k")
    .map((t) => body.match(new RegExp(`function _${t}\\(canonicalExample\\)\\{return\\(\\ncanonicalExample\\((['"])(.*?)\\1`))![2]);
  const time = (f: (s: string) => unknown) => {
    const xs: number[] = [];
    for (let r = 0; r < 200; r++) {
      const t0 = performance.now();
      for (const s of inputs) f(s);
      xs.push(performance.now() - t0);
    }
    xs.sort((a, b) => a - b);
    return xs[100];
  };
  for (let w = 0; w < 20; w++) for (const s of inputs) { o("canonicalize")(s); p("canonicalize")(s); }
  const a1 = time(o("canonicalize")), b1 = time(p("canonicalize")), a2 = time(o("canonicalize")), b2 = time(p("canonicalize"));
  console.log(`bench canonicalize over ${inputs.length} inputs, 200 passes, median ms per pass: original ${a1.toFixed(3)} / ${a2.toFixed(3)}, port ${b1.toFixed(3)} / ${b2.toFixed(3)} (two interleaved rounds)`);
  const big = Array.from({ length: 10000 }, (_, i) => `x${i}`).join(" + ") + " > 0";
  const timeBig = (f: (s: string) => unknown) => { const xs: number[] = []; for (let r = 0; r < 21; r++) { const t0 = performance.now(); f(big); xs.push(performance.now() - t0); } xs.sort((a, b) => a - b); return xs[10]; };
  console.log(`bench canonicalize 10k-term input, 21 runs, median ms: original ${timeBig(o("canonicalize")).toFixed(2)}, port ${timeBig(p("canonicalize")).toFixed(2)}`);
}
