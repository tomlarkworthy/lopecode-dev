// bun selfhost/typed-imports/self-check.ts: the ti cells checked by the shipped checker, with the sections the
// cells of lite/infer are checked with (lite/soundscript/ts-cells.ts SS_CHECKED_WITH, SS_GROUPS, SS_SHELL), and the
// size of each ti cell.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../lite/core.ts";
import { splitCells, declaredName } from "../../lite/toolchain/ss-toolchain.ts";
import { parse } from "../../lite/parse.ts";
import { IX_FILES, OW_FILES, MD_FILES } from "../../lite/infer-ss.ts";
const LITE = join(import.meta.dir, "../../lite");
const WITH = ["types.ss.ts", "subtype.ss.ts", "walks.ss.ts", "island.ss.ts", "shape.ss.ts", "messages.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "acorn/syntax.ss.ts"];
const INFER = [...IX_FILES, ...OW_FILES, ...MD_FILES].map((f) => `infer/${f}`);
const MINE = ["ti-types.ss.ts", "ti-module.ss.ts", "ti-program.ss.ts", "ti-gate.ss.ts"];
const headerEnd = (src: string) => { let at = 0; for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; } return at; };
const texts = (path: string) => { const s = readFileSync(path, "utf8"); return splitCells(s.slice(headerEnd(s)).trimStart(), false); };
const theirs = [...WITH, ...INFER].flatMap((f) => texts(join(LITE, f)));
const mine = MINE.flatMap((f) => texts(join(import.meta.dir, f)));
const t0 = performance.now();
const r = checkSources({ cells: [...theirs, ...mine].join("\n\n"), tsx: true, shell: readFileSync(join(LITE, "acorn/acorn-shell.ts"), "utf8") });
const ms = performance.now() - t0;
const names = new Set(mine.map((t) => declaredName(t)).filter((n): n is string => !!n));
const mineCells = r.cells.filter((c) => names.has(c.name));
const bad = r.cells.filter((c) => c.status !== "ok");
console.log(`module errors: ${r.module.length}${r.module.length ? " " + JSON.stringify(r.module.slice(0, 5)) : ""}`);
console.log(`cells: ${r.cells.length} (ti: ${mineCells.length}); not ok: ${bad.length}; ${ms.toFixed(0)} ms`);
for (const c of bad) console.log(`  ${c.name} ${c.status} ${JSON.stringify(c.errors)} ${JSON.stringify(c.unsupported)} ${c.blockedBy}`);
const sizes = mine.map((t) => [declaredName(t) ?? "(type)", t.split("\n").length] as const).filter(([n]) => names.has(n)).sort((a, b) => b[1] - a[1]);
console.log(`largest ti cells: ${sizes.slice(0, 5).map(([n, k]) => `${n} ${k}`).join(", ")}`);
