// Port attempt (2026-11-20): the runtime half of lite/boundary.ts as SoundScript cells, written as the original
// is (switch, a class for the throw, Object.freeze), so the checker's messages are about the language.
// bun selfhost/rt/check.ts selfhost/rt/boundary.ss.ts
type Shape =
  | { k: "num" } | { k: "str" } | { k: "bool" } | { k: "null" } | { k: "undef" } | { k: "unknown" }
  | { k: "lit"; v: string | number | boolean }
  | { k: "arr"; el: Shape }
  | { k: "tup"; els: Shape[] }
  | { k: "rec"; props: [string, Shape, boolean][] }
  | { k: "union"; ts: Shape[] };

export const describe = () => (v: unknown): string => {
  if (v === null) return "null";
  if (typeof v === "string") return `string ${JSON.stringify(v.length > 40 ? v.slice(0, 40) + "…" : v)}`;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return `${typeof v} ${String(v)}`;
  if (typeof v === "function") return "a function";
  if (Array.isArray(v)) return `an array of ${v.length}`;
  if (typeof v === "object" && v !== null && "then" in v && typeof v.then === "function") return "a promise";
  if (typeof v === "object" && v !== null) {
    const p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null ? "an object" : `a ${v.constructor?.name ?? "non-plain"} object`;
  }
  return typeof v;
};
export const want = () => {
  const w = (s: Shape): string => {
    switch (s.k) {
      case "num": return "number"; case "str": return "string"; case "bool": return "boolean";
      case "null": return "null"; case "undef": return "undefined"; case "unknown": return "data";
      case "lit": return JSON.stringify(s.v);
      case "arr": return "an array"; case "tup": return `an array of ${s.els.length}`;
      case "rec": return "an object";
      case "union": return s.ts.map(w).join(" or ");
    }
  };
  return w;
};
export const plain = () => (v: object): boolean => { const p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; };
export const Mismatch = () => { class Mismatch extends Error {} return Mismatch; };
export const copy = (want: (s: Shape) => string, describe: (v: unknown) => string, plain: (v: object) => boolean) => {
  const go = (v: unknown, s: Shape, path: string, seen: Mut<Set<object>>): unknown => {
    const fail = (): never => { throw new TypeError(`${path}: expected ${want(s)}, found ${describe(v)}`); };
    if (s.k === "num") return typeof v === "number" ? v : fail();
    if (s.k === "str") return typeof v === "string" ? v : fail();
    if (s.k === "bool") return typeof v === "boolean" ? v : fail();
    if (s.k === "null") return v === null ? v : fail();
    if (s.k === "undef") return v === undefined ? v : fail();
    if (s.k === "lit") return Object.is(v, s.v) ? v : fail();
    if (s.k === "union") {
      for (const t of s.ts) { try { return go(v, t, path, seen); } catch (e) { if (!(e instanceof TypeError)) throw e; } }
      return fail();
    }
    if (s.k === "arr" || s.k === "tup") {
      if (!Array.isArray(v)) return fail();
      if (s.k === "tup" && v.length !== s.els.length) return fail();
      if (seen.has(v)) throw new TypeError(`${path}: a cycle`);
      seen.add(v);
      try { return Object.freeze(v.map((x, i) => go(x, s.k === "arr" ? s.el : s.els[i] ?? s, `${path}[${i}]`, seen))); } finally { seen.delete(v); }
    }
    if (s.k === "rec") {
      if (typeof v !== "object" || v === null || Array.isArray(v) || !plain(v)) return fail();
      if (seen.has(v)) throw new TypeError(`${path}: a cycle`);
      seen.add(v);
      const out = mut({} as Record<string, unknown>);
      try {
        for (const [n, t, opt] of s.props) {
          const has = Object.hasOwn(v, n);
          const x = has && n in v ? v[n] : undefined;
          if (!has || x === undefined) { if (opt) continue; if (!has) throw new TypeError(`${path}.${n}: expected ${want(t)}, found nothing`); }
          out[n] = go(x, t, `${path}.${n}`, seen);
        }
      } finally { seen.delete(v); }
      return Object.freeze(freeze(out));
    }
    if (v === null || typeof v !== "object") return typeof v === "function" ? fail() : v;
    if ("then" in v && typeof v.then === "function") return fail();
    if (seen.has(v)) throw new TypeError(`${path}: a cycle`);
    if (!Array.isArray(v) && !plain(v)) return fail();
    seen.add(v);
    try {
      if (Array.isArray(v)) return Object.freeze(v.map((x, i) => go(x, s, `${path}[${i}]`, seen)));
      const out: Mut<Record<string, unknown>> = mut({});
      for (const k of Object.keys(v)) out[k] = go(v[k], s, `${path}.${k}`, seen);
      return Object.freeze(freeze(out));
    } finally { seen.delete(v); }
  };
  return go;
};
export const deepEqual = () => {
  const eq = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && eq(a[k], b[k]));
  };
  return eq;
};
export const last = () => new Map<string, unknown>();
export const crossings = () => ({ copies: 0, reused: 0 });
export const cross = (copy: (v: unknown, s: Shape, path: string, seen: Mut<Set<object>>) => unknown, crossings: { copies: number; reused: number }, last: Map<string, unknown>, deepEqual: (a: unknown, b: unknown) => boolean) =>
  (value: unknown, shape: Shape, path: string): unknown => {
    const at = path.slice(path.indexOf(".") + 1);
    const seen = mut(new Set<object>());
    const out = copy(value, shape, at, seen);
    crossings.copies++;
    if (last.has(path) && deepEqual(last.get(path), out)) { crossings.reused++; return last.get(path); }
    last.set(path, out);
    return out;
  };
export const checkShape = (copy: (v: unknown, s: Shape, path: string, seen: Mut<Set<object>>) => unknown) => (value: unknown, shape: Shape, path: string): unknown => {
  const seen = mut(new Set<object>());
  return copy(value, shape, path, seen);
};
