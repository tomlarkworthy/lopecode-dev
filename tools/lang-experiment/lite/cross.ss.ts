// The decisions of the boundary's run-time half that need no read of the value, as SoundScript cells: the message of a
// mismatch, how a long path is cut, a value's description from what boundary.ts read of it, and, once per union shape,
// which members could take each kind of value and the tag that picks one. boundary.ts reads the value, keeps the
// stack, the identity maps and the caches, freezes the copies and calls a function from another language. Under bun,
// runtime-ss.ts links these cells; in the notebook they are compiled cells of @tomlarkworthy/soundscript-runtime.

// what boundary.ts read of a value to describe it; ctor: an object's constructor's name as text, null when it has none
export type ValueSeen =
  | { readonly t: "null" } | { readonly t: "-0" } | { readonly t: "function" } | { readonly t: "promise" }
  | { readonly t: "string"; readonly s: string }
  | { readonly t: "number" | "boolean" | "bigint"; readonly text: string }
  | { readonly t: "array"; readonly length: number }
  | { readonly t: "object"; readonly plain: boolean; readonly ctor: string | null }
  | { readonly t: "other"; readonly type: string };
export type UnionShape = { k: "union"; ts: Shape[] };
// a union of records that each give the property key a literal of their own: the member for each literal
export type Dispatch = { readonly key: string; readonly by: Map<string | number | boolean, Shape> };
export type FnShape = { k: "fn"; ps: Shape[]; ret: Shape; async: boolean };
// what a wrapper checks on each call: each argument's shape and path, and the result's path
export type FnPlan = { readonly args: readonly { readonly shape: Shape; readonly path: string }[]; readonly result: string };

export const describeSeen = () => (s: ValueSeen): string => {
  switch (s.t) {
    case "null": return "null";
    case "string": return `string ${JSON.stringify(s.s.length > 40 ? s.s.slice(0, 40) + "…" : s.s)}`;
    case "-0": return "number -0";
    case "number": case "boolean": case "bigint": return `${s.t} ${s.text}`;
    case "function": return "a function";
    case "array": return `an array of ${s.length}`;
    case "promise": return "a promise";
    case "object": return s.plain ? "an object" : `a ${s.ctor ?? "non-plain"} object`;
    case "other": return s.type;
  }
};
// a value at path that does not fit s; with no shape, found is the whole message (a cycle)
export const mismatchText = (want) => (path: string, s: Shape | null, found: string): string => (s !== null ? `${path}: expected ${want(s)}, found ${found}` : `${path}: ${found}`);
// under a recursive shape a path longer than 300 characters keeps its two ends
export const trimPath = () => (path: string, recursive: boolean): string => (recursive && path.length > 300 ? `${path.slice(0, 80)}…${path.slice(-160)}` : path);

