// The flow check's statements (lite/own.ts flowCheck stmt): a state, or null after a return, throw, break or continue.

export const owStmt = (owSeen, owBlockFlow, owVarFlow, owIfFlow, owJump, owLoop, owTryFlow, owSwitchFlow, owUnsup, isFnNode, kidsOf) => (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, s: AstNode, st0: OwSt): OwSt | null => {
  owSeen(X, st0);
  switch (s.type) {
    case "BlockStatement": return owBlockFlow(K, O, W, X, P, s.body, st0);
    case "VariableDeclaration": return owVarFlow(K, O, W, X, P, s, st0);
    case "FunctionDeclaration": case "EmptyStatement": return st0;
    case "ExpressionStatement": return K.expr(K, O, W, X, P, s.expression, st0);
    case "ReturnStatement": if (s.argument !== null) K.expr(K, O, W, X, P, s.argument, st0); return null;
    case "ThrowStatement": K.expr(K, O, W, X, P, s.argument, st0); return null;
    case "IfStatement": return owIfFlow(K, O, W, X, P, s, st0);
    case "BreakStatement": case "ContinueStatement": return owJump(W, X, s, st0);
    case "WhileStatement": case "DoWhileStatement": case "ForStatement": case "ForOfStatement": return owLoop(K, O, W, X, P, s, st0);
    case "TryStatement": return owTryFlow(K, O, W, X, P, s, st0);
    case "SwitchStatement": return owSwitchFlow(K, O, W, X, P, s, st0);
    case "LabeledStatement": owUnsup(W, s, "LabeledStatement in a function holding a Mut/Borrowed"); return st0;
    default: {
      let st = st0;
      for (const c of kidsOf(s)) st = isFnNode(c) ? st : K.expr(K, O, W, X, P, c, st);
      return st;
    }
  }
};
export const owBlockFlow = () => (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, body: AstNode[], st: OwSt): OwSt | null => {
  let cur: OwSt | null = st;
  for (const x of body) { if (cur === null) return null; cur = K.stmt(K, O, W, X, P, x, cur); }
  return cur;
};
// a declaration starts its binding afresh
export const owVarFlow = (owBindingAt, kidsOf) => (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, s: VariableDeclaration, st0: OwSt): OwSt => {
  let st = st0;
  for (const d of s.declarations) {
    if (d.type !== "VariableDeclarator") continue;
    if (d.init !== null) st = K.expr(K, O, W, X, P, d.init, st);
    for (const c of kidsOf(d.id)) st = K.expr(K, O, W, X, P, c, st);
    const b = d.id.type === "Identifier" ? owBindingAt(O, d.id) : undefined;
    if (b !== undefined && P.tracked.has(b.id)) st = new Set([...st].filter((id) => id !== b.id));
  }
  return st;
};
export const owIfFlow = (owJoin) => (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, s: IfStatement, st: OwSt): OwSt | null => {
  const t = K.expr(K, O, W, X, P, s.test, st), alt = s.alternate;
  return owJoin([K.stmt(K, O, W, X, P, s.consequent, t), alt !== null ? K.stmt(K, O, W, X, P, alt, t) : t]);
};
// a continue goes to the innermost loop, past any switch
export const owPushCont = () => {
  function push(l: OwLoops | null, st: OwSt): OwLoops | null {
    if (l === null) return null;
    return l.isSwitch ? { ...l, next: push(l.next, st) } : { ...l, conts: [...l.conts, st] };
  }
  return push;
};
export const owJump = (owUnsup, owPushCont) => (W: OwW, X: OwX, s: BreakStatement | ContinueStatement, st: OwSt): null => {
  if (s.label !== null) { owUnsup(W, s, "labelled break/continue in a function holding a Mut/Borrowed"); return null; }
  const top = X.loops;
  if (s.type === "ContinueStatement") X.loops = owPushCont(top, st);
  else if (top !== null) X.loops = { ...top, breaks: [...top.breaks, st] };
  return null;
};
export const owTryFlow = (owUnsup, owSeen, owJoin) => (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, s: TryStatement, st: OwSt): OwSt | null => {
  if (s.finalizer !== null) { owUnsup(W, s, "try/finally in a function holding a Mut/Borrowed"); return st; }
  const outer = X.acc;
  X.acc = st;
  const a = K.stmt(K, O, W, X, P, s.block, st);
  const seen = X.acc ?? st;
  X.acc = outer;
  owSeen(X, seen);
  const h = s.handler;
  const c = h !== null && h.type === "CatchClause" ? K.stmt(K, O, W, X, P, h.body, seen) : null;
  return owJoin([a, c]);
};
// every test may run before a body is entered; a body is entered by its case or from the body before it
export const owSwitchFlow = (owJoin) => (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, s: SwitchStatement, st: OwSt): OwSt | null => {
  let tests = K.expr(K, O, W, X, P, s.discriminant, st);
  for (const c of s.cases) if (c.type === "SwitchCase" && c.test !== null) tests = K.expr(K, O, W, X, P, c.test, tests);
  X.loops = { breaks: [], conts: [], isSwitch: true, next: X.loops };
  let prev: OwSt | null = null;
  for (const c of s.cases) {
    let cur: OwSt | null = owJoin([tests, prev]);
    if (c.type === "SwitchCase") for (const x of c.consequent) { if (cur === null) break; cur = K.stmt(K, O, W, X, P, x, cur); }
    prev = cur;
  }
  const ctx = X.loops;
  X.loops = ctx === null ? null : ctx.next;
  const dflt = s.cases.some((c) => c.type === "SwitchCase" && c.test === null);
  return owJoin([prev, ...(ctx === null ? [] : ctx.breaks), dflt ? null : tests]);
};
