// The port's logs, flows, scopes and the narrowing primitives that read only the registry (lite/infer.ts, the
// methods before cond). Flows are kept by id so that a map the original mutates in place, and the environments that
// share it, stay told apart from an environment whose flow is replaced.

// ---- logs ----
export const ixPush = () => (log: IxLog | null, d: IxDiag): IxLog => ({ d, n: (log?.n ?? 0) + 1, next: log });
export const ixOut = () => (log: IxLog | null): IxDiag[] => {
  const out: Mut<IxDiag[]> = mut([]);
  for (let x = log; x !== null; x = x.next) out.unshift(x.d);
  return freeze(out);
};
// the registry's reports go into the logs before anything the port writes or measures
export const ixDrain = (ixPush) => (K: IxK, C: IxCtls): void => {
  for (const d of K.reg.drain()) {
    if (d.rule === "unsupported") C.unsup = ixPush(C.unsup, d);
    else C.diags = ixPush(C.diags, d);
  }
};
export const ixErr = (ixDrain, ixPush) => (K: IxK, C: IxCtls, at: AstNode, rule: string, msg: string): void => {
  ixDrain(K, C);
  C.diags = ixPush(C.diags, { start: at.start, end: at.end, rule, msg });
};
export const ixUnsup = (ixDrain, ixPush) => (K: IxK, C: IxCtls, at: AstNode, what: string): void => {
  ixDrain(K, C);
  C.unsup = ixPush(C.unsup, { start: at.start, end: at.end, rule: "unsupported", msg: what });
};
// the port does not implement this: the cell's result is NOT COVERED, never a silent answer
export const ixGap = (ERR) => (C: IxCtls, what: string): Ty => {
  if (C.gap === null) C.gap = what;
  return ERR;
};
// the two logs' lengths, as the overload retry compares them
export const ixMark = (ixDrain) => (K: IxK, C: IxCtls): { d: IxLog | null; u: IxLog | null } => {
  ixDrain(K, C);
  return { d: C.diags, u: C.unsup };
};

// ---- flows ----
export const ixFlowOf = () => (W: IxFlows, id: number): IxFlow => W.get(id) ?? new Map();
// a new flow object holding f
export const ixNewFlow = () => (W: IxFlows, C: IxCtls, f: IxFlow): number => {
  C.nextFlow += 1;
  W.set(C.nextFlow, f);
  return C.nextFlow;
};
// new Map(flow): a copy, which later writes to either do not reach
export const ixCopyFlow = (ixNewFlow, ixFlowOf) => (W: IxFlows, C: IxCtls, id: number): number => ixNewFlow(W, C, ixFlowOf(W, id));
// flow.set(k, t) on the flow object id, which every environment holding it sees
export const ixFlowSet = (ixFlowOf) => (W: IxFlows, id: number, k: string, t: Ty): void => {
  const m: Mut<IxFlow> = mut(new Map(ixFlowOf(W, id)));
  m.set(k, t);
  W.set(id, freeze(m));
};
// a flow key that is not a path: a path starts with "#", so no property name can produce one of these
export const ixExclusion = () => (x: string, path: string): string => `!${x} ${path}`;
export const ixPathOf = () => (key: string): string => (key.startsWith("!") ? key.slice(key.indexOf(" ") + 1) : key);
// dropRoot: the narrowings of a binding and of every path below it go, in place
export const ixDropRoot = (ixFlowOf, ixPathOf) => (W: IxFlows, id: number, b: IxBinding): void => {
  const k = "#" + b.id;
  const m: Mut<IxFlow> = mut(new Map(ixFlowOf(W, id)));
  for (const key of [...m.keys()]) { const p = ixPathOf(key); if (p === k || p.startsWith(k + ".")) m.delete(key); }
  W.set(id, freeze(m));
};
// join: the keys both flows narrow, as the union of the two; a null side gives the other flow object itself
export const ixJoin = (ixFlowOf, ixNewFlow, union) => (W: IxFlows, C: IxCtls, a: number | null, b: number | null): number | null => {
  if (a === null) return b;
  if (b === null) return a;
  const out: Mut<IxFlow> = mut(new Map());
  const fb = ixFlowOf(W, b);
  for (const [k, t] of ixFlowOf(W, a)) { const u = fb.get(k); if (u) out.set(k, union([t, u])); }
  return ixNewFlow(W, C, freeze(out));
};
export const ixJoin2 = (ixJoin) => (W: IxFlows, C: IxCtls, a: number, b: number): number => ixJoin(W, C, a, b) ?? a;

