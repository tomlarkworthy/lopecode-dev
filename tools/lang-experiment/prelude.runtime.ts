// Runtime half of prelude.d.ts. Imported by the transpiled cells.ts/shell.ts and by run.ts.
// mut is a SoundScript cell (lite/runtime.ss.ts), freeze and borrow cells of lite/freeze.ts. What a write, a read and an action call may do,
// and what a commit applies, is decided by storeStep and the cells of lite/store.ss.ts (checked SoundScript). This
// file holds the one StoreState value and each handle's store record, runs the actions' functions between steps,
// and performs the effects.
import { deepFreeze, published, madeFnIn, closure, SsMap, SsSet, emptyStore, storeStep, isIdle, committedOf, updateSees, readSees, refPlan, type StoreState, type StoreEvent, type StoreEffect, type StoreRecord, type Seen } from "./lite/runtime-ss.ts";
export { mut, freeze, borrow } from "./lite/runtime-ss.ts";

const STATECELL = Symbol.for("lc.statecell");
const ACTION = Symbol.for("lc.action");
const REFHANDLE = Symbol.for("lc.state");

// el: an Observable JavaScript view (viewHandle), which holds the committed value itself
type ViewEl = { value: unknown; dispatchEvent(e: Event): boolean };

// the cell an action was defined by, when the runtime knows it; flush and listeners name actions by it
export const actionNames = new WeakMap<object, string>();
// the host's lookup of the cell whose value an action is, for an action actionNames does not name
export const actionNamer = { of: null as ((a: object) => string | null) | null };
export const nameOf = (a: object) => actionNames.get(a) ?? actionNamer.of?.(a) ?? "(anonymous)";

let storeState: StoreState = emptyStore;
// evalDepth: >0 while a cell definition (or a generator step) runs synchronously; other modules step it.
// commits counts commits; the rest is read from the state
export const rt = {
  evalDepth: 0,
  commits: 0,
  get actionDepth() { return storeState.depth; },
  get call() { return storeState.call; },
  get ready() { return storeState.ready; },
};
// handle -> its store, made only by storeStep, so a store lasts as long as its handle; a handle over another
// handle (an imported state cell's, viewHandle) -> that handle; a view's handle -> its element
const records = new WeakMap<object, StoreRecord>();
const over = new WeakMap<object, object>();
const viewEls = new WeakMap<object, { el: ViewEl; check: (v: unknown) => unknown }>();
const storeHandleOf = (h: object): object => over.get(h) ?? h;
const recordOf = (h: object) => records.get(storeHandleOf(h)) ?? null;
const nameOfHandle = (h: object) => (h as Record<symbol, string>)[REFHANDLE];

// the new state is kept before the effects run; a throw from the step leaves the old one
function storeFeed(ev: StoreEvent): unknown {
  const r = storeStep(storeState, ev);
  storeState = r.state;
  let returned: unknown;
  for (const e of r.effects) if (e.fx === "return") returned = e.value; else performStore(e);
  return returned;
}
function performStore(e: StoreEffect) {
  switch (e.fx) {
    case "throw": throw new Error(e.msg);
    case "schedule": return void setTimeout(commit, 0);
    case "keep": return void records.set(e.handle as object, e.store);
    case "setView": return void (viewEls.get(e.handle as object)!.el.value = e.value);
    case "tellView": return void viewEls.get(e.handle as object)!.el.dispatchEvent(new Event("input", { bubbles: true }));
    case "tell": return void (e.handle as EventTarget).dispatchEvent(new Event("input"));
  }
}
const seenValue = (h: object, s: Seen): unknown => {
  if (s.k === "refused") throw new Error(s.msg);
  if (s.k === "value") return s.value;
  const v = viewEls.get(storeHandleOf(h))!;
  return v.check(v.el.value);
};
// Commits the writes of the calls that finished since the last commit. delivery.test.ts tells this timer by its name.
function commit() {
  const now = new Map<number, StoreRecord>();
  for (const p of storeState.ready.values()) { const s = records.get(p.handle as object); if (s) now.set(s.sid, s); }
  storeFeed({ t: "commit", stores: now });
  rt.commits++;
}

export function reset() {
  rt.evalDepth = 0;
  rt.commits = 0;
  storeFeed({ t: "reset" });
}
// no call running and nothing left to commit
export const idle = () => isIdle(storeState);

