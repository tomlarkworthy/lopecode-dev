// Calls (lite/infer.ts call, apply, preludeCall, objectAssign, objectFreeze, settled, ctxOnly).

// the call is not checked; its arguments still are (a spread's operand only when asked)
export const ixBail = (ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, args: AstNode[], spread: boolean): Ty => {
  for (const a of args) K.infer(K, T, V, W, C, env, spread && a.type === "SpreadElement" ? a.argument : a);
  return ERR;
};
export const ixTypeArgs = (ixConvert) => (K: IxK, V: IxVars, env: IxEnv, n: AstNode | null): Ty[] | null => {
  if (n === null || n.type !== "TSTypeParameterInstantiation") return null;
  const out: Mut<Ty[]> = [];
  for (const t of n.params) out.push(ixConvert(K, V, env, t));
  return out;
};
export const ixCall = (ixLookup, ixPreludeCall, ixCompileCall, ixNewSigs, ixCallSigs, ixApplyAll, ixFact, ixGap, ixJsonArg) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode, expected: Ty | null): Ty => {
  if (e.type !== "CallExpression" && e.type !== "NewExpression") return ixGap(C, `call node ${e.type}`);
  const callee = e.callee;
  if (e.type === "CallExpression" && callee.type === "Identifier") {
    const b = ixLookup(V, env, callee.name);
    if (b?.kind === "prelude") return ixPreludeCall(K, T, V, W, C, env, e, callee.name, expected);
    if (b?.kind === "param" && b.t.k === "named" && b.t.n === "Compile") return ixCompileCall(K, T, V, W, C, env, e);
    if (b && (b.kind === "fn" || b.kind === "const") && b.fnNode >= 0) ixFact(C, { k: "helper", at: e.nid, id: b.id });
  }
  const found = e.type === "NewExpression" ? ixNewSigs(K, T, V, W, C, env, e) : ixCallSigs(K, T, V, W, C, env, e, expected);
  if (found.k === "done") return found.t;
  const t = ixApplyAll(K, T, V, W, C, env, e, found.sigs, expected, found.view);
  ixJsonArg(K, T, V, C, env, e);
  return t;
};
// w1 (2026-11-24, A-4): JSON.stringify of undefined or a function gives undefined, not the string it is typed as; an
// argument that may be one is refused
export const ixJsonArg = (ixLookup, ixErr, show, jsonGapWith) => (K: IxK, T: IxTypes, V: IxVars, C: IxCtls, env: IxEnv, e: AstNode): void => {
  if (e.type !== "CallExpression") return;
  const c = e.callee, a = e.arguments[0];
  if (c.type !== "MemberExpression" || c.computed || c.object.type !== "Identifier" || c.object.name !== "JSON" || c.property.type !== "Identifier" || c.property.name !== "stringify" || ixLookup(V, env, "JSON")?.kind !== "global") return;
  const at = a === undefined ? undefined : T.get(a.nid);
  const w = at === undefined ? null : jsonGapWith({ isAlias: K.reg.quiet.isAlias, expand: K.reg.quiet.expand, member: K.reg.quiet.member })(at);
  if (a !== undefined && at !== undefined && w !== null) ixErr(K, C, a, "type", `JSON.stringify gives undefined, not a string, for undefined or a function, and its argument ${show(at)} may be ${w}: give it a value that is neither (JSON.stringify(x ?? null) when x may be undefined)`);
};
export type IxSigs = { k: "done"; t: Ty } | { k: "sigs"; sigs: Fn[]; view: boolean };
export const ixNewSigs = (ixLookup, ixErr, ixUnsup, ixBail) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: NewExpression): IxSigs => {
  const callee = e.callee;
  if (callee.type !== "Identifier" || ixLookup(V, env, callee.name)?.kind !== "global") {
    ixErr(K, C, e, "new-non-intrinsic", "new on something that is not an allowed intrinsic");
    return { k: "done", t: ixBail(K, T, V, W, C, env, e.arguments, false) };
  }
  const x = K.reg.expand(K.infer(K, T, V, W, C, env, callee));
  const sigs = x.k === "rec" ? (x.ctors ?? []) : [];
  if (!sigs.length) { ixUnsup(K, C, e, `new ${callee.name}`); return { k: "done", t: ixBail(K, T, V, W, C, env, e.arguments, false) }; }
  return { k: "sigs", sigs, view: false };
};
// Object.assign and Object.freeze on the global Object, and structuredClone, have rules of their own
export const ixSpecialCall = (ixLookup, ixObjectAssign, ixObjectFreeze, ixCloneCall) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: CallExpression, expected: Ty | null): Ty | null => {
  const callee = e.callee;
  if (callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "Object" && !callee.computed && ixLookup(V, env, "Object")?.kind === "global" && callee.property.type === "Identifier") {
    if (callee.property.name === "assign") return ixObjectAssign(K, T, V, W, C, env, e);
    if (callee.property.name === "freeze") return ixObjectFreeze(K, T, V, W, C, env, e, expected);
  }
  if (callee.type === "Identifier" && callee.name === "structuredClone" && ixLookup(V, env, callee.name)?.kind === "global") return ixCloneCall(K, T, V, W, C, env, e, callee, expected);
  return null;
};
export const ixCallSigs = (ixSpecialCall, ixWriteRule, ixBail, ixUm, ixNonNullish, ixInActionOnly, ixActionFn, ixNotCallable, ixErr, show, isNamed) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: CallExpression, expected: Ty | null): IxSigs => {
  const special = ixSpecialCall(K, T, V, W, C, env, e, expected);
  if (special !== null) return { k: "done", t: special };
  const callee = e.callee, calleeT = K.infer(K, T, V, W, C, env, callee);
  const m = callee.type === "ChainExpression" ? callee.expression : callee;
  const fl = m.type === "MemberExpression" && C.flagsAt === m.nid ? C.flags : undefined;
  if (m.type === "MemberExpression" && fl?.mutates) ixWriteRule(K, T, V, W, C, env, m.object, e, "mutating-method");
  if (calleeT.k === "err") return { k: "done", t: ixBail(K, T, V, W, C, env, e.arguments, true) };
  const isShort = e.optional === true || C.short.has(callee.nid);
  if (isShort) C.short = new Set([...C.short, e.nid]);
  const ms = ixUm(K.reg, isShort ? ixNonNullish(K.reg, calleeT) : calleeT);
  const view = m.type === "MemberExpression" && !!fl?.view && isNamed(T.get(m.object.nid) ?? { k: "err" }, "Borrowed");
  const action = ms.find((x) => isNamed(x, "Action"));
  if (action !== undefined && action.k === "named") {
    ixInActionOnly(K, C, env, e, "action-call", "an Action called outside action(...)");
    return { k: "sigs", sigs: [ixActionFn(action.args[0] ?? { k: "tup", els: [] })], view };
  }
  const m0 = ms[0];
  if (ms.length !== 1 || m0 === undefined) { ixErr(K, C, e, "type", `call of ${show(calleeT)}`); return { k: "done", t: ixBail(K, T, V, W, C, env, e.arguments, false) }; }
  const sigs = K.reg.callSigs(m0);
  if (sigs.length) return { k: "sigs", sigs, view };
  ixNotCallable(K, C, e, m0);
  return { k: "done", t: ixBail(K, T, V, W, C, env, e.arguments, false) };
};
export const ixNotCallable = (ixErr, show) => (K: IxK, C: IxCtls, e: AstNode, m: Ty): void => {
  if (m.k === "null" || m.k === "undef") ixErr(K, C, e, "possibly-undefined", `call of a value that may be ${show(m)}`);
  else ixErr(K, C, e, "type", `${show(m)} is not callable`);
};
// one signature, or each overload in turn until one gives no new diagnostic (the others are rolled back)
export const ixApplyAll = (ixTypeArgs, ixApply, ixMark, ixCopyFlow, named, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: CallExpression | NewExpression, sigs: Fn[], expected: Ty | null, view: boolean): Ty => {
  const explicit = ixTypeArgs(K, V, env, e.typeArguments);
  let t: Ty = ERR;
  for (const [i, sig] of sigs.entries()) {
    const mark = ixMark(K, C), flow = ixCopyFlow(W, C, C.cur);
    t = ixApply(K, T, V, W, C, env, e, sig, expected, explicit);
    const fl = sig.flags;
    C.freshAt = fl !== undefined && !!fl.intrinsic && !!fl.fresh && !fl.view && !view ? e.nid : -1;
    if (sigs.length === 1) break;
    const now = ixMark(K, C);
    if ((now.d?.n ?? 0) === (mark.d?.n ?? 0) && (now.u?.n ?? 0) === (mark.u?.n ?? 0)) break;
    if (i < sigs.length - 1) { C.diags = mark.d; C.unsup = mark.u; C.cur = flow; }
  }
  return view ? named("Borrowed", t) : t;
};
export const ixCloneCall = (ixApply, ixErr, show, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: CallExpression, callee: Identifier, expected: Ty | null): Ty => {
  C.clones = new Set([...C.clones, callee.nid]);
  const sig = K.reg.callSigs(K.infer(K, T, V, W, C, env, callee))[0];
  if (sig === undefined) return ERR;
  const t = ixApply(K, T, V, W, C, env, e, sig, expected, null);
  const a = e.arguments[0], at = a === undefined ? undefined : T.get(a.nid);
  const w = a !== undefined && at !== undefined ? K.reg.cloneProblem(at) : null;
  if (a !== undefined && at !== undefined && w) ixErr(K, C, a, "type", `structuredClone of ${show(at)}, which ${w}: the clone would throw or lose it`);
  C.freshAt = e.nid;
  return t;
};
export const ixObjectAssign = (ixErr, ixUnsup, isNamed, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: CallExpression): Ty => {
  const target = e.arguments[0];
  const tt = target !== undefined ? K.infer(K, T, V, W, C, env, target) : ERR;
  if (target === undefined || (target.type !== "ObjectExpression" && !isNamed(tt, "Mut"))) ixErr(K, C, e, "object-assign", "Object.assign onto an existing value");
  for (const s of e.arguments.slice(1)) K.infer(K, T, V, W, C, env, s);
  ixUnsup(K, C, e, "Object.assign");
  return ERR;
};
// Object.freeze of a literal: the value is the cell's own, so freezing it changes nothing another cell holds
export const ixObjectFreeze = (ixErr, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: CallExpression, expected: Ty | null): Ty => {
  const a = e.arguments[0];
  if (e.arguments.length === 1 && a !== undefined && (a.type === "ObjectExpression" || a.type === "ArrayExpression")) return K.check(K, T, V, W, C, env, a, expected, false, false);
  ixErr(K, C, e, "object-freeze", "Object.freeze takes one object or array literal");
  for (const x of e.arguments) K.infer(K, T, V, W, C, env, x.type === "SpreadElement" ? x.argument : x);
  return ERR;
};
// compile({ inputs, refs, outputs, options }): typed from the cell graph by core.ts; the port infers the options
export const ixCompileCall = (ixUnsup, ixGap, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: CallExpression): Ty => {
  const hook = K.reg.compile;
  if (hook === null) { ixUnsup(K, C, e, "compile outside a module check"); return ERR; }
  const first = hook(e, null);
  if (first.k === "done") return first.t;
  const second = hook(e, K.infer(K, T, V, W, C, env, first.at));
  return second.k === "done" ? second.t : ixGap(C, "compile hook asked for a second type");
};