// ---- scopes and bindings ----
export const ixNewScope = () => (C: IxCtls, env: IxEnv): IxEnv => {
  C.nextScope += 1;
  return { ...env, scope: C.nextScope, up: { id: env.scope, up: env.up } };
};
export const ixLookup = () => (V: IxVars, env: IxEnv, n: string): IxBinding | undefined => {
  const here = V.get(`${env.scope}:${n}`);
  if (here) return here;
  for (let c = env.up; c !== null; c = c.up) {
    const b = V.get(`${c.id}:${n}`);
    if (b) return b;
  }
  return undefined;
};
export const ixNoExtra = (): IxExtra => ({ assigned: false, cellParam: false });
export const ixDeclare = () => (V: IxVars, C: IxCtls, env: IxEnv, name: string, t: Ty, kind: IxKind, at: AstNode, extra: IxExtra, lazy: IxLazy, mutOwned: boolean): IxBinding => {
  C.nextId += 1;
  const b: IxBinding = { id: C.nextId, scope: env.scope, name, t, kind, nid: at.nid, mutOwned, assigned: extra.assigned, cellParam: extra.cellParam, checked: false, lazy };
  V.set(`${env.scope}:${name}`, b);
  return b;
};
// a binding changed: the one the scope holds under its name, as the original writes the Binding object
export const ixUpdate = () => (V: IxVars, b: IxBinding): void => {
  const key = `${b.scope}:${b.name}`;
  const now = V.get(key);
  if (now && now.id === b.id) V.set(key, b);
};
// findBinding: a binding by id among those the scope chain holds
export const ixFindBinding = () => (V: IxVars, env: IxEnv, id: number): IxBinding | undefined => {
  const scopes: Mut<Set<number>> = mut(new Set([env.scope]));
  for (let c = env.up; c !== null; c = c.up) scopes.add(c.id);
  for (const b of V.values()) if (b.id === id && scopes.has(b.scope)) return b;
  return undefined;
};
// typeCtx: the type parameters of the function and the functions around it
export const ixTps = () => (env: IxEnv): string[] => {
  const out: Mut<string[]> = mut([]);
  for (let fi: IxFnCtx | null = env.fi; fi !== null; fi = fi.parent) for (const n of fi.tps) out.push(n);
  return freeze(out);
};
// typeofLookup, taken once: the type of each name the scope chain holds, the innermost first
export const ixLookTable = (ixLookup) => (V: IxVars, env: IxEnv): Map<string, Ty> => {
  const out: Mut<Map<string, Ty>> = mut(new Map());
  for (const b of V.values()) {
    const seen = ixLookup(V, env, b.name);
    if (seen && seen.id === b.id && seen.kind !== "prelude") out.set(b.name, b.t);
  }
  return freeze(out);
};
export const ixConvert = (ixTps, ixLookTable) => (K: IxK, V: IxVars, env: IxEnv, n: AstNode): Ty =>
  K.reg.convert(n, ixTps(env), K.reg.hasTypeQuery(n) ? ixLookTable(V, env) : null);

// ---- union helpers and narrowing primitives ----
export const ixUm = () => {
  function um(R: IxRegCore, t: Ty): Ty[] {
    if (t.k === "union") return t.ts.flatMap((x) => um(R, x));
    if (t.k === "named" && R.isAlias(t.n)) {
      const e = R.expand(t);
      if (e.k === "union" || (e.k !== "rec" && e.k !== "err")) return um(R, e);
    }
    return t.k === "never" ? [] : [t];
  }
  return um;
};
export const ixFilter = (ixUm, union) => (R: IxRegCore, t: Ty, keep: (m: Ty) => boolean | Ty): Ty => {
  if (t.k === "err") return t;
  const out: Mut<Ty[]> = mut([]);
  for (const m of ixUm(R, t)) {
    const r = keep(m);
    if (r === true) out.push(m);
    else if (r !== false) out.push(r);
  }
  return union(freeze(out));
};
export const ixTruthy = (ixFilter) => (R: IxRegCore, t: Ty): Ty => ixFilter(R, t, (m) => {
  if (m.k === "null" || m.k === "undef" || m.k === "void") return false;
  if (m.k === "lit") return !!m.v;
  return true;
});
export const ixFalsy = (ixFilter) => (R: IxRegCore, t: Ty): Ty => ixFilter(R, t, (m) => {
  if (["null", "undef", "void", "num", "str", "bigint", "unknown", "tv"].includes(m.k)) return true;
  if (m.k === "lit") return !m.v;
  return false;
});
export const ixNonNullish = (ixFilter) => (R: IxRegCore, t: Ty): Ty => ixFilter(R, t, (m) => m.k !== "null" && m.k !== "undef" && m.k !== "void");
export const ixNonUndef = (ixFilter) => (R: IxRegCore, t: Ty): Ty => ixFilter(R, t, (m) => m.k !== "undef" && m.k !== "void");
// x === m in the original: the expansion is the type itself when it is not an alias
export const ixTypeTag = (unwrap) => {
  function typeTag(R: IxReg, m: Ty): string | null {
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
        const x = R.expand(unwrap(m));
        return R.same(x, m) ? "object" : typeTag(R, x);
      }
      case "arr": case "tup": return "object";
      default: return null;
    }
  }
  return typeTag;
};
export const IX_TYPEOF = (STR, NUM, BOOL, BIGINT, UNDEF, SYMBOL, OBJECT, NULL, union) => new Map<string, Ty>([["string", STR], ["number", NUM], ["boolean", BOOL], ["bigint", BIGINT], ["undefined", UNDEF],
  ["symbol", SYMBOL], ["object", union([OBJECT, NULL])], ["function", OBJECT]]);
