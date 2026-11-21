// The checked boundary between a SoundScript cell and a cell of its module written in another
// language (Observable JavaScript, raw). The checker turns the parameter's annotation into a Shape
// (shapeOf); the compiled cell passes the value through cross(), which checks it against the shape and
// hands the cell a deep-frozen copy.
import { type Ty, show } from "./types.ts";
import { want, deepEqual, type Shape } from "./runtime-ss.ts";
export type { Shape } from "./runtime-ss.ts";

// The shape of an annotation, or why it cannot be checked at the boundary. expand resolves an alias or
// interface (Registry.expand); isAlias says whether a name is one. An alias met again while it is being expanded is a
// ref, and the shape of the whole annotation lists the definition of each such alias once (defs); an alias that is not
// recursive is expanded in place.
// limit: how deep the expansion may go. A type nested deeper than 16 is refused unless it is recursive; a recursive
// one is expanded again up to 256, as a ring of aliases closes only after each is open
type ShapeCtx = { open: string[]; rec: Set<string>; defs: Map<string, Shape>; limit: number };
export function shapeOf(t: Ty, expand: (t: Ty) => Ty, isAlias: (n: string) => boolean, depth = 0, ctx?: ShapeCtx): Shape | { error: string } {
  if (!ctx) {
    const at = (limit: number) => { const c: ShapeCtx = { open: [], rec: new Set(), defs: new Map(), limit }; return { c, body: shapeOf(t, expand, isAlias, depth, c) }; };
    let { c, body } = at(16);
    if ("error" in body) { const again = at(256); if (!again.c.rec.size) return body; ({ c, body } = again); }
    if ("error" in body || !c.defs.size) return body;
    const bad = [...c.defs.keys()].find((n) => unproductive(n, c.defs));
    if (bad !== undefined) return { error: `${bad}, a recursive type with no object or array between it and itself` };
    return { k: "defs", defs: [...c.defs], body };
  }
  // a generic alias whose arguments grow at each level never repeats
  if (depth > ctx.limit) return { error: "a recursive type" };
  const sub = (x: Ty) => shapeOf(x, expand, isAlias, depth + 1, ctx);
  switch (t.k) {
    case "num": return { k: "num" };
    case "str": return { k: "str" };
    case "null": return { k: "null" };
    case "undef": case "void": return { k: "undef" };
    case "unknown": return { k: "unknown" };
    case "lit": return { k: "lit", v: t.v };
    case "fn": return { error: "a function" };
    case "arr": { const el = sub(t.el); return "error" in el ? el : { k: "arr", el }; }
    case "tup": {
      const els: Shape[] = [];
      for (const x of t.els) { const s = sub(x); if ("error" in s) return s; els.push(s); }
      return { k: "tup", els };
    }
    case "union": {
      const ts: Shape[] = [];
      for (const x of t.ts) { const s = sub(x); if ("error" in s) return s; ts.push(s); }
      // true | false is boolean
      const lits = ts.filter((s) => s.k === "lit" && typeof s.v === "boolean");
      if (lits.length === 2) return { k: "union", ts: [...ts.filter((s) => !(s.k === "lit" && typeof s.v === "boolean")), { k: "bool" }] };
      return { k: "union", ts };
    }
    case "rec": {
      if (t.calls?.length || t.ctors?.length) return { error: "a function" };
      if (t.index) return { error: "an index signature" };
      const props: [string, Shape, boolean][] = [];
      for (const [n, p] of t.props) { const s = sub(p.t); if ("error" in s) return { error: `${n}: ${s.error}` }; props.push([n, s, p.opt]); }
      return { k: "rec", props };
    }
    case "named":
      if (t.n === "Promise") return { error: "a promise" };
      if (isAlias(t.n)) {
        const key = show(t);
        // show abbreviates a deep type with …, and two such names may be different types
        if (!key.includes("…") && (ctx.open.includes(key) || ctx.defs.has(key))) { ctx.rec.add(key); return { k: "ref", n: key }; }
        ctx.open.push(key);
        const s = sub(expand(t));
        ctx.open.pop();
        if ("error" in s || !ctx.rec.has(key)) return s;
        ctx.defs.set(key, s);
        return { k: "ref", n: key };
      }
      if (t.n === "Array" || t.n === "ReadonlyArray") { const el = sub(t.args[0]); return "error" in el ? el : { k: "arr", el }; }
      return { error: `${show(t)}, which the boundary does not check` };
    default: return { error: `${show(t)}, which the boundary does not check` };
  }
}
// the definition of n reaches n through unions and refs alone, so no finite value is checked against it
function unproductive(n: string, defs: Map<string, Shape>): boolean {
  const met = new Set<string>();
  const go = (s: Shape): boolean => {
    if (s.k === "union") return s.ts.some(go);
    if (s.k !== "ref") return false;
    if (s.n === n) return true;
    if (met.has(s.n)) return false;
    met.add(s.n);
    const d = defs.get(s.n);
    return d !== undefined && go(d);
  };
  const d = defs.get(n);
  return d !== undefined && go(d);
}

