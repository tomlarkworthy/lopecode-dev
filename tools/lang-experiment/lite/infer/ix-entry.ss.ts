// The knot and the entry: one cell's check (core.ts's ch.fnExpr(c.fn, null, undefined, { injected })) over fresh
// tables, with the globals bound in scope 0.

export const ixKnot = (ixInfer, ixCheck, ixCond, ixStmt, ixFnExpr, ixCall, ixBind) => (reg: IxReg, src: string, cellNames: Set<string>, allowed: Set<string>): IxK =>
  ({ reg, src, cellNames, allowed, infer: ixInfer, check: ixCheck, cond: ixCond, stmt: ixStmt, fnExpr: ixFnExpr, call: ixCall, bind: ixBind });
export const ixFreshCtl = () => (count: number): IxCtl => ({
  cur: 0, nextFlow: 0, diags: null, unsup: null, rets: [], yields: [], quiet: 0, nextId: 0, nextScope: 0, nextNid: count,
  fresh: 1000000, short: new Set(), clones: new Set(), breaks: null, flagsAt: -1, flags: undefined, gap: null, facts: null,
});
export const ixCheckFn = (ixKnot, ixFreshCtl, ixDrain, ixOut, ixFoldFacts) => (reg: IxReg, input: IxInput): IxOutput => {
  const K: IxK = ixKnot(reg, input.src, input.cellNames, input.allowed);
  const T: IxTypes = mut(new Map()), V: IxVars = mut(new Map()), W: IxFlows = mut(new Map([[0, new Map()]]));
  const C: IxCtls = mut({ ...ixFreshCtl(input.count) });
  C.nextFlow = 1;
  for (const g of input.globals) {
    C.nextId += 1;
    V.set(`0:${g.name}`, { id: C.nextId, scope: 0, name: g.name, t: g.t, kind: g.kind, nid: -1, fi: -1, fnNode: -1, mutOwned: false, assigned: false, cellParam: false, checked: true, lazy: { k: "none" } });
  }
  const fn = K.fnExpr(K, T, V, W, C, null, input.fn, null, input.injected);
  ixDrain(K, C);
  return { fn, diags: ixOut(C.diags), unsup: ixOut(C.unsup), gap: C.gap, facts: ixFoldFacts(T, V, C.facts) };
};
