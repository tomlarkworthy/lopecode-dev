// Q1: does the flat union check and cross the boundary as a cell input, and what does checking it cost.
// The real checker (checkSources, strict index, not tsx) on: the union file + one cell taking the parse from an outside
// cell (`flatParse`). Then the runtime half: the shape checkSources computed for that parameter (facts), and cross()
// (boundary.ts) on every corpus table, against flatParse's own cost.
// Run: bun selfhost/flat-ast/q1.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../lite/core.ts";
import { cross } from "../../lite/boundary.ts";
import { flatParse, SPECS } from "./adapter.ts";
import { corpus } from "./corpus.ts";

const HERE = import.meta.dir;
const CELL = `
// the whole table crosses as one value
export const nodeCount = (flatParse: Parse): number => (flatParse.ok ? flatParse.ast.nodes.length : -1);
// code over it: narrow by type and follow a child index
export const calleeNames = (flatParse: Parse): string[] => {
  if (!flatParse.ok) return [];
  const nodes = flatParse.ast.nodes;
  const out: Mut<string[]> = mut([]);
  for (const n of nodes) {
    if (n.type !== "CallExpression") continue;
    const c = nodes[n.callee];
    if (c && c.type === "Identifier") out.push(c.name);
  }
  return freeze(out);
};`;
const median = (xs: number[]) => xs.toSorted((a, b) => a - b)[xs.length >> 1]!;
export function checkWith(types: string, cells: string, outside = [{ name: "flatParse" }], runs = 5) {
  const src = types + "\n" + cells;
  let r = checkSources({ cells: src, tsx: false, outside });
  const ms: number[] = [];
  for (let i = 0; i < runs; i++) { const t0 = performance.now(); r = checkSources({ cells: src, tsx: false, outside }); ms.push(performance.now() - t0); }
  return { r, ms: median(ms), all: ms };
}
export const report = (r: ReturnType<typeof checkSources>, only?: Set<string>) => {
  const lines: string[] = [];
  for (const e of r.module) lines.push(`module [${e.rule}] L${e.line} ${e.msg}`);
  for (const c of r.cells) {
    if (only && !only.has(c.name)) continue;
    lines.push(`${c.name}: ${c.status}${c.value ? ` : ${c.value.slice(0, 100)}` : ""}${c.blockedBy.length ? ` blocked by ${c.blockedBy.join(", ")}` : ""}`);
    for (const e of [...c.errors, ...c.unsupported]) lines.push(`    [${e.rule}] L${e.line} ${e.msg}`);
  }
  return lines.join("\n");
};

if (import.meta.main) {
  const baseline = checkWith("export type Parse = { ok: false; message: string };", `export const nodeCount = (flatParse: Parse): number => (flatParse.ok ? 1 : -1);`);
  console.log(`baseline (2-member Parse, one cell): ${baseline.ms.toFixed(1)} ms  ${report(baseline.r)}`);
  for (const [name, file] of [["a", "ast-a.ss.ts"], ["all", "ast-a-all.ss.ts"]] as const) {
    const types = readFileSync(join(HERE, file), "utf8");
    const t = checkWith(types, CELL);
    console.log(`\n== union ${name} (${file}): checkSources median ${t.ms.toFixed(1)} ms (runs ${t.all.map((x) => x.toFixed(0)).join(" ")}), ok=${t.r.ok}`);
    console.log(report(t.r, new Set(["nodeCount", "calleeNames"])));
    const shape = t.r.facts?.get("nodeCount")?.params.find((p) => p.name === "flatParse")?.boundary?.shape;
    console.log(`boundary shape for nodeCount.flatParse: ${shape ? `${JSON.stringify(shape).length} chars of JSON` : "none"}`);
    if (!shape) continue;
    // runtime: flatParse per input, then cross() of its value
    let parseUs = 0, crossUs = 0, n = 0, failed = 0, nodes = 0;
    const firstFail: string[] = [];
    for (const c of corpus()) {
      const t0 = performance.now();
      const v = flatParse(c.src, c.tsx, SPECS[name]);
      const t1 = performance.now();
      try { cross(v, shape as any, "nodeCount.flatParse"); } catch (e) { failed++; if (firstFail.length < 2) firstFail.push(`${c.id}: ${(e as Error).message.slice(0, 160)}`); }
      const t2 = performance.now();
      parseUs += (t1 - t0) * 1000; crossUs += (t2 - t1) * 1000; n++;
      if (v.ok) nodes += v.ast.nodes.length;
    }
    console.log(`cross() over ${n} corpus parses (${nodes} nodes): ${failed} rejected ${firstFail.join(" | ")}`);
    console.log(`  total flatParse ${(parseUs / 1000).toFixed(1)} ms, total cross ${(crossUs / 1000).toFixed(1)} ms; per node: flatParse ${(parseUs / nodes).toFixed(2)} µs, cross ${(crossUs / nodes).toFixed(2)} µs`);
  }
}
