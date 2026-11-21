// The parts of the cell runner that need no Observable Runtime: cell shapes read from source, events
// handles and listeners, and the guard a generator runs under. run.ts (the private runner) and
// stdlib/runtime.ts (the notebook bundle, which has no Runtime) both use them.
// What is delivered when is decided by step (../events.ss.ts, checked SoundScript). This file holds the one Delivery
// value, gives each handle, listener and action an id, and performs step's effects: it runs the generators, the
// listeners' actions and the host's placeOf, and feeds back what happened.
import { rt, actionNames, isAction, nameOf } from "../../prelude.runtime.ts";
import { orderKeyed, emptyDelivery, step, handleAtKey, sweepCandidates, liveEventsCount, runningCount, pullingCount, type Place, type Delivery, type DeliveryEvent, type Effect } from "../runtime-ss.ts";
export { cellsOf, factsOf, type CellInfo } from "../facts.ts";

export const generatorish = (v: any): v is Generator => !!v && typeof v.next === "function" && typeof v.return === "function";
export function guard(g: Generator) {
  const wrap = (m: "next" | "return" | "throw") => (...a: unknown[]) => {
    rt.evalDepth++;
    try {
      return (g[m] as (...x: unknown[]) => IteratorResult<unknown>)(...a);
    } finally { rt.evalDepth--; }
  };
  return { next: wrap("next"), return: wrap("return"), throw: wrap("throw"), [Symbol.iterator]() { return this; } };
}

const EVENTS = Symbol("events");
const LISTENER = Symbol("listener");
type Gen = { next(): any; return(): any };
type Handle = { readonly [EVENTS]: true; readonly name: string };
type Listener = { readonly [LISTENER]: true; readonly events: unknown; readonly action: (x: unknown) => void };

let delivery: Delivery = emptyDelivery;
let lastId = 0;
const idOf = new WeakMap<object, number>();
const idFor = (o: object) => { let i = idOf.get(o); if (i === undefined) idOf.set(o, (i = ++lastId)); return i; };
const handleObjects = new Map<number, Handle>(), listenerObjects = new Map<number, Listener>(), generators = new Map<number, Gen>();
const madeHandles = new WeakSet<object>();
// the generator function and inputs of the events() call being fed, for its make effect
let making: { make: (...a: unknown[]) => Gen; args: unknown[] } | null = null;
// what pulls a sync generator's next value; tests replace it
export const scheduler = { frame: (f: () => void) => void requestAnimationFrame(f) };

// events and effects on one stack, so an effect's follow-up runs before the effects after it, as a nested call would
function feed(first: DeliveryEvent) {
  const work: (DeliveryEvent | Effect)[] = [first];
  while (work.length) {
    const x = work.pop()!;
    if ("fx" in x) { const next = perform(x); if (next) work.push(next); continue; }
    const r = step(delivery, x);
    delivery = r.state;
    for (let i = r.effects.length - 1; i >= 0; i--) work.push(r.effects[i]);
  }
}
function perform(e: Effect): DeliveryEvent | void {
  switch (e.fx) {
    case "frame": { const { hid, epoch } = e; return scheduler.frame(() => feed({ t: "pull", hid, epoch })); }
    case "next": {
      const { hid, epoch } = e;
      let r: any;
      try { r = generators.get(hid)!.next(); } catch (error) { return { t: "threw", hid, epoch, error }; }
      if (r && typeof r.then === "function") {
        r.then((x: IteratorResult<unknown>) => feed({ t: "resolved", hid, epoch, done: !!x.done, value: x.value }), (error: unknown) => feed({ t: "rejected", hid, epoch, error }));
        return { t: "awaiting", hid };
      }
      return { t: "got", hid, epoch, done: !!r.done, value: r.value };
    }
    case "return": { const g = generators.get(e.hid); generators.delete(e.hid); if (g) try { g.return(); } catch {} return; }
    case "make": { const { make, args } = making!; generators.set(e.hid, guard(make(...args) as Generator)); return { t: "made", hid: e.hid, args, make: String(make) }; }
    case "call": {
      const l = listenerObjects.get(e.lid)!;
      try { l.action(e.value); } catch (err) { console.error(`listener ${e.cell}: action ${nameOf(l.action)} threw on a value of events ${e.events}:`, err); }
      return;
    }
    case "place":
      try {
        const { out, complete } = orderKeyed(e.lids, placeOf!([handleObjects.get(e.hid), ...e.lids.map((l) => listenerObjects.get(l))]));
        return { t: "placed", hid: e.hid, order: out, complete };
      } catch (err) { feed({ t: "placeFailed", hid: e.hid }); throw err; }
    case "fail": return void console.error(`events ${e.name} threw; it yields nothing more until it runs again:`, e.error);
    case "then": return e.ev;
    case "forgetListener": return void listenerObjects.delete(e.lid);
    case "forgetHandle": return void handleObjects.delete(e.hid);
  }
}
const handleIds = (of: Iterable<object>) => [...of].filter((h) => madeHandles.has(h)).map(idFor);

