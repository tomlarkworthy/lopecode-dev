// uses: ast, types
// What the three shapes share: the slice's data types, and the Checker methods that read no checker state (they
// read only the registry and their arguments), each a cell. Bodies are lite/infer.ts's with `this.reg` as the
// regView cell and `this.x(...)` as the cell x. Shapes A, B and C take these cells as inputs, so they differ only in
// the methods that write state (infer and the methods it reaches).
export type BKind = "const" | "let" | "param" | "fn" | "global" | "prelude";
export type Binding = { id: number; name: string; t: Ty; kind: BKind; node: Node | null };
export type Diag = { node: Node; rule: string; msg: string };
// scope: a scope id; dead: after a return. The flow is state (it changes as the methods run), not part of Env
export type Env = { scope: number; dead: boolean; retCtx: Ty | undefined };
export type Flow = Map<string, Ty>;
export type Cond = { t: Flow; f: Flow };
// lite/registry.ts methods the slice calls; unify writes the substitution it is given
export type RegView = {
  isAlias: (n: string) => boolean; expand: (t: Ty) => Ty; member: (t: Ty, k: string) => Prop | undefined;
  sub: (a: Ty, b: Ty) => boolean; callSigs: (t: Ty) => Fn[]; iterElem: (t: Ty) => Ty | undefined;
  unify: (p: Ty, a: Ty, m: Mut<Map<string, Ty>>, tvs: Set<string>) => void;
  userType: (n: string) => boolean; strictIndex: boolean;
};
// what the differential gives each shape: the function's parameters (typed by the real checker), its body and the globals
export type Input = { params: { node: Node; name: string; t: Ty }[]; globals: { name: string; t: Ty; kind: BKind }[]; body: Node[] };
export type Output = { types: Map<Node, Ty>; diags: Diag[]; rets: Ty[] };

// stands in for the registry when this file is checked; under bun the differential links the real one
export const regView = (): RegView => ({
  isAlias: (n: string): boolean => false, expand: (t: Ty): Ty => t, member: (t: Ty, k: string): Prop | undefined => undefined,
  sub: (a: Ty, b: Ty): boolean => true, callSigs: (t: Ty): Fn[] => [], iterElem: (t: Ty): Ty | undefined => undefined,
  unify: (p: Ty, a: Ty, m: Mut<Map<string, Ty>>, tvs: Set<string>): void => {}, userType: (n: string): boolean => false, strictIndex: true,
});

// a flow key that is not a path: a path starts with "#", so no property name can produce one of these
export const exclusion = () => (x: string, path: string): string => `!${x} ${path}`;
export const pathOf = () => (key: string): string => (key.startsWith("!") ? key.slice(key.indexOf(" ") + 1) : key);
export const TYPEOF = (STR, NUM, BOOL, BIGINT, UNDEF, SYMBOL, OBJECT, NULL, union) => new Map<string, Ty>([["string", STR], ["number", NUM], ["boolean", BOOL], ["bigint", BIGINT], ["undefined", UNDEF],
  ["symbol", SYMBOL], ["object", union([OBJECT, NULL])], ["function", OBJECT]]);
export const memberless = (isNamed) => (m: Ty): boolean => isNamed(m, "Action") || isNamed(m, "StateCell") || isNamed(m, "Events") || isNamed(m, "Listener");

