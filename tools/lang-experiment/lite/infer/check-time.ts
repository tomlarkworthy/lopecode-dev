// bun lite/infer/check-time.ts: the live checker on the five sections the ix cells are checked after, alone and with the ix cells, four rounds.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../core.ts";
import { parse } from "../parse.ts";
import { splitCells } from "../toolchain/ss-toolchain.ts";
import { IX_FILES, OW_FILES } from "./index.ts";
const LITE = join(import.meta.dir, "..");
const he = (s: string) => { let at = 0; for (const c of parse(s).comments) { if (s.slice(at, c.start).trim()) break; at = c.end; } return at; };
const texts = (f: string) => { const s = readFileSync(join(LITE, f), "utf8"); return splitCells(s.slice(he(s)).trimStart(), false); };
const WITH = ["types.ss.ts", "subtype.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts"];
const shell = readFileSync(join(LITE, "acorn/acorn-shell.ts"), "utf8");
const run = (fs: string[]) => { const src = fs.flatMap(texts).join("\n\n"); const t0 = performance.now(); const r = checkSources({ cells: src, tsx: true, shell }); return [performance.now() - t0, r.cells.length]; };
for (let i = 0; i < 4; i++) { const a = run(WITH), b = run([...WITH, ...IX_FILES.map((f) => "infer/" + f)]), c = run([...WITH, ...[...IX_FILES, ...OW_FILES].map((f) => "infer/" + f)]); console.log(`with-only ${a[0].toFixed(0)} ms ${a[1]} cells; with+ix ${b[0].toFixed(0)} ms ${b[1]} cells; with+ix+ow ${c[0].toFixed(0)} ms ${c[1]} cells`); }
