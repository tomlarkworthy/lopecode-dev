// What a write, a read and an action call may do, and what a commit applies, as SoundScript cells:
// storeStep(state, event) returns the next StoreState and the effects to perform. prelude.runtime.ts holds the one
// StoreState value and, keyed by handle, each store's record, which only these cells make; it runs the actions'
// functions and performs the effects. Under bun, runtime-ss.ts links these cells with runtime.ss.ts and
// events.ss.ts; in the notebook they are compiled cells of @tomlarkworthy/soundscript-runtime.

// a state cell's last run: its function text and inputs
export type StoreRun = { readonly fid: string; readonly args: readonly unknown[] };
// one store of a handle. sid tells it from the store a state cell made again over the same handle; value is the
// committed value, except for a view, whose element holds it
export type StoreRecord = { readonly sid: number; readonly name: string; readonly view: boolean; readonly value: unknown; readonly run: StoreRun | null };
// a write waiting in a call or for the commit, by sid; handle is the store's handle, told when it commits
export type Pending = { readonly handle: unknown; readonly value: unknown };
export type Writes = Map<number, Pending>;
// depth: how many action functions are running; call: the running top-level call's writes; ready: the writes
// of finished calls, in call order, until the commit
export type StoreState = { readonly depth: number; readonly call: Writes | null; readonly ready: Writes; readonly nextSid: number };
export type StoreEvent =
  | { readonly t: "enter"; readonly evaluating: boolean }
  | { readonly t: "exit"; readonly threw: boolean; readonly value: unknown }
  | { readonly t: "write"; readonly handle: unknown; readonly name: string; readonly store: StoreRecord; readonly value: unknown }
  | { readonly t: "made"; readonly handle: unknown; readonly name: string; readonly value: unknown; readonly view: boolean; readonly run: StoreRun | null }
  | { readonly t: "commit"; readonly stores: Map<number, StoreRecord> }
  | { readonly t: "reset" };
export type StoreEffect =
  | { readonly fx: "throw"; readonly msg: string }
  | { readonly fx: "return"; readonly value: unknown }
  | { readonly fx: "schedule" }
  | { readonly fx: "keep"; readonly handle: unknown; readonly store: StoreRecord }
  | { readonly fx: "setView"; readonly handle: unknown; readonly value: unknown }
  | { readonly fx: "tell" | "tellView"; readonly handle: unknown };
export type StoreStep = { readonly state: StoreState; readonly effects: readonly StoreEffect[] };
// what a read or an update's function is given: a value, the value of a view's element, or why it may not
export type Seen = { readonly k: "value"; readonly value: unknown } | { readonly k: "view" } | { readonly k: "refused"; readonly msg: string };
export type Owner = { readonly ok: true; readonly call: Writes } | { readonly ok: false; readonly msg: string };
export type RefPlan = { readonly keep: boolean; readonly remake: boolean };

// a value, not a function: no call running and nothing to commit
export const emptyStore = (): StoreState => ({ depth: 0, call: null, ready: new Map(), nextSid: 0 });
export const isIdle = () => (st: StoreState): boolean => st.call === null && st.ready.size === 0;

// the call a write or read belongs to: the top-level call, while an action's function is on the stack
export const ownerOf = () => (st: StoreState): Writes | null => (st.depth > 0 ? st.call : null);
// a set or update is legal only while an action's function runs; name is the written handle's
export const writeTarget = (ownerOf) => (st: StoreState, name: string): Owner => {
  const call = ownerOf(st);
  return call === null ? { ok: false, msg: `State ${name}: set/update called outside an action` } : { ok: true, call };
};
// handle.value, legal anywhere
export const committedOf = () => (store: StoreRecord): Seen => (store.view ? { k: "view" } : { k: "value", value: store.value });
// the value as of this point in the call order: this call's writes, then finished calls', then committed
export const currentOf = (committedOf) => (st: StoreState, call: Writes, store: StoreRecord): Seen => {
  const w = call.get(store.sid) ?? st.ready.get(store.sid);
  return w === undefined ? committedOf(store) : { k: "value", value: w.value };
};
// what update's function is given, before it runs
export const updateSees = (writeTarget, currentOf) => (st: StoreState, name: string, store: StoreRecord): Seen => {
  const w = writeTarget(st, name);
  return w.ok ? currentOf(st, w.call, store) : { k: "refused", msg: w.msg };
};
// read(r): store is null when r is not a state cell's handle
export const readSees = (ownerOf, currentOf) => (st: StoreState, store: StoreRecord | null): Seen => {
  if (store === null) return { k: "refused", msg: "read(...) needs a State" };
  const call = ownerOf(st);
  return call === null ? { k: "refused", msg: `read(${store.name}) called outside an action` } : currentOf(st, call, store);
};
// a state cell's run keeps its handle when the same function text made it, and its store unless an input changed
export const refPlan = (same) => (last: StoreRecord | null, fid: string, args: readonly unknown[]): RefPlan => {
  const keep = last !== null && last.run !== null && last.run.fid === fid;
  return { keep, remake: !keep || last === null || last.run === null || !same(last.run.args, args) };
};

