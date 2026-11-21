// The store, commit and action decisions of prelude.runtime.ts as small cells; step(state, event) is the switch.
// sid: a store, minted here. hid: a handle, minted by the shell. Values are unknown: the shell checks them.
type Run = { readonly fid: string; readonly args: readonly unknown[] };
type StoreRec = { readonly name: string; readonly handle: number; readonly view: boolean };
type Store = {
  readonly depth: number; readonly call: Map<number, unknown> | null; readonly ready: Map<number, unknown>; readonly commits: number;
  readonly stores: Map<number, StoreRec>; readonly committed: Map<number, unknown>; readonly storeOf: Map<number, number>;
  readonly over: Map<number, number>; readonly names: Map<number, string>; readonly runs: Map<number, Run>; readonly nextSid: number;
};
type Ev =
  | { readonly t: "enter"; readonly evaluating: boolean }
  | { readonly t: "exit"; readonly threw: boolean; readonly value: unknown }
  | { readonly t: "current"; readonly hid: number }
  | { readonly t: "write"; readonly hid: number; readonly value: unknown }
  | { readonly t: "read"; readonly hid: number | null }
  | { readonly t: "peek"; readonly hid: number }
  | { readonly t: "ref"; readonly prev: number | null; readonly fid: string; readonly args: readonly unknown[] }
  | { readonly t: "made"; readonly hid: number; readonly name: string; readonly value: unknown; readonly run: Run | null }
  | { readonly t: "viewed"; readonly hid: number; readonly name: string; readonly value: unknown }
  | { readonly t: "over"; readonly hid: number; readonly name: string; readonly target: number }
  | { readonly t: "commit" }
  | { readonly t: "reset" };
type Answer = { readonly fx: "answer"; readonly value: unknown } | { readonly fx: "readView"; readonly hid: number };
type Fx =
  | Answer
  | { readonly fx: "throw"; readonly msg: string }
  | { readonly fx: "plan"; readonly keep: number | null; readonly remake: boolean }
  | { readonly fx: "schedule" }
  | { readonly fx: "setView"; readonly hid: number; readonly value: unknown }
  | { readonly fx: "tellView"; readonly hid: number }
  | { readonly fx: "tell"; readonly hid: number };
type Out = { readonly state: Store; readonly effects: readonly Fx[] };
type Target = { readonly ok: true; readonly call: Map<number, unknown>; readonly sid: number } | { readonly ok: false; readonly msg: string };

export const init = (): Store => ({
  depth: 0, call: null, ready: new Map(), commits: 0, stores: new Map(), committed: new Map(), storeOf: new Map(),
  over: new Map(), names: new Map(), runs: new Map(), nextSid: 0,
});
export const isIdle = () => (st: Store): boolean => st.call === null && st.ready.size === 0;
export const refused = () => (st: Store, msg: string): Out => ({ state: st, effects: [{ fx: "throw", msg }] });
export const answered = () => (st: Store, a: Answer): Out => ({ state: st, effects: [a] });

// the store a handle writes to: its own, or the one of the handle it is a view over
export const storeIdOf = () => (st: Store, hid: number): number | null => st.storeOf.get(st.over.get(hid) ?? hid) ?? null;
// the call a write or read belongs to: the top-level call, while an action's function is on the stack
export const ownerOf = () => (st: Store): Map<number, unknown> | null => (st.depth > 0 ? st.call : null);
// where a set or update goes, or why it may not
export const writeTarget = (ownerOf, storeIdOf) => (st: Store, hid: number): Target => {
  const call = ownerOf(st), sid = storeIdOf(st, hid);
  if (call === null) return { ok: false, msg: `State ${st.names.get(hid) ?? ""}: set/update called outside an action` };
  if (sid === null) return { ok: false, msg: `State ${st.names.get(hid) ?? ""} has no store` };
  return { ok: true, call, sid };
};
// what the shell reads for a committed value: a view's element, else the value held here
export const committedOf = () => (st: Store, sid: number): Answer => {
  const s = st.stores.get(sid);
  return s !== undefined && s.view ? { fx: "readView", hid: s.handle } : { fx: "answer", value: st.committed.get(sid) };
};
// the value as of this point in the call order: this call's writes, then finished calls', then committed
export const currentOf = (committedOf) => (st: Store, call: Map<number, unknown>, sid: number): Answer =>
  call.has(sid) ? { fx: "answer", value: call.get(sid) } : st.ready.has(sid) ? { fx: "answer", value: st.ready.get(sid) } : committedOf(st, sid);

