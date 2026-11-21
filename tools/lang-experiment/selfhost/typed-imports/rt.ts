// A program of several modules compiled by the toolchain and run in one Observable Runtime under bun, as the
// notebook runs it (lite/stdlib/runtime.test.ts load): the runtime cells as ss_<name> inputs, every variable
// observed, an import an Observable import variable. "typed": checked as one program (ti cells), an import of a
// checked export compiled as a plain input. "today": each module checked alone, its imports cells in another
// language (the shipped path: ss_cross at every delivery).
import { Runtime } from "@observablehq/runtime";
import { identity } from "../../node_modules/@observablehq/runtime/src/identity.js";
import * as ss from "../../lite/stdlib/runtime.ts";
import { checkSources } from "../../lite/core.ts";
import { splitCells, contextFromCheck, RUNTIME_CELLS, INPUTS } from "../../lite/toolchain/ss-toolchain.ts";
import { compileTi } from "./compile.ts";
import { checkProgram, toLite } from "./ti-link.ts";
import type { TiImport } from "./ti-types.ss.ts";
import type { TiVar } from "./ti-gate.ss.ts";
import type { GateModule } from "./gate.ts";

const { input } = await import(new URL("../../../../vendor/observable-stdlib/src/generators/input.js", import.meta.url).pathname as any);
export type RtModule = { name: string; cells: string; imports?: TiImport[]; js?: Record<string, [string[], (...a: any[]) => unknown]> };
export type Built = { runtime: any; modules: Map<string, any>; names: Map<any, string>; value: (m: string, n: string) => Promise<any>; errors: string[]; compiled: Map<string, { name: string; inputs: string[]; definition: string }[]> };

const imp = (i: TiImport) => ({ ...i, view: i.view ?? false });
export function build(mods: RtModule[], mode: "typed" | "today", variant?: Parameters<typeof checkProgram>[2]): Built {
  const runtime = new Runtime();
  const modules = new Map<string, any>(), names = new Map<any, string>(), errors: string[] = [];
  for (const m of mods) { const mod = runtime.module(); modules.set(m.name, mod); names.set(mod, m.name); }
  const outsideOf = (m: RtModule) => [...Object.keys(m.js ?? {}).filter((n) => !n.startsWith("viewof ")).map((n) => ({ name: n, view: !!m.js?.[`viewof ${n}`] }))];
  const typed = mode === "typed" ? checkProgram(mods.map((m) => ({ name: m.name, cells: m.cells, outside: outsideOf(m), imports: (m.imports ?? []).map(imp) })), undefined, variant) : null;
  const compiled = new Map<string, { name: string; inputs: string[]; definition: string }[]>();
  for (const m of mods) {
    const mod = modules.get(m.name);
    const observe = (n: string) => ({ rejected: (e: unknown) => errors.push(`${m.name}.${n}: ${(e as Error)?.message ?? e}`) });
    for (const n of RUNTIME_CELLS) mod.define(INPUTS[n], [], () => (ss as any)[n]);
    mod.define("Generators", [], () => ({ input }));
    for (const [n, [ins, f]] of Object.entries(m.js ?? {})) mod.variable(observe(n)).define(n, ins, f);
    for (const i of m.imports ?? []) mod.variable(observe(i.local)).import(i.imported, i.local, modules.get(i.from));
    const outside = [...outsideOf(m), ...(m.imports ?? []).map((i) => ({ name: i.local, view: !!i.view }))];
    const lite = typed ? toLite(typed.modules.get(m.name)!.result) : checkSources({ cells: m.cells, tsx: true, outside });
    const ctx = { ...contextFromCheck(lite), inputs: INPUTS, module: m.name };
    const defs = splitCells(m.cells, true).flatMap((t) => compileTi(t, ctx));
    compiled.set(m.name, defs);
    for (const d of defs) mod.variable(observe(d.name)).define(d.name, d.inputs, (0, eval)(`(${d.definition})`));
  }
  return { runtime, modules, names, errors, compiled, value: (m, n) => modules.get(m).value(n) };
}

// the definition's own text: Function.prototype.toString, which a toString property of the function does not change
export const defText = (f: unknown) => Function.prototype.toString.call(f);
// a module's variables as the gate reads them from the Runtime: an import (identity over one input of another
// module) is its wiring; every other named variable is a TiVar. The runtime's own fields, as core.ojs reads them.
export function gateInput(b: Built, read: (f: unknown) => string = defText): GateModule[] {
  return [...b.modules].map(([name, mod]) => {
    const variables: TiVar[] = [], imports: TiImport[] = [];
    for (const v of b.runtime._variables) {
      if (v._module !== mod || typeof v._name !== "string" || typeof v._definition !== "function") continue;
      const src = v._inputs[0];
      if (v._definition === identity && v._inputs.length === 1 && src._module !== mod) {
        imports.push({ local: v._name, imported: src._name, from: b.names.get(src._module) ?? "?", view: false });
        continue;
      }
      if (RUNTIME_CELLS.some((n) => INPUTS[n] === v._name) || v._name === "Generators") continue;
      variables.push({ name: v._name, inputs: v._inputs.map((i: any) => i._name), definition: read(v._definition) });
    }
    return { name, variables, imports };
  });
}
