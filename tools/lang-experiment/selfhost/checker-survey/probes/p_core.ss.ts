// uses: ast, astlib, types
// Sampled core.ts units: syntaxPass, distinctNames, and checkSources' inner visit, uncloneable, compileType.
export type Diag = { node: Node; rule: string; msg: string };
// syntaxPass, rewritten: the walk over every key is fields(n) (astlib); parent.property === x becomes the field the
// child came through (shorthand key and value are distinct copies with one span, so a span compare would not do);
// the report/unsup callbacks (which write the caller's state) become a returned list.
export const SYNTAX = () => new Map<string, string>([["ThisExpression", "no-this"], ["ClassDeclaration", "no-class"], ["ClassExpression", "no-class"], ["TSAnyKeyword", "no-any"],
  ["TSNonNullExpression", "no-non-null"], ["ImportExpression", "no-dynamic-import"], ["TSEnumDeclaration", "no-enum"], ["TSModuleDeclaration", "no-namespace"], ["TSTypeAssertion", "no-cast"]]);
export const TYPE_POSITIONS = () => new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);
export const reservedName = () => (name: string): boolean => /^\$\d+$/.test(name) || name === "viewof" || name === "mutable";
export const RESERVED_MSG = () => (name: string): string => /^\$\d+$/.test(name)
  ? `${name} is reserved: Observable JavaScript names a cell's viewof inputs $0, $1, …`
  : `${name} is reserved: Observable JavaScript reads it as a keyword`;
