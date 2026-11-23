// gap: an Other node in the cell's tree, where own.ts reads a node type the typed tree does not give
export const owCheck = (owIndex, owCheckIn) => (R: IxRegCore, F: IxFacts, fn: AstNode): OwOutput => owCheckIn(R, F, owIndex(F, fn));
// owCheck over a tree index already made (the module check makes one per cell)
export const owCheckIn = (owBindingOfFn, owCaptures, owCaptureErrs, owPlacement, owLateUses, owMemoArgs, owPubWrites, owActionEscapes, ixOut) => (R: IxRegCore, F: IxFacts, T: OwTree): OwOutput => {
  const O: OwCtx = { T, F, R };
  const W: OwW = { errs: null, seen: new Set(), unsup: null };
  const caps = owCaptures(O, W);
  const byFn = owBindingOfFn(F);
  owCaptureErrs(O, W, caps, byFn);
  owPlacement(O, W);
  owLateUses(O, W, caps, byFn);
  owMemoArgs(O, W, caps, byFn);
  owPubWrites(O, W, caps, byFn);
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
  const out: Mut<string[]> = [];
  if (parts.generator && !parts.async && ixMayHoldFn(R, ret)) out.push(msg("an events cell yields", ret, "a listener's action would receive it"));
  const held = ret.k === "named" && isNamed(ret, "StateCell") ? ret.args[0] ?? ERR : null;
  if (held !== null && ixMayHoldFn(R, held)) out.push(msg("a state cell holds", held, "an action that reads the state cell could call it"));
  return out;
};