// a call made while an action's function runs is part of that call; otherwise it starts one, unless a cell is evaluating
export const onEnter = (refused) => (st: Store, evaluating: boolean): Out => {
  if (st.depth > 0) return { state: { ...st, depth: st.depth + 1 }, effects: [] };
  if (evaluating) return refused(st, "action called during a cell evaluation");
  const call: Map<number, unknown> = new Map();
  return { state: { ...st, depth: 1, call }, effects: [] };
};
// a finished call's writes join those waiting for commit, in call order; the first to join asks for the commit
export const merged = () => (ready: Map<number, unknown>, call: Map<number, unknown>): { readonly ready: Map<number, unknown>; readonly schedule: boolean } => {
  if (call.size === 0) return { ready, schedule: false };
  const next = mut(new Map(ready));
  for (const [sid, v] of call) next.set(sid, v);
  return { ready: freeze(next), schedule: ready.size === 0 };
};
// a nested call returns its value and leaves the writes in the call; a top-level call returns nothing and its
// writes join ready, unless it threw: then they are dropped with the call, and ready is as it was
export const onExit = (merged) => (st: Store, threw: boolean, value: unknown): Out => {
  if (st.depth > 1) return { state: { ...st, depth: st.depth - 1 }, effects: [{ fx: "answer", value }] };
  const ended: Store = { ...st, depth: st.depth - 1, call: null };
  if (threw || st.call === null) return { state: ended, effects: [{ fx: "answer", value: undefined }] };
  const m = merged(st.ready, st.call);
  return { state: { ...ended, ready: m.ready }, effects: m.schedule ? [{ fx: "schedule" }, { fx: "answer", value: undefined }] : [{ fx: "answer", value: undefined }] };
};
// before update's function runs: the value it is given, or the refusal
export const onCurrent = (writeTarget, currentOf, refused, answered) => (st: Store, hid: number): Out => {
  const w = writeTarget(st, hid);
  return w.ok ? answered(st, currentOf(st, w.call, w.sid)) : refused(st, w.msg);
};
export const onWrite = (writeTarget, refused) => (st: Store, hid: number, value: unknown): Out => {
  const w = writeTarget(st, hid);
  if (!w.ok) return refused(st, w.msg);
  const call = mut(new Map(w.call));
  call.set(w.sid, value);
  return { state: { ...st, call: freeze(call) }, effects: [] };
};
export const onRead = (storeIdOf, ownerOf, currentOf, refused, answered) => (st: Store, hid: number | null): Out => {
  const sid = hid === null ? null : storeIdOf(st, hid);
  const s = sid === null ? undefined : st.stores.get(sid);
  if (sid === null || s === undefined) return refused(st, "read(...) needs a State");
  const call = ownerOf(st);
  return call === null ? refused(st, `read(${s.name}) called outside an action`) : answered(st, currentOf(st, call, sid));
};
// handle.value: the committed value, legal anywhere
export const onPeek = (storeIdOf, committedOf, answered) => (st: Store, hid: number): Out => {
  const sid = storeIdOf(st, hid);
  return answered(st, sid === null ? { fx: "answer", value: undefined } : committedOf(st, sid));
};
// two input lists are the same run (events.ss.ts has the same rule as same; that file is not linked here)
export const sameInputs = () => (a: readonly unknown[], b: readonly unknown[]): boolean => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
// a state cell's run keeps its handle when the same function text made it, and its store unless an input changed
export const onRef = (sameInputs) => (st: Store, prev: number | null, fid: string, args: readonly unknown[]): Out => {
  const last = prev === null ? undefined : st.runs.get(prev);
  const keep = last !== undefined && last.fid === fid ? prev : null;
  const remake = keep === null || last === undefined || !sameInputs(last.args, args);
  return { state: st, effects: [{ fx: "plan", keep, remake }] };
};
// a handle gets a new store; the one it replaces is dropped, as no handle reaches it any more
export const withStore = () => (st: Store, hid: number, name: string, view: boolean, value: unknown): Store => {
  const stores = mut(new Map(st.stores)), committed = mut(new Map(st.committed)), storeOf = mut(new Map(st.storeOf)), names = mut(new Map(st.names));
  const old = st.storeOf.get(hid), sid = st.nextSid;
  if (old !== undefined) { stores.delete(old); committed.delete(old); }
  // a kept handle keeps its first name
  const named = st.names.get(hid) ?? name;
  names.set(hid, named); stores.set(sid, { name: named, handle: hid, view }); committed.set(sid, value); storeOf.set(hid, sid);
  return { ...st, stores: freeze(stores), committed: freeze(committed), storeOf: freeze(storeOf), names: freeze(names), nextSid: sid + 1 };
};
export const onMade = (withStore) => (st: Store, hid: number, name: string, value: unknown, run: Run | null): Out => {
  const next = withStore(st, hid, name, false, value);
  if (run === null) return { state: next, effects: [] };
  const runs = mut(new Map(st.runs));
  runs.set(hid, run);
  return { state: { ...next, runs: freeze(runs) }, effects: [] };
};
export const onOver = () => (st: Store, hid: number, name: string, target: number): Out => {
  const over = mut(new Map(st.over)), names = mut(new Map(st.names));
  over.set(hid, target); names.set(hid, name);
  return { state: { ...st, over: freeze(over), names: freeze(names) }, effects: [] };
};
// who is told of a committed store: a view's element (as a user's change would), else its handle
export const tellOf = () => (s: StoreRec): Fx => (s.view ? { fx: "tellView", hid: s.handle } : { fx: "tell", hid: s.handle });
// every store takes its value before any is told, so no reader sees some of a commit's values and not others
export const onCommit = (tellOf) => (st: Store): Out => {
  const committed = mut(new Map(st.committed)), sets: Mut<Fx[]> = mut([]), tells: Mut<Fx[]> = mut([]);
  for (const [sid, v] of st.ready) {
    const s = st.stores.get(sid);
    if (s === undefined) continue;
    if (s.view) sets.push({ fx: "setView", hid: s.handle, value: v });
    else committed.set(sid, v);
    tells.push(tellOf(s));
  }
  return { state: { ...st, ready: new Map(), committed: freeze(committed), commits: st.commits + 1 }, effects: [...sets, ...tells] };
};
export const onReset = () => (st: Store): Out => ({ state: { ...st, depth: 0, call: null, ready: new Map(), commits: 0 }, effects: [] });

export const step = (onEnter, onExit, onCurrent, onWrite, onRead, onPeek, onRef, onMade, withStore, onOver, onCommit, onReset) => (st: Store, ev: Ev): Out => {
  switch (ev.t) {
    case "enter": return onEnter(st, ev.evaluating);
    case "exit": return onExit(st, ev.threw, ev.value);
    case "current": return onCurrent(st, ev.hid);
    case "write": return onWrite(st, ev.hid, ev.value);
    case "read": return onRead(st, ev.hid);
    case "peek": return onPeek(st, ev.hid);
    case "ref": return onRef(st, ev.prev, ev.fid, ev.args);
    case "made": return onMade(st, ev.hid, ev.name, ev.value, ev.run);
    case "viewed": return { state: withStore(st, ev.hid, ev.name, true, ev.value), effects: [] };
    case "over": return onOver(st, ev.hid, ev.name, ev.target);
    case "commit": return onCommit(st);
    case "reset": return onReset(st);
  }
};
