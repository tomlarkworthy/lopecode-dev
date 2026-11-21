// Unit tests for the decision cells of events.ss.ts, each called alone with plain values; the handlers are given
// plain Maps and arrays for their Mut working copies. Run: bun lite/events.test.ts
import * as rtCells from "./runtime.ss.ts";
import * as eventCells from "./events.ss.ts";
import type { EventsRecord, ListenerRecord, Effect } from "./events.ss.ts";
import { link } from "./link.ts";

const S = link({ ...rtCells, ...eventCells }, { mut: rtCells.mut(), freeze: rtCells.freeze() });
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail: unknown = "") => {
  if (cond) { pass++; console.log(`pass ${name}`); } else { fail++; console.log(`FAIL ${name}: ${JSON.stringify(detail)}`); }
};
const eq = (a: unknown, b: unknown) => Bun.deepEquals(a, b, true);
const record = (over: Partial<EventsRecord> = {}): EventsRecord => ({ ...S.newEventsRecord("e in m", "e"), ...over });
const listener = (hid: number, key: string, over: Partial<ListenerRecord> = {}): ListenerRecord => ({ hid, key, cell: key, aid: 0, parked: false, born: null, ...over });

// sweep: a value no variable holds is released only in the generation after the one that marked it
{
  const cases: [boolean, boolean, number | null, number, string][] = [
    [true, false, 1, 5, "spare"], [false, true, null, 5, "release"], [false, false, null, 5, "mark"],
    [false, false, 5, 5, "keep"], [false, false, 4, 5, "release"], [true, true, 4, 5, "spare"],
  ];
  for (const [held, parked, born, g, want] of cases) ok(`sweepVerdict(${held}, ${parked}, ${born}, ${g}) is ${want}`, S.sweepVerdict(held, parked, born, g) === want, S.sweepVerdict(held, parked, born, g));
  ok("nextBorn: mark records the generation, keep keeps it, spare and release clear it",
    S.nextBorn("mark", null, 5) === 5 && S.nextBorn("keep", 5, 5) === 5 && S.nextBorn("spare", 3, 5) === null && S.nextBorn("release", 4, 5) === null);
  const handles = new Map([[1, record({ listeners: [2, 3] })]]), handleAt = new Map([["e in m", 1]]);
  const listeners = new Map([[2, listener(1, "a in m")], [3, listener(1, "b in m", { born: 1 })]]), listenerAt = new Map([["a in m", 2], ["b in m", 3]]);
  const fx: Effect[] = [], counters = { placer: false, generation: 1 };
  S.onSweep(handles, handleAt, listeners, listenerAt, fx, counters, { t: "sweep", heldListeners: [], heldHandles: [1] });
  ok("onSweep: a listener marked a generation before is detached, one unmarked is marked, a held handle is spared",
    counters.generation === 2 && listenerAt.get("a in m") === 2 && listeners.get(2)?.born === 2 && !listeners.has(3) && eq(handles.get(1)?.listeners, [2]) && handles.get(1)?.born === null && eq(fx, [{ fx: "forgetListener", lid: 3 }]),
    { counters, fx, l2: listeners.get(2) });
}

// the next listener for a value: in its order, skipping one detached mid-value and one no longer attached
{
  const h = record({ listeners: [1, 3], toCall: [2, 1, 3] });
  const ls = new Map([[1, listener(9, "a")], [3, listener(9, "c")]]);
  ok("nextListener skips a listener no longer in the map", eq(S.nextListener({ ...h, listeners: [2, 1, 3] }, ls), { lid: 1, rest: [3] }));
  ok("nextListener calls in the value's order", eq(S.nextListener(h, ls), { lid: 1, rest: [3] }), S.nextListener(h, ls));
  ok("nextListener skips a listener no longer attached to this events cell", eq(S.nextListener({ ...h, listeners: [3] }, ls), { lid: 3, rest: [] }));
  ok("nextListener gives null when none is left", eq(S.nextListener({ ...h, listeners: [] }, ls), { lid: null, rest: [] }));
  const handles = new Map([[9, record({ listeners: [1, 3], order: [3, 1], queue: ["v"], draining: true })]]), fx: Effect[] = [];
  ok("startNextValue: a kept order is the order the next value is delivered in", S.startNextValue(handles, fx, true, 9, handles.get(9)!) && eq(handles.get(9)?.toCall, [3, 1]) && handles.get(9)?.current === "v" && fx.length === 0);
  const unordered = new Map([[9, record({ listeners: [1, 3], queue: ["v"], draining: true })]]), fx2: Effect[] = [];
  ok("startNextValue: with a host and no kept order, the value waits for the host to place its listeners",
    !S.startNextValue(unordered, fx2, true, 9, unordered.get(9)!) && eq(fx2, [{ fx: "place", hid: 9, lids: [1, 3] }]), fx2);
  ok("needsPlacing: only with a host, no kept order and two listeners or more",
    S.needsPlacing(record({ listeners: [1, 2] }), true) && !S.needsPlacing(record({ listeners: [1, 2] }), false) && !S.needsPlacing(record({ listeners: [1] }), true) && !S.needsPlacing(record({ listeners: [1, 2], order: [2, 1] }), true));
}

