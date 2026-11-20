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
  name: string; args: unknown[] | null; gen: Gen | null; no: number; done: boolean; dead: boolean;
  listeners: Set<Listener>; queue: unknown[]; draining: boolean; busy: boolean; order: Listener[] | null;
  // pending: the events cell was invalidated and has not run again; run: its last run
  pending: boolean; run: object | null;
};
const hs = new WeakMap<object, HState>();
// a listener's cell, whether that cell has been invalidated since the listener was its value (parked), and the
// run that last returned it
const ls = new WeakMap<object, { cell: string; parked: boolean; run: object | null }>();
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
  for (const h of generating) if (hs.get(h) === s) generating.delete(h);
  if (g) try { g.return(); } catch {}
}

// An events cell's value is a handle: <name> = ss.events(this, name, [inputs], fn, invalidation). One handle per
// variable: a re-run with other inputs replaces the generator inside it, so a listener holding the handle does
// not run again. The generator is pulled only while a listener is attached: a sync one once per animation frame,
// an async one as soon as each next() resolves. Each value goes to every attached listener once, in order.
// The generator lasts until a run with other inputs replaces it, it ends, or the handle is released (the
// variable deleted, or its cell rejected) or swept. Invalidation does not stop it: a run waiting on an input is
// still to come, and until it comes the handle and its generator are the variable's value. Invalidation marks
// the events cell pending until its next run, which decides what a listener invalidated meanwhile gets (listen).
// prev: the variable's last value (`this` of its definition); args: the cell's inputs; make: the generator
// function, called with args; each step runs as a cell evaluation (guard)
export function events(prev: unknown, name: string, args: unknown[], make: (...a: unknown[]) => Gen, invalidation: Promise<unknown> | null): Handle {
  const reuse = isEvents(prev) && !hs.get(prev)!.dead && hs.get(prev)!.name === name;
  const h: Handle = reuse ? prev : Object.freeze({ [EVENTS]: true, name }) as Handle;
  if (!reuse) hs.set(h, { name, args: null, gen: null, no: 0, done: false, dead: false, listeners: new Set(), queue: [], draining: false, busy: false, order: null, pending: false, run: null });
  const s = hs.get(h)!;
  handleOfState.set(s, h);
  if (!s.args || !same(s.args, args)) {
    stopGen(s);
    s.gen = guard(make(...args) as Generator); s.args = args; s.done = false;
    generating.add(h);
    kick(s);
  } else endParked(s);
  const run = {};
  s.run = run;
  s.pending = false;
  invalidation?.then(() => { if (s.run === run) s.pending = true; });
  return h;
}

// A run with the same inputs keeps the generator, so a listener parked for it is not needed: it is detached,
// and the generator waits for the listener cell's next run, which comes when that cell's inputs settle. When
// one of them threw, nothing more is given to the listener of a cell in error. When the events cell's own input
// threw, its next run never comes and a parked listener goes on getting the generator's values until the
// listener cell runs again, is deleted or is swept (measured in delivery.test.ts, not prevented).
function endParked(s: HState) {
  for (const l of [...s.listeners]) if (ls.get(l)?.parked) detach(l);
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
function orderOf(s: HState, h: unknown): Listener[] {
  if (s.order) return s.order;
  const list = [...s.listeners];
  if (!placeOf || list.length < 2) return list;
  const { out, complete } = orderKeyed(list, placeOf([h, ...list]));
  if (complete) { s.order = out; ordered.add(s); }
  return out;
}
const handleOfState = new WeakMap<HState, Handle>();

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
      for (const l of orderOf(s, handleOfState.get(s))) {
        if (!s.listeners.has(l)) continue;
        const report = (e: unknown) => console.error(`listener ${ls.get(l)?.cell ?? "?"}: action ${nameOf(l.action)} threw on a value of events ${s.name}:`, e);
        try { l.action(x); } catch (e) { report(e); }
      }
    }
  } finally { s.draining = false; }
}

// A listener ends when its cell runs again, is rejected, is deleted or is swept. When the cell is invalidated
// while its events cell is waiting to run again (the listener cell runs again because the events cell does,
// S8.4), the listener stays attached, parked, until the listener cell's next run takes it over, or the events
// cell runs again with the same inputs (events). It gets what the events cell yields meanwhile, from this
// generator and from those of the events cell's next runs with other inputs, since the runtime may skip the
// listener cell's run for one of them (a run made stale before its inputs settled).
// Otherwise invalidation detaches it, and the generator, which nothing else pulls, waits where it is for the
// next listener. So what an events run yields reaches a listener once, whichever of the pull, the runtime's
// frames and the commits comes first.
// The cell's next run takes over the listener its last run returned (prev): on the same events with the same
// action it stays attached as it is, and that run returns it; otherwise it is detached and the new one attached.
// A compiled listener cell is <name> = ss_listen(fn(...inputs), name, invalidation, this).
export function listen(l: unknown, cell: string, invalidation: Promise<unknown> | null, prev?: unknown): Listener {
  if (!isListener(l)) throw new Error(`${cell} must return on(events, action)`);
  const s = hs.get(l.events as object);
  if (!s) throw new Error(`${cell}: on(...) needs an events handle`);
  if (typeof l.action !== "function") throw new Error(`${cell}: on(...) needs an action`);
  const old = predecessor(l, cell, s, prev);
  let mine: Listener = l;
  if (old && old.events === l.events && old.action === l.action) mine = old;
  else if (old) detach(old);
  const rec = ls.get(mine) ?? { cell, parked: false, run: null };
  ls.set(mine, rec);
  rec.parked = false;
  if (!attached.has(mine)) { s.listeners.add(mine); s.order = null; attached.add(mine); kick(s); }
  const run = {};
  rec.run = run;
  invalidation?.then(() => {
    if (rec.run !== run || !attached.has(mine)) return;
    if (s.pending) rec.parked = true;
    else detach(mine);
  });
  return mine;
}
// The listener a run of cell takes over: the cell's last value. After a run that threw the runtime gives none
// (prev is undefined), so a parked listener of a cell of that name is taken: on this handle, with this action
// first; else on a handle of the same events cell name with this action (the events cell threw too, and was
// made again). The action keeps a first run of a same-named cell in another module from taking one over.
function predecessor(l: Listener, cell: string, s: HState, prev: unknown): Listener | null {
  if (isListener(prev)) return prev !== l && attached.has(prev) ? prev : null;
  let best: Listener | null = null;
  for (const x of attached) {
    const r = ls.get(x);
    if (x === l || !r?.parked || r.cell !== cell) continue;
    if (x.events === l.events) {
      if (x.action === l.action) return x;
      if (!best || best.events !== l.events) best = x;
    } else if (!best && x.action === l.action && hs.get(x.events as object)?.name === s.name) best = x;
  }
  return best;
}
function detach(l: Listener) {
  const rec = ls.get(l);
  if (rec) { rec.parked = false; rec.run = null; }
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
// sweep is spared once: it may be a value the runtime has not assigned yet. A parked listener was a
// variable's value, so one no variable holds now (its cell's run threw) ends at once.
export function sweep(values: Set<unknown>) {
  generation++;
  for (const x of [...attached, ...generating]) {
    if (values.has(x)) { bornAt.delete(x); continue; }
    if (isListener(x) && ls.get(x)?.parked) { bornAt.delete(x); release(x); continue; }
    if (!bornAt.has(x)) { bornAt.set(x, generation); continue; }
    if (bornAt.get(x)! < generation) { bornAt.delete(x); release(x); }
  }
}
