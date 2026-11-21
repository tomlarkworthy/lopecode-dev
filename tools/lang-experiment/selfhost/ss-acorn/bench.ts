// Cost per call of parse through FN CROSSING, per node, on the nested prototype's corpus (../nested-ast/corpus.ts, the
// inputs that parse), against bare acorn + TS plugin and against base/lite/parse.ts. Median of ROUNDS rounds, each
// round every input once. Run: bun bench.ts
import * as acorn from "./base/lite/node_modules/acorn/dist/acorn.mjs";
import { tsPlugin } from "./base/lite/node_modules/@sveltejs/acorn-typescript/index.js";
import { parse } from "./base/lite/parse.ts";
import { corpus } from "../nested-ast/corpus.ts";
import { M, acornParse, checkShape, PARSE_SHAPE, wrapped } from "./mod.ts";

const TS = acorn.Parser.extend(tsPlugin() as any), TSX = acorn.Parser.extend(tsPlugin({ jsx: true }) as any);
const ROUNDS = 9;
const ins = corpus().filter((c) => { try { parse(c.src, { jsx: c.tsx }); return true; } catch { return false; } });
const parses = ins.map((c) => M.parse(c.src, c.tsx));
const asts = parses.map((p) => p.ast);
const nodes = asts.reduce((s, a) => s + a.count, 0), chars = ins.reduce((s, c) => s + c.src.length, 0);
const median = (xs: number[]) => xs.toSorted((a, b) => a - b)[xs.length >> 1]!;
const row = (label: string, f: (c: (typeof ins)[number], i: number) => unknown) => {
  ins.forEach(f);
  const ts: number[] = [];
  for (let r = 0; r < ROUNDS; r++) { const t0 = performance.now(); ins.forEach(f); ts.push(performance.now() - t0); }
  const ms = median(ts);
  console.log(`${label.padEnd(62)} ${ms.toFixed(1).padStart(8)} ms ${(ms * 1000 / nodes).toFixed(2).padStart(7)} µs/node`);
  return ms;
};
console.log(`corpus: ${ins.length} inputs that parse, ${chars} chars, ${nodes} nodes; Parse shape ${JSON.stringify(PARSE_SHAPE).length} chars of JSON; ${ROUNDS} rounds, median`);
const raw = ins.map((c) => acornParse(c.src, c.tsx));
row("bare acorn + TS plugin", (c) => (c.tsx ? TSX : TS).parse(c.src, { ecmaVersion: "latest", sourceType: "module", locations: true, onComment: () => {} } as any));
row("base/lite/parse.ts", (c) => parse(c.src, { jsx: c.tsx }));
row("shell acornParse alone (parse + rebuild, no boundary)", (c) => acornParse(c.src, c.tsx));
row("checkShape of the shell's value alone (copy + freeze)", (_, i) => checkShape(raw[i], PARSE_SHAPE, "x"));
row("the wrapper (FN CROSSING: shell + result checked and copied)", (c) => wrapped(c.src, c.tsx));
row("M.parse (the checked cell parse, calling the wrapper)", (c) => M.parse(c.src, c.tsx));
row("a second crossing of the result (an importing module)", (_, i) => checkShape(parses[i], PARSE_SHAPE, "y"));
row("M.preorder (the nid check)", (_, i) => M.preorder(asts[i]));
row("M.byNid", (_, i) => M.byNid(asts[i]));
row("M.parents", (_, i) => M.parents(asts[i]));
row("M.kids at every node", (_, i) => { for (const n of M.byNid(asts[i])) if (n) M.kids(n); });
