// uses: ast, types
// Sampled Checker members. Full bodies are written inside one cell each, with the members they call as local
// functions (stubs, marked) over the container_demo.ss.ts state: flat Mut tables, an immutable Env, a pure
// registry record. Reduced probes (marked) isolate one construct of a member whose full body was not ported.
export type Diag = { node: Node; rule: string; msg: string };
export type RegView = { isAlias: (n: string) => boolean; expand: (t: Ty) => Ty; member: (t: Ty, k: string) => Prop | undefined; sub: (a: Ty, b: Ty) => boolean; callSigs: (t: Ty) => Fn[]; iterElem: (t: Ty) => Ty | undefined };
export type Env = { scope: number; flow: Map<string, Ty>; fi: number; dead: boolean };
export const regView = (): RegView => ({
  isAlias: (n: string): boolean => false, expand: (t: Ty): Ty => t, member: (t: Ty, k: string): Prop | undefined => undefined,
  sub: (a: Ty, b: Ty): boolean => true, callSigs: (t: Ty): Fn[] => [], iterElem: (t: Ty): Ty | undefined => undefined,
});

// narrowIn (full body). um and filter as in container_demo; the keep callback calls has, which reads reg only.
export const narrowIn = (regView, union, UNKNOWN) => (t: Ty, k: string, pos: boolean): Ty => {
  const reg = regView;
  function um(t: Ty): Ty[] { return t.k === "union" ? t.ts : t.k === "never" ? [] : [t]; } // stub
  function filter(t: Ty, keep: (m: Ty) => boolean | Ty): Ty { // stub (container_demo has the body)
    const out: Mut<Ty[]> = mut([]);
    for (const m of um(t)) { const r = keep(m); if (r === true) out.push(m); else if (r !== false) out.push(r); }
    return union(freeze(out));
  }
  const ms = um(t);
  const has = (m: Ty): boolean => !!reg.member(m, k) && reg.expand(m).k !== "unknown";
  const anyHas = ms.some(has);
  return filter(t, (m) => {
    if (pos) {
      if (has(m)) return true;
      if (anyHas) return false;
      if (m.k === "object" || m.k === "rec" || m.k === "unknown") {
        const props = mut(m.k === "rec" ? new Map(m.props) : new Map<string, Prop>());
        props.set(k, { t: UNKNOWN, opt: false });
        const r: Ty = m.k === "rec" ? { ...m, props: freeze(props) } : { k: "rec", props: freeze(props) };
        return r;
      }
      return false;
    }
    const p = reg.member(m, k);
    return !(p && !p.opt);
  });
};

