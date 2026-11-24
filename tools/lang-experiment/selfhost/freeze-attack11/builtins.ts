// freeze-attack11 target 4: a SoundScript cell named after an Observable builtin, compiled into a module of a Runtime that
// has that builtin (as a notebook's Runtime has md, width, ...). Readers: another SoundScript cell, a plain JavaScript
// variable of the same module, and a variable of a second module. bun selfhost/freeze-attack11/builtins.ts
import { Runtime } from "@observablehq/runtime";
import * as T from "../../lite/toolchain/ss-toolchain.ts";
import * as ss from "../../lite/stdlib/runtime.ts";
import { checkSources } from "../../lite/core.ts";
const turn = () => new Promise<void>((r) => setImmediate(r));
for (const name of ["md", "width", "html", "Inputs", "require", "FileAttachment", "Promises", "DOM", "Mutable", "visibility", "now", "invalidation", "Generators"]) {
  const src = `const ${name} = () => 5;\nconst g = (${name}: number) => ${name} + 1;`;
  const r: any = checkSources({ cells: src, tsx: true, outside: [], foreign: null } as never);
  const bad = r.cells.filter((c: any) => c.status !== "ok" || c.errors.length || c.unsupported.length);
  const verdict = bad.length ? `REJECT ${bad.flatMap((c: any) => c.errors.map((e: any) => e.rule)).join(",")}` : "ACCEPT";
  if (bad.length) { console.log(`${name}: ${verdict}`); continue; }
  const builtins: Record<string, unknown> = { [name]: () => `builtin-${name}` };
  const runtime = new Runtime(builtins as never);
  const m = runtime.module(), other = runtime.module();
  for (const n of T.RUNTIME_CELLS) m.define(T.INPUTS[n]!, [], () => (ss as any)[n]);
  const got: Record<string, unknown> = {};
  const obs = (n: string) => ({ fulfilled: (v: unknown) => { got[n] = v; }, rejected: (e: unknown) => { got[n] = `ERROR ${(e as Error)?.message ?? e}`; }, pending() {} });
  const ctx = T.contextFromCheck({ cells: r.cells, facts: r.facts } as never);
  for (const t of T.splitCells(src, true)) for (const d of T.compileCell(t, true, ctx, T.declaredName(t))) m.variable(obs(d.name)).define(d.name, d.inputs, (0, eval)(`"use strict"; (${d.definition})`));
  m.variable(obs("ojsSameModule")).define("ojsSameModule", [name], (v: unknown) => v);
  other.variable(obs("ojsOtherModule")).define("ojsOtherModule", [name], (v: unknown) => v);
  for (let i = 0; i < 200; i++) await turn();
  console.log(`${name}: ${verdict}; ss reader g=${JSON.stringify(got.g)}; same-module JS reader=${JSON.stringify(got.ojsSameModule)}; other-module JS reader=${JSON.stringify(got.ojsOtherModule)}`);
  (runtime as any).dispose();
}
