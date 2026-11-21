// The flow check's loops (lite/own.ts flowCheck, while, do, for and for...of): the body runs again from the join of
// the entry and the back edge until the state stops growing, at most 20 times.

export type OwLoopParts = { readonly test: AstNode | null; readonly body: AstNode };
export const owLoopParts = () => (s: AstNode): OwLoopParts | null => {
  switch (s.type) {
    case "WhileStatement": case "DoWhileStatement": return { test: s.test, body: s.body };
    case "ForStatement": return { test: s.test, body: s.body };
    case "ForOfStatement": return { test: null, body: s.body };
    default: return null;
  }
};
export const owLoopEntry = () => (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, s: AstNode, st: OwSt): OwSt => {
  if (s.type === "ForStatement" && s.init !== null) return s.init.type === "VariableDeclaration" ? K.stmt(K, O, W, X, P, s.init, st) ?? st : K.expr(K, O, W, X, P, s.init, st);
  if (s.type === "ForOfStatement") return K.expr(K, O, W, X, P, s.right, st);
  return st;
};
// the body of a for...of starts its declared binding afresh
export const owForOfIn = (owBindingAt) => (O: OwCtx, P: OwFlowFn, s: AstNode, cur: OwSt): OwSt => {
  const left = s.type === "ForOfStatement" ? s.left : null;
  const d = left !== null && left.type === "VariableDeclaration" ? left.declarations[0] : undefined;
  const b = d !== undefined && d.type === "VariableDeclarator" && d.id.type === "Identifier" ? owBindingAt(O, d.id) : undefined;
  return b !== undefined && P.tracked.has(b.id) ? new Set([...cur].filter((id) => id !== b.id)) : cur;
};
export type OwLoopStep = { readonly exit: OwSt | null; readonly next: OwSt };
export const owLoopOnce = (owForOfIn, owJoin) => (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, s: AstNode, L: OwLoopParts, entry: OwSt, cur: OwSt): OwLoopStep => {
  X.loops = { breaks: [], conts: [], isSwitch: false, next: X.loops };
  let afterTest = cur, bodyIn = cur;
  if (s.type !== "DoWhileStatement" && L.test !== null) { afterTest = K.expr(K, O, W, X, P, L.test, cur); bodyIn = afterTest; }
  if (s.type === "ForOfStatement") bodyIn = owForOfIn(O, P, s, cur);
  const end = K.stmt(K, O, W, X, P, L.body, bodyIn);
  const ctx = X.loops;
  X.loops = ctx === null ? null : ctx.next;
  let back = owJoin([end, ...(ctx === null ? [] : ctx.conts)]);
  if (back !== null && s.type === "ForStatement" && s.update !== null) back = K.expr(K, O, W, X, P, s.update, back);
  if (back !== null && s.type === "DoWhileStatement") { afterTest = K.expr(K, O, W, X, P, s.test, back); back = afterTest; }
  const t = L.test, infinite = s.type !== "ForOfStatement" && (t === null || (t.type === "Literal" && t.value === true));
  const exit = owJoin([infinite ? null : s.type === "ForOfStatement" ? cur : afterTest, ...(ctx === null ? [] : ctx.breaks)]);
  return { exit, next: owJoin([entry, back]) ?? entry };
};
export const owLoop = (owLoopParts, owLoopEntry, owLoopOnce) => (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, s: AstNode, st: OwSt): OwSt | null => {
  const L = owLoopParts(s);
  if (L === null) return st;
  const entry = owLoopEntry(K, O, W, X, P, s, st);
  let cur = entry, exit: OwSt | null = null;
  for (let iter = 0; iter < 20; iter++) {
    const r = owLoopOnce(K, O, W, X, P, s, L, entry, cur);
    exit = r.exit;
    if (r.next.size === cur.size) break;
    cur = r.next;
  }
  return exit;
};