const describe = (v: unknown): string => {
  if (v === null) return "null";
  if (typeof v === "string") return `string ${JSON.stringify(v.length > 40 ? v.slice(0, 40) + "…" : v)}`;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return `${typeof v} ${String(v)}`;
  if (typeof v === "function") return "a function";
  if (Array.isArray(v)) return `an array of ${v.length}`;
  if (v && typeof (v as { then?: unknown }).then === "function") return "a promise";
  if (typeof v === "object") return Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null ? "an object" : `a ${(v as object).constructor?.name ?? "non-plain"} object`;
  return typeof v;
};
const plain = (v: object) => { const p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; };

// a value that does not fit a shape at path (a Cycle: a value met again inside itself); the message is made only for
// the mismatch that is reported. Not an Error: a union catches one per member it rejects
class Mismatch {
  path: string; s: Shape | null; found: string;
  constructor(path: string, s: Shape | null, found: string) { this.path = path; this.s = s; this.found = found; }
  text(): string { return this.s ? `${this.path}: expected ${want(this.s)}, found ${this.found}` : `${this.path}: ${this.found}`; }
}
class Cycle extends Mismatch {}
const mismatch = (v: unknown, s: Shape, path: string): Mismatch => new Mismatch(path, s, describe(v));

type Dispatch = { key: string; by: Map<unknown, Shape> };
// per union shape: when every member is a record giving one property a literal of its own (a tag), that property and
// the member for each literal; else null. A member that is a ref is looked up in defs
const dispatches = new WeakMap<Shape, Dispatch | null>();
function dispatchOf(s: Shape & { k: "union" }, defs: Map<string, Shape> | null): Dispatch | null {
  const hit = dispatches.get(s);
  if (hit !== undefined) return hit;
  let out: Dispatch | null = null;
  const ms = s.ts.map((m) => { for (let i = 0; m.k === "ref" && defs && i < 64; i++) m = defs.get(m.n) ?? m; return m; });
  const first = ms[0];
  if (first?.k === "rec" && ms.every((m) => m.k === "rec")) {
    for (const [key, ks, opt] of first.props) {
      if (opt || ks.k !== "lit") continue;
      const by = new Map<unknown, Shape>();
      const tagged = ms.every((m) => {
        const p = m.k === "rec" ? m.props.find((q) => q[0] === key) : undefined;
        if (!p || p[2] || p[1].k !== "lit" || by.has(p[1].v)) return false;
        by.set(p[1].v, m);
        return true;
      });
      if (tagged) { out = { key, by }; break; }
    }
  }
  dispatches.set(s, out);
  return out;
}

