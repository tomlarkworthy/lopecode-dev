// The shape of a parameter's type annotation, which the runtime checks a value from another language against, or why
// the annotation cannot be checked at the boundary, as SoundScript cells. The error is tagged k: "error"; boundary.ts
// gives core.ts { error }. expand resolves an alias or interface and isAlias says whether a name is one (the
// Registry's). Under bun, shape-ss.ts links these cells with types.ss.ts's show and subst; in the notebook they are
// compiled cells of @tomlarkworthy/soundscript-checker.

// runtime.ss.ts's Shape, declared again: the notebook checks a module's SoundScript cells with that module's type
// declarations only, and Shape is the runtime module's (shape.test.ts compares the two)
export type TypeShape =
  | { k: "num" } | { k: "str" } | { k: "bool" } | { k: "null" } | { k: "undef" } | { k: "unknown" }
  | { k: "lit"; v: string | number | boolean }
  | { k: "arr"; el: TypeShape }
  | { k: "tup"; els: TypeShape[] }
  | { k: "rec"; props: [string, TypeShape, boolean][] }
  | { k: "union"; ts: TypeShape[] }
  | { k: "ref"; n: string }
  | { k: "defs"; defs: [string, TypeShape][]; body: TypeShape }
  | { k: "fn"; ps: TypeShape[]; ret: TypeShape; async: boolean };
export type ShapeErr = { readonly k: "error"; readonly error: string };
export type ShapeOr = TypeShape | ShapeErr;
export type Expansion = { readonly expand: (t: Ty) => Ty; readonly isAlias: (n: string) => boolean };
// one expansion of an annotation, at most limit deep. open and rec hold tyKey keys: the aliases being expanded, and those
// met again inside themselves; defs: the definition of each recursive alias by its ref's name; names: per key, that
// name (show's, unique)
export type ShapeCtx = Mut<{ open: readonly string[]; rec: Set<string>; defs: Map<string, TypeShape>; names: Map<string, string>; limit: number }>;
// t as a shape, d deep
export type ShapeSub = (t: Ty, d: number, ctx: ShapeCtx) => ShapeOr;

// the text of t with each part given as c gives it
export const tyText = () => (t: Ty, c: (x: Ty | undefined) => string): string => {
  const cs = (xs: readonly Ty[] | undefined): string => (xs ?? []).map(c).join(",");
  const q = (n: string): string => JSON.stringify(n);
  switch (t.k) {
    case "lit": return `lit ${typeof t.v} ${typeof t.v === "string" ? q(t.v) : Object.is(t.v, -0) ? "-0" : String(t.v)}`;
    case "arr": return `arr ${c(t.el)}`;
    case "tup": return `tup ${cs(t.els)}`;
    case "union": return `union ${cs(t.ts)}`;
    case "named": return `named ${q(t.n)} ${cs(t.args)}`;
    case "tv": return `tv ${q(t.n)}`;
    case "fn": return `fn ${q(t.tps.join(","))} ${t.ps.map((p) => `${q(p.n)}${p.opt ? "?" : ""}:${c(p.t)}`).join(",")} ...${c(t.rest)} => ${c(t.ret)}`;
    case "rec": return `rec ${[...t.props].map(([n, p]) => `${q(n)}${p.opt ? "?" : ""}:${c(p.t)}`).join(",")} [${c(t.index)}] (${cs(t.calls)}) new(${cs(t.ctors)})`;
    default: return t.k;
  }
};
// a text for t that two types share only when they are the same type (show shortens a deep type with …); each part in
// parentheses, so the text reads one way
export const tyKey = (tyText) => (t: Ty): string => {
  function key(x: Ty | undefined): string {
    return x ? `(${tyText(x, key)})` : "";
  }
  return key(t);
};
export const refName = (show) => (t: Ty, key: string, ctx: ShapeCtx): string => {
  const hit = ctx.names.get(key);
  if (hit !== undefined) return hit;
  const base = show(t), taken = [...ctx.names.values()];
  let n = base;
  for (let i = 2; taken.includes(n); i++) n = `${base} (${i})`;
  ctx.names = new Map([...ctx.names, [key, n]]);
  return n;
};
// a generic alias expanded over placeholders, then given its arguments: expand keeps one expansion per name as show
// prints it, and show shortens a deep argument, so two deep arguments would share one
export const expandFull = (subst) => (t: Named, expand: (t: Ty) => Ty): Ty => {
  if (!t.args.length) return expand(t);
  const ps = t.args.map((_, i) => ` ${i}`);
  return subst(expand({ k: "named", n: t.n, args: ps.map((n) => ({ k: "tv", n })) }), new Map(t.args.map((a, i) => [` ${i}`, a])));
};
// the definition of n reaches n through unions and refs alone, so no finite value is checked against it
export const unproductive = () => (n: string, defs: Map<string, TypeShape>): boolean => {
  const met: Mut<Set<string>> = new Set();
  function go(s: TypeShape): boolean {
    if (s.k === "union") { for (const m of s.ts) if (go(m)) return true; return false; }
    if (s.k !== "ref") return false;
    if (s.n === n) return true;
    if (met.has(s.n)) return false;
    met.add(s.n);
    const d = defs.get(s.n);
    return d !== undefined && go(d);
  }
  const d = defs.get(n);
  return d !== undefined && go(d);
};

