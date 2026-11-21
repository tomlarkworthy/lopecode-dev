// Prototype (2026-11-21): shapeOf of lite/boundary.ts as SoundScript cells. Checked with runtime.ss.ts (Shape) and
// types.ss.ts (Ty, show). expand and isAlias stay arguments, as in the original (core.ts passes the Registry's).
export type ShapeOr = Shape | { readonly error: string };

// true | false at the boundary is boolean
export const boolUnion = () => (ts: readonly Shape[]): Shape => {
  const isBool = (s: Shape): boolean => s.k === "lit" && typeof s.v === "boolean";
  return ts.filter(isBool).length === 2 ? { k: "union", ts: [...ts.filter((s) => !isBool(s)), { k: "bool" }] } : { k: "union", ts: [...ts] };
};
// each of xs as a shape, or the first error
export const shapesOf = () => (xs: readonly Ty[], sub: (t: Ty) => ShapeOr): Shape[] | { readonly error: string } => {
  const out: Mut<Shape[]> = mut([]);
  for (const x of xs) { const s = sub(x); if ("error" in s) return s; out.push(s); }
  return freeze(out);
};
export const recShape = (shapesOf) => (t: Rec, sub: (t: Ty) => ShapeOr): ShapeOr => {
  if (t.calls?.length || t.ctors?.length) return { error: "a function" };
  if (t.index) return { error: "an index signature" };
  const props: Mut<[string, Shape, boolean][]> = mut([]);
  for (const [n, p] of t.props) { const s = sub(p.t); if ("error" in s) return { error: `${n}: ${s.error}` }; props.push([n, s, p.opt]); }
  return { k: "rec", props: freeze(props) };
};
export const namedShape = (show) => (t: Named, sub: (t: Ty) => ShapeOr, expand: (t: Ty) => Ty, isAlias: (n: string) => boolean): ShapeOr => {
  if (t.n === "Promise") return { error: "a promise" };
  if (isAlias(t.n)) return sub(expand(t));
  const el = t.args[0];
  if ((t.n === "Array" || t.n === "ReadonlyArray") && el !== undefined) { const s = sub(el); return "error" in s ? s : { k: "arr", el: s }; }
  return { error: `${show(t)}, which the boundary does not check` };
};
// The shape of an annotation, or why it cannot be checked at the boundary
export const shapeOf = (show, boolUnion, shapesOf, recShape, namedShape) => (t0: Ty, expand: (t: Ty) => Ty, isAlias: (n: string) => boolean): ShapeOr => {
  const go = (t: Ty, depth: number): ShapeOr => {
    if (depth > 16) return { error: "a recursive type" };
    const sub = (x: Ty): ShapeOr => go(x, depth + 1);
    switch (t.k) {
      case "num": case "str": case "null": case "unknown": return { k: t.k };
      case "undef": case "void": return { k: "undef" };
      case "lit": return { k: "lit", v: t.v };
      case "fn": return { error: "a function" };
      case "arr": { const el = sub(t.el); return "error" in el ? el : { k: "arr", el }; }
      case "tup": { const els = shapesOf(t.els, sub); return "error" in els ? els : { k: "tup", els }; }
      case "union": { const ts = shapesOf(t.ts, sub); return "error" in ts ? ts : boolUnion(ts); }
      case "rec": return recShape(t, sub);
      case "named": return namedShape(t, sub, expand, isAlias);
      default: return { error: `${show(t)}, which the boundary does not check` };
    }
  };
  return go(t0, 0);
};
