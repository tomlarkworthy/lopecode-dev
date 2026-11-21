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

class Mismatch extends Error {}
// RECURSIVE CROSSING (nested-ast): a cycle or a value nested too deep is not a mismatch a union member may absorb: it
// ends the crossing with its own message
class Refused extends Error {}
export const LIMITS = { depth: 2000, memo: true };
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
    if (run.depth >= LIMITS.depth) throw new Refused(`${path}: nested deeper than ${LIMITS.depth}`);
    run.depth++;
    try {
      const out = copy1(v, s, path, seen, run);
      if (LIMITS.memo) { let m = run.done.get(v); if (!m) run.done.set(v, (m = new Map())); m.set(s, out); }
      return out;
    } finally { run.depth--; }
  }
  return copy1(v, s, path, seen, run);
}
function copy1(v: unknown, s: Shape, path: string, seen: Set<object>, run: Run): unknown {
  const copy = (x: unknown, t: Shape, p: string, sn: Set<object>) => copyR(x, t, p, sn, run);
  const fail = (): never => { throw new Mismatch(`${path}: expected ${want(s)}, found ${describe(v)}`); };
  switch (s.k) {
    case "num": return typeof v === "number" ? v : fail();
    case "str": return typeof v === "string" ? v : fail();
    case "bool": return typeof v === "boolean" ? v : fail();
    case "null": return v === null ? v : fail();
    case "undef": return v === undefined ? v : fail();
    case "lit": return Object.is(v, s.v) ? v : fail();
    case "union": {
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

const copyR = (v: unknown, s: Shape, path: string, seen: Set<object>, run: Run) => copy(v, s, path, seen, run);

// per reading cell and parameter, the last copy handed out: an equal copy is that one, so the reader's
// memo (Object.is on inputs) still applies when the other language delivers equal data again
const last = new Map<string, unknown>();
export const crossings = { copies: 0, reused: 0 };

// The value of a cell in another language as the SoundScript parameter `path` (a cell and parameter
// name, "reader.param") receives it: checked against shape, deep-frozen, copied once per delivery.
export function cross(value: unknown, shape: Shape, path: string): unknown {
  const at = path.slice(path.indexOf(".") + 1);
  let out: unknown;
  try { out = copy(value, shape, at, new Set()); } catch (e) {
    if (e instanceof Mismatch || e instanceof Refused) throw new TypeError(e.message);
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
    if (e instanceof Mismatch || e instanceof Refused) throw new TypeError(e.message);
    throw e;
  }
}
