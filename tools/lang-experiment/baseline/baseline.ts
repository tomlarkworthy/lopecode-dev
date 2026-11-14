#!/usr/bin/env bun
// Test baseline for one lopecode module, headless, in one variable-definition order.
//   bun tools/lang-experiment/baseline/baseline.ts <module.js> forward|reverse [--timeout ms]
// Writes tools/lang-experiment/baseline/<module>.<order>.json and prints a summary.
//
// The module's define() runs against a recording runtime; the recorded variables are then
// replayed onto a real @observablehq/runtime in file order or reversed. Import bindings are
// replaced at replay: by a supplied value, or by a definition that throws "blocked: <name>".
// Every name the module reads but does not define is either supplied (SUPPLIED) or blocked.

import { Runtime } from "@observablehq/runtime";
import { Window } from "happy-dom";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const STD = resolve(ROOT, "vendor/observable-stdlib/src");

const args = process.argv.slice(2);
const file = args[0];
const order = args[1];
const tIdx = args.indexOf("--timeout");
const TIMEOUT = tIdx >= 0 ? Number(args[tIdx + 1]) : 10_000;
if (!file || (order !== "forward" && order !== "reverse")) {
  console.error("usage: baseline.ts <module.js> forward|reverse [--timeout ms]");
  process.exit(1);
}
const moduleSlug = basename(file, ".js");

// Harness-set cell values (same in both orders), declared in the output.
const OVERRIDES: Record<string, Record<string, { value: unknown; why: string }>> = {
  suminagashi: {
    runTests: { value: true, why: "viewof runTests is a UI toggle, default false; every test returns 'not run' when it is false" },
  },
};

// ---- DOM (happy-dom) for Inputs and location ------------------------------------------
const win = new Window({ url: `file:///lopecode/notebooks/${moduleSlug}.html` });
for (const k of ["document", "window", "Node", "NodeFilter", "Element", "HTMLElement", "HTMLInputElement",
  "HTMLFormElement", "HTMLSelectElement", "HTMLTextAreaElement", "HTMLButtonElement", "DocumentFragment",
  "Event", "CustomEvent", "InputEvent", "MutationObserver", "getComputedStyle", "customElements", "HTMLTemplateElement", "SVGElement", "Text", "Comment"]) {
  if ((globalThis as any)[k] === undefined && (win as any)[k] !== undefined) {
    const v = (win as any)[k];
    (globalThis as any)[k] = k === "window" ? win : typeof v === "function" && !Object.hasOwn(v, "prototype") ? v.bind(win) : v;
  }
}

// ---- supplied externals ----------------------------------------------------------------
const { Mutable } = await import(STD + "/mutable.js");
const Generators = { ...(await import(STD + "/generators/index.js")) };
const Promises = { ...(await import(STD + "/promises/index.js")) };
const Inputs = await import("@observablehq/inputs");
const mathSrc = readFileSync(resolve(HERE, "node_modules/mathjs/lib/browser/math.js"), "utf8");
const mathMod: any = { exports: {} };
new Function("module", "exports", mathSrc)(mathMod, mathMod.exports); // as @tomlarkworthy/mathjs _math does
const math = mathMod.exports;
if (math.version !== "15.2.0") throw new Error(`mathjs ${math.version}, expected 15.2.0`);

const SUPPLIED: Record<string, { value: unknown; source: string }> = {
  Generators: { value: Generators, source: "vendor/observable-stdlib/src/generators" },
  Promises: { value: Promises, source: "vendor/observable-stdlib/src/promises" },
  Mutable: { value: Mutable, source: "vendor/observable-stdlib/src/mutable.js" },
  Inputs: { value: Inputs, source: "npm @observablehq/inputs 0.12.0 on happy-dom" },
  location: { value: win.location, source: `happy-dom window.location (${win.location.href})` },
  math: { value: math, source: "npm mathjs 15.2.0 lib/browser/math.js, evaluated as @tomlarkworthy/mathjs _math does" },
};
const RUNTIME_INTRINSIC = new Set(["@variable", "invalidation", "visibility"]);

