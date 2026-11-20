// Outbound direction: Observable JavaScript calling functions that SoundScript cells return.
// Run: bun tools/lang-experiment/outbound/outbound.ts   (prints observations; exit 1 only on a harness error)
// Modules are built as lite/stdlib/runtime.test.ts `load` builds them: compiled by the toolchain, every variable observed.
(globalThis as any).requestAnimationFrame = (f: () => void) => void setTimeout(f, 1);
const ss = await import("../lite/stdlib/runtime.ts");
const P = await import("../prelude.runtime.ts");
const T = await import("../lite/toolchain/ss-toolchain.ts");
const { Runtime } = await import("@observablehq/runtime");

const tick = () => new Promise((r) => setTimeout(r, 0));
// settled: nothing left to commit, runtime not computing; counted in turns, not milliseconds
async function settle(runtime: any) {
  let quiet = 0;
  for (let i = 0; i < 2000 && quiet < 5; i++) { await tick(); quiet = P.idle() && !runtime._computing ? quiet + 1 : 0; }
}
type Outside = Record<string, [string[], (...a: any[]) => unknown] | { from: any }>;
async function load(src: string, outside: Outside = {}, opts: { unchecked?: boolean; runtime?: any } = {}) {
  const runtime = opts.runtime ?? new Runtime();
  const m = runtime.module();
  m.define("ss", [], () => ss);
  const values = new Map<string, unknown>(), errs = new Map<string, string>(), runs = new Map<string, number>();
  const observer = (n: string) => ({
    fulfilled: (x: unknown) => { values.set(n, x); errs.delete(n); runs.set(n, (runs.get(n) ?? 0) + 1); },
    rejected: (e: unknown) => { errs.set(n, (e as Error)?.message ?? String(e)); },
  });
  for (const [n, x] of Object.entries(outside)) {
    if (Array.isArray(x)) m.variable(observer(n)).define(n, x[0], x[1]);
    else m.variable(observer(n)).import(n, x.from);
  }
  const list = Object.keys(outside).filter((n) => !n.startsWith("viewof ")).map((n) => ({ name: n, view: !!outside[`viewof ${n}`] }));
  const texts = T.splitCells(src, true);
  const checked = ss.checkCells(texts, true, list).result;
  const verdicts = checked.cells.map((c: any) => `${c.name}:${c.status}${c.errors.length ? " " + c.errors.map((e: any) => `[${e.rule}] ${e.msg}`).join("; ") : ""}`);
  const ctx = T.contextFromCheck(checked);
  const now = opts.unchecked ? { ...ctx, accepted: new Set(texts.map((t) => ss.declaredName(t)!)), why: null } : ctx;
  for (const t of texts) for (const d of T.compileCell(t, true, now)) m.variable(observer(d.name)).define(d.name, d.inputs, (0, eval)(`(${d.definition})`));
  await settle(runtime);
  return { runtime, m, values, errs, runs, verdicts, v: (n: string) => values.get(n) as any, js: (name: string, ins: string[], f: (...a: any[]) => unknown) => m.variable(observer(name)).define(name, ins, f) };
}
const rows: [string, string][] = [];
const note = (c: string, s: string) => { rows.push([c, s]); console.log(`${c}: ${s}`); };
const show = (x: unknown) => { if (typeof x === "number" || x === undefined) return String(x); try { return JSON.stringify(x); } catch { return String(x); } };

// a. same module
{
  const L = await load("const double = () => (n: number): number => n * 2;");
  L.js("r", ["double"], (double) => double(21));
  await settle(L.runtime);
  note("a", `${L.verdicts}; r = ${show(L.v("r"))} err=${L.errs.get("r") ?? "none"}`);
}

// b. another plain-JS module imports double with module.import
{
  const L = await load("const double = () => (n: number): number => n * 2;");
  const m2 = L.runtime.module();
  let got: unknown, err: unknown;
  m2.import("double", L.m);
  m2.variable({ fulfilled: (x: unknown) => (got = x), rejected: (e: any) => (err = e?.message) }).define("r", ["double"], (d: any) => d(21));
  await settle(L.runtime);
  note("b", `r = ${show(got)} err=${err ?? "none"}`);
}

