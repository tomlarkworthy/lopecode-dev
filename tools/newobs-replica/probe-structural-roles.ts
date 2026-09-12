// E1: is the glue catalogue closed, and can each entry be identified WITHOUT reading definition text?
//
// Every glue definition notebook-kit adds is created in vendor/notebook-kit/src/runtime/define.ts
// (99 lines) or by @observablehq/runtime itself (identity for imports, constant for builtins). So the
// catalogue is closed by construction for a given version; the open question is recognition. Minified
// bundles rename everything (`input` -> `Br`, `Mutator` -> `Jr`), so text matching tracks the bundle.
// This classifies by NAME, TYPE and INPUT NAMES only, and reports where cell-map-2's text-based
// defInfo disagrees.
//
// Part A: the live notebook-kit capture (runtime-dump-notebookkit.json).
// Part B: a headless fixture built with vendored define(), including display/view cells, which the
//         capture does not contain — to observe the shadow variables.
//
// run: bun tools/newobs-replica/probe-structural-roles.ts
import { Window } from "happy-dom";
import { Runtime } from "@observablehq/runtime";
import { importNotebookModule } from "../notebook-import.ts";
import { transpileJavaScript } from "../../vendor/notebook-kit/src/javascript/transpile.ts";
import { transpileObservable } from "../../vendor/notebook-kit/src/javascript/observable.ts";
import { define } from "../../vendor/notebook-kit/src/runtime/define.ts";

const window = new Window();
for (const k of ["Element", "Text", "Node", "HTMLElement", "DocumentFragment"]) (globalThis as any)[k] = (window as any)[k];
(globalThis as any).document = window.document;
process.on("unhandledRejection", () => {});

// input = {name, foreign: from another module, builtin: from the builtin module}
type In = { name: string; foreign: boolean; builtin: boolean };
type V = { name: string | null; type: number; inputs: In[] };

const CELL = /^cell \d+$/;
function roleOf(v: V, byName: (n: string) => V | undefined): string {
  const { name: n, type: t, inputs: ins } = v;
  const one = ins.length === 1 ? ins[0] : null;
  if (t === 2 && n == null) return "nk:display/view shadow (define.ts:49,66)";
  if (t === 2 && one?.builtin && one.name === n) return "rt:builtin ref, identity (module.js:61)";
  if (t === 2 && ins.length === 0) return "rt:global constant (module.js:159)";
  if (one?.foreign) return "rt:import alias, identity (variable.js:202)";
  if (n && n.startsWith("mutable$") && one && CELL.test(one.name)) return "nk:mutable$ accessor (define.ts:86)";
  if (n && CELL.test(n) && one && one.name.startsWith("mutable ")) return "nk:Mutator [not text-copyable] (define.ts:85)";
  if (n && one && one.name === `viewof$${n}`) return "nk:view input [not text-copyable] (define.ts:78)";
  if (n && one && CELL.test(one.name)) {
    const holder = byName(one.name);
    if (holder?.inputs.some((i) => i.name === `mutable ${n}`)) return "nk:mutable live getter (define.ts:82)";
    return "nk:projection (define.ts:91)";
  }
  // classic compiled shapes (legacy define / exporter-3), present in the /api/import hybrid module
  if (n && ins.length === 2 && ins[0].name === "Generators" && ins[1].name === `viewof ${n}`) return "classic:viewof getter";
  if (n && n.startsWith("mutator ") && ins.length === 2 && ins[0].name === "Mutable") return "classic:mutator";
  if (n && one && one.name === `mutator ${n.replace(/^mutable /, "")}`) return n.startsWith("mutable ") ? "classic:mutable accessor" : "classic:mutable live";
  if (n && ins.length === 2 && ins[0].name === "Mutable" && ins[1].name === `initial ${n.replace(/^mutable /, "")}`) return "classic:mutable (lopecode)";
  if (n && one && one.name === `mutable ${n}`) return "classic:mutable live (lopecode)";
  return "body";
}

