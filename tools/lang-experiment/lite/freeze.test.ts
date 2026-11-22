// bun lite/freeze.test.ts: SsMap/SsSet keep working as a Map and Set, refuse writes once frozen, and deepFreeze's walk
import { SsMap, SsSet, deepFreeze, freeze, borrow, yielded, out } from "./freeze.ts";
import { equals, snapshot } from "../prelude.runtime.ts";
let pass = 0, fail = 0;
const ok = (c: boolean, what: string) => { if (c) pass++; else { fail++; console.log(`FAIL ${what}`); } };
const throws = (f: () => unknown) => { try { f(); return false; } catch (e) { return e instanceof TypeError; } };
const m = new SsMap([["a", 1], ["b", 2]]), s = new SsSet([1, 2]);
ok(m instanceof Map && s instanceof Set && new Map() instanceof SsMap && new Set() instanceof SsSet, "instanceof both ways");
ok(m.size === 2 && [...m].join() === "a,1,b,2" && [...m.keys()].join() === "a,b" && [...s].join() === "1,2", "iteration and size");
ok(new SsMap(m).get("b") === 2 && new Map(m).size === 2 && [...new SsSet(s)].length === 2, "new Map(m) copies");
ok(JSON.stringify([...m]) === '[["a",1],["b",2]]' && JSON.stringify(Object.fromEntries(m)) === '{"a":1,"b":2}', "spread and JSON of entries");
ok(Object.prototype.toString.call(m) === "[object Map]" && SsMap.name === "Map" && SsSet.name === "Set", "tag and name");
const sc = structuredClone(m);
ok(sc instanceof Map && Object.getPrototypeOf(sc) === Map.prototype && sc.get("a") === 1, "structuredClone gives a native Map");
ok(snapshot(m).get("b") === 2 && equals(m, new Map([["a", 1], ["b", 2]])) && !equals(m, new Map([["a", 1]])), "snapshot, equals against a native copy");
ok(Object.getPrototypeOf((SsMap as any).groupBy([1, 2, 3], (x: number) => x % 2)) === SsMap.prototype, "SsMap.groupBy gives an SsMap");
if (typeof (Set.prototype as any).union === "function") ok(Object.getPrototypeOf((s as any).union(new Set([3]))) === SsSet.prototype, "Set algebra gives an SsSet");
freeze(m); freeze(s);
ok(throws(() => m.set("c", 3)) && throws(() => m.delete("a")) && throws(() => m.clear()) && m.size === 2, "a frozen SsMap refuses set/delete/clear");
ok(throws(() => s.add(3)) && throws(() => s.delete(1)) && throws(() => s.clear()) && s.size === 2, "a frozen SsSet refuses add/delete/clear");
const m2 = new SsMap<string, number>();
ok(throws(() => m2.set("k", freeze(m2).size)) && m2.size === 0, "m.set(k, freeze(m).size) throws (method on the prototype)");
ok(m.get("a") === 1 && m.has("b"), "a frozen SsMap reads");
const cyc: any = { xs: [1] }; cyc.self = cyc; cyc.xs.push(cyc);
deepFreeze(cyc);
ok(Object.isFrozen(cyc) && Object.isFrozen(cyc.xs), "a cycle");
const shared = [1], two = { a: shared, b: shared };
deepFreeze(two);
ok(Object.isFrozen(shared) && two.a === two.b, "a shared subtree is frozen once and stays shared");
const nk = new Map([["k", 1]]), nested = { m: nk, arr: [new Set([1])], mm: new SsMap([[nk, nk]]), ss: new SsSet([nk]) };
deepFreeze(nested);
const nm = nested.m as any;
ok(Object.getPrototypeOf(nm) === SsMap.prototype && throws(() => nm.set("j", 2)) && nk.size === 1, "a native Map in a record is replaced by a frozen SsMap copy");
ok(Object.getPrototypeOf(nested.arr[0]) === SsSet.prototype && throws(() => (nested.arr[0] as any).add(2)), "a native Set in an array slot is replaced");
const [mk] = [...nested.mm.keys()] as any[], [sk] = [...nested.ss] as any[];
ok(mk === nm && nested.mm.get(mk) === nm && sk === nm, "a native Map as a key, a value and a member: one copy, the map refilled");
const top = deepFreeze(new Map([["a", [1]]])) as any;
ok(Object.getPrototypeOf(top) === SsMap.prototype && Object.isFrozen(top.get("a")), "a native Map at the top: its frozen copy");
const shut = Object.freeze([new Map([["a", 1]])]);
deepFreeze(shut);
ok(Object.getPrototypeOf(shut[0]) === Map.prototype && !throws(() => (shut[0] as any).set("b", 2)), "a native Map in an already frozen array cannot be replaced (stays writable)");
class C { xs = [1]; }
const inst = new C(), fn = () => 1, ta = new Float32Array(2), d = new Date(0);
deepFreeze({ inst, fn, ta, d });
ok(!Object.isFrozen(inst) && !Object.isFrozen(inst.xs) && !Object.isFrozen(fn) && !Object.isFrozen(d), "class instances, functions, Dates are left as they are");
ta[0] = 5;
ok(ta[0] === 5, "a typed array is left writable");
const lent = [1];
borrow(lent);
ok(yielded(lent) === lent && !Object.isFrozen(lent), "a value lent with borrow is not frozen when yielded");
ok(Object.isFrozen(freeze(lent)), "freeze of a lent value still freezes it");
const g = out((function* () { yield [1]; })() as any) as any;
ok(Object.isFrozen(g.next().value), "out: a generator's yields are frozen");
const p = await (out(Promise.resolve({ xs: [1] })) as any);
ok(Object.isFrozen(p) && Object.isFrozen(p.xs), "out: a promise's resolved value is frozen");
const big = Array.from({ length: 1000 }, (_, i) => ({ i }));
deepFreeze(big);
ok(deepFreeze(big) === big && Object.isFrozen(big[999]), "again: the same value, O(1)");
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

// B7 (2026-11-22): out(v, 1) publishes a quick cell's value unfrozen unless freezeAll is on
test("b7_quick_out_and_freezeAll", () => {
  const a = out({ xs: [1] }, 1);
  expect(Object.isFrozen(a.xs)).toBe(false);
  expect(Object.isFrozen(out({ xs: [1] }).xs)).toBe(true);
  (globalThis as { SS_FREEZE_ALL?: boolean }).SS_FREEZE_ALL = true;
  try { expect(Object.isFrozen(out({ xs: [1] }, 1).xs)).toBe(true); } finally { delete (globalThis as { SS_FREEZE_ALL?: boolean }).SS_FREEZE_ALL; }
});