export const um = (regView) => {
  function um(t: Ty): Ty[] {
    if (t.k === "union") return t.ts.flatMap((x) => um(x));
    if (t.k === "named" && regView.isAlias(t.n)) {
      const e = regView.expand(t);
      if (e.k === "union" || (e.k !== "rec" && e.k !== "err")) return um(e);
    }
    return t.k === "never" ? [] : [t];
  }
  return um;
};
export const filter = (um, union) => (t: Ty, keep: (m: Ty) => boolean | Ty): Ty => {
  if (t.k === "err") return t;
  const out: Mut<Ty[]> = mut([]);
  for (const m of um(t)) {
    const r = keep(m);
    if (r === true) out.push(m);
    else if (r !== false) out.push(r);
  }
  return union(freeze(out));
};
export const truthy = (filter) => (t: Ty): Ty => filter(t, (m) => {
  if (m.k === "null" || m.k === "undef" || m.k === "void") return false;
  if (m.k === "lit") return !!m.v;
  return true;
});
export const falsy = (filter) => (t: Ty): Ty => filter(t, (m) => {
  if (["null", "undef", "void", "num", "str", "bigint", "unknown", "tv"].includes(m.k)) return true;
  if (m.k === "lit") return !m.v;
  return false;
});
export const nonNullish = (filter) => (t: Ty): Ty => filter(t, (m) => m.k !== "null" && m.k !== "undef" && m.k !== "void");
export const nonUndef = (filter) => (t: Ty): Ty => filter(t, (m) => m.k !== "undef" && m.k !== "void");
// `x === m` on two types became equals: a deep comparison where the original compared identity
export const typeTag = (regView, unwrap) => {
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
        const x = regView.expand(unwrap(m));
        return equals(x, m) ? "object" : typeTag(x);
      }
      case "arr": case "tup": return "object";
      default: return null;
    }
  }
  return typeTag;
};
export const narrowTypeof = (filter, typeTag, TYPEOF) => (t: Ty, tag: string, pos: boolean): Ty => filter(t, (m) => {
  const mt = typeTag(m);
  if (mt !== null) return (mt === tag) === pos;
  if (!pos) return true;
  if (m.k === "unknown" || m.k === "tv") return TYPEOF.get(tag) ?? false;
  return m.k === "object" ? tag === "object" || tag === "function" : true;
});
export const narrowEq = (filter, regView, union, NULL, UNDEF) => (t: Ty, v: Ty, pos: boolean, loose: boolean): Ty => {
  const nullish = v.k === "null" || v.k === "undef";
  return filter(t, (m) => {
    if (pos) {
      if (loose && nullish) return m.k === "null" || m.k === "undef" || m.k === "void" || (m.k === "unknown" ? union([NULL, UNDEF]) : false);
      if (m.k === "unknown") return v;
      if (regView.sub(v, m)) return v.k === "lit" || nullish ? v : true;
      return regView.sub(m, v);
    }
    if (loose && nullish) return !(m.k === "null" || m.k === "undef" || m.k === "void");
    if ((v.k === "lit" || nullish) && regView.sub(m, v) && regView.sub(v, m)) return false;
    return true;
  });
};
export const narrowByProp = (filter, regView, propT) => (t: Ty, k: string, test: (pt: Ty) => boolean): Ty => filter(t, (m) => {
  const p = regView.member(m, k);
  if (!p) return true;
  return test(propT(p));
});
// was `return out` after `!`-free guards; a join of two flows keeps a key only when both sides have it
export const join = (union) => (a: Flow | null, b: Flow | null): Flow | null => {
  if (!a) return b;
  if (!b) return a;
  const out: Mut<Flow> = mut(new Map());
  for (const [k, t] of a) { const u = b.get(k); if (u) out.set(k, union([t, u])); }
  return freeze(out);
};
// join of two flows that are both present (the original's `this.join(T, F)!`)
export const join2 = (join) => (a: Flow, b: Flow): Flow => join(a, b) ?? a;
export const logicalType = (truthy, falsy, nonNullish, um, union) => (op: string, lt: Ty, rt: Ty): Ty => {
  if (op === "&&") return truthy(lt).k === "never" ? lt : union([falsy(lt), rt]);
  if (op === "||") return falsy(lt).k === "never" ? lt : union([truthy(lt), rt]);
  return um(lt).some((m) => ["null", "undef", "void", "unknown", "tv", "err"].includes(m.k)) ? union([nonNullish(lt), rt]) : lt;
};
// was `this.reg.types.get(e.n)` and its origin: userType is the registry's answer
export const intrinsicName = (regView, show) => (m: Ty): string | null => {
  const e = regView.expand(m);
  if (e.k === "arr" || e.k === "tup") return "Array";
  if (e.k === "str" || (e.k === "lit" && typeof e.v === "string")) return "String";
  if (e.k === "num" || e.k === "lit") return "Number";
  if (e.k === "union" && e.ts.every((x) => x.k === "lit" && typeof x.v === "boolean")) return show(e);
  if (e.k === "named") return regView.userType(e.n) ? null : e.n;
  return null;
};
export const noOverlap = (um, regView) => (a: Ty, b: Ty): boolean => {
  const prim = (m: Ty) => ["num", "str", "bigint", "null", "undef", "void", "lit"].includes(m.k);
  const ma = um(a).map((m) => regView.expand(m)), mb = um(b).map((m) => regView.expand(m));
  if (!ma.every(prim) || !mb.every(prim)) return false;
  const nul = (m: Ty) => m.k === "null" || m.k === "undef" || m.k === "void";
  if (ma.some(nul) || mb.some(nul)) return false;
  return !ma.some((x) => mb.some((y) => regView.sub(x, y) || regView.sub(y, x)));
};
// isNamed(m, "Promise") does not narrow m to Named (a SoundScript type has no predicates): read the argument here
export const promiseArg = (UNKNOWN) => (m: Ty): Ty | null => (m.k === "named" && m.n === "Promise" ? m.args[0] ?? UNKNOWN : null);
export const awaited = (um, promiseArg, regView, union, UNKNOWN) => (t: Ty, declared: boolean): Ty =>
  union(um(t).map((m) => promiseArg(m) ?? (!declared && (m.k === "object" || regView.member(m, "then")) ? UNKNOWN : m)));
