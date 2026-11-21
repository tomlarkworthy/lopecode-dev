// bun lite/infer/cp-time.ts [--rounds R] [--every K]: µs per completion on the 47-cell tutorial module, complete.ts
// against the cp cells, without the module checks both run: each check is answered from a table filled by a first
// run. complete.ts takes no check from outside, so its import of ./core.ts is resolved here to a module whose
// checkSources can be swapped (globalThis.__cpCheck). The whole calls and the checks alone are timed beside it.
import { plugin } from "bun";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, kids, type Node } from "../parse.ts";
import { checkSources, type Sources, type CheckOpts, type LiteResult } from "../core.ts";
import { linkCp, completionsAtWith } from "./cp-index.ts";

const CORE = join(import.meta.dir, "..", "core.ts"), SHIM = join(import.meta.dir, "cp-time-core.ts");
plugin({ name: "cp-time", setup(b) { b.onResolve({ filter: /^\.\/core\.ts$/ }, (a) => (a.importer.endsWith("/lite/complete.ts") && join(a.importer, "..", a.path) === CORE ? { path: SHIM } : undefined)); } });
const { completionsAt: liveAt } = await import("../complete.ts");
const G = globalThis as { __cpCheck?: ((src: Sources, opts: CheckOpts) => LiteResult) | null };
const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1] ?? ""; };
const ROUNDS = Number(arg("--rounds") ?? 3), EVERY = Number(arg("--every") ?? 10);
const ROOT = join(import.meta.dir, "../..");
const tut = JSON.parse(readFileSync(join(ROOT, "lite/soundscript/.scratch/switch-cost/tutorial.json"), "utf8"));
const cells: string[] = tut.texts;
const L = linkCp();
const ps: { at: number; off: number }[] = [];
for (let at = 0; at < cells.length; at++) {
  const ends = new Set<number>();
  const walk = (n: Node) => {
    if (n.type === "Identifier") ends.add(n.end);
    if (n.type === "MemberExpression" && !n.computed) ends.add(n.property.start);
    kids(n).forEach(walk);
  };
  try { walk(parse(cells[at], { jsx: true }).program); } catch {}
  for (const off of ends) ps.push({ at, off });
}
const picked = ps.filter((_, i) => i % EVERY === 0);
// the checks one completion runs, with their results
const calls = picked.map((p) => {
  const got: { src: Sources; opts: CheckOpts; r: LiteResult | null; err: unknown }[] = [];
  completionsAtWith(L, cells, p.at, p.off, true, tut.outside ?? null, null, (src, opts) => {
    try { const r = checkSources(src, opts); got.push({ src, opts, r, err: null }); return r; } catch (err) { got.push({ src, opts, r: null, err }); throw err; }
  });
  return got;
});
// a check answered from the table: its result, or its throw again
const replay = (x: { r: LiteResult | null; err: unknown } | undefined): LiteResult => { if (!x) throw new Error("table exhausted"); if (x.r) return x.r; throw x.err; };
const time = (f: () => void) => { const t0 = performance.now(); f(); return (performance.now() - t0) * 1000; };
console.log(`tutorial module ${cells.length} cells; ${picked.length} of ${ps.length} positions; ${calls.reduce((s, c) => s + c.length, 0)} checks`);
for (let round = 0; round < ROUNDS; round++) {
  let live = 0, cp = 0, checks = 0, cpBuild = 0, liveBuild = 0;
  for (let i = 0; i < picked.length; i++) {
    const p = picked[i], c = calls[i];
    live += time(() => liveAt(cells, p.at, p.off, true, tut.outside ?? null, null));
    cp += time(() => completionsAtWith(L, cells, p.at, p.off, true, tut.outside ?? null, null));
    checks += time(() => { for (const x of c) { try { checkSources(x.src, { ...x.opts, onCell: () => {} }); } catch {} } });
    let k = 0, j = 0;
    const cpRun = () => { cpBuild += time(() => completionsAtWith(L, cells, p.at, p.off, true, tut.outside ?? null, null, () => replay(c[k++]))); };
    const liveRun = () => { G.__cpCheck = () => replay(c[j++]); liveBuild += time(() => liveAt(cells, p.at, p.off, true, tut.outside ?? null, null)); G.__cpCheck = null; };
    // which side runs first alternates by round
    if (round % 2) { liveRun(); cpRun(); } else { cpRun(); liveRun(); }
    if (j !== c.length || k !== c.length) throw new Error(`position ${i}: complete.ts made ${j} checks, the cells ${k}, the table holds ${c.length}`);
  }
  const per = (x: number) => (x / picked.length).toFixed(1);
  console.log(`round ${round + 1} (${round % 2 ? "complete.ts" : "cells"} first): µs per completion: option building (checks from the table) complete.ts ${per(liveBuild)}, cells ${per(cpBuild)}; ` +
    `whole call complete.ts ${per(live)}, cells ${per(cp)}; the checks alone ${per(checks)}`);
}
