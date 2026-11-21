// Attempt (2026-11-21): boundary.ts copy, describe and prelude.runtime.ts equals as SoundScript cells over unknown,
// with Mismatch replaced by a result value. Checked with runtime.ss.ts (Shape, want). Not expected to check: it is
// here for the messages.
export type Copied = { readonly ok: true; readonly v: unknown } | { readonly ok: false; readonly msg: string };
export const describe = () => (v: unknown): string => {
  if (v === null) return "null";
  if (typeof v === "string") return `string ${JSON.stringify(v.length > 40 ? v.slice(0, 40) + "…" : v)}`;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return `${typeof v} ${String(v)}`;
  if (typeof v === "function") return "a function";
  if (Array.isArray(v)) return `an array of ${v.length}`;
  if (typeof v === "object" && typeof v.then === "function") return "a promise";
  if (typeof v === "object") return Object.getPrototypeOf(v) === null ? "an object" : `a ${v.constructor?.name ?? "non-plain"} object`;
  return typeof v;
};
export const copyRec = (want, describe) => (v: unknown, props: readonly [string, Shape, boolean][], path: string, seen: Mut<Set<object>>, sub: (x: unknown, s: Shape, p: string) => Copied): Copied => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return { ok: false, msg: `${path}: expected an object, found ${describe(v)}` };
  if (seen.has(v)) return { ok: false, msg: `${path}: a cycle` };
  seen.add(v);
  const out: Mut<{ [k: string]: unknown }> = mut({});
  for (const [n, t, opt] of props) {
    const has = Object.hasOwn(v, n);
    const x = v[n];
    if (!has || x === undefined) { if (opt) continue; if (!has) return { ok: false, msg: `${path}.${n}: expected ${want(t)}, found nothing` }; }
    const c = sub(x, t, `${path}.${n}`);
    if (!c.ok) return c;
    out[n] = c.v;
  }
  seen.delete(v);
  return { ok: true, v: freeze(out) };
};
export const equals = () => (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  if (a instanceof Map && b instanceof Map) return a.size === b.size;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length;
};