export const syntaxPass = (fields, SYNTAX, TYPE_POSITIONS, reservedName, RESERVED_MSG) => (n: Node): Diag[] => {
  const out: Mut<Diag[]> = mut([]);
  function walk(x: Node, parent: Node | null, key: string, inType: boolean): void {
    const named = !!parent && ((parent.type === "MemberExpression" && !parent.computed && key === "property") || (parent.type === "Property" && !parent.computed && key === "key"));
    if (x.type === "Identifier" && !inType && reservedName(x.name) && !(named && !/^\$\d+$/.test(x.name))) out.push({ node: x, rule: "reserved-name", msg: RESERVED_MSG(x.name) });
    const r = SYNTAX.get(x.type);
    if (r) out.push({ node: x, rule: r, msg: x.type });
    if (x.type === "TSAsExpression" && !(x.typeAnnotation.type === "TSTypeReference" && x.typeAnnotation.typeName.type === "Identifier" && x.typeAnnotation.typeName.name === "const")) out.push({ node: x, rule: "no-cast", msg: "as cast" });
    if (x.type === "VariableDeclaration" && x.kind === "var") out.push({ node: x, rule: "no-var", msg: "var" });
    if (x.type === "Identifier" && x.name === "arguments" && !named) out.push({ node: x, rule: "no-arguments", msg: "arguments" });
    for (const f of fields(x)) walk(f.node, x, f.key, inType || TYPE_POSITIONS.has(f.key));
  }
  walk(n, null, "", false);
  return freeze(out);
};
// distinctNames, original form: acorn's SyntaxError with its pos, read by cast and instanceof
export type ParseResult = { P: Parsed; dups: Map<string, { name: string; pos: number }> };
export const parse = () => (src: string, opts: { jsx?: boolean } = {}): Parsed => { throw new Error("stub"); };
export const STAND = () => Array.from({ length: 40 }, (_, i) => String.fromCharCode(0xa4d0 + i));
export const distinctNames = (parse, STAND) => (src: string, jsx: boolean): ParseResult => {
  const dups = mut(new Map<string, { name: string; pos: number }>());
  let text = src;
  for (;;) {
    try { return { P: parse(text, { jsx }), dups: freeze(dups) }; } catch (e) {
      const pos = (e as { pos?: number }).pos;
      if (!(e instanceof SyntaxError) || typeof pos !== "number" || !/has already been declared/.test(e.message)) throw e;
      const name = /^[\w$]+/.exec(text.slice(pos))?.[0];
      if (!name) throw e;
      let k = dups.size, ph = "";
      for (let i = 0; i < name.length; i++) { ph = STAND[k % 40] + ph; k = Math.floor(k / 40); }
      if (k > 0 || dups.has(ph)) throw e;
      dups.set(ph, { name: src.slice(pos, pos + name.length), pos });
      text = text.slice(0, pos) + ph + text.slice(pos + name.length);
    }
  }
};
// distinctNames, rewritten against a parser that returns its error as a value (a SoundScript parser would)
export type Parse2 = { ok: true; P: Parsed } | { ok: false; pos: number; message: string };
export const parse2 = () => (src: string, opts: { jsx?: boolean } = {}): Parse2 => { throw new Error("stub"); };
export const distinctNames_rw = (parse2, STAND) => (src: string, jsx: boolean): ParseResult => {
  const dups = mut(new Map<string, { name: string; pos: number }>());
  let text = src;
  for (;;) {
    const r = parse2(text, { jsx });
    if (r.ok) return { P: r.P, dups: freeze(dups) };
    if (!/has already been declared/.test(r.message)) throw new Error(r.message);
    const pos = r.pos;
    const rest = text.slice(pos);
    if (!/^[\w$]+/.test(rest)) throw new Error(r.message);
    const name = rest.slice(0, rest.length - rest.replace(/^[\w$]+/, "").length);
    let k = dups.size, ph = "";
    for (let i = 0; i < name.length; i++) { ph = (STAND[k % 40] ?? "") + ph; k = Math.floor(k / 40); }
    if (k > 0 || dups.has(ph)) throw new Error(r.message);
    dups.set(ph, { name: src.slice(pos, pos + name.length), pos });
    text = text.slice(0, pos) + ph + text.slice(pos + name.length);
  }
};
// checkSources' visit (topological order with cycle report), over flat tables; was out.get(x)!.errors.push(...)
export type LiteError = { rule: string; line: number; msg: string };
export const visitSlice = () => (names: string[], deps: Map<string, string[]>, lineOf: Map<string, number>): { order: string[]; cycleErrors: Map<string, LiteError[]> } => {
  const order: Mut<string[]> = mut([]);
  const state = mut(new Map<string, number>());
  const cycleErrors = mut(new Map<string, LiteError[]>());
  function visit(n: string, stack: string[]): void {
    if (state.get(n) === 2) return;
    if (state.get(n) === 1) {
      const cyc = stack.slice(stack.indexOf(n));
      for (const x of cyc) cycleErrors.set(x, [...(cycleErrors.get(x) ?? []), { rule: "cycle", line: lineOf.get(x) ?? 0, msg: `dependency cycle ${[...cyc, n].join(" -> ")}` }]);
      return;
    }
    state.set(n, 1);
    for (const d of deps.get(n) ?? []) visit(d, [...stack, n]);
    state.set(n, 2);
    order.push(n);
  }
  for (const c of names) visit(c, []);
  return { order: freeze(order), cycleErrors: freeze(cycleErrors) };
};
// uncloneable (full body); `depth = 0` on the recursive arrow becomes a wrapper
export type RegView = { isAlias: (n: string) => boolean; expand: (t: Ty) => Ty };
export const uncloneable = () => (reg: RegView) => {
  function uncloneable(t: Ty, depth: number): string | null {
    if (depth > 8) return null;
    if (t.k === "named" && reg.isAlias(t.n)) return uncloneable(reg.expand(t), depth + 1);
    switch (t.k) {
      case "fn": return "a function";
      case "named": return ["Action", "State", "StateCell", "Mut", "Borrowed", "Promise", "Generator", "Pool", "Compile", "Events", "Listener", "Elem"].includes(t.n) ? t.n : null;
      case "arr": return uncloneable(t.el, depth + 1);
      case "tup": for (const x of t.els) { const w = uncloneable(x, depth + 1); if (w) return w; } return null;
      case "union": for (const x of t.ts) { const w = uncloneable(x, depth + 1); if (w) return w; } return null;
      case "rec": if (t.calls?.length) return "a function"; for (const p of t.props.values()) { const w = uncloneable(p.t, depth + 1); if (w) return w; } return null;
      default: return null;
    }
  }
  return (t: Ty, depth: number = 0): string | null => uncloneable(t, depth);
};
// compileType, reduced: it is the Checker's compileHook, called by the checker, and reports through ch.err
export type Ch = { err: (n: Node, rule: string, msg: string) => void; infer: (e: Node) => Ty };
export const compileHookReduced = () => (e: Node, ch: Ch): Ty => { ch.err(e, "compile-island", "x"); return ch.infer(e); };
// compileType's side(): a Record written key by key
export const sideReduced = (rec) => (names: string[], value: Map<string, Ty>): Rec => {
  const props: Record<string, Ty> = {};
  for (const n of names) { const t = value.get(n); if (t) props[n] = t; }
  return rec(props);
};
