// Runtime cells written in SoundScript: the declarations of the runtime module that check as SoundScript, with
// events.ss.ts and store.ss.ts. A cell that uses a built-in takes the runtime module's own cell of that name
// (ss-toolchain inputsIn(true)); none here does, the cells of events.ss.ts and store.ss.ts take mut and freeze.
// Under bun, runtime-ss.ts links them; in the notebook they are compiled cells of
// @tomlarkworthy/soundscript-runtime, which its JavaScript cells take as inputs. selfhost/NOTES-runtime-port.md

export type Shape =
  | { k: "num" } | { k: "str" } | { k: "bool" } | { k: "null" } | { k: "undef" } | { k: "unknown" }
  | { k: "lit"; v: string | number | boolean }
  | { k: "arr"; el: Shape }
  | { k: "tup"; els: Shape[] }
  | { k: "rec"; props: [string, Shape, boolean][] }
  | { k: "union"; ts: Shape[] }
  // a recursive alias: a ref names its definition, and defs, at the top of a shape, lists each definition once
  | { k: "ref"; n: string }
  | { k: "defs"; defs: [string, Shape][]; body: Shape }
  // a function from another language, only as the whole of a parameter's shape: its parameters' shapes and its result's
  | { k: "fn"; ps: Shape[]; ret: Shape; async: boolean };
export type PointerLike = { readonly offsetX?: number; readonly clientX?: number; readonly offsetY?: number; readonly clientY?: number; readonly timeStamp?: number; readonly pointerId?: number; readonly buttons?: number };
export type Ptr = { readonly x: number; readonly y: number; readonly t: number; readonly id: number; readonly buttons: number };
export type Place = readonly [string, number] | null;
export type Compiler = { for(caller: string, refs: { readonly [k: string]: unknown }): unknown };
export type Data = null | undefined | boolean | number | string | bigint | symbol | readonly Data[] | { readonly [k: string]: Data };

