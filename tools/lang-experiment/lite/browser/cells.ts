// The parts of the cell runner that need no Observable Runtime: cell shapes read from source, events
// handles and listeners, and the guard a generator runs under. run.ts (the private runner) and
// stdlib/runtime.ts (the notebook bundle, which has no Runtime) both use them.
import { rt, actionNames, isAction, nameOf } from "../../prelude.runtime.ts";
import { same, orderKeyed, type Place } from "../runtime-ss.ts";
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
type HState = {
  handle: Handle; key: string; args: unknown[] | null; make: string; gen: Gen | null; no: number; done: boolean;
  listeners: Set<Listener>; queue: unknown[]; draining: boolean; busy: boolean; order: Listener[] | null;
  // the events cell was invalidated and has not run again
  pending: boolean;
};
const hs = new WeakMap<object, HState>();
// by "<cell> in <module>": each live events cell's state, and each attached listener
const handleAt = new Map<string, HState>();
const listenerAt = new Map<string, Listener>();
const cellOf = new WeakMap<object, { cell: string; key: string }>();
const attached = () => [...listenerAt.values()];
// listeners whose cell was invalidated while their events cell was pending
const parked = new WeakSet<object>();
// what pulls a sync generator's next value; tests replace it
export const scheduler = { frame: (f: () => void) => void requestAnimationFrame(f) };

export const isEvents = (v: unknown): v is Handle => !!v && typeof v === "object" && hs.has(v);
export const isListener = (v: unknown): v is Listener => !!v && typeof v === "object" && LISTENER in v;
export const on = (events: unknown, act: unknown) => Object.freeze({ [LISTENER]: true, events, action: act }) as Listener;
export const nameAction = (a: unknown, cell: string) => { if (isAction(a) && !actionNames.has(a as object)) actionNames.set(a as object, cell); };
// of: count only listeners on these handles
export const running = (of?: Iterable<object>) => { if (!of) return listenerAt.size; const only = new Set(of); return attached().filter((l) => only.has(l.events as object)).length; };
export const liveEvents = () => handleAt.size;
// events cells whose generator is being pulled: live, not finished, with a listener attached
// of: count only these handles (other modules on the page, such as tests, pull generators of their own)
export const pulling = (of?: Iterable<object>) => { const only = of ? new Set(of) : null; return [...handleAt.values()].filter((s) => (!only || only.has(s.handle)) && !!s.gen && !s.done && s.listeners.size > 0).length; };

function stopGen(s: HState) {
  const g = s.gen;
  s.gen = null; s.args = null; s.no++; s.queue.length = 0;
  if (g) try { g.return(); } catch {}
}

// An events cell's value is a handle: <name> = ss_events(module, name, [inputs], fn, invalidation). One handle per
// module and cell name, kept across errors and redefinitions: a run with other inputs, or a fn of other text (an
// edit), replaces the generator inside it, so a listener holding the handle does not run again. The generator is
// pulled only while a listener is attached: a sync one once per animation frame, an async one as soon as each
// next() resolves. Each value goes to every attached listener once, in order. The generator lasts until a run
// replaces it, it ends, or the handle is released (the variable deleted, or its cell rejected) or swept;
// invalidation does not stop it. Each step runs as a cell evaluation (guard).
export function events(module: string | null, name: string, args: unknown[], make: (...a: unknown[]) => Gen, invalidation: Promise<unknown> | null): Handle {
  const key = `${name} in ${module}`, h = handleAt.get(key)?.handle ?? Object.freeze({ [EVENTS]: true, name }) as Handle;
  if (!handleAt.has(key)) { hs.set(h, { handle: h, key, args: null, make: "", gen: null, no: 0, done: false, listeners: new Set(), queue: [], draining: false, busy: false, order: null, pending: false }); handleAt.set(key, hs.get(h)!); }
  const s = hs.get(h)!;
  if (!s.args || !same(s.args, args) || s.make !== String(make)) {
    stopGen(s);
    s.gen = guard(make(...args) as Generator); s.args = args; s.make = String(make); s.done = false;
    kick(s);
  } else for (const l of [...s.listeners]) if (parked.has(l)) detach(l); // its listener cells run again after it
  s.pending = false;
  invalidation?.then(() => { s.pending = true; });
  return h;
}
function kick(s: HState) {
  if (s.busy || !s.gen || s.done || !s.listeners.size) return;
  s.busy = true;
  const no = s.no;
  scheduler.frame(() => pull(s, no));
}
function pull(s: HState, no: number) {
  s.busy = false;
  if (no !== s.no || !s.gen || s.done || !s.listeners.size) return kick(s);
  let r: any;
  try { r = s.gen.next(); } catch (e) { return fail(s, no, e); }
  if (r && typeof r.then === "function") {
    s.busy = true;
    r.then((x: IteratorResult<unknown>) => {
      s.busy = false;
      if (no !== s.no) return kick(s);
      if (x.done) { s.done = true; return; }
      deliver(s, x.value);
      pull(s, no);
    }, (e: unknown) => { s.busy = false; fail(s, no, e); });
    return;
  }
  if (r.done) { s.done = true; return; }
  deliver(s, r.value);
  kick(s);
}
function fail(s: HState, no: number, e: unknown) {
  if (no !== s.no) return;
  console.error(`events ${s.handle.name} threw; it yields nothing more until it runs again:`, e);
  s.done = true;
}
// The order the listeners of one events cell run in, for each value: those of the events cell's own
// module by their cells' place in its source, then those of other modules by module name and place.
// The host says where a value's cell is (setListenerOrder): for each of a list of values (the handle,
// then the listeners) a [module name, place] or null. A listener it cannot place yet (its variable has
// no value yet) runs after the placed ones, in attach order, and the order is worked out again for the
// next value. Without a host the order is attach order.
let placeOf: ((values: unknown[]) => Place[]) | null = null;
const ordered = new Set<HState>();
export const setListenerOrder = (f: ((values: unknown[]) => Place[]) | null) => { placeOf = f; listenerOrderChanged(); };
// cells were added, moved or deleted: the order is worked out again before the next value
export const listenerOrderChanged = () => { for (const s of ordered) s.order = null; ordered.clear(); };
function orderOf(s: HState): Listener[] {
  if (s.order) return s.order;
  const list = [...s.listeners];
  if (!placeOf || list.length < 2) return list;
  const { out, complete } = orderKeyed(list, placeOf([s.handle, ...list]));
  if (complete) { s.order = out; ordered.add(s); }
  return out;
}

