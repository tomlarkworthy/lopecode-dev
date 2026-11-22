// Loops, try and switch (lite/infer.ts loop, the ForOf and Try cases, switchStmt, invalidate, hasBreak).

// the narrowings of every name assigned under n go, in the flow object id
export const ixInvalidate = (ixAssignedNames, ixLookup, ixDropRoot) => (V: IxVars, W: IxFlows, env: IxEnv, id: number, n: AstNode): void => {
  for (const name of ixAssignedNames(n)) {
    const b = ixLookup(V, env, name);
    if (b) ixDropRoot(W, id, b);
  }
};
// an unlabelled break of this loop (not of a nested loop or switch)
export const ixHasBreak = (kidsOf, isFnNode) => {
  function hasBreak(n: AstNode): boolean {
    if (n.type === "BreakStatement" && n.label === null) return true;
    if (isFnNode(n) || ["WhileStatement", "DoWhileStatement", "ForStatement", "ForOfStatement", "ForInStatement", "SwitchStatement"].includes(n.type)) return false;
    return kidsOf(n).some((c) => hasBreak(c));
  }
  return hasBreak;
};
export const ixPushBreaks = () => (C: IxCtls, exits: number[] | null): void => { C.breaks = { exits, next: C.breaks }; };
export const ixPopBreaks = () => (C: IxCtls): number[] => {
  const top = C.breaks;
  C.breaks = top?.next ?? null;
  return top?.exits ?? [];
};
export type IxLoopNode = WhileStatement | DoWhileStatement | ForStatement;
export const ixLoopInit = (ixVarDecl, ixErr) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, inner: IxEnv, s: IxLoopNode): void => {
  const init = s.type === "ForStatement" ? s.init : null;
  if (init === null) return;
  if (init.type !== "VariableDeclaration") { K.infer(K, T, V, W, C, inner, init); return; }
  if (init.kind === "var") ixErr(K, C, init, "no-var", "var");
  for (const d of init.declarations) ixVarDecl(K, T, V, W, C, inner, d, init.kind);
};
// the loop body, and the flow where the loop's test is false (null when it has none)
export const ixLoopBody = (ixSub1, ixInvalidate, ixCopyFlow) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, inner: IxEnv, s: IxLoopNode, head: number): number | null => {
  if (s.type === "DoWhileStatement") {
    C.cur = ixCopyFlow(W, C, head);
    ixSub1(K, T, V, W, C, inner, s.body);
    ixInvalidate(V, W, inner, C.cur, s);
    return K.cond(K, T, V, W, C, inner, s.test).f;
  }
  const test = s.test;
  let F: number | null = null;
  let body = ixCopyFlow(W, C, head);
  if (test !== null) { const c = K.cond(K, T, V, W, C, inner, test); body = c.t; F = c.f; }
  C.cur = body;
  ixSub1(K, T, V, W, C, inner, s.body);
  if (s.type === "ForStatement" && s.update !== null) K.infer(K, T, V, W, C, inner, s.update);
  return F;
};
export const ixLoop = (ixNewScope, ixLoopInit, ixLoopBody, ixInvalidate, ixCopyFlow, ixPushBreaks, ixPopBreaks, ixHasBreak) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: IxLoopNode): boolean => {
  const own = C.cur, inner = ixNewScope(C, env);
  ixLoopInit(K, T, V, W, C, inner, s);
  ixInvalidate(V, W, inner, C.cur, s);
  const head = ixCopyFlow(W, C, C.cur);
  ixPushBreaks(C, null);
  const F = ixLoopBody(K, T, V, W, C, inner, s, head);
  ixPopBreaks(C);
  const test = s.test;
  const infinite = (s.type !== "DoWhileStatement" && test === null) || (test !== null && test.type === "Literal" && test.value === true);
  const brk = ixHasBreak(s.body);
  if (infinite && !brk) { C.cur = own; return false; }
  C.cur = brk || F === null ? head : F;
  return true;
};
export const ixForOf = (ixNewScope, ixInvalidate, ixCopyFlow, ixPushBreaks, ixPopBreaks, ixSub1, ixErr, ixUnsup, show, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: ForOfStatement): boolean => {
  if (s.await) { ixUnsup(K, C, s, "for await"); return true; }
  const inner = ixNewScope(C, env);
  const rt = K.infer(K, T, V, W, C, inner, s.right);
  const el = K.reg.iterElem(rt);
  if (!el) ixErr(K, C, s.right, "type", `for...of over non-iterable ${show(rt)}`);
  ixInvalidate(V, W, inner, C.cur, s);
  const head = ixCopyFlow(W, C, C.cur);
  const left = s.left;
  if (left.type === "VariableDeclaration") {
    const d = left.declarations[0];
    if (left.kind === "var") ixErr(K, C, left, "no-var", "var");
    if (d !== undefined && d.type === "VariableDeclarator") K.bind(K, T, V, W, C, inner, d.id, el ?? ERR, left.kind === "const" ? "const" : "let", { assigned: false, cellParam: false });
  } else ixUnsup(K, C, left, "for...of over an existing binding");
  ixPushBreaks(C, null);
  ixSub1(K, T, V, W, C, inner, s.body);
  ixPopBreaks(C);
  C.cur = head;
  return true;
};
export const ixTry = (ixInvalidate, ixCopyFlow, ixJoin2, ixBlock, ixNewScope, ixGap, UNKNOWN) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: TryStatement): boolean => {
  const before = ixCopyFlow(W, C, C.cur);
  ixInvalidate(V, W, env, C.cur, s.block);
  const pre = ixCopyFlow(W, C, C.cur), blk = s.block, h = s.handler, fin = s.finalizer;
  if (blk.type !== "BlockStatement") { ixGap(C, "try without a block"); return true; }
  C.cur = ixCopyFlow(W, C, pre);
  const la = ixBlock(K, T, V, W, C, env, blk.body);
  const af = C.cur;
  let lb = false;
  const b = ixNewScope(C, env);
  C.cur = ixCopyFlow(W, C, pre);
  if (h !== null && h.type === "CatchClause" && h.body.type === "BlockStatement") {
    if (h.param !== null) K.bind(K, T, V, W, C, b, h.param, UNKNOWN, "let", { assigned: false, cellParam: false });
    lb = ixBlock(K, T, V, W, C, b, h.body.body);
  } else if (h !== null) ixGap(C, "catch clause");
  const bf = C.cur;
  C.cur = la && lb ? ixJoin2(W, C, af, bf) : la ? af : lb ? bf : before;
  if (fin === null || fin.type !== "BlockStatement") return la || lb;
  const kept = C.cur;
  C.cur = ixCopyFlow(W, C, pre);
  const lf = ixBlock(K, T, V, W, C, env, fin.body);
  C.cur = kept;
  return lf && (la || lb);
};
// the diagnostics written since mark whose node lies inside span: the discriminant is read again for each case, and
// its own problems were reported by the first read
export const ixDropWithin = (ixDrain, ixPush) => (K: IxK, C: IxCtls, mark: { d: IxLog | null; u: IxLog | null }, span: AstNode): void => {
  ixDrain(K, C);
  const keep = (log: IxLog | null, base: IxLog | null): IxLog | null => {
    const added: Mut<IxDiag[]> = [];
    for (let x = log; x !== null && x.n > (base?.n ?? 0); x = x.next) added.unshift(x.d);
    let out = base;
    for (const d of added) if (!(d.start >= span.start && d.end <= span.end)) out = ixPush(out, d);
    return out;
  };
  C.diags = keep(C.diags, mark.d);
  C.unsup = keep(C.unsup, mark.u);
};
export type IxCases = { taken: (number | null)[]; none: number; rest: Ty };
// each case is checked as the condition d === test, in the flow where every earlier test was false; rest: the values
// of d that no case has taken, for exhaustiveness
export const ixSwitchTests = (ixMark, ixDropWithin, ixPathKey, ixNoOverlap, ixNarrowEq, ixErr, show) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: SwitchStatement, dt: Ty, none0: number): IxCases => {
  const d = s.discriminant, own = C.cur, taken: Mut<(number | null)[]> = [];
  let rest = dt, none = none0;
  for (const c of s.cases) {
    const test = c.type === "SwitchCase" ? c.test : null;
    if (test === null) { taken.push(null); continue; }
    C.nextNid += 1;
    const eq: AstNode = { type: "BinaryExpression", nid: C.nextNid, start: test.start, end: test.end, line: test.line, left: d, operator: "===", right: test };
    const mark = ixMark(K, C);
    C.cur = none;
    const r = K.cond(K, T, V, W, C, env, eq);
    C.cur = own;
    ixDropWithin(K, C, mark, d);
    taken.push(r.t);
    none = r.f;
    const bt = T.get(test.nid);
    if (bt && !ixPathKey(V, env, d, false) && !ixNoOverlap(K.reg, dt, bt) && ixNoOverlap(K.reg, rest, bt))
      ixErr(K, C, test, "type", `case ${show(bt)}: no value of ${show(dt)} is left for it after the earlier cases`);
    if (bt && (bt.k === "lit" || bt.k === "null" || bt.k === "undef")) rest = ixNarrowEq(K.reg, rest, bt, false, false);
  }
  return { taken: taken, none, rest };
};
export const ixSwitch = (ixSwitchTests, ixSwitchBodies, ixCopyFlow, ixJoin2) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: SwitchStatement): boolean => {
  const d = s.discriminant, dt = K.infer(K, T, V, W, C, env, d);
  const cases = ixSwitchTests(K, T, V, W, C, env, s, dt, ixCopyFlow(W, C, C.cur));
  T.set(d.nid, dt);
  const exits = ixSwitchBodies(K, T, V, W, C, env, s, cases);
  const first = exits[0];
  if (first === undefined) return false;
  let out = first;
  for (const x of exits.slice(1)) out = ixJoin2(W, C, out, x);
  C.cur = out;
  return true;
};
export const ixSwitchBodies = (ixJoin, ixNewScope, ixHoist, ixStmts, ixPushBreaks, ixPopBreaks, ixCopyFlow, ixErr) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, s: SwitchStatement, cases: IxCases): number[] => {
  const own = C.cur;
  let into: number | null = null;
  ixPushBreaks(C, []);
  for (const [i, c] of s.cases.entries()) {
    if (c.type !== "SwitchCase") continue;
    const flow = ixJoin(W, C, into, cases.taken[i] ?? cases.none) ?? cases.none;
    for (const st of c.consequent) if (st.type === "VariableDeclaration" || st.type === "FunctionDeclaration" || st.type === "ClassDeclaration")
      ixErr(K, C, st, "switch-declaration", "a declaration directly in a case is visible to every case of the switch; put the case's statements in a block { … }");
    if (!c.consequent.length) { into = flow; continue; }
    const inner = ixNewScope(C, env);
    C.cur = ixCopyFlow(W, C, flow);
    ixHoist(K, V, C, inner, c.consequent);
    const end = ixStmts(K, T, V, W, C, inner, c.consequent);
    if (end && i < s.cases.length - 1) ixErr(K, C, c, "switch-fallthrough", "this case falls through into the next one; end it with break, return, throw or continue");
    into = end ? C.cur : null;
  }
  const exits = ixPopBreaks(C);
  C.cur = own;
  const tail: number[] = [...(into !== null ? [into] : []), ...(!s.cases.some((c) => c.type === "SwitchCase" && c.test === null) && cases.rest.k !== "never" ? [cases.none] : [])];
  return [...exits, ...tail];
};
