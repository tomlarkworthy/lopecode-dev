// Runtime half of prelude.d.ts. Imported by the transpiled cells.ts/shell.ts and by run.ts.
// newStore, mut, freeze and borrow are SoundScript cells (lite/runtime.ss.ts)
import { newStore } from "./lite/runtime-ss.ts";
export { mut, freeze, borrow } from "./lite/runtime-ss.ts";

const STATECELL = Symbol.for("lc.statecell");
const ACTION = Symbol.for("lc.action");
const REFHANDLE = Symbol.for("lc.state");

// el: an Observable JavaScript view (viewHandle), which holds the committed value itself
type ViewEl = { value: unknown; dispatchEvent(e: Event): boolean };
// handle: the state cell's handle whose store this is, told of each commit
type Store = { name: string; value: unknown; handle?: object; el?: ViewEl; check?: (v: unknown) => unknown };
// One top-level action call, while its function runs: its writes, applied in call order
type Call = Map<Store, unknown>;

// the cell an action was defined by, when the runtime knows it; flush and listeners name actions by it
export const actionNames = new WeakMap<object, string>();
// the host's lookup of the cell whose value an action is, for an action actionNames does not name
export const actionNamer = { of: null as ((a: object) => string | null) | null };
export const nameOf = (a: object) => actionNames.get(a) ?? actionNamer.of?.(a) ?? "(anonymous)";

export const rt = {
  evalDepth: 0, // >0 while a cell definition (or a generator step) runs synchronously
  actionDepth: 0, // >0 while an action's function runs; the only time a write, a read or a nested call is legal
  // the top-level call whose function is running (S6.13)
  call: null as Call | null,
  // the writes of finished calls, in call order, until commit
  ready: new Map<Store, unknown>(),
  commits: 0,
};

export function reset() {
  rt.evalDepth = 0;
  rt.actionDepth = 0;
  rt.call = null;
  rt.ready = new Map();
  rt.commits = 0;
}
// no call running and nothing left to commit
export const idle = () => !rt.call && !rt.ready.size;

export function state<T>(initial: T) {
  return { [STATECELL]: true, initial };
}
export const isStateCell = (v: unknown): v is { initial: unknown } => !!v && typeof v === "object" && STATECELL in v;
export const isAction = (v: unknown) => typeof v === "function" && ACTION in v;
export const isRefHandle = (v: unknown) => !!v && typeof v === "object" && REFHANDLE in v;

// handle -> its store; a handle over another handle (an imported state cell's, viewHandle) -> that handle
const stores = new WeakMap<object, Store>();
const over = new WeakMap<object, object>();
const storeOf = (h: object): Store | undefined => stores.get(over.get(h) ?? h);

// the call a write or read belongs to: the one whose action's function is on the stack, else none (it throws)
const owner = (): Call | null => (rt.actionDepth > 0 ? rt.call : null);
// the value as of this point in the call order: committed, then finished calls', then this call's writes
const current = (store: Store) => (rt.call?.has(store) ? rt.call.get(store) : rt.ready.has(store) ? rt.ready.get(store) : store.el ? store.check!(store.el.value) : store.value);
function write(h: object, f: (v: unknown) => unknown) {
  const c = owner();
  if (!c) throw new Error(`State ${(h as Record<symbol, string>)[REFHANDLE]}: set/update called outside an action`);
  const store = storeOf(h)!;
  c.set(store, f(current(store))); // an update function that throws throws here, inside the call
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
    value: { get: () => { const st = storeOf(h)!; return st.el ? st.check!(st.el.value) : st.value; } },
  });
  return h;
}
const setStore = (h: object, value: unknown) => stores.set(h, { ...newStore((h as Record<symbol, string>)[REFHANDLE], value), handle: h });

// Turn the StateCell a cell returned into a handle on a store of its own (the port harness, run.ts).
export function materialize(cell: { initial: unknown }, name: string) {
  const h = handleOf(name);
  setStore(h, cell.initial);
  return h;
}

