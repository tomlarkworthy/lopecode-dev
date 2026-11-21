// time of each shape on an empty body with the real globals: the set-up part of the per-program time
import { Registry } from "../../../lite/registry.ts";
import { Checker } from "../../../lite/infer/frozen/infer.ts";
import { parse } from "../../../lite/parse.ts";
import * as typeCells from "../../../lite/types.ss.ts";
import * as prelude from "../../../prelude.runtime.ts";
import * as common from "../common.ss.ts";
import { link } from "../mylink.ts";
const reg = new Registry();
const ch = new Checker(reg, new Set(), parse("const x = 1;"));
const globals = [...ch.globals.vars.values()].map((b) => ({ name: b.name, t: b.t, kind: b.kind }));
const files: Record<string, [string[], string]> = { A: [["shapeA"], "checkerA"], B: [["tablesB", "shapeB"], "checkerB"], B2: [["tablesB2", "shapeB"], "checkerB"], C: [["shapeC"], "checkerC"] };
console.log(`${globals.length} globals`);
for (const [s, [fs, entry]] of Object.entries(files)) {
  const cells = Object.assign({}, ...(await Promise.all(fs.map((f) => import(`../${f}.ss.ts`)))));
  const run = link({ ...typeCells, ...common, ...cells } as any, prelude as any, { regView: {} })[entry];
  const xs: number[] = [];
  for (let i = 0; i < 2000; i++) { const t0 = performance.now(); run({ params: [], globals, body: [] }); xs.push(performance.now() - t0); }
  xs.sort((a, b) => a - b);
  console.log(`${s}: empty body ${(xs[1000]! * 1000).toFixed(1)} µs (median of 2000)`);
}
