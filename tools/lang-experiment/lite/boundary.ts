// The checked boundary between a SoundScript cell and a cell of its module written in another
// language (Observable JavaScript, raw). The checker turns the parameter's annotation into a Shape
// (shapeOf); the compiled cell passes the value through cross(), which checks it against the shape and
// hands the cell a deep-frozen copy.
import type { Ty } from "./types.ts";
import { shapeAt, boundaryShapeAt, type ShapeOr } from "./shape-ss.ts";
import { deepEqual, describeSeen, mismatchText, trimPath, tagDispatch, memberTakes, soleMembers, isSoleMiss, fnPlan, thrownText, primFits, propStep, elemShape, triesMember, unionMiss, type Shape, type ValueSeen, type Dispatch } from "./runtime-ss.ts";
export type { Shape } from "./runtime-ss.ts";

// The shape of an annotation, or why it cannot be checked at the boundary, and the shape of a parameter's annotation
// (fnOk: a function type may be the whole annotation): shape.ss.ts's, with the error as { error }, which core.ts reads
const untag = (s: ShapeOr): Shape | { error: string } => (s.k === "error" ? { error: s.error } : (s as Shape));
export function shapeOf(t: Ty, expand: (t: Ty) => Ty, isAlias: (n: string) => boolean): Shape | { error: string } {
  return untag(shapeAt(t, { expand, isAlias }));
}
export function boundaryShape(t: Ty, expand: (t: Ty) => Ty, isAlias: (n: string) => boolean, fnOk: boolean): Shape | { error: string } {
  return untag(boundaryShapeAt(t, { expand, isAlias }, fnOk));
}

// what describeSeen needs of v, read in the order and number of reads a getter or a proxy's trap may see
const seen = (v: unknown): ValueSeen => {
  if (v === null) return { t: "null" };
  if (typeof v === "string") return { t: "string", s: v };
  if (Object.is(v, -0)) return { t: "-0" };
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return { t: typeof v, text: String(v) };
  if (typeof v === "function") return { t: "function" };
  if (Array.isArray(v)) return { t: "array", length: v.length };
  if (v && typeof (v as { then?: unknown }).then === "function") return { t: "promise" };
  if (typeof v !== "object") return { t: "other", type: typeof v };
  if (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null) return { t: "object", plain: true, ctor: null };
  const n = (v as object).constructor?.name;
  return { t: "object", plain: false, ctor: n === undefined || n === null ? null : `${n}` };
};
const describe = (v: unknown): string => describeSeen(seen(v));
const plain = (v: object) => { const p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; };

// a value that does not fit a shape at path (a Cycle: a value met again inside itself); the message is made only for
// the mismatch that is reported. Not an Error: a union catches one per member it rejects
class Mismatch {
  path: string; s: Shape | null; found: string;
  constructor(path: string, s: Shape | null, found: string) { this.path = path; this.s = s; this.found = found; }
  text(): string { return mismatchText(this.path, this.s, this.found); }
}
class Cycle extends Mismatch {}
const mismatch = (v: unknown, s: Shape, path: string): Mismatch => new Mismatch(path, s, describe(v));

// per union shape, tagDispatch's table (a union of tagged records), takes and soles as their cells give them
const dispatches = new WeakMap<Shape, Dispatch | null>();
function dispatchOf(s: Shape & { k: "union" }, defs: Map<string, Shape> | null): Dispatch | null {
  let hit = dispatches.get(s);
  if (hit === undefined) dispatches.set(s, (hit = tagDispatch(s, defs)));
  return hit;
}

// One crossing. defs: the definitions of the shape's refs, or null when the shape has none (not recursive); done: per
// object, its copy under each shape (by its JSON, as an alias that is not recursive is expanded once per use), so an
// object two paths share is copied once (recursive shapes only); deep: the most objects and arrays open at once
type Run = { defs: Map<string, Shape> | null; seen: Set<object>; done: Map<object, Map<string, unknown>> | null; deep: number };
const shapeKeys = new WeakMap<Shape, string>();
const shapeKey = (s: Shape): string => { let k = shapeKeys.get(s); if (k === undefined) shapeKeys.set(s, (k = JSON.stringify(s))); return k; };
// an object, array or union being copied: i is the next property, element or union member, wait says the copy of
// property or element i is being made by the frame above; cycle is the first cycle a member of a union met
// sole: the mismatch of the one member that could take the value, when it failed below the union's place
type Frame = { v: any; s: Shape; path: string; i: number; wait: boolean; out: any; keys: string[] | null; cycle: Mismatch | null; sole: Mismatch | null };
// what copyEnter and copyResume return when the copy is not made yet: a frame was pushed
const WAIT = Symbol("wait");
const copyFrame = (v: unknown, s: Shape, path: string, out: unknown, keys: string[] | null): Frame => ({ v, s, path, i: 0, wait: false, out, keys, cycle: null, sole: null });

