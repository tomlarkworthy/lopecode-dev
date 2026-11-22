// bun lite/infer/cp-lezer-time.ts [--rounds R] [--every K] [--old dir]: µs per completion on the tutorial module
// (cp-time.ts's positions), the cells as shipped against the cells of --old (a copy of lite/infer from before the Lezer
// reading: by default soundscript/.scratch/cp-port/oldcp, the cp-text, cp-modes and cp-param files of
// selfhost/opaque-handles/base/lite/infer with their mut(...) and freeze(...) calls stripped), each module check answered
// from a table filled by a first run.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse, kids, type Node } from "../parse.ts";
import { checkSources, type Sources, type CheckOpts, type LiteResult } from "../core.ts";
import { linkCp } from "./cp-index.ts";
import { completionsAtWith } from "../complete.ts";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1] ?? ""; };
const ROUNDS = Number(arg("--rounds") ?? 3), EVERY = Number(arg("--every") ?? 5);
const ROOT = join(import.meta.dir, "../.."), OLD = resolve(ROOT, arg("--old") ?? "lite/soundscript/.scratch/cp-port/oldcp");
const over = { ...(await import(join(OLD, "cp-text.ss.ts"))), ...(await import(join(OLD, "cp-modes.ss.ts"))), ...(await import(join(OLD, "cp-param.ss.ts"))) };
const New = linkCp(), Old = linkCp(over);
const tut = JSON.parse(readFileSync(join(ROOT, "lite/soundscript/.scratch/switch-cost/tutorial.json"), "utf8"));
const cells: string[] = tut.texts;
const ps: { at: number; off: number }[] = [];
for (let at = 0; at < cells.length; at++) {
  const ends = new Set<number>();
  const walk = (n: Node) => { if (n.type === "Identifier") ends.add(n.end); if (n.type === "MemberExpression" && !n.computed) ends.add(n.property.start); kids(n).forEach(walk); };
  try { walk(parse(cells[at], { jsx: true }).program); } catch {}
  for (const off of ends) ps.push({ at, off });
}
const picked = ps.filter((_, i) => i % EVERY === 0);
const table = (L: typeof New) => picked.map((p) => {
  const got: { r: LiteResult | null; err: unknown }[] = [];
  completionsAtWith(L, cells, p.at, p.off, true, tut.outside ?? null, null, (src: Sources, opts: CheckOpts) => { try { const r = checkSources(src, opts); got.push({ r, err: null }); return r; } catch (err) { got.push({ r: null, err }); throw err; } });
  return got;
});
const tNew = table(New), tOld = table(Old);
const replay = (c: { r: LiteResult | null; err: unknown }[], k: { i: number }) => () => { const x = c[k.i++]; if (!x) throw new Error("table exhausted"); if (x.r) return x.r; throw x.err; };
const time = (f: () => void) => { const t0 = performance.now(); f(); return (performance.now() - t0) * 1000; };
console.log(`tutorial module ${cells.length} cells; ${picked.length} of ${ps.length} positions`);
for (let round = 0; round < ROUNDS; round++) {
  let a = 0, b = 0;
  for (let i = 0; i < picked.length; i++) {
    const p = picked[i];
    const run = (L: typeof New, c: typeof tNew[number]) => time(() => completionsAtWith(L, cells, p.at, p.off, true, tut.outside ?? null, null, replay(c, { i: 0 }) as never));
    if (round % 2) { b += run(Old, tOld[i]); a += run(New, tNew[i]); } else { a += run(New, tNew[i]); b += run(Old, tOld[i]); }
  }
  console.log(`round ${round + 1}: µs per completion, checks from the table: before (scan) ${(b / picked.length).toFixed(1)}, after (Lezer) ${(a / picked.length).toFixed(1)}`);
}