export const ixNarrowTypeof = (ixFilter, ixTypeTag, IX_TYPEOF) => (R: IxReg, t: Ty, tag: string, pos: boolean): Ty => ixFilter(R, t, (m) => {
  const mt = ixTypeTag(R, m);
  if (mt !== null) return (mt === tag) === pos;
  if (!pos) return true;
  if (m.k === "unknown" || m.k === "tv") return IX_TYPEOF.get(tag) ?? false;
  return m.k === "object" ? tag === "object" || tag === "function" : true;
});
export const ixNarrowEq = (ixFilter, union, NULL, UNDEF) => (R: IxRegCore, t: Ty, v: Ty, pos: boolean, loose: boolean): Ty => {
  const nullish = v.k === "null" || v.k === "undef";
  return ixFilter(R, t, (m) => {
    if (pos) {
      if (loose && nullish) return m.k === "null" || m.k === "undef" || m.k === "void" || (m.k === "unknown" ? union([NULL, UNDEF]) : false);
      if (m.k === "unknown") return v;
      if (R.sub(v, m)) return v.k === "lit" || nullish ? v : true;
      return R.sub(m, v);
    }
    if (loose && nullish) return !(m.k === "null" || m.k === "undef" || m.k === "void");
    if ((v.k === "lit" || nullish) && R.sub(m, v) && R.sub(v, m)) return false;
    return true;
  });
};
// a member that does not declare k is kept on the true side: a value of it may have k as an extra property
export const ixNarrowIn = (ixFilter, UNKNOWN) => (R: IxRegCore, t: Ty, k: string, pos: boolean): Ty => ixFilter(R, t, (m) => {
  if (pos) {
    if (!!R.member(m, k) && R.expand(m).k !== "unknown") return true;
    const x = R.expand(m);
    if (x.k === "rec") { const props: Mut<Map<string, Prop>> = mut(new Map(x.props)); props.set(k, { t: UNKNOWN, opt: false }); return { ...x, props: freeze(props) }; }
    if (x.k === "object" || x.k === "unknown") return { k: "rec", props: new Map([[k, { t: UNKNOWN, opt: false }]]) };
    return true;
  }
  const p = R.member(m, k);
  return !(p && !p.opt);
});
export const ixNarrowArray = (ixFilter, arr, UNKNOWN) => (R: IxRegCore, t: Ty, pos: boolean): Ty => ixFilter(R, t, (m) => {
  if (m.k === "arr" || m.k === "tup") return pos;
  if (m.k === "unknown" || m.k === "object") return pos ? arr(UNKNOWN) : true;
  return !pos;
});
// discriminant: keep the members of t whose property k passes test
export const ixNarrowByProp = (ixFilter, propT) => (R: IxRegCore, t: Ty, k: string, test: (pt: Ty) => boolean): Ty => ixFilter(R, t, (m) => {
  const p = R.member(m, k);
  if (!p) return true;
  return test(propT(p));
});
// the runtime handles of these have none of the members their declarations give them to be nominal
export const ixMemberless = (isNamed) => (m: Ty): boolean => isNamed(m, "Action") || isNamed(m, "StateCell") || isNamed(m, "Events") || isNamed(m, "Listener");
export const IX_MUTATING_OPS = () => new Set(["=", "+=", "-=", "*=", "/=", "%=", "**=", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "&&=", "||=", "??="]);
// Action<[A, B]> called as (a0: A, a1: B) => void
export const ixActionFn = (VOID) => (args: Ty): Fn => ({ k: "fn", tps: [], ps: (args.k === "tup" ? args.els : []).map((t, i) => ({ n: "a" + i, t, opt: false })), ret: VOID });