// c. object/array in and out
{
  const L = await load(`type Sum = { readonly total: number; readonly xs: readonly number[] };
const summarise = () => (xs: readonly number[]): Sum => ({ total: xs.reduce((a, x) => a + x, 0), xs });
const scaleAll = () => (xs: readonly number[]): readonly number[] => xs.map((x) => x * 2);
const double = () => (n: number): number => n * 2;
const label = () => (p: { readonly name: string }): string => "hi " + p.name;`);
  const summarise = L.v("summarise"), scaleAll = L.v("scaleAll"), double = L.v("double"), label = L.v("label");
  const input = [1, 2, 3];
  const out = summarise(input);
  const sameRef = out.xs === input;
  const frozen = [Object.isFrozen(out), Object.isFrozen(out.xs), Object.isFrozen(scaleAll(input)), Object.isFrozen(summarise)];
  input.push(10);
  note("c1 summarise([1,2,3]) then caller pushes 10", `out=${show(out)} out.xs===input:${sameRef}; frozen(out,out.xs,scaleAll result,fn)=${frozen}; input frozen after call: ${Object.isFrozen(input)}`);
  let mut: string;
  try { (out as any).total = 99; out.xs.push(5); mut = `caller can write the result: total=${out.total}, xs=${show(out.xs)}`; } catch (e) { mut = `writing result threw ${(e as Error).message}`; }
  note("c2 caller mutates returned object", mut);
  const wrong: string[] = [];
  for (const [f, a, n] of [[double, "abc", "double(\"abc\")"], [double, "4", "double(\"4\")"], [double, undefined, "double()"], [summarise, "123", "summarise(\"123\")"], [summarise, null, "summarise(null)"], [label, {}, "label({})"], [label, 7, "label(7)"]] as const) {
    try { wrong.push(`${n} -> ${show((f as any)(a))}`); } catch (e) { wrong.push(`${n} -> threw ${(e as Error).constructor.name}: ${(e as Error).message}`); }
  }
  note("c3 wrong-typed args", wrong.join("; "));
}

// d. function-valued cell over a state cell, consumed by JS
{
  const L = await load(`const factor = (): StateCell<number> => state(2);
const scaled = (factor: number) => (n: number): number => n * factor;
const setFactor = (factor: State<number>) => action((k: number) => factor.set(k));`);
  let jsRuns = 0;
  L.js("r", ["scaled"], (scaled) => { jsRuns++; return scaled(10); });
  await settle(L.runtime);
  const before = [L.v("r"), jsRuns];
  const f0 = L.v("scaled");
  L.v("setFactor")(5);
  const immediately = L.v("r");
  await settle(L.runtime);
  note("d", `${L.verdicts}; r before=${before[0]} (js runs ${before[1]}); right after setFactor(5): r=${immediately}; after commit: r=${L.v("r")} (js runs ${jsRuns}); new function object: ${L.v("scaled") !== f0}; old function still gives ${f0(10)}`);
}

// e. action called from JS: during evaluation, and later as a plain call
{
  const L = await load(`const count = (): StateCell<number> => state(0);
const inc = (count: State<number>) => action(() => count.update((c) => c + 1));
const shown = (count: number) => count;`);
  let during: string = "";
  L.js("r", ["inc"], (inc) => { try { const x = inc(); during = `returned ${show(x)}, count inside eval=${L.v("count")}`; } catch (e) { during = `threw ${(e as Error).message}`; } return 1; });
  await settle(L.runtime);
  note("e1 inc() inside a JS variable's evaluation", `${during}; after settle count=${L.v("count")}, shown=${L.v("shown")}, r runs=${L.runs.get("r")}`);
  const inc = L.v("inc");
  const ret = inc();
  const q = { running: P.rt.call !== null };
  const right = L.v("count");
  await settle(L.runtime);
  note("e2 inc() later, no call in flight", `returned ${show(ret)}; queue right after ${show(q)}; count right after=${right}; after settle count=${L.v("count")}, shown=${L.v("shown")}`);
  // and inside a SoundScript cell evaluation, for contrast: a JS function passed through a JS variable cannot be called by SS, so call inc from a JS variable that runs while an SS cell is mid-evaluation is not constructible; skip
  // two plain calls back to back
  inc(); inc();
  const q2 = { running: P.rt.call !== null };
  await settle(L.runtime);
  note("e3 inc(); inc() back to back", `queue after second call ${show(q2)}; after settle count=${L.v("count")}`);
  // inc called inside an Observable generator step (a JS generator variable)
  L.js("g", ["inc"], function* (inc) { try { inc(); yield "called"; } catch (e) { yield `threw ${(e as Error).message}`; } });
  await settle(L.runtime);
  note("e4 inc() inside a JS generator step", `g=${L.v("g")}, count=${L.v("count")}`);
}

// f. a second SoundScript module importing double from the first
{
  const A = await load("const double = () => (n: number): number => n * 2;");
  const srcs: [string, string][] = [
    ["typed fn", "const quad = (double: (n: number) => number) => (n: number): number => double(double(n));"],
    ["unannotated", "const quad = (double) => (n: number): number => double(double(n));"],
    ["unknown", "const quad = (double: unknown) => 1;"],
  ];
  for (const [label, src] of srcs) {
    const B = await load(src, { double: { from: A.m } }, { runtime: A.runtime });
    let ran = "n/a";
    if (label !== "unknown") {
      const U = await load(src, { double: { from: A.m } }, { runtime: A.runtime, unchecked: true });
      ran = U.errs.get("quad") ? `error ${U.errs.get("quad")}` : `quad(3)=${show(U.v("quad")?.(3))}`;
    }
    note(`f ${label}`, `check: ${B.verdicts}; checked run: ${B.errs.get("quad") ?? show(B.v("quad"))}; check bypassed: ${ran}`);
  }
}
console.log("\n| case | observed |\n|---|---|");
for (const [c, s] of rows) console.log(`| ${c} | ${s.replace(/\|/g, "\\|")} |`);
process.exit(0);