export const isEvents = (v: unknown): v is Handle => !!v && typeof v === "object" && madeHandles.has(v);
export const isListener = (v: unknown): v is Listener => !!v && typeof v === "object" && LISTENER in v;
export const on = (events: unknown, act: unknown) => Object.freeze({ [LISTENER]: true, events, action: act }) as Listener;
export const nameAction = (a: unknown, cell: string) => { if (isAction(a) && !actionNames.has(a as object)) actionNames.set(a as object, cell); };
// of: count only listeners on these handles
export const running = (of?: Iterable<object>) => runningCount(delivery, of ? handleIds(of) : null);
export const liveEvents = () => liveEventsCount(delivery);
// events cells whose generator is being pulled: live, not finished, with a listener attached
// of: count only these handles (other modules on the page, such as tests, pull generators of their own)
export const pulling = (of?: Iterable<object>) => pullingCount(delivery, of ? handleIds(of) : null);

// An events cell's value is a handle: <name> = ss_events(module, name, [inputs], fn, invalidation). One handle per
// module and cell name, kept across errors and redefinitions: a run with other inputs, or a fn of other text (an
// edit), replaces the generator inside it, so a listener holding the handle does not run again. The generator is
// pulled only while a listener is attached: a sync one once per animation frame, an async one as soon as each
// next() resolves. Each value goes to every attached listener once, in order. The generator lasts until a run
// replaces it, it ends, or the handle is released (the variable deleted, or its cell rejected) or swept;
// invalidation does not stop it. Each next() and return() of the generator runs as a cell evaluation (guard).
export function events(module: string | null, name: string, args: unknown[], make: (...a: unknown[]) => Gen, invalidation: Promise<unknown> | null): Handle {
  const key = `${name} in ${module}`;
  const hid = handleAtKey(delivery, key) ?? openHandle(key, name), h = handleObjects.get(hid)!;
  making = { make, args };
  feed({ t: "run", hid, args, make: String(make) });
  invalidation?.then(() => feed({ t: "eventsInvalidated", hid }));
  return h;
}
function openHandle(key: string, name: string): number {
  const h = Object.freeze({ [EVENTS]: true, name }) as Handle;
  const hid = idFor(h);
  madeHandles.add(h);
  handleObjects.set(hid, h);
  feed({ t: "open", hid, key, name });
  return hid;
}
// The order the listeners of one events cell run in, for each value: those of the events cell's own
// module by their cells' place in its source, then those of other modules by module name and place.
// The host says where a value's cell is (setListenerOrder): for each of a list of values (the handle,
// then the listeners) a [module name, place] or null. A listener it cannot place yet (its variable has
// no value yet) runs after the placed ones, in attach order, and the order is worked out again for the
// next value. Without a host the order is attach order.
let placeOf: ((values: unknown[]) => Place[]) | null = null;
export const setListenerOrder = (f: ((values: unknown[]) => Place[]) | null) => { placeOf = f; listenerOrderChanged(); };
// cells were added, moved or deleted: the order is worked out again before the next value
export const listenerOrderChanged = () => feed({ t: "orderChanged", placer: placeOf !== null });

// A listener cell's run attaches its value and ends the listener its last run attached, found by module and cell
// name. Invalidation detaches a listener, unless its events cell is pending: then the listener cell runs again
// after it (S8.4), and the listener stays attached, parked, so what the events cell yields meanwhile reaches it once.
// A parked listener ends at its cell's next run, at a run of the events cell with the same inputs (one in error
// does not run again), or when no variable holds it (sweep).
// A compiled listener cell is <name> = ss_listen(fn(...inputs), name, invalidation, module).
export function listen(l: unknown, cell: string, invalidation: Promise<unknown> | null, module: string | null = null): Listener {
  if (!isListener(l)) throw new Error(`${cell} must return on(events, action)`);
  if (!isEvents(l.events)) throw new Error(`${cell}: on(...) needs an events handle`);
  if (typeof l.action !== "function") throw new Error(`${cell}: on(...) needs an action`);
  const key = `${cell} in ${module}`, lid = idFor(l), hid = idFor(l.events);
  listenerObjects.set(lid, l); handleObjects.set(hid, l.events);
  feed({ t: "listen", hid, lid, key, cell, aid: idFor(l.action), name: l.events.name });
  invalidation?.then(() => feed({ t: "listenerInvalidated", hid, lid, key }));
  return l;
}

// The value of a deleted variable: the runtime does not resolve its invalidation, so the module calls this.
// A rejected cell's body calls it with its last value (ss-toolchain rejectedCell). A listener ends; events end
// with their listeners; an action ends the listeners that give values to it, whose cells its cell blocks.
export function release(v: unknown) {
  if (isListener(v)) feed({ t: "releaseListener", lid: idFor(v) });
  else if (isEvents(v)) feed({ t: "releaseEvents", hid: idFor(v) });
  else if (typeof v === "function" && isAction(v)) feed({ t: "releaseAction", aid: idFor(v) });
}
// Detaches listeners and stops generators that no live variable holds. One made since the last
// sweep is spared once: it may be a value the runtime has not assigned yet; a parked one was a value.
export function sweep(values: Set<unknown>) {
  const c = sweepCandidates(delivery);
  feed({ t: "sweep", heldListeners: c.lids.filter((i) => values.has(listenerObjects.get(i))), heldHandles: c.hids.filter((i) => values.has(handleObjects.get(i))) });
}
