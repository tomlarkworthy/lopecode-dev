// The real checker on a SoundScript file, as the notebook checks a module (splitCells, then checkCells; strict
// index, the checker's default; not tsx). Prints one line per cell; exit 1 if any cell is not ok.
// Run: bun selfhost/check.ts [file]   (default lite/types.ss.ts)
import { readFileSync } from "node:fs";
import { splitCells } from "../lite/toolchain/ss-toolchain.ts";
import { checkCells } from "../lite/stdlib/runtime.ts";

// --tsx: as build.ts checks a module (tsx: true)
const TSX = process.argv.includes("--tsx");
export function checkFile(path: string) {
  const texts = splitCells(readFileSync(path, "utf8"), TSX);
  return checkCells(texts, TSX).result;
}

if (import.meta.main) {
  const path = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? new URL("../lite/types.ss.ts", import.meta.url).pathname;
  const result = checkFile(path);
  let bad = 0, msgs = 0;
  for (const e of result.module) console.log(`module [${e.rule}] L${e.line} ${e.msg}`);
  for (const c of result.cells) {
    const errs = [...c.errors.map((e) => `[${e.rule}] L${e.line} ${e.msg}`), ...(c.unsupported ?? []).map((u) => `[unsupported] L${u.line} ${u.msg}`)];
    msgs += errs.length;
    if (c.status !== "ok" || errs.length) bad++;
    console.log(`${c.name}: ${c.status}${c.value ? ` : ${c.value}` : ""}${c.blockedBy?.length ? ` (blocked by ${c.blockedBy.join(", ")})` : ""}${errs.length ? "\n    " + errs.join("\n    ") : ""}`);
  }
  console.log(`${result.cells.length} cells, ${bad} not ok, ${msgs} messages, ${result.module.length} module errors`);
  process.exit(bad || result.module.length ? 1 : 0);
}
