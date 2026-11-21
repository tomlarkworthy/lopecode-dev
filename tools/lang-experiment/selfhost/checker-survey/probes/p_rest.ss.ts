// uses: ast, types
// Registry.convert (full body, a switch visitor over type nodes), boundary.ts shapeOf (full body),
// comment-types.ts commentTypes (full body) and cutsOf / completionsAt / link (reduced).
export type Origin = "intrinsic" | "prelude" | "jsx" | "foreign" | "user";
export type Decl = { kind: "alias" | "iface"; tps: string[]; nodes: Node[]; origin: Origin; parsed: Parsed };
export type TypeCtx = { tps: Set<string>; typeofLookup?: (name: string, node: Node) => Ty | undefined };
export type Diag = { node: Node; rule: string; msg: string };
export const KEYWORDS = (NUM, STR, BOOL, ERR) => new Map<string, Ty>([["TSNumberKeyword", NUM], ["TSStringKeyword", STR], ["TSBooleanKeyword", BOOL], ["TSAnyKeyword", ERR]]);
export const ONE_ARG = () => new Set(["State", "StateCell", "Events", "Mut", "Borrowed"]);
// convert: onUnsup/onErr were hooks the Checker set on the shared registry; here they are local writers of the cell's
// diagnostics, and convert, sigOf, literal, expand are local functions of one cell (sigOf, literal, expand stubs).
// `.map(c)` with c writing diagnostics becomes a loop.
export const convertCell = (KEYWORDS, ONE_ARG, WRAPPERS, union, arr, named, isNamed, ERR, UNKNOWN) => (types: Map<string, Decl>) => (n0: Node, ctx: TypeCtx, p: Parsed): { t: Ty; diags: Diag[] } => {
  const diags: Mut<Diag[]> = mut([]);
  function onUnsup(n: Node, what: string): void { diags.push({ node: n, rule: "unsupported", msg: what }); }
  function onErr(n: Node, rule: string, msg: string): void { diags.push({ node: n, rule, msg }); }
  function sigOf(n: Node): Ty { return ERR; } // stub
  function literal(ms: Node[]): Ty { return ERR; } // stub
  function expand(t: Ty): Ty { return t; } // stub
  function all(xs: Node[]): Ty[] { const out: Mut<Ty[]> = mut([]); for (const x of xs) out.push(convert(x)); return freeze(out); }
  function convert(n: Node): Ty {
    const kw = KEYWORDS.get(n.type);
    if (kw) return kw;
    switch (n.type) {
      case "TSParenthesizedType": return convert(n.typeAnnotation);
      case "TSLiteralType": {
        const l = n.literal;
        if (l.type === "Literal" && (typeof l.value === "string" || typeof l.value === "number" || typeof l.value === "boolean")) return { k: "lit", v: l.value };
        if (l.type === "UnaryExpression" && l.operator === "-" && l.argument.type === "Literal" && typeof l.argument.value === "number") return { k: "lit", v: -l.argument.value };
        if (l.type === "TemplateLiteral" && l.expressions.length === 0) { const q = l.quasis[0]; if (q && q.value.cooked !== null) return { k: "lit", v: q.value.cooked }; }
        onUnsup(n, "literal type");
        return ERR;
      }
      case "TSUnionType": return union(all(n.types));
      case "TSArrayType": return arr(convert(n.elementType));
      case "TSTupleType": {
        const els: Mut<Ty[]> = mut([]);
        for (const e of n.elementTypes) {
          if (/TSNamedTupleMember|TSOptionalType|TSRestType/.test(e.type)) { onUnsup(e, e.type); return ERR; }
          els.push(convert(e));
        }
        return { k: "tup", els: freeze(els) };
      }
      case "TSTypeOperator":
        if (n.operator === "readonly") return convert(n.typeAnnotation);
        onUnsup(n, `type operator ${n.operator}`);
        return ERR;
      case "TSFunctionType": return sigOf(n);
      case "TSTypeLiteral": return literal(n.members);
      case "TSTypeQuery": {
        const look = ctx.typeofLookup;
        if (n.exprName.type === "Identifier" && look) {
          const t = look(n.exprName.name, n);
          if (t) return t;
        }
        onUnsup(n, "typeof type query");
        return ERR;
      }
      case "TSTypeReference": {
        if (n.typeName.type !== "Identifier") { onUnsup(n, "qualified type name"); return ERR; }
        const name: string = n.typeName.name;
        const args: Ty[] = all(n.typeArguments?.params ?? []);
        const a0 = args[0], a1 = args[1];
        if (ctx.tps.has(name)) return { k: "tv", n: name };
        if (name === "Js") return UNKNOWN;
        if (name === "Array" || name === "ReadonlyArray") return arr(a0 ?? UNKNOWN);
        if (name === "Record" && args.length === 2 && a0 && a0.k === "str" && a1) return { k: "rec", props: new Map(), index: a1 };
        if (name === "Action") return named("Action", a0 ?? { k: "tup", els: [] });
        if (ONE_ARG.has(name) && args.length !== 1) { onErr(n, "type", `${name} takes one type argument, as ${name}<T>`); return ERR; }
        const d = types.get(name);
        if (WRAPPERS.has(name) || d) {
          const t = named(name, ...args);
          const first = d?.nodes[0];
          const e = !WRAPPERS.has(name) && d && d.kind === "alias" && first && first.type === "TSTypeAliasDeclaration" && first.typeAnnotation.type === "TSTypeReference" ? expand(t) : t;
          return isNamed(e, "Mut") || isNamed(e, "Borrowed") ? e : t;
        }
        if (name === "ValueOf") { onUnsup(n, "ValueOf in checked cells"); return ERR; }
        onErr(n, "unknown-type", `unknown type ${name}`);
        return ERR;
      }
      default:
        onUnsup(n, n.type.replace(/^TS/, "") + " type");
        return ERR;
    }
  }
  const t = convert(n0);
  return { t, diags: freeze(diags) };
};
// boundary.ts shapeOf (full body). Shape from runtime.ss.ts, restated. `"error" in el` narrows a union of records.
export type Shape = { k: "num" } | { k: "str" } | { k: "null" } | { k: "undef" } | { k: "unknown" } | { k: "bool" } | { k: "lit"; v: string | number | boolean }
  | { k: "arr"; el: Shape } | { k: "tup"; els: Shape[] } | { k: "union"; ts: Shape[] } | { k: "rec"; props: [string, Shape, boolean][] };
