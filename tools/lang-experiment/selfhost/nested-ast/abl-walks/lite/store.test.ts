// Unit tests for the decision cells of store.ss.ts, each called alone with plain values. Run: bun lite/store.test.ts
import * as rtCells from "./runtime.ss.ts";
import * as eventCells from "./events.ss.ts";
import * as storeCells from "./store.ss.ts";
import type { StoreRecord, StoreState, Writes } from "./store.ss.ts";
import { link } from "./link.ts";

const S = link({ ...rtCells, ...eventCells, ...storeCells }, { mut: rtCells.mut(), freeze: rtCells.freeze() });
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail: unknown = "") => {
  if (cond) { pass++; console.log(`pass ${name}`); } else { fail++; console.log(`FAIL ${name}: ${JSON.stringify(detail)}`); }
};
const eq = (a: unknown, b: unknown) => Bun.deepEquals(a, b, true);
const rec = (sid: number, over: Partial<StoreRecord> = {}): StoreRecord => ({ sid, name: `s${sid}`, view: false, value: sid * 10, run: null, ...over });
const st = (over: Partial<StoreState> = {}): StoreState => ({ ...S.emptyStore, ...over });
const writes = (...e: [number, unknown, unknown][]): Writes => new Map(e.map(([sid, handle, value]) => [sid, { handle, value }]));
const h1 = { h: 1 }, h2 = { h: 2 };

// is this write legal: only while an action's function runs, and then into the running top-level call
{
  const call = writes();
  ok("writeTarget: outside an action it is refused, naming the written handle",
    eq(S.writeTarget(st(), "n"), { ok: false, msg: "State n: set/update called outside an action" }));
  ok("writeTarget: with a call but no action function running it is refused", !S.writeTarget(st({ call }), "n").ok);
  const w = S.writeTarget(st({ depth: 2, call }), "n");
  ok("writeTarget: inside an action it goes to the top-level call", w.ok && w.call === call);
  const refused = S.storeStep(st(), { t: "write", handle: h1, name: "n", store: rec(0), value: 1 });
  ok("write outside an action: a throw effect and the state as it was",
    eq(refused.effects, [{ fx: "throw", msg: "State n: set/update called outside an action" }]) && eq(refused.state, st()));
  const first = st({ depth: 1, call });
  const r = S.storeStep(first, { t: "write", handle: h1, name: "n", store: rec(3), value: null });
  ok("write inside an action: the call holds it by sid, the old call is not changed",
    r.state.call?.get(3)?.value === null && r.state.call?.get(3)?.handle === h1 && call.size === 0 && r.effects.length === 0, [...(r.state.call ?? [])]);
}

// what a read returns: this call's write, then a finished call's, then the committed value; a view's element is read
{
  const s = st({ depth: 1, call: writes(), ready: writes([0, h1, 2]) });
  ok("currentOf: this call's write first", eq(S.currentOf(s, writes([0, h1, 3]), rec(0)), { k: "value", value: 3 }));
  ok("currentOf: then a finished call's write", eq(S.currentOf(s, writes(), rec(0)), { k: "value", value: 2 }));
  ok("currentOf: then the committed value", eq(S.currentOf(s, writes(), rec(1)), { k: "value", value: 10 }));
  ok("currentOf: a write of null is a value, not missing", eq(S.currentOf(s, writes([1, h1, null]), rec(1)), { k: "value", value: null }));
  ok("currentOf: a view with no write is its element's value", eq(S.currentOf(s, writes(), rec(1, { view: true })), { k: "view" }));
  ok("readSees: outside an action it is refused, naming the store", eq(S.readSees(st(), rec(1)), { k: "refused", msg: "read(s1) called outside an action" }));
  ok("readSees: not a state cell's handle", eq(S.readSees(s, null), { k: "refused", msg: "read(...) needs a State" }));
  ok("readSees: inside an action, the current value", eq(S.readSees(s, rec(0)), { k: "value", value: 2 }));
  ok("updateSees: outside an action it is refused before the function runs", S.updateSees(st(), "n", rec(0)).k === "refused");
  ok("committedOf: handle.value is the committed value, also inside a call that wrote it", eq(S.committedOf(rec(1)), { k: "value", value: 10 }) && eq(S.committedOf(rec(1, { view: true })), { k: "view" }));
}

// nested-call bookkeeping: a call inside an action joins it; a top-level call starts one; none during an evaluation
{
  const call = writes([0, h1, 5]);
  const nested = S.enterCall(st({ depth: 2, call }), true);
  ok("enterCall: nested, even during a cell evaluation, joins the call", nested.state.depth === 3 && nested.state.call === call && nested.effects.length === 0);
  ok("enterCall: top-level during a cell evaluation is refused", eq(S.enterCall(st(), true), { state: st(), effects: [{ fx: "throw", msg: "action called during a cell evaluation" }] }));
  const top = S.enterCall(st(), false);
  ok("enterCall: top-level starts an empty call", top.state.depth === 1 && top.state.call?.size === 0);
  const out = S.exitCall(st({ depth: 3, call }), false, null);
  ok("exitCall: a nested call returns its function's value (null too) and keeps the call", out.state.depth === 2 && out.state.call === call && eq(out.effects, [{ fx: "return", value: null }]));
  const top2 = S.exitCall(st({ depth: 1, call }), false, 7);
  ok("exitCall: a top-level call returns nothing and ends the call", top2.state.depth === 0 && top2.state.call === null && !top2.effects.some((e) => e.fx === "return"));
  ok("exitCall: after a reset during a call (depth 0) nothing changes", eq(S.exitCall(st(), false, 1), { state: st(), effects: [] }));
}

