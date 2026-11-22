// Run-time immutability (S4.6): a value is deep-frozen where it leaves its maker, and a write to it throws at the write.
// Unchecked: SoundScript has no class, no Object.defineProperty and no WeakSet held across calls.
// SsMap and SsSet are the Map and Set SoundScript code makes (compiled cells take them as Map and Set). A frozen one
// refuses set/add/delete/clear; the test is on the subclass prototype, so m.set(k, freeze(m).size) throws too.
// deepFreeze freezes plain data: arrays, records whose prototype is Object.prototype or null, SsMap, SsSet, their
// keys and values. A native Map or Set met in a slot it can still write is replaced by a frozen SsMap/SsSet copy.
// It leaves every other object as it is: functions, class instances, typed arrays, Dates, Promises, DOM nodes.
const NMap = Map, NSet = Set;
const FROZEN = new WeakSet<object>(), DONE = new WeakSet<object>(), LENT = new WeakSet<object>();
const refuse = (o: object, op: string, what: string) => { if (FROZEN.has(o)) throw new TypeError(`${op} on a frozen ${what}: a value cannot change after its cell returns`); };
export class SsMap extends NMap {
  static [Symbol.hasInstance](x: unknown) { return x instanceof NMap; }
  static groupBy(xs: Iterable<unknown>, f: (x: unknown, i: number) => unknown) { return new SsMap((NMap as any).groupBy(xs, f)); }
  set(k: unknown, v: unknown) { refuse(this, "set", "Map"); return super.set(k, v); }
  delete(k: unknown) { refuse(this, "delete", "Map"); return super.delete(k); }
  clear() { refuse(this, "clear", "Map"); super.clear(); }
  static { Object.defineProperty(this, "name", { value: "Map" }); }
}
export class SsSet extends NSet {
  static [Symbol.hasInstance](x: unknown) { return x instanceof NSet; }
  add(v: unknown) { refuse(this, "add", "Set"); return super.add(v); }
  delete(v: unknown) { refuse(this, "delete", "Set"); return super.delete(v); }
  clear() { refuse(this, "clear", "Set"); super.clear(); }
  // the Set algebra makes a native Set (it does not use this.constructor); SoundScript code gets an SsSet
  static {
    Object.defineProperty(this, "name", { value: "Set" });
    for (const n of ["union", "intersection", "difference", "symmetricDifference"])
      if (typeof (NSet.prototype as any)[n] === "function") (this.prototype as any)[n] = { [n](o: unknown) { return new SsSet((NSet.prototype as any)[n].call(this, o)); } }[n];
  }
}
const kindOf = (v: object): number => {
  const p = Object.getPrototypeOf(v);
  return p === Array.prototype ? 1 : p === Object.prototype || p === null ? 2 : p === SsMap.prototype ? 3 : p === SsSet.prototype ? 4 : p === NMap.prototype ? 5 : p === NSet.prototype ? 6 : 0;
};
// a native Map or Set -> its SsMap/SsSet copy, per call: a native one met twice in one value gets one copy
const copyOf = (v: object, k: number, copies: Map<object, object>): object => {
  let c = copies.get(v);
  if (!c) copies.set(v, (c = k === 5 ? new SsMap(v as Map<unknown, unknown>) : new SsSet(v as Set<unknown>)));
  return c;
};
// one node of the walk: each child through child, which may give a native Map or Set's copy to write back in its slot
// (when the node is not frozen yet); an SsMap or SsSet is refilled only when a key or member was replaced
const walkNode = (n: object, child: (x: unknown) => unknown): void => {
  const k = kindOf(n), w = !Object.isFrozen(n);
  if (k === 1) { const a = n as unknown[]; for (let i = 0; i < a.length; i++) { const y = child(a[i]); if (y !== a[i] && w) a[i] = y; } }
  else if (k === 2) { const r = n as Record<string, unknown>; for (const key of Object.keys(r)) { const y = child(r[key]); if (y !== r[key] && w) r[key] = y; } }
  else if (k === 3) {
    const m = n as Map<unknown, unknown>, es = [...NMap.prototype.entries.call(m)], ys = es.map(([a, b]) => [child(a), child(b)] as const);
    if (!FROZEN.has(m) && ys.some(([a, b], i) => a !== es[i]![0] || b !== es[i]![1])) { NMap.prototype.clear.call(m); for (const [a, b] of ys) NMap.prototype.set.call(m, a, b); }
  } else if (k === 4) {
    const s = n as Set<unknown>, es = [...NSet.prototype.values.call(s)], ys = es.map(child);
    if (!FROZEN.has(s) && ys.some((a, i) => a !== es[i])) { NSet.prototype.clear.call(s); for (const a of ys) NSet.prototype.add.call(s, a); }
  }
  if (k === 3 || k === 4) FROZEN.add(n);
  if (w) Object.freeze(n);
};
// one walk, an explicit stack; a node goes in DONE only when the whole walk ends, so an aborted walk is not trusted
export function deepFreeze<T>(v: T): T {
  if (typeof v !== "object" || v === null || DONE.has(v)) return v;
  const k0 = kindOf(v);
  if (k0 === 0) return v;
  const copies = new NMap<object, object>(), seen: object[] = [];
  const top = k0 >= 5 ? copyOf(v, k0, copies) : v;
  const stack: object[] = [top], open = new NSet<object>([top]);
  const child = (x: unknown): unknown => {
    if (typeof x !== "object" || x === null || DONE.has(x)) return x;
    const k = kindOf(x);
    if (k === 0) return x;
    const y = k >= 5 ? copyOf(x, k, copies) : x;
    if (!open.has(y)) { open.add(y); stack.push(y); }
    return y;
  };
  for (let n = stack.pop(); n !== undefined; n = stack.pop()) { seen.push(n); walkNode(n, child); }
  for (const n of seen) DONE.add(n);
  return top as T;
}
// a value a generator yields: deep-frozen, unless the generator lends it with borrow(x) (S5) and keeps writing it
export const yielded = <T,>(v: T): T => (typeof v === "object" && v !== null && LENT.has(v) ? v : deepFreeze(v));
// freeze(x) in SoundScript code: the same deep freeze
export const freeze = <T,>(v: T): T => deepFreeze(v);
// borrow(x): x lent by a generator that keeps writing it between yields (S5); yielded() does not freeze it
export const borrow = <T,>(v: T): T => { if (typeof v === "object" && v !== null) LENT.add(v); return v; };
// B7 (2026-11-22): a quick cell's value (below) is not frozen unless freezeAll is on: globalThis.SS_FREEZE_ALL = true,
// SS_FREEZE_ALL=1 in the environment, or ?ss_freeze_all=1 in the page's address, read once. Once a quick cell has
// returned no SoundScript name can write its value (S4: what a cell exposes is never Mut, and a function it keeps
// writes nothing it captured). A cell in another language could.
type FzGlobal = { SS_FREEZE_ALL?: boolean; process?: { env?: Record<string, string | undefined> }; location?: { search?: string } };
let fzAll: boolean | null = null;
export const freezeAll = (): boolean => {
  const g = globalThis as FzGlobal;
  if (g.SS_FREEZE_ALL !== undefined) return g.SS_FREEZE_ALL;
  return (fzAll ??= g.process?.env?.SS_FREEZE_ALL === "1" || /[?&]ss_freeze_all=1\b/.test(g.location?.search ?? ""));
};
// a cell's value as the runtime publishes it: deep-frozen (a sync value only under freezeAll); a promise's resolved
// value; each value a generator yields
// quick: the compiler found no code of the cell that runs after it returns (tc-build tcQuickOut)
export function out<T>(v: T, quick?: 1): T {
  if (v instanceof Promise) return v.then(deepFreeze) as T;
  const g = v as any;
  if (!g || typeof g.next !== "function" || typeof g.return !== "function") return quick === 1 && !freezeAll() ? v : deepFreeze(v);
  const fz = (r: any): any => (r instanceof Promise ? r.then(fz) : r && typeof r === "object" ? { done: r.done, value: yielded(r.value) } : r);
  const w = { next: (...a: unknown[]) => fz(g.next(...a)), return: (...a: unknown[]) => fz(g.return(...a)), throw: (...a: unknown[]) => fz(g.throw(...a)) };
  return Object.assign(w, typeof g[Symbol.asyncIterator] === "function" ? { [Symbol.asyncIterator]() { return w; } } : { [Symbol.iterator]() { return w; } }) as T;
}