// ---- record define() -------------------------------------------------------------------
type Rec = { name: string | null; inputs: string[]; fn: Function; via: "variable" | "define" };
const recs: Rec[] = [];
const builtinsDeclared: string[] = [];
function norm(a: any[]): [string | null, string[], Function] {
  if (a.length === 1) return [null, [], a[0]];
  if (a.length === 2) return typeof a[0] === "string" || a[0] == null ? [a[0] ?? null, [], a[1]] : [null, a[0], a[1]];
  return [a[0] ?? null, a[1] ?? [], a[2]];
}
const recorder = {
  variable(_obs?: unknown) {
    return { define: (...a: any[]) => { const [name, inputs, fn] = norm(a); recs.push({ name, inputs, fn, via: "variable" }); return {}; } };
  },
  define(...a: any[]) { const [name, inputs, fn] = norm(a); recs.push({ name, inputs, fn, via: "define" }); return {}; },
  builtin(name: string) { builtinsDeclared.push(name); },
};
const fakeRuntime = { module: () => recorder, fileAttachments: () => () => { throw new Error("FileAttachment not supplied"); } };
const ns = await import(pathToFileURL(resolve(file)).href);
ns.default(fakeRuntime, (name: string | null) => name);

// ---- static analysis of the define section ---------------------------------------------
const isModuleVar = (r: Rec) => !!r.name && r.name.startsWith("module ");
const isImport = (r: Rec) => r.inputs.length === 2 && r.inputs[0].startsWith("module ") && r.inputs[1] === "@variable";
const byName = new Map<string, Rec>();
for (const r of recs) if (r.name) byName.set(r.name, r);
const names = recs.map((r) => r.name).filter(Boolean) as string[];
const tests = names.filter((n) => n.startsWith("test_"));
const has = (n: string) => byName.has(n);
const derived = (n: string) => has("viewof " + n) || has("mutable " + n) || (n.startsWith("initial ") && has("mutable " + n.slice(8)));
const src = readFileSync(file, "utf8");
const defineSection = src.slice(src.indexOf("export default function define"));
const stats = {
  variables: recs.length,
  viewof: names.filter((n) => n.startsWith("viewof ")).length,
  mutable: names.filter((n) => n.startsWith("mutable ")).length,
  initial: names.filter((n) => n.startsWith("initial ")).length,
  importBindings: recs.filter(isImport).map((r) => r.name),
  moduleVariables: recs.filter(isModuleVar).map((r) => r.name),
  anonymous: recs.filter((r) => !r.name).length,
  tests: tests.length,
  nonTestNamedCells: recs.filter((r) => r.name && !r.name.startsWith("test_") && !isImport(r) && !isModuleVar(r) && !derived(r.name)).map((r) => r.name),
  builtinsDeclaredByModule: builtinsDeclared,
  grepCheck: {
    $def: (defineSection.match(/^\s*\$def\(/gm) ?? []).length,
    mainDefine: (defineSection.match(/^\s*main\.define\(/gm) ?? []).length,
  },
};

const externals = new Set<string>();
for (const r of recs) for (const i of r.inputs) if (!has(i)) externals.add(i);
function support(t: string) {
  const seen = new Set<string>(), ext = new Set<string>();
  const stack = [...byName.get(t)!.inputs];
  while (stack.length) {
    const n = stack.pop()!;
    if (!has(n)) { ext.add(n); continue; }
    if (seen.has(n)) continue;
    seen.add(n);
    stack.push(...byName.get(n)!.inputs);
  }
  return { inModule: [...seen].sort(), external: [...ext].sort() };
}
const unsupplied = (n: string) => !(n in SUPPLIED) && !RUNTIME_INTRINSIC.has(n);
const blockedNames = new Set<string>([...externals].filter((n) => !n.startsWith("module ") && unsupplied(n)));
for (const r of recs) if (isImport(r) && unsupplied(r.name!)) blockedNames.add(r.name!);

// ---- replay ----------------------------------------------------------------------------
class Blocked extends Error {}
const builtins: Record<string, () => unknown> = {};
for (const n of externals) {
  if (n in SUPPLIED) builtins[n] = () => SUPPLIED[n].value;
  else if (!RUNTIME_INTRINSIC.has(n) && !n.startsWith("module ")) builtins[n] = () => { throw new Blocked(`blocked: ${n}`); };
}
const globalLookups: string[] = [];
const rt = new Runtime(builtins, (n: string) => { globalLookups.push(n); return undefined; });
const main = rt.module();

type Result = { status: "pass" | "fail" | "blocked" | "timeout"; value?: string; message?: string; blockedBy?: string; rejectedInput?: string; ms?: number; laterSettles?: number };
const results: Record<string, Result> = {};
const t0 = performance.now();
const show = (v: unknown) => { try { return (typeof v === "string" ? v : typeof v === "function" ? "[function]" : JSON.stringify(v) ?? String(v)).slice(0, 200); } catch { return String(v).slice(0, 200); } };
const observerFor = (name: string) => ({
  fulfilled(v: unknown) {
    if (results[name]) { results[name].laterSettles = (results[name].laterSettles ?? 0) + 1; return; }
    results[name] = { status: "pass", value: show(v), ms: Math.round(performance.now() - t0) };
  },
  rejected(e: any) {
    if (results[name]) { results[name].laterSettles = (results[name].laterSettles ?? 0) + 1; return; }
    const msg = String(e?.message ?? e);
    const m = msg.match(/^blocked: (.+)$/);
    results[name] = m
      ? { status: "blocked", blockedBy: m[1], rejectedInput: e?.input, ms: Math.round(performance.now() - t0) }
      : { status: "fail", message: msg.slice(0, 200), rejectedInput: e?.input, ms: Math.round(performance.now() - t0) };
  },
});

const overrides = OVERRIDES[moduleSlug] ?? {};
const plan = recs.filter((r) => !isModuleVar(r));
if (order === "reverse") plan.reverse();
for (const r of plan) {
  let inputs = r.inputs, fn: Function = r.fn;
  if (isImport(r)) {
    const n = r.name!;
    inputs = [];
    fn = n in SUPPLIED ? () => SUPPLIED[n].value : () => { throw new Blocked(`blocked: ${n}`); };
  } else if (r.name && r.name in overrides) {
    const v = overrides[r.name].value;
    inputs = []; fn = () => v;
  }
  const obs = r.name?.startsWith("test_") ? observerFor(r.name) : undefined;
  main.variable(obs).define(r.name, inputs, fn);
}

while (performance.now() - t0 < TIMEOUT && tests.some((t) => !results[t])) await new Promise((r) => setTimeout(r, 25));
for (const t of tests) if (!results[t]) results[t] = { status: "timeout" };
rt.dispose();

// ---- output ----------------------------------------------------------------------------
const counts = { pass: 0, fail: 0, blocked: 0, timeout: 0 };
for (const t of tests) counts[results[t].status]++;
const out = {
  module: moduleSlug,
  file,
  order,
  timeoutMs: TIMEOUT,
  timeoutSemantics: "wall clock from the first define of the replay; all tests run in one runtime",
  ranAt: new Date().toISOString(),
  counts,
  supplied: Object.fromEntries(Object.entries(SUPPLIED).filter(([n]) => externals.has(n) || byName.has(n)).map(([n, s]) => [n, s.source])),
  runtimeIntrinsic: [...RUNTIME_INTRINSIC].filter((n) => externals.has(n)),
  blocked: [...blockedNames].sort(),
  overrides: Object.fromEntries(Object.entries(overrides).map(([n, o]) => [n, { value: o.value, why: o.why }])),
  globalLookups,
  replayOrder: plan.map((r) => r.name ?? "(anonymous)"),
  stats,
  tests: Object.fromEntries(tests.map((t) => {
    const s = support(t);
    return [t, { ...results[t], support: s.inModule, externalInputs: s.external, staticBlockers: s.external.concat(s.inModule).filter((n) => blockedNames.has(n)) }];
  })),
};
const outPath = resolve(HERE, `${moduleSlug}.${order}.json`);
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");

console.log(`${moduleSlug} ${order}: pass ${counts.pass}  fail ${counts.fail}  blocked ${counts.blocked}  timeout ${counts.timeout}  (${tests.length} tests)  -> ${outPath}`);
for (const t of tests) {
  const r = results[t];
  const detail = r.status === "pass" ? r.value : r.status === "fail" ? r.message : r.status === "blocked" ? r.blockedBy : "";
  console.log(`  ${r.status.padEnd(7)} ${t}${r.ms != null ? ` (${r.ms}ms)` : ""}  ${String(detail ?? "").replace(/\s+/g, " ").slice(0, 120)}`);
}
await win.happyDOM.abort();
win.close();
process.exit(0);
