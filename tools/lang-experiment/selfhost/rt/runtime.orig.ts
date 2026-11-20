// The TypeScript originals of the cells moved to lite/runtime.ss.ts, copied from selfhost/rt/orig/*.orig.ts
// (2026-11-20) without their module state, for selfhost/rt/diff.ts. orderOf is cells.ts's body with s.order,
// s.listeners and the module's placeOf and ordered made arguments; its lines are otherwise unchanged.
export type Shape =
  | { k: "num" } | { k: "str" } | { k: "bool" } | { k: "null" } | { k: "undef" } | { k: "unknown" }
  | { k: "lit"; v: string | number | boolean }
  | { k: "arr"; el: Shape }
  | { k: "tup"; els: Shape[] }
  | { k: "rec"; props: [string, Shape, boolean][] }
  | { k: "union"; ts: Shape[] };
type Elem = { readonly tag: string; readonly props: Readonly<Record<string, unknown>>; readonly children: readonly unknown[] };

// prelude.runtime.ts
export const newStore = (name: string, value: unknown) => ({ name, value });
export const thenable = (r: unknown): r is PromiseLike<unknown> => typeof (r as { then?: unknown } | null)?.then === "function";
export const mut = <T>(v: T) => v;
export const freeze = <T>(v: T) => v;
export const borrow = <T>(v: T) => v;
// boundary.ts
export const want = (s: Shape): string => {
  switch (s.k) {
    case "num": return "number"; case "str": return "string"; case "bool": return "boolean";
    case "null": return "null"; case "undef": return "undefined"; case "unknown": return "data";
    case "lit": return JSON.stringify(s.v);
    case "arr": return "an array"; case "tup": return `an array of ${s.els.length}`;
    case "rec": return "an object";
    case "union": return s.ts.map(want).join(" or ");
  }
};
// jsx/h.ts
export const flat = (xs: unknown[]): unknown[] =>
  xs.flatMap((x) => (Array.isArray(x) ? flat(x) : x === null || x === undefined || x === false || x === true ? [] : [x]));
// jsx/render.ts
export const DOM_EVENTS: Record<string, [string, (e: any, node: any) => unknown[]]> = {
  onClick: ["click", () => []],
  onInput: ["input", (_e, node) => [String(node.value)]],
  onPointerDown: ["pointerdown", (e) => [ptr(e)]],
  onPointerMove: ["pointermove", (e) => [ptr(e)]],
  onPointerUp: ["pointerup", (e) => [ptr(e)]],
  onPointerCancel: ["pointercancel", (e) => [ptr(e)]],
};
export const ptr = (e: any) => Object.freeze({ x: e.offsetX ?? e.clientX ?? 0, y: e.offsetY ?? e.clientY ?? 0, t: e.timeStamp ?? 0, id: e.pointerId ?? 0, buttons: e.buttons ?? 0 });
export const PROPS = new Set(["value", "checked", "disabled"]);
export const isElem = (x: unknown): x is Elem => !!x && typeof x === "object" && "tag" in (x as object);
// browser/cells.ts
export const same = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
type Place = readonly [string, number] | null;
export function orderOf<L>(st: { order: L[] | null; listeners: Set<L> }, h: unknown, placeOf: ((values: unknown[]) => Place[]) | null, ordered: Set<unknown>): L[] {
  if (st.order) return st.order;
  const list = [...st.listeners];
  if (!placeOf || list.length < 2) return list;
  const [own, ...at] = placeOf([h, ...list]);
  const key = (p: Place) => (p ? [own && p[0] === own[0] ? 0 : 1, p[0], p[1]] as const : null);
  const keyed = list.map((l, i) => ({ l, i, k: key(at[i]) }));
  keyed.sort((a, b) => {
    if (!a.k || !b.k) return a.k ? -1 : b.k ? 1 : a.i - b.i;
    return a.k[0] - b.k[0] || (a.k[1] < b.k[1] ? -1 : a.k[1] > b.k[1] ? 1 : 0) || a.k[2] - b.k[2] || a.i - b.i;
  });
  const out = keyed.map((x) => x.l);
  if (own && keyed.every((x) => x.k)) { st.order = out; ordered.add(st); }
  return out;
}
// stdlib/runtime.ts
export function rejected(name: string, why: string[]): never {
  throw new Error(`${name} does not check: ${why.join("; ")}`);
}
export const compileFor = (c: any, caller: string, refs: Record<string, unknown>) => {
  if (!c || typeof c.for !== "function") throw new Error(`${caller} takes compile, and this module defines no ss_compile = ss.compiler(...)`);
  return c.for(caller, refs);
};
// boundary.ts (2026-11-20, current file)
export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};