// value checked against shape, as a deep-frozen copy; throws Mismatch naming the path. The walk keeps its own stack, so
// the depth of a value is not bounded by the call stack
function copy(v: unknown, s: Shape, path: string, run: Run): unknown {
  const stack: Frame[] = [];
  let r = copyEnter(v, s, path, run, stack);
  while (stack.length) {
    try { r = copyResume(stack[stack.length - 1]!, r, run, stack); } catch (e) {
      if (!(e instanceof Mismatch)) throw e;
      r = copyUnwind(e, run, stack);
    }
  }
  return r;
}
// a primitive's copy, or a frame pushed for an object or an array (WAIT)
function copyEnter(v: unknown, s: Shape, path: string, run: Run, stack: Frame[]): unknown {
  switch (s.k) {
    case "num": case "str": case "bool": case "null": case "undef": case "lit": if (primFits(s, v)) return v; throw mismatch(v, s, path);
    case "fn": throw new TypeError(`${path}: a function shape inside a value`);
    case "defs": run.defs = new Map(s.defs); run.done = new Map(); return copyEnter(v, s.body, path, run, stack);
    case "ref": {
      const d = run.defs?.get(s.n);
      if (!d) throw new TypeError(`${path}: the shape has no definition of ${s.n}`);
      return copyEnter(v, d, path, run, stack);
    }
    case "union": return copyUnion(v, s, path, run, stack, 0, null, null);
    case "arr": case "tup": {
      if (!Array.isArray(v)) throw mismatch(v, s, path);
      if (s.k === "tup" && v.length !== s.els.length) throw mismatch(v, s, path);
      return copyOpen(v, s, path, run, stack, null);
    }
    case "rec":
      if (!v || typeof v !== "object" || Array.isArray(v) || !plain(v)) throw mismatch(v, s, path);
      return copyOpen(v, s, path, run, stack, null);
    case "unknown": {
      if (v === null || typeof v !== "object") {
        if (typeof v === "function") throw mismatch(v, s, path);
        return v;
      }
      if (typeof (v as { then?: unknown }).then === "function") throw mismatch(v, s, path);
      if (run.seen.has(v)) throw new Cycle(path, null, "a cycle");
      if (!Array.isArray(v) && !plain(v)) throw mismatch(v, s, path);
      return copyOpen(v, s, path, run, stack, Array.isArray(v) ? null : Object.keys(v));
    }
  }
}
function copyOpen(v: object, s: Shape, path: string, run: Run, stack: Frame[], keys: string[] | null): unknown {
  if (run.seen.has(v)) throw new Cycle(path, null, "a cycle");
  const hit = run.done?.get(v)?.get(shapeKey(s));
  if (hit !== undefined) return hit;
  run.seen.add(v);
  stack.push(copyFrame(v, s, path, Array.isArray(v) ? new Array(v.length) : {}, keys));
  if (stack.length > run.deep) run.deep = stack.length;
  return WAIT;
}
const valueKind = (v: unknown): number => (v === null || (typeof v !== "object" && typeof v !== "function") ? 2 : Array.isArray(v) ? 1 : 0);
const takes = new WeakMap<Shape, readonly number[]>();
function takesOf(s: Shape & { k: "union" }, defs: Map<string, Shape> | null): readonly number[] {
  let hit = takes.get(s);
  if (!hit) takes.set(s, (hit = memberTakes(s, defs)));
  return hit;
}
const soles = new WeakMap<Shape, readonly number[]>();
function soleOf(s: Shape & { k: "union" }, defs: Map<string, Shape> | null): readonly number[] {
  let hit = soles.get(s);
  if (!hit) soles.set(s, (hit = soleMembers(s, defs)));
  return hit;
}
// member i (of those tried) failed with e: e itself when isSoleMiss says it is the union's
const soleMiss = (v: unknown, s: Shape & { k: "union" }, path: string, run: Run, i: number, e: Mismatch): Mismatch | null =>
  isSoleMiss(e.path, path, dispatchOf(s, run.defs) !== null, soleOf(s, run.defs)[valueKind(v)]!, i) ? e : null;
