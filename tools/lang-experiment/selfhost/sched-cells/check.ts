// The real checker on step.ss.ts and lite/runtime.ss.ts as one module, as a notebook module holding both would be.
// Run: bun selfhost/sched-cells/check.ts     exit 1 if any cell is not ok
import { readFileSync } from "node:fs";
import { splitCells } from "../../lite/toolchain/ss-toolchain.ts";
import { checkCells } from "../../lite/stdlib/runtime.ts";

const files = [new URL("../../lite/runtime.ss.ts", import.meta.url).pathname, ...(process.argv.length > 2 ? process.argv.slice(2) : [new URL("./step.ss.ts", import.meta.url).pathname])];
const { result } = checkCells(files.flatMap((p) => splitCells(readFileSync(p, "utf8"), false)), false);
let bad = 0;
for (const e of result.module) console.log(`module [${e.rule}] L${e.line} ${e.msg}`);
for (const c of result.cells) {
  const errs = [...c.errors.map((e) => `[${e.rule}] L${e.line} ${e.msg}`), ...(c.unsupported ?? []).map((u) => `[unsupported] L${u.line} ${u.msg}`)];
  if (c.status !== "ok" || errs.length) bad++;
  console.log(`${c.name}: ${c.status}${errs.length ? "\n    " + errs.join("\n    ") : ""}`);
}
console.log(`${result.cells.length} cells, ${bad} not ok, ${result.module.length} module errors`);
process.exit(bad || result.module.length ? 1 : 0);
