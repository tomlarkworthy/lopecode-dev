// The real checker over one file of cells (default probes.ss.ts). Prints every cell's status and messages.
// Run: bun selfhost/sched-immer/check.ts [file]
import { readFileSync } from "node:fs";
import { splitCells } from "../../lite/toolchain/ss-toolchain.ts";
import { checkCells } from "../../lite/stdlib/runtime.ts";

const file = process.argv[2] ?? new URL("./probes.ss.ts", import.meta.url).pathname;
const { result } = checkCells(splitCells(readFileSync(file, "utf8"), false), false);
for (const e of result.module) console.log(`module [${e.rule}] L${e.line} ${e.msg}`);
for (const c of result.cells) {
  const errs = [...c.errors.map((e) => `[${e.rule}] L${e.line} ${e.msg}`), ...(c.unsupported ?? []).map((u) => `[unsupported] L${u.line} ${u.msg}`)];
  console.log(`${c.name}: ${c.status}${errs.length ? "\n    " + errs.join("\n    ") : ""}`);
}
console.log(`${result.cells.length} cells, ${result.module.length} module errors`);
