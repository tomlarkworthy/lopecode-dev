// Port attempt (2026-11-20): every declaration of prelude.runtime.ts that the runtime module holds, written as
// a SoundScript cell with types. Not linked, not built. Its cells are the runtime module's, which defines the prelude
// (d1: read and state may keep their names there): bun selfhost/rt/check.ts selfhost/rt/prelude.ss.ts --home @tomlarkworthy/soundscript-runtime
type ViewEl = { value: unknown; dispatchEvent(e: Event): boolean };
type Store = { name: string; value: unknown; handle?: object; el?: ViewEl; check?: (v: unknown) => unknown };
type Call = Map<Store, unknown>;
type Rt = { evalDepth: number; actionDepth: number; call: Call | null; waiting: (() => void)[]; entry: ((e: unknown, action: object) => void) | null; ready: Map<Store, unknown>; commits: number };

export const STATECELL = () => Symbol.for("lc.statecell");
export const ACTION = () => Symbol.for("lc.action");
export const REFHANDLE = () => Symbol.for("lc.state");
export const actionNames = () => new WeakMap<object, string>();
export const actionNamer = (): { of: ((a: object) => string | null) | null } => ({ of: null });
export const nameOf = (actionNames: WeakMap<object, string>, actionNamer: { of: ((a: object) => string | null) | null }) => (a: object): string =>
  actionNames.get(a) ?? actionNamer.of?.(a) ?? "(anonymous)";
export const rt = (): Rt => ({ evalDepth: 0, actionDepth: 0, call: null, waiting: [], entry: null, ready: new Map(), commits: 0 });
export const idle = (rt: Rt) => (): boolean => !rt.call && !rt.waiting.length && !rt.ready.size;
export const actionQueue = (rt: Rt) => (): { inFlight: boolean; waiting: number } => ({ inFlight: !!rt.call, waiting: rt.waiting.length });
export const state = (STATECELL: symbol) => <T,>(initial: T): { initial: T } => ({ [STATECELL]: true, initial });
export const isStateCell = (STATECELL: symbol) => (v: unknown): boolean => typeof v === "object" && v !== null && STATECELL in v;
export const isRefHandle = (REFHANDLE: symbol) => (v: unknown): boolean => typeof v === "object" && v !== null && REFHANDLE in v;
export const stores = () => new WeakMap<object, Store>();
export const over = () => new WeakMap<object, object>();
export const storeOf = (stores: WeakMap<object, Store>, over: WeakMap<object, object>) => (h: object): Store | undefined => stores.get(over.get(h) ?? h);
export const newStore = () => (name: string, value: unknown): Store => ({ name, value });
export const owner = (rt: Rt) => (): Call | null => (rt.actionDepth > 0 || rt.evalDepth === 0 ? rt.call : null);
export const current = (rt: Rt) => (store: Store): unknown => {
  const c = rt.call;
  if (c !== null && c.has(store)) return c.get(store);
  if (rt.ready.has(store)) return rt.ready.get(store);
  const el = store.el, check = store.check;
  return el !== undefined && check !== undefined ? check(el.value) : store.value;
};
export const write = (owner: () => Call | null, storeOf: (h: object) => Store | undefined, current: (s: Store) => unknown) => (h: object, f: (v: unknown) => unknown): void => {
  const c = owner();
  if (c === null) throw new Error("State: set/update called outside an action");
  const store = storeOf(h);
  if (store === undefined) throw new Error("State: no store");
  c.set(store, f(current(store)));
};
export const handleOf = (REFHANDLE: symbol, write: (h: object, f: (v: unknown) => unknown) => void, storeOf: (h: object) => Store | undefined) =>
  (name: string, check: (v: unknown) => unknown = (v: unknown): unknown => v): object => {
    const h = new EventTarget();
    Object.defineProperties(h, {
      [REFHANDLE]: { value: name },
      set: { value: (v: unknown) => write(h, () => check(v)) },
      update: { value: (f: (v: unknown) => unknown) => write(h, (x) => check(f(x))) },
      value: { get: (): unknown => { const st = storeOf(h); return st === undefined ? undefined : st.value; } },
    });
    return h;
  };
export const setStore = (stores: WeakMap<object, Store>, newStore: (name: string, value: unknown) => Store) => (h: object, name: string, value: unknown): void => {
  stores.set(h, { ...newStore(name, value), handle: h });
};
export const read = (storeOf: (h: object) => Store | undefined, owner: () => Call | null, current: (s: Store) => unknown) => (handle: object): unknown => {
  const store = storeOf(handle);
  if (store === undefined) throw new Error("read(...) needs a State");
  if (owner() === null) throw new Error(`read(${store.name}) called outside an action`);
  return current(store);
};
export const runs = () => new WeakMap<object, { id: string; args: readonly unknown[] }>();
export const ref = (runs: WeakMap<object, { id: string; args: readonly unknown[] }>, rt: Rt, isStateCell: (v: unknown) => boolean, handleOf: (name: string) => object, setStore: (h: object, name: string, value: unknown) => void) =>
  (prev: unknown, name: string, args: readonly unknown[], fn: (...a: unknown[]) => unknown): object => {
    const id = String(fn);
    const last = typeof prev === "object" && prev !== null ? runs.get(prev) : undefined;
    const kept = last !== undefined && last.id === id && typeof prev === "object" && prev !== null ? prev : null;
    if (kept !== null && last !== undefined && last.args.length === args.length && args.every((x, i) => Object.is(x, last.args[i]))) return kept;
    rt.evalDepth++;
    let r: unknown = null;
    try { r = fn(...args); } finally { rt.evalDepth--; }
    if (!isStateCell(r)) throw new Error(`${name} did not return state(...)`);
    const h = kept ?? handleOf(name);
    setStore(h, name, typeof r === "object" && r !== null && "initial" in r ? r.initial : undefined);
    runs.set(h, { id, args });
    return h;
  };
