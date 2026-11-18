// Differential test: the original types.ts (selfhost/types.orig.ts, a copy taken before the port) against the
// linked SoundScript cells (lite/types.ts), on seeded random types. Compares every exported function's result,
// with Maps by entries and own keys counted (an absent key differs from a key holding undefined).
// Run: bun selfhost/diff.ts [count]
import * as A from "./types.orig.ts";
import * as B from "../lite/types.ts";
import type { Ty, Fn } from "../lite/types.ts";

let seed = 12345;
const rand = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
const NAMES = ["T", "U", "V", "Mut", "Borrowed", "Promise", "Foo"];
function gen(d: number): Ty {
  const leaf = (): Ty => pick<() => Ty>([() => A.NUM, () => A.STR, () => A.NULL, () => A.UNDEF, () => A.NEVER, () => A.UNKNOWN, () => A.ERR, () => A.TRUE, () => A.FALSE,
    () => A.lit(pick(["a", "b", 1, 2, true, false])), () => ({ k: "tv", n: pick(NAMES) }), () => A.OBJECT, () => A.VOID])();
  if (d <= 0 || rand() < 0.3) return leaf();
  const sub = () => gen(d - 1);
  return pick<() => Ty>([
    () => A.arr(sub()), () => ({ k: "tup", els: [sub(), sub()] }), () => ({ k: "union", ts: [sub(), sub(), sub()] }),
    () => A.union([sub(), sub(), sub()]), () => A.named(pick(NAMES), ...(rand() < 0.5 ? [sub()] : [])), () => fn(d - 1),
    () => ({ ...A.rec({ a: sub(), b: sub() }, rand() < 0.5 ? ["b"] : []), ...(rand() < 0.3 ? { index: sub() } : {}), ...(rand() < 0.3 ? { calls: [fn(d - 1)] } : {}) }),
  ])();
}
function fn(d: number): Fn {
  const f: Fn = { k: "fn", tps: rand() < 0.5 ? ["T"] : [], ps: [{ n: "x", t: gen(d), opt: rand() < 0.3 }], ret: gen(d) };
  return rand() < 0.3 ? { ...f, rest: gen(d) } : f;
}
const ser = (v: unknown): string => {
  const go = (x: unknown): unknown => {
    if (x instanceof Map) return { $map: [...x].map(([k, y]) => [k, go(y)]) };
    if (x instanceof Set) return { $set: [...x] };
    if (Array.isArray(x)) return x.map(go);
    if (x && typeof x === "object") return Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k] === undefined ? "$undefined" : go((x as Record<string, unknown>)[k])]));
    return x;
  };
  try { return JSON.stringify(go(v)) ?? "undefined"; } catch (e) { return `throws ${(e as Error).message}`; }
};
const n = Number(process.argv[2] ?? 3000);
const counts = new Map<string, number>(), diffs: string[] = [];
const cmp = (label: string, f: () => unknown, g: () => unknown) => {
  counts.set(label, (counts.get(label) ?? 0) + 1);
  let a: string, b: string;
  try { a = ser(f()); } catch (e) { a = `throws ${(e as Error).message}`; }
  try { b = ser(g()); } catch (e) { b = `throws ${(e as Error).message}`; }
  if (a !== b && diffs.length < 10) diffs.push(`${label}: original ${a.slice(0, 300)}\n   port     ${b.slice(0, 300)}`);
  if (a !== b) counts.set(label + " DIFF", (counts.get(label + " DIFF") ?? 0) + 1);
};
for (let i = 0; i < n; i++) {
  const t = gen(4), u = gen(3), w = gen(2);
  const m = new Map<string, Ty>([[pick(NAMES), u], [pick(NAMES), w]]);
  const depth = Math.floor(rand() * 8);
  cmp("show", () => A.show(t), () => B.show(t));
  cmp("show depth", () => A.show(t, depth), () => B.show(t, depth));
  cmp("union", () => A.union([t, u, w]), () => B.union([t, u, w]));
  cmp("members", () => A.members(t), () => B.members(t));
  cmp("subst", () => A.subst(t, m), () => B.subst(t, m));
  cmp("subst empty", () => A.subst(t, new Map()), () => B.subst(t, new Map()));
  cmp("hasTv", () => A.hasTv(t), () => B.hasTv(t));
  cmp("hasTv names", () => A.hasTv(t, new Set(["T", "U"])), () => B.hasTv(t, new Set(["T", "U"])));
  cmp("widen", () => A.widen(t), () => B.widen(t));
  cmp("isPrimitive", () => A.isPrimitive(t), () => B.isPrimitive(t));
  // known: the original gives undefined for Mut or Borrowed with no type argument (the registry never makes one), the port t
  if (t.k === "named" && (t.n === "Mut" || t.n === "Borrowed") && !t.args.length) counts.set("unwrap argless (known: original undefined, port t)", (counts.get("unwrap argless (known: original undefined, port t)") ?? 0) + 1);
  else cmp("unwrap", () => A.unwrap(t), () => B.unwrap(t));
  cmp("isNamed", () => A.isNamed(t, "Mut"), () => B.isNamed(t, "Mut"));
  const opt = rand() < 0.5;
  cmp("propT", () => A.propT({ t, opt }), () => B.propT({ t, opt }));
  const f = fn(3);
  // the original's counter is its own module's; the port's is the caller's, given as fresh
  const before = Number(/'(\d+)$/.exec(A.instantiate({ k: "fn", tps: ["Z"], ps: [], ret: A.NUM }).tvs[0]!)![1]);
  cmp("instantiate", () => A.instantiate(f), () => B.instantiate(f, before));
}
cmp("tpNames", () => A.tpNames({ params: [{ name: "T" }, { name: { name: "U" } }] }), () => B.tpNames({ params: [{ name: "T" }, { name: { name: "U" } }] }));
cmp("tpNames none", () => A.tpNames(undefined), () => B.tpNames(undefined));
cmp("rec", () => A.rec({ a: A.NUM, b: A.STR }, ["b"]), () => B.rec({ a: B.NUM, b: B.STR }, ["b"]));
cmp("constants", () => [A.NUM, A.STR, A.BIGINT, A.NULL, A.UNDEF, A.VOID, A.NEVER, A.UNKNOWN, A.OBJECT, A.ERR, A.SYMBOL, A.TRUE, A.FALSE, A.BOOL, [...A.WRAPPERS]],
  () => [B.NUM, B.STR, B.BIGINT, B.NULL, B.UNDEF, B.VOID, B.NEVER, B.UNKNOWN, B.OBJECT, B.ERR, B.SYMBOL, B.TRUE, B.FALSE, B.BOOL, [...B.WRAPPERS]]);
for (const d of diffs) console.log("DIFF", d);
console.log([...counts].map(([k, v]) => `${k}: ${v}`).join("\n"));
const total = [...counts].filter(([k]) => k.endsWith("DIFF")).reduce((s, [, v]) => s + v, 0);
console.log(total ? `${total} difference(s)` : "no differences");
process.exit(total ? 1 : 0);
