// Statements (lite/infer.ts stmts, block, stmt, varDecl, loop, switchStmt): each returns false when the end is
// unreachable. stmt is a dispatch over two families.

export const ixStmts = (ixCopyFlow) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, list: AstNode[]): boolean => {
  let live = true;
  for (const s of list) {
    if (live) { live = K.stmt(K, T, V, W, C, env, s); continue; }
    const own = C.cur;
    C.cur = ixCopyFlow(W, C, own);
    K.stmt(K, T, V, W, C, { ...env, dead: true }, s);
    C.cur = own;
  }
  return live;
};
export const ixBlock = (ixNewScope, ixHoist, ixStmts) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, list: AstNode[]): boolean => {
  const inner = ixNewScope(C, env);
  ixHoist(K, V, C, inner, list);
  return ixStmts(K, T, V, W, C, inner, list);
};
export const ixSub1 = (ixBlock) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: AstNode): boolean =>
  s.type === "BlockStatement" ? ixBlock(K, T, V, W, C, env, s.body) : K.stmt(K, T, V, W, C, env, s);
export const ixStmt = (ixStmtSimple, ixStmtFlow, ixUnsup, ixGap, nodeKind) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: AstNode): boolean => {
  if (s.type === "Other") { ixGap(C, `statement ${s.kind} (Other)`); return true; }
  const r = ixStmtSimple(K, T, V, W, C, env, s) ?? ixStmtFlow(K, T, V, W, C, env, s);
  if (r !== null) return r;
  ixUnsup(K, C, s, nodeKind(s));
  return true;
};
export const ixStmtSimple = (ixBlock, ixVarDecl, ixFnDeclStmt, ixReturn, ixBreak, ixHides, ixDeclare, ixNoExtra, ixUnsup, UNKNOWN, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: AstNode): boolean | null => {
  switch (s.type) {
    case "BlockStatement": return ixBlock(K, T, V, W, C, env, s.body);
    case "EmptyStatement": return true;
    case "ExpressionStatement": return K.infer(K, T, V, W, C, env, s.expression).k !== "never";
    case "VariableDeclaration": for (const d of s.declarations) ixVarDecl(K, T, V, W, C, env, d, s.kind); return true;
    case "FunctionDeclaration": ixFnDeclStmt(K, T, V, W, C, env, s); return true;
    case "ReturnStatement": return ixReturn(K, T, V, W, C, env, s);
    // a catch takes it as unknown
    case "ThrowStatement": ixHides(K, C, s.argument, K.infer(K, T, V, W, C, env, s.argument), UNKNOWN, null); return false;
    case "BreakStatement": case "ContinueStatement": return ixBreak(K, W, C, env, s);
    case "ClassDeclaration": if (s.id.type === "Identifier") ixDeclare(V, C, env, s.id.name, ERR, "const", s.id, ixNoExtra, { k: "none" }, false, -1); return true;
    case "ForInStatement": ixUnsup(K, C, s, "for...in"); return true;
    case "LabeledStatement": ixUnsup(K, C, s, "label"); return true;
    case "TSTypeAliasDeclaration": case "TSInterfaceDeclaration": ixUnsup(K, C, s, "local type declaration"); return true;
    default: return null;
  }
};
export const ixStmtFlow = (ixIf, ixLoop, ixForOf, ixTry, ixSwitch) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: AstNode): boolean | null => {
  switch (s.type) {
    case "IfStatement": return ixIf(K, T, V, W, C, env, s);
    case "WhileStatement": case "DoWhileStatement": case "ForStatement": return ixLoop(K, T, V, W, C, env, s);
    case "ForOfStatement": return ixForOf(K, T, V, W, C, env, s);
    case "TryStatement": return ixTry(K, T, V, W, C, env, s);
    case "SwitchStatement": return ixSwitch(K, T, V, W, C, env, s);
    default: return null;
  }
};
export const ixReturn = (ixReturned, ixErr, show, UNDEF) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: ReturnStatement): boolean => {
  const a = s.argument, ctx = env.fi.retCtx;
  const t = a !== null ? ixReturned(K, T, V, W, C, env, a) : UNDEF;
  if (a === null && ctx !== null && !K.reg.sub(UNDEF, ctx)) ixErr(K, C, s, "type", `return without a value from a function returning ${show(ctx)}`);
  C.rets = [...C.rets, t];
  return false;
};
// a break of the innermost switch takes the flow with it; a loop's exit flow is its head
export const ixBreak = (ixUnsup, ixCopyFlow) => (K: IxK, W: IxFlows, C: IxCtls, env: IxEnv, s: AstNode): boolean => {
  const label = s.type === "BreakStatement" || s.type === "ContinueStatement" ? s.label : null;
  const top = C.breaks;
  if (label !== null) ixUnsup(K, C, s, "labelled break/continue");
  else if (s.type === "BreakStatement" && !env.dead && top !== null && top.exits !== null) C.breaks = { exits: [...top.exits, ixCopyFlow(W, C, C.cur)], next: top.next };
  return false;
};
// a function declaration's body, checked where it stands unless a read checked it first
export const ixFnDeclStmt = (ixLookup, ixUpdate, ixCopyFlow) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: FunctionDeclaration): void => {
  const b = s.id.type === "Identifier" ? ixLookup(V, env, s.id.name) : undefined;
  if (!b || b.checked) return;
  ixUpdate(V, C, { ...b, checked: true });
  const own = C.cur;
  C.cur = ixCopyFlow(W, C, own);
  const f = K.fnExpr(K, T, V, W, C, env, s, null, null);
  C.cur = own;
  ixUpdate(V, C, { ...b, checked: true, t: b.t.k === "err" ? f : b.t, lazy: { k: "none" } });
};
// an annotation under which a fresh value is writable (S4.1): an array or tuple type, a type literal with no readonly
// member, or one of the mutable intrinsics; any other (readonly, a union, an alias, Readonly<…>, typeof) is not
export const ixWritableAnn = () => (ann: AstNode): boolean => {
  if (ann.type === "TSArrayType" || ann.type === "TSTupleType") return true;
  // e1 (2026-11-23), B4: an index signature with no readonly is writable as a property is
  if (ann.type === "TSTypeLiteral") return ann.members.every((m) => (m.type === "TSPropertySignature" || m.type === "TSIndexSignature") && m.readonly !== true);
  const names = ["Array", "Map", "Set", "WeakMap", "WeakSet", "Record", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array", "Float64Array", "BigInt64Array", "BigUint64Array"];
  return ann.type === "TSTypeReference" && ann.typeName.type === "Identifier" && names.includes(ann.typeName.name);
};
export const ixVarDecl = (ixAnnOf, ixWritableAnn, ixConvert, ixVarFn, ixDeclare, ixNoExtra, ixLookup, ixFlowSet, ixErr, ixUnsup, widen, named, isNamed, unwrap, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, d: AstNode, kind: string): void => {
  if (d.type !== "VariableDeclarator") { ixUnsup(K, C, d, `declarator ${d.type}`); return; }
  const k: IxKind = kind === "const" ? "const" : "let", id = d.id, init = d.init;
  const ann = ixAnnOf(id), declared = ann !== null ? ixConvert(K, V, env, ann) : null;
  const fnInit = init !== null && (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression");
  if (id.type === "Identifier" && init !== null && fnInit && k === "const") return ixVarFn(K, T, V, W, C, env, id, init, declared, init, init.nid);
  // const f = memo((…): R => …): bound before the call is checked, so the memoised function can call itself (S2.13)
  const m = init !== null && init.type === "CallExpression" && init.callee.type === "Identifier" && init.callee.name === "memo" && ixLookup(V, env, "memo")?.kind === "prelude" ? init.arguments[0] : undefined;
  if (id.type === "Identifier" && init !== null && m !== undefined && (m.type === "ArrowFunctionExpression" || m.type === "FunctionExpression") && k === "const") return ixVarFn(K, T, V, W, C, env, id, init, declared, m, -1);
  if (init === null) {
    if (k === "const") ixErr(K, C, d, "type", "const without initializer");
    if (declared === null) ixUnsup(K, C, d, "let without a type or initializer");
    K.bind(K, T, V, W, C, env, id, declared ?? ERR, k, ixNoExtra);
    return;
  }
  const t0 = K.check(K, T, V, W, C, env, init, declared, false, false);
  // S4.1: a fresh value (a literal, new or a call of a fresh intrinsic) bound to a local is a Mut, annotated or not
  const fresh = (declared === null || ann === null || (!isNamed(declared, "Mut") && ixWritableAnn(ann))) && t0.k !== "err" && !isNamed(t0, "Mut") && (init.type === "ArrayExpression" || init.type === "ObjectExpression" || C.freshAt === init.nid);
  const t = fresh ? named("Mut", declared ?? (k === "let" ? widen(t0) : t0)) : t0;
  const isMut = fresh || (init.type === "CallExpression" && init.callee.type === "Identifier" && init.callee.name === "mut" && ixLookup(V, env, "mut")?.kind === "prelude");
  if (id.type !== "Identifier") return K.bind(K, T, V, W, C, env, id, declared ?? unwrap(t0), k, ixNoExtra);
  const b = ixDeclare(V, C, env, id.name, declared !== null ? (fresh && k === "const" ? t : declared) : k === "let" && !fresh ? widen(t) : t, k, id, ixNoExtra, { k: "none" }, isMut, fnInit ? init.nid : -1);
  if (k === "let" && declared !== null) ixFlowSet(W, C.cur, "#" + b.id, K.reg.sub(t, declared) ? t : declared);
};
// const f = (…) => …: bound before its body is checked, so it can call itself (with annotations); sig: the function
// whose annotations give the type (init, or the function memo(...) is given); fnNode: the function f names, or -1
export const ixVarFn = (ixAnnotatedSig, ixDeclare, ixNoExtra, ixUpdate, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, id: Identifier, init: AstNode, declared: Ty | null, sig: AstNode, fnNode: number): void => {
  const pre = declared ?? ixAnnotatedSig(K, V, C, env, sig);
  const b = ixDeclare(V, C, env, id.name, pre ?? ERR, "const", id, ixNoExtra, pre ? { k: "none" } : { k: "unsup", at: sig }, false, fnNode);
  const t = K.check(K, T, V, W, C, env, init, declared, false, false);
  ixUpdate(V, C, { ...b, t: declared ?? t, lazy: { k: "none" } });
};
export const ixIf = (ixSub1, ixJoin2) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: IfStatement): boolean => {
  const c = K.cond(K, T, V, W, C, env, s.test);
  const own = C.cur;
  C.cur = c.t;
  const la = ixSub1(K, T, V, W, C, env, s.consequent);
  const af = C.cur;
  C.cur = c.f;
  const alt = s.alternate;
  const lb = alt !== null ? ixSub1(K, T, V, W, C, env, alt) : true;
  const bf = C.cur;
  if (!la && !lb) { C.cur = own; return false; }
  C.cur = la && lb ? ixJoin2(W, C, af, bf) : la ? af : bf;
  return true;
};