// a call made while an action's function runs is part of that call; otherwise it starts one, unless a cell is evaluating
export const enterCall = () => (st: StoreState, evaluating: boolean): StoreStep => {
  if (st.depth > 0) return { state: { ...st, depth: st.depth + 1 }, effects: [] };
  if (evaluating) return { state: st, effects: [{ fx: "throw", msg: "action called during a cell evaluation" }] };
  const call: Writes = new Map();
  return { state: { ...st, depth: 1, call }, effects: [] };
};
// a finished call's writes join those waiting for the commit, in first-write order; the first to join asks for the commit
export const mergeWrites = () => (ready: Writes, call: Writes): { readonly ready: Writes; readonly schedule: boolean } => {
  if (call.size === 0) return { ready, schedule: false };
  const next = new Map(ready);
  for (const [sid, p] of call) next.set(sid, p);
  return { ready: next, schedule: ready.size === 0 };
};
// a nested call returns its function's value and leaves its writes in the call, also when it threw (its caller
// caught it); a top-level call returns nothing, and its writes join ready unless it threw
export const exitCall = (mergeWrites) => (st: StoreState, threw: boolean, value: unknown): StoreStep => {
  if (st.depth > 1) return { state: { ...st, depth: st.depth - 1 }, effects: [{ fx: "return", value }] };
  const ended: StoreState = { ...st, depth: 0, call: null };
  if (threw || st.call === null) return { state: ended, effects: [] };
  const m = mergeWrites(st.ready, st.call);
  return { state: { ...ended, ready: m.ready }, effects: m.schedule ? [{ fx: "schedule" }] : [] };
};
export const writeInCall = (writeTarget) => (st: StoreState, handle: unknown, name: string, store: StoreRecord, value: unknown): StoreStep => {
  const w = writeTarget(st, name);
  if (!w.ok) return { state: st, effects: [{ fx: "throw", msg: w.msg }] };
  const call = new Map(w.call);
  call.set(store.sid, { handle, value });
  return { state: { ...st, call: call }, effects: [] };
};
// a new store for a handle; a write waiting for the store it replaces is not committed
export const makeStore = () => (st: StoreState, handle: unknown, name: string, value: unknown, view: boolean, run: StoreRun | null): StoreStep => {
  const store: StoreRecord = { sid: st.nextSid, name, view, value, run };
  return { state: { ...st, nextSid: st.nextSid + 1 }, effects: [{ fx: "keep", handle, store }] };
};
// stores: the records the handles in ready hold now, by sid. Every store takes its value before any is told, so no
// reader sees some of a commit's values and not others; a view's element is told as a user's change would tell it
export const commitReady = () => (st: StoreState, stores: Map<number, StoreRecord>): StoreStep => {
  const sets: Mut<StoreEffect[]> = [], tells: Mut<StoreEffect[]> = [];
  for (const [sid, p] of st.ready) {
    const s = stores.get(sid);
    if (s === undefined) continue;
    sets.push(s.view ? { fx: "setView", handle: p.handle, value: p.value } : { fx: "keep", handle: p.handle, store: { ...s, value: p.value } });
    tells.push({ fx: s.view ? "tellView" : "tell", handle: p.handle });
  }
  const ready: Writes = new Map();
  return { state: { ...st, ready }, effects: [...sets, ...tells] };
};
// sids are not reused: a record made before the reset may still be held
export const resetStore = (emptyStore) => (st: StoreState): StoreStep => ({ state: { ...emptyStore, nextSid: st.nextSid }, effects: [] });

export const storeStep = (enterCall, exitCall, writeInCall, makeStore, commitReady, resetStore) => (st: StoreState, ev: StoreEvent): StoreStep => {
  switch (ev.t) {
    case "enter": return enterCall(st, ev.evaluating);
    case "exit": return exitCall(st, ev.threw, ev.value);
    case "write": return writeInCall(st, ev.handle, ev.name, ev.store, ev.value);
    case "made": return makeStore(st, ev.handle, ev.name, ev.value, ev.view, ev.run);
    case "commit": return commitReady(st, ev.stores);
    case "reset": return resetStore(st);
  }
};
