// Port attempt (2026-11-20): jsx/h.ts and the parts of jsx/render.ts the runtime module holds.
// bun selfhost/rt/check.ts selfhost/rt/jsx.ss.ts --home @tomlarkworthy/soundscript-runtime (d1: its cells may take prelude names)
type Elem = { readonly tag: string; readonly props: Readonly<Record<string, unknown>>; readonly children: readonly unknown[] };
type Ptr = { readonly x: number; readonly y: number; readonly t: number; readonly id: number; readonly buttons: number };
type PointerLike = { readonly offsetX?: number; readonly clientX?: number; readonly offsetY?: number; readonly clientY?: number; readonly timeStamp?: number; readonly pointerId?: number; readonly buttons?: number };

export const flat = () => {
  const f = (xs: readonly unknown[]): unknown[] =>
    xs.flatMap((x) => (Array.isArray(x) ? f(x) : x === null || x === undefined || x === false || x === true ? [] : [x]));
  return f;
};
export const h = (flat: (xs: readonly unknown[]) => unknown[]) =>
  (tag: string | null | ((p: object) => Elem), props: Record<string, unknown> | null, ...children: unknown[]): Elem => {
    if (tag === null) return Object.freeze({ tag: "", props: Object.freeze({}), children: Object.freeze(flat(children)) });
    if (typeof tag === "function") return tag(children.length ? { ...props, children } : { ...props });
    return Object.freeze({ tag, props: Object.freeze({ ...props }), children: Object.freeze(flat(children)) });
  };
// the same values, frozen only by the type: SoundScript has no Object.freeze, and its values are immutable to checked code
export const hTyped = (flat: (xs: readonly unknown[]) => unknown[]) =>
  (tag: string | null | ((p: Record<string, unknown>) => Elem), props: Record<string, unknown> | null, ...children: unknown[]): Elem => {
    if (tag === null) return { tag: "", props: {}, children: flat(children) };
    if (typeof tag === "function") return tag(children.length ? { ...props, children } : { ...props });
    return { tag, props: { ...props }, children: flat(children) };
  };
export const ptr = () => (e: PointerLike): Ptr => ({ x: e.offsetX ?? e.clientX ?? 0, y: e.offsetY ?? e.clientY ?? 0, t: e.timeStamp ?? 0, id: e.pointerId ?? 0, buttons: e.buttons ?? 0 });
export const DOM_EVENTS = (ptr: (e: PointerLike) => Ptr) => (): Record<string, readonly [string, (e: PointerLike, node: { readonly value?: unknown }) => readonly unknown[]]> => ({
  onClick: ["click", () => []],
  onInput: ["input", (_e: PointerLike, node: { readonly value?: unknown }) => [String(node.value)]],
  onPointerDown: ["pointerdown", (e: PointerLike) => [ptr(e)]],
  onPointerMove: ["pointermove", (e: PointerLike) => [ptr(e)]],
  onPointerUp: ["pointerup", (e: PointerLike) => [ptr(e)]],
  onPointerCancel: ["pointercancel", (e: PointerLike) => [ptr(e)]],
});
export const PROPS = () => new Set(["value", "checked", "disabled"]);
export const isElem = () => (x: unknown): boolean => typeof x === "object" && x !== null && "tag" in x;
export const create = (isElem: (x: unknown) => boolean) => (doc: Document, x: unknown): Node => {
  if (!isElem(x)) return doc.createTextNode(String(x));
  const node = doc.createElement("span");
  return node;
};
export const patch = (isElem: (x: unknown) => boolean) => (node: HTMLElement, x: Elem): void => {
  for (const [k, v] of Object.entries(x.props)) node.setAttribute(k, String(v));
};
