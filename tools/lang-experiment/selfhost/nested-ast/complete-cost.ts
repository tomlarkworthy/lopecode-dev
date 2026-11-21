// Per-keystroke cost of completionsAt (orig/lite/complete.ts) on orig/lite/events.ss.ts, and what a checked port's
// boundary would add: completionsAt checks up to 4 variant texts of the module; a checked checker would take each
// variant's tree as a crossed NParse (nestParse + cross), or, if the shell's value were trusted, nestParse alone.
// The module is split into cells at its top-level statements (located on the AST); the cursor is put at the property of
// member expressions in the last cells (prefix empty, after "."), and at a name prefix.
// Run: bun complete-cost.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "./orig/lite/parse.ts";
import { completionsAt } from "./orig/lite/complete.ts";
import { checkSources } from "./orig/lite/core.ts";
import { nestParse, nestDistinct } from "./adapter.ts";
import { corpus } from "./corpus.ts";
import { SHAPE } from "./diff.ts";

const HERE = import.meta.dir;
const { cross: crossDisp } = await import("./recdisp/lite/boundary.ts");
const { cross: crossRec } = await import("./rec/lite/boundary.ts");
const src = readFileSync(join(HERE, "orig/lite/events.ss.ts"), "utf8");
const P = parse(src);
const cells = P.program.body.map((s: any) => src.slice(s.start, s.end));
const median = (xs: number[]) => xs.toSorted((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const time = (f: () => unknown, n = 9) => { f(); const ts: number[] = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); f(); ts.push(performance.now() - t0); } return median(ts); };
// positions: the property start of the last non-computed member expression in each of the last 3 cells
const positions: { at: number; offset: number; what: string }[] = [];
for (let at = cells.length - 1; at >= 0 && positions.length < 3; at--) {
  const C = parse(cells[at]!);
  let last: any = null;
  const walk = (n: any) => { if (!n || typeof n !== "object") return; if (Array.isArray(n)) return n.forEach(walk); if (typeof n.type !== "string") return; if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier") last = n; for (const k in n) if (k !== "loc") walk(n[k]); };
  walk(C.program);
  if (last) positions.push({ at, offset: last.property.start, what: `cell ${at} member .${last.property.name}` });
}
// a name prefix: the first two letters of the last identifier in the last cell
{
  const at = cells.length - 1, C = parse(cells[at]!);
  let last: any = null;
  // an identifier in an expression: not a member's property, an object key, a parameter or a declared name
  const walk = (n: any, p: any, key: string) => { if (!n || typeof n !== "object") return; if (Array.isArray(n)) return n.forEach((x) => walk(x, p, key)); if (typeof n.type !== "string") return;
    const named = (p?.type === "MemberExpression" && key === "property" && !p.computed) || (p?.type === "Property" && key === "key") || key === "params" || key === "id" || key === "typeAnnotation" || key === "typeName";
    if (n.type === "Identifier" && n.name.length > 2 && !named) last = n;
    for (const k in n) if (k !== "loc") walk(n[k], n, k); };
  walk(C.program, null, "");
  positions.push({ at, offset: last.start + 2, what: `cell ${at} name prefix ${last.name.slice(0, 2)}` });
}
console.log(`orig/lite/events.ss.ts: ${cells.length} cells, ${src.length} chars`);
const whole = time(() => checkSources({ cells: cells.join("\n\n"), tsx: true }), 5);
console.log(`checkSources of the whole module (one variant's check): ${whole.toFixed(1)} ms`);
for (const p of positions) {
  const r = completionsAt(cells, p.at, p.offset, true);
  const t = time(() => completionsAt(cells, p.at, p.offset, true), 9);
  console.log(`completionsAt ${p.what}: median ${t.toFixed(1)} ms, mode ${r.mode}, ${r.options.length} options (about ${(t / whole).toFixed(1)} checks)`);
}
const text = cells.join("\n\n");
const v = nestParse(text, true) as any;
const tParse = time(() => nestParse(text, true));
const tAcorn = time(() => parse(text, { jsx: true }));
const tDisp = time(() => crossDisp(v, SHAPE, "cc.nestedParse"));
const tRec = time(() => crossRec(v, SHAPE, "cc.nestedParse"), 3);
let k = 0;
const tDispFresh = time(() => crossDisp(nestParse(text, true), SHAPE, `cc${k++}.nestedParse`)) - tParse;
console.log(`per variant, ${v.ast.count} nodes: parse.ts (paid today) ${tAcorn.toFixed(2)} ms; nestParse ${tParse.toFixed(2)} ms; cross recdisp ${tDisp.toFixed(2)} ms (same name, equal value), ${tDispFresh.toFixed(2)} ms (fresh name); cross rec ${tRec.toFixed(1)} ms`);
console.log(`added per variant over today (nestParse - parse.ts + cross recdisp, fresh name): ${(tParse - tAcorn + tDispFresh).toFixed(2)} ms`);
console.log(`4 variants: trusted ${(4 * tParse).toFixed(1)} ms; recdisp ${(4 * (tParse + tDispFresh)).toFixed(1)} ms; rec ${(4 * (tParse + tRec)).toFixed(1)} ms; flat A 164.6 ms, flat B 75.8 ms (../flat-ast/out/q2.txt)`);
const retries = corpus().map((c) => ({ id: c.id, n: nestDistinct(c.src, c.tsx).parses })).filter((r) => r.n > 1);
console.log(`distinctNames over ${corpus().length} inputs: more than one parse: ${retries.map((r) => `${r.id} (${r.n})`).join(", ") || "none"}`);
// the flat route on the same text with the same dispatching boundary, for a like-for-like row
{
  const { flatParse } = await import("./flat-adapter.ts");
  const { checkSources: cs } = await import("./orig/lite/core.ts");
  const sF = cs({ cells: (await Bun.file(HERE + "/../flat-ast/ast-a.ss.ts").text()) + `\nexport const take = (p: Parse): number => 1;`, tsx: false, outside: [{ name: "p" }] }).facts!.get("take")!.params[0]!.boundary!.shape;
  const { cross: crossOrig } = await import("./orig/lite/boundary.ts");
  let j = 0;
  const tF = time(() => flatParse(text, true));
  const tFd = time(() => crossDisp(flatParse(text, true), sF, `cf${j++}.p`)) - tF;
  const tFo = time(() => crossOrig(flatParse(text, true), sF, `co${j++}.p`)) - tF;
  console.log(`flat on the same text: flatParse ${tF.toFixed(2)} ms; cross orig ${tFo.toFixed(2)} ms, recdisp ${tFd.toFixed(2)} ms; 4 variants: orig ${(4 * (tF + tFo)).toFixed(1)} ms, recdisp ${(4 * (tF + tFd)).toFixed(1)} ms`);
}
