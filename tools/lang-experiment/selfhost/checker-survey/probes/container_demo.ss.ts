// uses: ast, types
// The Checker class as one cell, with its state in flat tables (each a local Mut, none inside another): a scope is
// an id, its variables are scopeVars keyed "<scope>:<name>", a binding is a record looked up by id in bindings,
// and a binding's type that changes later lives in bindingT. Env is an immutable record (scope id, flow map, fi id);
// a method that returned a new flow by writing env.flow returns it instead. Real method bodies (declare, Scope.get,
// err, rec, check, infer, stmts, block, conditional, join, um, filter, typeTag, narrowByProp) adapted to that.
// The registry is a record of pure functions (its memos dropped), taken as a cell.
export type BKind = "const" | "let" | "param" | "fn" | "global" | "prelude";
export type Binding = { id: number; name: string; kind: BKind; node: Node; fi: number };
export type Prop2 = { t: Ty; opt: boolean };
export type RegView = { isAlias: (n: string) => boolean; expand: (t: Ty) => Ty; member: (t: Ty, k: string) => Prop2 | undefined; sub: (a: Ty, b: Ty) => boolean };
export type Env = { scope: number; flow: Map<string, Ty>; fi: number; dead: boolean };
export type Diag = { node: Node; rule: string; msg: string };
export type Out = { diags: Diag[]; types: Map<Node, Ty>; bindingOf: Map<Node, number> };
export const regView = (): RegView => ({
  isAlias: (n: string): boolean => false, expand: (t: Ty): Ty => t,
  member: (t: Ty, k: string): Prop2 | undefined => undefined, sub: (a: Ty, b: Ty): boolean => true,
});
export const checker = (regView, union, unwrap, propT, ERR, BOOL, NUM, STR, UNDEF) => (root: Node[]): Out => {
  const reg = regView;
  const diags: Mut<Diag[]> = mut([]);
  const types = mut(new Map<Node, Ty>());
  const bindingOf = mut(new Map<Node, number>());
  const bindings = mut(new Map<number, Binding>());
  const bindingT = mut(new Map<number, Ty>());
  const scopeVars = mut(new Map<string, number>());
  const scopeParent = mut(new Map<number, number | null>());
  let nextId = 0, nextScope = 0, quiet = 0;
  function newScope(parent: number | null): number { const s = ++nextScope; scopeParent.set(s, parent); return s; }
  function err(node: Node, rule: string, msg: string): void { diags.push({ node, rule, msg }); }
  function rec(n: Node, t: Ty): Ty { types.set(n, t); return t; }
  // Scope.get
  function lookup(scope: number | null, n: string): Binding | undefined {
    if (scope === null) return undefined;
    const id = scopeVars.get(`${scope}:${n}`);
    const b = id === undefined ? undefined : bindings.get(id);
    return b ?? lookup(scopeParent.get(scope) ?? null, n);
  }
  function declare(env: Env, name: string, t: Ty, kind: BKind, node: Node): Binding {
    const b: Binding = { id: ++nextId, name, kind, node, fi: env.fi };
    bindings.set(b.id, b);
    bindingT.set(b.id, t);
    scopeVars.set(`${env.scope}:${name}`, b.id);
    bindingOf.set(node, b.id);
    return b;
  }
  function um(t: Ty): Ty[] {
    if (t.k === "union") { const out: Mut<Ty[]> = mut([]); for (const x of t.ts) for (const y of um(x)) out.push(y); return freeze(out); }
    if (t.k === "named" && reg.isAlias(t.n)) {
      const e = reg.expand(t);
      if (e.k === "union" || (e.k !== "rec" && e.k !== "err")) return um(e);
    }
    return t.k === "never" ? [] : [t];
  }
  // filter keeps its callback: keep is pure here (it reads reg, which writes nothing)
  function filter(t: Ty, keep: (m: Ty) => boolean | Ty): Ty {
    if (t.k === "err") return t;
    const out: Mut<Ty[]> = mut([]);
    for (const m of um(t)) {
      const r = keep(m);
      if (r === true) out.push(m);
      else if (r !== false) out.push(r);
    }
    return union(freeze(out));
  }
  function narrowByProp(t: Ty, k: string, test: (pt: Ty) => boolean): Ty {
    return filter(t, (m) => { const p = reg.member(m, k); if (!p) return true; return test(propT(p)); });
  }
  function typeTag(m: Ty): string | null {
    switch (m.k) {
      case "num": return "number";
      case "str": return "string";
      case "bigint": return "bigint";
      case "symbol": return "symbol";
      case "undef": case "void": return "undefined";
      case "null": return "object";
      case "lit": return typeof m.v;
      case "fn": return "function";
      case "rec": return m.calls?.length ? "function" : "object";
      case "named": {
        if (m.n === "Action") return "function";
        const x = reg.expand(unwrap(m));
        return equals(x, m) ? "object" : typeTag(x);
      }
      case "arr": case "tup": return "object";
      default: return null;
    }
  }
  function join(a: Map<string, Ty> | null, b: Map<string, Ty> | null): Map<string, Ty> | null {
    if (!a) return b;
    if (!b) return a;
    const out = mut(new Map<string, Ty>());
    for (const [k, t] of a) { const u = b.get(k); if (u) out.set(k, union([t, u])); }
    return freeze(out);
  }
  function infer1(e: Node, env: Env): Ty {
    if (e.type === "Literal") return typeof e.value === "number" ? NUM : typeof e.value === "string" ? STR : ERR;
    if (e.type === "Identifier") { const b = lookup(env.scope, e.name); if (!b) { err(e, "free-name", `free name ${e.name}`); return ERR; } return bindingT.get(b.id) ?? ERR; }
    return ERR;
  }
  function infer(e: Node, env: Env): Ty {
    const q = quiet;
    quiet = 0;
    try { return rec(e, infer1(e, env)); } finally { quiet = q; }
  }
  function check(e: Node, env: Env, expected: Ty | undefined): Ty {
    const t = infer(e, env);
    if (expected && !reg.sub(t, expected)) err(e, "type", "not assignable");
    return t;
  }
  // conditional: was `env.flow = this.join(T, F)!`; returns the type and the flow after
  function conditional(e: ConditionalExpression, env: Env, expected: Ty | undefined): { t: Ty; flow: Map<string, Ty> } {
    const T = env.flow, F = env.flow;
    const a = check(e.consequent, { ...env, flow: T }, expected);
    const b = check(e.alternate, { ...env, flow: F }, expected);
    return { t: union([a, b]), flow: join(T, F) ?? env.flow };
  }
  // stmts and block: was `env.flow = inner.flow`; return the flow
  function stmt(s: Node, env: Env): { live: boolean; flow: Map<string, Ty> } {
    if (s.type === "VariableDeclaration") {
      for (const d of s.declarations) if (d.id.type === "Identifier") declare(env, d.id.name, d.init ? infer(d.init, env) : UNDEF, s.kind === "let" ? "let" : "const", d.id);
      return { live: true, flow: env.flow };
    }
    if (s.type === "ExpressionStatement" && s.expression.type === "ConditionalExpression") return { live: true, flow: conditional(s.expression, env, undefined).flow };
    if (s.type === "ReturnStatement") return { live: false, flow: env.flow };
    if (s.type === "BlockStatement") return block(s.body, env);
    return { live: true, flow: env.flow };
  }
  function stmts(list: Node[], env0: Env): { live: boolean; flow: Map<string, Ty> } {
    let live = true, env = env0;
    for (const s of list) {
      if (!live) { stmt(s, { ...env, flow: new Map(env.flow), dead: true }); continue; }
      const r = stmt(s, env);
      live = r.live;
      env = { ...env, flow: r.flow };
    }
    return { live, flow: env.flow };
  }
  function block(list: Node[], env: Env): { live: boolean; flow: Map<string, Ty> } {
    const inner: Env = { ...env, scope: newScope(env.scope) };
    return stmts(list, inner);
  }
  const top = newScope(null);
  block(root, { scope: top, flow: new Map(), fi: 0, dead: false });
  return { diags: freeze(diags), types: freeze(types), bindingOf: freeze(bindingOf) };
};
