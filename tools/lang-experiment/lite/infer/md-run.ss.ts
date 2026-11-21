// One cell's check inside core.ts's try (checkSources lines 330-338): inference, ownership, actionEscapes and the
// captures the Checker's facts show, on the cell's Checker log C. A throw is the crash path: what was written stays,
// and the cell gets "checker crashed: <message>" as unsupported.

export type MdRun = { readonly fnT: Ty; readonly facts: IxFacts | null; readonly crash: string | null; readonly gap: string | null };
// ixCheckFn on a log the injection already wrote to: the globals bound in scope 0, then the cell's function
export const mdInferFn = (ixFoldFacts) => (K: IxK, C: IxCtls, X: MdCtx, fn: FnNode, injected: Ty[]): { fnT: Ty; facts: IxFacts } => {
  const T: IxTypes = mut(new Map()), V: IxVars = mut(new Map()), W: IxFlows = mut(new Map([[0, new Map()]]));
  for (const g of X.R.globals) {
    C.nextId += 1;
    V.set(`0:${g.name}`, { id: C.nextId, scope: 0, name: g.name, t: g.t, kind: g.kind, nid: -1, fi: -1, fnNode: -1, mutOwned: false, assigned: false, cellParam: false, checked: true, lazy: { k: "none" } });
  }
  const fnT = K.fnExpr(K, T, V, W, C, null, fn, null, injected);
  return { fnT, facts: ixFoldFacts(T, V, C.facts) };
};
// ownership and actionEscapes, then the captures by binding (opaqueCaptures), over one index of the cell's tree
export const mdAfterInfer = (owIndex, owCheckIn, owOpaqueCaptures, ixDrain, ixPush, captureMessage) => (K: IxK, C: IxCtls, F: IxFacts, fn: FnNode, tainted: Map<string, string>, skip: Set<number>): string | null => {
  const T = owIndex(F, fn);
  const own = owCheckIn(K.reg, F, T);
  ixDrain(K, C);
  for (const d of [...own.diags, ...own.actions]) C.diags = ixPush(C.diags, d);
  for (const u of own.unsup) C.unsup = ixPush(C.unsup, u);
  const opaque = owOpaqueCaptures({ T, F, R: K.reg }, tainted, skip);
  ixDrain(K, C);
  for (const c of opaque) C.diags = ixPush(C.diags, { start: c.at.start, end: c.at.end, rule: "action-capture", msg: captureMessage(c) });
  return T.other;
};
// the try: a throw keeps what the log holds and becomes an unsupported item at the cell's function
export const mdRunChecks = (mdInferFn, mdAfterInfer, ixDrain, ixUnsup, ERR) => (K: IxK, C: IxCtls, X: MdCtx, d: MdDef, injected: Ty[], tainted: Map<string, string>, skip: Set<number>): MdRun => {
  let fnT: Ty = ERR, facts: IxFacts | null = null, gap: string | null = null;
  try {
    const r = mdInferFn(K, C, X, d.fn, injected);
    fnT = r.fnT;
    facts = r.facts;
    gap = mdAfterInfer(K, C, r.facts, d.fn, tainted, skip);
  } catch (e) {
    ixDrain(K, C);
    const msg = X.R.thrown(e);
    ixUnsup(K, C, d.fn, `checker crashed: ${msg}`);
    return { fnT, facts, crash: msg, gap: C.gap };
  }
  ixDrain(K, C);
  return { fnT, facts, crash: null, gap: C.gap ?? gap };
};
// core.ts dedupe: the first of each line, rule and message
export const mdDedupe = () => (es: MdErr[]): MdErr[] => {
  const seen: Mut<Set<string>> = mut(new Set());
  const out: Mut<MdErr[]> = mut([]);
  for (const e of es) {
    const k = `${e.line}:${e.rule}:${e.msg}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return freeze(out);
};