export function state<T>(initial: T) {
  return { [STATECELL]: true, initial };
}
export const isStateCell = (v: unknown): v is { initial: unknown } => !!v && typeof v === "object" && Object.hasOwn(v, STATECELL);
export const isAction = (v: unknown) => typeof v === "function" && Object.hasOwn(v, ACTION);
// own, not inherited: a record whose prototype is a handle is not one
export const isRefHandle = (v: unknown) => !!v && typeof v === "object" && Object.hasOwn(v, REFHANDLE);

// a measurement hook (p1, 2026-11-23): told each value a holder keeps while a body may still run (a state write; a
// memoised call's arguments and result when they are stored); null outside lite/infer/attack/observe.ts's runs
export const publishTap: { f: ((where: string, v: unknown) => void) | null } = { f: null };
// f1 (2026-11-23, S4.12): a state write's value and an action call's arguments are published while the body that gives
// them still runs, which may write what a function in them reads (no static rule follows every route to that write).
// One that reaches a function or a promise no finished cell published throws, before anything is frozen or written. A memoised
// function's arguments on a miss do not: such a call stores nothing (S2.13). A yield is S5.6/S5.7's; a cell's return
// ends its body.
// publishSeen: a measurement hook told each such value first (null outside measurement runs). In a bun process
// SS_MEASURE_BODYFN=0 turns the throw off and =log prints a line for each value that reaches a function (measurement only)
export const publishSeen: { f: ((where: string, v: unknown) => void) | null } = { f: null };
const BODYFN = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.SS_MEASURE_BODYFN;
function noBodyFn(where: string, v: unknown): void {
  if (publishSeen.f !== null) publishSeen.f(where, v);
  if (BODYFN === "log" && madeFnIn(v, true) !== null) console.warn(`SS-BODYFN ${madeFnIn(v) !== null ? "made" : "published"}: ${where}`);
  if (BODYFN === undefined && madeFnIn(v) !== null) throw new TypeError(`${where} reaches a function or a promise that no finished cell has published: one made in a body that still runs cannot leave it, since the body could still write what the function reads or what the promise settles to (S4.12). Give data and make the function where the value is read, or make the function in a cell of its own and take that cell as an input`);
}
// an update function that throws throws here, inside the call, before its write
function write(h: object, f: (v: unknown) => unknown) {
  notInMemo("a state written");
  const s = recordOf(h)!;
  const x = f(seenValue(h, updateSees(storeState, nameOfHandle(h), s)));
  noBodyFn(`the value written to ${nameOfHandle(h)}`, x);
  const v = deepFreeze(x);
  if (publishTap.f !== null) publishTap.f(`write ${nameOfHandle(h)}`, v);
  storeFeed({ t: "write", handle: storeHandleOf(h), name: nameOfHandle(h), store: s, value: v });
}
// A handle is an Observable view: an EventTarget whose value is the committed state, which dispatches
// input on each commit, so Observable's Generators.input(handle) is the state cell's value.
// check: a written value's check (the shape of a type that crosses from another language)
function handleOf(name: string, check: (v: unknown) => unknown = (v) => v): object {
  const h = new EventTarget();
  Object.defineProperties(h, {
    [REFHANDLE]: { value: name },
    set: { value: (v: unknown) => write(h, () => check(v)) },
    update: { value: (f: (v: unknown) => unknown) => write(h, (x) => check(f(x))) },
    value: { get: () => seenValue(h, committedOf(recordOf(h)!)) },
  });
  return h;
}
// a state cell's initial value and each written value are deep-frozen as they go into the store
const madeStore = (h: object, value: unknown, view: boolean, run: { fid: string; args: unknown[] } | null) =>
  storeFeed({ t: "made", handle: h, name: nameOfHandle(h), value: published(value), view, run });

// Turn the StateCell a cell returned into a handle on a store of its own (the port harness, run.ts).
export function materialize(cell: { initial: unknown }, name: string) {
  const h = handleOf(name);
  madeStore(h, cell.initial, false, null);
  return h;
}

// read(s) inside an action: the committed value plus every write made earlier in call order
export function read(handle: object): unknown {
  notInMemo("read(...) called");
  return seenValue(handle, readSees(storeState, handle && typeof handle === "object" ? recordOf(handle) : null));
}