const cm = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
const defInfo = await cm.value("defInfo");
const verdict = (def: any) => {
  const i = defInfo(def);
  return i.importCell ? "importCell" : i.glue ? "glue" : "body";
};
const tabulate = (rows: { role: string; defInfo: string; name: any }[]) => {
  const t = new Map<string, { n: number; names: any[] }>();
  for (const r of rows) {
    const k = `${r.role}  ->  defInfo:${r.defInfo}`;
    const e = t.get(k) ?? { n: 0, names: [] };
    e.n++;
    if (e.names.length < 3) e.names.push(r.name);
    t.set(k, e);
  }
  for (const [k, e] of [...t].sort()) console.log(String(e.n).padStart(4), k, JSON.stringify(e.names));
};

// ---- Part A: live capture ------------------------------------------------------------------
{
  const d = JSON.parse(await Bun.file("tools/newobs-fixtures/wire-2026-09-11/runtime-dump-notebookkit.json").text());
  const vars = d.vars.filter((v: any) => v.mod !== "builtin");
  const toV = (v: any): V => ({
    name: v.name ?? null,
    type: v.type,
    inputs: (v.inputs ?? []).map((s: string) => {
      const m = String(s).match(/^(.*)@(builtin|M\d+|other)$/);
      return m ? { name: m[1], foreign: m[2] !== v.mod && m[2] !== "builtin", builtin: m[2] === "builtin" } : { name: String(s), foreign: false, builtin: false };
    })
  });
  const byMod = new Map<string, Map<string, V>>();
  for (const v of vars) {
    if (!byMod.has(v.mod)) byMod.set(v.mod, new Map());
    if (v.name != null) byMod.get(v.mod)!.set(v.name, toV(v));
  }
  const rows = vars.map((v: any) => ({ role: roleOf(toV(v), (n) => byMod.get(v.mod)!.get(n)), defInfo: verdict(v.def), name: `${v.mod}:${v.name}` }));
  console.log(`\n== Part A: live notebook-kit capture, ${rows.length} non-builtin variables ==`);
  tabulate(rows);
}

// ---- Part B: headless fixture with display/view -------------------------------------------
{
  const realizeFallback = async (sources: string[]) => sources.map((src) => { let f: any; eval("f = " + src); return f; });
  const kit = { transpileJavaScript, transpileObservable, define };
  const nk = await importNotebookModule("modules/@tomlarkworthy/notebook-kit-semantics.js", {
    overrides: { kit, Runtime, realize: realizeFallback, runtime: { _global: () => undefined } }
  });
  const buildNkFixture = await nk.value("buildNkFixture");
  const rt = new Runtime();
  const module = rt.module();
  const nodes = [
    { id: 1, mode: "js", value: 'const counter = view(Inputs.range([0, 10], {label: "counter"}));' },
    { id: 2, mode: "js", value: "display(counter * 2);" },
    { id: 3, mode: "js", value: "const a = 1, b = 2;" },
    { id: 4, mode: "ojs", value: "mutable m = 1" },
    { id: 5, mode: "ojs", value: "viewof v = Inputs.range()" },
    { id: 6, mode: "ojs", value: "y = a + b + m + v" }
  ];
  const state = await buildNkFixture(module, nodes, {});
  const all = [...(rt as any)._variables].filter((v: any) => v._module === module);
  const toV = (v: any): V => ({
    name: v._name ?? null,
    type: v._type,
    inputs: v._inputs.map((i: any) => ({ name: i._name, foreign: i._module !== module && i._module !== (rt as any)._builtin, builtin: i._module === (rt as any)._builtin }))
  });
  const named = new Map(all.filter((v: any) => v._name != null).map((v: any) => [v._name, toV(v)]));
  const inShadow = new Set<any>();
  for (const v of all) for (const s of (v._shadow?.values?.() ?? [])) inShadow.add(s);
  const rows = all.map((v: any) => ({ role: roleOf(toV(v), (n) => named.get(n)), defInfo: verdict(v._definition), name: v._name ?? `(anon t${v._type}${inShadow.has(v) ? ", in a _shadow map" : ""})` }));
  console.log(`\n== Part B: vendored define() fixture, ${nodes.length} nodes -> ${all.length} variables in runtime._variables ==`);
  console.log(`   shadow variables referenced from some _shadow map: ${inShadow.size}; of those in runtime._variables: ${[...inShadow].filter((s) => (rt as any)._variables.has(s)).length}`);
  console.log(`   state.variables (define's own per-cell list): ${state.variables.length}`);
  tabulate(rows);
  nk.dispose();
}
cm.dispose();