// binary (full body)
export const binaryCell = (regView, isPrimitive, show, ERR, BOOL, STR, NUM, BIGINT) => (e0: Node, env: Env): Ty => {
  const reg = regView;
  const diags: Mut<Diag[]> = mut([]);
  function err(node: Node, rule: string, msg: string): void { diags.push({ node, rule, msg }); }
  function unsupported(node: Node, what: string): void { diags.push({ node, rule: "unsupported", msg: what }); }
  function infer(e: Node, env: Env): Ty { return ERR; } // stub
  function numeric(at: Node, t: Ty): boolean { return true; } // stub
  function nonUndef(t: Ty): Ty { return t; } // stub
  function noOverlap(a: Ty, b: Ty): boolean { return false; } // stub
  function um(t: Ty): Ty[] { return t.k === "union" ? t.ts : [t]; } // stub
  function binary(e: BinaryExpression, env: Env): Ty {
    const op = e.operator;
    if (op === "instanceof") { unsupported(e, "instanceof"); return BOOL; }
    const a = infer(e.left, env), b = infer(e.right, env);
    if ((a.k === "err" || b.k === "err") && !["===", "!==", "==", "!=", "<", ">", "<=", ">=", "in"].includes(op)) return ERR;
    switch (op) {
      case "===": case "!==": case "==": case "!=":
        if (!isPrimitive(a) && !isPrimitive(b)) err(e, "strict-eq-object", `${op} on two non-primitive operands; use equals(a, b)`);
        else if (noOverlap(a, b)) err(e, "type", `${op} between ${show(a)} and ${show(b)}, which have no value in common`);
        return BOOL;
      case "+": {
        const isStr = (t: Ty): boolean => reg.sub(t, STR);
        if (isStr(a) || isStr(b)) return STR;
        if (reg.sub(a, BIGINT) && reg.sub(b, BIGINT)) return BIGINT;
        numeric(e.left, a); numeric(e.right, b);
        return NUM;
      }
      case "<": case ">": case "<=": case ">=": {
        const na = nonUndef(a), nb = nonUndef(b);
        const dom = [STR, BIGINT].find((d) => reg.sub(na, d) && reg.sub(nb, d));
        if (!dom) { numeric(e.left, a); numeric(e.right, b); }
        else for (const [x, t] of [[e.left, a], [e.right, b]] as const) if (!reg.sub(t, dom)) err(x, "possibly-undefined", `${show(t)} compared with ${op}`);
        return BOOL;
      }
      case "in":
        if (!reg.sub(a, STR)) err(e.left, "type", `in with a ${show(a)} key`);
        for (const m of um(b)) {
          if (m.k === "unknown" || m.k === "tv") { err(e.right, "type", `in on ${show(m)}, which may be a primitive; narrow it with typeof first`); break; }
          if (isPrimitive(m) && m.k !== "err") { err(e.right, m.k === "null" || m.k === "undef" ? "possibly-undefined" : "type", `in on a value that may be ${show(m)}`); break; }
        }
        return BOOL;
      default:
        if (reg.sub(a, BIGINT) && reg.sub(b, BIGINT)) return BIGINT;
        numeric(e.left, a); numeric(e.right, b);
        return NUM;
    }
  }
  return e0.type === "BinaryExpression" ? binary(e0, env) : ERR;
};

// hidden + hiddenFn (one cell: mutually recursive); actionIn a stub. Rewritten: strict index with ?? / guards.
export const hiddenCell = (regView, propT, NEVER) => {
  const reg = regView;
  function actionIn(s: Ty, depth: number): string | null { return null; } // stub
  function hiddenFn(s: Ty, t: Fn, opaque: Set<string> | null, depth: number): string | null {
    const f = reg.callSigs(s)[0];
    if (!f) return null;
    const w = hidden(f.ret, t.ret, opaque, depth + 1);
    if (w) return w;
    for (let i = 0; i < t.ps.length && i < f.ps.length; i++) { const a = t.ps[i], b = f.ps[i]; const x = a && b ? hidden(a.t, b.t, opaque, depth + 1) : null; if (x) return x; }
    return null;
  }
  function hidden(s: Ty, t: Ty, opaque: Set<string> | null, depth: number): string | null {
    if (depth > 10 || s.k === "err" || t.k === "err" || s.k === "never") return null;
    const H = (a: Ty, b: Ty): string | null => hidden(a, b, opaque, depth + 1);
    if (t.k === "unknown" || t.k === "object" || (t.k === "tv" && opaque?.has(t.n))) return actionIn(s, 0);
    if (s.k === "named" && reg.isAlias(s.n)) return H(reg.expand(s), t);
    if (t.k === "named" && reg.isAlias(t.n)) return H(s, reg.expand(t));
    if (s.k === "union") { for (const m of s.ts) { const w = H(m, t); if (w) return w; } return null; }
    if (s.k === "named" && (s.n === "Mut" || s.n === "Borrowed") && !(t.k === "named" && t.n === s.n)) { const a = s.args[0]; return a ? H(a, t) : null; }
    if (t.k === "union") {
      let w: string | null = null;
      for (const m of t.ts.filter((x) => reg.sub(s, x))) { const x = H(s, m); if (!x) return null; w = x; }
      return w;
    }
    const sx = reg.expand(s);
    switch (t.k) {
      case "arr": {
        const els = sx.k === "arr" ? [sx.el] : sx.k === "tup" ? sx.els : [reg.iterElem(sx) ?? NEVER];
        for (const x of els) { const w = H(x, t.el); if (w) return w; }
        return null;
      }
      case "tup":
        if (sx.k !== "tup") return null;
        for (let i = 0; i < t.els.length && i < sx.els.length; i++) { const a = sx.els[i], b = t.els[i]; const w = a && b ? H(a, b) : null; if (w) return w; }
        return null;
      case "rec": {
        for (const [k, p] of t.props) { const sp = reg.member(sx, k); const w = sp && H(propT(sp), propT(p)); if (w) return w; }
        if (t.index && sx.k === "rec") for (const p of sx.props.values()) { const w = H(propT(p), t.index); if (w) return w; }
        for (const c of t.calls ?? []) { const w = hiddenFn(s, c, opaque, depth); if (w) return w; }
        return null;
      }
      case "fn": return hiddenFn(s, t, opaque, depth);
      case "named": {
        const t0 = t.args[0];
        if (t.n === "Iterable" || t.n === "ArrayLike") { const el = reg.iterElem(sx); return el && t0 ? H(el, t0) : null; }
        if (sx.k !== "named" || sx.n !== t.n) return null;
        for (let i = 0; i < t.args.length; i++) { const a = sx.args[i], b = t.args[i]; const w = a && b ? H(a, b) : null; if (w) return w; }
        return null;
      }
      default: return null;
    }
  }
  return (s: Ty, t: Ty, opaque: Set<string> | null, depth: number = 0): string | null => hidden(s, t, opaque, depth);
};