// A state cell's handle variable: viewof <name> = ss_ref(this, name, [inputs], fn). prev is the variable's last
// value, as the Runtime gives it: its handle, when the same function text made it, is kept, so a cell taking
// State<T> keeps it across runs; a new store from fn(...args) unless every input is the same (Object.is) as on
// the last run, which keeps the store and so the state. A variable with no last value (its first run, or after
// an error) starts again.
export function ref(prev: unknown, name: string, args: unknown[], fn: (...a: unknown[]) => unknown): object {
  const fid = String(fn);
  // prev is any other value (globalThis, in a sloppy-mode definition) when the variable has no last value
  const last = prev && typeof prev === "object" ? records.get(prev) ?? null : null;
  const plan = refPlan(last, fid, args);
  if (!plan.remake) return prev as object;
  rt.evalDepth++;
  let r: unknown;
  try { r = fn(...args); } finally { rt.evalDepth--; }
  if (!isStateCell(r)) throw new Error(`${name} did not return state(...)`);
  const h = plan.keep ? (prev as object) : handleOf(name);
  madeStore(h, r.initial, false, { fid, args });
  return h;
}

const views = new WeakMap<object, object>();
// A State<T> over the value of a viewof variable: an Observable JavaScript view, which is its own store (a read
// is what the control holds now, so one it rounded or clamped), or an imported state cell's handle. One handle
// per view, so a reader that takes it runs again only when the view itself is replaced.
export function viewHandle(el: ViewEl, name: string, check: (v: unknown) => unknown) {
  const known = views.get(el);
  if (known) return known;
  const handle = handleOf(name, check);
  views.set(el, handle);
  if (isRefHandle(el)) over.set(handle, el);
  else { viewEls.set(handle, { el, check }); madeStore(handle, check(el.value), true, null); }
  return handle;
}

// An action (S6.12): called inside an action's function it is part of that call and returns what its function
// returns; called anywhere else (an event handler, a listener, JavaScript) it is a top-level call, which runs to
// completion now and keeps its writes only if it does not throw (S6.10, S6.13). What the function returns is not
// waited for: a write it makes later, from a promise callback or a kept function, finds no action on the stack and
// throws.
export function action(f: (...args: unknown[]) => unknown) {
  const a = (...args: unknown[]): unknown => {
    notInMemo("an action called");
    storeFeed({ t: "enter", evaluating: rt.evalDepth > 0 });
    let v: unknown;
    // the arguments are deep-frozen, all of them or none (one scan before anything is frozen, holes8): the caller's
    // values are published to the action's writes and listeners
    try { noBodyFn(`an argument of the action ${nameOf(a)}`, args); v = f(...deepFreeze(args)); } catch (err) { storeFeed({ t: "exit", threw: true, value: undefined }); throw err; }
    return storeFeed({ t: "exit", threw: false, value: v });
  };
  Object.defineProperty(a, ACTION, { value: true });
  // an action handle reaches its body: deepFreeze freezes what the body captures when the handle is published
  return closure(a, (i) => (i < 0 ? 1 : f));
}

