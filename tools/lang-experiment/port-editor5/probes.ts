// Part 1 probes: each case is run through the real checker (lite/core.ts checkSources), notebook-module
// mode (tsx, no foreign, no shell) unless the case says otherwise. Prints each cell's status and errors.
import { checkSources, type Sources } from "../lite/core.ts";
import { cross, shapeOf } from "../lite/boundary.ts";

type Case = { id: string; note: string; src: Sources };
const nb = (cells: string, outside: { name: string; view?: boolean }[] = []): Sources => ({ cells, tsx: true, outside });
const cases: Case[] = [
  // 1. foreign functions
  { id: "1a", note: "js-toolchain decompile typed as a function", src: nb(`const shown = (decompileJs: (vars: unknown) => string) => decompileJs([]);`, [{ name: "decompileJs" }]) },
  { id: "1b", note: "decompile taken as unknown, then called", src: nb(`const shown = (decompileJs: unknown) => typeof decompileJs === "function" ? decompileJs([]) : "";`, [{ name: "decompileJs" }]) },
  { id: "1c", note: "runtime-sdk runtime as unknown, read a member", src: nb(`const n = (runtime: unknown) => typeof runtime === "object" && runtime !== null && "_variables" in runtime ? 1 : 0;`, [{ name: "runtime" }]) },
  { id: "1d", note: "editor-5's own import name compile collides with the capability", src: nb(`const defs = (compile: (src: string) => unknown[]) => compile("x = 1").length;`, [{ name: "compile" }]) },
  { id: "1e", note: "Promise from another language", src: nb(`const v = (source: Promise<string>) => 1;`, [{ name: "source" }]) },
  { id: "1f", note: "port mode: foreign.d.ts /** effect */ decompile", src: { cells: `const shown = (decompile: (v: number) => string) => decompile(1);`, foreign: `/** effect */ declare function decompile(v: number): string;` } },
  { id: "1g", note: "port mode: foreign.d.ts /** pure */ decompile", src: { cells: `const shown = (decompile: (v: number) => string) => decompile(1);`, foreign: `/** pure */ declare function decompile(v: number): string;` } },
  { id: "1h", note: "notebook module: a top-level declare", src: nb(`declare function decompile(v: number): string;\nconst shown = (decompile) => decompile(1);`) },
  // 2. a mutable foreign object with identity
  { id: "2a", note: "owner cell constructs EditorView from an outside class", src: nb(`const view = function* (EditorView: unknown) {
  const v = new EditorView();
  yield v;
};`, [{ name: "EditorView" }]) },
  { id: "2b", note: "owner cell: mut of an outside instance", src: nb(`const view = function* (code_editor_view: unknown) {
  const v = code_editor_view;
  yield v;
};`, [{ name: "code_editor_view" }]) },
  { id: "2c", note: "state cell holding the outside view", src: nb(`const held = (code_editor_view: unknown) => state(code_editor_view);`, [{ name: "code_editor_view" }]) },
  { id: "2d", note: "call a method on the outside view", src: nb(`const text = (code_editor_view: { state: { doc: string } }) => code_editor_view.state.doc;`, [{ name: "code_editor_view" }]) },
  { id: "2e", note: "dispatch on the view inside an action", src: nb(`const src = () => state("");\nconst save = (src: State<string>, code_editor_view: unknown) => action(() => src.set(String(code_editor_view)));`, [{ name: "code_editor_view" }]) },
  { id: "2f", note: "JSX: place the outside DOM node as a child", src: nb(`const panel = (code_editor: unknown) => <div class="cell-editor">{code_editor}</div>;`, [{ name: "code_editor" }]) },
  { id: "2g", note: "JSX: textarea for the source, onKeyDown for Shift-Enter", src: nb(`const src = () => state("");\nconst setSrc = (src: State<string>) => action((s: string) => src.set(s));\nconst panel = (src: string, setSrc) => <textarea value={src} onInput={setSrc} />;\nconst box = (src: string, setSrc) => <input value={src} onInput={setSrc} onKeyDown={setSrc} />;`) },
  { id: "2h", note: "JSX: a ref attribute to reach the node", src: nb(`const panel = () => <div ref={1}>x</div>;`) },
  // 3. effects on the Runtime
  { id: "3a", note: "define a variable from an action through an outside runtime", src: nb(`const go = (runtime: unknown) => action(() => { const r = runtime; });`, [{ name: "runtime" }]) },
  { id: "3b", note: "the capability list: compile reaches the runtime?", src: nb(`const go = (compile: Compile) => compile({ inputs: [], refs: [], outputs: ["x"] });\nconst x = () => 1;`) },
  { id: "3c", note: "realize (source -> function) typed as a function", src: nb(`const go = (realize: (src: string[]) => Promise<unknown[]>) => 1;`, [{ name: "realize" }]) },
  { id: "3d", note: "free name runtime / globalThis", src: nb(`const go = () => globalThis;`) },
  { id: "3e", note: "an action writing a state cell that Observable JS watches (the only outward write)", src: nb(`const pending = () => state("");\nconst save = (pending: State<string>) => action((s: string) => pending.set(s));`) },
];
for (const c of cases) {
  const r = checkSources(c.src); // the notebook (core.ojs ss.checkSources) uses the default, strictIndex true
  const mod = r.module.map((e) => `module [${e.rule}] ${e.msg}`);
  const cells = r.cells.map((x: any) => `${x.name}: ${x.status}${x.errors?.length ? " " + x.errors.map((e: any) => `[${e.rule}] ${e.msg}`).join("; ") : ""}`);
  console.log(`${c.id} ${c.note}\n   ${[...mod, ...cells].join("\n   ")}`);
}
// S11.5 at run time: an annotation of unknown, given a function or a class instance
const U = { k: "unknown" } as const;
for (const [what, v] of [["function", () => 1], ["class instance", new (class EditorView {})()], ["DOM-like object with a method", { dispatch() {} }]] as const) {
  try { const out = cross(v, U, "code_editor_view"); console.log(`cross unknown <- ${what}: accepted, ${typeof out}`); }
  catch (e) { console.log(`cross unknown <- ${what}: ${(e as Error).message}`); }
}
// 3f: the other outward write, an action writing an Observable JavaScript viewof taken as State (S11.7/S11.8)
{
  const r = checkSources(nb(`type SaveRequest = { pid: string; source: string; seq: number };\nconst save = (save_request: State<SaveRequest>) => action((pid: string, source: string, seq: number) => save_request.set({ pid, source, seq }));`, [{ name: "save_request", view: true }]));
  console.log(`3f action writes an Observable JavaScript viewof save_request as State<{pid, source, seq}>\n   ${r.cells.map((x: any) => `${x.name}: ${x.status} ${x.errors.map((e: any) => `[${e.rule}] ${e.msg}`).join("; ")}`).join("\n   ")}`);
}