export const settled = (um, isNamed, named, union, awaited, promiseArg) => (t: Ty): Ty => {
  const deep = (x: Ty, d: number): Ty => (d > 10 ? x : union(um(x).map((m) => { const a = promiseArg(m); return a ? deep(a, d + 1) : awaited(m, false); })));
  return t.k === "union" || isNamed(t, "Promise") ? union(um(t).map((m) => { const a = promiseArg(m); return a ? named("Promise", deep(a, 0)) : m; })) : t;
};
export const ctxOnly = (subst, UNKNOWN) => (t: Ty, tvs: Set<string>): Ty | undefined => {
  const m: Map<string, Ty> = new Map([...tvs].map((n): [string, Ty] => [n, UNKNOWN]));
  const r = subst(t, m);
  return r.k === "unknown" ? undefined : r;
};
// the parts of pathKey that read no scope: the suffix a member adds to its object's path
export const memberPath = () => (n: MemberExpression): string | null => {
  const p = n.property;
  if (!n.computed && p.type === "Identifier") return "." + p.name;
  if (n.computed && p.type === "Literal" && typeof p.value === "string") return /^(0|[1-9]\d*)$/.test(p.value) ? `[${p.value}]` : "." + p.value;
  if (n.computed && p.type === "Literal" && typeof p.value === "number") return "[" + p.value + "]";
  return null;
};
export const ctxSensitive = () => (e: Node): boolean => e.type === "ObjectExpression" || e.type === "ArrayExpression" || e.type === "ArrowFunctionExpression" || e.type === "FunctionExpression";
// A | B arrays read as (A | B)[]; was `(m as any).els` for a member the filter already proved a tuple
export const collapseArrays = (um, union, arr) => (t: Ty): Ty => {
  const ms = um(t);
  const arrs = ms.filter((m) => m.k === "arr" || m.k === "tup");
  if (arrs.length < 2) return t;
  const els = arrs.map((m) => (m.k === "arr" ? m.el : m.k === "tup" ? union(m.els) : m));
  return union([...ms.filter((m) => !arrs.includes(m)), arr(union(els))]);
};
// the typeof side of a comparison: sides.find(...) returned a pair whose fields it then read unnarrowed
export const typeofTest = () => (a: Node, b: Node): { arg: Node; tag: string } | null =>
  a.type === "UnaryExpression" && a.operator === "typeof" && b.type === "Literal" && typeof b.value === "string" ? { arg: a.argument, tag: b.value } : null;
