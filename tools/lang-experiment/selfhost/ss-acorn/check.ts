// The checker of one copy (rule or base) on a SoundScript file of this folder with its prefix, as one module (the
// module's cells are checked together, as one notebook module is). Prints each cell of the file with its status and
// code-line count (lines.ts), the median check time of 3 runs, and exits 1 if any cell is not ok.
// Run: bun check.ts <copy> <file> [--quiet]
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { codeLines } from "./lines.ts";
const HERE = import.meta.dir;
export const PREFIX: Record<string, string[]> = {
  "ss/acorn-types.ss.ts": [],
  "ss/acorn-kids.ss.ts": ["ss/acorn-types.ss.ts"],
  "ss/acorn.ss.ts": ["ss/acorn-types.ss.ts", "ss/acorn-kids.ss.ts"],
  "ss/consumer.ss.ts": ["ss/acorn-types.ss.ts", "ss/acorn-kids.ss.ts", "ss/acorn.ss.ts", "../nested-ast/orig/lite/messages.ss.ts"],
};
export const OUTSIDE: Record<string, { name: string }[]> = { "ss/acorn.ss.ts": [{ name: "acornParse" }], "ss/consumer.ss.ts": [{ name: "acornParse" }] };
export async function checkFile(copy: string, file: string, runs = 3) {
  const { checkSources } = await import(`./${copy}/lite/core.ts`);
  const pre = (PREFIX[file] ?? []).map((p) => readFileSync(join(HERE, p), "utf8"));
  const own = readFileSync(join(HERE, file), "utf8");
  const sizes = new Map(codeLines(own).decls.filter((d) => d.kind === "cell").map((d) => [d.name, d.lines] as const));
  const src = [...pre, own].join("\n");
  const outside = OUTSIDE[file] ?? null;
  const ms: number[] = [];
  let r = checkSources({ cells: src, tsx: false, outside });
  for (let i = 0; i < runs; i++) { const t0 = performance.now(); r = checkSources({ cells: src, tsx: false, outside }); ms.push(performance.now() - t0); }
  return { r, sizes, ms: ms.toSorted((a, b) => a - b)[runs >> 1]! };
}
if (import.meta.main) {
  const [copy = "rule", file = "ss/acorn.ss.ts"] = process.argv.slice(2);
  const { r, sizes, ms } = await checkFile(copy, file);
  let bad = 0, prefixBad = 0;
  for (const e of r.module) console.log(`module [${e.rule}] L${e.line} ${e.msg}`);
  for (const c of r.cells) {
    const errs = [...c.errors, ...c.unsupported];
    const notOk = c.status !== "ok" || errs.length > 0;
    if (!sizes.has(c.name)) { if (notOk) { prefixBad++; console.log(`(prefix) ${c.name}: ${c.status} ${JSON.stringify(errs.slice(0, 2))}`); } continue; }
    if (notOk) bad++;
    if (notOk || !process.argv.includes("--quiet")) console.log(`${c.name}: ${c.status}, ${sizes.get(c.name)} lines${c.blockedBy.length ? ` (blocked by ${c.blockedBy.join(", ")})` : ""}`);
    for (const e of errs) console.log(`    [${e.rule}] L${e.line} ${e.msg}`);
  }
  const big = [...sizes].toSorted((a, b) => b[1] - a[1])[0];
  console.log(`${copy} ${file}: ${sizes.size} cells, ${bad} not ok, ${prefixBad} prefix cells not ok, ${r.module.length} module errors; largest ${big?.[0]} ${big?.[1]} lines; checkSources median ${ms.toFixed(1)} ms`);
  process.exit(bad || prefixBad || r.module.length ? 1 : 0);
}
