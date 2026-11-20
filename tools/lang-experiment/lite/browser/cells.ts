// The parts of the cell runner that need no Observable Runtime: cell shapes read from source, events
// handles and listeners, and the guard a generator runs under. run.ts (the private runner) and
// stdlib/runtime.ts (the notebook bundle, which has no Runtime) both use them.
import { rt, actionNames, isAction, entry, nameOf } from "../../prelude.runtime.ts";
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
  listeners: Set<Listener>; queue: unknown[]; draining: boolean; busy: boolean; run: object | null;
  order: Listener[] | null;
};
const hs = new WeakMap<object, HState>();
const ls = new WeakMap<object, { runs: number; cell: string }>();
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
// prev: the variable's last value (`this` of its definition); args: the cell's inputs; make: the generator
// function, called with args; each step runs as a cell evaluation (guard)
export function events(prev: unknown, name: string, args: unknown[], make: (...a: unknown[]) => Gen, invalidation: Promise<unknown> | null): Handle {
  const reuse = isEvents(prev) && !hs.get(prev)!.dead && hs.get(prev)!.name === name;
  const h: Handle = reuse ? prev : Object.freeze({ [EVENTS]: true, name }) as Handle;
  if (!reuse) hs.set(h, { name, args: null, gen: null, no: 0, done: false, dead: false, listeners: new Set(), queue: [], draining: false, busy: false, run: null, order: null });
  const s = hs.get(h)!;
  handleOfState.set(s, h);
  if (!s.args || !same(s.args, args)) {
    stopGen(s);
    s.gen = guard(make(...args) as Generator); s.args = args; s.done = false;
    generating.add(h);
    kick(s);
  }
  const run = {};
  s.run = run;
  // invalidation resolves before the next run's definition is called, so the check waits a macrotask:
  // a re-run with the same inputs keeps the generator, and one that never comes (an error upstream,
  // the variable no longer reachable) stops it
  invalidation?.then(() => setTimeout(() => { if (s.run === run) stopGen(s); }, 0));
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
function orderOf(s: HState, h: unknown): Listener[] {
  if (s.order) return s.order;
  const list = [...s.listeners];
  if (!placeOf || list.length < 2) return list;
  const { out, complete } = orderKeyed(list, placeOf([h, ...list]));
  if (complete) { s.order = out; ordered.add(s); }
  return out;
}
const handleOfState = new WeakMap<HState, Handle>();

// A value that arrives while actions are running waits in the queue. Each delivery is a top-level
// action call, so one whose action is still running (async) holds the next in the runtime's queue. An
// action that throws or rejects is logged and the next listener, and the next value, still run.
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
        try { entry(report, () => l.action(x)); } catch (e) { report(e); }
      }
    }
  } finally { s.draining = false; }
}

// A listener cell's run attaches its value until that run's invalidation, which the runtime resolves
// before the cell's next definition is called, so one listener variable is never attached twice.
// A compiled listener cell is <name> = ss.listen(fn(...inputs), name, invalidation).
export function listen(l: unknown, cell: string, invalidation: Promise<unknown> | null): Listener {
  if (!isListener(l)) throw new Error(`${cell} must return on(events, action)`);
  const s = hs.get(l.events as object);
  if (!s) throw new Error(`${cell}: on(...) needs an events handle`);
  if (typeof l.action !== "function") throw new Error(`${cell}: on(...) needs an action`);
  const rec = ls.get(l) ?? { runs: 0, cell };
  ls.set(l, rec);
  if (rec.runs++ === 0) { s.listeners.add(l); s.order = null; attached.add(l); kick(s); }
  invalidation?.then(() => { if (rec.runs > 0 && --rec.runs === 0) detach(l); });
  return l;
}
function detach(l: Listener) {
  const rec = ls.get(l);
  if (rec) rec.runs = 0;
  const s = hs.get(l.events as object);
  if (s) { s.listeners.delete(l); s.order = null; }
  attached.delete(l);
}

// The value of a deleted variable: the runtime does not resolve its invalidation, so the module calls this.
// a deleted variable's value: its listener or events end
export function release(v: unknown) {
  if (isListener(v)) detach(v);
  else if (isEvents(v)) { const s = hs.get(v)!; stopGen(s); s.dead = true; }
}
let generation = 0;
const bornAt = new Map<object, number>();
// Detaches listeners and stops generators that no live variable holds. One made since the last
// sweep is spared once: it may be a value the runtime has not assigned yet.
export function sweep(values: Set<unknown>) {
  generation++;
  for (const x of [...attached, ...generating]) {
    if (values.has(x)) { bornAt.delete(x); continue; }
    if (!bornAt.has(x)) { bornAt.set(x, generation); continue; }
    if (bornAt.get(x)! < generation) { bornAt.delete(x); release(x); }
  }
}
