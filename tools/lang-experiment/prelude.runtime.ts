// Runtime half of prelude.d.ts. Imported by the transpiled cells.ts/shell.ts and by run.ts.

const STATECELL = Symbol.for("lc.statecell");
const ACTION = Symbol.for("lc.action");
const REFHANDLE = Symbol.for("lc.state");

// el: an Observable JavaScript view (viewHandle), which holds the committed value itself
type ViewEl = { value: unknown; dispatchEvent(e: Event): boolean };
// handle: the state cell's handle whose store this is, told of each commit
type Store = { name: string; value: unknown; handle?: object; el?: ViewEl; check?: (v: unknown) => unknown };
// One top-level action call, from when it starts until it finishes: its writes, applied in call order
type Call = Map<Store, unknown>;

// the cell an action was defined by, when the runtime knows it; flush and listeners name actions by it
export const actionNames = new WeakMap<object, string>();
// the host's lookup of the cell whose value an action is, for an action actionNames does not name
export const actionNamer = { of: null as ((a: object) => string | null) | null };
export const nameOf = (a: object) => actionNames.get(a) ?? actionNamer.of?.(a) ?? "(anonymous)";

export const rt = {
  evalDepth: 0, // >0 while a cell definition (or a generator step) runs synchronously
  actionDepth: 0, // >0 while an action's function runs synchronously
  // the top-level call in flight; one at a time for the whole runtime
  call: null as Call | null,
  // top-level calls waiting for the one in flight, in call order
  waiting: [] as (() => void)[],
  // set while an event handler, or a listener delivery runs: an action it calls is a
  // top-level call, even while another call is in flight
  entry: null as ((e: unknown, action: object) => void) | null,
  // the writes of finished calls, in call order, until commit
  ready: new Map<Store, unknown>(),
  commits: 0,
};

export function reset() {
  rt.evalDepth = 0;
  rt.actionDepth = 0;
  rt.call = null;
  rt.waiting = [];
  rt.entry = null;
  rt.ready = new Map();
  rt.commits = 0;
}
// no call in flight or waiting, and nothing left to commit
export const idle = () => !rt.call && !rt.waiting.length && !rt.ready.size;
export const actionQueue = () => ({ inFlight: !!rt.call, waiting: rt.waiting.length });

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
const newStore = (name: string, value: unknown): Store => ({ name, value });

// the call a write or read belongs to: the one running synchronously, or, outside any cell evaluation,
// the one in flight (its code after an await)
const owner = (): Call | null => (rt.actionDepth > 0 || rt.evalDepth === 0 ? rt.call : null);
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
// A state cell's handle variable: viewof <name> = ss.ref(this, name, [inputs], fn). prev is the variable's last
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

const thenable = (r: unknown): r is PromiseLike<unknown> => typeof (r as { then?: unknown } | null)?.then === "function";
const reportTo = (a: object) => (e: unknown) => console.error(`action ${nameOf(a)} threw:`, e);

// Runs f while an event handler, or a listener delivery is calling actions: each action
// it calls is a top-level call. report(e, action) gets the error of a call that does not throw to f's
// caller (it was queued, or its promise rejected); null reports it on the console naming the action.
export function entry<T>(report: ((e: unknown, action: object) => void) | null, f: () => T): T {
  const was = rt.entry;
  rt.entry = report ?? ((e, a) => reportTo(a)(e));
  try { return f(); } finally { rt.entry = was; }
}

// the call ends: its writes commit, unless it failed; the next waiting call starts
function finish(c: Call, ok: boolean) {
  rt.call = null;
  if (ok && c.size) {
    // one commit per macrotask: two in one task tear a reader of two state cells (runtime.test.ts g6)
    if (!rt.ready.size) setTimeout(commit, 0);
    for (const [st, v] of c) rt.ready.set(st, v);
  }
  pump();
}
let pumping = false;
function pump() {
  if (pumping) return;
  pumping = true;
  try { while (!rt.call && rt.waiting.length) rt.waiting.shift()!(); } finally { pumping = false; }
}

// A top-level call: it runs now (sync: a throw goes to the caller) or when the one before it finishes.
// It finishes when f has returned and the promise-like it returned, if any, has settled.
function run(f: () => unknown, report: (e: unknown) => void, sync: boolean) {
  const c: Call = new Map();
  rt.call = c;
  let r: unknown;
  try { r = inAction(f); } catch (e) {
    finish(c, false);
    if (sync) throw e;
    return report(e);
  }
  if (!thenable(r)) return finish(c, true);
  Promise.resolve(r).then(() => finish(c, true), (e) => { report(e); finish(c, false); });
}
function inAction(f: () => unknown) {
  rt.actionDepth++;
  try { return f(); } finally { rt.actionDepth--; }
}

export function action(f: (...args: unknown[]) => unknown) {
  const a = (...args: unknown[]): unknown => {
    if (rt.evalDepth > 0 && rt.actionDepth === 0) throw new Error("action called during a cell evaluation");
    // inside the call in flight (in its body, or after an await outside an entry): a plain function call
    if (rt.call && (rt.actionDepth > 0 || !rt.entry)) return inAction(() => f(...args));
    // named while it is still its cell's value: an edit before its error is reported does not lose the name
    if (!actionNames.has(a)) { const n = actionNamer.of?.(a); if (n) actionNames.set(a, n); }
    const via = rt.entry;
    const report = via ? (e: unknown) => via(e, a) : reportTo(a);
    if (!rt.call && !rt.waiting.length) run(() => f(...args), report, true);
    else rt.waiting.push(() => run(() => f(...args), report, false));
    return undefined;
  };
  Object.defineProperty(a, ACTION, { value: true });
  return a;
}

export const mut = <T>(v: T) => v;
export const freeze = <T>(v: T) => v;
export const borrow = <T>(v: T) => v;

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
