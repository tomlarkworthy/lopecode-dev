// The checked boundary between a SoundScript cell and a cell of its module written in another
// language (Observable JavaScript, raw). The checker turns the parameter's annotation into a Shape
// (shapeOf); the compiled cell passes the value through cross(), which checks it against the shape and
// hands the cell a deep-frozen copy.
import { type Ty, show } from "./types.ts";
import { want, deepEqual, type Shape } from "./runtime-ss.ts";
export type { Shape } from "./runtime-ss.ts";

// The shape of an annotation, or why it cannot be checked at the boundary. expand resolves an alias or
// interface (Registry.expand); isAlias says whether a name is one.
// RECURSIVE CROSSING (nested-ast): an alias met again while its own expansion is open becomes { k: "ref" } and its
// shape a definition, emitted once at the top in { k: "defs" }. An alias that is not recursive is inlined as before.
// The key of an alias is show(t), so a generic alias whose arguments grow at each level (no fixed key) still runs
// into the depth limit. A definition that reaches itself through unions and refs alone (type A = A | number) gives
// no value a finite check, so it is an error.
type Ctx = { open: string[]; rec: Set<string>; defs: Map<string, Shape> };
export function shapeOf(t: Ty, expand: (t: Ty) => Ty, isAlias: (n: string) => boolean, depth = 0, ctx?: Ctx): Shape | { error: string } {
  if (!ctx) {
    const c: Ctx = { open: [], rec: new Set(), defs: new Map() };
    const body = shapeOf(t, expand, isAlias, depth, c);
    if ("error" in body) return body;
    if (!c.defs.size) return body;
    const bad = [...c.defs.keys()].find((n) => unguarded(n, c.defs));
    if (bad) return { error: `${bad}, a recursive type that refers to itself without an object or array in between` };
    return { k: "defs", defs: [...c.defs], body };
  }
  if (depth > 16) return { error: "a recursive type" };
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
        if (ctx.open.includes(key) || ctx.defs.has(key)) { ctx.rec.add(key); return { k: "ref", n: key }; }
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

// FN CROSSING (ss-acorn): the shape of a parameter's annotation. At the top only (fnOk: not under State), a function
// type with no type parameters and no rest, whose parameters and result (or the T of a Promise<T> result) are data
export function boundaryShape(t: Ty, expand: (t: Ty) => Ty, isAlias: (n: string) => boolean, fnOk: boolean): Shape | { error: string } {
  let f = t;
  for (let i = 0; i < 8 && f.k === "named" && isAlias(f.n); i++) f = expand(f);
  if (!fnOk || f.k !== "fn") return shapeOf(t, expand, isAlias);
  if (f.tps.length || f.rest) return { error: "a function with type parameters or a rest parameter" };
  const part = (x: Ty, what: string) => { const s = shapeOf(x, expand, isAlias); return "error" in s ? { error: `a function whose ${what} is or holds ${s.error}` } : s; };
  const ps: Shape[] = [];
  for (const [i, p] of f.ps.entries()) { const s = part(p.t, `parameter ${p.n || i + 1}`); if ("error" in s) return s; ps.push(p.opt ? { k: "union", ts: [s, { k: "undef" }] } : s); }
  const async = f.ret.k === "named" && f.ret.n === "Promise";
  const ret = part(async ? (f.ret as Ty & { k: "named" }).args[0] ?? { k: "unknown" } : f.ret, "result");
  return "error" in ret ? ret : { k: "fn", ps, ret, async };
}

// a definition reaching a ref to itself through union members and refs only
function unguarded(n: string, defs: Map<string, Shape>): boolean {
  const seen = new Set<string>();
  const go = (s: Shape): boolean => {
    if (s.k === "union") return s.ts.some(go);
    if (s.k !== "ref") return false;
    if (s.n === n) return true;
    if (seen.has(s.n)) return false;
    seen.add(s.n);
    const d = defs.get(s.n);
    return !!d && go(d);
  };
  const d = defs.get(n);
  return !!d && go(d);
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

// LAZY MESSAGE (nested-ast): a union tries members by catching Mismatch, so most are never shown; the text is made
// only when the crossing fails
class Mismatch extends Error {
  // super() with no message: Error would otherwise give the instance an own message that hides the getter
  constructor(private text: string | (() => string)) { super(); }
  override get message(): string { return typeof this.text === "string" ? this.text : (this.text = this.text()); }
  override set message(_: string) {}
}
// RECURSIVE CROSSING (nested-ast): a cycle or a value nested too deep is not a mismatch a union member may absorb: it
// ends the crossing with its own message
class Refused extends Error {}
// DEPTH (ss-acorn): depth counts objects checked against a record type, not arrays (countArrays: the nested
// prototype's count, for comparison); the message gives the path's two ends
export const LIMITS = { depth: 5000, memo: true, countArrays: false };
const clip = (m: string): string => { const i = m.indexOf(": "); return i > 160 ? `${m.slice(0, 60)} … ${m.slice(i - 60)}` : m; };
// per crossing: the definitions of the shape's refs, and each object already copied against a shape (a value two
// paths share is checked and copied once, and the copy is shared)
type Run = { defs: Map<string, Shape>; done: Map<object, Map<Shape, unknown>>; depth: number };
// value checked against shape, as a deep-frozen copy; throws Mismatch naming the path
function copy(v: unknown, s: Shape, path: string, seen: Set<object>, run: Run = { defs: new Map(), done: new Map(), depth: 0 }): unknown {
  if (s.k === "defs") { for (const [n, d] of s.defs) run.defs.set(n, d); return copy(v, s.body, path, seen, run); }
  if (s.k === "ref") {
    const d = run.defs.get(s.n);
    if (!d) throw new Refused(`${path}: no definition of ${s.n}`);
    return copy(v, d, path, seen, run);
  }
  if (v !== null && typeof v === "object" && (s.k === "rec" || s.k === "arr" || s.k === "tup" || s.k === "unknown")) {
    if (seen.has(v)) throw new Refused(`${path}: a cycle (this value contains itself)`);
    const hit = run.done.get(v)?.get(s);
    if (hit !== undefined) return hit;
    const counts = s.k === "rec" || s.k === "unknown" || LIMITS.countArrays;
    if (counts && run.depth >= LIMITS.depth) throw new Refused(`${path}: nested deeper than ${LIMITS.depth} objects`);
    if (counts) run.depth++;
    try {
      const out = copy1(v, s, path, seen, run);
      if (LIMITS.memo) { let m = run.done.get(v); if (!m) run.done.set(v, (m = new Map())); m.set(s, out); }
      return out;
    } finally { if (counts) run.depth--; }
  }
  return copy1(v, s, path, seen, run);
}
function copy1(v: unknown, s: Shape, path: string, seen: Set<object>, run: Run): unknown {
  const copy = (x: unknown, t: Shape, p: string, sn: Set<object>) => copyR(x, t, p, sn, run);
  const fail = (): never => { throw new Mismatch(() => `${path}: expected ${want(s)}, found ${describe(v)}`); };
  switch (s.k) {
    case "num": return typeof v === "number" ? v : fail();
    case "str": return typeof v === "string" ? v : fail();
    case "bool": return typeof v === "boolean" ? v : fail();
    case "null": return v === null ? v : fail();
    case "undef": return v === undefined ? v : fail();
    case "lit": return Object.is(v, s.v) ? v : fail();
    case "union": {
      // DISPATCH (nested-ast): a union of records that each give one property a different literal (a tag) takes the
      // member the value's tag names; that member's own copy checks the tag again
      const d = dispatchOf(s, run.defs);
      if (d) {
        if (v === null || typeof v !== "object" || Array.isArray(v)) return fail();
        const m = d.by.get((v as Record<string, unknown>)[d.key] as string | number | boolean);
        if (m) return copy(v, m, path, seen);
        throw new Mismatch(() => `${path}: expected ${want(s)}, found an object with ${d.key} ${describe((v as Record<string, unknown>)[d.key])}`);
      }
      for (const t of s.ts) { try { return copy(v, t, path, seen); } catch (e) { if (!(e instanceof Mismatch)) throw e; } }
      return fail();
    }
    case "arr": case "tup": {
      if (!Array.isArray(v)) return fail();
      if (s.k === "tup" && v.length !== s.els.length) return fail();
      if (seen.has(v)) throw new Mismatch(`${path}: a cycle`);
      seen.add(v);
      try { return Object.freeze(v.map((x, i) => copy(x, s.k === "arr" ? s.el : s.els[i], `${path}[${i}]`, seen))); } finally { seen.delete(v); }
    }
    case "rec": {
      if (!v || typeof v !== "object" || Array.isArray(v) || !plain(v)) return fail();
      if (seen.has(v)) throw new Mismatch(`${path}: a cycle`);
      seen.add(v);
      const out: Record<string, unknown> = {};
      try {
        // only the properties the type declares are kept
        for (const [n, t, opt] of s.props) {
          const has = Object.hasOwn(v, n);
          const x = (v as Record<string, unknown>)[n];
          if (!has || x === undefined) { if (opt) continue; if (!has) throw new Mismatch(`${path}.${n}: expected ${want(t)}, found nothing`); }
          out[n] = copy(x, t, `${path}.${n}`, seen);
        }
      } finally { seen.delete(v); }
      return Object.freeze(out);
    }
    case "fn": throw new Refused(`${path}: a function inside a value`);
    case "unknown": {
      if (v === null || typeof v !== "object") {
        if (typeof v === "function") return fail();
        return v;
      }
      if (typeof (v as { then?: unknown }).then === "function") return fail();
      if (seen.has(v)) throw new Mismatch(`${path}: a cycle`);
      if (!Array.isArray(v) && !plain(v)) return fail();
      seen.add(v);
      try {
        if (Array.isArray(v)) return Object.freeze(v.map((x, i) => copy(x, s, `${path}[${i}]`, seen)));
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(v)) out[k] = copy((v as Record<string, unknown>)[k], s, `${path}.${k}`, seen);
        return Object.freeze(out);
      } finally { seen.delete(v); }
    }
  }
}

// DISPATCH (nested-ast): per union shape, its tag and the member for each tag value, or null when it has none
const dispatches = new WeakMap<Shape, { key: string; by: Map<string | number | boolean, Shape> } | null>();
function dispatchOf(s: Shape & { k: "union" }, defs: Map<string, Shape>): { key: string; by: Map<string | number | boolean, Shape> } | null {
  if (dispatches.has(s)) return dispatches.get(s)!;
  const resolve = (x: Shape): Shape | undefined => { for (let i = 0; i < 8 && x.k === "ref"; i++) x = defs.get(x.n) ?? x; return x.k === "ref" ? undefined : x; };
  const ms = s.ts.map(resolve);
  let out: { key: string; by: Map<string | number | boolean, Shape> } | null = null;
  if (ms.every((m) => m?.k === "rec")) {
    const first = ms[0] as Shape & { k: "rec" };
    for (const [key, ks, opt] of first.props) {
      if (opt || ks.k !== "lit") continue;
      const by = new Map<string | number | boolean, Shape>();
      const ok = ms.every((m) => { const p = (m as Shape & { k: "rec" }).props.find((q) => q[0] === key); return !!p && !p[2] && p[1].k === "lit" && !by.has(p[1].v) && !!by.set(p[1].v, m!); });
      if (ok) { out = { key, by }; break; }
    }
  }
  dispatches.set(s, out);
  return out;
}
const copyR = (v: unknown, s: Shape, path: string, seen: Set<object>, run: Run) => copy(v, s, path, seen, run);

// per reading cell and parameter, the last copy handed out: an equal copy is that one, so the reader's
// memo (Object.is on inputs) still applies when the other language delivers equal data again
const last = new Map<string, unknown>();
export const crossings = { copies: 0, reused: 0 };

// The value of a cell in another language as the SoundScript parameter `path` (a cell and parameter
// name, "reader.param") receives it: checked against shape, deep-frozen, copied once per delivery.
export function cross(value: unknown, shape: Shape, path: string): unknown {
  const at = path.slice(path.indexOf(".") + 1);
  if (shape.k === "fn") return crossFn(value, shape, at, path);
  let out: unknown;
  try { out = copy(value, shape, at, new Set()); } catch (e) {
    if (e instanceof Mismatch || e instanceof Refused) throw new TypeError(clip(e.message));
    throw e;
  }
  crossings.copies++;
  if (last.has(path) && deepEqual(last.get(path), out)) { crossings.reused++; return last.get(path); }
  last.set(path, out);
  return out;
}
// checked and copied as cross() does, without its per-parameter reuse, for a write through a view's Ref
export function checkShape(value: unknown, shape: Shape, path: string): unknown {
  try { return copy(value, shape, path, new Set()); } catch (e) {
    if (e instanceof Mismatch || e instanceof Refused) throw new TypeError(clip(e.message));
    throw e;
  }
}

// FN CROSSING (ss-acorn): a function from another language as the checked cell receives it: a frozen function of its
// own that copies each argument against its parameter's shape (a deep-frozen copy, so the other language never holds
// a checked value), calls the function with no this, and returns the result checked and copied as a value crossing is
// (checkShape: no reuse between calls). A throw from the function, or a result that does not match, is a fresh
// TypeError naming the function; nothing the function threw reaches the cell. The same function delivered again gives
// the same wrapper, as an equal value gives the same copy.
type FnShape = Shape & { k: "fn" };
const wrappers = new Map<string, { raw: unknown; w: unknown }>();
export const fnCalls = { calls: 0 };
const thrown = (name: string, e: unknown): TypeError => {
  let m: string;
  try { m = e instanceof Error ? String(e.message) : describe(e); } catch { m = "a value that could not be read"; }
  return new TypeError(`${name}(...) threw: ${m}`);
};
function crossFn(f: unknown, s: FnShape, name: string, path: string): unknown {
  if (typeof f !== "function") throw new TypeError(`${name}: expected a function, found ${describe(f)}`);
  const hit = wrappers.get(path);
  if (hit && hit.raw === f) return hit.w;
  const out = (v: unknown): unknown => checkShape(v, s.ret, `${name}(...)`); // CONTROL: before the getter fix
  const w = Object.freeze((...args: unknown[]): unknown => {
    fnCalls.calls++;
    const xs = s.ps.map((p, i) => checkShape(args[i], p, `${name} argument ${i + 1}`));
    let r: unknown;
    try { r = Reflect.apply(f, undefined, xs); } catch (e) { throw thrown(name, e); }
    if (!s.async) return out(r);
    return new Promise((res, rej) => { Promise.resolve(r).then((v) => { try { res(out(v)); } catch (e) { rej(e); } }, (e) => rej(thrown(name, e))); });
  });
  wrappers.set(path, { raw: f, w });
  return w;
}
