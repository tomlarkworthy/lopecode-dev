// Runtime half of prelude.d.ts. Imported by the transpiled cells.ts/shell.ts and by run.ts.

const STATECELL = Symbol.for("lc.statecell");
const ACTION = Symbol.for("lc.action");
const REFHANDLE = Symbol.for("lc.state");

// el: an Observable JavaScript view (viewHandle), which holds the committed value itself
type ViewEl = { value: unknown; dispatchEvent(e: Event): boolean };
type Store = { name: string; value: unknown; version: number; waiters: (() => void)[]; el?: ViewEl; check?: (v: unknown) => unknown };
// One top-level action call, from when it starts until it finishes: its writes, applied in call order
type Call = Map<Store, unknown>;

// the cell an action was defined by, when the runtime knows it; flush and listeners name actions by it
export const actionNames = new WeakMap<object, string>();

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
const newStore = (name: string, value: unknown): Store => ({ name, value, version: 0, waiters: [] });

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
// check: a written value's check (the shape of a type that crosses from another language)
function handleOf(name: string, check: (v: unknown) => unknown = (v) => v): object {
  const h: object = Object.freeze({
    [REFHANDLE]: name,
    set: (v: unknown) => write(h, () => check(v)),
    update: (f: (v: unknown) => unknown) => write(h, (x) => check(f(x))),
  });
  return h;
}

// Turn the StateCell a cell returned into a handle on a store of its own (the port harness, run.ts).
export function materialize(cell: { initial: unknown }, name: string) {
  const h = handleOf(name);
  stores.set(h, newStore(name, cell.initial));
  return h;
}

// read(s) inside an action: the committed value plus every write made earlier in call order
export function read(handle: object): unknown {
  const store = storeOf(handle);
  if (!store) throw new Error("read(...) needs a State");
  if (!owner()) throw new Error(`read(${store.name}) called outside an action`);
  return current(store);
}

// The values of a handle's store: the current value, then once per committed write (a state cell's value
// variable).
export function* refValues(handle: object): Generator<unknown> {
  const store = storeOf(handle)!;
  let seen = store.version;
  yield store.value;
  for (;;) {
    if (store.version !== seen) yield ((seen = store.version), store.value);
    else yield new Promise<void>((res) => store.waiters.push(res)).then(() => ((seen = store.version), store.value));
  }
}

const runs = new WeakMap<object, { args: unknown[]; handle: object }>();
// A state cell's handle variable. One handle per definition (self), so a cell taking State<T> keeps it across
// runs; a new store from make(), which runs the cell, unless every input is the same (Object.is) as on the
// last run, which keeps the store and so the state.
export function stateRun(self: object, name: string, args: unknown[], make: () => unknown, kept?: () => void): object {
  const last = runs.get(self);
  if (last && last.args.length === args.length && args.every((x, i) => Object.is(x, last.args[i]))) { kept?.(); return last.handle; }
  const r = make();
  if (!isStateCell(r)) throw new Error(`${name} did not return state(...)`);
  const handle = last?.handle ?? handleOf(name);
  stores.set(handle, newStore(name, r.initial));
  runs.set(self, { args, handle });
  return handle;
}

// Commits the writes of the calls that finished since the last commit: every store takes its value, with
// one version bump, and its readers are woken.
function commit() {
  const layer = rt.ready;
  rt.ready = new Map();
  for (const [st, v] of layer) {
    st.value = v;
    // a view takes the value and is told with an input event, as a user's change would tell it
    if (st.el) { st.el.value = v; st.el.dispatchEvent(new Event("input", { bubbles: true })); }
  }
  for (const st of layer.keys()) {
    st.version++;
    const ws = st.waiters;
    st.waiters = [];
    ws.forEach((f) => f());
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
const nameOf = (a: object) => actionNames.get(a) ?? "(anonymous)";
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
