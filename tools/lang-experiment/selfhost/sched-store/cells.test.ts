// Decision cells tested alone, with plain values. Run: bun test selfhost/sched-store/cells.test.ts
import { test, expect } from "bun:test";
import { link } from "../../lite/link.ts";
import { mut, freeze } from "../../lite/runtime-ss.ts";
import * as cells from "./step.ss.ts";
const S = link(cells, { mut, freeze });
const st = (o: Partial<typeof S.init> = {}) => ({ ...S.init, ...o });
const store = (hid: number, view = false) => ({ name: `s${hid}`, handle: hid, view });
const one = st({ stores: new Map([[0, store(7)]]), storeOf: new Map([[7, 0]]), names: new Map([[7, "n"]]), committed: new Map([[0, 1]]), nextSid: 1 });

test("writeTarget: a write is legal only while an action's function runs, and goes to the call", () => {
  expect(S.writeTarget(one, 7)).toEqual({ ok: false, msg: "State n: set/update called outside an action" });
  const call = new Map();
  expect(S.writeTarget({ ...one, depth: 1, call }, 7)).toEqual({ ok: true, call, sid: 0 });
  expect(S.writeTarget({ ...one, depth: 0, call }, 7).ok).toBe(false);
  expect(S.writeTarget({ ...one, depth: 1, call, over: new Map([[9, 7]]) }, 9)).toEqual({ ok: true, call, sid: 0 });
});
test("onEnter: nested joins the call; top-level starts one; during a cell evaluation it is refused", () => {
  const c = new Map([[0, 5]]);
  expect(S.onEnter({ ...one, depth: 2, call: c }, true).state).toMatchObject({ depth: 3, call: c });
  expect(S.onEnter(one, true).effects).toEqual([{ fx: "throw", msg: "action called during a cell evaluation" }]);
  expect(S.onEnter(one, false).state).toMatchObject({ depth: 1, call: new Map() });
});
test("merged: in first-write order; only the first call to join an empty ready asks for the commit", () => {
  const a = S.merged(new Map(), new Map([[1, "a"], [2, "b"]]));
  expect(a.schedule).toBe(true);
  const b = S.merged(a.ready, new Map([[2, "c"], [3, "d"]]));
  expect(b.schedule).toBe(false);
  expect([...b.ready]).toEqual([[1, "a"], [2, "c"], [3, "d"]]);
  expect(S.merged(new Map(), new Map()).schedule).toBe(false);
});
test("onExit: a top-level throw drops the call's writes and keeps earlier calls' ready", () => {
  const ready = new Map([[0, 2]]), call = new Map([[0, 3]]);
  const r = S.onExit({ ...one, depth: 1, call, ready }, true, 9);
  expect(r.state).toMatchObject({ depth: 0, call: null });
  expect(r.state.ready).toBe(ready);
  expect(r.effects).toEqual([{ fx: "answer", value: undefined }]);
});
test("onExit: a nested call that threw (and was caught) leaves its writes in the call and returns its value", () => {
  const call = new Map([[0, 3]]);
  const r = S.onExit({ ...one, depth: 2, call }, true, 9);
  expect(r.state).toMatchObject({ depth: 1, call });
  expect(r.effects).toEqual([{ fx: "answer", value: 9 }]);
});
test("onExit: a top-level call that returned joins ready, asks for one commit, returns nothing", () => {
  const r = S.onExit({ ...one, depth: 1, call: new Map([[0, 3]]) }, false, 9);
  expect([...r.state.ready]).toEqual([[0, 3]]);
  expect(r.effects).toEqual([{ fx: "schedule" }, { fx: "answer", value: undefined }]);
});
test("currentOf: this call's write, then a finished call's, then committed; a view is read by the shell", () => {
  const s = { ...one, ready: new Map([[0, 2]]) };
  expect(S.currentOf(s, new Map([[0, 3]]), 0)).toEqual({ fx: "answer", value: 3 });
  expect(S.currentOf(s, new Map(), 0)).toEqual({ fx: "answer", value: 2 });
  expect(S.currentOf(one, new Map(), 0)).toEqual({ fx: "answer", value: 1 });
  expect(S.currentOf({ ...one, stores: new Map([[0, store(7, true)]]) }, new Map(), 0)).toEqual({ fx: "readView", hid: 7 });
});
test("onRef: keep the handle for the same function text; keep the store for the same inputs (Object.is)", () => {
  const o = {};
  const s = { ...one, runs: new Map([[7, { fid: "f", args: [1, o] }]]) };
  expect(S.onRef(s, 7, "f", [1, o]).effects).toEqual([{ fx: "plan", keep: 7, remake: false }]);
  expect(S.onRef(s, 7, "f", [1, {}]).effects).toEqual([{ fx: "plan", keep: 7, remake: true }]);
  expect(S.onRef(s, 7, "g", [1, o]).effects).toEqual([{ fx: "plan", keep: null, remake: true }]);
  expect(S.onRef(s, null, "f", [1, o]).effects).toEqual([{ fx: "plan", keep: null, remake: true }]);
});
test("onCommit: every store takes its value before any is told; a replaced store is neither set nor told", () => {
  const s = { ...one, stores: new Map([[0, store(7)], [1, store(8, true)]]), ready: new Map([[0, 5], [1, 6], [2, 7]]) };
  const r = S.onCommit(s);
  expect(r.effects).toEqual([{ fx: "setView", hid: 8, value: 6 }, { fx: "tell", hid: 7 }, { fx: "tellView", hid: 8 }]);
  expect(r.state.committed.get(0)).toBe(5);
  expect(r.state.ready.size).toBe(0);
  expect(r.state.commits).toBe(1);
});
test("withStore: a handle made again gets a new store and the old one is dropped; it keeps its first name", () => {
  const s = S.withStore(one, 7, "other", false, 4);
  expect([...s.stores]).toEqual([[1, { name: "n", handle: 7, view: false }]]);
  expect(s.storeOf.get(7)).toBe(1);
  expect(s.committed.has(0)).toBe(false);
});
