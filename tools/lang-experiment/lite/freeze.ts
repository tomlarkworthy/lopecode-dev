// Run-time immutability (S4.6): a value is deep-frozen where it leaves its maker, and a write to it throws at the write.
// Unchecked: SoundScript has no class, no Object.defineProperty and no WeakSet held across calls.
// SsMap and SsSet are the Map and Set SoundScript code makes (compiled cells take them as Map and Set). A frozen one
// refuses set/add/delete/clear; the test is on the subclass prototype, so m.set(k, freeze(m).size) throws too.
// deepFreeze freezes plain data: arrays, records whose prototype is Object.prototype or null, SsMap, SsSet, their
// keys and values. A native Map or Set met in a slot it can still write is replaced by a frozen SsMap/SsSet copy.
// It leaves every other object as it is: functions, class instances, typed arrays, Dates, Promises, DOM nodes.
const NMap = Map, NSet = Set, NURL = URL;
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
// closures (2026-11-22, cause A): a function a SoundScript cell makes, with the count of the cell's locals it captures and
// a thunk giving the current value of the i-th (the compiler emits the registration: lite/fnreg.ts, tc-reg.ss.ts).
// deepFreeze freezes what the thunk gives, so what a published function reaches is frozen when it is published.
// The thunk is kept on the function under a symbol no SoundScript code can name (a WeakMap.set per closure made the
// checker 25% slower in bun, 2026-11-22); t(-1) is the count.
const CAPS = Symbol("ss captures");
type Caps = (i: number) => unknown;
const capsOf = (f: object): Caps | undefined => (f as { [CAPS]?: Caps })[CAPS];
// published functions with a capture still in its dead zone; tdz() (emitted after such a declaration) walks them again
const PENDING = new NSet<object>();
export const closure = <F,>(f: F, t: Caps): F => { (f as { [CAPS]?: Caps })[CAPS] = t; return f; };
export const methods = <O,>(o: O, ...r: unknown[]): O => {
  for (let i = 0; i < r.length; i += 2) ((o as Record<string, object>)[r[i] as string] as { [CAPS]?: Caps })[CAPS] = r[i + 1] as Caps;
  return o;
};
export const tdz = (): void => { if (PENDING.size === 0) return; for (const f of [...PENDING]) { PENDING.delete(f); deepFreeze(f); } };
// SsURL (2026-11-22, cause D): the URL SoundScript code makes (a compiled cell takes it as URL). Object.freeze does not
// stop URL's setters (they are on the prototype and write internal slots), so a frozen one refuses each setter
export class SsURL extends NURL {
  static [Symbol.hasInstance](x: unknown) { return x instanceof NURL; }
  static {
    Object.defineProperty(this, "name", { value: "URL" });
    for (const k of ["href", "protocol", "username", "password", "host", "hostname", "port", "pathname", "search", "hash"]) {
      // the accessor where this host's URL defines it (a prototype further up in some DOM implementations)
      let d: PropertyDescriptor | undefined, o: object | null = NURL.prototype;
      for (; o !== null && d === undefined; o = Object.getPrototypeOf(o)) d = Object.getOwnPropertyDescriptor(o, k);
      if (d === undefined || d.set === undefined) continue;
      Object.defineProperty(this.prototype, k, { configurable: true, enumerable: true, get: d.get, set(v: string) { refuse(this, `setting ${k}`, "URL"); d!.set!.call(this, v); } });
    }
  }
}
// the kinds of object deepFreeze treats (lite/freeze-table.ts gives the one treatment of each kind of value)
const K_FN = 7, K_ERROR = 8, K_REGEXP = 9, K_TYPED = 10, K_BUFFER = 11, K_SSURL = 12, K_URL = 13, K_PROMISE = 14, K_ITER = 15;
const TYPED_PROTOS = new NSet<object>([Float32Array, Float64Array, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array].map((c) => c.prototype));
const ITER_PROTO = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));
// a copy deepFreeze made at a boundary: no SoundScript name can write it (S4), so it is not copied again
const COPIES = new WeakSet<object>();
const kindOf = (v: object): number => {
  if (typeof v === "function") return capsOf(v) !== undefined ? 7 : 0;
  const p = Object.getPrototypeOf(v);
  const k = p === Array.prototype ? 1 : p === Object.prototype || p === null ? 2 : p === SsMap.prototype ? 3 : p === SsSet.prototype ? 4 : p === NMap.prototype ? 5 : p === NSet.prototype ? 6 : 0;
  if (k !== 0) return k;
  if (TYPED_PROTOS.has(p)) return COPIES.has(v) ? 0 : K_TYPED;
  if (p === ArrayBuffer.prototype) return COPIES.has(v) ? 0 : K_BUFFER;
  if (Error.prototype.isPrototypeOf(v)) return K_ERROR;
  if (p === RegExp.prototype) return K_REGEXP;
  if (p === SsURL.prototype) return K_SSURL;
  if (p === NURL.prototype) return K_URL;
  if (p === Promise.prototype) return K_PROMISE;
  // an iterator or generator object: next() changes it, so it cannot be published (banned)
  return p !== null && (p === ITER_PROTO || Object.getPrototypeOf(p) === ITER_PROTO || (Object.getPrototypeOf(p) !== null && Object.getPrototypeOf(Object.getPrototypeOf(p)) === ITER_PROTO)) ? K_ITER : 0;
};
// the kinds a walk replaces by a copy in the parent's slot
const swapped = (k: number): boolean => k === 5 || k === 6 || k === K_TYPED || k === K_BUFFER || k === K_URL || k === K_PROMISE;
const KIND_NAME: Record<number, string> = { 5: "native Map", 6: "native Set", [K_TYPED]: "typed array", [K_BUFFER]: "ArrayBuffer", [K_URL]: "native URL" };
// a native Map or Set -> its SsMap/SsSet copy, per call: a native one met twice in one value gets one copy
const copyOf = (v: object, k: number, copies: Map<object, object>): object => {
  let c = copies.get(v);
  if (c) return c;
  if (k === K_PROMISE) c = (v as Promise<unknown>).then(deepFreeze);
  else if (k === K_TYPED) { c = (v as Uint8Array).slice(); COPIES.add(c); }
  else if (k === K_BUFFER) { c = (v as ArrayBuffer).slice(0); COPIES.add(c); }
  else if (k === K_URL) c = new SsURL((v as URL).href);
  else c = k === 5 ? new SsMap(v as Map<unknown, unknown>) : new SsSet(v as Set<unknown>);
  copies.set(v, c);
  return c;
};
// one node of the walk: each child through child, which may give a native Map or Set's copy to write back in its slot
// (when the node is not frozen yet); an SsMap or SsSet is refilled only when a key or member was replaced
const walkNode = (n: object, child: (x: unknown, fixed: boolean) => unknown): void => {
  const k = kindOf(n), w = !Object.isFrozen(n);
  if (k === 7) {
    const t = capsOf(n)!, k = t(-1) as number;
    for (let i = 0; i < k; i++) { let x: unknown; try { x = t(i); } catch { PENDING.add(n); continue; } child(x, true); }
    Object.freeze(n);
    return;
  }
  if (k === K_ERROR) { const e = n as unknown as Record<string, unknown>; for (const key of Object.getOwnPropertyNames(e)) { const d = Object.getOwnPropertyDescriptor(e, key)!; if (!("value" in d)) continue; const y = child(d.value, !w || !d.writable); if (y !== d.value) e[key] = y; } }
  else if (k === 1) { const a = n as unknown[]; for (let i = 0; i < a.length; i++) { const y = child(a[i], !w); if (y !== a[i]) a[i] = y; } }
  else if (k === 2) { const r = n as Record<string, unknown>; for (const key of Object.keys(r)) { const y = child(r[key], !w); if (y !== r[key]) r[key] = y; } }
  else if (k === 3) {
    const m = n as Map<unknown, unknown>, es = [...NMap.prototype.entries.call(m)], ys = es.map(([a, b]) => [child(a, FROZEN.has(m)), child(b, FROZEN.has(m))] as const);
    if (!FROZEN.has(m) && ys.some(([a, b], i) => a !== es[i]![0] || b !== es[i]![1])) { NMap.prototype.clear.call(m); for (const [a, b] of ys) NMap.prototype.set.call(m, a, b); }
  } else if (k === 4) {
    const s = n as Set<unknown>, es = [...NSet.prototype.values.call(s)], ys = es.map((a) => child(a, FROZEN.has(s)));
    if (!FROZEN.has(s) && ys.some((a, i) => a !== es[i])) { NSet.prototype.clear.call(s); for (const a of ys) NSet.prototype.add.call(s, a); }
  }
  if (k === 3 || k === 4 || k === K_SSURL) FROZEN.add(n);
  if (w) Object.freeze(n);
};
// one walk, an explicit stack; a node goes in DONE only when the whole walk ends, so an aborted walk is not trusted
export function deepFreeze<T>(v: T): T {
  if ((typeof v !== "object" && typeof v !== "function") || v === null || DONE.has(v)) return v;
  const k0 = kindOf(v);
  if (k0 === 0) return v;
  const copies = new NMap<object, object>(), seen: object[] = [];
  if (k0 === K_ITER) throw new TypeError("an iterator or generator object cannot leave its cell: next() changes it");
  const top = swapped(k0) ? copyOf(v, k0, copies) : v;
  if (k0 === K_PROMISE || k0 === K_TYPED || k0 === K_BUFFER) return top as T;
  const stack: object[] = [top], open = new NSet<object>([top]);
  const child = (x: unknown, fixed: boolean): unknown => {
    if ((typeof x !== "object" && typeof x !== "function") || x === null || DONE.has(x)) return x;
    const k = kindOf(x);
    if (k === 0) return x;
    if (k === K_ITER) throw new TypeError("an iterator or generator object cannot leave its cell: next() changes it");
    // a promise that cannot be replaced: its value is deep-frozen in place when it settles (a typed array in it is not)
    if (k === K_PROMISE && fixed) { (x as Promise<unknown>).then(deepFreeze, () => undefined); return x; }
    if (swapped(k) && fixed) throw new TypeError(`a ${KIND_NAME[k]} where it cannot be replaced by a copy (in a frozen value or among a function's captures): a value cannot change after its cell publishes it`);
    const y = swapped(k) ? copyOf(x, k, copies) : x;
    if (k === K_PROMISE || k === K_TYPED || k === K_BUFFER) return y;
    if (!open.has(y)) { open.add(y); stack.push(y); }
    return y;
  };
  for (let n = stack.pop(); n !== undefined; n = stack.pop()) { seen.push(n); walkNode(n, child); }
  for (const n of seen) if (!PENDING.has(n)) DONE.add(n);
  return top as T;
}
// a value a generator yields: deep-frozen, unless the generator lends it with borrow(x) (S5) and keeps writing it
export const yielded = <T,>(v: T): T => (typeof v === "object" && v !== null && LENT.has(v) ? v : deepFreeze(v));
// freeze(x) in SoundScript code: the same deep freeze
export const freeze = <T,>(v: T): T => deepFreeze(v);
// borrow(x): x lent by a generator that keeps writing it between yields (S5); yielded() does not freeze it
export const borrow = <T,>(v: T): T => { if (typeof v === "object" && v !== null) LENT.add(v); return v; };
// a cell's value as the runtime publishes it, at every boundary: deep-frozen; a promise's resolved value; each value a
// generator yields. (B7's unfrozen quick path was removed 2026-11-22: it failed the freeze attack.)
export function out<T>(v: T): T {
  if (v instanceof Promise) return v.then(deepFreeze) as T;
  const g = v as any;
  if (!g || typeof g.next !== "function" || typeof g.return !== "function") return deepFreeze(v);
  const fz = (r: any): any => (r instanceof Promise ? r.then(fz) : r && typeof r === "object" ? { done: r.done, value: yielded(r.value) } : r);
  const w = { next: (...a: unknown[]) => fz(g.next(...a)), return: (...a: unknown[]) => fz(g.return(...a)), throw: (...a: unknown[]) => fz(g.throw(...a)) };
  return Object.assign(w, typeof g[Symbol.asyncIterator] === "function" ? { [Symbol.asyncIterator]() { return w; } } : { [Symbol.iterator]() { return w; } }) as T;
}
