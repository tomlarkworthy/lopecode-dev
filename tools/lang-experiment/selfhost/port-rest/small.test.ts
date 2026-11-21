// Differential tests: each cell of small.ss.ts against the code it comes from, on random inputs, and one mutant per
// cell as the control (the test must see it differ). Where the original is reachable through an export it is called
// (makeRandom, kidOf, h, cross, checkCells); where it is a statement inside a function, the oracle is that statement
// evaluated from the original file's AST (checkKey) or copied with its line numbers (the LRU and refusal oracles).
// Run: bun selfhost/port-rest/small.test.ts [cases]
import { readFileSync } from "node:fs";
import { parse, type Node } from "../../lite/parse.ts";
import * as rtCells from "../../lite/runtime.ss.ts";
import * as smallCells from "./small.ss.ts";
import { link } from "../../lite/link.ts";
import { mut, freeze } from "../../lite/runtime-ss.ts";
import { makeRandom } from "../../prelude.runtime.ts";
import { kidOf } from "../../lite/jsx/render.ts";
import { h } from "../../lite/jsx/h.ts";
import { cross } from "../../lite/boundary.ts";
import { checkCells } from "../../lite/stdlib/runtime.ts";
import { checkCellsProto } from "./small-shell.ts";
import { requireChecked } from "./ss-check.ts";

requireChecked(`${import.meta.dir}/small.ss.ts`, ["runtime.ss.ts"]);
const N = Number(process.argv[2] ?? 3000);
const L = (over: object = {}) => link({ ...rtCells, ...smallCells, ...over } as typeof rtCells & typeof smallCells, { mut, freeze });
const rng = (seed: number) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const eq = (a: unknown, b: unknown) => Bun.deepEquals(a, b, true);
const VALUES = () => [0, -1, 1.5, NaN, "", "a", "x".repeat(50), true, false, null, undefined, 10n, Symbol("s"), [1, 2], [], {}, { a: 1 }, () => 1, new Map(), new Date(0), Object.create(null)];

// oracle: the key expression of stdlib/runtime.ts check, its text taken from the file's AST
const keyOracle = (() => {
  const src = readFileSync(`${import.meta.dir}/../../lite/stdlib/runtime.ts`, "utf8");
  const P = parse(src);
  const fn = (P.program.body as Node[]).map((s) => (s.type === "ExportNamedDeclaration" ? s.declaration : s)).find((d) => d?.type === "FunctionDeclaration" && d.id.name === "check");
  const decl = fn.body.body.find((s: Node) => s.type === "VariableDeclaration" && s.declarations[0].id.name === "key").declarations[0].init;
  return new Function("source", "tsx", "outside", `return ${src.slice(decl.start, decl.end)};`) as (s: string, t: boolean, o: unknown) => string;
})();
// oracle: an LRU touch as stdlib/runtime.ts compiler keyFor does it (lines 108-116, copied)
const keyForOracle = (keys: Map<string, string>, made: { n: number }, js: string, caller: string, ISLANDS: number) => {
  let key = keys.get(js);
  if (key) keys.delete(js);
  else key = `island${++made.n}:${caller}`;
  keys.set(js, key);
  if (keys.size > ISLANDS) keys.delete(keys.keys().next().value!);
  return key;
};
// oracle: the refusal of stdlib/runtime.ts compiler.for (lines 140-142, copied)
const refusedOracle = (cells: { name: string; status: string; errors: unknown[] }[], caller: string, order: string[]) => {
  const verdict = new Map(cells.map((c) => [c.name, c.status === "ok" && !c.errors.length]));
  return [caller, ...order].filter((n) => !verdict.get(n));
};

