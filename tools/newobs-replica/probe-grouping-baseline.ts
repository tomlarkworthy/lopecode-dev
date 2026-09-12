// Serialises groupCells output over every corpus we hold, so a change to glue recognition can be
// diffed against the grouping it replaces rather than against the suites' pinned counts alone.
//
// run: bun tools/newobs-replica/probe-grouping-baseline.ts <out.json>
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

const out = process.argv[2];
if (!out) throw Error("usage: probe-grouping-baseline.ts <out.json>");

const cm = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
const groupCells = await cm.value("groupCells");
const runtimeAccessors = await cm.value("runtimeAccessors");

// same adapter as cell-map-2-module.test.ts
const dumpAccessors = {
  name: (v: any) => v.name,
  type: (v: any) => v.type,
  def: (v: any) => v.def ?? "",
  module: (v: any) => v.mod,
  inputs: (v: any) =>
    (v.inputs ?? []).map((i: string) => {
      const m = String(i).match(/^(.*)@(builtin|M\d+|other)$/);
      return m ? { name: m[1], module: m[2], builtin: m[2] === "builtin" } : { name: String(i), module: v.mod, builtin: false };
    })
};

const serialise = (map: Map<any, any[]>, a: any, modKey: (m: any) => string) => {
  const res: any = {};
  for (const [mod, cells] of map) {
    res[modKey(mod)] = {
      unresolved: (cells as any).unresolved ?? null,
      cells: cells.map((c: any) => ({
        name: c.name,
        type: c.type,
        lang: c.lang,
        head: a.name(c.head) ?? `#t${a.type(c.head)}`,
        vars: c.variables.map((v: any) => a.name(v) ?? `#t${a.type(v)}`),
        importInfo: c.importInfo
      }))
    };
  }
  return res;
};

const result: any = {};

for (const p of [
  "tools/newobs-replica/out-e3/eval.json",
  "tools/newobs-replica/out-nk/eval.json",
  "tools/newobs-fixtures/wire-2026-09-11/runtime-dump-notebookkit.json",
  "tools/newobs-fixtures/wire-2026-09-11/runtime-dump-classic.json"
]) {
  const d = await Bun.file(p).json();
  if (d.error || d.evalError || !Array.isArray(d.vars)) {
    result[p] = { skipped: String(d.error ?? d.evalError ?? "no vars array") };
    continue;
  }
  const vars = d.vars.filter((v: any) => v.mod !== "builtin");
  result[p] = { variables: vars.length, modules: serialise(groupCells(vars, dumpAccessors), dumpAccessors, String) };
}

const live = (label: string, runtime: any, module: any) => {
  const vars = [...runtime._variables].filter((v: any) => v._module === module);
  result[label] = { variables: vars.length, modules: serialise(groupCells(vars, runtimeAccessors), runtimeAccessors, () => "self") };
};

live("cell-map-2 own module (compiled)", cm.runtime, cm.module);
const viz = await importNotebookModule("modules/@tomlarkworthy/cell-map-viz.js");
live("cell-map-viz own module (compiled)", viz.runtime, viz.module);

const realizeFallback = async (sources: string[]) => sources.map((src) => { let f: any; eval("f = " + src); return f; });
const kit = { transpileJavaScript, transpileObservable, define };
const nk = await importNotebookModule("modules/@tomlarkworthy/notebook-kit-semantics.js", {
  overrides: { kit, Runtime, realize: realizeFallback, runtime: { _global: () => undefined } }
});
const fixture = await nk.value("nkFixture");
live("nkFixture (vendored define, 14 nodes)", fixture.module._runtime, fixture.module);

const buildNkFixture = await nk.value("buildNkFixture");
const rt = new Runtime();
const module = rt.module();
await buildNkFixture(module, [
  { id: 1, mode: "js", value: 'const counter = view(Inputs.range([0, 10], {label: "counter"}));' },
  { id: 2, mode: "js", value: "display(counter * 2);" },
  { id: 3, mode: "js", value: "const a = 1, b = 2;" },
  { id: 4, mode: "ojs", value: "mutable m = 1" },
  { id: 5, mode: "ojs", value: "viewof v = Inputs.range()" },
  { id: 6, mode: "ojs", value: "y = a + b + m + v" },
  { id: 7, mode: "ojs", value: "k = 42" }
], {});
live("view/display fixture (vendored define, 7 nodes)", rt, module);

await Bun.write(out, JSON.stringify(result, null, 1));
for (const [k, v] of Object.entries<any>(result)) {
  if (v.skipped) { console.log(k, "SKIPPED", v.skipped); continue; }
  const mods = Object.entries<any>(v.modules);
  console.log(k, `${v.variables} vars ->`, mods.map(([m, x]) => `${m}:${x.cells.length}${x.unresolved ? ` (${x.unresolved.length} unresolved)` : ""}`).join(" "));
}
nk.dispose();
viz.dispose();
cm.dispose();
process.exit(0);
