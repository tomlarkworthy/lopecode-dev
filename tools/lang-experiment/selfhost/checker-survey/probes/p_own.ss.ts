// uses: ast, astlib, types
// Sampled inner units of own.ts ownership (position, fresh, helper) and actionEscapes (chain, methodValue), full
// bodies, inside one cell each as the original holds them inside one function. The checker facts are the flat
// tables of container_demo.ss.ts (bindingOf: node -> binding id, a binding by id, its type by id). Node identity
// (p.object !== x, …) is written as same(a, b): equal span and type, which tells apart the children of one node
// (a ChainExpression and its member share a span; the type differs). The surrounding code is stubs.
export type CallFact = { sig?: Fn; prelude?: string };
export type Binding = { id: number; name: string; kind: "const" | "let" | "param" | "fn" | "global" | "prelude"; node: Node; fiNode: Node | null; mutOwned: boolean; fnNode: Node | null };
export type Facts = { types: Map<Node, Ty>; bindingOf: Map<Node, number>; bindings: Map<number, Binding>; bindingT: Map<number, Ty>; calls: Map<Node, CallFact>; memberFlags: Map<Node, Flags | undefined> };
export type Rule = { node: Node; rule: string; msg: string };
export const same = () => (a: Node | null | undefined, b: Node | null | undefined): boolean => !!a && !!b && a.start === b.start && a.end === b.end && a.type === b.type;

