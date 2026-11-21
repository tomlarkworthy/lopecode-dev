// The real checker on lite/runtime.ss.ts and the given .ss.ts files (default render.ss.ts) as one module, as the runtime module holding both would be.
// Run: bun selfhost/render-cells/check.ts [--no-tsx] [files]     exit 1 if any cell is not ok
import { readFileSync } from "node:fs";
import { splitCells } from "../../lite/toolchain/ss-toolchain.ts";
import { checkCells } from "../../lite/stdlib/runtime.ts";

const tsx = !process.argv.includes("--no-tsx");
process.argv = process.argv.filter((a) => a !== "--no-tsx");
const files = [new URL("../../lite/runtime.ss.ts", import.meta.url).pathname, ...(process.argv.length > 2 ? process.argv.slice(2) : [new URL("./render.ss.ts", import.meta.url).pathname])];
const { result } = checkCells(files.flatMap((p) => splitCells(readFileSync(p, "utf8"), tsx)), tsx);
let bad = 0;
for (const e of result.module) console.log(`module [${e.rule}] L${e.line} ${e.msg}`);
for (const c of result.cells) {
  const errs = [...c.errors.map((e) => `[${e.rule}] L${e.line} ${e.msg}`), ...(c.unsupported ?? []).map((u) => `[unsupported] L${u.line} ${u.msg}`)];
  if (c.status !== "ok" || errs.length) bad++;
  console.log(`${c.name}: ${c.status}${errs.length ? "\n    " + errs.join("\n    ") : ""}`);
}
console.log(`${result.cells.length} cells, ${bad} not ok, ${result.module.length} module errors`);
process.exit(bad || result.module.length ? 1 : 0);