// union s from member i on: the copy under the first member that fits, or WAIT with the union's frame under the
// member's. A union of tagged records tries only the member its tag names, and fails when that one does
function copyUnion(v: unknown, s: Shape & { k: "union" }, path: string, run: Run, stack: Frame[], i: number, cycle: Mismatch | null, sole: Mismatch | null): unknown {
  const d = dispatchOf(s, run.defs);
  const ts = d ? (i ? [] : !v || typeof v !== "object" || Array.isArray(v) || !plain(v) ? [] : [d.by.get((v as Record<string, unknown>)[d.key])]) : s.ts;
  const ks = d || valueKind(v) !== 2 ? null : takesOf(s, run.defs);
  for (; i < ts.length; i++) {
    const m = ts[i];
    if (!m) break;
    if (!triesMember(ks, i)) continue;
    const at = stack.length;
    try {
      const r = copyEnter(v, m, path, run, stack);
      if (r === WAIT) { const f = copyFrame(v, s, path, null, null); f.i = d ? 1 : i + 1; f.cycle = cycle; f.sole = sole; stack.splice(at, 0, f); }
      return r;
    } catch (e) { if (!(e instanceof Mismatch)) throw e; if (!cycle && e instanceof Cycle) cycle = e; sole ??= soleMiss(v, s, path, run, i, e); }
  }
  const miss = unionMiss(sole !== null, run.defs !== null, cycle !== null);
  throw miss === "sole" ? sole! : miss === "cycle" ? cycle! : mismatch(v, s, path);
}
// the top frame, given the copy of its pending child: its own copy (the frame popped), or WAIT
function copyResume(f: Frame, r: unknown, run: Run, stack: Frame[]): unknown {
  const s = f.s, v = f.v;
  if (s.k === "union") { stack.pop(); return r; }
  let i = f.i;
  if (s.k === "rec") {
    if (f.wait) { f.out[s.props[i]![0]] = r; i++; }
    // only the properties the type declares are kept
    for (; i < s.props.length; i++) {
      const [n, t, opt] = s.props[i]!;
      const has = Object.hasOwn(v, n);
      const x = v[n];
      const step = propStep(has, x === undefined, opt);
      if (step === "skip") continue;
      if (step === "missing") throw new Mismatch(`${f.path}.${n}`, t, "nothing");
      const c = copyEnter(x, t, `${f.path}.${n}`, run, stack);
      if (c === WAIT) { f.i = i; f.wait = true; return WAIT; }
      f.out[n] = c;
    }
  } else if (f.keys) {
    if (f.wait) { f.out[f.keys[i]!] = r; i++; }
    for (; i < f.keys.length; i++) {
      const k = f.keys[i]!, x = v[k];
      // a primitive under unknown is its own copy
      const c = x === null || (typeof x !== "object" && typeof x !== "function") ? x : copyEnter(x, s, `${f.path}.${k}`, run, stack);
      if (c === WAIT) { f.i = i; f.wait = true; return WAIT; }
      f.out[k] = c;
    }
  } else {
    if (f.wait) { f.out[i] = r; i++; }
    // a hole is read as undefined, and checked and copied as an undefined there would be
    for (; i < f.out.length; i++) {
      const x = v[i];
      const c = s.k === "unknown" && (x === null || (typeof x !== "object" && typeof x !== "function")) ? x : copyEnter(x, elemShape(s, i), `${f.path}[${i}]`, run, stack);
      if (c === WAIT) { f.i = i; f.wait = true; return WAIT; }
      f.out[i] = c;
    }
  }
  stack.pop();
  run.seen.delete(v);
  const out = Object.freeze(f.out);
  if (run.done) { let m = run.done.get(v); if (!m) run.done.set(v, (m = new Map())); m.set(shapeKey(s), out); }
  return out;
}
// pops the frames a mismatch fails, up to a union with a member left to try; what that union gives, or the mismatch
function copyUnwind(e: Mismatch, run: Run, stack: Frame[]): unknown {
  for (;;) {
    const f = stack.pop();
    if (!f) throw e;
    if (f.s.k !== "union") { run.seen.delete(f.v); continue; }
    try { return copyUnion(f.v, f.s, f.path, run, stack, f.i, f.cycle ?? (e instanceof Cycle ? e : null), f.sole ?? soleMiss(f.v, f.s, f.path, run, f.i - 1, e)); } catch (x) {
      if (!(x instanceof Mismatch)) throw x;
      e = x;
    }
  }
}
// the TypeError for a mismatch, its path cut as trimPath says
const refusal = (e: Mismatch, run: Run): TypeError => new TypeError(mismatchText(trimPath(e.path, run.defs !== null), e.s, e.found));
const newRun = (): Run => ({ defs: null, seen: new Set(), done: null, deep: 0 });

