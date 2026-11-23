// Runtime half of JSX in checked cells: h builds a frozen element value, and a component is called
// at once, so a cell's value is a tree of plain elements.
import { flat } from "../runtime-ss.ts";
export type Elem = { readonly tag: string; readonly props: Readonly<Record<string, unknown>>; readonly children: readonly unknown[] };

// the elements h made: the renderer draws only these, so a record shaped like one is drawn as text
const elementsMade = new WeakSet<object>();
export const isElement = (x: unknown): x is Elem => typeof x === "object" && x !== null && elementsMade.has(x);
const madeByH = (e: Elem): Elem => { elementsMade.add(e); return e; };

export function h(tag: string | null | ((p: object) => Elem), props: Record<string, unknown> | null, ...children: unknown[]): Elem {
  if (tag === null) return madeByH(Object.freeze({ tag: "", props: Object.freeze({}), children: Object.freeze(flat(children)) })); // a fragment
  // a9 (2026-11-23), B-1: key is the renderer's, as in React; a component is not given it (the checker rejects props that declare key)
  if (typeof tag === "function") { const { key: _key, ...given } = props ?? {}; return tag(children.length ? { ...given, children } : given); }
  return madeByH(Object.freeze({ tag, props: Object.freeze({ ...props }), children: Object.freeze(flat(children)) }));
}
