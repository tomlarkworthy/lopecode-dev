// bun lite/freeze.test.ts: SsMap/SsSet keep working as a Map and Set, refuse writes once frozen, and deepFreeze's walk
import { SsMap, SsSet, deepFreeze, freeze, borrow, yielded, out, closure, methods } from "./freeze.ts";
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
const nk = new Map([["k", 1]]), orig = { m: nk, arr: [new Set([1])], mm: new SsMap([[nk, nk]]), ss: new SsSet([nk]) };
const nested = deepFreeze(orig);
ok(nested !== orig && orig.m === nk && !Object.isFrozen(orig), "a native Map or Set is published in a copy of each container on its path; the originals are left as they are");
const nm = nested.m as any;
ok(Object.getPrototypeOf(nm) === SsMap.prototype && throws(() => nm.set("j", 2)) && nk.size === 1, "a native Map in a record is replaced by a frozen SsMap copy");
ok(Object.getPrototypeOf(nested.arr[0]) === SsSet.prototype && throws(() => (nested.arr[0] as any).add(2)), "a native Set in an array slot is replaced");
const [mk] = [...nested.mm.keys()] as any[], [sk] = [...nested.ss] as any[];
ok(mk === nm && nested.mm.get(mk) === nm && sk === nm, "a native Map as a key, a value and a member: one copy, in a copy of the map");
const top = deepFreeze(new Map([["a", [1]]])) as any;
ok(Object.getPrototypeOf(top) === SsMap.prototype && Object.isFrozen(top.get("a")), "a native Map at the top: its frozen copy");
const shut = Object.freeze([new Map([["a", 1]])]);
ok(throws(() => deepFreeze(shut)), "a native Map in an already frozen array cannot be replaced: deepFreeze throws (2026-11-22; it was left writable)");
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

// closures (2026-11-22, cause A): a registered function's captures are frozen when it is published, not when it is made
{
  const xs = [0], ys = [1];
  const g = closure(() => ys.length, (i) => (i < 0 ? 1 : ys));
  const f = closure(() => xs.length + g(), (i) => (i < 0 ? 2 : i === 0 ? g : xs));
  xs.push(1);
  ok(!Object.isFrozen(xs), "closure: registering does not freeze");
  deepFreeze(f);
  ok(Object.isFrozen(xs) && Object.isFrozen(ys) && throws(() => xs.push(2)), "closure: publishing freezes the captures, through a captured function");
  const o = methods({ m() { return zs; } }, "m", (i: number) => (i < 0 ? 1 : zs));
  const zs = [0];
  deepFreeze(o);
  ok(Object.isFrozen(zs), "methods: a method's captures are frozen with its record");
  const ws = [0];
  const h = closure(() => ws, (i) => (i < 0 ? 2 : i === 0 ? ws : (() => { throw new ReferenceError("late is not initialised"); })()));
  const r = { h, ws };
  ok(throws(() => deepFreeze(r)) && !Object.isFrozen(r) && !Object.isFrozen(ws), "dead zone: publishing a function before a capture is initialised throws, and freezes nothing");
}
{
  // path copying (holes7): the cell keeps its containers and typed arrays; what is published is a frozen copy
  const t = new Uint8Array(2), inner = { t }, shared = [1], o = { inner, again: inner, shared }, cyc: any = { t };
  cyc.self = cyc;
  const p = deepFreeze(o) as any;
  ok(p !== o && p.inner !== inner && p.inner === p.again && p.inner.t !== t && p.shared === shared, "path copy: a copy on the path to a typed array, one copy per container, shared subtrees frozen in place");
  ok(Object.isFrozen(p) && Object.isFrozen(p.inner) && !Object.isFrozen(o) && !Object.isFrozen(inner) && Object.isFrozen(shared) && o.inner.t === t, "path copy: the copies are frozen, the originals are left as they are");
  t[0] = 7;
  ok(p.inner.t[0] === 0, "path copy: a write to the original typed array does not reach the published one");
  const c = deepFreeze(cyc) as any;
  ok(c !== cyc && c.self === c && c.t !== t, "path copy: a cycle maps to one copy");
  const mk = new SsMap<unknown, number>([[t, 1]]), mc = deepFreeze(mk) as Map<unknown, number>;
  ok(mc !== mk && !mc.has(t) && [...mc.keys()][0] instanceof Uint8Array && throws(() => mc.set(1, 1)), "path copy: a typed-array Map key is copied in a copy of the Map");
  const f = closure(() => inner.t[0], (i) => (i < 0 ? 1 : inner));
  ok(throws(() => deepFreeze({ f })) && !Object.isFrozen(f), "path copy: a function whose captures reach a typed array throws at publish");
  ok(throws(() => deepFreeze({ x: { then: (r: (v: number) => void) => r(1) } })) && throws(() => deepFreeze({ then: () => 0 })), "thenable: a record with a callable then is banned, at the top and nested");
  ok(deepFreeze({ then: 1 }).then === 1 && deepFreeze(Promise.resolve(1)) instanceof Promise, "thenable: a then that is not callable, and a Promise, are not banned");
}
{
  // holes8 (2026-11-22): a promise among a function's captures (or in an Error) cannot be replaced and settles later:
  // publishing throws, and nothing is frozen. A rejection reason is deep-frozen, one reason for every reader. A match
  // array's groups and indices are frozen. A native Map from structuredClone is published as a frozen SsMap copy
  const r = { n: [0] }, q = Promise.resolve(r), f = closure(() => q, (i) => (i < 0 ? 1 : q));
  ok(throws(() => deepFreeze({ f })) && !Object.isFrozen(r) && !Object.isFrozen(f), "a promise among a function's captures throws at publish; nothing is frozen");
  const e = new Error("x"); (e as unknown as { p: unknown }).p = q;
  ok(throws(() => deepFreeze(e)) && !Object.isFrozen(e), "a promise in an Error throws at publish");
  const reason = { xs: [0] }, pr = deepFreeze({ p: Promise.reject(reason) }).p;
  const [a1, a2] = [await pr.catch((x) => x), await pr.catch((x) => x)];
  ok(a1 === a2 && Object.isFrozen(a1) && Object.isFrozen(a1.xs), "a rejection reason is deep-frozen and the same for two readers");
  const fr = out(Promise.reject([1])) as Promise<unknown>, rr = await fr.catch((x) => x);
  ok(Object.isFrozen(rr), "out: a returned promise's rejection reason is frozen");
  const m = deepFreeze({ m: /(?<g>a)/d.exec("ab")! }).m as RegExpExecArray & { indices: unknown[] & { groups: object } };
  ok(Object.isFrozen(m.groups) && Object.isFrozen(m.indices) && Object.isFrozen(m.indices[0]) && Object.isFrozen(m.indices.groups), "a match array's groups and indices are frozen");
  const nm = structuredClone(new Map([["k", 1]])), pm = deepFreeze({ nm }).nm;
  ok(pm !== nm && throws(() => pm.set("j", 2)) && (nm.set("j", 2), true), "a native Map is published as a frozen copy; the cell keeps its original");
}
ok(Object.isFrozen(out({ xs: [1] }).xs), "out: every sync value is frozen (B7's quick path removed 2026-11-22)");
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

