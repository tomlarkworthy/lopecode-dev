// Runtime half of JSX in checked cells: h builds a frozen element value, and a component is called
// at once, so a cell's value is a tree of plain elements.
import { flat } from "../runtime-ss.ts";
export type Elem = { readonly tag: string; readonly props: Readonly<Record<string, unknown>>; readonly children: readonly unknown[] };

export function h(tag: string | null | ((p: object) => Elem), props: Record<string, unknown> | null, ...children: unknown[]): Elem {
  if (tag === null) return Object.freeze({ tag: "", props: Object.freeze({}), children: Object.freeze(flat(children)) }); // a fragment
  if (typeof tag === "function") return tag(children.length ? { ...props, children } : { ...props });
  return Object.freeze({ tag, props: Object.freeze({ ...props }), children: Object.freeze(flat(children)) });
}
