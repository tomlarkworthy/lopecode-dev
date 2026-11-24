// The real checker on a SoundScript file, as selfhost/check.ts, with cells in another language named by
// --outside a,b (core.ts Outside), so a parameter naming one gets the boundary rules (S11) and not
// [inject-unknown]. --compile also prints each accepted cell's compiled inputs (does it take ss?).
// --home <module> names the module the cells are in (core.ts Sources.home): the runtime module's cells may take the
// prelude's names (d1). Run: bun selfhost/rt/check.ts <file> [--tsx] [--outside a,b] [--home m] [--compile]
import { readFileSync } from "node:fs";
import { splitCells, compileCell, contextFromCheck, declaredName } from "../../lite/toolchain/ss-toolchain.ts";
import { checkCells, checkSources } from "../../lite/stdlib/runtime.ts";

const args = process.argv.slice(2);
const TSX = args.includes("--tsx");
const at = args.indexOf("--outside");
const outside = at >= 0 ? args[at + 1].split(",").map((name) => ({ name })) : null;
const hi = args.indexOf("--home");
const home = hi >= 0 ? args[hi + 1] : null;
const path = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--outside" && args[i - 1] !== "--home")!;
const texts = splitCells(readFileSync(path, "utf8"), TSX);
const { result } = home !== null ? { result: checkSources({ cells: texts.join("\n\n"), tsx: TSX, outside, home }) } : checkCells(texts, TSX, outside);
const ctx = args.includes("--compile") ? contextFromCheck(result) : null;
let bad = 0;
for (const e of result.module) console.log(`module [${e.rule}] L${e.line} ${e.msg}`);
result.cells.forEach((c) => {
  const errs = [...c.errors.map((e) => `[${e.rule}] L${e.line} ${e.msg}`), ...(c.unsupported ?? []).map((u) => `[unsupported] L${u.line} ${u.msg}`)];
  if (c.status !== "ok" || errs.length) bad++;
  let inputs = "";
  if (ctx && c.status === "ok" && !errs.length) {
    const t = texts.find((x) => declaredName(x) === c.name);
    const vs = t ? compileCell(t, TSX, ctx).filter((v) => v.name === c.name || v.name === `viewof ${c.name}`) : [];
    inputs = vs.length ? ` inputs=[${vs.map((v) => v.inputs.join(",")).join(" | ")}]` : "";
  }
  console.log(`${c.name}: ${c.status}${c.value ? ` : ${c.value}` : ""}${c.blockedBy?.length ? ` (blocked by ${c.blockedBy.join(", ")})` : ""}${inputs}${errs.length ? "\n    " + errs.join("\n    ") : ""}`);
});
console.log(`${result.cells.length} cells, ${bad} not ok, ${result.module.length} module errors`);
