// Runtime half of prelude.d.ts. Imported by the transpiled cells.ts/shell.ts and by run.ts.

const REFCELL = Symbol.for("lc.refcell");
const ACTION = Symbol.for("lc.action");
const REFHANDLE = Symbol.for("lc.ref");

type Store = { name: string; value: unknown; version: number; waiters: (() => void)[] };
type Group = { action: object };

// the cell an action was defined by, when the runtime knows it; flush and listeners name actions by it
export const actionNames = new WeakMap<object, string>();

export const state = {
  evalDepth: 0, // >0 while a cell definition (or a generator step) runs synchronously
  actionDepth: 0,
  // writes are applied when they are made, in call order, to this batch's overlay; flush commits it
  overlay: new Map<Store, unknown>(),
  // one entry per write, to undo a call's writes when it throws: the store and its overlay state before
  queue: [] as { store: Store; had: boolean; prev: unknown; group: Group }[],
  group: null as Group | null,
  flushScheduled: false,
  commits: 0,
};

export function reset() {
  state.evalDepth = 0;
  state.actionDepth = 0;
  state.overlay = new Map();
  state.queue = [];
  state.group = null;
  state.flushScheduled = false;
  state.commits = 0;
}

export function ref<T>(initial: T) {
  return { [REFCELL]: true, initial };
}
export const isRefCell = (v: unknown): v is { initial: unknown } => !!v && typeof v === "object" && REFCELL in v;
export const isAction = (v: unknown) => typeof v === "function" && ACTION in v;
export const isRefHandle = (v: unknown) => !!v && typeof v === "object" && REFHANDLE in v;

const stores = new WeakMap<object, Store>();

function guardWrite(name: string) {
  if (state.actionDepth === 0) throw new Error(`Ref ${name}: set/update called outside an action`);
}
// the value as of this point in the call order: the committed value plus this batch's writes so far
const current = (store: Store) => (state.overlay.has(store) ? state.overlay.get(store) : store.value);
function write(store: Store, f: (v: unknown) => unknown) {
  const next = f(current(store)); // an update function that throws throws here, inside the call
  state.queue.push({ store, had: state.overlay.has(store), prev: state.overlay.get(store), group: state.group! });
  state.overlay.set(store, next);
}

// Turn the RefCell a cell returned into the reference handle consumers typed Ref<T> receive.
export function materialize(cell: { initial: unknown }, name: string) {
  const store: Store = { name, value: cell.initial, version: 0, waiters: [] };
  const handle = Object.freeze({
    [REFHANDLE]: name,
    set(v: unknown) {
      guardWrite(name);
      write(store, () => v);
    },
    update(f: (v: unknown) => unknown) {
      guardWrite(name);
      write(store, f);
    },
  });
  stores.set(handle, store);
  return handle;
}

// read(ref) inside an action: the committed value plus every write made earlier in call order
export function read(handle: object): unknown {
  const store = stores.get(handle);
  if (!store) throw new Error("read(...) needs a Ref");
  if (state.actionDepth === 0) throw new Error(`read(${store.name}) called outside an action`);
  return current(store);
}

// Value of a ref cell: yields the current value, then once per committed write.
export function* refValues(handle: object): Generator<unknown> {
  const store = stores.get(handle)!;
  let seen = store.version;
  yield store.value;
  for (;;) {
    if (store.version !== seen) {
      seen = store.version;
      yield store.value;
    } else {
      yield new Promise((res) => store.waiters.push(() => res(undefined))).then(() => {
        seen = store.version;
        return store.value;
      });
    }
  }
}

// Commits the batch: every store the overlay holds takes its value, with one version bump, and its
// readers are woken. The writes were already applied, in call order, when they were made.
function flush() {
  state.flushScheduled = false;
  const next = state.overlay;
  state.overlay = new Map();
  state.queue = [];
  if (!next.size) return;
  for (const [st, v] of next) st.value = v;
  for (const st of next.keys()) {
    st.version++;
    const ws = st.waiters;
    st.waiters = [];
    ws.forEach((f) => f());
  }
  state.commits++;
}

function undoTo(mark: number) {
  for (let i = state.queue.length - 1; i >= mark; i--) {
    const w = state.queue[i];
    if (w.had) state.overlay.set(w.store, w.prev);
    else state.overlay.delete(w.store);
  }
  state.queue.length = mark;
}

export function action(f: (...args: unknown[]) => void) {
  const a = (...args: unknown[]) => {
    if (state.evalDepth > 0 && state.actionDepth === 0) throw new Error("action called during a cell evaluation");
    if (state.actionDepth === 0) state.group = { action: a };
    state.actionDepth++;
    // all or nothing: a throw (in the body or an update function) undoes the writes this call made,
    // its nested calls' included; the overlay is as it was when the call began
    const mark = state.queue.length;
    try {
      f(...args);
    } catch (e) {
      undoTo(mark);
      throw e;
    } finally {
      state.actionDepth--;
      if (state.actionDepth === 0) state.group = null;
      if (state.actionDepth === 0 && state.overlay.size && !state.flushScheduled) {
        state.flushScheduled = true;
        setTimeout(flush, 0); // a macrotask: never inside a cell's synchronous evaluation
      }
    }
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
