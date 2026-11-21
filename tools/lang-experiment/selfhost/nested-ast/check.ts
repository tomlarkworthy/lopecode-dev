// The checker of one copy (orig, rec, rec-fix, ...: <copy>/lite/core.ts checkSources, strict index, not tsx) on a
// visitor file with its prefix (the nested types, the children function, orig/lite/messages.ss.ts). Prints each cell of
// the visitor file, the median check time of 5 runs, and exits 1 if any is not ok.
// Run: bun check.ts <copy> <file.ss.ts> [outside-name ...]
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HERE = import.meta.dir;
export const PREFIX: Record<string, string[]> = {
  "visit-n.ss.ts": ["ast-n.ss.ts", "kids-n.ss.ts", "orig/lite/messages.ss.ts"],
  "visit-own.ss.ts": ["ast-n.ss.ts", "kids-n.ss.ts", "orig/lite/messages.ss.ts", "visit-n.ss.ts"],
  "kids-n.ss.ts": ["ast-n.ss.ts"],
  "ast-n.ss.ts": [],
};
export const OUTSIDE: Record<string, { name: string }[]> = { "visit-n.ss.ts": [{ name: "nestedParse" }], "visit-own.ss.ts": [{ name: "nestedParse" }, { name: "ownFacts" }] };
const { splitCells, declaredName } = await import("./orig/lite/toolchain/ss-toolchain.ts");
export function sourceOf(file: string): { src: string; own: Set<string> } {
  const pre = (PREFIX[file] ?? []).map((p) => readFileSync(join(HERE, p), "utf8"));
  const own = readFileSync(join(HERE, file), "utf8");
  return { src: [...pre, own].join("\n"), own: new Set(splitCells(own, false).map(declaredName).filter((n: string | null): n is string => !!n)) };
}
export async function checkFile(copy: string, file: string, runs = 5) {
  const { checkSources } = await import(`./${copy}/lite/core.ts`);
  const { src, own } = sourceOf(file);
  const outside = OUTSIDE[file] ?? null;
  const ms: number[] = [];
  let r = checkSources({ cells: src, tsx: false, outside });
  for (let i = 0; i < runs; i++) { const t0 = performance.now(); r = checkSources({ cells: src, tsx: false, outside }); ms.push(performance.now() - t0); }
  return { r, own, ms: ms.toSorted((a, b) => a - b)[runs >> 1]! };
}
if (import.meta.main) {
  const [copy = "rec", file = "visit-n.ss.ts"] = process.argv.slice(2);
  const { r, own, ms } = await checkFile(copy, file);
  let bad = 0, prefixBad = 0;
  for (const e of r.module) console.log(`module [${e.rule}] L${e.line} ${e.msg}`);
  for (const c of r.cells) {
    const errs = [...c.errors, ...c.unsupported];
    const notOk = c.status !== "ok" || errs.length > 0;
    if (!own.has(c.name)) { if (notOk) { prefixBad++; console.log(`(prefix) ${c.name}: ${c.status} ${JSON.stringify(errs.slice(0, 2))}`); } continue; }
    if (notOk) bad++;
    console.log(`${c.name}: ${c.status}${c.blockedBy.length ? ` (blocked by ${c.blockedBy.join(", ")})` : ""}`);
    for (const e of errs) console.log(`    [${e.rule}] L${e.line} ${e.msg}`);
  }
  console.log(`${copy} ${file}: ${own.size} cells, ${bad} not ok, ${prefixBad} prefix cells not ok, ${r.module.length} module errors; checkSources median ${ms.toFixed(1)} ms`);
  process.exit(bad || prefixBad || r.module.length ? 1 : 0);
}
