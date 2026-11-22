// bun selfcheck.ts <checker tree> [<cells tree>]: infer.test.ts's "every ix, ow and md cell is accepted by the checker":
// the cells of <cells tree> (default: the checker tree) under the checker of <checker tree>. Prints the cells that are
// not ok and the time.
import { readFileSync } from "node:fs";
import { join } from "node:path";
const tree = process.argv[2] ?? "proto";
const L0 = join(import.meta.dir, tree, "lite"), L = join(import.meta.dir, process.argv[3] ?? tree, "lite");
const { checkSources } = await import(join(L0, "core.ts"));
const { parse } = await import(join(L, "parse.ts"));
const { splitCells } = await import(join(L, "toolchain/ss-toolchain.ts"));
const { IX_FILES, OW_FILES, MD_FILES } = await import(join(L, "infer-ss.ts"));
function headerEnd(src: string): number { let at = 0; for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; } return at; }
const texts = (f: string) => { const s = readFileSync(join(L, f), "utf8"); return splitCells(s.slice(headerEnd(s)).trimStart(), false) as string[]; };
const WITH = ["types.ss.ts", "subtype.ss.ts", "walks.ss.ts", "island.ss.ts", "shape.ss.ts", "messages.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "acorn/syntax.ss.ts"];
const ix = [...IX_FILES, ...OW_FILES, ...MD_FILES].map((f: string) => `infer/${f}`);
const t0 = performance.now();
const r = checkSources({ cells: [...WITH, ...ix].flatMap(texts).join("\n\n"), tsx: true, shell: readFileSync(join(L, "acorn/acorn-shell.ts"), "utf8") });
const ms = performance.now() - t0;
const bad = r.cells.filter((c: any) => c.status !== "ok");
console.log(`${tree} checking ${process.argv[3] ?? tree}: ${r.cells.length} cells (${ix.length} infer files + ${WITH.length} sections), module errors ${r.module.length}, not ok ${bad.length}, ${ms.toFixed(0)} ms`);
for (const c of bad.slice(0, 20)) console.log(`  ${c.name} ${c.status} ${c.errors.map((e: any) => `[${e.rule}] ${e.msg}`).join(" | ")} ${c.unsupported.map((e: any) => e.msg).join(",")}`);
for (const m of r.module.slice(0, 10)) console.log(`  module [${m.rule}] ${m.msg}`);
