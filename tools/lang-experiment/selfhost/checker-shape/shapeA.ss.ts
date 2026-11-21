// uses: ast, types, common
// Shape A: the slice's state-writing Checker methods as local functions of one cell (the survey's container_demo,
// extended). State is local: Mut tables and lets the local functions write; they are only called, never passed.
// The current flow is the let `flow` (the original's env.flow): a method that gave a branch its own env sets flow
// for the branch and sets it back after. The methods that read no state are the cells of common.ss.ts.
export const checkerA = (regView, union, show, members, isNamed, propT, lit, named, widen, subst, instantiate, hasTv, isPrimitive,
  ERR, NUM, STR, BOOL, BIGINT, NULL, UNDEF, NEVER, UNKNOWN,
  um, filter, truthy, falsy, nonUndef, narrowTypeof, narrowEq, narrowByProp, join2, logicalType, intrinsicName, noOverlap,
  memberless, exclusion, memberPath, ctxSensitive, settled, ctxOnly, collapseArrays, typeofTest) => (input: Input): Output => {
  const reg = regView;
  const diags: Mut<Diag[]> = mut([]);
  const types: Mut<Map<Node, Ty>> = mut(new Map());
  const bindingOf: Mut<Map<Node, Binding>> = mut(new Map());
  const vars: Mut<Map<string, Binding>> = mut(new Map());
  const parent: Mut<Map<number, number>> = mut(new Map());
  const rets: Mut<Ty[]> = mut([]);
  let nextId = 0, nextScope = 0, fresh = 0, quiet = 0;
  let flow: Flow = new Map();

  function err(node: Node, rule: string, msg: string): void { diags.push({ node, rule, msg }); }
  function unsupported(node: Node, what: string): void { diags.push({ node, rule: "unsupported", msg: what }); }
  function rec(n: Node, t: Ty): Ty { types.set(n, t); return t; }
  function newScope(p: number): number { const s = ++nextScope; parent.set(s, p); return s; }
  // Scope.get
  function lookup(scope: number, n: string): Binding | undefined {
    const b = vars.get(`${scope}:${n}`);
    if (b) return b;
    const p = parent.get(scope);
    return p === undefined ? undefined : lookup(p, n);
  }
  function declare(env: Env, name: string, t: Ty, kind: BKind, node: Node | null): Binding {
    const b: Binding = { id: ++nextId, name, t, kind, node };
    vars.set(`${env.scope}:${name}`, b);
    if (node) bindingOf.set(node, b);
    return b;
  }
  function pathKey(n: Node, env: Env): string | null {
    if (n.type === "Identifier") {
      const b = lookup(env.scope, n.name);
      if (!b || b.kind === "global" || b.kind === "prelude" || isNamed(b.t, "Mut")) return null;
      return "#" + b.id;
    }
    if (n.type === "MemberExpression" && !n.optional) {
      const base = pathKey(n.object, env), tail = memberPath(n);
      return base && tail ? base + tail : null;
    }
    return null;
  }
  function memberMissing(m: Ty, k: string, at: Node, all: Ty): void {
    if (m.k === "null" || m.k === "undef" || m.k === "void") return err(at, "possibly-undefined", `property ${k} of a value that may be ${show(all)}`);
    if (m.k === "unknown") return err(at, "no-member", `property ${k} on Js/unknown; narrow it first`);
    const i = intrinsicName(m);
    if (i) unsupported(at, `intrinsic member ${i}.${k}`);
    else err(at, "no-member", `no property ${k} on ${show(m)}`);
  }
  function expect(at: Node, t: Ty, expected: Ty): boolean {
    if (reg.sub(t, expected)) return true;
    let rule = "type";
    if (reg.sub(nonUndef(t), expected)) rule = "possibly-undefined";
    else if (members(t).some((m) => isNamed(m, "Action")) && !members(expected).some((m) => isNamed(m, "Action"))) rule = "action-pass";
    err(at, rule, `${show(t)} is not assignable to ${show(expected)}`);
    return false;
  }
  function check(e: Node, env: Env, expected: Ty | undefined, soft: boolean, ctx: boolean): Ty {
    const outer = quiet;
    const q = soft || ctx || outer > 0;
    quiet = q && (e.type === "ObjectExpression" || e.type === "ArrayExpression" || e.type === "ConditionalExpression" || e.type === "LogicalExpression") ? 1 : 0;
    try { return check1(e, env, expected, soft); } finally { quiet = outer; }
  }
  function check1(e: Node, env: Env, expected: Ty | undefined, soft: boolean): Ty {
    if (!expected) return infer(e, env);
    if (expected.k === "unknown" && !ctxSensitive(e)) return infer(e, env);
    if (e.type === "ConditionalExpression") return rec(e, conditional(e, env, expected));
    if (e.type === "LogicalExpression" && e.operator !== "&&") {
      const c = cond(e.left, env);
      const lt = types.get(e.left) ?? ERR;
      if (e.operator === "||") flow = c.f;
      const r = check(e.right, env, expected, false, false);
      flow = join2(c.t, c.f);
      return rec(e, logicalType(e.operator, lt, r));
    }
    const t = e.type === "CallExpression" ? call(e, env, expected) : infer(e, env);
    rec(e, t);
    if (!soft) expect(e, t, expected);
    return t;
  }
  function infer(e: Node, env: Env): Ty {
    const q = quiet;
    quiet = 0;
    try { return rec(e, infer1(e, env)); } finally { quiet = q; }
  }
  function infer1(e: Node, env: Env): Ty {
    switch (e.type) {
      case "Literal":
        if (e.regex) return named("RegExp");
        if (e.value === null) return NULL;
        return lit(e.value);
      case "Identifier": return ident(e, env);
      case "MemberExpression": return member(e, env);
      case "CallExpression": return call(e, env, undefined);
      case "UnaryExpression": return unary(e, env);
      case "BinaryExpression": return binary(e, env);
      case "LogicalExpression": {
        const c = cond(e.left, env);
        const lt = types.get(e.left) ?? ERR;
        const before = flow;
        flow = e.operator === "&&" ? c.t : e.operator === "||" ? c.f : before;
        const rt = infer(e.right, env);
        flow = join2(e.operator === "&&" ? c.f : e.operator === "||" ? c.t : before, flow);
        return logicalType(e.operator, lt, rt);
      }
      case "ConditionalExpression": return conditional(e, env, undefined);
      default: unsupported(e, e.type); return ERR;
    }
  }
  function ident(e: Identifier, env: Env): Ty {
    const b = lookup(env.scope, e.name);
    if (!b) {
      if (e.name === "arguments") return ERR;
      err(e, "free-name", `free name ${e.name}`);
      return ERR;
    }
    bindingOf.set(e, b);
    if (b.kind === "prelude") return b.t;
    return flow.get("#" + b.id) ?? b.t;
  }
  function member(e: MemberExpression, env: Env): Ty {
    const ot0 = infer(e.object, env);
    const k = pathKey(e, env);
    const nt = k ? flow.get(k) : undefined;
    const ot = collapseArrays(ot0);
    const prop = e.property;
    if (e.computed || prop.type !== "Identifier") { unsupported(e, "computed member (cut from the slice)"); return ERR; }
    const name = prop.name;
    const out: Mut<Ty[]> = mut([]), missing: Mut<Ty[]> = mut([]);
    let bad = false;
    for (const m of um(ot)) {
      if (m.k === "err") { bad = true; out.push(ERR); continue; }
      if (memberless(m)) { err(e, "type", `${show(m)} has no members`); bad = true; continue; }
      if (reg.expand(m).k === "err") { bad = true; out.push(ERR); continue; }
      const p = reg.member(m, name);
      if (!p) { missing.push(m); bad = true; out.push(ERR); continue; }
      out.push(propT(p));
    }
    const nullish = (m: Ty) => m.k === "null" || m.k === "undef" || m.k === "void";
    const kinds = [missing.filter(nullish), missing.filter((m) => m.k === "unknown"), missing.filter((m) => !nullish(m) && m.k !== "unknown" && intrinsicName(m)), missing.filter((m) => !nullish(m) && m.k !== "unknown" && !intrinsicName(m))];
    for (const g of kinds) {
      const g0 = g[0];
      if (g0 !== undefined) memberMissing(g.length === 1 || nullish(g0) ? g0 : union(g), name, prop, union(g));
    }
    const t = bad && out.length === 0 ? ERR : union(freeze(out));
    return nt ?? t;
  }
  function bail(e: CallExpression, env: Env): Ty {
    for (const a of e.arguments) infer(a, env);
    return ERR;
  }
  function call(e: CallExpression, env: Env, expected: Ty | undefined): Ty {
    const calleeT = infer(e.callee, env);
    if (calleeT.k === "err") return bail(e, env);
    const ms = um(calleeT), m0 = ms[0];
    if (ms.length !== 1 || m0 === undefined) { err(e, "type", `call of ${show(calleeT)}`); return bail(e, env); }
    const sigs = reg.callSigs(m0);
    if (!sigs.length) {
      if (m0.k === "null" || m0.k === "undef") err(e, "possibly-undefined", `call of a value that may be ${show(m0)}`);
      else err(e, "type", `${show(m0)} is not callable`);
      return bail(e, env);
    }
    let t: Ty = ERR;
    let done = false;
    for (const [i, sig] of sigs.entries()) {
      if (done) break;
      const d = diags.length, saved = flow;
      t = apply(e, sig, env, expected);
      if (diags.length === d || sigs.length === 1) done = true;
      else if (i < sigs.length - 1) { diags.length = d; flow = saved; }
    }
    return t;
  }
  function apply(e: CallExpression, sig0: Fn, env: Env, expected: Ty | undefined): Ty {
    const inst = instantiate(sig0, fresh);
    const sig = inst.f, tvs = inst.tvs;
    fresh += sig0.tps.length;
    const tvSet = new Set(tvs);
    const m: Mut<Map<string, Ty>> = mut(new Map());
    const args = e.arguments;
    const paramAt = (i: number): Ty | undefined => sig.ps[i]?.t ?? sig.rest;
    const required = sig.ps.filter((p) => !p.opt).length;
    if (args.length < required) err(e, "arity", `expected at least ${required} arguments, got ${args.length}`);
    if (args.length > sig.ps.length && !sig.rest) err(e, "arity", `expected at most ${sig.ps.length} arguments, got ${args.length}`);
    const argT: Mut<(Ty | undefined)[]> = mut([]);
    const fromRet: Mut<Map<string, Ty>> = mut(new Map());
    if (expected && hasTv(sig.ret, tvSet)) reg.unify(sig.ret, expected, fromRet, tvSet);
    function ctxSubst(t: Ty): Ty {
      const cm: Mut<Map<string, Ty>> = mut(new Map(m));
      for (const [k, v] of fromRet) if (!cm.has(k)) cm.set(k, v);
      return subst(t, freeze(cm));
    }
    for (const [i, a] of args.entries()) {
      const p = paramAt(i);
      if (a.type === "SpreadElement") { unsupported(a, "spread argument (cut from the slice)"); argT.push(ERR); continue; }
      if (!p) { infer(a, env); argT.push(undefined); continue; }
      const pc = subst(p, new Map(m));
      if (!hasTv(pc, tvSet)) { argT.push(check(a, env, sig.ps[i]?.opt ? union([pc, UNDEF]) : pc, false, false)); continue; }
      const t = check(a, env, ctxOnly(ctxSubst(p), tvSet), true, false);
      argT.push(t);
      reg.unify(p, t, m, tvSet);
    }
    for (const [k, v] of [...m]) m.set(k, widen(v));
    for (const n of tvs) {
      const c = m.get(n) ?? fromRet.get(n);
      m.set(n, c ? (m.has(n) ? widen(c) : c) : UNKNOWN);
    }
    for (const [i, a] of args.entries()) {
      const p = paramAt(i), t = argT[i];
      if (p && t && a.type !== "SpreadElement" && hasTv(p, tvSet)) expect(a, t, subst(p, new Map(m)));
    }
    return settled(subst(sig.ret, new Map(m)));
  }
  function conditional(e: ConditionalExpression, env: Env, expected: Ty | undefined): Ty {
    const c = cond(e.test, env);
    flow = c.t;
    const a = check(e.consequent, env, expected, false, false);
    flow = c.f;
    const b = check(e.alternate, env, expected, false, false);
    flow = join2(c.t, c.f);
    return union([a, b]);
  }
  function cond(e: Node, env: Env): Cond {
    if (e.type === "UnaryExpression" && e.operator === "!") {
      const c = cond(e.argument, env);
      rec(e, BOOL);
      return { t: c.f, f: c.t };
    }
    if (e.type === "LogicalExpression" && (e.operator === "&&" || e.operator === "||")) {
      const l = cond(e.left, env);
      const before = flow;
      flow = e.operator === "&&" ? l.t : l.f;
      const r = cond(e.right, env);
      flow = before;
      rec(e, logicalType(e.operator, types.get(e.left) ?? ERR, types.get(e.right) ?? ERR));
      return e.operator === "&&" ? { t: r.t, f: join2(l.f, r.f) } : { t: join2(l.t, r.t), f: r.f };
    }
    const t = infer(e, env);
    const T: Mut<Flow> = mut(new Map(flow)), F: Mut<Flow> = mut(new Map(flow));
    const type = (n: Node): Ty | undefined => types.get(n);
    function side(M: Mut<Flow>, br: boolean, k: string, nt: Ty, by: (t: Ty, branch: boolean) => Ty): void {
      for (const x of [NULL, UNDEF]) if (by(x, br).k === "never") M.set(exclusion(x.k, k), NEVER);
      const noNull = M.has(exclusion("null", k)), noUndef = M.has(exclusion("undef", k));
      M.set(k, filter(by(nt, br), (m) => !(m.k === "null" ? noNull : (m.k === "undef" || m.k === "void") && noUndef)));
    }
    function narrow(n: Node, nt: Ty | undefined, by: (t: Ty, branch: boolean) => Ty): void {
      const k = pathKey(n, env);
      if (!k || !nt) return;
      side(T, true, k, nt, by);
      side(F, false, k, nt, by);
    }
    function discriminant(m: Node, can: (pt: Ty, branch: boolean) => boolean): void {
      if (m.type !== "MemberExpression" || m.computed || m.property.type !== "Identifier") return;
      const name = m.property.name;
      narrow(m.object, type(m.object), (ot, branch) => narrowByProp(ot, name, (pt) => can(pt, branch)));
    }
    if (e.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(e.operator)) {
      const pos = e.operator === "===" || e.operator === "==";
      const loose = e.operator.length === 2;
      const tag = typeofTest(e.left, e.right) ?? typeofTest(e.right, e.left);
      if (tag) narrow(tag.arg, type(tag.arg), (pt, br) => narrowTypeof(pt, tag.tag, br === pos));
      else {
        const sides: [Node, Node][] = [[e.left, e.right], [e.right, e.left]];
        for (const [a, b] of sides) {
          const bt = type(b);
          if (!bt || (bt.k !== "lit" && bt.k !== "null" && bt.k !== "undef")) continue;
          narrow(a, type(a), (at, br) => narrowEq(at, bt, br === pos, loose));
          discriminant(a, (pt, br) => narrowEq(pt, bt, br === pos, loose).k !== "never");
          break;
        }
      }
    } else {
      narrow(e, t, (x, br) => (br ? truthy(x) : falsy(x)));
      discriminant(e, (pt, br) => (br ? truthy(pt) : falsy(pt)).k !== "never");
    }
    return { t: freeze(T), f: freeze(F) };
  }
  function numeric(at: Node, t: Ty): boolean {
    if (t.k === "err" || reg.sub(t, NUM)) return true;
    if (reg.sub(nonUndef(filter(t, (m) => m.k !== "null")), NUM)) { err(at, "possibly-undefined", `${show(t)} used as a number`); return false; }
    err(at, "type", `${show(t)} used as a number`);
    return false;
  }
  function binary(e: BinaryExpression, env: Env): Ty {
    const op = e.operator;
    if (op === "instanceof") { unsupported(e, "instanceof"); return BOOL; }
    if (op === "in") { unsupported(e, "in (cut from the slice)"); return BOOL; }
    const a = infer(e.left, env), b = infer(e.right, env);
    if ((a.k === "err" || b.k === "err") && !["===", "!==", "==", "!=", "<", ">", "<=", ">="].includes(op)) return ERR;
    switch (op) {
      case "===": case "!==": case "==": case "!=":
        if (!isPrimitive(a) && !isPrimitive(b)) err(e, "strict-eq-object", `${op} on two non-primitive operands; use equals(a, b)`);
        else if (noOverlap(a, b)) err(e, "type", `${op} between ${show(a)} and ${show(b)}, which have no value in common`);
        return BOOL;
      case "+": {
        if (reg.sub(a, STR) || reg.sub(b, STR)) return STR;
        if (reg.sub(a, BIGINT) && reg.sub(b, BIGINT)) return BIGINT;
        numeric(e.left, a); numeric(e.right, b);
        return NUM;
      }
      case "<": case ">": case "<=": case ">=": {
        const na = nonUndef(a), nb = nonUndef(b);
        const dom = [STR, BIGINT].find((d) => reg.sub(na, d) && reg.sub(nb, d));
        if (!dom) { numeric(e.left, a); numeric(e.right, b); }
        else {
          const ops: [Node, Ty][] = [[e.left, a], [e.right, b]];
          for (const [x, t] of ops) if (!reg.sub(t, dom)) err(x, "possibly-undefined", `${show(t)} compared with ${op}`);
        }
        return BOOL;
      }
      default:
        if (reg.sub(a, BIGINT) && reg.sub(b, BIGINT)) return BIGINT;
        numeric(e.left, a); numeric(e.right, b);
        return NUM;
    }
  }
  function unary(e: UnaryExpression, env: Env): Ty {
    if (e.operator === "delete") { unsupported(e, "delete (cut from the slice)"); return BOOL; }
    if (e.operator === "!") { cond(e.argument, env); return BOOL; }
    const t = infer(e.argument, env);
    if (t.k === "err" && e.operator !== "typeof") return ERR;
    const a = e.argument;
    switch (e.operator) {
      case "typeof": return STR;
      case "void": return UNDEF;
      case "-": case "+": case "~":
        if (e.operator === "-" && a.type === "Literal" && typeof a.value === "number") return lit(-a.value);
        if (e.operator !== "+" && reg.sub(t, BIGINT)) return BIGINT;
        if (e.operator !== "+") numeric(a, t);
        return NUM;
    }
    unsupported(e, `unary ${e.operator}`);
    return ERR;
  }
  function stmts(list: Node[], env: Env): boolean {
    let live = true;
    for (const s of list) {
      if (!live) { const saved = flow; stmt(s, { ...env, dead: true }); flow = saved; continue; }
      live = stmt(s, env);
    }
    return live;
  }
  function block(list: Node[], env: Env): boolean {
    return stmts(list, { ...env, scope: newScope(env.scope) });
  }
  function stmt(s: Node, env: Env): boolean {
    switch (s.type) {
      case "BlockStatement": return block(s.body, env);
      case "ExpressionStatement": return infer(s.expression, env).k !== "never";
      case "VariableDeclaration": for (const d of s.declarations) varDecl(d, s.kind, env); return true;
      case "ReturnStatement": {
        const t = s.argument ? returned(s.argument, env) : UNDEF;
        if (!s.argument && env.retCtx && !reg.sub(UNDEF, env.retCtx)) err(s, "type", `return without a value from a function returning ${show(env.retCtx)}`);
        rets.push(t);
        return false;
      }
      default: unsupported(s, s.type); return true;
    }
  }
  function varDecl(d: VariableDeclarator, kind: string, env: Env): void {
    const k: BKind = kind === "const" ? "const" : "let";
    const id = d.id, init = d.init;
    if (id.type !== "Identifier") { unsupported(d, "destructuring (cut from the slice)"); return; }
    if (!init) {
      if (k === "const") err(d, "type", "const without initializer");
      unsupported(d, "let without a type or initializer");
      declare(env, id.name, ERR, k, id);
      return;
    }
    const t = check(init, env, undefined, false, false);
    declare(env, id.name, k === "let" ? widen(t) : t, k, id);
  }
  function returned(e: Node, env: Env): Ty { return check(e, env, env.retCtx, false, false); }

  const globalEnv: Env = { scope: 0, dead: false, retCtx: undefined };
  for (const g of input.globals) declare(globalEnv, g.name, g.t, g.kind, null);
  const env: Env = { scope: newScope(0), dead: false, retCtx: undefined };
  for (const p of input.params) declare(env, p.name, p.t, "param", p.node);
  stmts(input.body, env);
  return { types: freeze(types), diags: freeze(diags), rets: freeze(rets) };
};
