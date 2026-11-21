// prelude.runtime.ts over step.ss.ts: this file holds the one state value, maps handle objects to ids, runs user
// functions between steps and performs the effects. The same exports as prelude.runtime.ts.
import { mut, freeze } from "../../lite/runtime-ss.ts";
import { link } from "../../lite/link.ts";
import * as cells from "./step.ss.ts";
export { mut, freeze, borrow } from "../../lite/runtime-ss.ts";
export { snapshot, equals, makeRandom, makeClock, makeLog } from "../../prelude.runtime.ts";

const S = link(cells, { mut, freeze });
type St = typeof S.init;
type Ev = Parameters<typeof S.step>[1];
type Fx = ReturnType<typeof S.step>["effects"][number];
type ViewEl = { value: unknown; dispatchEvent(e: Event): boolean };

const STATECELL = Symbol.for("lc.statecell");
const ACTION = Symbol.for("lc.action");
const REFHANDLE = Symbol.for("lc.state");
export const actionNames = new WeakMap<object, string>();
export const actionNamer = { of: null as ((a: object) => string | null) | null };
export const nameOf = (a: object) => actionNames.get(a) ?? actionNamer.of?.(a) ?? "(anonymous)";

let st: St = S.init;
let steps = 0;
export const stepsRun = () => steps;
export const storesHeld = () => st.stores.size;
// evalDepth is a counter other modules step themselves; the rest is read from the state
export const rt = {
  evalDepth: 0,
  get actionDepth() { return st.depth; },
  get call() { return st.call; },
  get ready() { return st.ready; },
  get commits() { return st.commits; },
};

let ids = 0;
const idOf = new WeakMap<object, number>();
const id = (o: object) => { let i = idOf.get(o); if (i === undefined) idOf.set(o, (i = ++ids)); return i; };
const handles = new Map<number, EventTarget>(), views = new Map<number, { el: ViewEl; check: (v: unknown) => unknown }>();

// a step's new state is kept before its effects run, so a throw from an effect leaves it, and one from the step leaves the old
function feed(ev: Ev): unknown {
  steps++;
  const r = S.step(st, ev);
  st = r.state;
  let answer: unknown;
  for (const e of r.effects) { const v = perform(e); if (e.fx === "answer" || e.fx === "readView" || e.fx === "plan") answer = v; }
  return answer;
}
function perform(e: Fx): unknown {
  switch (e.fx) {
    case "throw": throw new Error(e.msg);
    case "answer": return e.value;
    case "readView": { const v = views.get(e.hid)!; return v.check(v.el.value); }
    case "plan": return e;
    case "schedule": return void setTimeout(commit, 0);
    case "setView": return void (views.get(e.hid)!.el.value = e.value);
    case "tellView": return void views.get(e.hid)!.el.dispatchEvent(new Event("input", { bubbles: true }));
    case "tell": return void handles.get(e.hid)!.dispatchEvent(new Event("input"));
  }
}
// the commit timer; delivery.test.ts tells it from other timers by this name
function commit() { feed({ t: "commit" }); }

export const reset = () => { rt.evalDepth = 0; feed({ t: "reset" }); };
export const idle = () => S.isIdle(st);
export const state = <T>(initial: T) => ({ [STATECELL]: true, initial });
export const isStateCell = (v: unknown): v is { initial: unknown } => !!v && typeof v === "object" && STATECELL in v;
export const isAction = (v: unknown) => typeof v === "function" && ACTION in v;
export const isRefHandle = (v: unknown) => !!v && typeof v === "object" && REFHANDLE in v;

function write(hid: number, f: (v: unknown) => unknown) {
  const v = f(feed({ t: "current", hid }));
  feed({ t: "write", hid, value: v });
}
// A handle is an Observable view: an EventTarget whose value is the committed state, which dispatches input on each commit
function handleOf(name: string, check: (v: unknown) => unknown = (v) => v): EventTarget {
  const h = new EventTarget(), hid = id(h);
  handles.set(hid, h);
  Object.defineProperties(h, {
    [REFHANDLE]: { value: name },
    set: { value: (v: unknown) => write(hid, () => check(v)) },
    update: { value: (f: (v: unknown) => unknown) => write(hid, (x) => check(f(x))) },
    value: { get: () => feed({ t: "peek", hid }) },
  });
  return h;
}
export function materialize(cell: { initial: unknown }, name: string) {
  const h = handleOf(name);
  feed({ t: "made", hid: id(h), name, value: cell.initial, run: null });
  return h;
}
export const read = (handle: object): unknown => feed({ t: "read", hid: handle && typeof handle === "object" ? idOf.get(handle) ?? null : null });

export function ref(prev: unknown, name: string, args: unknown[], fn: (...a: unknown[]) => unknown): object {
  const fid = String(fn);
  const { keep, remake } = feed({ t: "ref", prev: prev && typeof prev === "object" ? idOf.get(prev) ?? null : null, fid, args }) as { keep: number | null; remake: boolean };
  if (!remake) return handles.get(keep!)!;
  rt.evalDepth++;
  let r: unknown;
  try { r = fn(...args); } finally { rt.evalDepth--; }
  if (!isStateCell(r)) throw new Error(`${name} did not return state(...)`);
  const h = keep === null ? handleOf(name) : handles.get(keep)!;
  feed({ t: "made", hid: id(h), name, value: r.initial, run: { fid, args } });
  return h;
}

const viewHandles = new WeakMap<object, object>();
// One handle per view, so a reader that takes it runs again only when the view itself is replaced
export function viewHandle(el: ViewEl, name: string, check: (v: unknown) => unknown) {
  const known = viewHandles.get(el);
  if (known) return known;
  const handle = handleOf(name, check), hid = id(handle);
  viewHandles.set(el, handle);
  if (isRefHandle(el)) feed({ t: "over", hid, name, target: id(el) });
  else { views.set(hid, { el, check }); feed({ t: "viewed", hid, name, value: check(el.value) }); }
  return handle;
}

export function action(f: (...args: unknown[]) => unknown) {
  const a = (...args: unknown[]): unknown => {
    feed({ t: "enter", evaluating: rt.evalDepth > 0 });
    let v: unknown;
    try { v = f(...args); } catch (err) { feed({ t: "exit", threw: true, value: undefined }); throw err; }
    return feed({ t: "exit", threw: false, value: v });
  };
  Object.defineProperty(a, ACTION, { value: true });
  return a;
}
