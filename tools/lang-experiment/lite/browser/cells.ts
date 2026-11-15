// The parts of the cell runner that need no Observable Runtime: cell shapes read from source, events
// handles and listeners, and the guard a generator runs under. run.ts (the private runner) and
// stdlib/runtime.ts (the notebook bundle, which has no Runtime) both use them.
import * as P from "../../prelude.runtime.ts";
export { cellsOf, factsOf, type CellInfo } from "../facts.ts";

export const generatorish = (v: any): v is Generator => !!v && typeof v.next === "function" && typeof v.return === "function";
// onValue sees each object a step yields (runtime.ts records them as lent)
export function guard(g: Generator, onValue?: (v: object) => void) {
  const wrap = (m: "next" | "return" | "throw") => (...a: unknown[]) => {
    P.state.evalDepth++;
    try {
      const r = (g[m] as (...x: unknown[]) => IteratorResult<unknown>)(...a);
      if (onValue && r && typeof r.value === "object" && r.value !== null) onValue(r.value);
      return r;
    } finally { P.state.evalDepth--; }
  };
  return { next: wrap("next"), return: wrap("return"), throw: wrap("throw"), [Symbol.iterator]() { return this; } };
}

// An events cell's value is a handle. One handle per variable: a re-run with other inputs replaces
// the generator inside it, so a listener holding the handle does not run again. The generator is
// pulled only while a listener is attached: a sync one once per animation frame, an async one as
// soon as each next() resolves. Each value goes to every attached listener once, in order.
const EVENTS = Symbol("events");
const LISTENER = Symbol("listener");
type Gen = { next(): any; return(): any };
type Handle = { readonly [EVENTS]: true; readonly name: string };
type Listener = { readonly [LISTENER]: true; readonly events: unknown; readonly action: (x: unknown) => void };
type HState = {
  name: string; args: unknown[] | null; gen: Gen | null; no: number; done: boolean; dead: boolean;
  listeners: Set<Listener>; queue: unknown[]; draining: boolean; busy: boolean; run: object | null;
};
const hs = new WeakMap<object, HState>();
const ls = new WeakMap<object, { runs: number; cell: string }>();
const actionNames = P.actionNames;
const attached = new Set<Listener>();
const generating = new Set<Handle>();
// what pulls a sync generator's next value; tests replace it
export const scheduler = { frame: (f: () => void) => void requestAnimationFrame(f) };

export const isEvents = (v: unknown): v is Handle => !!v && typeof v === "object" && hs.has(v);
export const isListener = (v: unknown): v is Listener => !!v && typeof v === "object" && LISTENER in v;
export const on = (events: unknown, act: unknown) => Object.freeze({ [LISTENER]: true, events, action: act }) as Listener;
export const nameAction = (a: unknown, cell: string) => { if (P.isAction(a) && !actionNames.has(a as object)) actionNames.set(a as object, cell); };
export const running = () => attached.size;
// events cells whose generator is being pulled: live, not finished, with a listener attached
export const pulling = () => [...generating].filter((h) => { const s = hs.get(h)!; return !!s.gen && !s.done && s.listeners.size > 0; }).length;

const same = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
function stopGen(s: HState) {
  const g = s.gen;
  s.gen = null; s.args = null; s.no++; s.queue.length = 0;
  for (const h of generating) if (hs.get(h) === s) generating.delete(h);
  if (g) try { g.return(); } catch {}
}

// prev: the variable's last value (`this` of its definition); args: the cell's inputs; make: a fresh generator
export function events(prev: unknown, name: string, args: unknown[], make: () => Gen, invalidation: Promise<unknown> | null): Handle {
  const reuse = isEvents(prev) && !hs.get(prev)!.dead && hs.get(prev)!.name === name;
  const h: Handle = reuse ? prev : Object.freeze({ [EVENTS]: true, name }) as Handle;
  if (!reuse) hs.set(h, { name, args: null, gen: null, no: 0, done: false, dead: false, listeners: new Set(), queue: [], draining: false, busy: false, run: null });
  const s = hs.get(h)!;
  if (!s.args || !same(s.args, args)) {
    stopGen(s);
    s.gen = make(); s.args = args; s.done = false;
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
// A value that arrives while actions are running waits in the queue. An action that throws is
// logged and the next listener, and the next value, still run.
function deliver(s: HState, v: unknown) {
  s.queue.push(v);
  if (s.draining) return;
  s.draining = true;
  try {
    while (s.queue.length) {
      const x = s.queue.shift();
      for (const l of [...s.listeners]) {
        if (!s.listeners.has(l)) continue;
        try { l.action(x); } catch (e) {
          console.error(`listener ${ls.get(l)?.cell ?? "?"}: action ${actionNames.get(l.action) ?? "(anonymous)"} threw on a value of events ${s.name}:`, e);
        }
      }
    }
  } finally { s.draining = false; }
}

// A listener cell's run attaches its value until that run's invalidation, which the runtime resolves
// before the cell's next definition is called, so one listener variable is never attached twice.
export function listen(l: unknown, cell: string, invalidation: Promise<unknown> | null): Listener {
  if (!isListener(l)) throw new Error(`${cell} must return on(events, action)`);
  const s = hs.get(l.events as object);
  if (!s) throw new Error(`${cell}: on(...) needs an events handle`);
  if (typeof l.action !== "function") throw new Error(`${cell}: on(...) needs an action`);
  const rec = ls.get(l) ?? { runs: 0, cell };
  ls.set(l, rec);
  if (rec.runs++ === 0) { s.listeners.add(l); attached.add(l); kick(s); }
  invalidation?.then(() => { if (rec.runs > 0 && --rec.runs === 0) detach(l); });
  return l;
}
function detach(l: Listener) {
  const rec = ls.get(l);
  if (rec) rec.runs = 0;
  hs.get(l.events as object)?.listeners.delete(l);
  attached.delete(l);
}

// The value of a deleted variable: the runtime does not resolve its invalidation, so the module calls this.
export function release(v: unknown) {
  if (isListener(v)) detach(v);
  else if (isEvents(v)) { const s = hs.get(v)!; stopGen(s); s.dead = true; }
}
// Detaches listeners and stops generators that no live variable holds. One made since the last
// sweep is spared once: it may be a value the runtime has not assigned yet.
let generation = 0;
const bornAt = new Map<object, number>();
export function sweep(values: Set<unknown>) {
  generation++;
  for (const x of [...attached, ...generating]) {
    if (values.has(x)) { bornAt.delete(x); continue; }
    if (!bornAt.has(x)) { bornAt.set(x, generation); continue; }
    if (bornAt.get(x)! < generation) { bornAt.delete(x); release(x); }
  }
}