// true | false is boolean
export const boolUnion = () => (ts: readonly TypeShape[]): TypeShape => {
  const isBool = (s: TypeShape): boolean => s.k === "lit" && typeof s.v === "boolean";
  return ts.filter(isBool).length === 2 ? { k: "union", ts: [...ts.filter((s) => !isBool(s)), { k: "bool" }] } : { k: "union", ts: [...ts] };
};
// each of xs as a shape, d deep, or the first error
export const shapesOf = () => (xs: readonly Ty[], sub: ShapeSub, d: number, ctx: ShapeCtx): { readonly k: "many"; readonly shapes: TypeShape[] } | ShapeErr => {
  const out: Mut<TypeShape[]> = [];
  for (const x of xs) { const s = sub(x, d, ctx); if (s.k === "error") return s; out.push(s); }
  return { k: "many", shapes: out };
};
export const recShape = () => (t: Rec, sub: ShapeSub, d: number, ctx: ShapeCtx): ShapeOr => {
  if (t.calls?.length || t.ctors?.length) return { k: "error", error: "a function" };
  if (t.index) return { k: "error", error: "an index signature" };
  const props: Mut<[string, TypeShape, boolean][]> = [];
  for (const [n, p] of t.props) { const s = sub(p.t, d, ctx); if (s.k === "error") return { k: "error", error: `${n}: ${s.error}` }; props.push([n, s, p.opt]); }
  return { k: "rec", props: props };
};
// an alias met again while it is being expanded is a ref, and the shape of the whole annotation lists the definition of
// each such alias once (defs); an alias that is not recursive is expanded in place
export const aliasShape = (tyKey, refName, expandFull) => (t: Named, sub: ShapeSub, d: number, X: Expansion, ctx: ShapeCtx): ShapeOr => {
  const key = tyKey(t);
  if (ctx.open.includes(key) || ctx.defs.has(ctx.names.get(key) ?? "")) { ctx.rec = new Set([...ctx.rec, key]); return { k: "ref", n: refName(t, key, ctx) }; }
  ctx.open = [...ctx.open, key];
  const s = sub(expandFull(t, X.expand), d, ctx);
  ctx.open = ctx.open.slice(0, -1);
  if (s.k === "error" || !ctx.rec.has(key)) return s;
  const n = refName(t, key, ctx);
  ctx.defs = new Map([...ctx.defs, [n, s]]);
  return { k: "ref", n };
};
export const namedShape = (show, aliasShape) => (t: Named, sub: ShapeSub, d: number, X: Expansion, ctx: ShapeCtx): ShapeOr => {
  if (t.n === "Promise") return { k: "error", error: "a promise" };
  if (X.isAlias(t.n)) return aliasShape(t, sub, d, X, ctx);
  const el = t.args[0];
  if ((t.n === "Array" || t.n === "ReadonlyArray") && el !== undefined) { const s = sub(el, d, ctx); return s.k === "error" ? s : { k: "arr", el: s }; }
  return { k: "error", error: `${show(t)}, which the boundary does not check` };
};
// t as a shape within one expansion, depth deep
export const shapeIn = (show, shapesOf, boolUnion, recShape, namedShape) => (t0: Ty, X: Expansion, ctx: ShapeCtx): ShapeOr => {
  function go(t: Ty, depth: number, c: ShapeCtx): ShapeOr {
    // a generic alias whose arguments grow at each level never repeats
    if (depth > c.limit) return { k: "error", error: "a recursive type" };
    const d = depth + 1;
    switch (t.k) {
      case "num": return { k: "num" };
      case "str": return { k: "str" };
      case "null": return { k: "null" };
      case "undef": case "void": return { k: "undef" };
      case "unknown": return { k: "unknown" };
      case "lit": return { k: "lit", v: t.v };
      case "fn": return { k: "error", error: "a function" };
      case "arr": { const el = go(t.el, d, c); return el.k === "error" ? el : { k: "arr", el }; }
      case "tup": { const els = shapesOf(t.els, go, d, c); return els.k === "error" ? els : { k: "tup", els: els.shapes }; }
      case "union": { const ts = shapesOf(t.ts, go, d, c); return ts.k === "error" ? ts : boolUnion(ts.shapes); }
      case "rec": return recShape(t, go, d, c);
      case "named": return namedShape(t, go, d, X, c);
      default: return { k: "error", error: `${show(t)}, which the boundary does not check` };
    }
  }
  return go(t0, 0, ctx);
};
// the body with the definitions of its refs, unless one of them is unproductive
export const withDefs = (unproductive) => (body: ShapeOr, defs: Map<string, TypeShape>): ShapeOr => {
  if (body.k === "error" || !defs.size) return body;
  const bad = [...defs.keys()].find((n) => unproductive(n, defs));
  if (bad !== undefined) return { k: "error", error: `${bad}, a recursive type with no object or array between it and itself` };
  return { k: "defs", defs: [...defs], body };
};
// The shape of an annotation. A type nested deeper than 16 is refused unless it is recursive; a recursive one is expanded
// again up to 256, as a ring of aliases closes only after each is open
export const shapeAt = (shapeIn, withDefs) => (t: Ty, X: Expansion): ShapeOr => {
  const near: ShapeCtx = { open: [], rec: new Set(), defs: new Map(), names: new Map(), limit: 16 };
  const first = shapeIn(t, X, near);
  if (first.k !== "error") return withDefs(first, near.defs);
  const far: ShapeCtx = { open: [], rec: new Set(), defs: new Map(), names: new Map(), limit: 256 };
  const again = shapeIn(t, X, far);
  return far.rec.size ? withDefs(again, far.defs) : first;
};
// a function's shape: no type parameters and no rest parameter; its parameters and its result, or the T of a Promise<T>
// result, must cross
export const fnShape = (shapeAt) => (f: Fn, X: Expansion): ShapeOr => {
  if (f.tps.length || f.rest) return { k: "error", error: "a function with type parameters or a rest parameter" };
  const part = (x: Ty, what: string): ShapeOr => { const s = shapeAt(x, X); return s.k === "error" ? { k: "error", error: `a function whose ${what} is or holds ${s.error}` } : s; };
  const ps: Mut<TypeShape[]> = [];
  for (const [i, p] of f.ps.entries()) { const s = part(p.t, `parameter ${p.n !== "" ? p.n : String(i + 1)}`); if (s.k === "error") return s; ps.push(p.opt ? { k: "union", ts: [s, { k: "undef" }] } : s); }
  const ret = f.ret.k === "named" && f.ret.n === "Promise" ? f.ret.args[0] : undefined;
  const r = part(ret ?? f.ret, "result");
  return r.k === "error" ? r : { k: "fn", ps: ps, ret: r, async: ret !== undefined };
};
// The shape of a parameter's annotation. fnOk (not under State): a function type may be the whole annotation
export const boundaryShapeAt = (shapeAt, fnShape) => (t: Ty, X: Expansion, fnOk: boolean): ShapeOr => {
  let f = t;
  for (let i = 0; i < 16 && f.k === "named" && X.isAlias(f.n); i++) f = X.expand(f);
  return fnOk && f.k === "fn" ? fnShape(f, X) : shapeAt(t, X);
};
