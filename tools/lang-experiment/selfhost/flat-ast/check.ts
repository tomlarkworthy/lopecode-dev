// The real checker (checkSources, strict index, not tsx) on a visitor file with its prefix: the table types and
// lite/messages.ss.ts. Prints each cell of the visitor file, the median check time of 5 runs, and exits 1 if any is not ok.
// Run: bun selfhost/flat-ast/check.ts [visit-a.ss.ts | visit-b.ss.ts | …]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../lite/core.ts";
import { splitCells, declaredName } from "../../lite/toolchain/ss-toolchain.ts";

const HERE = import.meta.dir, ROOT = join(HERE, "../..");
export const PREFIX: Record<string, string[]> = {
  "visit-a.ss.ts": ["selfhost/flat-ast/ast-a.ss.ts", "lite/messages.ss.ts"],
  "visit-a-mutant.ss.ts": ["selfhost/flat-ast/ast-a.ss.ts", "lite/messages.ss.ts"],
  "visit-b.ss.ts": ["selfhost/flat-ast/ast-b.ss.ts", "lite/messages.ss.ts"],
  "visit-c.ss.ts": ["selfhost/flat-ast/ast-a.ss.ts", "lite/messages.ss.ts"],
};
// a visitor file whose table arrives from an outside cell
export const OUTSIDE: Record<string, { name: string }[]> = { "visit-c.ss.ts": [{ name: "flatParse" }] };
export function sourceOf(file: string): { src: string; own: Set<string> } {
  const pre = (PREFIX[file] ?? []).map((p) => readFileSync(join(ROOT, p), "utf8"));
  const own = readFileSync(join(HERE, file), "utf8");
  return { src: [...pre, own].join("\n"), own: new Set(splitCells(own, false).map(declaredName).filter((n): n is string => !!n)) };
}
export function checkFile(file: string, runs = 5) {
  const { src, own } = sourceOf(file);
  const ms: number[] = [];
  const outside = OUTSIDE[file] ?? null;
  let r = checkSources({ cells: src, tsx: false, outside });
  for (let i = 0; i < runs; i++) { const t0 = performance.now(); r = checkSources({ cells: src, tsx: false, outside }); ms.push(performance.now() - t0); }
  return { r, own, ms: ms.toSorted((a, b) => a - b)[runs >> 1]! };
}

if (import.meta.main) {
  const file = process.argv[2] ?? "visit-a.ss.ts";
  const { r, own, ms } = checkFile(file);
  let bad = 0, prefixBad = 0;
  for (const e of r.module) console.log(`module [${e.rule}] L${e.line} ${e.msg}`);
  for (const c of r.cells) {
    const errs = [...c.errors, ...c.unsupported];
    const notOk = c.status !== "ok" || errs.length > 0;
    if (!own.has(c.name)) { if (notOk) { prefixBad++; console.log(`(prefix) ${c.name}: ${c.status}`); } continue; }
    if (notOk) bad++;
    console.log(`${c.name}: ${c.status}${c.blockedBy.length ? ` (blocked by ${c.blockedBy.join(", ")})` : ""}`);
    for (const e of errs) console.log(`    [${e.rule}] L${e.line} ${e.msg}`);
  }
  console.log(`${file}: ${own.size} cells, ${bad} not ok, ${prefixBad} prefix cells not ok, ${r.module.length} module errors; checkSources median ${ms.toFixed(1)} ms`);
  process.exit(bad || prefixBad || r.module.length ? 1 : 0);
}
