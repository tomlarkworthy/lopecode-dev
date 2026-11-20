// ../sched/shell.ts over the split cells; useStep swaps the step (bench, profile): this file keeps the one state value, maps objects
// to ids and back, and performs the effects step returns. Same exports as cells.ts.
import { rt, actionNames, isAction, nameOf } from "../../prelude.runtime.ts";
import { mut, freeze, orderKeyed, type Place } from "../../lite/runtime-ss.ts";
import { link } from "../../lite/link.ts";
import * as rtCells from "../../lite/runtime.ss.ts";
import * as stepCells from "./step.ss.ts";
export { cellsOf, factsOf, type CellInfo } from "../../lite/facts.ts";

const S = link({ ...rtCells, ...stepCells }, { mut, freeze });
type Sched = typeof S.init;
type Ev = Parameters<typeof S.step>[1];
type Fx = ReturnType<typeof S.step>["effects"][number];

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

let st: Sched = S.init;
let stepFn: (s: Sched, e: Ev) => { state: Sched; effects: readonly Fx[] } = S.step;
export const useStep = (f: typeof stepFn | null) => void (stepFn = f ?? S.step);
export const linked = S;
let steps = 0;
export const stepsRun = () => steps;
let ids = 0;
const idOf = new WeakMap<object, number>();
const id = (o: object) => { let i = idOf.get(o); if (i === undefined) idOf.set(o, (i = ++ids)); return i; };
const handles = new Map<number, Handle>(), listeners = new Map<number, Listener>(), gens = new Map<number, Gen>();
const isHandle = new WeakSet<object>();
let making: { make: (...a: unknown[]) => Gen; args: unknown[] } | null = null;
let placeOf: ((values: unknown[]) => Place[]) | null = null;
export const scheduler = { frame: (f: () => void) => void requestAnimationFrame(f) };

// events and effects on one stack, so an effect's follow-up runs before the effects after it, as a nested call would
function feed(first: Ev) {
  const work: (Ev | Fx)[] = [first];
  while (work.length) {
    const x = work.pop()!;
    if ("fx" in x) { const next = perform(x); if (next) work.push(next); continue; }
    steps++;
    const r = stepFn(st, x);
    st = r.state;
    for (let i = r.effects.length - 1; i >= 0; i--) work.push(r.effects[i]);
  }
}
function perform(e: Fx): Ev | void {
  switch (e.fx) {
    case "frame": { const { hid, no } = e; return scheduler.frame(() => feed({ t: "pull", hid, no })); }
    case "next": {
      const { hid, no } = e;
      let r: any;
      try { r = gens.get(hid)!.next(); } catch (error) { return { t: "threw", hid, no, error }; }
      if (r && typeof r.then === "function") {
        r.then((x: IteratorResult<unknown>) => feed({ t: "resolved", hid, no, done: !!x.done, value: x.value }), (error: unknown) => feed({ t: "rejected", hid, no, error }));
        return { t: "awaiting", hid };
      }
      return { t: "got", hid, no, done: !!r.done, value: r.value };
    }
    case "return": { const g = gens.get(e.hid); gens.delete(e.hid); if (g) try { g.return(); } catch {} return; }
    case "make": { const { make, args } = making!; gens.set(e.hid, guard(make(...args) as Generator)); return { t: "made", hid: e.hid, args, make: String(make) }; }
    case "call": {
      const l = listeners.get(e.lid)!;
      try { l.action(e.value); } catch (err) { console.error(`listener ${e.cell}: action ${nameOf(l.action)} threw on a value of events ${e.events}:`, err); }
      return;
    }
    case "place":
      try { const { out, complete } = orderKeyed(e.lids, placeOf!([handles.get(e.hid), ...e.lids.map((l) => listeners.get(l))])); return { t: "placed", hid: e.hid, order: out, complete }; }
      catch (err) { feed({ t: "abort", hid: e.hid }); throw err; }
    case "fail": return void console.error(`events ${e.name} threw; it yields nothing more until it runs again:`, e.error);
    case "then": return e.ev;
    case "forgetL": return void listeners.delete(e.lid);
    case "forgetH": return void handles.delete(e.hid);
  }
}
const hidsOf = (of: Iterable<object>) => [...of].filter((h) => isHandle.has(h)).map(id);

export const isEvents = (v: unknown): v is Handle => !!v && typeof v === "object" && isHandle.has(v);
export const isListener = (v: unknown): v is Listener => !!v && typeof v === "object" && LISTENER in v;
export const on = (events: unknown, act: unknown) => Object.freeze({ [LISTENER]: true, events, action: act }) as Listener;
export const nameAction = (a: unknown, cell: string) => { if (isAction(a) && !actionNames.has(a as object)) actionNames.set(a as object, cell); };
export const running = (of?: Iterable<object>) => S.running(st, of ? hidsOf(of) : null);
export const liveEvents = () => S.liveEvents(st);
export const pulling = (of?: Iterable<object>) => S.pulling(st, of ? hidsOf(of) : null);

export function events(module: string | null, name: string, args: unknown[], make: (...a: unknown[]) => Gen, invalidation: Promise<unknown> | null): Handle {
  const key = `${name} in ${module}`;
  let hid = S.hidAt(st, key);
  if (hid === null) {
    const h = Object.freeze({ [EVENTS]: true, name }) as Handle;
    isHandle.add(h); hid = id(h); handles.set(hid, h);
    feed({ t: "open", hid, key, name });
  }
  const h = handles.get(hid)!;
  making = { make, args };
  feed({ t: "run", hid, args, make: String(make) });
  invalidation?.then(() => feed({ t: "pending", hid }));
  return h;
}
export const setListenerOrder = (f: ((values: unknown[]) => Place[]) | null) => { placeOf = f; feed({ t: "orderChanged", placer: f !== null }); };
export const listenerOrderChanged = () => feed({ t: "orderChanged", placer: placeOf !== null });

export function listen(l: unknown, cell: string, invalidation: Promise<unknown> | null, module: string | null = null): Listener {
  if (!isListener(l)) throw new Error(`${cell} must return on(events, action)`);
  if (!isEvents(l.events)) throw new Error(`${cell}: on(...) needs an events handle`);
  if (typeof l.action !== "function") throw new Error(`${cell}: on(...) needs an action`);
  const key = `${cell} in ${module}`, lid = id(l), hid = id(l.events);
  listeners.set(lid, l); handles.set(hid, l.events);
  feed({ t: "listen", hid, lid, key, cell, aid: id(l.action), name: l.events.name });
  invalidation?.then(() => feed({ t: "linv", hid, lid, key }));
  return l;
}
export function release(v: unknown) {
  if (isListener(v)) feed({ t: "releaseL", lid: id(v) });
  else if (isEvents(v)) feed({ t: "releaseH", hid: id(v) });
  else if (typeof v === "function" && isAction(v)) feed({ t: "releaseA", aid: id(v) });
}
export function sweep(values: Set<unknown>) {
  const c = S.candidates(st);
  feed({ t: "sweep", heldL: c.lids.filter((i) => values.has(listeners.get(i))), heldH: c.hids.filter((i) => values.has(handles.get(i))) });
}