// Each delivery is a top-level action call, which runs to completion before the next. A value that arrives
// while one is delivered (an action that makes its events cell yield) waits in the queue. An action that
// throws is logged and the next listener, and the next value, still run.
function deliver(s: HState, v: unknown) {
  s.queue.push(v);
  if (s.draining) return;
  s.draining = true;
  try {
    while (s.queue.length) {
      const x = s.queue.shift();
      for (const l of orderOf(s)) {
        if (!s.listeners.has(l)) continue;
        const report = (e: unknown) => console.error(`listener ${cellOf.get(l)?.cell ?? "?"}: action ${nameOf(l.action)} threw on a value of events ${s.handle.name}:`, e);
        try { l.action(x); } catch (e) { report(e); }
      }
    }
  } finally { s.draining = false; }
}

// A listener cell's run attaches its value and ends the listener its last run attached, found by module and cell
// name. Invalidation detaches a listener, unless its events cell is pending: then the listener cell runs again
// after it (S8.4), and the listener stays attached, parked, so what the events cell yields meanwhile reaches it once.
// A parked listener ends at its cell's next run, at a run of the events cell with the same inputs (one in error
// does not run again), or when no variable holds it (sweep).
// A compiled listener cell is <name> = ss_listen(fn(...inputs), name, invalidation, module).
export function listen(l: unknown, cell: string, invalidation: Promise<unknown> | null, module: string | null = null): Listener {
  if (!isListener(l)) throw new Error(`${cell} must return on(events, action)`);
  const s = hs.get(l.events as object);
  if (!s) throw new Error(`${cell}: on(...) needs an events handle`);
  if (typeof l.action !== "function") throw new Error(`${cell}: on(...) needs an action`);
  const key = `${cell} in ${module}`, old = listenerAt.get(key);
  if (old !== l) { if (old) detach(old); cellOf.set(l, { cell, key }); listenerAt.set(key, l); s.listeners.add(l); s.order = null; kick(s); }
  invalidation?.then(() => { if (listenerAt.get(key) !== l) return; if (s.pending) parked.add(l); else detach(l); });
  return l;
}
function detach(l: Listener) {
  const s = hs.get(l.events as object);
  if (s) { s.listeners.delete(l); s.order = null; }
  const key = cellOf.get(l)?.key ?? ""; if (listenerAt.get(key) === l) listenerAt.delete(key);
}

// The value of a deleted variable: the runtime does not resolve its invalidation, so the module calls this.
// A rejected cell's body calls it with its last value (ss-toolchain rejectedCell). A listener ends; events end
// with their listeners; an action ends the listeners that give values to it, whose cells its cell blocks.
export function release(v: unknown) {
  if (isListener(v)) detach(v);
  else if (isEvents(v)) { const s = hs.get(v)!; stopGen(s); if (handleAt.get(s.key) === s) handleAt.delete(s.key); for (const l of [...s.listeners]) detach(l); }
  else if (typeof v === "function" && isAction(v)) { for (const l of attached()) if (l.action === v) detach(l); }
}
let generation = 0;
const bornAt = new Map<object, number>();
// Detaches listeners and stops generators that no live variable holds. One made since the last
// sweep is spared once: it may be a value the runtime has not assigned yet; a parked one was a value.
export function sweep(values: Set<unknown>) {
  generation++;
  for (const x of [...attached(), ...[...handleAt.values()].map((s) => s.handle)]) {
    if (values.has(x)) { bornAt.delete(x); continue; }
    if (parked.has(x)) { bornAt.delete(x); release(x); continue; }
    if (!bornAt.has(x)) { bornAt.set(x, generation); continue; }
    if (bornAt.get(x)! < generation) { bornAt.delete(x); release(x); }
  }
}
