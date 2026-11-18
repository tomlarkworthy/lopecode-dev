// Part 3: data-only reductions of editor-5 bug patterns, run through the checker as the notebook runs it
// (checkSources default, strictIndex true, tsx). A bug is credited (a) only if its reduction is rejected here.
import { checkSources } from "../lite/core.ts";
const R: [string, string, { name: string; view?: boolean }[]?][] = [
  ["B1-'' the loop rewritten legally: an events cell takes edited by value, a listener re-selects", `const edited = () => state("");\nconst select = (edited: State<string>) => action((pid: string) => edited.set(pid));\nconst ticks = function* (edited: string) { yield edited + "x"; };\nconst loop = (ticks: Events<string>, select) => on(ticks, select);`],
  ["B11-' persist rewritten legally: a listener on an events cell writes options", `const options = () => state({ attach: false });\nconst setAttach = (options: State<{ attach: boolean }>) => action((a: boolean) => options.set({ attach: a }));\nconst attachTicks = function* (attach: boolean) { yield attach; };\nconst persist = (attachTicks: Events<boolean>, setAttach) => on(attachTicks, setAttach);`, [{ name: "attach" }]],
  ["escapeTemplateLiteral as written in editor-5 (Y in classify.ts)", String.raw`const escapeTemplateLiteral = () => (s: string) => String(s).replace(/\\/g, "\\\\").replace(/\x60/g, "\\\x60");`],
  ["B1 selectVariable loop: a cell body calls the selecting action of the state it reads",
   `const edited = () => state("");\nconst select = (edited: State<string>) => action((pid: string) => edited.set(pid));\nconst autoSelect = (edited: string, select) => { select("p1"); return edited; };`],
  ["B1' same, the write made directly in the body",
   `const edited = () => state("");\nconst autoSelect = (edited: State<string>) => { edited.set("p1"); return 1; };`],
  ["B4 variableLink: a registry lookup dereferenced unguarded (Map)",
   `const registry = () => new Map<string, { name: string }>();\nconst link = (registry) => (mod: string) => registry.get(mod).name;`],
  ["B4' same, registry as a record (strict index)",
   `const registry = (): Record<string, { name: string }> => ({});\nconst link = (registry) => (mod: string) => registry[mod].name;`],
  ["B5 auto_attach: a memo Map in a cell's value, written by another cell",
   `const editors = () => new Map<string, number>();\nconst attach = (editors) => { editors.set("v", 1); return editors.size; };`],
  ["B6 auto_attach: factory change detected by identity, cache stamped on the Map",
   `const factory = () => (x: number) => x;\nconst seen = () => new Map<string, number>();\nconst same = (factory, seen) => { const f = factory; return f === factory; };\nconst stamp = (seen) => { seen.factory = 1; return 1; };`],
  ["B9 #166 apply: CodeMirror state looked up by a stale key, then dereferenced",
   `const states = () => new Map<string, { doc: string }>();\nconst text = (states) => (key: string) => states.get(key).doc;`],
  ["B10 paste/up/down: a handler closes over the selection from when the button was built",
   `const edited = () => state("");\nconst pasted = () => state("");\nconst paste = (edited: string, pasted: State<string>) => action(() => pasted.set(edited));`],
  ["B10' the fix the language asks for: read at the call",
   `const edited = () => state("");\nconst pasted = () => state("");\nconst paste = (edited: State<string>, pasted: State<string>) => action(() => pasted.set(read(edited)));`],
  ["B11 persist_attach_menu: a cell writes the options it would otherwise re-trigger on",
   `const options = () => state({ attach: false });\nconst persist = (options: State<{ attach: boolean }>, attach: boolean) => { options.set({ attach }); return 1; };`, [{ name: "attach" }]],
  ["B12 lopecode#144: a fresh random pid for a new cell",
   `const newPid = () => () => "_" + Math.random().toString(36).slice(2, 9);`],
  ["B13 compile_and_update swallows the throw and returns undefined",
   `const apply = () => (src: string): string | undefined => { try { return String(JSON.parse(src)); } catch (e) { return undefined; } };`],
  ["B14 cellSourceHandlersRef: a mutable holder so readers do not depend on the set",
   `const ref = () => ({ current: ["a"] });\nconst sync = (ref) => { ref.current = ["h"]; return 1; };`],
  ["B15 editor_refresh_from_runtime keeps lastSynced across runs in this",
   `const refresh = function () { return this; };`],
];
for (const [title, cells, outside] of R) {
  const r = checkSources({ cells, tsx: true, outside: outside ?? [] });
  const errs = [...r.module.map((e) => `module [${e.rule}]`), ...r.cells.flatMap((c: any) => c.errors.map((e: any) => `${c.name} [${e.rule}] ${e.msg}`))];
  console.log(`${title}\n   ${errs.length ? errs.join("\n   ") : "accepted: " + r.cells.map((c: any) => `${c.name} ${c.status}`).join(", ")}`);
}
