// The prelude's calls, each with a rule of its own (lite/infer.ts preludeCall), and the expressions left from
// infer1: literals of objects, arrays and functions, members, chains, calls, await and yield.

export const ixInferRest = (ixObjLit, ixArrLit, ixMember, ixAwait, ixYield, ixJsx, ixUnsup, union, UNDEF, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode): Ty | null => {
  switch (e.type) {
    case "ObjectExpression": return ixObjLit(K, T, V, W, C, env, e, null);
    case "ArrayExpression": return ixArrLit(K, T, V, W, C, env, e, null);
    case "ArrowFunctionExpression": case "FunctionExpression": return K.fnExpr(K, T, V, W, C, env, e, null, null);
    case "MemberExpression": return ixMember(K, T, V, W, C, env, e);
    case "ChainExpression": {
      const t = K.infer(K, T, V, W, C, env, e.expression);
      return C.short.has(e.expression.nid) ? union([t, UNDEF]) : t;
    }
    case "CallExpression": case "NewExpression": return K.call(K, T, V, W, C, env, e, null);
    case "AwaitExpression": return ixAwait(K, T, V, W, C, env, e);
    case "YieldExpression": return ixYield(K, T, V, W, C, env, e);
    case "JSXElement": case "JSXFragment": return ixJsx(K, T, V, W, C, env, e);
    case "SequenceExpression": ixUnsup(K, C, e, "comma expression"); return ERR;
    case "TaggedTemplateExpression": ixUnsup(K, C, e, "tagged template"); return ERR;
    default: return null;
  }
};
export const ixAwait = (ixErr, ixAwaited) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AwaitExpression): Ty => {
  if (!env.fi.isAsync) ixErr(K, C, e, "type", "await outside an async function");
  else if (env.fi.inAction) ixErr(K, C, e, "action-async", "await in an action body: an action is synchronous; wait in an async cell and give the result to an action (S6.12)");
  return ixAwaited(K.reg, K.infer(K, T, V, W, C, env, e.argument), false);
};
export const ixYield = (ixErr, ixUnsup, show, UNDEF, UNKNOWN, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: YieldExpression): Ty => {
  if (!env.fi.isGen) ixErr(K, C, e, "type", "yield outside a generator");
  if (e.delegate) { ixUnsup(K, C, e, "yield*"); return ERR; }
  const t = K.check(K, T, V, W, C, env, e.argument, env.fi.yieldCtx, false, false);
  C.yields = [...C.yields, t];
  return UNKNOWN;
};
export const ixPreludeCall = (ixTypeArgs, ixErr, ixMutCall, ixUnwrapCall, ixStateCall, ixActionCall, ixReadCall, ixOnCall, BOOL, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: CallExpression, name: string, expected: Ty | null): Ty => {
  const args = e.arguments, explicit = ixTypeArgs(K, V, env, e.typeArguments);
  if (name === "on") return ixOnCall(K, T, V, W, C, env, e);
  if (name === "equals") {
    if (args.length !== 2) ixErr(K, C, e, "arity", "equals takes two arguments");
    for (const a of args) K.infer(K, T, V, W, C, env, a);
    return BOOL;
  }
  if (!["mut", "freeze", "borrow", "snapshot", "state", "action", "read"].includes(name)) return ERR;
  if (args.length !== 1) ixErr(K, C, e, "arity", `${name} takes one argument`);
  const a = args[0] ?? null;
  if (name === "mut") return ixMutCall(K, T, V, W, C, env, a, expected, explicit);
  if (name === "state") return ixStateCall(K, T, V, W, C, env, a, expected, explicit);
  if (name === "action") return ixActionCall(K, T, V, W, C, env, e, a, expected);
  if (name === "read") return ixReadCall(K, T, V, W, C, env, e, a);
  return ixUnwrapCall(K, T, V, W, C, env, e, name, a);
};
export const ixMutCall = (ixGap, named, isNamed, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, a: AstNode | null, expected: Ty | null, explicit: Ty[] | null): Ty => {
  const inner = expected !== null && expected.k === "named" && isNamed(expected, "Mut") ? expected.args[0] ?? null : null;
  if (explicit !== null) {
    const x = explicit[0];
    if (a === null || x === undefined) return ixGap(C, "mut<…>() with no argument or no type argument");
    K.check(K, T, V, W, C, env, a, x, false, false);
    return named("Mut", x);
  }
  const t = a !== null ? K.check(K, T, V, W, C, env, a, inner, false, false) : ERR;
  return named("Mut", inner ?? t);
};
// freeze, borrow and snapshot: the type inside the Mut (or Borrowed)
export const ixUnwrapCall = (ixErr, named, show, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode, name: string, a: AstNode | null): Ty => {
  const t = a !== null ? K.infer(K, T, V, W, C, env, a) : ERR;
  const want = name === "snapshot" ? "Borrowed" : "Mut";
  if (t.k === "err") return ERR;
  if (t.k !== "named" || t.n !== want) { ixErr(K, C, e, "type", `${name} needs a ${want}<T>, got ${show(t)}`); return ERR; }
  const x = t.args[0] ?? ERR;
  return name === "borrow" ? named("Borrowed", x) : x;
};
export const ixStateCall = (named, isNamed, widen, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, a: AstNode | null, expected: Ty | null, explicit: Ty[] | null): Ty => {
  const inner = explicit?.[0] ?? (expected !== null && expected.k === "named" && isNamed(expected, "StateCell") ? expected.args[0] ?? null : null);
  const t = a !== null ? K.check(K, T, V, W, C, env, a, inner, false, false) : ERR;
  return named("StateCell", inner ?? widen(t));
};
export const ixActionCall = (ixErr, ixUnsup, ixPromiseIn, ixActionFn, named, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode, a: AstNode | null, expected: Ty | null): Ty => {
  if (a === null || (a.type !== "ArrowFunctionExpression" && a.type !== "FunctionExpression")) { ixUnsup(K, C, e, "action(...) of a non-literal function"); return ERR; }
  const args = expected !== null && expected.k === "named" && expected.n === "Action" ? expected.args[0] : undefined;
  const ctx = args !== undefined && args.k === "tup" ? ixActionFn(args) : null;
  if (a.async || a.generator) ixErr(K, C, a, "action-async", `the function given to action(...) is ${a.async ? "async" : "a generator"}; an action is synchronous (S6.12)`);
  const f = K.fnExpr(K, T, V, W, C, { ...env, fi: { ...env.fi, inAction: true } }, a, ctx, null);
  if (f.k !== "fn") return ERR;
  const p = a.async || a.generator ? null : ixPromiseIn(K.reg, f.ret, 0);
  if (p) ixErr(K, C, a, "action-async", `the function given to action(...) returns ${p}; an action is synchronous (S6.12)`);
  T.set(a.nid, f);
  return named("Action", { k: "tup", els: f.ps.map((q) => q.t) });
};
// read(s): the value as of this point in the call order; only inside an action body
export const ixReadCall = (ixInActionOnly, ixErr, show, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode, a: AstNode | null): Ty => {
  ixInActionOnly(K, C, env, e, "read-outside-action", "read(...) is only for an action body; a cell takes the value as a parameter");
  const t = a !== null ? K.infer(K, T, V, W, C, env, a) : ERR;
  if (t.k === "err" || a === null) return ERR;
  if (t.k !== "named" || t.n !== "State") { ixErr(K, C, a, "type", `read needs a State<T>, got ${show(t)}`); return ERR; }
  return t.args[0] ?? ERR;
};
export const ixOnCall = (ixErr, named, show, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: CallExpression): Ty => {
  const [h, act] = e.arguments;
  if (e.arguments.length !== 2 || h === undefined || act === undefined) { ixErr(K, C, e, "arity", "on takes an events handle and an action"); return named("Listener"); }
  const s = K.infer(K, T, V, W, C, env, h);
  if (s.k === "err") return named("Listener");
  if (s.k !== "named" || s.n !== "Events") { ixErr(K, C, h, "type", `on needs an Events<T>, got ${show(s)}`); return named("Listener"); }
  K.check(K, T, V, W, C, env, act, named("Action", { k: "tup", els: [s.args[0] ?? ERR] }), false, false);
  return named("Listener");
};