export const ownershipSlice = (kids, isFn, same, isNamed) => (cellFn: Node, F: Facts): Rule[] => {
  const errs: Mut<Rule[]> = mut([]);
  const seenErr = mut(new Set<string>());
  const err = (node: Node, rule: string, msg: string): void => {
    const k = `${node.start}:${rule}`;
    if (!seenErr.has(k)) { seenErr.add(k); errs.push({ node, rule, msg }); }
  };
  const parent0 = mut(new Map<Node, Node>());
  const refs0 = mut(new Map<number, Node[]>());
  function walk(n: Node, p: Node | null): void {
    if (p) parent0.set(n, p);
    if (n.type === "Identifier") {
      const b = F.bindingOf.get(n);
      const bn = b === undefined ? undefined : F.bindings.get(b);
      if (bn && !same(bn.node, n)) refs0.set(bn.id, [...(refs0.get(bn.id) ?? []), n]);
    }
    for (const c of kids(n)) walk(c, n);
  }
  walk(cellFn, null);
  const parent = freeze(parent0), refs = freeze(refs0);
  const encl = (n: Node): Node => { let p = parent.get(n); while (p && !isFn(p)) p = parent.get(p); return p ?? cellFn; };
  const bindingOfFn0 = mut(new Map<Node, Binding>());
  for (const b of F.bindings.values()) if (b.fnNode) bindingOfFn0.set(b.fnNode, b);
  const bindingOfFn = freeze(bindingOfFn0);
  // helper (full body)
  const isCallee = (r: Node): boolean => { const p = parent.get(r); return !!p && p.type === "CallExpression" && same(p.callee, r); };
  const helper = (f: Node): Binding | undefined => {
    const b = bindingOfFn.get(f);
    if (!b || (b.kind !== "const" && b.kind !== "fn")) return undefined;
    return (refs.get(b.id) ?? []).every(isCallee) ? b : undefined;
  };
  const prelude = (c: Node): string | undefined => (c.type === "CallExpression" ? F.calls.get(c)?.prelude : undefined);
  const nonRetainingArg = (call: Node, i: number): boolean => false; // stub
  const mutParamArg = (call: Node, i: number): boolean => false; // stub
  const indexIn = (xs: Node[], x: Node): number => xs.findIndex((y) => same(y, x));
  // position (full body)
  function position(x: Node, kind: "mut" | "borrowed" | "view", b: Binding | undefined): string | null {
    const p = parent.get(x);
    if (!p) return "cell body";
    switch (p.type) {
      case "MemberExpression":
        if (!same(p.object, x)) return "computed key";
        if (kind === "view") {
          const pp = parent.get(p);
          if (pp && pp.type === "CallExpression" && same(pp.callee, p) && F.memberFlags.get(p)?.mutates) return "write through a view";
        }
        return null;
      case "CallExpression": case "NewExpression": {
        if (same(p.callee, x)) return "callee";
        const i = indexIn(p.arguments, x);
        const pre = prelude(p);
        if (pre === "freeze") {
          if (kind !== "mut" || x.type !== "Identifier" || !b) return "freeze of a non-binding";
          if (!b.mutOwned && b.kind !== "param") return null;
          if (!b.mutOwned) { err(p, "mut-freeze-param", `freeze(${b.name}): only a Mut created by mut() in this function can be frozen, not a Mut parameter`); return null; }
          if (!same(encl(p), b.fiNode)) { err(p, "mut-capture", `freeze of captured Mut ${b.name} inside a nested function`); return null; }
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
        const pp = parent.get(p);
        if (!pp) return "spread";
        if (pp.type === "ArrayExpression" || pp.type === "ObjectExpression") return null;
        if (pp.type === "CallExpression" || pp.type === "NewExpression") return nonRetainingArg(pp, indexIn(pp.arguments, p)) ? null : "spread into a call that may keep it";
        return "spread";
      }
      case "ForOfStatement": return same(p.right, x) ? null : "for...of target";
      case "TemplateLiteral": case "ExpressionStatement": case "UnaryExpression": case "BinaryExpression": return null;
      case "IfStatement": case "WhileStatement": case "DoWhileStatement": return same(p.test, x) ? null : "statement";
      case "ForStatement": case "SwitchCase": return same(p.test, x) ? null : "statement";
      case "SwitchStatement": return same(p.discriminant, x) ? null : "statement";
      case "ConditionalExpression": return same(p.test, x) ? null : position(p, kind, undefined);
      case "LogicalExpression": case "ChainExpression": return position(p, kind, undefined);
      case "VariableDeclarator": return "bound to a second name";
      case "AssignmentExpression": return same(p.right, x) ? "assigned to a binding" : "assignment target";
      case "ReturnStatement": case "ArrowFunctionExpression": return "returned";
      case "YieldExpression": return "yielded";
      case "AwaitExpression": return "awaited";
      case "ArrayExpression": return "placed in an array literal";
      case "Property": return "placed in an object literal";
      case "ThrowStatement": return "thrown";
      case "JSXExpressionContainer": return "placed in JSX";
      default: return p.type;
    }
  }
  // fresh (full body)
  function fresh(a: Node): boolean {
    switch (a.type) {
      case "ArrayExpression": case "ObjectExpression": return true;
      case "ConditionalExpression": return fresh(a.consequent) && fresh(a.alternate);
      case "NewExpression": case "CallExpression": {
        const s = F.calls.get(a)?.sig;
        // was !!s.flags?.intrinsic && !!s.flags.fresh: a truthy optional chain does not narrow s.flags
        return !!s && !!s.flags && !!s.flags.intrinsic && !!s.flags.fresh && !s.flags.view;
      }
      default: return false;
    }
  }
  for (const [id, rs] of refs) { const b = F.bindings.get(id); for (const r of rs) position(r, "mut", b); }
  if (helper(cellFn) && fresh(cellFn)) err(cellFn, "x", "y");
  return freeze(errs);
};

// actionEscapes chain and methodValue (full bodies); why1, callsAtOnce stubs; memo a local Mut
export const actionEscapesSlice = (kids, isFn, same) => (cellFn: Node, F: Facts, actionBodies: Set<Node>): string[] => {
  const parent0 = mut(new Map<Node, Node>());
  function walk(n: Node, p: Node | null): void { if (p) parent0.set(n, p); for (const c of kids(n)) walk(c, n); }
  walk(cellFn, null);
  const parent = freeze(parent0);
  const enclFn = (n: Node): Node | null => { let p = parent.get(n); while (p && !isFn(p)) p = parent.get(p); return p ?? null; };
  const memo = mut(new Map<Node, string | null>());
  const callsAtOnce = (p: Node, x: Node): boolean => false; // stub
  function why1(f: Node): string | null { return null; } // stub
  function why(f: Node): string | null {
    const m = memo.get(f);
    if (m !== undefined) return m;
    memo.set(f, null);
    const r = why1(f);
    memo.set(f, r);
    return r;
  }
  const chain = (f: Node | null, to: Node): string | null => {
    for (let g = f; g && !same(g, to); g = enclFn(g)) {
      if (actionBodies.has(g)) return "it is called from another action's body";
      const w = why(g);
      if (w) return w;
    }
    return null;
  };
  function onlyCalled(b: number, decl: Node): string | null { return chain(enclFn(decl), cellFn); } // stub
  function methodValue(x: Node): string | null {
    const p = parent.get(x);
    if (!p) return "it is kept: bound where the checker does not follow it";
    if (x.type === "MemberExpression") {
      if (p.type === "CallExpression" && same(p.callee, x)) return null;
      if ((p.type === "CallExpression" || p.type === "NewExpression") && p.arguments.some((a) => same(a, x))) return callsAtOnce(p, x) ? null : "it is passed to a function that may keep it";
      const pd = parent.get(p);
      if (p.type === "VariableDeclarator" && same(p.init, x) && p.id.type === "Identifier" && pd && pd.type === "VariableDeclaration" && pd.kind === "const") {
        const b = F.bindingOf.get(p.id);
        return b !== undefined ? onlyCalled(b, p) : "it is bound to a name the checker does not follow";
      }
      return "it is kept: returned, stored, or placed where it may be called later";
    }
    const pat = p, d = parent.get(pat);
    const dd = d ? parent.get(d) : undefined;
    if (x.type === "Property" && x.value.type === "Identifier" && d && d.type === "VariableDeclarator" && same(d.id, pat) && dd && dd.type === "VariableDeclaration" && dd.kind === "const") {
      const b = F.bindingOf.get(x.value);
      return b !== undefined ? onlyCalled(b, d) : "it is bound to a name the checker does not follow";
    }
    return "it is kept: bound where the checker does not follow it";
  }
  const out: Mut<string[]> = mut([]);
  for (const f of actionBodies) { const w = chain(f, cellFn) ?? methodValue(f); if (w) out.push(w); }
  return freeze(out);
};
// fresh's original line: a truthy optional chain (s.flags?.intrinsic) does not narrow s.flags
export const red_optChainTruthy = () => (s: { flags?: Flags }): boolean => !!s.flags?.intrinsic && !!s.flags.fresh;
