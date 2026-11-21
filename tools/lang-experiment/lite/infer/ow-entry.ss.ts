// The knot and the entry of the ownership port: one cell's ownership rules (core.ts's ownership(c.fn, ch) and
// actionEscapes(c.fn, ch)) over the facts of the inference port.

export const OW_K = (owExpr, owStmt): OwK => ({ expr: owExpr, stmt: owStmt });
export const owFlowCheck = (owTracked, OW_K, ixFnParts) => (O: OwCtx, W: OwW, caps: Map<number, OwCap>, f: AstNode): void => {
  const P = owTracked(O, caps, f), parts = ixFnParts(f);
  if (!P.tracked.size || parts === null) return;
  const X: OwX = mut({ loops: null, acc: null });
  const none: OwSt = new Set();
  if (parts.body.type === "BlockStatement") OW_K.stmt(OW_K, O, W, X, P, parts.body, none);
  else OW_K.expr(OW_K, O, W, X, P, parts.body, none);
};
// gap: an Other node in the cell's tree, where own.ts reads a node type the typed tree does not give
export const owCheck = (owIndex, owCheckIn) => (R: IxRegCore, F: IxFacts, fn: AstNode): OwOutput => owCheckIn(R, F, owIndex(F, fn));
// owCheck over a tree index already made (the module check makes one per cell)
export const owCheckIn = (owBindingOfFn, owCaptures, owCaptureErrs, owEscapes, owPlacement, owFlowCheck, owActionEscapes, ixOut) => (R: IxRegCore, F: IxFacts, T: OwTree): OwOutput => {
  const O: OwCtx = { T, F, R };
  const W: OwW = mut({ errs: null, seen: new Set(), unsup: null });
  const caps = owCaptures(O, W);
  owCaptureErrs(O, W, caps, owBindingOfFn(F));
  owEscapes(O, W);
  owPlacement(O, W);
  for (const f of T.fns) owFlowCheck(O, W, caps, f);
  return { diags: ixOut(W.errs), actions: owActionEscapes(O), unsup: ixOut(W.unsup), gap: T.other };
};
export type OwCaptureOut = { readonly byName: OwCapture[]; readonly opaque: OwCapture[]; readonly gap: string | null };
// capture.ts's two passes as core.ts runs them: by name before the check, by binding after, skipping what the first reported
export const owCaptureCheck = (owIndex, owTaintCaptures, owOpaqueCaptures) => (R: IxRegCore, F: IxFacts, fn: AstNode, tainted: Map<string, string>): OwCaptureOut => {
  const T = owIndex(F, fn);
  const byName = owTaintCaptures(fn, tainted);
  const skip = new Set(byName.map((c) => c.at.nid));
  return { byName, opaque: owOpaqueCaptures({ T, F, R }, tainted, skip), gap: T.other };
};
// core.ts's fed rule (S11.9): a cell fed a function from another language may not yield from an events cell, nor hold in
// a state cell, a value whose type may be or hold a function; the cell's value type as core.ts takes it from fnT
export const owFedKept = (ixMayHoldFn, ixFnParts, isNamed, show, ERR) => (R: IxRegCore, fn: AstNode, fnT: Ty, name: string, fedBy: string): string[] => {
  const parts = ixFnParts(fn);
  if (parts === null) return [];
  let ret: Ty = fnT.k === "fn" ? fnT.ret : ERR;
  if (parts.async && ret.k === "named" && isNamed(ret, "Promise")) ret = ret.args[0] ?? ERR;
  if (parts.generator && ret.k === "named" && isNamed(ret, "Generator")) ret = ret.args[0] ?? ERR;
  const msg = (what: string, t: Ty, then: string) => `${what} ${show(t)}, which may be or hold a function from another language (${name} ${fedBy}); ${then}`;
  const out: Mut<string[]> = mut([]);
  if (parts.generator && !parts.async && ixMayHoldFn(R, ret)) out.push(msg("an events cell yields", ret, "a listener's action would receive it"));
  const held = ret.k === "named" && isNamed(ret, "StateCell") ? ret.args[0] ?? ERR : null;
  if (held !== null && ixMayHoldFn(R, held)) out.push(msg("a state cell holds", held, "an action that reads the state cell could call it"));
  return freeze(out);
};
