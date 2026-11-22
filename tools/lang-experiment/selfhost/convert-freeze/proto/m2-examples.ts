// M2 examples: the example and spec/tutorial cell files, checked and run (runCells) under the switches in the
// environment; per file: cells, ok by the checker, and cells in error after the run with the error text
import { readFileSync } from "node:fs";
import { runCells, PROTO_LOG } from "./tree/lite/browser/run.ts";
import { checkSources } from "./tree/lite/core.ts";
process.on("unhandledRejection", () => {});
const FILES = ["notebook/examples/01-cells.ts", "notebook/examples/03-mut.ts", "notebook/examples/04-counter.tsx", "notebook/examples/05-reducer.tsx", "notebook/examples/06-model.tsx", "notebook/examples/07-workers.tsx", "notebook/examples/09-breakout.tsx",
  "soundscript/spec-2.ts", "soundscript/spec-3.ts", "soundscript/spec-4.ts", "soundscript/spec-5.ts", "soundscript/spec-6.tsx", "soundscript/spec-7.ts", "soundscript/spec-9.ts", "soundscript/spec-10.ts", "soundscript/spec-11.ts", "soundscript/tutorial-async.tsx", "soundscript/tutorial-ordinary.tsx"];
let cells = 0, ok = 0, err = 0;
for (const f of FILES) {
  const src = readFileSync(new URL(`./tree/lite/${f}`, import.meta.url), "utf8");
  let r: any; try { r = checkSources({ cells: src, tsx: true, outside: [], foreign: null } as any); } catch (x) { console.log(`${f}: check crash ${(x as Error).message}`); continue; }
  const okN = r.cells.filter((c: any) => c.status === "ok").length;
  let errs: string[] = [];
  try { const p = runCells(src, { tsx: true, checked: r }); await p.settle(1500); errs = [...p.recs.values()].filter((x) => x.status === "rejected").map((x) => `${x.name}: ${String((x.error as Error)?.message ?? x.error).slice(0, 110)}`); p.dispose(); } catch (x) { errs = [`run crash ${(x as Error).message.slice(0, 100)}`]; }
  cells += r.cells.length; ok += okN; err += errs.length;
  console.log(`${f}: cells ${r.cells.length}, ok ${okN}, in error ${errs.length}${errs.length ? "\n    " + errs.join("\n    ") : ""}`);
}
console.log(`-- examples: cells ${cells}, checker ok ${ok}, in error after run ${err}`);
process.exit(0);
