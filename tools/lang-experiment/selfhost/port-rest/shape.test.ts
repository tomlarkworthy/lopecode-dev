// Differential test: shapeOf of lite/boundary.ts against the prototype cells of shape.ss.ts on random types, with a
// fake registry (aliases A, B; B expands to itself, so the depth limit is reached). A mutant of boolUnion is the
// control. Run: bun selfhost/port-rest/shape.test.ts [cases]
import { shapeOf as original } from "../../lite/boundary.ts";
import * as typesCells from "../../lite/types.ss.ts";
import * as shapeCells from "./shape.ss.ts";
import type { Ty } from "../../lite/types.ss.ts";
import { link } from "../../lite/link.ts";
import * as prelude from "../../prelude.runtime.ts";
import { requireChecked } from "./ss-check.ts";

requireChecked(`${import.meta.dir}/shape.ss.ts`, ["runtime.ss.ts", "types.ss.ts"]);
const N = Number(process.argv[2] ?? 20000);
const linkWith = (over: object = {}) => link({ ...typesCells, ...shapeCells, ...over } as typeof typesCells & typeof shapeCells, prelude);
const rng = (seed: number) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

const LEAVES: Ty[] = [{ k: "num" }, { k: "str" }, { k: "null" }, { k: "undef" }, { k: "void" }, { k: "unknown" }, { k: "bigint" }, { k: "symbol" }, { k: "never" },
  { k: "lit", v: true }, { k: "lit", v: false }, { k: "lit", v: "a" }, { k: "lit", v: 1 }, { k: "tv", n: "T" }, { k: "object" }];
function gen(r: () => number, d: number): Ty {
  const x = r();
  if (d > 3 || x < 0.35) return LEAVES[Math.floor(r() * LEAVES.length)];
  const kids = () => Array.from({ length: Math.floor(r() * 4) }, () => gen(r, d + 1));
  if (x < 0.45) return { k: "arr", el: gen(r, d + 1) };
  if (x < 0.55) return { k: "tup", els: kids() };
  if (x < 0.7) return { k: "union", ts: kids() };
  if (x < 0.8) {
    const props = new Map(kids().map((t, i) => [`p${i}`, { t, opt: r() < 0.3 }]));
    return { k: "rec", props, ...(r() < 0.1 ? { index: { k: "num" } as Ty } : {}), ...(r() < 0.1 ? { calls: [{ k: "fn", tps: [], ps: [], ret: { k: "num" } }] } : {}) } as Ty;
  }
  if (x < 0.85) return { k: "fn", tps: [], ps: [], ret: { k: "num" } };
  const n = ["Promise", "Array", "ReadonlyArray", "A", "B", "Map"][Math.floor(r() * 6)];
  return { k: "named", n, args: n === "Array" || n === "ReadonlyArray" || n === "Map" ? kids().slice(0, 1) : [] };
}
const expand = (t: Ty): Ty => (t.k === "named" && t.n === "A" ? { k: "arr", el: { k: "num" } } : t.k === "named" && t.n === "B" ? { k: "named", n: "B", args: [] } : t);
const isAlias = (n: string) => n === "A" || n === "B";
// the prototype's tagged error as the original's { error }
const untag = (s: { k: string; error?: string }) => (s.k === "error" ? { error: s.error } : s);

let fail = 0;
for (const [name, S] of [["prototype", linkWith()], ["mutant boolUnion (no merge)", linkWith({ boolUnion: () => (ts: readonly unknown[]) => ({ k: "union", ts: [...ts] }) })]] as const) {
  let differ = 0, errors = 0, threw = 0;
  const r = rng(7);
  for (let i = 0; i < N; i++) {
    const t = gen(r, 0);
    const b = untag(S.shapeOf(t, expand, isAlias));
    let a: unknown;
    // the original reads args[0] of Array without a check: Array with no argument throws there
    try { a = original(t, expand, isAlias); } catch (e) { threw++; if (!("error" in b)) differ++; continue; }
    if ("error" in (a as object)) errors++;
    if (!Bun.deepEquals(a, b, true)) differ++;
  }
  console.log(`${name}: ${differ} of ${N} types differ from the original (${errors} of them are errors in the original; ${threw} threw in the original, each an error in the prototype unless counted as differing)`);
  if (name === "prototype" ? differ > 0 : differ === 0) fail++;
}
console.log(fail ? `FAIL ${fail}` : "pass");
process.exit(fail ? 1 : 0);