// lvalue (full body), over the flat tables. reg.strictIndex = false around index(...) becomes an argument.
export type Binding = { id: number; name: string; kind: "const" | "let" | "param" | "fn" | "global" | "prelude"; node: Node; fi: number };
export const lvalueCell = (regView, ERR) => (t0: Node, env0: Env, at0: Node): Ty => {
  const diags: Mut<Diag[]> = mut([]);
  const types = mut(new Map<Node, Ty>());
  const bindingOf = mut(new Map<Node, number>());
  const bindingT = mut(new Map<number, Ty>());
  function err(node: Node, rule: string, msg: string): void { diags.push({ node, rule, msg }); }
  function unsupported(node: Node, what: string): void { diags.push({ node, rule: "unsupported", msg: what }); }
  function rec(n: Node, t: Ty): Ty { types.set(n, t); return t; }
  function lookup(scope: number, n: string): Binding | undefined { return undefined; } // stub
  function ident(e: Identifier, env: Env): Ty { return ERR; } // stub
  function writeRule(obj: Node, env: Env, at: Node, rule: string): void {} // stub
  function infer(e: Node, env: Env): Ty { return ERR; } // stub
  function index(ot: Ty, it: Ty, e: Node, strictIndex: boolean): Ty { return ERR; } // stub
  function propOf(ot: Ty, k: string, at: Node): Ty { return ERR; } // stub
  function lvalue(t: Node, env: Env, at: Node): Ty {
    if (t.type === "Identifier") {
      const b = lookup(env.scope, t.name);
      if (!b) { ident(t, env); return ERR; }
      bindingOf.set(t, b.id);
      if (b.kind !== "let" && b.kind !== "param") { err(at, "const-assign", `assignment to ${b.kind} ${t.name}`); return ERR; }
      return bindingT.get(b.id) ?? ERR;
    }
    if (t.type === "MemberExpression") {
      writeRule(t.object, env, at, "member-write");
      const ot = types.get(t.object) ?? ERR;
      const p = t.property;
      if (t.computed && !(p.type === "Literal" && typeof p.value === "string")) {
        const it = infer(p, env);
        return rec(t, index(ot, it, t, false));
      }
      const name = p.type === "Literal" ? String(p.value) : p.type === "Identifier" ? p.name : "";
      return rec(t, propOf(ot, name, p));
    }
    if (t.type === "ArrayPattern" || t.type === "ObjectPattern") {
      const parts = t.type === "ArrayPattern" ? t.elements : t.properties.map((p) => (p.type === "Property" ? p.value : p));
      for (const p of parts) if (p) lvalue(p.type === "AssignmentPattern" ? p.left : p, env, at);
      unsupported(t, "destructuring assignment");
      return ERR;
    }
    unsupported(t, `assignment target ${t.type}`);
    return ERR;
  }
  return lvalue(t0, env0, at0);
};