// One crossing. defs: the definitions of the shape's refs, or null when the shape has none (not recursive); done: per
// object, its copy under each shape (by its JSON, as an alias that is not recursive is expanded once per use), so an
// object two paths share is copied once (recursive shapes only); deep: the most objects and arrays open at once
type Run = { defs: Map<string, Shape> | null; seen: Set<object>; done: Map<object, Map<string, unknown>> | null; deep: number };
const shapeKeys = new WeakMap<Shape, string>();
const shapeKey = (s: Shape): string => { let k = shapeKeys.get(s); if (k === undefined) shapeKeys.set(s, (k = JSON.stringify(s))); return k; };
// an object, array or union being copied: i is the next property, element or union member, wait says the copy of
// property or element i is being made by the frame above; cycle is the first cycle a member of a union met
type Frame = { v: any; s: Shape; path: string; i: number; wait: boolean; out: any; keys: string[] | null; cycle: Mismatch | null };
// what copyEnter and copyResume return when the copy is not made yet: a frame was pushed
const WAIT = Symbol("wait");
const copyFrame = (v: unknown, s: Shape, path: string, out: unknown, keys: string[] | null): Frame => ({ v, s, path, i: 0, wait: false, out, keys, cycle: null });

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
    case "num": if (typeof v === "number") return v; throw mismatch(v, s, path);
    case "str": if (typeof v === "string") return v; throw mismatch(v, s, path);
    case "bool": if (typeof v === "boolean") return v; throw mismatch(v, s, path);
    case "null": if (v === null) return v; throw mismatch(v, s, path);
    case "undef": if (v === undefined) return v; throw mismatch(v, s, path);
    case "lit": if (Object.is(v, s.v)) return v; throw mismatch(v, s, path);
    case "defs": run.defs = new Map(s.defs); run.done = new Map(); return copyEnter(v, s.body, path, run, stack);
    case "ref": {
      const d = run.defs?.get(s.n);
      if (!d) throw new TypeError(`${path}: the shape has no definition of ${s.n}`);
      return copyEnter(v, d, path, run, stack);
    }
    case "union": return copyUnion(v, s, path, run, stack, 0, null);
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
// union s from member i on: the copy under the first member that fits, or WAIT with the union's frame under the
// member's. A union of tagged records tries only the member its tag names, and fails when that one does
function copyUnion(v: unknown, s: Shape & { k: "union" }, path: string, run: Run, stack: Frame[], i: number, cycle: Mismatch | null): unknown {
  const d = dispatchOf(s, run.defs);
  const ts = d ? (i ? [] : !v || typeof v !== "object" || Array.isArray(v) || !plain(v) ? [] : [d.by.get((v as Record<string, unknown>)[d.key])]) : s.ts;
  for (; i < ts.length; i++) {
    const m = ts[i];
    if (!m) break;
    const at = stack.length;
    try {
      const r = copyEnter(v, m, path, run, stack);
      if (r === WAIT) { const f = copyFrame(v, s, path, null, null); f.i = d ? 1 : i + 1; f.cycle = cycle; stack.splice(at, 0, f); }
      return r;
    } catch (e) { if (!(e instanceof Mismatch)) throw e; if (!cycle && e instanceof Cycle) cycle = e; }
  }
  // under a recursive shape a cycle is reported as the cause, not as the union's mismatch
  throw run.defs && cycle ? cycle : mismatch(v, s, path);
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
      if (!has || x === undefined) { if (opt) continue; if (!has) throw new Mismatch(`${f.path}.${n}`, t, "nothing"); }
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
    // a hole stays a hole, as Array.prototype.map leaves it
    for (; i < f.out.length; i++) {
      if (!(i in v)) continue;
      const x = v[i];
      const c = s.k === "unknown" && (x === null || (typeof x !== "object" && typeof x !== "function")) ? x : copyEnter(x, s.k === "arr" ? s.el : s.k === "tup" ? s.els[i]! : s, `${f.path}[${i}]`, run, stack);
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
    try { return copyUnion(f.v, f.s, f.path, run, stack, f.i, f.cycle ?? (e instanceof Cycle ? e : null)); } catch (x) {
      if (!(x instanceof Mismatch)) throw x;
      e = x;
    }
  }
}
// the TypeError for a mismatch; under a recursive shape a path longer than 300 characters keeps its two ends
function refusal(e: Mismatch, run: Run): TypeError {
  if (run.defs && e.path.length > 300) return new TypeError(new Mismatch(`${e.path.slice(0, 80)}…${e.path.slice(-160)}`, e.s, e.found).text());
  return new TypeError(e.text());
}
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
