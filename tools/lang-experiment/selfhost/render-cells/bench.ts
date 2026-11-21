// µs per patch of a <div> of 100 keyed <li> children with one child moved, render.ts against shell.ts, in happy-dom.
// Each patch goes A -> B or B -> A (every child a new value, so each is patched); 5 rounds, arm order rotated.
// Run: bun selfhost/render-cells/bench.ts [patches=2000]
import { Window } from "happy-dom";
import { h } from "../../lite/jsx/h.ts";
import * as R from "../../lite/jsx/render.ts";
import * as P from "./shell.ts";

const N = Number(process.argv[2] ?? 2000), ROUNDS = 5;
const win = new Window();
const doc = win.document as unknown as Document;
const list = (order: number[]) => h("div", { class: "list" }, ...order.map((i) => h("li", { key: i, title: `t${i}` }, `item ${i}`)));
const ids = Array.from({ length: 100 }, (_x, i) => i);
// A -> B places 99 children, B -> A places 1 (render.ts's algorithm and the cells alike)
const cases: [string, number[]][] = [
  ["first moved to the end", [...ids.slice(1), 0]],
  ["no move (control)", ids],
];
const arms: [string, typeof R][] = [["render.ts", R], ["shell.ts", P as any]];

for (const [name, order] of cases) {
  const results = new Map<string, number[]>(arms.map(([a]) => [a, []]));
  for (let round = 0; round < ROUNDS + 1; round++) {
    const turn = round % 2 ? [...arms].reverse() : arms;
    for (const [arm, M] of turn) {
      const pairs = Array.from({ length: N + 1 }, (_x, i) => (i % 2 ? list(order) : list(ids)));
      const root = M.create(doc, pairs[0]) as any;
      const t0 = performance.now();
      for (let i = 1; i <= N; i++) M.patch(root, pairs[i] as any);
      const us = ((performance.now() - t0) * 1000) / N;
      const want = [...pairs[N].children].map((c: any) => `item ${c.props.key}`).join(",");
      if ([...root.childNodes].map((c: any) => c.textContent).join(",") !== want) throw new Error(`${arm} ${name}: wrong DOM`);
      if (round > 0) results.get(arm)!.push(us); // round 0 is the warm-up
    }
  }
  for (const [arm, xs] of results) console.log(`${name.padEnd(24)} ${arm.padEnd(10)} ${Math.min(...xs).toFixed(1)}-${Math.max(...xs).toFixed(1)} µs per patch`);
}
// the decision cells alone, on the data the shell gives them for one patch of the moved case
{
  const S = P.cellsNow();
  const drawn = ids.map((i) => ({ k: "elem" as const, tag: "li", key: i })), kids = [...ids.slice(1), 0].map((i) => ({ k: "elem" as const, tag: "li", key: i }));
  const text = [{ k: "text" as const, text: "item 1" }], none = new Set<string>(), recs = ids.map((i) => ({ key: i, title: `t${i}` }));
  const parts: [string, () => void][] = [
    ["childOps, 100 keyed", () => S.childOps(drawn, kids)],
    ["propOps x100", () => { for (const r of recs) S.propOps(r, r, none); }],
    ["childOps of one text x100", () => { for (let i = 0; i < 100; i++) S.childOps(text, text); }],
  ];
  for (const [name, f] of parts) {
    const xs: number[] = [];
    for (let round = 0; round < ROUNDS + 1; round++) {
      const t0 = performance.now();
      for (let n = 0; n < N; n++) f();
      if (round > 0) xs.push(((performance.now() - t0) * 1000) / N);
    }
    console.log(`cells alone: ${name.padEnd(26)} ${Math.min(...xs).toFixed(1)}-${Math.max(...xs).toFixed(1)} µs`);
  }
}
await win.happyDOM.close();
