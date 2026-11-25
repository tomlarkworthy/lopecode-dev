// Functions (lite/infer.ts fnExpr, returned, annotatedSig, assignedNames, hoist): a function's parameters are
// bound in a new scope, its body checked with the returns and yields of its own, and its type built from them.

// the type annotation of a parameter or pattern (the node inside its TSTypeAnnotation)
export const ixAnnOf = () => (p: AstNode): AstNode | null => {
  const id = p.type === "AssignmentPattern" ? p.left : p;
  const a = id.type === "Identifier" || id.type === "ObjectPattern" || id.type === "ArrayPattern" || id.type === "RestElement" ? id.typeAnnotation : null;
  return a !== null && a.type === "TSTypeAnnotation" ? a.typeAnnotation : null;
};
// the names of a type parameter declaration
export const ixTpNames = () => (n: AstNode | null): string[] =>
  n === null || n.type !== "TSTypeParameterDeclaration" ? [] : n.params.flatMap((x) => (x.type === "TSTypeParameter" ? [x.name] : []));
export type IxFnParts = { params: AstNode[]; body: AstNode; returnType: AstNode | null; typeParameters: AstNode | null; id: AstNode | null; async: boolean; generator: boolean; decl: boolean };
// the fields fnExpr reads, for the three function node types
export const ixFnParts = () => (e: AstNode): IxFnParts | null => {
  if (e.type === "ArrowFunctionExpression") return { params: e.params, body: e.body, returnType: e.returnType, typeParameters: e.typeParameters, id: null, async: e.async, generator: e.generator, decl: false };
  if (e.type === "FunctionExpression") return { params: e.params, body: e.body, returnType: e.returnType, typeParameters: e.typeParameters, id: e.id, async: e.async, generator: e.generator, decl: false };
  if (e.type === "FunctionDeclaration") return { params: e.params, body: e.body, returnType: e.returnType, typeParameters: e.typeParameters, id: e.id, async: e.async, generator: e.generator, decl: true };
  return null;
};
// the names assignments and updates under n write (patternNames over the left sides)
export const ixAssignedNames = (kidsOf) => (n: AstNode): Set<string> => {
  const out: Mut<Set<string>> = new Set();
  const names = (p: AstNode | null): void => {
    if (p === null) return;
    if (p.type === "Identifier") out.add(p.name);
    else if (p.type === "ArrayPattern") for (const x of p.elements) names(x);
    else if (p.type === "ObjectPattern") for (const x of p.properties) names(x.type === "RestElement" ? x.argument : x.type === "Property" ? x.value : null);
    else if (p.type === "AssignmentPattern") names(p.left);
    else if (p.type === "RestElement") names(p.argument);
  };
  const walk = (x: AstNode): void => {
    if (x.type === "AssignmentExpression") names(x.left);
    if (x.type === "UpdateExpression" && x.argument.type === "Identifier") out.add(x.argument.name);
    for (const k of kidsOf(x)) walk(k);
  };
  walk(n);
  return out;
};
// a function whose parameters and return type are all annotated has a signature before its body is checked
export const ixAnnotatedSig = (ixFnParts, ixAnnOf, ixDrain, ixTps, ixLookTable, isNamed, named) => (K: IxK, V: IxVars, C: IxCtls, env: IxEnv, e: AstNode): Fn | null => {
  const f = ixFnParts(e);
  if (f === null || f.returnType === null || f.typeParameters !== null || f.params.some((p) => ixAnnOf(p) === null)) return null;
  const ret = f.returnType;
  if (ret.type !== "TSTypeAnnotation") return null;
  const look = [...f.params, ret].some((p) => K.reg.hasTypeQuery(p)) ? ixLookTable(V, env) : null;
  ixDrain(K, C);
  const sig = K.reg.sig(f.params, ret.typeAnnotation, ixTps(env), look);
  K.reg.drain();
  return f.async && !f.generator && !isNamed(K.reg.expand(sig.ret), "Promise") ? { ...sig, ret: named("Promise", sig.ret) } : sig;
};
// the narrowings a closure keeps: those of const roots, functions and parameters never assigned
export const ixClosureFlow = (ixFlowOf, ixPathOf, ixFindBinding) => (V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv): IxFlow => {
  const out: Mut<IxFlow> = new Map();
  for (const [k, t] of ixFlowOf(W, C.cur)) {
    const id = Number(ixPathOf(k).slice(1).split(".")[0]);
    const b = ixFindBinding(V, env, id);
    if (b && (b.kind === "const" || b.kind === "fn" || (b.kind === "param" && !b.assigned))) out.set(k, t);
  }
  return out;
};
// a returned value, checked against the return context
// e1 (2026-11-23), B4: an async function that returns a promise resolves to what the promise resolves to, as await does
export const ixReturned = (ixAwaited, members, isNamed, named, union) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode): Ty => {
  const fi = env.fi, r = fi.retCtx, ctx = r !== null && fi.isAsync && !fi.isGen ? union([r, named("Promise", r)]) : r;
  const t = K.check(K, T, V, W, C, env, e, ctx, false, fi.retFromCtx);
  if (fi.isAsync && !fi.isGen && members(K.reg.expand(t)).some((m) => isNamed(K.reg.expand(m), "Promise"))) return ixAwaited(K.reg, t, false);
  return t;
};
// Function declarations are hoisted: bound first, their bodies checked in order (or on the first read)
// w1 (2026-11-24, S-1): each name a const or let of the block declares is bound first too, as a later binding, so a
// read before its declaration (in the block or in a function made there) is that binding and not one outside
export const ixLaterNames = () => (s: AstNode): Identifier[] => {
  const out: Mut<Identifier[]> = [];
  const pat = (p: AstNode | null): void => {
    if (p === null) return;
    if (p.type === "Identifier") out.push(p);
    else if (p.type === "ObjectPattern") { for (const x of p.properties) pat(x.type === "Property" ? x.value : x.type === "RestElement" ? x.argument : null); }
    else if (p.type === "ArrayPattern") { for (const x of p.elements) pat(x); }
    else if (p.type === "AssignmentPattern") pat(p.left);
    else if (p.type === "RestElement") pat(p.argument);
  };
  if (s.type === "VariableDeclaration" && s.kind !== "var") for (const d of s.declarations) if (d.type === "VariableDeclarator") pat(d.id);
  return out;
};
export const ixHoist = (ixAnnotatedSig, ixDeclare, ixNoExtra, ixLaterNames, ERR) => (K: IxK, V: IxVars, C: IxCtls, env: IxEnv, body: AstNode[]): void => {
  for (const s of body) for (const id of ixLaterNames(s)) ixDeclare(V, C, env, id.name, ERR, "const", id, ixNoExtra, { k: "later", at: id }, false, -1);
  for (const s of body) {
    if (s.type !== "FunctionDeclaration" || s.id.type !== "Identifier") continue;
    const sig = ixAnnotatedSig(K, V, C, env, s);
    ixDeclare(V, C, env, s.id.name, sig ?? ERR, "fn", s.id, ixNoExtra, sig ? { k: "none" } : { k: "hoist", fn: s, env, busy: false }, false, s.nid);
  }
};
// a named function expression is bound in its own scope, so its body can call it (with annotations)
export const ixSelfName = (ixAnnotatedSig, ixDeclare, ixNoExtra, ERR) => (K: IxK, V: IxVars, C: IxCtls, inner: IxEnv, e: AstNode, f: IxFnParts): void => {
  const fid = f.id;
  if (f.decl || fid === null || fid.type !== "Identifier") return;
  const pre = ixAnnotatedSig(K, V, C, inner, e);
  ixDeclare(V, C, inner, fid.name, pre ?? ERR, "fn", fid, ixNoExtra, pre ? { k: "none" } : { k: "unsup", at: e }, false, e.nid);
};
export const ixTpBounds = (ixUnsup) => (K: IxK, C: IxCtls, f: IxFnParts): void => {
  const tp = f.typeParameters;
  if (tp === null || tp.type !== "TSTypeParameterDeclaration") return;
  for (const x of tp.params) if (x.type === "TSTypeParameter" && (x.constraint !== null || x.default !== null)) ixUnsup(K, C, x, "type parameter constraint/default");
};
// d1 (2026-11-24): the names assigned inside the functions nested anywhere in n (hoisted declarations, functions in
// initialisers, object-literal methods, at any depth): a let or parameter of that name is not narrowed (S3.11)
export const ixNestedAssigned = (ixAssignedNames, kidsOf) => (n: AstNode): Set<string> => {
  const out: Mut<Set<string>> = new Set();
  const walk = (x: AstNode): void => {
    if (x.type === "ArrowFunctionExpression" || x.type === "FunctionExpression" || x.type === "FunctionDeclaration") { for (const s of ixAssignedNames(x)) out.add(s); return; }
    for (const k of kidsOf(x)) walk(k);
  };
  walk(n);
  return out;
};
export const ixFnExpr = (ixFnParts, ixClosureFlow, ixNewFlow, ixSelfName, ixTpBounds, ixAssignedNames, ixNestedAssigned, ixParams, ixRetCtx, ixFnBody, ixFnRet, ixTpNames, ixGap) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv | null, e: AstNode, expected: Ty | null, injected: Ty[] | null): Ty => {
  const f = ixFnParts(e);
  if (f === null) return ixGap(C, `function node ${e.type}`);
  const ctxSig = expected === null ? undefined : K.reg.callSigs(expected).filter((s) => !s.tps.length)[0];
  const fi0: IxFnCtx = { fid: e.nid, parent: env?.fi ?? null, isAsync: f.async, isGen: f.generator, isCell: injected !== null, inAction: !!env?.fi.inAction, retCtx: null, retFromCtx: false, yieldCtx: null, tps: ixTpNames(f.typeParameters), writes: ixNestedAssigned(f.body), assigns: ixAssignedNames(f.body) };
  const own = C.cur, rets = C.rets, yields = C.yields;
  C.cur = ixNewFlow(W, C, env === null ? new Map() : ixClosureFlow(V, W, C, env));
  C.rets = [];
  C.yields = [];
  C.nextScope += 1;
  const inner0: IxEnv = { scope: C.nextScope, up: env === null ? { id: 0, up: null } : { id: env.scope, up: env.up }, fi: fi0, dead: false };
  ixSelfName(K, V, C, inner0, e, f);
  const ps = ixParams(K, T, V, W, C, inner0, f.params, ctxSig, injected, ixAssignedNames(f.body));
  const rc = ixRetCtx(K, T, V, W, C, inner0, f, ctxSig);
  const inner: IxEnv = { ...inner0, fi: rc.fi };
  const reachable = ixFnBody(K, T, V, W, C, inner, f.body);
  const ret = ixFnRet(K, C, e, f, rc, reachable);
  ixTpBounds(K, C, f);
  C.cur = own;
  C.rets = rets;
  C.yields = yields;
  return { k: "fn", tps: ixTpNames(f.typeParameters), ps: ps.ps, rest: ps.rest, ret };
};
export const ixFnBody = (ixHoist, ixStmts, ixReturned) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, body: AstNode): boolean => {
  if (body.type === "BlockStatement") {
    ixHoist(K, V, C, env, body.body);
    return ixStmts(K, T, V, W, C, env, body.body);
  }
  const t = ixReturned(K, T, V, W, C, env, body);
  C.rets = [...C.rets, t];
  return false;
};
export type IxParamsOut = { ps: Param[]; rest: Ty | undefined };
export const ixParams = (ixParam) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, params: AstNode[], ctxSig: Fn | undefined, injected: Ty[] | null, assigned: Set<string>): IxParamsOut => {
  const ps: Mut<Param[]> = [];
  let rest: Ty | undefined;
  for (const [i, p] of params.entries()) {
    const r = ixParam(K, T, V, W, C, env, p, i, ctxSig, injected, assigned);
    if (r.rest) rest = r.t;
    else ps.push({ n: r.n, t: r.t, opt: r.opt });
  }
  return { ps: ps, rest };
};
// one parameter: its type from the annotation, the cell's injection or the context; then bound
export const ixParamType = (ixAnnOf, ixConvert, ixErr, show, arr, UNKNOWN, UNDEF, ERR) => (K: IxK, V: IxVars, C: IxCtls, env: IxEnv, p: AstNode, i: number, ctxSig: Fn | undefined, injected: Ty[] | null): Ty => {
  const ann = ixAnnOf(p);
  let t: Ty;
  if (ann !== null) t = ixConvert(K, V, env, ann);
  else if (injected !== null) t = injected[i] ?? ERR;
  else if (ctxSig) {
    if (i >= ctxSig.ps.length && !ctxSig.rest && p.type !== "RestElement") ixErr(K, C, p, "arity", `callback takes more parameters than its context provides: remove the parameters after the first ${ctxSig.ps.length}`);
    t = p.type === "RestElement" ? arr(ctxSig.rest ?? UNKNOWN) : (ctxSig.ps[i]?.t ?? ctxSig.rest ?? UNDEF);
  } else { ixErr(K, C, p, "untyped-parameter", "parameter has no type and no contextual type"); t = ERR; }
  const ct = ctxSig && ann !== null && injected === null ? ctxSig.ps[i]?.t : undefined;
  if (ct && !K.reg.sub(ct, t)) ixErr(K, C, p, "type", `parameter ${show(t)} does not accept ${show(ct)}`);
  return t;
};
export const ixParam = (ixParamType, union, UNDEF, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, p: AstNode, i: number, ctxSig: Fn | undefined, injected: Ty[] | null, assigned: Set<string>): { n: string; t: Ty; opt: boolean; rest: boolean } => {
  const t = ixParamType(K, V, C, env, p, i, ctxSig, injected);
  if (p.type === "RestElement") {
    K.bind(K, T, V, W, C, env, p.argument, t, "param", { assigned: false, cellParam: false });
    return { n: "", t: t.k === "arr" ? t.el : ERR, opt: false, rest: true };
  }
  const optional = p.type === "Identifier" && p.optional === true;
  const pt = optional ? union([t, UNDEF]) : t;
  const id = p.type === "AssignmentPattern" ? p.left : p;
  if (id.type === "Identifier") K.bind(K, T, V, W, C, env, p, pt, "param", { cellParam: injected !== null, assigned: assigned.has(id.name) });
  else K.bind(K, T, V, W, C, env, p, t, "param", { assigned: true, cellParam: false });
  return { n: p.type === "Identifier" ? p.name : `p${i}`, t: pt, opt: p.type === "AssignmentPattern" || optional, rest: false };
};
export type IxRetCtx = { fi: IxFnCtx; retAnn: Ty | null; ctxRet: Ty | null; declared: Ty | null };
// the return annotation, checked against async and generator, and the context the body's returns are checked against
export const ixRetCtx = (ixConvert, ixErr, ixAwaited, hasTv, isNamed, named, show, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, f: IxFnParts, ctxSig: Fn | undefined): IxRetCtx => {
  const fi = env.fi, rt = f.returnType;
  let retAnn: Ty | null = rt !== null && rt.type === "TSTypeAnnotation" ? ixConvert(K, V, env, rt.typeAnnotation) : null;
  let yieldCtx: Ty | null = null;
  if (rt !== null && retAnn !== null && fi.isAsync && !fi.isGen && retAnn.k !== "err" && !isNamed(K.reg.expand(retAnn), "Promise")) {
    ixErr(K, C, rt, "type", `an async function returns a Promise; its return type ${show(retAnn)} is not Promise<…>`);
    retAnn = named("Promise", retAnn);
  }
  if (rt !== null && retAnn !== null && fi.isGen && retAnn.k !== "err") {
    const g = K.reg.expand(retAnn);
    if (g.k === "named" && g.n === "Generator") yieldCtx = g.args[0] ?? null;
    else { ixErr(K, C, rt, "type", `a generator function returns a Generator; its return type ${show(retAnn)} is not Generator<…>`); retAnn = ERR; }
  }
  const ctxRet = retAnn === null && ctxSig && !hasTv(ctxSig.ret) ? ctxSig.ret : null;
  const declared = retAnn ?? ctxRet;
  // x1 (2026-11-24, V): a void result, declared or from the context, checks each return: void takes undefined only
  const retCtx = declared !== null && !fi.isGen ? (fi.isAsync ? ixAwaited(K.reg, declared, true) : declared) : null;
  return { fi: { ...fi, retCtx, yieldCtx, retFromCtx: retAnn === null && ctxRet !== null }, retAnn, ctxRet, declared };
};
// the function's return type: its annotation, or what its returns and yields give
export const ixFnRet = (ixErr, union, widen, named, show, UNDEF, VOID, NEVER) => (K: IxK, C: IxCtls, e: AstNode, f: IxFnParts, rc: IxRetCtx, reachable: boolean): Ty => {
  const fi = rc.fi, retAnn = rc.retAnn, rets = C.rets;
  if (fi.isGen) {
    const y = union(C.yields);
    return retAnn ?? named("Generator", y.k === "never" ? UNDEF : rc.ctxRet ? y : widen(y));
  }
  const r0 = union(reachable && rets.length ? [...rets, UNDEF] : rets.length ? rets : [reachable ? VOID : NEVER]);
  const r = rc.declared === null ? widen(r0) : r0;
  if (retAnn && !fi.isAsync && retAnn.k !== "void" && reachable && f.body.type === "BlockStatement" && retAnn.k !== "err" && !K.reg.sub(UNDEF, retAnn) && retAnn.k !== "never")
    ixErr(K, C, e, "type", `function lacks an ending return statement and its return type ${show(retAnn)} does not include undefined`);
  return fi.isAsync ? (retAnn ?? named("Promise", r)) : (retAnn ?? (rc.ctxRet && rc.ctxRet.k === "void" ? VOID : r));
};
// await: a member that may be a thenable other than a Promise gives unknown; declared: an async function's return
// annotation, where the member is the type returned, not awaited
export const ixAwaited = (ixUm, union, UNKNOWN) => (R: IxRegCore, t: Ty, declared: boolean): Ty =>
  union(ixUm(R, t).map((m) => (m.k === "named" && m.n === "Promise" ? m.args[0] ?? m : !declared && (m.k === "object" || R.member(m, "then")) ? UNKNOWN : m)));
