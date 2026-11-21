// Completion's case: completionsAt (cnt/lite/complete.ts, base with parse.ts counting every text it parses) on
// base/lite/events.ss.ts at four cursor positions (the nested prototype's: member properties in the last cells, a name
// prefix). Per keystroke: the texts parsed and their nodes; today's time; and what parsing those same texts through the
// module (M.parse, FN CROSSING) instead of parse.ts adds. Run: bun complete-cost.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "./cnt/lite/parse.ts";
import { completionsAt } from "./cnt/lite/complete.ts";
import { M } from "./mod.ts";

const HERE = import.meta.dir;
const src = readFileSync(join(HERE, "base/lite/events.ss.ts"), "utf8");
const P = parse(src);
const cells = P.program.body.map((s: any) => src.slice(s.start, s.end));
const G = globalThis as any;
const median = (xs: number[]) => xs.toSorted((a, b) => a - b)[xs.length >> 1]!;
const time = (f: () => unknown, n = 9) => { f(); const ts: number[] = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); f(); ts.push(performance.now() - t0); } return median(ts); };
const positions: { at: number; offset: number; what: string }[] = [];
for (let at = cells.length - 1; at >= 0 && positions.length < 3; at--) {
  const C = parse(cells[at]!);
  let last: any = null;
  const walk = (n: any) => { if (!n || typeof n !== "object") return; if (Array.isArray(n)) return n.forEach(walk); if (typeof n.type !== "string") return; if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier") last = n; for (const k in n) if (k !== "loc") walk(n[k]); };
  walk(C.program);
  if (last) positions.push({ at, offset: last.property.start, what: `cell ${at} member .${last.property.name}` });
}
{
  const at = cells.length - 1, C = parse(cells[at]!);
  let last: any = null;
  const walk = (n: any, p: any, key: string) => { if (!n || typeof n !== "object") return; if (Array.isArray(n)) return n.forEach((x) => walk(x, p, key)); if (typeof n.type !== "string") return;
    const named = (p?.type === "MemberExpression" && key === "property" && !p.computed) || (p?.type === "Property" && key === "key") || key === "params" || key === "id" || key === "typeAnnotation" || key === "typeName";
    if (n.type === "Identifier" && n.name.length > 2 && !named) last = n;
    for (const k in n) if (k !== "loc") walk(n[k], n, k); };
  walk(C.program, null, "");
  positions.push({ at, offset: last.start + 2, what: `cell ${at} name prefix ${last.name.slice(0, 2)}` });
}
console.log(`base/lite/events.ss.ts: ${cells.length} cells, ${src.length} chars`);
for (const p of positions) {
  // the texts of a warm call (the first call at a position also parses what later calls find in caches)
  G.__parsed = [];
  completionsAt(cells, p.at, p.offset, true);
  const cold: [string, boolean][] = [...G.__parsed];
  const coldOk = cold.map(([t, j]) => M.parse(t, j)).filter((x) => x.ok);
  const coldOther = coldOk.flatMap((x) => M.byNid(x.ast).filter((n: any) => n?.type === "Other").map((n: any) => n.kind));
  console.log(`${p.what}, first call: ${cold.length} texts parsed, ${coldOk.reduce((s, x) => s + x.ast.count, 0)} nodes; Other nodes: ${coldOther.length ? [...new Set(coldOther)].join(", ") + ` (${coldOther.length})` : "none"}`);
  G.__parsed = [];
  const r = completionsAt(cells, p.at, p.offset, true);
  const texts: [string, boolean][] = [...G.__parsed];
  const today = time(() => completionsAt(cells, p.at, p.offset, true));
  const ok = texts.map(([t, j]) => M.parse(t, j)).filter((x) => x.ok);
  const count = ok.reduce((s, x) => s + x.ast.count, 0);
  const others = ok.flatMap((x) => M.byNid(x.ast).filter((n: any) => n?.type === "Other").map((n: any) => n.kind));
  const tParse = time(() => { for (const [t, j] of texts) { try { parse(t, { jsx: j }); } catch {} } });
  const tMod = time(() => { for (const [t, j] of texts) M.parse(t, j); });
  console.log(`${p.what}: today median ${today.toFixed(1)} ms, mode ${r.mode}, ${r.options.length} options; ${texts.length} texts parsed (${ok.length} parse, ${count} nodes, ${texts.reduce((s, [t]) => s + t.length, 0)} chars); Other nodes: ${others.length ? [...new Set(others)].join(", ") + ` (${others.length})` : "none"}`);
  console.log(`  those texts: parse.ts ${tParse.toFixed(2)} ms; through the module ${tMod.toFixed(2)} ms; added per keystroke ${(tMod - tParse).toFixed(2)} ms (${((tMod - tParse) / today * 100).toFixed(0)}% of today)`);
}
