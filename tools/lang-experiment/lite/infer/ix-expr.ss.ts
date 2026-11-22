// Expressions (lite/infer.ts check, check1, infer, infer1 and the atoms: literals, identifiers, members, index).
// infer1 is a dispatch over three families; each family cell gives null for a node type that is not its own.

export const ixCtxSensitive = () => (e: AstNode): boolean =>
  e.type === "ObjectExpression" || e.type === "ArrayExpression" || e.type === "ArrowFunctionExpression" || e.type === "FunctionExpression";
// soft: expected is a context only; ctx: expected is a context, not the type the value finally has
export const ixCheck = (ixCheck1) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode, expected: Ty | null, soft: boolean, ctx: boolean): Ty => {
  const outer = C.quiet;
  const q = soft || ctx || outer > 0;
  C.quiet = q && (e.type === "ObjectExpression" || e.type === "ArrayExpression" || e.type === "ConditionalExpression" || e.type === "LogicalExpression") ? 1 : 0;
  try { return ixCheck1(K, T, V, W, C, env, e, expected, soft, q); } finally { C.quiet = outer; }
};
// a literal, or a fresh call or new, checked against Mut<X>: checked against X, and its type is Mut<X> (S4: a fresh value
// is writable; no one else holds it). Any other value checked against Mut<X> is a [type] error: T is not a Mut<T>.
export const ixCheckFresh = (ixExpect) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode, expected: Ty, soft: boolean, q: boolean): Ty => {
  const x = expected.k === "named" ? expected.args[0] ?? expected : expected;
  const t = K.check(K, T, V, W, C, env, e, x, soft, q);
  const fresh = e.type === "ArrayExpression" || e.type === "ObjectExpression" || C.freshAt === e.nid;
  if (!soft && !fresh) ixExpect(K, C, e, t, expected, q);
  T.set(e.nid, fresh ? expected : t);
  return fresh ? expected : t;
};
export const ixCheck1 = (ixCheckFresh, ixCtxSensitive, ixHides, ixObjLit, ixArrLit, ixConditional, ixCheckLogical, ixExpect) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode, expected: Ty | null, soft: boolean, q: boolean): Ty => {
  if (expected === null) return K.infer(K, T, V, W, C, env, e);
  const viaMut = e.type === "CallExpression" && e.callee.type === "Identifier" && e.callee.name === "mut";
  if (expected.k === "named" && expected.n === "Mut" && !viaMut && ["ArrayExpression", "ObjectExpression", "CallExpression", "NewExpression"].includes(e.type)) return ixCheckFresh(K, T, V, W, C, env, e, expected, soft, q);
  if (expected.k === "unknown" && !ixCtxSensitive(e)) { const t = K.infer(K, T, V, W, C, env, e); if (!q) ixHides(K, C, e, t, expected, null); return t; }
  let t: Ty;
  switch (e.type) {
    case "ObjectExpression": t = ixObjLit(K, T, V, W, C, env, e, expected); break;
    case "ArrayExpression": t = ixArrLit(K, T, V, W, C, env, e, expected); break;
    case "ArrowFunctionExpression": case "FunctionExpression": t = K.fnExpr(K, T, V, W, C, env, e, expected, null); break;
    case "ConditionalExpression": { const c = ixConditional(K, T, V, W, C, env, e, expected); T.set(e.nid, c); return c; }
    case "LogicalExpression":
      if (e.operator !== "&&") { const l = ixCheckLogical(K, T, V, W, C, env, e, expected, soft, q); T.set(e.nid, l); return l; }
      t = K.infer(K, T, V, W, C, env, e);
      break;
    case "CallExpression": case "NewExpression": t = K.call(K, T, V, W, C, env, e, expected); break;
    default: t = K.infer(K, T, V, W, C, env, e);
  }
  T.set(e.nid, t);
  if (!soft) ixExpect(K, C, e, t, expected, q);
  return t;
};
export const ixInfer = (ixInfer1) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode): Ty => {
  const q = C.quiet;
  C.quiet = 0;
  try {
    const t = ixInfer1(K, T, V, W, C, env, e);
    T.set(e.nid, t);
    return t;
  } finally { C.quiet = q; }
};
export const ixInfer1 = (ixInferAtom, ixInferOp, ixInferRest, ixUnsup, ixGap, nodeKind, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode): Ty => {
  if (e.type === "Other") return ixGap(C, `node ${e.kind} (Other)`);
  const t = ixInferAtom(K, T, V, W, C, env, e) ?? ixInferOp(K, T, V, W, C, env, e) ?? ixInferRest(K, T, V, W, C, env, e);
  if (t !== null) return t;
  ixUnsup(K, C, e, nodeKind(e));
  return ERR;
};
// literals, names, and what the syntax pass reports
export const ixInferAtom = (ixLiteral, ixIdent, ixConstLit, ERR, STR, lit) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode): Ty | null => {
  switch (e.type) {
    case "Literal": return ixLiteral(e);
    case "TemplateLiteral": {
      for (const x of e.expressions) K.infer(K, T, V, W, C, env, x);
      const q = e.quasis[0];
      return e.expressions.length || q === undefined || q.type !== "TemplateElement" ? STR : lit(q.value.cooked ?? "");
    }
    case "Identifier": return ixIdent(K, T, V, W, C, env, e);
    case "ThisExpression": case "ClassExpression": case "ImportExpression": return ERR;
    case "TSNonNullExpression": case "TSTypeAssertion": K.infer(K, T, V, W, C, env, e.expression); return ERR;
    case "TSAsExpression": {
      const a = e.typeAnnotation, n = a.type === "TSTypeReference" ? a.typeName : null;
      if (n !== null && n.type === "Identifier" && n.name === "const") return ixConstLit(K, T, V, W, C, env, e.expression);
      K.infer(K, T, V, W, C, env, e.expression);
      return ERR;
    }
    default: return null;
  }
};
export const ixLiteral = (named, lit, BIGINT, NULL) => (e: Literal): Ty => {
  if (e.regex !== null) return named("RegExp");
  if (e.bigint !== null) return BIGINT;
  return e.value === null ? NULL : lit(e.value);
};
// what reading a binding with no type yet gives (Binding.lazy)
export const ixLazyRead = (ixUnsup, ixUpdate, ixNewFlow, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, b: IxBinding): Ty => {
  const z = b.lazy;
  if (z.k === "none") return b.t;
  if (z.k === "unsup") { ixUnsup(K, C, z.at, "recursive function without a return type"); return ERR; }
  if (z.busy) { ixUnsup(K, C, z.fn, "recursive function without a return type"); return ERR; }
  ixUpdate(V, C, { ...b, lazy: { ...z, busy: true } });
  const own = C.cur;
  C.cur = ixNewFlow(W, C, new Map());
  const f = K.fnExpr(K, T, V, W, C, z.env, z.fn, null, null);
  C.cur = own;
  ixUpdate(V, C, { ...b, t: f, checked: true, lazy: { k: "none" } });
  return f;
};
export const ixIdent = (ixLookup, ixLazyRead, ixFlowOf, ixErr, ixUnsup, ixFact, ixScopeNames, NEVER, UNKNOWN, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: Identifier): Ty => {
  if (K.probe !== null && !K.probe.member && C.probe === null && e.name === K.probe.name) C.probe = { k: "name", names: ixScopeNames(V, W, C, env), inAction: env.fi.inAction };
  const b = ixLookup(V, env, e.name);
  if (!b) {
    if (e.name === "arguments") return ERR;
    if (K.cellNames.has(e.name)) ixErr(K, C, e, "cell-by-name", `cell ${e.name} referenced by name; take it as a parameter`);
    else if (K.allowed.has(e.name)) ixUnsup(K, C, e, `intrinsic ${e.name} has no signature in lite/intrinsics.ts`);
    else if (e.name === "mut" || e.name === "freeze" || e.name === "borrow") ixErr(K, C, e, "removed-call", `${e.name}(...) is no longer part of the language: delete the call and keep its argument (a fresh value bound to a local is writable; a cell's value is frozen when it leaves the cell)`);
    else ixErr(K, C, e, "free-name", `free name ${e.name}`);
    return ERR;
  }
  ixFact(C, { k: "bind", at: e.nid, id: b.id });
  if (b.kind === "prelude") return b.t;
  // its argument is checked where it is called, so the value takes no argument (S2.6 lets a body name it)
  if (b.kind === "global" && e.name === "structuredClone" && !C.clones.has(e.nid)) return { k: "fn", tps: [], ps: [{ n: "v", t: NEVER, opt: false }], ret: UNKNOWN };
  const nt = ixFlowOf(W, C.cur).get("#" + b.id);
  if (nt) return nt;
  return b.checked ? b.t : ixLazyRead(K, T, V, W, C, b);
};
// the bindings in scope at env, innermost scope first, each name once, with its type in the current flow
export const ixScopeNames = (ixFlowOf) => (V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv): IxScopeName[] => {
  const ids: Mut<number[]> = [env.scope];
  for (let c = env.up; c !== null; c = c.up) ids.push(c.id);
  const flow = ixFlowOf(W, C.cur), seen: Mut<Set<string>> = new Set(), out: Mut<IxScopeName[]> = [];
  for (const id of ids) for (const b of V.values()) {
    if (b.scope !== id || seen.has(b.name)) continue;
    seen.add(b.name);
    out.push({ name: b.name, kind: b.kind, t: flow.get("#" + b.id) ?? b.t });
  }
  return out;
};
// a path (identifier or chain of non-computed members) as a narrowing key; links: a ?. member is one too
export const ixPathKey = (ixLookup, isNamed) => {
  function pathKey(V: IxVars, env: IxEnv, n: AstNode, links: boolean): string | null {
    if (n.type === "Identifier") {
      const b = ixLookup(V, env, n.name);
      if (!b || b.kind === "global" || b.kind === "prelude" || isNamed(b.t, "Mut")) return null;
      return "#" + b.id;
    }
    if (n.type !== "MemberExpression" || (n.optional && !links)) return null;
    const base = pathKey(V, env, n.object, links);
    if (!base) return null;
    const p = n.property;
    if (!n.computed && p.type === "Identifier") return base + "." + p.name;
    if (n.computed && p.type === "Literal" && typeof p.value === "string") return base + (/^(0|[1-9]\d*)$/.test(p.value) ? `[${p.value}]` : "." + p.value);
    if (n.computed && p.type === "Literal" && typeof p.value === "number") return base + "[" + p.value + "]";
    return null;
  }
  return pathKey;
};
// A | B arrays read as (A | B)[]: sound because arrays are immutable outside Mut
export const ixCollapseArrays = (ixUm, union, arr) => (R: IxRegCore, t: Ty): Ty => {
  const ms = ixUm(R, t);
  const arrs = ms.filter((m) => m.k === "arr" || m.k === "tup");
  if (arrs.length < 2) return t;
  const els = arrs.map((m) => (m.k === "arr" ? m.el : m.k === "tup" ? union(m.els) : m));
  return union([...ms.filter((m) => m.k !== "arr" && m.k !== "tup"), arr(union(els))]);
};
// the intrinsic a type's members come from, or null for a user type
export const ixIntrinsicName = (show) => (R: IxReg, m: Ty): string | null => {
  const e = R.expand(m);
  if (e.k === "arr" || e.k === "tup") return "Array";
  if (e.k === "str" || (e.k === "lit" && typeof e.v === "string")) return "String";
  if (e.k === "num" || e.k === "lit") return "Number";
  if (e.k === "union" && e.ts.every((x) => x.k === "lit" && typeof x.v === "boolean")) return show(e);
  if (e.k === "named") { const o = R.origin(e.n); return o === null || o === "intrinsic" ? e.n : null; }
  return null;
};
export const ixMemberMissing = (ixErr, ixUnsup, ixIntrinsicName, show) => (K: IxK, C: IxCtls, m: Ty, k: string, at: AstNode, all: Ty): void => {
  if (m.k === "null" || m.k === "undef" || m.k === "void") return ixErr(K, C, at, "possibly-undefined", `property ${k} of a value that may be ${show(all)}`);
  if (m.k === "unknown") return ixErr(K, C, at, "no-member", `property ${k} on Js/unknown; narrow it first`);
  const i = ixIntrinsicName(K.reg, m);
  if (i) ixUnsup(K, C, at, `intrinsic member ${i}.${k}`);
  else ixErr(K, C, at, "no-member", `no property ${k} on ${show(m)}`);
};
// x["0"] on an array-like is an index read, as in TypeScript
export const ixNumStr = (ixUm, unwrap) => (R: IxReg, e: MemberExpression, ot: Ty): string | null => {
  const p = e.property;
  if (!e.computed || p.type !== "Literal" || typeof p.value !== "string" || !/^(0|[1-9]\d*)$/.test(p.value)) return null;
  const v = p.value;
  return ixUm(R, ot).some((m) => { const x = R.expand(unwrap(m)); return x.k === "arr" || x.k === "tup" || (R.member(x, "length") !== undefined && !R.member(x, v)); }) ? v : null;
};
export const ixMember = (ixPathKey, ixFlowOf, ixCollapseArrays, ixNonNullish, ixNumStr, ixIndex, ixNamedMember, ixGap, nodeKind, lit, UNKNOWN) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: MemberExpression): Ty => {
  const ot0 = K.infer(K, T, V, W, C, env, e.object);
  const k = ixPathKey(V, env, e, false);
  const nt = k ? ixFlowOf(W, C.cur).get(k) : undefined;
  const isShort = e.optional || C.short.has(e.object.nid);
  if (isShort) C.short = new Set([...C.short, e.nid]);
  const ot1 = ixCollapseArrays(K.reg, ot0);
  const ot = isShort ? ixNonNullish(K.reg, ot1) : ot1;
  const p = e.property, num = ixNumStr(K.reg, e, ot);
  let t: Ty;
  if (num !== null) { T.set(p.nid, lit(Number(num))); t = ixIndex(K, C, ot, lit(Number(num)), e, true); }
  else if (e.computed && !(p.type === "Literal" && typeof p.value === "string")) t = ixIndex(K, C, ot, K.infer(K, T, V, W, C, env, p), e, true);
  else if (p.type === "Literal") t = ixNamedMember(K, C, env, e, ot, String(p.value));
  else if (p.type === "Identifier" || p.type === "PrivateIdentifier") t = ixNamedMember(K, C, env, e, ot, p.name);
  else t = ixGap(C, `member property ${nodeKind(p)}`);
  if (K.probe !== null && K.probe.member && C.probe === null && !e.computed && (p.type === "Identifier" || p.type === "PrivateIdentifier") && p.name === K.probe.name) C.probe = { k: "member", t: T.get(e.object.nid) ?? UNKNOWN };
  return nt ?? t;
};
// a member read by name: each member of the object's type, one report per kind of member lacking it
export const ixNamedMember = (ixUm, ixMemberless, ixInActionOnly, ixReportMissing, ixErr, ixFact, propT, isNamed, unwrap, named, union, show, ERR) => (K: IxK, C: IxCtls, env: IxEnv, e: MemberExpression, ot: Ty, name: string): Ty => {
  const out: Mut<Ty[]> = [], missing: Mut<Ty[]> = [];
  let flags: Flags | undefined;
  let bad = false;
  for (const m of ixUm(K.reg, ot)) {
    if (m.k === "err") { bad = true; out.push(ERR); continue; }
    if (ixMemberless(m)) { ixErr(K, C, e, "type", `${show(m)} has no members`); bad = true; continue; }
    if (K.reg.expand(m).k === "err") { bad = true; out.push(ERR); continue; }
    const p = K.reg.member(m, name);
    if (!p) { missing.push(m); bad = true; out.push(ERR); continue; }
    if (isNamed(unwrap(m), "State")) ixInActionOnly(K, C, env, e, "state-write", `State.${name} outside action(...)`);
    if (p.flags?.banned) ixErr(K, C, e, "banned-member", `${K.src.slice(e.object.start, e.object.end)}.${name} is banned`);
    flags = p.flags ?? flags;
    const pt = propT(p);
    out.push(isNamed(m, "Borrowed") && p.flags?.view && !K.reg.callSigs(pt).length ? named("Borrowed", pt) : pt);
  }
  ixReportMissing(K, C, missing, name, e.property);
  C.flagsAt = e.nid;
  C.flags = flags;
  ixFact(C, { k: "flags", at: e.nid, flags: flags ?? null });
  return bad && out.length === 0 ? ERR : union(out);
};
export const ixReportMissing = (ixIntrinsicName, ixMemberMissing, union) => (K: IxK, C: IxCtls, missing: Ty[], name: string, at: AstNode): void => {
  const nullish = (m: Ty) => m.k === "null" || m.k === "undef" || m.k === "void";
  const intr = (m: Ty) => !nullish(m) && m.k !== "unknown" && ixIntrinsicName(K.reg, m) !== null;
  const kinds = [missing.filter(nullish), missing.filter((m) => m.k === "unknown"), missing.filter(intr), missing.filter((m) => !nullish(m) && m.k !== "unknown" && !intr(m))];
  for (const g of kinds) {
    const g0 = g[0];
    if (g0 !== undefined) ixMemberMissing(K, C, g.length === 1 || nullish(g0) ? g0 : union(g), name, at, union(g));
  }
};
// a use that only an action body may make; in a function nested in an action body it is kept for own.ts (the fold
// drops it when the function is an action body by then)
export const ixInActionOnly = (ixErr, ixFact) => (K: IxK, C: IxCtls, env: IxEnv, at: AstNode, rule: string, msg: string): void => {
  if (!env.fi.inAction) ixErr(K, C, at, rule, msg);
  else ixFact(C, { k: "use", fi: env.fi.fid, at: at.nid, rule, msg });
};
// an index read; strict: Registry.strictIndex, which an assignment target turns off
export const ixIndex = (ixUm, ixErr, unwrap, isNamed, show, NUM, STR, UNDEF, ERR, union) => (K: IxK, C: IxCtls, ot: Ty, it: Ty, e: AstNode, strict: boolean): Ty => {
  const R = strict ? K.reg : K.reg.lax, si = strict && K.reg.strictIndex;
  const out: Mut<Ty[]> = [];
  for (const m0 of ixUm(R, ot)) {
    if (m0.k === "err" || it.k === "err") { out.push(ERR); continue; }
    const m = unwrap(m0), x = R.expand(m), numeric = R.sub(it, NUM);
    if (numeric && x.k === "tup" && it.k === "lit" && typeof it.v === "number") {
      const el = x.els[it.v];
      if (el !== undefined) out.push(el);
      else { ixErr(K, C, e, "type", `tuple ${show(x)} has no element ${it.v}`); out.push(ERR); }
      continue;
    }
    if (numeric && (x.k === "arr" || x.k === "tup" || x.k === "str" || (x.k === "lit" && typeof x.v === "string") || R.isTypedArray(x) || isNamed(x, "RegExpMatchArray"))) {
      out.push(R.iterElem(x) ?? ERR);
      if (si) out.push(UNDEF);
      continue;
    }
    const index = x.k === "rec" ? x.index : undefined;
    if (R.sub(it, STR) && index) { out.push(index); if (si) out.push(UNDEF); continue; }
    if (x.k === "null" || x.k === "undef") { ixErr(K, C, e, "possibly-undefined", `index into a value that may be ${show(x)}`); out.push(ERR); continue; }
    ixErr(K, C, e, "type", `cannot index ${show(m)} with ${show(it)}`);
    out.push(ERR);
  }
  return union(out);
};
export const ixExpect = (ixHides, ixErr, ixNonUndef, members, isNamed, show) => (K: IxK, C: IxCtls, at: AstNode, t: Ty, expected: Ty, ctx: boolean): boolean => {
  if (K.reg.sub(t, expected)) return ctx || ixHides(K, C, at, t, expected, null);
  let rule = "type";
  if (K.reg.sub(ixNonUndef(K.reg, t), expected)) rule = "possibly-undefined";
  else if (members(t).some((m) => isNamed(m, "Action")) && !members(expected).some((m) => isNamed(m, "Action"))) rule = "action-pass";
  ixErr(K, C, at, rule, `${show(t)} is not assignable to ${show(expected)}`);
  return false;
};
// { __proto__: v } sets the prototype, as the banned Object.setPrototypeOf does; every spelling of the key is refused
export const ixProtoKey = (ixErr) => (K: IxK, C: IxCtls, p: Property): void => {
  const k = p.key;
  if ((k.type === "Identifier" && k.name === "__proto__") || (k.type === "Literal" && k.value === "__proto__"))
    ixErr(K, C, p, "banned-member", "__proto__ as an object literal key is banned: it sets the prototype (Object.setPrototypeOf), and the prototype's members are not own properties");
};