// memo(f) (S2.13): f's result for an argument list seen before, else f's. A key is the argument count, then each
// argument: a primitive by Object.is (so -0 is not 0), an object by identity, held weakly. A miss deep-freezes the
// arguments in place, as an action's arguments are, so a caller's later write to one throws (S4.6), and the result; it
// stores only when no argument needed a copy (a typed array, a native Map), no argument reaches a function (p1) and f
// returned. A frozen copy of each object argument instead (tried 2026-11-23) made the checker 6x slower: its keys are
// trees made in the same call, never frozen.
// >0 while a memoised function computes a result: an action call, a write or read(...) then throws, since a later call
// that gives the stored result would skip it (what the checker cannot see: a function value that calls an action)
let memoDepth = 0;
const notInMemo = (what: string) => { if (memoDepth > 0) throw new Error(`${what} while a memoised function computes a result: a call that gives the stored result would skip it (S2.13)`); };
type MemoNode = { p: Map<unknown, MemoNode> | null; o: WeakMap<object, MemoNode> | null; has: boolean; v: unknown };
const NEG0 = Symbol("-0");
const memoNode = (): MemoNode => ({ p: null, o: null, has: false, v: undefined });
function memoStep(n: MemoNode, k: unknown, add: boolean): MemoNode | undefined {
  if ((typeof k === "object" && k !== null) || typeof k === "function") {
    let c = n.o?.get(k);
    if (c === undefined && add) (n.o ??= new WeakMap()).set(k, (c = memoNode()));
    return c;
  }
  const key = Object.is(k, -0) ? NEG0 : k;
  let c = n.p?.get(key);
  if (c === undefined && add) (n.p ??= new Map()).set(key, (c = memoNode()));
  return c;
}
// p1 (2026-11-23): an argument list that reaches a function is not stored. With closure registration off nothing
// freezes what the function captures, so a body that writes such a capture after the call would change a stored key's
// value; no static rule sees a memoised function that arrives as a cell input. Fail-closed: an object of a kind not
// walked here counts as reaching one. A frozen object's answer is kept (its graph cannot change); a part met again on
// the path (a cycle) is not, since it was read as false while open
const REACH_FN = new WeakMap<object, boolean>();
const LEAF_PROTOS = new Set<object>([Date.prototype, RegExp.prototype, URL.prototype, ArrayBuffer.prototype]);
function reachesFn(v: unknown, open: Set<object>, cyc: { hit: boolean }): boolean {
  if (typeof v === "function") return true;
  if (typeof v !== "object" || v === null) return false;
  const known = REACH_FN.get(v);
  if (known !== undefined) return known;
  if (open.has(v)) { cyc.hit = true; return false; }
  const p = Object.getPrototypeOf(v);
  if (ArrayBuffer.isView(v) || (p !== null && (LEAF_PROTOS.has(p) || p instanceof URL))) return false;
  const kids: unknown[] = Array.isArray(v) ? v : v instanceof Map ? [...v].flat() : v instanceof Set ? [...v]
    : p === Object.prototype || p === null || v instanceof Error ? Object.getOwnPropertyNames(v).map((k) => (v as Record<string, unknown>)[k]) : [() => 0];
  open.add(v);
  const before = cyc.hit;
  cyc.hit = false;
  const r = kids.some((x) => reachesFn(x, open, cyc));
  open.delete(v);
  if ((r || !cyc.hit) && Object.isFrozen(v)) REACH_FN.set(v, r);
  cyc.hit = cyc.hit || before;
  return r;
}
export function memo<A extends unknown[], R>(f: (...a: A) => R): (...a: A) => R {
  const root = memoNode();
  const path = (a: unknown[], add: boolean) => { let n = memoStep(root, a.length, add); for (let i = 0; n !== undefined && i < a.length; i++) n = memoStep(n, a[i], add); return n; };
  const m = (...a: A): R => {
    const hit = path(a, false);
    if (hit?.has) return hit.v as R;
    if (publishSeen.f !== null) publishSeen.f("an argument of a memoised function", a);
    const fa = deepFreeze(a);
    memoDepth++;
    let r0: R;
    try { r0 = f(...fa); } finally { memoDepth--; }
    const r = deepFreeze(r0);
    if (fa === a && !reachesFn(fa, new Set(), { hit: false })) { const n = path(a, true)!; n.has = true; n.v = r; if (publishTap.f !== null) publishTap.f("memo store", [fa, r]); }
    return r;
  };
  // the memoised function reaches f: deepFreeze freezes what f captures when it is published
  return closure(m, (i) => (i < 0 ? 1 : f));
}

export function snapshot<T>(v: T): T {
  if (ArrayBuffer.isView(v) && !(v instanceof DataView)) return (v as unknown as { slice(): T }).slice();
  return structuredClone(v);
}

// the text of a caught value: an Error's message when it is a string, otherwise String(e); never throws
export function messageOf(e: unknown): string {
  try {
    if (e instanceof Error && typeof e.message === "string") return e.message;
    return String(e);
  } catch {
    return "(a thrown value whose text cannot be read)";
  }
}

// an SsMap or SsSet (what SoundScript code makes) equals a native Map or Set with the same entries
const protoOf = (x: object) => { const p = Object.getPrototypeOf(x); return p === SsMap.prototype ? Map.prototype : p === SsSet.prototype ? Set.prototype : p; };
export function equals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (protoOf(a) !== protoOf(b)) return false;
  if (ArrayBuffer.isView(a)) {
    const x = a as unknown as ArrayLike<unknown>, y = b as unknown as ArrayLike<unknown>;
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (!Object.is(x[i], y[i])) return false;
    return true;
  }
  if (a instanceof Map) {
    const m = b as Map<unknown, unknown>;
    if (a.size !== m.size) return false;
    for (const [k, v] of a) if (!m.has(k) || !equals(v, m.get(k))) return false;
    return true;
  }
  if (a instanceof Set) {
    const s = b as Set<unknown>;
    if (a.size !== s.size) return false;
    for (const v of a) if (!s.has(v)) return false;
    return true;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!Object.hasOwn(b, k) || !equals((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  return true;
}

// Capabilities, deterministic per consuming cell so the two definition orders are comparable.
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function makeRandom(seedName: string) {
  let a = hash(seedName);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeClock() {
  let t = 0;
  return () => (t += 1); // fake clock: 1ms per read
}
export function makeLog(cell: string, sink: string[]) {
  return (...args: unknown[]) => void sink.push(`${cell}: ${args.map(String).join(" ")}`);
}
