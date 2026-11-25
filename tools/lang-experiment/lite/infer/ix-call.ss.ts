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
export const ixCall = (ixFlatMapArg, ixSplitLiteral, ixLookup, ixPreludeCall, ixCompileCall, ixNewSigs, ixCallSigs, ixApplyAll, ixFact, ixGap, ixJsonArg) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode, expected: Ty | null): Ty => {
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
  ixFlatMapArg(K, T, C, e);
  return ixSplitLiteral(K, T, e, t);
};
// open part 5 (SG): split by a regexp literal with no capture group gives strings only (intrinsics.ts types a RegExp
// separator's result (string | undefined)[]); the groups are counted by the regexp itself: a match of "" by p|
export const ixSplitLiteral = (STR) => (K: IxK, T: IxTypes, e: AstNode, t: Ty): Ty => {
  if (e.type !== "CallExpression" || t.k !== "arr") return t;
  const c = e.callee, a = e.arguments[0];
  if (c.type !== "MemberExpression" || c.computed || c.property.type !== "Identifier" || c.property.name !== "split" || a === undefined || a.type !== "Literal" || a.regex === null) return t;
  const recv = T.get(c.object.nid);
  if (recv === undefined || !K.reg.sub(recv, STR)) return t;
  let groups = 1;
  try { groups = (new RegExp(`${a.regex.pattern}|`, a.regex.flags.replace(/[gy]/g, "")).exec("")?.length ?? 2) - 1; } catch { groups = 1; }
  return groups === 0 ? { ...t, el: STR } : t;
};
// open part 5 (FM): flatMap flattens a callback result that is an array; a result typed by a type parameter may be one
// at run time, where U | readonly U[] took it as one element
export const ixFlatMapArg = (ixUm, ixErr, show) => (K: IxK, T: IxTypes, C: IxCtls, e: AstNode): void => {
  if (e.type !== "CallExpression") return;
  const c = e.callee, a = e.arguments[0], ft = a === undefined ? undefined : T.get(a.nid);
  if (c.type !== "MemberExpression" || c.computed || c.property.type !== "Identifier" || c.property.name !== "flatMap" || ft === undefined || ft.k !== "fn") return;
  const recv = T.get(c.object.nid), un = (t: Ty): Ty[] => ixUm(K.reg, t.k === "named" && (t.n === "Mut" || t.n === "Borrowed") ? t.args[0] ?? t : t);
  if (recv === undefined || !un(recv).some((m) => m.k === "arr" || m.k === "tup")) return;
  const tv = un(ft.ret).find((m) => m.k === "tv");
  if (a !== undefined && tv !== undefined) ixErr(K, C, a, "type", `flatMap flattens a callback result that is an array, and ${show(tv)} is a type parameter, which may be an array: return [x] for one element`);
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
// open part 5 (TP): a mutating method on a tuple: one that changes the length, or one that moves or writes elements
// when the tuple's element types differ, leaves a type at an index that does not hold there
export const ixTupleMutates = (ixUm, ixErr, show) => (K: IxK, C: IxCtls, at: AstNode, recv: Ty, name: string): void => {
  const un = (t: Ty): Ty[] => ixUm(K.reg, t.k === "named" && (t.n === "Mut" || t.n === "Borrowed") ? t.args[0] ?? t : t);
  for (const t of un(recv)) {
    if (t.k !== "tup") continue;
    const same = t.els.every((x) => t.els.every((y) => K.reg.sub(x, y)));
    const length = ["push", "pop", "shift", "unshift", "splice"].includes(name);
    if (length || !same) {
      ixErr(K, C, at, "mutating-method", `${name} on the tuple ${show(t)} ${length ? "changes its length" : "moves or writes elements of different types"}, and the tuple type gives each index its own type: copy it first (toSorted, toReversed, [...t]), or give it an array type`);
      return;
    }
  }
};
export const ixCallSigs = (ixSpecialCall, ixWriteRule, ixTupleMutates, ixBail, ixUm, ixNonNullish, ixInActionOnly, ixActionFn, ixNotCallable, ixErr, show, isNamed) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: CallExpression, expected: Ty | null): IxSigs => {
  const special = ixSpecialCall(K, T, V, W, C, env, e, expected);
  if (special !== null) return { k: "done", t: special };
  const callee = e.callee, calleeT = K.infer(K, T, V, W, C, env, callee);
  const m = callee.type === "ChainExpression" ? callee.expression : callee;
  const fl = m.type === "MemberExpression" && C.flagsAt === m.nid ? C.flags : undefined;
  if (m.type === "MemberExpression" && fl?.mutates) ixWriteRule(K, T, V, W, C, env, m.object, e, "mutating-method");
  if (m.type === "MemberExpression" && fl?.mutates && !m.computed && m.property.type === "Identifier") ixTupleMutates(K, C, e, T.get(m.object.nid) ?? { k: "err" }, m.property.name);
  if (calleeT.k === "err") return { k: "done", t: ixBail(K, T, V, W, C, env, e.arguments, true) };
  const isShort = e.optional === true || C.short.has(callee.nid);
  if (isShort) C.short = new Set([...C.short, e.nid]);
  const ms = ixUm(K.reg, isShort ? ixNonNullish(K.reg, calleeT) : calleeT);
  const view = m.type === "MemberExpression" && !!fl?.view && isNamed(T.get(m.object.nid) ?? { k: "err" }, "Borrowed");
  const act = ms.find((x) => isNamed(x, "Action"));
  if (act !== undefined && act.k === "named") {
    ixInActionOnly(K, C, env, e, "action-call", "an Action called outside action(...)");
    return { k: "sigs", sigs: [ixActionFn(act.args[0] ?? { k: "tup", els: [] })], view };
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
  if (sigs.length > 1) C.tries += 1;
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
  if (sigs.length > 1) C.tries -= 1;
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