// ---- reduced probes (one construct each)
// varDecl / hoist / fnExpr: a Binding updated after it is stored (b.t = …, b.lazy = …)
export type Binding0 = { id: number; t: Ty; lazy?: () => Ty };
export const red_bindingUpdate = () => (b: Binding0, t: Ty): Binding0 => { b.t = t; return b; };
// varDecl / hoist: a thunk stored in a binding that reports through the checker state when it runs
export const red_lazyThunk = () => (n: Node): Binding0 => {
  const diags: Mut<Diag[]> = mut([]);
  return { id: 1, t: { k: "err" }, lazy: (): Ty => { diags.push({ node: n, rule: "unsupported", msg: "recursive function without a return type" }); return { k: "err" }; } };
};
// fnExpr / infer1 / returned: FnInfo shared through env.fi, appended to by return and yield statements
export type FnInfo = { rets: Ty[]; yields: Ty[]; retCtx?: Ty };
export const red_fnInfoPush = () => (fi: FnInfo, t: Ty): void => { fi.rets.push(t); };
// fnExpr / apply: params.forEach with a body that reports
export const red_forEachReport = () => (ps: Node[]): number => {
  const diags: Mut<Diag[]> = mut([]);
  ps.forEach((p, i) => { if (p.type !== "Identifier") diags.push({ node: p, rule: "untyped-parameter", msg: String(i) }); });
  return diags.length;
};
// switchStmt: the synthesized test node, and diags.splice on the flat Mut table
export const red_synthNode = () => (d: Node, test: Node): number => {
  const eq: BinaryExpression = { type: "BinaryExpression", operator: "===", left: d, right: test, start: test.start, end: test.end };
  const diags: Mut<Diag[]> = mut([{ node: eq, rule: "type", msg: "x" }]);
  for (let i = diags.length - 1; i >= 0; i--) { const x = diags[i]; if (x && x.node.start >= d.start) diags.splice(i, 1); }
  return diags.length;
};
// switchStmt: this.breaks, a stack of arrays that break statements append to (a Mut holding Muts)
export const red_breaksStack = () => (flow: Map<string, Ty>): number => {
  const breaks: Mut<Map<string, Ty>[][]> = mut([]);
  const exits: Map<string, Ty>[] = [];
  breaks.push(exits);
  const top = breaks[breaks.length - 1];
  if (top) top.push(flow);
  return exits.length;
};
// switchStmt: reduce with no initial value, and the result's ! (join returns Map | null)
export const red_reduceNoInit = () => (exits: Map<string, Ty>[], join: (a: Map<string, Ty> | null, b: Map<string, Ty> | null) => Map<string, Ty> | null): Map<string, Ty> | null =>
  exits.reduce((a, b) => join(a, b)!);
// apply: the module-level counter fresh (a let at module level)
export let fresh = 0;
// infer1: `if (e.expression)` on a case group whose members do not all have the field
export const red_caseGroupField = () => (e: Node): boolean => {
  switch (e.type) {
    case "ThisExpression": case "TSNonNullExpression": return !!e.expression;
    default: return false;
  }
};
// infer1: Literal's bigint field, which acorn adds; absent from the typed AST above
export const red_literalBigint = () => (e: Node): boolean => e.type === "Literal" && e.bigint !== undefined;
// member: this.short, a Set the member and chain cases add to and read (a flat table: allowed as a local Mut)
export const red_shortSet = () => (e: MemberExpression): boolean => { const short = mut(new Set<Node>()); if (e.optional) short.add(e); return short.has(e.object); };
// Scope.vars: a class field holding a Map that later code writes
export const red_scopeField = () => (): number => { const scope: Mut<{ vars: Map<string, number> }> = mut({ vars: new Map<string, number>() }); scope.vars.set("x", 1); return scope.vars.size; };
