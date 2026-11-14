// Ownership rules over one checked cell, using the facts infer.ts recorded:
//  - mut(e): e fresh, bound to a local const; Mut/Borrowed/view expressions only in whitelisted positions
//  - captures: a nested function may use a Mut (or assign a let) only if it is a non-escaping local helper,
//    transitively through the helpers it calls; a Borrowed is never captured
//  - flow: no use of a Mut after freeze, no use of a Borrowed after await/yield (loops to a fixpoint;
//    a call of a helper is a use of every Mut it captures)
//  - ref(...) and borrow(...) placement
import { kids, isFn, type Node } from "./parse.ts";
import type { Checker, Binding } from "./infer.ts";
import { isNamed, type Ty } from "./types.ts";

type Rule = { node: Node; rule: string; msg: string };
export { kids };

export function ownership(cellFn: Node, ch: Checker): Rule[] {
  const F = ch.facts;
  const errs: Rule[] = [];
  const seenErr = new Set<string>();
  const err = (node: Node, rule: string, msg: string) => {
    const k = `${node.start}:${rule}`;
    if (!seenErr.has(k)) { seenErr.add(k); errs.push({ node, rule, msg }); }
  };
  const parent = new Map<Node, Node>();
  const fns: Node[] = [];
  const refs = new Map<Binding, Node[]>();
  const all: Node[] = [];
  (function walk(n: Node, p: Node | null) {
    if (p) parent.set(n, p);
    all.push(n);
    if (isFn(n)) fns.push(n);
    if (n.type === "Identifier") {
      const b = F.bindingOf.get(n);
      if (b && b.node !== n) { const l = refs.get(b) ?? []; l.push(n); refs.set(b, l); }
    }
    for (const c of kids(n)) walk(c, n);
  })(cellFn, null);

  const typeOf = (n: Node): Ty | undefined => F.types.get(n);
  const encl = (n: Node): Node => { let p = parent.get(n); while (p && !isFn(p)) p = parent.get(p); return p ?? cellFn; };
  const inside = (b: Binding, f: Node) => b.node && b.node.start >= f.start && b.node.end <= f.end;
  const isMutB = (b: Binding) => isNamed(b.t, "Mut");
  const isBorB = (b: Binding) => isNamed(b.t, "Borrowed");
  const bindingOfFn = new Map<Node, Binding>();
  for (const b of new Set([...F.bindingOf.values()])) if (b.fnNode) bindingOfFn.set(b.fnNode, b);
  const isCallee = (r: Node) => { const p = parent.get(r); return !!p && p.type === "CallExpression" && p.callee === r; };
  const helper = (f: Node): Binding | undefined => {
    const b = bindingOfFn.get(f);
    if (!b || (b.kind !== "const" && b.kind !== "fn")) return undefined;
    return (refs.get(b) ?? []).every(isCallee) ? b : undefined;
  };
  const prelude = (c: Node): string | undefined => (c.type === "CallExpression" ? F.calls.get(c)?.prelude : undefined);

  // ---- captures, to a fixpoint through helper calls ----
  const capMut = new Map<Node, Set<Binding>>();
  const capLet = new Map<Node, Set<Binding>>();
  const calls = new Map<Node, Set<Binding>>();
  for (const f of fns) { capMut.set(f, new Set()); capLet.set(f, new Set()); calls.set(f, new Set()); }
  for (const [b, rs] of refs) {
    for (const r of rs) {
      for (let f: Node | undefined = encl(r); f && f !== cellFn && fns.includes(f); f = parent.get(f) ? encl(f) : undefined) {
        if (inside(b, f)) break;
        if (isMutB(b) || isBorB(b)) capMut.get(f)!.add(b);
        const p = parent.get(r)!;
        const assigned = (p.type === "AssignmentExpression" && p.left === r) || (p.type === "UpdateExpression" && p.argument === r)
          || (p.type === "ArrayPattern" || p.type === "Property" && parent.get(p)?.type === "ObjectPattern" || p.type === "AssignmentPattern" && p.left === r);
        if (assigned && (b.kind === "let" || b.kind === "param")) capLet.get(f)!.add(b);
        if (b.fnNode && isCallee(r)) calls.get(f)!.add(b);
      }
    }
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (const f of fns) for (const h of calls.get(f)!) {
      if (!h.fnNode || !capMut.has(h.fnNode)) continue;
      for (const cap of [capMut, capLet])
        for (const b of cap.get(h.fnNode)!) if (!inside(b, f) && !cap.get(f)!.has(b)) { cap.get(f)!.add(b); changed = true; }
    }
  }
  for (const f of fns) {
    if (f === cellFn) continue;
    const h = helper(f);
    for (const b of capMut.get(f)!) {
      if (isBorB(b)) err(f, "borrowed-escape", `Borrowed ${b.name} captured by a nested function`);
      else if (!h) err(f, "mut-capture", `Mut ${b.name} captured by a function that escapes (not a local helper that is only called)`);
    }
    for (const b of capLet.get(f)!) if (!h) err(f, "let-capture", `${b.kind} ${b.name} assigned from a function that escapes`);
  }

  // ---- positions ----
  const viewOf = new Set<Node>();
  for (const n of all) {
    if (n.type !== "MemberExpression" || !F.memberFlags.get(n)?.view) continue;
    const rt = typeOf(n.object);
    if (!rt || !(isNamed(rt, "Mut") || viewOf.has(n.object))) continue;
    const p = parent.get(n);
    viewOf.add(p && p.type === "CallExpression" && p.callee === n ? p : n);
  }
  // the declared (uninstantiated) type of argument i of a resolved call
  const declParam = (call: Node, i: number, rest: boolean): Ty | undefined => {
    const sig = F.calls.get(call)?.sig;
    const d = sig && (sig.decl ?? sig);
    return d && (i < d.ps.length ? d.ps[i].t : rest ? d.rest : undefined);
  };
  const nonRetainingArg = (call: Node, i: number): boolean => {
    const flags = F.calls.get(call)?.sig?.flags;
    const dp = declParam(call, i, true);
    return !!flags?.intrinsic && !flags.retains && !!dp && dp.k !== "tv";
  };
  const mutParamArg = (call: Node, i: number): boolean => { const dp = declParam(call, i, false); return !!dp && isNamed(dp, "Mut"); };
  // Is expression x (of kind) in an allowed position? Returns a description of the position if not.
  const position = (x: Node, kind: "mut" | "borrowed" | "view", b?: Binding): string | null => {
    const p = parent.get(x);
    if (!p) return "cell body";
    switch (p.type) {
      case "MemberExpression":
        if (p.object !== x) return "computed key";
        if (kind === "view") {
          const pp = parent.get(p);
          if (pp?.type === "CallExpression" && pp.callee === p && F.memberFlags.get(p)?.mutates) return "write through a view";
        }
        return null;
      case "CallExpression": case "NewExpression": {
        if (p.callee === x) return "callee";
        const i = p.arguments.indexOf(x);
        const pre = prelude(p);
        if (pre === "freeze") {
          if (kind !== "mut" || x.type !== "Identifier" || !b) return "freeze of a non-binding";
          if (!b.mutOwned && b.kind !== "param") return null; // an alias: reported where it was bound
          if (!b.mutOwned) { err(p, "mut-freeze-param", `freeze(${b.name}): only a Mut created by mut() in this function can be frozen, not a Mut parameter`); return null; }
          if (encl(p) !== b.fi?.node) { err(p, "mut-capture", `freeze of captured Mut ${b.name} inside a nested function`); return null; }
          return null;
        }
        if (pre === "borrow") return kind === "mut" ? null : "borrow of a non-Mut";
        if (pre === "snapshot") return kind === "mut" ? "snapshot of a Mut" : null;
        if (pre === "equals") return null;
        if (pre) return `argument of ${pre}()`;
        if (kind === "mut" && mutParamArg(p, i)) return null;
        if (nonRetainingArg(p, i)) return null;
        return kind === "mut" ? "argument to a parameter not typed Mut<…>" : "argument to a parameter that may keep it";
      }
      case "SpreadElement": {
        const pp = parent.get(p)!;
        if (pp.type === "ArrayExpression" || pp.type === "ObjectExpression") return null;
        if (pp.type === "CallExpression" || pp.type === "NewExpression") return nonRetainingArg(pp, pp.arguments.indexOf(p)) ? null : "spread into a call that may keep it";
        return "spread";
      }
      case "ForOfStatement": return p.right === x ? null : "for...of target";
      case "TemplateLiteral": case "ExpressionStatement": case "UnaryExpression": case "BinaryExpression": return null;
      case "IfStatement": case "WhileStatement": case "DoWhileStatement": case "ForStatement": return p.test === x ? null : "statement";
      case "ConditionalExpression": return p.test === x ? null : position(p, kind, undefined);
      case "LogicalExpression": case "ChainExpression": return position(p, kind, undefined);
      case "VariableDeclarator": return "bound to a second name";
      case "AssignmentExpression": return p.right === x ? "assigned to a binding" : "assignment target";
      case "ReturnStatement": case "ArrowFunctionExpression": return "returned";
      case "YieldExpression": return "yielded";
      case "AwaitExpression": return "awaited";
      case "ArrayExpression": return "placed in an array literal";
      case "Property": return "placed in an object literal";
      case "ThrowStatement": return "thrown";
      case "JSXExpressionContainer": return "placed in JSX";
      default: return p.type;
    }
  };
  for (const [b, rs] of refs) {
    const kind = isMutB(b) ? "mut" : isBorB(b) ? "borrowed" : null;
    if (!kind) continue;
    for (const r of rs) {
      const pos = position(r, kind, b);
      if (pos) err(r, kind === "mut" ? "mut-escape" : "borrowed-escape", `${kind === "mut" ? "Mut" : "Borrowed"} ${b.name} ${pos}`);
    }
  }
  for (const n of all) {
    if ((n.type !== "CallExpression" && n.type !== "MemberExpression") || prelude(n) === "borrow") continue;
    const t = typeOf(n);
    if (t && isNamed(t, "Borrowed")) {
      const pos = position(n, "borrowed");
      if (pos) err(n, "borrowed-escape", `a view of a Borrowed, ${pos}`);
    }
  }
  for (const v of viewOf) {
    const pos = position(v, "view");
    if (pos) err(v, "mut-view", `a view aliasing a Mut buffer, ${pos}; consume it immediately as an argument of a non-retaining intrinsic`);
  }
  for (const n of all) {
    if (n.type !== "CallExpression") continue;
    const pre = prelude(n);
    if (pre === "mut") {
      const p = parent.get(n)!;
      const decl = parent.get(p);
      if (!(p.type === "VariableDeclarator" && p.init === n && p.id.type === "Identifier" && decl?.kind === "const")) err(n, "mut-bind", "mut(...) must be the initializer of a local const");
      const a = n.arguments[0];
      if (a && !fresh(a)) err(a, "mut-not-fresh", "mut(e) needs a fresh value: a literal, a spread copy, new on an intrinsic, or an intrinsic marked @fresh");
    } else if (pre === "borrow") {
      const p = parent.get(n);
      if (!(p?.type === "YieldExpression" && encl(n) === cellFn && cellFn.generator)) err(n, "borrow-placement", "borrow(x) only as the operand of yield in a generator cell");
    } else if (pre === "ref") {
      const p = parent.get(n);
      const okBody = cellFn.body === n;
      const okRet = p?.type === "ReturnStatement" && parent.get(p) === cellFn.body;
      if (!(okBody || okRet) || cellFn.async || cellFn.generator) err(n, "ref-placement", "ref(...) only as the returned value of a sync, non-generator cell");
    }
  }
  function fresh(a: Node): boolean {
    switch (a.type) {
      case "ArrayExpression": case "ObjectExpression": return true;
      case "ConditionalExpression": return fresh(a.consequent) && fresh(a.alternate);
      case "NewExpression": case "CallExpression": {
        const s = F.calls.get(a)?.sig;
        return !!s && !!s.flags?.intrinsic && !!s.flags.fresh && !s.flags.view;
      }
      default: return false;
    }
  }

  // ---- flow: use after freeze / after await ----
  for (const f of fns) flowCheck(f);
  function flowCheck(f: Node) {
    const tracked = new Set<Binding>();
    for (const b of refs.keys()) {
      if (b.fi?.node === f && isBorB(b) && b.kind === "param") tracked.add(b);
    }
    for (const b of F.bindingOf.values()) if (b.fi?.node === f && isMutB(b) && b.mutOwned) tracked.add(b);
    if (!tracked.size) return;
    const borrowed = [...tracked].filter(isBorB);
    type St = Set<Binding>;
    const loops: { breaks: St[]; conts: St[] }[] = [];
    let tryAcc: St[] | null = null;
    const join = (...ss: (St | null)[]): St | null => {
      const live = ss.filter((x): x is St => !!x);
      if (!live.length) return null;
      const out = new Set<Binding>();
      for (const s of live) for (const b of s) out.add(b);
      return out;
    };
    const use = (b: Binding, at: Node, st: St) => {
      if (!st.has(b)) return;
      if (isBorB(b)) err(at, "borrowed-await", `Borrowed ${b.name} used after an await/yield (it may be reused by its owner)`);
      else err(at, "mut-after-freeze", `Mut ${b.name} used after freeze(${b.name})`);
    };
    const expr = (n: Node, st: St): St => {
      if (isFn(n)) return st;
      if (tryAcc) tryAcc.push(new Set(st));
      switch (n.type) {
        case "Identifier": {
          const b = F.bindingOf.get(n);
          if (b && tracked.has(b) && b.node !== n) use(b, n, st);
          return st;
        }
        case "LogicalExpression": {
          const a = expr(n.left, st);
          const r = expr(n.right, new Set(a));
          return join(a, r)!;
        }
        case "ConditionalExpression": {
          const t = expr(n.test, st);
          return join(expr(n.consequent, new Set(t)), expr(n.alternate, new Set(t)))!;
        }
        case "ChainExpression": return join(st, expr(n.expression, new Set(st)))!;
        case "CallExpression": {
          for (const c of kids(n)) st = expr(c, st);
          const h = F.calls.get(n)?.helper;
          if (h?.fnNode) for (const b of capMut.get(h.fnNode) ?? []) if (tracked.has(b)) use(b, n, st);
          if (prelude(n) === "freeze" && n.arguments[0]?.type === "Identifier") {
            const b = F.bindingOf.get(n.arguments[0]);
            if (b && tracked.has(b)) st = new Set(st).add(b);
          }
          return st;
        }
        case "AwaitExpression": case "YieldExpression": {
          for (const c of kids(n)) st = expr(c, st);
          if (borrowed.length) { st = new Set(st); for (const b of borrowed) st.add(b); }
          return st;
        }
        default:
          for (const c of kids(n)) st = expr(c, st);
          return st;
      }
    };
    const stmt = (s: Node, st: St): St | null => {
      if (tryAcc) tryAcc.push(new Set(st));
      switch (s.type) {
        case "BlockStatement": {
          let cur: St | null = st;
          for (const x of s.body) { if (!cur) return null; cur = stmt(x, cur); }
          return cur;
        }
        case "VariableDeclaration": {
          for (const d of s.declarations) {
            if (d.init) st = expr(d.init, st);
            for (const c of kids(d.id)) st = expr(c, st);
            const b = d.id.type === "Identifier" ? F.bindingOf.get(d.id) : undefined;
            if (b && tracked.has(b)) { st = new Set(st); st.delete(b); }
          }
          return st;
        }
        case "FunctionDeclaration": case "EmptyStatement": return st;
        case "ExpressionStatement": return expr(s.expression, st);
        case "ReturnStatement": case "ThrowStatement": if (s.argument) expr(s.argument, st); return null;
        case "IfStatement": {
          const t = expr(s.test, st);
          return join(stmt(s.consequent, new Set(t)), s.alternate ? stmt(s.alternate, new Set(t)) : t);
        }
        case "BreakStatement": case "ContinueStatement":
          if (s.label) { ch.unsupported(s, "labelled break/continue in a function holding a Mut/Borrowed"); return null; }
          loops[loops.length - 1]?.[s.type === "BreakStatement" ? "breaks" : "conts"].push(st);
          return null;
        case "WhileStatement": case "DoWhileStatement": case "ForStatement": case "ForOfStatement": {
          let entry = st;
          if (s.type === "ForStatement" && s.init) entry = s.init.type === "VariableDeclaration" ? stmt(s.init, entry)! : expr(s.init, entry);
          if (s.type === "ForOfStatement") entry = expr(s.right, entry);
          let cur = entry;
          let exit: St | null = null;
          for (let iter = 0; iter < 20; iter++) {
            const ctx = { breaks: [] as St[], conts: [] as St[] };
            loops.push(ctx);
            let afterTest = cur;
            let bodyIn = cur;
            if (s.type !== "DoWhileStatement" && s.test) { afterTest = expr(s.test, new Set(cur)); bodyIn = afterTest; }
            if (s.type === "ForOfStatement") {
              bodyIn = new Set(cur);
              const d = s.left.declarations?.[0];
              const b = d?.id.type === "Identifier" ? F.bindingOf.get(d.id) : undefined;
              if (b && tracked.has(b)) bodyIn.delete(b);
            }
            let end = stmt(s.body, new Set(bodyIn));
            loops.pop();
            let back = join(end, ...ctx.conts);
            if (back && s.type === "ForStatement" && s.update) back = expr(s.update, back);
            if (back && s.type === "DoWhileStatement") { afterTest = expr(s.test, back); back = afterTest; }
            const infinite = s.type !== "ForOfStatement" && (!s.test || (s.test.type === "Literal" && s.test.value === true));
            exit = join(infinite ? null : s.type === "DoWhileStatement" ? afterTest : s.type === "ForOfStatement" ? cur : afterTest, ...ctx.breaks);
            const next = join(entry, back)!;
            if (next.size === cur.size) break;
            cur = next;
          }
          return exit;
        }
        case "TryStatement": {
          if (s.finalizer) { ch.unsupported(s, "try/finally in a function holding a Mut/Borrowed"); return st; }
          const outer = tryAcc;
          tryAcc = [new Set(st)];
          const a = stmt(s.block, new Set(st));
          const seen = join(...tryAcc)!;
          tryAcc = outer;
          if (tryAcc) tryAcc.push(seen);
          const c = s.handler ? stmt(s.handler.body, new Set(seen)) : null;
          return join(a, c);
        }
        case "SwitchStatement": case "LabeledStatement":
          ch.unsupported(s, `${s.type} in a function holding a Mut/Borrowed`);
          return st;
        default:
          for (const c of kids(s)) st = isFn(c) ? st : expr(c, st);
          return st;
      }
    };
    if (f.body.type === "BlockStatement") stmt(f.body, new Set());
    else expr(f.body, new Set());
  }
  return errs;
}
