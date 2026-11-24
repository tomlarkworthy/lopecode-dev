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
// measurement switches (2026-11-22, rule set R, selfhost/NOTES-checker-port.md): with SS_MEASURE_REG=0 in a bun process
// closure() and methods() register nothing; with SS_MEASURE_FREEZE=0 deepFreeze returns its argument. Off in a browser
const MEASURE_ENV = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
// x1 (2026-11-24): with SS_MEASURE_GUARD=0 the async guard (guardAsync) holds nothing, as before x1
// y1 (2026-11-24): with SS_MEASURE_HANDOVER=0 a published value is not refused for a response, an async iterator or a
// promise its cell's type does not name (handOver), as before y1
const REG_ON = MEASURE_ENV?.SS_MEASURE_REG !== "0", FREEZE_ON = MEASURE_ENV?.SS_MEASURE_FREEZE !== "0", GUARD_ON = MEASURE_ENV?.SS_MEASURE_GUARD !== "0", HAND_ON = MEASURE_ENV?.SS_MEASURE_HANDOVER !== "0";
type Caps = (i: number) => unknown;
const capsOf = (f: object): Caps | undefined => (f as { [CAPS]?: Caps })[CAPS];
// f1 (2026-11-23, cause R of freeze-attack7): a registration never replaces another. methods() tags whatever o.m is
// after the literal is built, which a later key or a spread may have made another function: a thunk is added to the
// one there (walking both only freezes more). A frozen function's captures were frozen when it was published; it is
// left as it is (a write to it would throw)
const register = (f: unknown, t: Caps): void => {
  if (typeof f !== "function" || Object.isFrozen(f)) return;
  const g = f as { [CAPS]?: Caps }, old = g[CAPS];
  if (old === undefined) { g[CAPS] = t; return; }
  const n = old(-1) as number;
  g[CAPS] = (i) => (i < 0 ? n + (t(-1) as number) : i < n ? old(i) : t(i - n));
};
export const closure = <F,>(f: F, t: Caps): F => { if (REG_ON) register(f, t); return f; };
export const methods = <O,>(o: O, ...r: unknown[]): O => {
  if (REG_ON) for (let i = 0; i < r.length; i += 2) register((o as Record<string, unknown>)[r[i] as string], r[i + 1] as Caps);
  return o;
};
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
    // a detached snapshot (the params of a URL no one else holds): URLSearchParams is read-only in the language, and a
    // live one would follow a URL the cell still writes
    Object.defineProperty(this.prototype, "searchParams", { configurable: true, enumerable: true, get() { return new NURL((this as unknown as URL).href).searchParams; } });
  }
}
// the kinds of object deepFreeze treats (lite/freeze-table.ts gives the one treatment of each kind of value)
const K_FN = 7, K_ERROR = 8, K_REGEXP = 9, K_TYPED = 10, K_BUFFER = 11, K_SSURL = 12, K_URL = 13, K_PROMISE = 14, K_ITER = 15, K_RESP = 16;
const TYPED_PROTOS = new NSet<object>([Float32Array, Float64Array, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array].map((c) => c.prototype));
const ITER_PROTO = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));
// y1: an async generator object's AsyncIterator.prototype, and a fetch response's prototype where the host has Response
const AITER_PROTO = Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf((async function* () {})())));
const RESP_PROTO: object | null = typeof Response === "function" ? Response.prototype : null;
const iterLike = (p: object, top: object): boolean => p === top || Object.getPrototypeOf(p) === top || (Object.getPrototypeOf(p) !== null && Object.getPrototypeOf(Object.getPrototypeOf(p)) === top);
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
  if (p !== null && p === RESP_PROTO && HAND_ON) return K_RESP;
  // an iterator or generator object, sync or (y1) async: next() changes it, so it cannot be published (banned)
  return p !== null && (iterLike(p, ITER_PROTO) || (HAND_ON && iterLike(p, AITER_PROTO))) ? K_ITER : 0;
};
// a leaf: replaced by a copy in whatever holds it (a promise: by p.then(deepFreeze)); every other kind is a node
const leaf = (k: number): boolean => k === K_TYPED || k === K_BUFFER || k === K_URL || k === K_PROMISE;
const KIND_NAME: Record<number, string> = { 5: "native Map", 6: "native Set", [K_TYPED]: "typed array", [K_BUFFER]: "ArrayBuffer", [K_URL]: "native URL", [K_PROMISE]: "promise" };
// a rejection reason is published as a value is (holes8): deep-frozen, then thrown on
const rethrow = (e: unknown): never => { throw deepFreeze(e); };
const copyOf = (v: object, k: number): object => {
  // at a boundary (f1) the copy and what it settles to are published too
  if (k === K_PROMISE) { if (!marking) return (v as Promise<unknown>).then(deepFreeze, rethrow); const q = (v as Promise<unknown>).then(published, rethrow); PUBLISHED.add(q); return q; }
  if (k === K_URL) { const u = new SsURL((v as URL).href); FROZEN.add(u); Object.freeze(u); DONE.add(u); return u; }
  const c = k === K_TYPED ? (v as Uint8Array).slice() : (v as ArrayBuffer).slice(0);
  COPIES.add(c);
  return c;
};
// a node whose slots cannot be given a copy: a function's captures, an Error, a value frozen before (a JSX element)
const fixed = (n: object, k: number): boolean => k === K_FN || k === K_ERROR || (k !== 5 && k !== 6 && Object.isFrozen(n));
const isObj = (x: unknown): x is object => (typeof x === "object" || typeof x === "function") && x !== null;
// the runtime adopts a value with a callable then (it calls then and publishes what then passes on, unfrozen), and so
// does every await: a thenable that is not a Promise is banned anywhere in a published value
const noThen = (x: object): void => {
  if (typeof (x as { then?: unknown }).then === "function" && !(x instanceof Promise)) throw new TypeError("a value with a callable then (a thenable that is not a Promise) cannot leave its cell: the runtime would publish what then passes on, unfrozen");
};
const ITER_MSG = "an iterator or generator object cannot leave its cell: next() changes it";
// y1 (2026-11-24): what a hand-over refuses at run time, whatever type the value was given (the checker's rules see the
// direct cases; a value given unknown, object or a type parameter on the way is seen only here)
const RESP_MSG = "a response cannot leave its cell: its body can be read once, so the second reader would find it used; read the body in the cell and give the data";
const PROMISE_MSG = "a promise cannot leave its cell where the cell's type does not name one: the cells that read it would get what it settles to, not that type; await it in the cell, or give the cell a type that names the promise";
// handOver's settings: whereNow names the value being published (a cell's value, an action's argument...) and strictNow
// says that its type names no promise, so none may be in it
let whereNow = "", strictNow = false;
// the path from root to x, for a refusal's message: walked only when a value is refused
const pathTo = (root: unknown, x: object): string => {
  const seen = new NSet<object>(), todo: [unknown, string][] = [[root, ""]];
  for (let i = 0; i < todo.length; i++) {
    const [n, p] = todo[i]!;
    if (n === x) return `value${p}`;
    if (!isObj(n) || seen.has(n)) continue;
    seen.add(n);
    const k = kindOf(n), at = (q: string) => (y: unknown) => void todo.push([y, q]);
    if (k === 1) (n as unknown[]).forEach((y, j) => at(`${p}[${j}]`)(y));
    else if (k === 2 || k === K_ERROR) for (const key of Object.keys(n)) at(`${p}.${key}`)((n as Record<string, unknown>)[key]);
    else if (k === 3 || k === 5) for (const [a, b] of NMap.prototype.entries.call(n)) { at(`${p} (a Map key)`)(a); at(`${p}.get(${typeof a === "string" ? JSON.stringify(a) : String(a)})`)(b); }
    else if (k === 4 || k === 6 || k === K_FN) eachKid(n, k, at(k === K_FN ? `${p} (a function's capture)` : `${p} (a Set element)`));
  }
  return "value (inside it)";
};
const refuseAt = (root: unknown, x: object, msg: string): never => { throw new TypeError(`${msg} (${whereNow === "" ? "a published value" : whereNow}, at ${pathTo(root, x)})`); };
const kindRefused = (root: unknown, x: object, k: number): void => {
  if (k === K_ITER) refuseAt(root, x, ITER_MSG);
  if (k === K_RESP) refuseAt(root, x, RESP_MSG);
  if (k === K_PROMISE && strictNow) refuseAt(root, x, PROMISE_MSG);
};
// frozen containers that reach a promise copy: a strict hand-over that meets one refuses it (it is not walked again)
const PROMISED = new WeakSet<object>();
// a match array's non-element own properties (index, input, groups, indices); Object.keys on any array is 40-100x the walk
const extraKeys = (a: object): string[] => (Object.hasOwn(a, "index") || Object.hasOwn(a, "groups") ? Object.keys(a).filter((x) => String(x >>> 0) !== x) : []);
// each child of node n (of kind k); a capture still in its dead zone throws (fail-stop: nothing has been changed yet)
const eachKid = (n: object, k: number, f: (x: unknown) => void): void => {
  if (k === K_FN) {
    const t = capsOf(n)!, c = t(-1) as number;
    for (let i = 0; i < c; i++) {
      let x: unknown;
      try { x = t(i); } catch (e) { throw new TypeError(`a function is published before a binding it captures is initialised (${(e as Error).message})`); }
      f(x);
    }
  } else if (k === 1) { const a = n as unknown[]; for (let i = 0; i < a.length; i++) f(a[i]); for (const key of extraKeys(a)) f((a as unknown as Record<string, unknown>)[key]); }
  else if (k === 2) { const r = n as Record<string, unknown>; for (const key of Object.keys(r)) f(r[key]); }
  else if (k === 3 || k === 5) for (const [a, b] of NMap.prototype.entries.call(n)) { f(a); f(b); }
  else if (k === 4 || k === 6) for (const a of NSet.prototype.values.call(n)) f(a);
  else if (k === K_ERROR) for (const key of Object.getOwnPropertyNames(n)) { const d = Object.getOwnPropertyDescriptor(n, key)!; if ("value" in d) f(d.value); }
};
// Path copying (2026-11-22, holes7): no slot of a container the cell made is written. A container that reaches a leaf
// (or a native Map or Set, which is always copied) is published as a frozen shallow copy holding the leaf's copy, and so
// is each container on the way up; the cell's own containers keep its originals and are left as they are. Everything
// else is frozen in place. 1: a read-only scan, where every throw is, so a publish that throws changes nothing.
// 2 (only when a leaf was met): containers that reach one, by reverse edges (cycles included). 3: copy and freeze.
// holes8: a promise no slot can take a replacement for (a function's captures, an Error, a frozen value) throws at publish
export function deepFreeze<T>(v: T): T {
  if (marking && typeof v === "function") PUBLISHED.add(v);
  if (!FREEZE_ON || !isObj(v)) return v;
  if (DONE.has(v)) { if (strictNow && PROMISED.has(v)) refuseAt(v, v, PROMISE_MSG); return v; }
  noThen(v);
  const k0 = kindOf(v);
  if (k0 === 0) return v;
  kindRefused(v, v, k0);
  if (leaf(k0)) return copyOf(v, k0) as T;
  const kinds = new NMap<object, number>([[v, k0]]), order: object[] = [v], leaves = new NMap<object, number>();
  let seeded = k0 === 5 || k0 === 6;
  for (let i = 0; i < order.length; i++) {
    const n = order[i]!, k = kinds.get(n)!, fx = fixed(n, k);
    eachKid(n, k, (x) => {
      if (marking && typeof x === "function") PUBLISHED.add(x);
      if (!isObj(x) || kinds.has(x)) return;
      if (DONE.has(x)) { if (strictNow && PROMISED.has(x)) refuseAt(v, x, PROMISE_MSG); return; }
      noThen(x);
      const kx = kindOf(x);
      if (kx === 0) return;
      kindRefused(v, x, kx);
      if (kx === K_PROMISE && fx) throw new TypeError("a promise where it cannot be replaced (among a function's captures, in an Error or in an already frozen value): it would settle after its cell publishes it");
      if (leaf(kx)) { leaves.set(x, kx); seeded = true; return; }
      if (kx === 5 || kx === 6) seeded = true;
      kinds.set(x, kx);
      order.push(x);
    });
  }
  const copies = new NMap<object, object>(), rep = (x: unknown): unknown => (isObj(x) ? copies.get(x) ?? x : x), why = new NMap<object, string>(), prom = new NSet<object>();
  if (seeded) {
    const parents = new NMap<object, object[]>(), todo: object[] = [], ptodo: object[] = [];
    const mark = (n: object, w: string) => { if (!why.has(n)) { why.set(n, w); todo.push(n); } };
    for (const n of order) {
      const k = kinds.get(n)!, fx = fixed(n, k);
      if (k === 5 || k === 6) mark(n, KIND_NAME[k]!);
      eachKid(n, k, (x) => {
        if (!isObj(x)) return;
        const kx = leaves.get(x);
        if (kx !== undefined) { mark(n, KIND_NAME[kx]!); if (kx === K_PROMISE && !prom.has(n)) { prom.add(n); ptodo.push(n); } }
        else if (kinds.has(x)) { const ps = parents.get(x); if (ps) ps.push(n); else parents.set(x, [n]); }
      });
    }
    for (let n = todo.pop(); n !== undefined; n = todo.pop()) for (const p of parents.get(n) ?? []) mark(p, why.get(n)!);
    for (let n = ptodo.pop(); n !== undefined; n = ptodo.pop()) for (const p of parents.get(n) ?? []) if (!prom.has(p)) { prom.add(p); ptodo.push(p); }
    for (const [n, w] of why) if (fixed(n, kinds.get(n)!)) throw new TypeError(`a ${w} where it cannot be replaced by a copy (among a function's captures, in an Error or in an already frozen value): a value cannot change after its cell publishes it`);
    for (const [x, kx] of leaves) copies.set(x, copyOf(x, kx));
    for (const n of why.keys()) { const k = kinds.get(n)!; copies.set(n, k === 1 ? new Array((n as unknown[]).length) : k === 2 ? Object.create(Object.getPrototypeOf(n)) : k === 3 || k === 5 ? new SsMap() : new SsSet()); }
    for (const n of why.keys()) {
      const c = copies.get(n)!, k = kinds.get(n)!;
      if (k === 1) { const a = n as unknown[], b = c as unknown[]; for (let i = 0; i < a.length; i++) b[i] = rep(a[i]); for (const key of extraKeys(a)) (b as unknown as Record<string, unknown>)[key] = rep((a as unknown as Record<string, unknown>)[key]); }
      // every own key, symbols too (a StateCell is a record with a symbol key)
      else if (k === 2) for (const key of Reflect.ownKeys(n)) { const d = Object.getOwnPropertyDescriptor(n, key)!; Object.defineProperty(c, key, "value" in d ? { ...d, value: rep(d.value) } : d); }
      else if (k === 3 || k === 5) for (const [a, b] of NMap.prototype.entries.call(n)) NMap.prototype.set.call(c, rep(a), rep(b));
      else for (const a of NSet.prototype.values.call(n)) NSet.prototype.add.call(c, rep(a));
    }
  }
  for (const n of order) {
    const m = copies.get(n) ?? n, k = kinds.get(n)!;
    if (k === 3 || k === 4 || k === 5 || k === 6 || k === K_SSURL) FROZEN.add(m);
    Object.freeze(m);
    DONE.add(m);
    if (prom.has(n)) PROMISED.add(m);
  }
  return rep(v) as T;
}
// f1 (2026-11-23, S4.12): a function or a promise made in a body that is still running does not leave it. PUBLISHED
// holds each function (and each promise copy) a finished body published: a cell's value, a state cell's initial value,
// a value a generator yields (S5.6, S5.7 cover what a generator writes after a yield), each met by deepFreeze's walk
// there. A value frozen before (DONE) is not walked again, so a function inside one frozen by freeze(x) or a memo miss
// is not marked: it then counts as made in a body (fail-closed). No capture thunk is read, so a function made in a body
// is never taken for a published one with closure registration off; a function a published function captures is
// marked only through its registration (with registration off it counts as made in a body)
const PUBLISHED = new WeakSet<object>(), NOFN = new WeakSet<object>();
let marking = false;
export const published = <T,>(v: T): T => { const was = marking; marking = true; try { return deepFreeze(v); } finally { marking = was; } };
// y1 (2026-11-24): a hand-over, named for a refusal's message; strict: the value's type names no promise
const handOver = <T,>(v: T, where: string, strict: boolean, f: (v: T) => T = published): T => {
  const w = whereNow, s = strictNow;
  whereNow = where; strictNow = strict && HAND_ON;
  try { return f(v); } finally { whereNow = w; strictNow = s; }
};
// deepFreeze and published at a named hand-over (an action's arguments, a state's written or initial value)
export const freezeAt = <T,>(v: T, where: string): T => handOver(v, where, false, deepFreeze);
export const publishedAt = <T,>(v: T, where: string): T => handOver(v, where, false);
// a function or a promise v reaches through data (an array, a plain record's values and accessors, a Map's keys and
// values, a Set, an Error's own properties) that no finished body published, or null; with any (measurement), any
// function or promise. Other objects (a handle, a Date) are not entered. A container deepFreeze froze (DONE: all it
// reaches through data is frozen too) found to reach none is remembered: its graph cannot change, PUBLISHED only grows
export const madeFnIn = (v: unknown, any = false): object | null => {
  if (!FREEZE_ON) return null;
  const seen = new NSet<object>(), todo: unknown[] = [v], fixedOnes: object[] = [];
  while (todo.length > 0) {
    const x = todo.pop();
    if (!isObj(x) || seen.has(x) || (!any && NOFN.has(x))) continue;
    seen.add(x);
    // a promise is not entered: what it settles to is frozen only then, after the body may have written it
    if (typeof x === "function" || x instanceof Promise) { if (any || !PUBLISHED.has(x)) return x; continue; }
    const p = Object.getPrototypeOf(x);
    if (p === Array.prototype || p === Object.prototype || p === null || Error.prototype.isPrototypeOf(x)) {
      if (DONE.has(x)) fixedOnes.push(x);
      for (const key of Reflect.ownKeys(x)) { const d = Object.getOwnPropertyDescriptor(x, key)!; if ("value" in d) todo.push(d.value); else todo.push(d.get, d.set); }
    } else if (x instanceof NMap) { if (DONE.has(x)) fixedOnes.push(x); for (const [a, b] of NMap.prototype.entries.call(x)) todo.push(a, b); }
    else if (x instanceof NSet) { if (DONE.has(x)) fixedOnes.push(x); for (const a of NSet.prototype.values.call(x)) todo.push(a); }
  }
  if (!any) for (const x of fixedOnes) NOFN.add(x);
  return null;
};
// a value a generator yields: deep-frozen, unless the generator lends it with borrow(x) (S5) and keeps writing it
export const yielded = <T,>(v: T, where = "a value a generator yields", strict = false): T => (typeof v === "object" && v !== null && LENT.has(v) ? v : handOver(v, where, strict));
// freeze(x) in SoundScript code: the same deep freeze
export const freeze = <T,>(v: T): T => deepFreeze(v);
// borrow(x): x lent by a generator that keeps writing it between yields (S5); yielded() does not freeze it
export const borrow = <T,>(v: T): T => { if (typeof v === "object" && v !== null) LENT.add(v); return v; };
// a cell's value as the runtime publishes it, at every boundary: deep-frozen; a promise's resolved value; each value a
// generator yields. (B7's unfrozen quick path was removed 2026-11-22: it failed the freeze attack.)
// y1 (2026-11-24): name, the cell's, for a refusal's message; mode (tc-build.ss.ts, run.ts), absent when the cell's type may
// hold a promise or nothing is known: else 1, +2 for an async cell, +4 for a generator cell. With a mode, a promise is
// refused anywhere in the value, and as the whole value unless the cell is async; a generator object unless it is a
// generator cell
function publishOut<T>(v: T, name?: string, mode?: number): T {
  const where = name === undefined ? "a cell's value" : `the value of ${name}`, strict = mode !== undefined && HAND_ON;
  if (v instanceof Promise) {
    if (strict && ((mode ?? 0) & 2) === 0) handOver(v, where, true, (x) => refuseAt(x, x as object, PROMISE_MSG));
    const q = v.then((x) => handOver(x, where, strict), rethrow); PUBLISHED.add(q); return q as T;
  }
  const g = v as any;
  if (!g || typeof g.next !== "function" || typeof g.return !== "function") return handOver(v, where, strict);
  if (strict && ((mode ?? 0) & 4) === 0) handOver(v, where, true, (x) => refuseAt(x, x as object, ITER_MSG));
  const fz = (r: any): any => (r instanceof Promise ? r.then(fz, rethrow) : r && typeof r === "object" ? { done: r.done, value: yielded(r.value, `a value ${name ?? "a cell"} yields`, strict) } : r);
  const w = { next: (...a: unknown[]) => fz(g.next(...a)), return: (...a: unknown[]) => fz(g.return(...a)), throw: (...a: unknown[]) => fz(g.throw(...a)) };
  return Object.assign(w, typeof g[Symbol.asyncIterator] === "function" ? { [Symbol.asyncIterator]() { return w; } } : { [Symbol.iterator]() { return w; } }) as T;
}
// w1 (2026-11-24): a compiled cell's body runs under the guard runCells puts around each cell (run.ts counted). depth is
// prelude.runtime.ts rt.evalDepth: while it is above 0 an action call is refused ("action called during a cell evaluation")
export const evaluating = { depth: 0 };
const underEval = <T,>(f: () => T): T => { evaluating.depth++; try { return f(); } finally { evaluating.depth--; } };
// each step of a generator a cell gives runs under the guard too, as cells.ts guard does for runCells
const guardSteps = (g: any): any => {
  const w = { next: (...a: unknown[]) => underEval(() => g.next(...a)), return: (...a: unknown[]) => underEval(() => g.return(...a)), throw: (...a: unknown[]) => underEval(() => g.throw(...a)) };
  return Object.assign(w, typeof g[Symbol.asyncIterator] === "function" ? { [Symbol.asyncIterator]() { return w; } } : { [Symbol.iterator]() { return w; } });
};
const outRun = <T,>(f: () => T): T => { const v: any = underEval(f); return v && typeof v.next === "function" && typeof v.return === "function" ? guardSteps(v) : v; };
// x1 (2026-11-24): an async function's body is part of the evaluation that called it. The compiled text (fnreg.ts
// guardEdits) brackets it: g = enter() at its start, exit(g) at its end, away(g, x) and back(g, r) around each await,
// left and resumed around each yield of an async generator. g.on: it was called under the guard; g.in: it holds one
// count of depth. While suspended it holds none. A callback given to then while depth > 0 runs under the guard (bind)
type Gd = { on: boolean; in: boolean };
const leave = (g: Gd) => { if (g.in) { g.in = false; evaluating.depth--; } };
const resume = (g: Gd) => { if (g.on && !g.in) { g.in = true; evaluating.depth++; } };
const guardAsync = {
  enter: (): Gd => ({ on: GUARD_ON && evaluating.depth > 0, in: false }), exit: leave,
  away: (g: Gd, x: unknown) => { leave(g); return g.on ? Promise.resolve(x).then((v) => ({ v }), (e) => ({ e, err: true })) : x; },
  back: (g: Gd, r: any) => { resume(g); if (!g.on) return r; if (r.err) throw r.e; return r.v; },
  left: <T,>(g: Gd, v: T): T => { leave(g); return v; },
  resumed: <T,>(g: Gd, v: T): T => { resume(g); return v; },
  bind: (f: unknown) => (typeof f === "function" && GUARD_ON && evaluating.depth > 0 ? (...a: unknown[]) => underEval(() => f(...a)) : f),
};
// out(v): v published. out.cell(f): a plain cell, f its body applied to its inputs, guarded then published. out.run(f): a
// listener cell's body, guarded only
export const out = Object.assign(publishOut, { cell: <T,>(f: () => T, name?: string, mode?: number): T => publishOut(outRun(f), name, mode), run: outRun }, guardAsync);