// discard on throw: a top-level call that threw keeps no write; a nested one that threw and was caught keeps its writes
{
  const ready = writes([0, h1, 2]), call = writes([0, h1, 3], [1, h2, 4]);
  const top = S.exitCall(st({ depth: 1, call, ready }), true, undefined);
  ok("exitCall: a top-level throw drops the call and leaves ready the same object", top.state.ready === ready && top.state.call === null && top.state.depth === 0 && top.effects.length === 0);
  const nested = S.exitCall(st({ depth: 2, call, ready }), true, undefined);
  ok("exitCall: a nested throw leaves its writes in the call", nested.state.call === call && nested.state.depth === 1 && nested.state.ready === ready);
}

// what commits now, and in what order
{
  const a = S.mergeWrites(writes(), writes([1, h1, "a"], [2, h2, "b"]));
  ok("mergeWrites: the first call to join an empty ready asks for the commit", a.schedule);
  const b = S.mergeWrites(a.ready, writes([2, h2, "c"], [3, h1, "d"]));
  ok("mergeWrites: later calls do not ask again; a store keeps its first-write place and takes the last value",
    !b.schedule && eq([...b.ready].map(([k, p]) => [k, p.value]), [[1, "a"], [2, "c"], [3, "d"]]) && a.ready.size === 2);
  ok("mergeWrites: a call with no writes asks for no commit", !S.mergeWrites(writes(), writes()).schedule);
  const done = S.exitCall(st({ depth: 1, call: writes([4, h1, 1]) }), false, undefined);
  ok("exitCall: a top-level call that returned joins ready and asks for one commit", eq([...done.state.ready.keys()], [4]) && eq(done.effects, [{ fx: "schedule" }]));
  const view = { v: 1 };
  const s = st({ ready: writes([0, h1, 5], [1, view, 6], [2, h2, 7]) });
  const r = S.commitReady(s, new Map([[0, rec(0)], [1, rec(1, { view: true })]]));
  ok("commitReady: every store takes its value before any is told, in ready's order; a replaced store (no record) is skipped",
    eq(r.effects, [{ fx: "keep", handle: h1, store: rec(0, { value: 5 }) }, { fx: "setView", handle: view, value: 6 }, { fx: "tell", handle: h1 }, { fx: "tellView", handle: view }]), r.effects);
  ok("commitReady: ready is empty after", r.state.ready.size === 0 && s.ready.size === 3);
  ok("commitReady: a store the handle no longer holds (another sid) is skipped", S.commitReady(st({ ready: writes([5, h1, 1]) }), new Map([[6, rec(6)]])).effects.length === 0);
}

// keep or replace the handle and the store
{
  const o = {};
  const last = rec(0, { run: { fid: "f", args: [1, o] } });
  ok("refPlan: same text, same inputs (Object.is): keep the handle and the store", eq(S.refPlan(last, "f", [1, o]), { keep: true, remake: false }));
  ok("refPlan: same text, an input not the same object: keep the handle, new store", eq(S.refPlan(last, "f", [1, {}]), { keep: true, remake: true }));
  ok("refPlan: same text, NaN for NaN is the same input", eq(S.refPlan(rec(0, { run: { fid: "f", args: [NaN] } }), "f", [NaN]), { keep: true, remake: false }));
  ok("refPlan: other text: new handle and store", eq(S.refPlan(last, "g", [1, o]), { keep: false, remake: true }));
  ok("refPlan: no last value, or a store no state cell made: new handle", eq(S.refPlan(null, "f", []), { keep: false, remake: true }) && eq(S.refPlan(rec(0), "f", []), { keep: false, remake: true }));
  const m = S.makeStore(st({ nextSid: 4 }), h1, "n", null, false, null);
  ok("makeStore: the state gains only a sid (nothing per store), the record goes to the handle", eq(m.state, st({ nextSid: 5 })) && eq(m.effects, [{ fx: "keep", handle: h1, store: { sid: 4, name: "n", view: false, value: null, run: null } }]));
  ok("resetStore: no call, nothing ready, sids not reused", eq(S.resetStore(st({ depth: 2, call: writes(), ready: writes([0, h1, 1]), nextSid: 9 })).state, st({ nextSid: 9 })));
  ok("isIdle: no call and nothing ready", S.isIdle(st()) && !S.isIdle(st({ call: writes() })) && !S.isIdle(st({ ready: writes([0, h1, 1]) })));
}

console.log(`${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
