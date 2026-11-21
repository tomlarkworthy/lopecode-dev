// A module of SoundScript cells checked by one copy's checker, compiled by that copy's toolchain and run in a real
// Observable Runtime, with cells in another language defined beside them as plain variables. No timers: a value is
// awaited with module.value(name). Run as a library (probes.ts, toy.ts).
// copy: "rule" or "base" (the folder under this one holding lite/)
import { Runtime } from "@observablehq/runtime";
// a state cell's value is Observable's own Generators.input of its handle, as in lite/stdlib/runtime.test.ts
import { input } from "../../../../vendor/observable-stdlib/src/generators/input.js";

export async function load(copy: string, src: string, outside: Record<string, [string[], (...a: any[]) => unknown]>, tsx = false) {
  const T = await import(`./${copy}/lite/toolchain/ss-toolchain.ts`);
  const ss = await import(`./${copy}/lite/stdlib/runtime.ts`);
  const { checkSources } = await import(`./${copy}/lite/core.ts`);
  const outsideList = Object.keys(outside).filter((n) => !n.startsWith("viewof ")).map((n) => ({ name: n, view: !!outside[`viewof ${n}`] }));
  const checked = checkSources({ cells: src, tsx, outside: outsideList });
  const runtime = new Runtime();
  const m = runtime.module();
  m.define("Generators", [], () => ({ input }));
  for (const n of T.RUNTIME_CELLS) m.define(T.INPUTS[n], [], () => (ss as any)[n]);
  for (const [n, [ins, f]] of Object.entries(outside)) m.define(n, ins, f);
  const ctx = T.contextFromCheck(checked);
  const compiled: { name: string; inputs: string[]; definition: string }[] = [];
  for (const text of T.splitCells(src, tsx)) for (const d of T.compileCell(text, tsx, ctx)) {
    compiled.push(d);
    m.variable(true).define(d.name, d.inputs, (0, eval)(`(${d.definition})`));
  }
  const value = async (n: string): Promise<{ ok: true; v: any } | { ok: false; e: any }> => { try { return { ok: true, v: await m.value(n) }; } catch (e) { return { ok: false, e }; } };
  return { checked, compiled, m, runtime, value, redefine: (n: string, ins: string[], f: (...a: any[]) => unknown) => m.redefine(n, ins, f) };
}
export const verdicts = (checked: any) => checked.cells.map((c: any) => `${c.name}: ${c.status}${[...c.errors, ...c.unsupported].map((e: any) => ` [${e.rule}] ${e.msg}`).join("")}`).concat(checked.module.map((e: any) => `module [${e.rule}] ${e.msg}`));