// the ownership built-ins, which the checker gives their meaning: at run time mut returns its argument; freeze (a deep
// freeze) and borrow (which marks a lent value so a yield does not freeze it) are unchecked cells of ./freeze.ts
export const mut = () => <T,>(v: T): T => v;
// what a value of a shape is, for a mismatch message (boundary.ts copy)
export const want = () => {
  const w = (s: Shape): string => {
    switch (s.k) {
      case "num": return "number"; case "str": return "string"; case "bool": return "boolean";
      case "null": return "null"; case "undef": return "undefined"; case "unknown": return "data";
      case "lit": return JSON.stringify(s.v);
      case "arr": return "an array"; case "tup": return `an array of ${s.els.length}`;
      // a9 (2026-11-23): a record names its first members, so two members of a union read apart
      case "rec": {
        const inner = (x: Shape): string => (x.k === "rec" ? "{…}" : x.k === "union" ? x.ts.map(inner).join(" | ") : w(x));
        return s.props.length === 0 ? "an object" : `an object { ${s.props.slice(0, 4).map(([k, p, o]) => `${k}${o ? "?" : ""}: ${inner(p)}`).join(", ")}${s.props.length > 4 ? ", …" : ""} }`;
      }
      case "union": return s.ts.map(w).join(" or ");
      case "ref": return s.n;
      case "defs": return w(s.body);
      case "fn": return "a function";
    }
  };
  return w;
};
// two copies the boundary made are equal: the same own keys, and equal values under each (boundary.ts cross)
export const deepEqual = () => {
  const eq = (a: Data, b: Data): boolean => {
    if (Object.is(a, b)) return true;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
    const ka = Object.keys(a), kb = new Set(Object.keys(b));
    if (ka.length !== kb.size || !ka.every((k) => kb.has(k))) return false;
    if (Array.isArray(a)) return Array.isArray(b) && ka.every((k) => eq(a[Number(k)], b[Number(k)]));
    // d1 (2026-11-24): own entries through a Map, since a run-time key on a record may name an inherited member
    if (Array.isArray(b)) return false;
    const mb = new Map(Object.entries(b));
    return Object.entries(a).every(([k, v]) => mb.has(k) && eq(v, mb.get(k)));
  };
  return eq;
};
// JSX children flattened: nested arrays spread, null, undefined and booleans dropped (jsx/h.ts)
export const flat = () => {
  const f = (xs: readonly unknown[]): unknown[] =>
    xs.flatMap((x) => (Array.isArray(x) ? f(x) : x === null || x === undefined || x === false || x === true ? [] : [x]));
  return f;
};
// a pointer event as data (jsx/render.ts)
export const ptr = () => (e: PointerLike): Ptr => Object.freeze({ x: e.offsetX ?? e.clientX ?? 0, y: e.offsetY ?? e.clientY ?? 0, t: e.timeStamp ?? 0, id: e.pointerId ?? 0, buttons: e.buttons ?? 0 });
// each event prop: the DOM event and the arguments its action is called with
export const DOM_EVENTS = (ptr: (e: PointerLike) => Ptr): { readonly [k: string]: readonly [string, (e: PointerLike, node: { readonly value?: unknown }) => readonly unknown[]] } => ({
  onClick: ["click", () => []],
  onInput: ["input", (_e: PointerLike, node: { readonly value?: unknown }) => [String(node.value)]],
  onPointerDown: ["pointerdown", (e: PointerLike) => [ptr(e)]],
  onPointerMove: ["pointermove", (e: PointerLike) => [ptr(e)]],
  onPointerUp: ["pointerup", (e: PointerLike) => [ptr(e)]],
  onPointerCancel: ["pointercancel", (e: PointerLike) => [ptr(e)]],
});
// props set as DOM properties, not attributes
export const PROPS = () => new Set(["value", "checked", "disabled"]);
// runtime-ss.ts gives this its TypeScript type, the predicate x is Elem; a SoundScript type has no predicates
export const isElem = () => (x: unknown): boolean => typeof x === "object" && x !== null && "tag" in x;
// The listeners of one events cell in the order they run, from the places the host
// gives: places[0] is the events cell's, places[i + 1] list[i]'s. complete: every listener is placed, so the
// order may be kept until the cells change.
export const orderKeyed = () => <L,>(list: readonly L[], places: readonly Place[]): { out: L[]; complete: boolean } => {
  const own = places[0] ?? null;
  const key = (p: Place): readonly [number, string, number] | null => (p === null ? null : [own !== null && p[0] === own[0] ? 0 : 1, p[0], p[1]]);
  const keyed = list.map((l, i) => ({ l, i, k: key(places[i + 1] ?? null) }));
  const sorted = keyed.toSorted((a, b) => {
    const ak = a.k, bk = b.k;
    if (ak === null || bk === null) return ak !== null ? -1 : bk !== null ? 1 : a.i - b.i;
    return ak[0] - bk[0] || (ak[1] < bk[1] ? -1 : ak[1] > bk[1] ? 1 : 0) || ak[2] - bk[2] || a.i - b.i;
  });
  return { out: sorted.map((x) => x.l), complete: own !== null && keyed.every((x) => x.k !== null) };
};
// The body of a cell the checker did not accept: it raises the checker's messages and runs nothing else.
export const rejected = () => (name: string, why: readonly string[]): never => {
  throw new Error(`${name} does not check: ${why.join("; ")}`);
};
// compile for the calling cell, from the module's ss_compile (stdlib/runtime.ts compiler)
export const compileFor = () => (c: Compiler | null | undefined, caller: string, refs: { readonly [k: string]: unknown }): unknown => {
  if (c === null || c === undefined || typeof c.for !== "function") throw new Error(`${caller} takes compile, and this module defines no ss_compile = ss.compiler(...)`);
  return c.for(caller, refs);
};
