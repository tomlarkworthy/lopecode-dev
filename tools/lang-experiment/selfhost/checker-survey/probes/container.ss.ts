// Container probes: can the Checker class's state be held as SoundScript locals? Each cell is one question.
export type Ident = { type: "Identifier"; start: number; end: number; name: string };
export type Lit = { type: "Literal"; start: number; end: number; value: string | number | boolean | null };
export type Un = { type: "UnaryExpression"; start: number; end: number; operator: string; argument: Expr };
export type Call = { type: "CallExpression"; start: number; end: number; callee: Expr; arguments: Expr[] };
export type Expr = Ident | Lit | Un | Call;
export type Ty = { k: "num" } | { k: "str" } | { k: "err" };
export type Diag = { node: Expr; rule: string; msg: string };
export type Binding = { id: number; name: string; t: Ty };
export type Scope = { vars: Map<string, Binding>; parent: Scope | null };

// Q1: captured Mut state written by local helpers, called directly (class -> closure)
export const q1_captured = () => (root: Expr): Diag[] => {
  const diags: Mut<Diag[]> = mut([]);
  const types = mut(new Map<Expr, Ty>());
  function err(node: Expr, rule: string, msg: string): void { diags.push({ node, rule, msg }); }
  function rec(n: Expr, t: Ty): Ty { types.set(n, t); return t; }
  function infer(e: Expr): Ty {
    if (e.type === "Literal") return rec(e, typeof e.value === "number" ? { k: "num" } : { k: "str" });
    if (e.type === "UnaryExpression") { const t = infer(e.argument); if (t.k !== "num") err(e, "type", "not a number"); return rec(e, { k: "num" }); }
    if (e.type === "CallExpression") { for (const a of e.arguments) infer(a); return rec(e, { k: "err" }); }
    err(e, "free-name", e.name);
    return rec(e, { k: "err" });
  }
  infer(root);
  return freeze(diags);
};
// Q1b: the same, a helper that writes a Mut called from a .map / .some callback
export const q1b_callback = () => (root: Expr): Diag[] => {
  const diags: Mut<Diag[]> = mut([]);
  function err(node: Expr, msg: string): void { diags.push({ node, rule: "type", msg }); }
  function infer(e: Expr): Ty {
    if (e.type === "CallExpression") { e.arguments.map((a) => infer(a)); return { k: "err" }; }
    if (e.type === "Identifier") err(e, e.name);
    return { k: "num" };
  }
  infer(root);
  return freeze(diags);
};
// Q2: state passed as a Mut parameter instead of captured
export type St = { diags: Diag[]; quiet: number };
export const q2_param = () => (root: Expr): St => {
  function err(st: Mut<St>, node: Expr, msg: string): void { st.diags.push({ node, rule: "type", msg }); }
  function infer(st: Mut<St>, e: Expr): Ty {
    if (e.type === "CallExpression") { for (const a of e.arguments) infer(st, a); return { k: "err" }; }
    if (e.type === "Identifier") err(st, e, e.name);
    return { k: "num" };
  }
  const st: Mut<St> = mut({ diags: [], quiet: 0 });
  infer(st, root);
  return freeze(st);
};
// Q2b: Mut param written inside a .map callback
export const q2b_param_cb = () => (root: Expr): St => {
  function infer(st: Mut<St>, e: Expr): Ty {
    if (e.type === "CallExpression") { e.arguments.map((a) => infer(st, a)); return { k: "err" }; }
    if (e.type === "Identifier") st.diags.push({ node: e, rule: "type", msg: e.name });
    return { k: "num" };
  }
  const st: Mut<St> = mut({ diags: [], quiet: 0 });
  infer(st, root);
  return freeze(st);
};
// Q3: Scope chain: a mutable record with a parent pointer, created per block, stored in a Map
export const q3_scope = () => (names: string[][]): number => {
  const scopes = mut(new Map<number, Scope>());
  let parent: Scope | null = null;
  let id = 0;
  for (const block of names) {
    const s: Mut<Scope> = mut({ vars: new Map<string, Binding>(), parent });
    for (const n of block) s.vars.set(n, { id: ++id, name: n, t: { k: "num" } });
    const done = freeze(s);
    scopes.set(id, done);
    parent = done;
  }
  return scopes.size;
};
// Q3b: a Scope whose vars stays writable while a child scope points at it (the class does this)
export const q3b_scope_live = () => (): number => {
  const outer: Mut<Scope> = mut({ vars: new Map<string, Binding>(), parent: null });
  const inner: Mut<Scope> = mut({ vars: new Map<string, Binding>(), parent: outer });
  outer.vars.set("late", { id: 1, name: "late", t: { k: "num" } });
  inner.vars.set("x", { id: 2, name: "x", t: { k: "num" } });
  return inner.vars.size;
};
// Q3c: get through the chain (Scope.get)
export const q3c_get = () => {
  function get(s: Scope, n: string): Binding | undefined { return s.vars.get(n) ?? (s.parent ? get(s.parent, n) : undefined); }
  return get;
};
// Q4: Map keyed by node identity and identity compare of records
export const q4_identity = () => (root: Expr): boolean => {
  const types = mut(new Map<Expr, Ty>());
  types.set(root, { k: "num" });
  const parentOf = mut(new Map<Expr, Expr>());
  if (root.type === "UnaryExpression") parentOf.set(root.argument, root);
  const p = root.type === "UnaryExpression" ? parentOf.get(root.argument) : undefined;
  return types.has(root) && p !== undefined && p.type === "UnaryExpression" && p.argument === (root.type === "UnaryExpression" ? root.argument : root);
};
// Q5: try/finally restoring a let, as Checker.check does (no Mut held)
export const q5_finally = () => (e: Expr): number => {
  let quiet = 0;
  function check1(x: Expr): number { return x.type === "Literal" ? quiet : 0; }
  function check(x: Expr): number {
    const outer = quiet;
    quiet = 1;
    try { return check1(x); } finally { quiet = outer; }
  }
  return check(e);
};
// Q5b: try/finally in a function holding a Mut
export const q5b_finally_mut = () => (e: Expr): number => {
  const types = mut(new Map<Expr, Ty>());
  let quiet = 0;
  function check(x: Expr): number {
    const outer = quiet;
    quiet = 1;
    try { types.set(x, { k: "num" }); return 1; } finally { quiet = outer; }
  }
  return check(e) + types.size;
};
// Q5c: try/catch around a helper holding a Mut (Registry.peek)
export const q5c_catch_mut = () => (e: Expr): number => {
  const types = mut(new Map<Expr, Ty>());
  function conv(x: Expr): Ty { if (x.type === "Identifier") throw new Error("no"); types.set(x, { k: "num" }); return { k: "num" }; }
  try { conv(e); } catch (err) { return -1; }
  return types.size;
};
// Q6: an env record that holds a Mut (Env = { scope, flow }) passed to helpers
export type Env = { flow: Map<string, Ty>; dead: boolean };
export const q6_env_holds_mut = () => (root: Expr): number => {
  function visit(env: Mut<Env>, e: Expr): void {
    if (e.type === "Identifier") env.flow.set(e.name, { k: "num" });
    if (e.type === "CallExpression") for (const a of e.arguments) visit(env, a);
  }
  const env: Mut<Env> = mut({ flow: new Map<string, Ty>(), dead: false });
  visit(env, root);
  const inner: Mut<Env> = mut({ flow: new Map(env.flow), dead: true });
  env.flow = inner.flow;
  return env.flow.size;
};
// Q7: a hook field: a function value given by the caller (compileHook)
export const q7_hook = () => (hook: ((e: Expr) => Ty) | null, e: Expr): Ty => (hook ? hook(e) : { k: "err" });
// Q8: object of closures returned as the "class instance" (Registry used by Checker and by core)
export const q8_instance = () => (decls: string[]) => {
  const memo = mut(new Map<string, number>());
  const expand = (n: string): number => { const m = memo.get(n); if (m !== undefined) return m; memo.set(n, n.length); return n.length; };
  return { expand, size: (): number => memo.size };
};