// two copies equal as deepEqual says, without recursion, and each pair of objects compared once (copies of a
// recursive shape share objects and may be deep)
function sameCopy(a: unknown, b: unknown): boolean {
  const todo: [unknown, unknown][] = [[a, b]];
  const met = new Map<object, Set<object>>();
  while (todo.length) {
    const [x, y] = todo.pop()!;
    if (Object.is(x, y)) continue;
    if (x === null || y === null || typeof x !== "object" || typeof y !== "object") return false;
    let m = met.get(x);
    if (m?.has(y)) continue;
    if (!m) met.set(x, (m = new Set()));
    m.add(y);
    const kx = Object.keys(x), ky = new Set(Object.keys(y));
    if (kx.length !== ky.size || !kx.every((k) => ky.has(k)) || Array.isArray(x) !== Array.isArray(y)) return false;
    for (const k of kx) todo.push([(x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k]]);
  }
  return true;
}

// per reading cell and parameter, the last copy handed out: an equal copy is that one, so the reader's
// memo (Object.is on inputs) still applies when the other language delivers equal data again
const last = new Map<string, unknown>();
export const crossings = { copies: 0, reused: 0 };

// The value of a cell in another language as the SoundScript parameter `path` (a cell and parameter
// name, "reader.param") receives it: checked against shape, deep-frozen, copied once per delivery.
export function cross(value: unknown, shape: Shape, path: string): unknown {
  const at = path.slice(path.indexOf(".") + 1);
  if (shape.k === "fn") return crossFn(value, shape, at, path);
  const run = newRun();
  let out: unknown;
  try { out = copy(value, shape, at, run); } catch (e) {
    if (e instanceof Mismatch) throw refusal(e, run);
    throw e;
  }
  crossings.copies++;
  // deepEqual recurses once per level
  if (last.has(path) && (run.defs || run.deep > 1000 ? sameCopy : deepEqual)(last.get(path), out)) { crossings.reused++; return last.get(path); }
  last.set(path, out);
  return out;
}
// checked and copied as cross() does, without its per-parameter reuse, for a write through a view's Ref
export function checkShape(value: unknown, shape: Shape, path: string): unknown {
  const run = newRun();
  try { return copy(value, shape, path, run); } catch (e) {
    if (e instanceof Mismatch) throw refusal(e, run);
    throw e;
  }
}

// A function from another language as the checked cell receives it: a frozen function of the boundary's own. Each call
// hands the function deep-frozen copies of the arguments, calls it with no this, and checks and copies the result with
// no reuse between calls. A throw, a mismatch or a throw while the result is read is a fresh TypeError naming the
// function, so nothing the other language made reaches the cell. Per reading cell and parameter, the same function
// under the same shape gives the same wrapper.
const fnWrappers = new Map<string, { raw: unknown; key: string; w: unknown }>();
function fnThrown(name: string, what: string, e: unknown): TypeError {
  let m: string;
  try { m = e instanceof Error ? String(e.message) : describe(e); } catch { m = "a value that could not be read"; }
  return new TypeError(thrownText(name, what, m));
}
function fnResult(v: unknown, s: Shape, name: string, path: string): unknown {
  const run = newRun();
  let bad: TypeError;
  try { return copy(v, s, path, run); } catch (e) {
    // instanceof on a proxy runs its getPrototypeOf trap
    let ours = false;
    try { ours = e instanceof Mismatch; } catch { /* the other language's */ }
    bad = ours ? refusal(e as Mismatch, run) : fnThrown(name, ": reading the result threw", e);
  }
  throw bad;
}
function crossFn(f: unknown, s: Shape & { k: "fn" }, name: string, path: string): unknown {
  if (typeof f !== "function") throw new TypeError(mismatchText(name, s, describe(f)));
  const key = JSON.stringify(s);
  const hit = fnWrappers.get(path);
  if (hit && hit.raw === f && hit.key === key) return hit.w;
  const plan = fnPlan(name, s);
  const w = Object.freeze((...args: unknown[]): unknown => {
    const xs = plan.args.map((a, i) => checkShape(args[i], a.shape, a.path));
    let r: unknown;
    try { r = Reflect.apply(f, undefined, xs); } catch (e) { throw fnThrown(name, " threw", e); }
    if (!s.async) return fnResult(r, s.ret, name, plan.result);
    // Promise.resolve reads a promise's constructor, and then may be an own property: either can throw
    return new Promise((res, rej) => {
      try { Promise.resolve(r).then((v) => { try { res(fnResult(v, s.ret, name, plan.result)); } catch (e) { rej(e); } }, (e) => rej(fnThrown(name, " threw", e))); } catch (e) { rej(fnThrown(name, " threw", e)); }
    });
  });
  fnWrappers.set(path, { raw: f, key, w });
  return w;
}