// invalidation: a listener whose events cell is pending is parked; otherwise it is detached
{
  ok("parksOnInvalidation: pending parks, not pending or released does not",
    S.parksOnInvalidation(record({ pending: true })) && !S.parksOnInvalidation(record()) && !S.parksOnInvalidation(undefined));
  const run = (pending: boolean) => {
    const handles = new Map([[1, record({ pending, listeners: [2] })]]);
    const listeners = new Map([[2, listener(1, "a in m")]]), listenerAt = new Map([["a in m", 2]]), fx: Effect[] = [];
    S.onListenerInvalidated(handles, listeners, listenerAt, fx, { t: "listenerInvalidated", hid: 1, lid: 2, key: "a in m" });
    return { handles, listeners, listenerAt, fx };
  };
  const parked = run(true), detached = run(false);
  ok("onListenerInvalidated: parked, still attached", parked.listeners.get(2)?.parked === true && eq(parked.handles.get(1)?.listeners, [2]) && parked.fx.length === 0);
  ok("onListenerInvalidated: detached and forgotten", !detached.listeners.has(2) && !detached.listenerAt.has("a in m") && eq(detached.handles.get(1)?.listeners, []) && eq(detached.fx, [{ fx: "forgetListener", lid: 2 }]));
}

// a run keeps the generator when its inputs and function text are the same, and replaces it otherwise
{
  const args = [1, NaN, "x"];
  const h = record({ args, make: "f", hasGenerator: true, epoch: 3 });
  ok("needsNewGenerator: none yet", S.needsNewGenerator(record(), args, "f"));
  ok("needsNewGenerator: the same inputs (by Object.is) and text keep it", !S.needsNewGenerator(h, [1, NaN, "x"], "f"));
  ok("needsNewGenerator: other inputs or other text replace it",
    S.needsNewGenerator(h, [1, NaN, "y"], "f") && S.needsNewGenerator(h, [1, NaN], "f") && S.needsNewGenerator(h, args, "g") && S.needsNewGenerator(record({ args: [{}] }), [{}], ""));
  const handles = new Map([[1, h]]), fx: Effect[] = [];
  S.onRun(handles, new Map(), new Map(), fx, { t: "run", hid: 1, args, make: "g" });
  ok("onRun replacing: the old generator is returned, the epoch moves on, a new one is made", eq(fx, [{ fx: "return", hid: 1 }, { fx: "make", hid: 1 }]) && handles.get(1)?.epoch === 4 && handles.get(1)?.hasGenerator === false, fx);
  const keep = new Map([[1, record({ args, make: "f", hasGenerator: true, pending: true, listeners: [2, 3] })]]);
  const listeners = new Map([[2, listener(1, "a", { parked: true })], [3, listener(1, "b")]]), listenerAt = new Map([["a", 2], ["b", 3]]), fx2: Effect[] = [];
  S.onRun(keep, listeners, listenerAt, fx2, { t: "run", hid: 1, args, make: "f" });
  ok("onRun keeping: the parked listener is detached, the other stays, the events cell is no longer pending",
    eq(keep.get(1)?.listeners, [3]) && keep.get(1)?.pending === false && keep.get(1)?.hasGenerator === true && eq(fx2, [{ fx: "forgetListener", lid: 2 }]), { r: keep.get(1), fx2 });
}

// a result or failure from an earlier generator (an older epoch) is not delivered
{
  ok("isStaleResult", S.isStaleResult(record({ epoch: 2 }), 1) && !S.isStaleResult(record({ epoch: 2 }), 2));
  const live = () => new Map([[1, record({ hasGenerator: true, epoch: 2, busy: true, listeners: [5] })]]);
  const handles = live(), fx: Effect[] = [];
  S.onResolved(handles, fx, { t: "resolved", hid: 1, epoch: 1, done: false, value: "old" });
  ok("onResolved stale: nothing queued; the current generator is pulled", eq(handles.get(1)?.queue, []) && eq(fx, [{ fx: "frame", hid: 1, epoch: 2 }]), fx);
  const fresh = live(), fx2: Effect[] = [];
  S.onResolved(fresh, fx2, { t: "resolved", hid: 1, epoch: 2, done: false, value: "new" });
  ok("onResolved current: queued, delivered, pulled again", eq(fresh.get(1)?.queue, ["new"]) && eq(fx2, [{ fx: "then", ev: { t: "deliver", hid: 1 } }, { fx: "then", ev: { t: "pull", hid: 1, epoch: 2 } }]), fx2);
  const failed = live(), fx3: Effect[] = [];
  S.failGenerator(failed, fx3, 1, 1, new Error("old"));
  ok("failGenerator stale: not reported, not done", fx3.length === 0 && failed.get(1)?.done === false);
  S.failGenerator(failed, fx3, 1, 2, "now");
  ok("failGenerator current: reported once, done", eq(fx3, [{ fx: "fail", name: "e", error: "now" }]) && failed.get(1)?.done === true);
  const pulled = live(), fx4: Effect[] = [];
  S.onPull(pulled, fx4, 1, 1);
  ok("onPull stale: asks for another frame instead of pulling", eq(fx4, [{ fx: "frame", hid: 1, epoch: 2 }]), fx4);
}

console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
