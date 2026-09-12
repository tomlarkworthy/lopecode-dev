import { Window } from "happy-dom";
import { Runtime } from "@observablehq/runtime";
const W = "../..";
const { importNotebookModule } = await import(W + "/tools/notebook-import.ts");
const { transpileJavaScript } = await import(W + "/vendor/notebook-kit/src/javascript/transpile.ts");
const { transpileObservable } = await import(W + "/vendor/notebook-kit/src/javascript/observable.ts");
const { define } = await import(W + "/vendor/notebook-kit/src/runtime/define.ts");
const window = new Window();
for (const k of ["Element", "Text", "Node", "HTMLElement", "DocumentFragment"]) (globalThis as any)[k] = (window as any)[k];
(globalThis as any).document = window.document;
process.on("unhandledRejection", () => {});
const cm = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
const roleOf = await cm.value("roleOf");
const acc = await cm.value("runtimeAccessors");
const dumpAcc = {
  name: (v: any) => v.name, type: (v: any) => v.type, module: (v: any) => v.mod,
  inputs: (v: any) => (v.inputs ?? []).map((i: string) => {
    const m = String(i).match(/^(.*)@(builtin|M\d+|other)$/);
    return m ? { name: m[1], module: m[2], builtin: m[2] === "builtin" } : { name: String(i), module: v.mod, builtin: false };
  })
};
const hist = (label: string, vars: any[], a: any) => {
  const by = new Map<string, any>();
  for (const v of vars) if (a.name(v) != null) by.set(a.module(v) + " " + a.name(v), v);
  const h: any = {}; const ex: any = {};
  for (const v of vars) {
    const r = roleOf(v, a, (n: string) => by.get(a.module(v) + " " + n));
    h[r] = (h[r] ?? 0) + 1;
    (ex[r] ??= []).length < 4 && ex[r].push(a.name(v));
  }
  console.log(label, vars.length, JSON.stringify(Object.fromEntries(Object.entries(h).sort())), JSON.stringify(ex));
};
for (const p of ["tools/newobs-replica/out-e3/eval.json", "tools/newobs-replica/out-nk/eval.json", "tools/newobs-fixtures/wire-2026-09-11/runtime-dump-notebookkit.json", "tools/newobs-fixtures/wire-2026-09-11/runtime-dump-classic.json"]) {
  const d = await Bun.file(p).json();
  hist(p, d.vars.filter((v: any) => v.mod !== "builtin"), dumpAcc);
}
hist("cell-map-2 own", [...(cm.runtime as any)._variables].filter((v: any) => v._module === cm.module), acc);
const realize = async (s: string[]) => s.map((src) => { let f: any; eval("f = " + src); return f; });
const nk = await importNotebookModule("modules/@tomlarkworthy/notebook-kit-semantics.js", {
  overrides: { kit: { transpileJavaScript, transpileObservable, define }, Runtime, realize, runtime: { _global: () => undefined } }
});
const fx = await nk.value("nkFixture");
hist("nkFixture", [...fx.module._runtime._variables].filter((v: any) => v._module === fx.module), acc);
const build = await nk.value("buildNkFixture");
const rt = new Runtime();
const mod = rt.module();
await build(mod, [
  { id: 1, mode: "js", value: 'const counter = view(Inputs.range([0, 10], {label: "counter"}));' },
  { id: 2, mode: "js", value: "display(counter * 2);" },
  { id: 3, mode: "js", value: "const a = 1, b = 2;" },
  { id: 4, mode: "ojs", value: "mutable m = 1" },
  { id: 5, mode: "ojs", value: "viewof v = Inputs.range()" },
  { id: 6, mode: "ojs", value: "y = a + b + m + v" },
  { id: 7, mode: "ojs", value: "k = 42" }
], {});
hist("view/display fixture", [...(rt as any)._variables].filter((v: any) => v._module === mod), acc);
nk.dispose(); cm.dispose(); process.exit(0);
