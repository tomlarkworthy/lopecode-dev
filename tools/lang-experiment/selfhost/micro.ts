// Median time of 20000 calls of union, show, subst and widen on fixed types, original (types.orig.ts) and port.
// A measurement, not a test. Run: bun selfhost/micro.ts
import * as A from "./types.orig.ts";
import * as B from "../lite/types.ts";
const mk = (T: typeof A) => {
  const f = { k: "fn" as const, tps: ["T"], ps: [{ n: "x", t: { k: "tv" as const, n: "T" }, opt: false }], ret: T.arr({ k: "tv", n: "T" }) };
  const r = T.rec({ a: T.NUM, b: T.union([T.STR, T.UNDEF]), c: f }, ["b"]);
  return { xs: [T.lit("a"), T.STR, T.lit(1), r, T.named("Promise", r), T.BOOL, f], r, m: new Map([["T", T.union([T.NUM, T.NULL])]]) };
};
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const time = (f: () => unknown) => { const ms: number[] = []; for (let k = 0; k < 15; k++) { const t0 = performance.now(); for (let i = 0; i < 20000; i++) f(); ms.push(performance.now() - t0); } return median(ms).toFixed(1); };
for (let round = 0; round < 2; round++) for (const [label, T] of [["original", A], ["port", B]] as const) {
  const { xs, r, m } = mk(T as typeof A);
  console.log(`${label}: union ${time(() => T.union(xs))} ms, show ${time(() => T.show(r))} ms, subst ${time(() => T.subst(r, m))} ms, widen ${time(() => T.widen(T.union(xs)))} ms (20000 calls, median of 15)`);
}
