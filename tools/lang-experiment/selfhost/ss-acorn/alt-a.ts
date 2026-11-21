// Alternative (a), no new rule: checked code cannot call the parser, so a text it wants parsed leaves as a cell value,
// an Observable JavaScript cell parses it, and the tree comes back as data (S11) into another checked cell. Against the
// rule, where the checked cell calls acornParse. Both in a real Observable Runtime (rt.ts), same text each round,
// a new text value each round (the outside cell src redefined). Median of ROUNDS rounds. Run: bun alt-a.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "./rt.ts";
import { acornParse } from "./shell/acorn-shell.ts";

const COPY = process.env.SSA_COPY ?? "rule";
const TYPES = readFileSync(join(import.meta.dir, "ss/acorn-types.ss.ts"), "utf8");
const text = readFileSync(join(import.meta.dir, "base/lite/events.ss.ts"), "utf8");
const ROUNDS = 15;
const median = (xs: number[]) => xs.toSorted((a, b) => a - b)[xs.length >> 1]!;
async function rounds(src: string, outside: Record<string, [string[], (...a: any[]) => unknown]>, reader: string) {
  const L = await load(COPY, src, outside);
  const bad = L.checked.cells.filter((c: any) => c.status !== "ok");
  if (bad.length) throw new Error(bad.map((c: any) => `${c.name} ${JSON.stringify(c.errors)}`).join("; "));
  const first = await L.value(reader);
  const ts: number[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const t0 = performance.now();
    L.redefine("src", [], () => text + `\n// ${i}`);
    const r = await L.value(reader);
    ts.push(performance.now() - t0);
    if (!r.ok) throw r.e;
  }
  return { ms: median(ts), first };
}
// (a): the text goes out as the value of a checked cell, and the tree comes back through the cell tree
const a = await rounds(TYPES + `\nexport const want = (src: string) => src;\nexport const count = (tree: Parse) => (tree.ok ? tree.ast.count : -1);`,
  { src: [[], () => text], tree: [["want"], (want: string) => acornParse(want, false)] }, "count");
// the rule: the checked cell calls the parser
const c = await rounds(TYPES + `\nexport const count = (src: string, acornParse: (text: string, jsx: boolean) => Parse) => { const p = acornParse(src, false); return p.ok ? p.ast.count : -1; };`,
  { src: [[], () => text], acornParse: [[], () => acornParse] }, "count");
console.log(`${COPY}: events.ss.ts, ${JSON.stringify(a.first.v)} nodes; per new text: (a) through a cell round trip ${a.ms.toFixed(2)} ms; (c) the rule, a call ${c.ms.toFixed(2)} ms`);
process.exit(0);
