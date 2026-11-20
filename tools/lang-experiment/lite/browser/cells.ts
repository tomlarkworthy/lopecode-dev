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
  handle: Handle; name: string; args: unknown[] | null; gen: Gen | null; no: number; done: boolean; dead: boolean;
  listeners: Set<Listener>; queue: unknown[]; draining: boolean; busy: boolean; order: Listener[] | null;
  // the events cell was invalidated and has not run again
  pending: boolean;
};
const hs = new WeakMap<object, HState>();
const cellOf = new WeakMap<object, string>();
// listeners whose cell was invalidated while their events cell was pending
const parked = new WeakSet<object>();
const attached = new Set<Listener>();
const generating = new Set<Handle>();
// what pulls a sync generator's next value; tests replace it
export const scheduler = { frame: (f: () => void) => void requestAnimationFrame(f) };

export const isEvents = (v: unknown): v is Handle => !!v && typeof v === "object" && hs.has(v);
export const isListener = (v: unknown): v is Listener => !!v && typeof v === "object" && LISTENER in v;
export const on = (events: unknown, act: unknown) => Object.freeze({ [LISTENER]: true, events, action: act }) as Listener;
export const nameAction = (a: unknown, cell: string) => { if (isAction(a) && !actionNames.has(a as object)) actionNames.set(a as object, cell); };
// of: count only listeners on these handles
export const running = (of?: Iterable<object>) => { if (!of) return attached.size; const only = new Set(of); return [...attached].filter((l) => only.has(l.events as object)).length; };
// events cells whose generator is being pulled: live, not finished, with a listener attached
// of: count only these handles (other modules on the page, such as tests, pull generators of their own)
export const pulling = (of?: Iterable<object>) => { const only = of ? new Set(of) : null; return [...generating].filter((h) => { const s = hs.get(h)!; return (!only || only.has(h)) && !!s.gen && !s.done && s.listeners.size > 0; }).length; };

function stopGen(s: HState) {
  const g = s.gen;
  s.gen = null; s.args = null; s.no++; s.queue.length = 0;
  generating.delete(s.handle);
  if (g) try { g.return(); } catch {}
}

// An events cell's value is a handle: <name> = ss.events(this, name, [inputs], fn, invalidation). One handle per
// variable: a re-run with other inputs replaces the generator inside it, so a listener holding the handle does
// not run again. The generator is pulled only while a listener is attached: a sync one once per animation frame,
// an async one as soon as each next() resolves. Each value goes to every attached listener once, in order.
// The generator lasts until a run with other inputs replaces it, it ends, or the handle is released (the
// variable deleted, or its cell rejected) or swept; invalidation does not stop it.
// prev: the variable's last value (`this` of its definition); args: the cell's inputs; make: the generator
// function, called with args; each step runs as a cell evaluation (guard)
export function events(prev: unknown, name: string, args: unknown[], make: (...a: unknown[]) => Gen, invalidation: Promise<unknown> | null): Handle {
  const reuse = isEvents(prev) && !hs.get(prev)!.dead && hs.get(prev)!.name === name;
  const h: Handle = reuse ? prev : Object.freeze({ [EVENTS]: true, name }) as Handle;
  if (!reuse) hs.set(h, { handle: h, name, args: null, gen: null, no: 0, done: false, dead: false, listeners: new Set(), queue: [], draining: false, busy: false, order: null, pending: false });
  const s = hs.get(h)!;
  if (!s.args || !same(s.args, args)) {
    stopGen(s);
    s.gen = guard(make(...args) as Generator); s.args = args; s.done = false;
    generating.add(h);
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
  console.error(`events ${s.name} threw; it yields nothing more until it runs again:`, e);
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
        const report = (e: unknown) => console.error(`listener ${cellOf.get(l) ?? "?"}: action ${nameOf(l.action)} threw on a value of events ${s.name}:`, e);
        try { l.action(x); } catch (e) { report(e); }
      }
    }
  } finally { s.draining = false; }
}

// A listener cell's run attaches its value and ends the listener its last run attached: prev, `this` of its
// definition. Invalidation detaches a listener, unless its events cell is pending: then the listener cell runs again
// after it (S8.4), and the listener stays attached, parked, so what the events cell yields meanwhile reaches it once.
// A parked listener ends at its cell's next run, at a run of the events cell with the same inputs (one in error
// does not run again), or when no variable holds it (sweep). After a run that threw, or a redefinition, there is
// no prev: the run takes a parked listener of a cell of this name, on these events with this action first; or on
// a remade handle of the same events cell with this action (the action tells a same-named cell in another module
// apart). A compiled listener cell is <name> = ss_listen(fn(...inputs), name, invalidation, this).
export function listen(l: unknown, cell: string, invalidation: Promise<unknown> | null, prev?: unknown): Listener {
  if (!isListener(l)) throw new Error(`${cell} must return on(events, action)`);
  const s = hs.get(l.events as object);
  if (!s) throw new Error(`${cell}: on(...) needs an events handle`);
  if (typeof l.action !== "function") throw new Error(`${cell}: on(...) needs an action`);
  const c = isListener(prev) ? [prev] : [...attached].filter((x) => parked.has(x) && cellOf.get(x) === cell && (x.events === l.events || (x.action === l.action && hs.get(x.events as object)!.name === s.name)));
  const old = c.find((x) => x.events === l.events && x.action === l.action) ?? c.find((x) => x.events === l.events) ?? c[0];
  if (old && old !== l) detach(old);
  if (!attached.has(l)) { cellOf.set(l, cell); s.listeners.add(l); s.order = null; attached.add(l); kick(s); }
  invalidation?.then(() => { if (!attached.has(l)) return; if (s.pending) parked.add(l); else detach(l); });
  return l;
}
function detach(l: Listener) {
  const s = hs.get(l.events as object);
  if (s) { s.listeners.delete(l); s.order = null; }
  attached.delete(l);
}

// The value of a deleted variable: the runtime does not resolve its invalidation, so the module calls this.
// A rejected cell's body calls it with its last value (ss-toolchain rejectedCell). A listener ends; events end
// with their listeners; an action ends the listeners that give values to it, whose cells its cell blocks.
export function release(v: unknown) {
  if (isListener(v)) detach(v);
  else if (isEvents(v)) { const s = hs.get(v)!; stopGen(s); s.dead = true; for (const l of [...s.listeners]) detach(l); }
  else if (typeof v === "function" && isAction(v)) { for (const l of [...attached]) if (l.action === v) detach(l); }
}
let generation = 0;
const bornAt = new Map<object, number>();
// Detaches listeners and stops generators that no live variable holds. One made since the last
// sweep is spared once: it may be a value the runtime has not assigned yet; a parked one was a value.
export function sweep(values: Set<unknown>) {
  generation++;
  for (const x of [...attached, ...generating]) {
    if (values.has(x)) { bornAt.delete(x); continue; }
    if (parked.has(x)) { bornAt.delete(x); release(x); continue; }
    if (!bornAt.has(x)) { bornAt.set(x, generation); continue; }
    if (bornAt.get(x)! < generation) { bornAt.delete(x); release(x); }
  }
}