type Case = { name: string; run: (S: ReturnType<typeof L>, r: () => number) => boolean; mutant: object; n?: number };
const cases: Case[] = [
  { name: "checkKey", mutant: { checkKey: () => (source: string, tsx: boolean) => (tsx ? "x" : "s") + "\u0000" + source },
    run: (S, r) => { const s = pick(r, ["", "a = 1", "x\u0000y"]), t = r() < 0.5, o = pick(r, [null, [], [{ name: "a" }], [{ name: "b", view: true }, { name: "c" }]]); return S.checkKey(s, t, o) === keyOracle(s, t, o); } },
  { name: "lruTouch + islandKey (compiler keyFor)", mutant: { lruTouch: () => (m: Map<string, unknown>, key: string, v: unknown) => new Map([...m, [key, v]]) },
    run: (S, r) => {
      const a = new Map<string, string>(), made = { n: 0 };
      let b: Map<string, string> = new Map(), bmade = 0;
      for (let i = 0; i < 40; i++) {
        const js = `t${Math.floor(r() * 12)}`, caller = pick(r, ["c1", "c2"]);
        const ka = keyForOracle(a, made, js, caller, 8);
        const k = S.islandKey(b.get(js), bmade, caller);
        bmade = k.made;
        b = S.lruTouch(b, js, k.key, 8);
        if (ka !== k.key || !eq([...a], [...b])) return false;
      }
      return true;
    } },
  { name: "refusedCells", mutant: { refusedCells: () => (vs: readonly { name: string; ok: boolean }[], caller: string, order: readonly string[]) => order.filter((n) => !vs.find((v) => v.name === n)?.ok) },
    run: (S, r) => {
      const names = ["a", "b", "c", "d"];
      const cells = Array.from({ length: Math.floor(r() * 6) }, () => ({ name: pick(r, names), status: pick(r, ["ok", "rejected", "blocked"]), errors: r() < 0.2 ? [1] : [] }));
      const caller = pick(r, names), order = names.filter(() => r() < 0.5);
      return eq(refusedOracle(cells, caller, order), S.refusedCells(cells.map((c) => ({ name: c.name, ok: c.status === "ok" && !c.errors.length })), caller, order));
    } },
  { name: "poolSize", mutant: { poolSize: () => (c: number | undefined) => Math.max(1, Math.min(8, c ?? 2)) },
    run: (S, r) => { const c = r() < 0.2 ? undefined : Math.floor(r() * 20); return S.poolSize(c) === Math.max(1, Math.min(8, (c ?? 2) - 1)); } },
  { name: "hash + randomStep (makeRandom)", mutant: { imul: () => (a: number, b: number) => (a * b) | 0 },
    run: (S, r) => {
      const seed = Array.from({ length: Math.floor(r() * 12) }, () => String.fromCharCode(32 + Math.floor(r() * 300))).join("");
      const f = makeRandom(seed);
      let a = S.hash(seed);
      for (let i = 0; i < 20; i++) { const s = S.randomStep(a); a = s.a; if (s.value !== f()) return false; }
      return true;
    } },
  { name: "imul (all int32 corners)", mutant: { imul: () => (a: number, b: number) => (a * b) | 0 },
    run: (S, r) => { const v = () => pick(r, [0, 1, -1, 2 ** 31 - 1, -(2 ** 31), 2 ** 32, 0xffff, 0x10000, 16777619, 2166136261, 0.5, -7.9, NaN, Math.floor((r() - 0.5) * 2 ** 33)]); const a = v(), b = v(); return Object.is(S.imul(a, b), Math.imul(a, b)); } },
  { name: "asText (via kidOf)", mutant: { asText: () => (x: unknown) => String(x) },
    run: (S, r) => { const x = pick(r, VALUES()); return S.asText(x) === (kidOf(x) as { text: string }).text; } },
  { name: "keyOf (via kidOf of an h element)", mutant: { keyOf: () => (k: unknown) => (typeof k === "string" ? k : undefined) },
    run: (S, r) => { const k = pick(r, VALUES()); return eq(S.keyOf(k), (kidOf(h("li", { key: k })) as { key: unknown }).key); } },
  { name: "elemRecord (h, string keys)", mutant: { elemRecord: (flat: (x: readonly unknown[]) => unknown[]) => (tag: string | null, props: object | null, children: readonly unknown[]) => ({ tag: tag ?? "", props: { ...props }, children }) },
    run: (S, r) => {
      const tag = pick(r, [null, "div", "p"]), props = pick(r, [null, {}, { a: 1, key: "k" }, { onClick: () => 1, b: undefined }]);
      const children = Array.from({ length: Math.floor(r() * 4) }, () => pick(r, [1, "t", null, false, [2, [3, null]], true]));
      const o = h(tag, props, ...children), p = S.elemRecord(tag, props, children);
      return eq({ tag: o.tag, props: { ...o.props }, children: [...o.children] }, p);
    } },
  { name: "describeData (via cross's message)", mutant: { describeData: () => (v: unknown) => (v === null ? "null" : typeof v) },
    run: (S, r) => {
      const v = pick(r, VALUES().filter((x) => typeof x !== "number"));
      let msg = "";
      try { cross(v, { k: "num" }, "r.p"); } catch (e) { msg = String((e as Error).message); }
      const d = S.describeData(v);
      return d === null ? typeof v === "object" && v !== null && !Array.isArray(v) : msg === `p: expected number, found ${d}`;
    } },
];

