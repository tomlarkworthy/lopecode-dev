// Unit tests for the checker's walks over a recursive alias (holdsWith, owIter, ixHidden, Registry.sub): what
// each finds, and the work it does, counted as calls of the registry cell rgExpand (registry.ts's Registry.expand until
// 2026-11-22). Run: bun lite/walks.test.ts
import { runCheck, mdRegistry, RG, type Sources } from "./core.ts";
import { parseTree } from "./acorn/index.ts";
import { holdsWith, named, UNKNOWN, type Ty } from "./types.ts";
import { ixHidden, ixActionIn, owIter, mdCheckSources } from "./infer-ss.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail: unknown = "") => {
  if (cond) { pass++; console.log(`pass ${name}`); } else { fail++; console.log(`FAIL ${name}: ${JSON.stringify(detail)}`); }
};
let expansions = 0;
const COUNTED = { ...RG, rgExpand: (...a: Parameters<typeof RG.rgExpand>) => { expansions++; return RG.rgExpand(...a); } };
const checkSources = (src: Sources) => runCheck(mdCheckSources, src, {}, COUNTED).result;
const counted = <V>(f: () => V): [V, number] => { expansions = 0; const v = f(); return [v, expansions]; };

// Node: a union of 122 records (as many as the AST types), each holding Node four times
const N = 122;
const TYPES = [
  `type Node = ${Array.from({ length: N }, (_, i) => `R${i}`).join(" | ")};`,
  ...Array.from({ length: N }, (_, i) => `type R${i} = { readonly type: "R${i}"; readonly start: number; readonly a: Node | null; readonly b: readonly Node[]; readonly c: Node | null; readonly d: readonly (Node | null)[] };`),
  `type L1 = { readonly next: L2 | null; readonly on: Listener | null };`,
  `type L2 = { readonly back: L1; readonly v: number };`,
  `type B = { readonly x: { readonly y: Iterable<number> } };`,
  `type T10 = { readonly a: readonly B[][][][][][][][][][]; readonly b: B };`,
  `type HA = { readonly kids: readonly HA[]; readonly u: Action<[]> };`,
  `type HU = { readonly kids: readonly HU[]; readonly u: unknown };`,
  `type Deep13 = Listener[][][][][][][][][][][][][];`,
  `type MS = Mut<number[]> | number;`,
].join("\n");
// the registry a check of these declarations uses, and the record of its methods the cells take
const G = mdRegistry(true, null, COUNTED);
const parsed = parseTree(TYPES + "\nconst z = (): number => 1;", false);
if (!parsed.ok) throw new Error(parsed.message);
G.loadUser(parsed.ast, false, []);
const reg = G.R;
const R = reg.core();
const hidden = (s: Ty, t: Ty) => ixHidden({ R, opaque: null, find: (x: Ty) => ixActionIn(R, x) }, s, t, 0);
const holds = holdsWith(reg.ops);
const T = (n: string) => named(n);

{
  const [w, n] = counted(() => holds(T("Node"), ["Listener"]));
  ok(`holds(Node, [Listener]): null, ${n} expansions (at most 1000)`, w === null && n <= 1000, { w, n });
  const [w2] = counted(() => holds(T("L2"), ["Listener"]));
  ok("holds finds a Listener inside a cycle", w2 === "Listener", w2);
  const [w3] = counted(() => holds(T("Deep13"), ["Listener"]));
  ok("holds stops at its depth limit: a Listener 13 arrays deep is not found", w3 === null, w3);
}
{
  const [w, n] = counted(() => owIter(R, T("Node")));
  ok(`owIter(Node): null, ${n} expansions (at most 1000)`, w === null && n <= 1000, { w, n });
  const [w2] = counted(() => owIter(R, T("T10")));
  ok("owIter finds an alias walked shallow after it was cut off deep", w2 === "Iterable<number>", w2);
}
{
  const [w, n] = counted(() => hidden(T("Node"), T("Node")));
  ok(`hidden(Node, Node): null, ${n} expansions (at most 1000)`, w === null && n <= 1000, { w, n });
  const [w2] = counted(() => hidden(T("HA"), T("HU")));
  ok("hidden finds an Action under a recursive type's unknown", w2 === "Action<[]>", w2);
  const [w3] = counted(() => hidden(T("HA"), UNKNOWN));
  ok("hidden finds an Action given unknown", w3 === "Action<[]>", w3);
}
{
  const orNull = (t: Ty): Ty => ({ k: "union", ts: [t, { k: "null" }] });
  const [w, n] = counted(() => reg.sub(T("Node"), orNull(T("Node"))));
  ok(`sub(Node, Node | null): true, ${n} expansions (at most 500)`, w && n <= 500, { w, n });
  const [w2, n2] = counted(() => reg.sub(T("R7"), T("Node")));
  ok(`sub(R7, Node): true, ${n2} expansions (at most 10)`, w2 && n2 <= 10, { w2, n2 });
  // sub unwraps a Mut member before it scans the union, so this is false, as before the fast path
  ok("sub(MS, MS | null) with MS = Mut<number[]> | number: false", !reg.sub(T("MS"), orNull(T("MS"))));
}
{
  // a cell that captures a Node in a callback, and one that passes a narrowed Node | null on; before the walks were
  // bounded, checking these took 18071772 and 15913355 expansions (0.9 s and 3.4 s)
  const cells = [
    "const g = () => (ns: readonly Node[], a: Node): Node | undefined => ns.find((x) => x.start > a.start);",
    "const h = () => (x: Node): number => x.start;\nconst g = (h: (x: Node) => number) => (n: R1): number => { const x = n.a; return x !== null ? h(x) : 0; };",
  ];
  for (const c of cells) {
    const [r, n] = counted(() => checkSources({ cells: TYPES + "\n" + c, tsx: false }));
    const g = r.cells.find((x) => x.name === "g");
    ok(`checkSources of a cell over Node: g ok, ${n} expansions (at most 100000)`, g?.status === "ok" && n <= 100000, { status: g?.status, n });
  }
}

console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