export const commit = (rt: Rt, stores: WeakMap<object, Store>) => (): void => {
  const layer = rt.ready;
  rt.ready = new Map();
  for (const [st, v] of layer) {
    st.value = v;
    const el = st.el;
    if (el !== undefined) el.value = v;
  }
  for (const st of layer.keys()) {
    const el = st.el, h = st.handle;
    if (el !== undefined) el.dispatchEvent(new Event("input", { bubbles: true }));
    else if (h !== undefined && stores.get(h) === st) h.dispatchEvent(new Event("input"));
  }
  rt.commits++;
};
export const views = () => new WeakMap<object, object>();
export const viewHandle = (views: WeakMap<object, object>, handleOf: (name: string, check: (v: unknown) => unknown) => object, isRefHandle: (v: unknown) => boolean, over: WeakMap<object, object>, stores: WeakMap<object, Store>, newStore: (name: string, value: unknown) => Store) =>
  (el: ViewEl, name: string, check: (v: unknown) => unknown): object => {
    const known = views.get(el);
    if (known !== undefined) return known;
    const handle = handleOf(name, check);
    views.set(el, handle);
    if (isRefHandle(el)) over.set(handle, el);
    else stores.set(handle, { ...newStore(name, check(el.value)), el, check });
    return handle;
  };
export const thenable = () => (r: unknown): boolean => typeof r === "object" && r !== null && "then" in r && typeof r.then === "function";
export const reportTo = (nameOf: (a: object) => string) => (a: object) => (e: unknown): void => console.error(`action ${nameOf(a)} threw:`, e);
export const entry = (rt: Rt, reportTo: (a: object) => (e: unknown) => void) => <T,>(report: ((e: unknown, action: object) => void) | null, f: () => T): T => {
  const was = rt.entry;
  rt.entry = report ?? ((e: unknown, a: object) => reportTo(a)(e));
  try { return f(); } finally { rt.entry = was; }
};
export const finish = (rt: Rt, commit: () => void, pump: () => void) => (c: Call, ok: boolean): void => {
  rt.call = null;
  if (ok && c.size) {
    if (!rt.ready.size) setTimeout(commit, 0);
    for (const [st, v] of c) rt.ready.set(st, v);
  }
  pump();
};
export const pump = (rt: Rt) => {
  let pumping = false;
  return (): void => {
    if (pumping) return;
    pumping = true;
    try {
      for (let f = rt.call === null ? rt.waiting.shift() : undefined; f !== undefined; f = rt.call === null ? rt.waiting.shift() : undefined) f();
    } finally { pumping = false; }
  };
};
export const inAction = (rt: Rt) => (f: () => unknown): unknown => {
  rt.actionDepth++;
  try { return f(); } finally { rt.actionDepth--; }
};
export const run = (rt: Rt, inAction: (f: () => unknown) => unknown, finish: (c: Call, ok: boolean) => void, thenable: (r: unknown) => boolean) =>
  (f: () => unknown, report: (e: unknown) => void, sync: boolean): void => {
    const c: Call = new Map();
    rt.call = c;
    let r: unknown = null;
    try { r = inAction(f); } catch (e) {
      finish(c, false);
      if (sync) throw e;
      return report(e);
    }
    if (!thenable(r)) return finish(c, true);
    Promise.resolve(r).then(() => finish(c, true), (e: unknown) => { report(e); finish(c, false); });
  };
export const action = (rt: Rt, inAction: (f: () => unknown) => unknown, actionNames: WeakMap<object, string>, actionNamer: { of: ((a: object) => string | null) | null }, reportTo: (a: object) => (e: unknown) => void, run: (f: () => unknown, report: (e: unknown) => void, sync: boolean) => void, ACTION: symbol) =>
  (f: (...args: unknown[]) => unknown): ((...args: unknown[]) => unknown) => {
    const a = (...args: unknown[]): unknown => {
      if (rt.evalDepth > 0 && rt.actionDepth === 0) throw new Error("action called during a cell evaluation");
      if (rt.call !== null && (rt.actionDepth > 0 || rt.entry === null)) return inAction(() => f(...args));
      if (!actionNames.has(a)) { const n = actionNamer.of?.(a); if (n) actionNames.set(a, n); }
      const via = rt.entry;
      const report = via !== null ? (e: unknown): void => via(e, a) : reportTo(a);
      if (rt.call === null && !rt.waiting.length) run(() => f(...args), report, true);
      else rt.waiting.push(() => run(() => f(...args), report, false));
      return undefined;
    };
    Object.defineProperty(a, ACTION, { value: true });
    return a;
  };
export const mut = () => <T,>(v: T): T => v;
export const freeze = () => <T,>(v: T): T => v;
export const borrow = () => <T,>(v: T): T => v;
export const snapshot = () => <T,>(v: T): T => structuredClone(v);
export const equals = () => {
  const eq = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => eq(x, b[i]));
    if (a instanceof Map && b instanceof Map) return a.size === b.size && [...a].every(([k, v]) => b.has(k) && eq(v, b.get(k)));
    if (a instanceof Set && b instanceof Set) return a.size === b.size && [...a].every((v) => b.has(v));
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && eq(a[k], b[k]));
  };
  return eq;
};