// read(s) inside an action: the committed value plus every write made earlier in call order
export function read(handle: object): unknown {
  const store = storeOf(handle);
  if (!store) throw new Error("read(...) needs a State");
  if (!owner()) throw new Error(`read(${store.name}) called outside an action`);
  return current(store);
}

// each handle's function text and the inputs of its last run
const runs = new WeakMap<object, { id: string; args: unknown[] }>();
// A state cell's handle variable: viewof <name> = ss_ref(this, name, [inputs], fn). prev is the variable's last
// value, as the Runtime gives it: its handle, when the same function text made it, is kept, so a cell taking
// State<T> keeps it across runs; a new store from fn(...args) unless every input is the same (Object.is) as on
// the last run, which keeps the store and so the state. A variable with no last value (its first run, or after
// an error) starts again.
export function ref(prev: unknown, name: string, args: unknown[], fn: (...a: unknown[]) => unknown): object {
  const id = String(fn);
  // prev is any other value (globalThis, in a sloppy-mode definition) when the variable has no last value
  const last = prev && typeof prev === "object" ? runs.get(prev) : undefined;
  let h = last?.id === id ? (prev as object) : undefined;
  if (!h || !last || last.args.length !== args.length || !args.every((x, i) => Object.is(x, last.args[i]))) {
    rt.evalDepth++;
    let r: unknown;
    try { r = fn(...args); } finally { rt.evalDepth--; }
    if (!isStateCell(r)) throw new Error(`${name} did not return state(...)`);
    h ??= handleOf(name);
    setStore(h, r.initial);
    runs.set(h, { id, args });
  }
  return h;
}

// Commits the writes of the calls that finished since the last commit: every store takes its value, then
// each view is told with an input event, as a user's change would tell it.
function commit() {
  const layer = rt.ready;
  rt.ready = new Map();
  for (const [st, v] of layer) {
    st.value = v;
    if (st.el) st.el.value = v;
  }
  for (const st of layer.keys()) {
    if (st.el) st.el.dispatchEvent(new Event("input", { bubbles: true }));
    else if (st.handle && stores.get(st.handle) === st) (st.handle as EventTarget).dispatchEvent(new Event("input"));
  }
  rt.commits++;
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
  else stores.set(handle, { ...newStore(name, check(el.value)), el, check });
  return handle;
}

// The call ends: its writes commit, unless it threw. One commit per macrotask: two in one task tear a reader
// of two state cells (runtime.test.ts g6), so the writes of calls that finish before the commit share it.
function finish(c: Call) {
  if (!c.size) return;
  if (!rt.ready.size) setTimeout(commit, 0);
  for (const [st, v] of c) rt.ready.set(st, v);
}
function inAction(f: () => unknown) {
  rt.actionDepth++;
  try { return f(); } finally { rt.actionDepth--; }
}

// An action (S6.12): called inside an action's function it is part of that call and returns what its function
// returns; called anywhere else (an event handler, a listener, JavaScript) it is a top-level call, which runs to
// completion now and keeps its writes only if it does not throw (S6.10, S6.13). What the function returns is not
// waited for: a write it makes later, from a promise callback or a kept function, finds no action on the stack and
// throws.
export function action(f: (...args: unknown[]) => unknown) {
  const a = (...args: unknown[]): unknown => {
    if (rt.actionDepth > 0) return inAction(() => f(...args));
    if (rt.evalDepth > 0) throw new Error("action called during a cell evaluation");
    const c: Call = new Map();
    rt.call = c;
    try { inAction(() => f(...args)); } finally { rt.call = null; }
    finish(c);
    return undefined;
  };
  Object.defineProperty(a, ACTION, { value: true });
  return a;
}

export function snapshot<T>(v: T): T {
  if (ArrayBuffer.isView(v) && !(v instanceof DataView)) return (v as unknown as { slice(): T }).slice();
  return structuredClone(v);
}

export function equals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
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