export type ShapeErr = { error: string };
export const shapeOf = (show) => {
  function shapeOf(t: Ty, expand: (t: Ty) => Ty, isAlias: (n: string) => boolean, depth: number): Shape | ShapeErr {
    if (depth > 16) return { error: "a recursive type" };
    const sub = (x: Ty): Shape | ShapeErr => shapeOf(x, expand, isAlias, depth + 1);
    switch (t.k) {
      case "num": return { k: "num" };
      case "str": return { k: "str" };
      case "null": return { k: "null" };
      case "undef": case "void": return { k: "undef" };
      case "unknown": return { k: "unknown" };
      case "lit": return { k: "lit", v: t.v };
      case "fn": return { error: "a function" };
      case "arr": { const el = sub(t.el); return "error" in el ? el : { k: "arr", el }; }
      case "tup": {
        const els: Mut<Shape[]> = mut([]);
        for (const x of t.els) { const s = sub(x); if ("error" in s) return s; els.push(s); }
        return { k: "tup", els: freeze(els) };
      }
      case "union": {
        const ts0: Mut<Shape[]> = mut([]);
        for (const x of t.ts) { const s = sub(x); if ("error" in s) return s; ts0.push(s); }
        const ts = freeze(ts0);
        const lits = ts.filter((s) => s.k === "lit" && typeof s.v === "boolean");
        if (lits.length === 2) return { k: "union", ts: [...ts.filter((s) => !(s.k === "lit" && typeof s.v === "boolean")), { k: "bool" }] };
        return { k: "union", ts };
      }
      case "rec": {
        if (t.calls?.length || t.ctors?.length) return { error: "a function" };
        if (t.index) return { error: "an index signature" };
        const props: Mut<[string, Shape, boolean][]> = mut([]);
        for (const [n, p] of t.props) { const s = sub(p.t); if ("error" in s) return { error: `${n}: ${s.error}` }; props.push([n, s, p.opt]); }
        return { k: "rec", props: freeze(props) };
      }
      case "named":
        if (t.n === "Promise") return { error: "a promise" };
        if (isAlias(t.n)) return sub(expand(t));
        if (t.n === "Array" || t.n === "ReadonlyArray") { const a = t.args[0]; if (!a) return { error: "Array without an element type" }; const el = sub(a); return "error" in el ? el : { k: "arr", el }; }
        return { error: `${show(t)}, which the boundary does not check` };
      default: return { error: `${show(t)}, which the boundary does not check` };
    }
  }
  return (t: Ty, expand: (t: Ty) => Ty, isAlias: (n: string) => boolean, depth: number = 0): Shape | ShapeErr => shapeOf(t, expand, isAlias, depth);
};
// commentTypes (full body); cutsOf and esc as stubs
export const OPEN = () => "/*ss:";
export const CLOSE = () => "*/";
export const LANG = () => '/*{lang:"ss"}*/';
export const esc = () => (s: string): string => s.replace(/\*(\\*)\//g, "*\\$1/");
export const cutsOf = () => (src: string): [number, number][] => { throw new Error("stub"); };
export const commentTypes = (OPEN, CLOSE, LANG, esc, cutsOf) => (src: string): string => {
  if (src.includes(OPEN) || src.includes(LANG)) throw new Error(`source contains a reserved marker`);
  let out = "", at = 0;
  for (const [s, e] of cutsOf(src)) {
    out += src.slice(at, s) + OPEN + esc(src.slice(s, e)) + CLOSE;
    at = e;
  }
  return out + src.slice(at);
};
// cutsOf, reduced: a tokenizer's onComment callback that writes a let of the walk
export const tokens = () => (js: string, onComment: (block: boolean, text: string, start: number, end: number) => void): { end: number; label: string }[] => { throw new Error("stub"); };
export const cutsOfReduced = (tokens) => (gap: string, at: number): number => {
  let from = at;
  for (const t of tokens(gap, (_b, text, _s, end) => { if (text === "ss>") from = Math.max(from, at + end); })) if (t.label === ")") from = Math.max(from, at + t.end);
  return from;
};
// cutsOf, reduced: the merge step writes into the last pushed pair
export const mergeReduced = () => (cuts: [number, number][]): [number, number][] => {
  const merged: Mut<[number, number][]> = mut([]);
  for (const c of cuts) {
    const last = merged[merged.length - 1];
    if (last && c[0] <= last[1]) last[1] = Math.max(last[1], c[1]);
    else merged.push([c[0], c[1]]);
  }
  return freeze(merged);
};
// completionsAt, reduced: the checker's identHook, set by the caller, assigns the caller's let
export type Hooked = { identHook: ((name: string) => void) | null };
export const completionHookReduced = () => (ch: Hooked): string | null => {
  let got: string | null = null;
  ch.identHook = (name: string): void => { if (got === null) got = name; };
  return got;
};
// completionsAt, reduced: it wraps ch.member with a function that calls the original
export type WithMember = { member: (e: Node) => Ty };
export const completionPatchReduced = () => (ch: WithMember): void => {
  const orig = ch.member;
  ch.member = (e: Node): Ty => orig(e);
};
// link.ts link, reduced: each cell's text is evaluated again with new Function in a scope holding the prelude
export const linkReduced = () => (text: string): unknown => new Function("mut", `return (${text});`);