// a ref followed to its definition, at most 64 steps
export const resolveRef = () => (m: Shape, defs: Map<string, Shape> | null): Shape => {
  let x = m, i = 0;
  while (x.k === "ref" && defs !== null && i < 64) { x = defs.get(x.n) ?? x; i++; }
  return x;
};
// each member by its literal at key, when every member is a record with a literal there of its own; else null
export const tagTable = () => (ms: readonly Shape[], key: string): Map<string | number | boolean, Shape> | null => {
  const by: Mut<Map<string | number | boolean, Shape>> = new Map();
  for (const m of ms) {
    const p = m.k === "rec" ? m.props.find((q) => q[0] === key) : undefined;
    if (p === undefined || p[2]) return null;
    const lit = p[1];
    if (lit.k !== "lit" || by.has(lit.v)) return null;
    by.set(lit.v, m);
  }
  return by;
};
// a union whose members are records that each give one property a literal of its own (a tag): that property and the
// member for each literal; else null. A member that is a ref is looked up in defs
export const tagDispatch = (resolveRef, tagTable) => (s: UnionShape, defs: Map<string, Shape> | null): Dispatch | null => {
  const ms = s.ts.map((m) => resolveRef(m, defs));
  const first = ms[0];
  if (first === undefined || first.k !== "rec" || !ms.every((m) => m.k === "rec")) return null;
  for (const [key, ks, opt] of first.props) {
    if (opt || ks.k !== "lit") continue;
    const by = tagTable(ms, key);
    if (by !== null) return { key, by };
  }
  return null;
};
// the kinds of value a shape could take, as bits: 1 a record, 2 an array, 4 a primitive. wide: a shape that throws
// other than a mismatch (a function, a ref with no definition) counts as taking every kind
export const memberKinds = () => (s0: Shape, defs: Map<string, Shape> | null, wide: boolean): number => {
  const met: Mut<Set<string>> = new Set();
  function go(s: Shape): number {
    switch (s.k) {
      case "rec": return 1;
      case "arr": case "tup": return 2;
      case "unknown": return 7;
      case "union": { let a = 0; for (const m of s.ts) a = a | go(m); return a; }
      case "defs": return go(s.body);
      case "ref": { const d = defs === null ? undefined : defs.get(s.n); if (d === undefined) return wide ? 7 : 0; if (met.has(s.n)) return 0; met.add(s.n); return go(d); }
      case "fn": return wide ? 7 : 4;
      default: return 4;
    }
  }
  return go(s0);
};
// per member, the kinds of value it could take. A member that cannot take a primitive fails on one with a mismatch at
// the union's place, so it is not tried; an object or array is still tried, as the mismatch reads it and a getter
// there may throw
export const memberTakes = (memberKinds) => (s: UnionShape, defs: Map<string, Shape> | null): readonly number[] => s.ts.map((m) => memberKinds(m, defs, true));
// for a record, an array and a primitive, the index of the one member that could take a value of that kind, else -1
export const soleMembers = (memberKinds) => (s: UnionShape, defs: Map<string, Shape> | null): readonly number[] => {
  const ks = s.ts.map((m) => memberKinds(m, defs, false));
  return [1, 2, 4].map((bit) => { const at = ks.flatMap((k, i) => ((k & bit) !== 0 ? [i] : [])); return at.length === 1 ? at[0] ?? -1 : -1; });
};
// member i failed with a mismatch at ePath: that mismatch is the union's when it is below the union's place and the
// member was the only one that could take the value (the tag named it, or it alone takes the value's kind)
export const isSoleMiss = () => (ePath: string, path: string, tagged: boolean, sole: number, i: number): boolean => ePath !== path && (tagged || sole === i);
// what a function wrapper checks on each call
export const fnPlan = () => (name: string, s: FnShape): FnPlan => ({ args: s.ps.map((shape, i) => ({ shape, path: `${name} argument ${i + 1}` })), result: `${name}(...)` });
// a throw from the function, or while its result is read: what stands for it
export const thrownText = () => (name: string, what: string, m: string): string => `${name}(...)${what}: ${m}`;
// a value fits a primitive's shape (num, str, bool, null, undef, lit); null for a shape that is not a primitive's
export const primFits = () => (s: Shape, v: unknown): boolean | null => {
  switch (s.k) {
    case "num": return typeof v === "number";
    case "str": return typeof v === "string";
    case "bool": return typeof v === "boolean";
    case "null": return v === null;
    case "undef": return v === undefined;
    case "lit": return Object.is(v, s.v);
    default: return null;
  }
};
// a property the record shape declares: skipped when optional and absent or undefined, missing when required and absent,
// else checked (a required property that holds undefined is checked as undefined)
export const propStep = () => (has: boolean, undef: boolean, opt: boolean): "skip" | "missing" | "check" => (has && !undef ? "check" : opt ? "skip" : has ? "check" : "missing");
// the shape element i of an array is checked against: an array's element shape, a tuple's i-th, data under unknown
export const elemShape = () => (s: Shape, i: number): Shape => (s.k === "arr" ? s.el : s.k === "tup" ? s.els[i] ?? s : s);
// union member i is tried on a primitive only when it could take one (takes: memberTakes's bits, null for an object or
// an array, on which every member is tried)
export const triesMember = () => (takes: readonly number[] | null, i: number): boolean => takes === null || ((takes[i] ?? 0) & 4) !== 0;
// a union no member took: the mismatch of the one member that could take the value, else under a recursive shape the
// cycle a member met, else the union's own mismatch
export const unionMiss = () => (sole: boolean, recursive: boolean, cycle: boolean): "sole" | "cycle" | "union" => (sole ? "sole" : recursive && cycle ? "cycle" : "union");