let fail = 0;
for (const c of cases) {
  const n = c.n ?? N;
  for (const [arm, S] of [["prototype", L()], ["mutant", L(c.mutant)]] as const) {
    const r = rng(11);
    let differ = 0;
    for (let i = 0; i < n; i++) { let same = false; try { same = c.run(S, r); } catch { same = false; } if (!same) differ++; }
    console.log(`${c.name}, ${arm}: ${differ} of ${n} differ`);
    if (arm === "prototype" ? differ > 0 : differ === 0) fail++;
  }
}
// the one difference found by hand: a symbol-keyed prop is kept by h's spread and dropped by the entries copy
{
  const s = Symbol("k");
  const o = h("p", { [s]: 1 }), p = L().elemRecord("p", { [s]: 1 } as never, []);
  console.log(`elemRecord, symbol key: h keeps it ${s in o.props}, prototype keeps it ${s in p.props}`);
}
// checkCells: the original against a shell over standIns, on module texts with cells that do not parse
{
  const r = rng(5);
  const CELLS = ["export const a = () => 1;", "export const a = () => (", "export const b = (a) => a + 1;", "export const c = () =>\n  {\n", "export const b = () =>\n 2 +", "x y z", "export type T = number;"];
  let differ = 0, unparsed = 0, mdiffer = 0;
  const M = 150;
  for (let i = 0; i < M; i++) {
    const texts = Array.from({ length: 1 + Math.floor(r() * 5) }, () => pick(r, CELLS));
    const run = (f: typeof checkCells) => { try { const x = f(texts); return { source: x.source, unparsed: [...(x.result.unparsed ?? [])], ok: x.result.ok, cells: x.result.cells.map((c) => [c.name, c.status]) }; } catch (e) { return { threw: String((e as Error).message).slice(0, 80) }; } };
    const a = run(checkCells), b = run((t) => checkCellsProto(t, L())), m = run((t) => checkCellsProto(t, L({ standIns: (() => (cells: readonly { parseError: string | null }[]) => ({ texts: cells.map((_, i) => i), unparsed: [] })) as never })));
    if ("unparsed" in a && a.unparsed.length) unparsed++;
    if (!eq(a, b)) differ++;
    if (!eq(a, m)) mdiffer++;
  }
  console.log(`checkCells: prototype ${differ} of ${M} module texts differ (${unparsed} with a cell that does not parse); mutant standIns ${mdiffer} of ${M}`);
  if (differ > 0 || mdiffer === 0) fail++;
}
console.log(fail ? `FAIL ${fail}` : "pass");
process.exit(fail ? 1 : 0);
