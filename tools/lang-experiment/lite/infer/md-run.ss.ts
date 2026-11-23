// One cell's check inside core.ts's try (checkSources lines 330-338): inference, ownership, actionEscapes and the
// captures the Checker's facts show, on the cell's Checker log C. A throw is the crash path: what was written stays,
// and the cell gets "checker crashed: <message>" as unsupported.

export type MdRun = { readonly fnT: Ty; readonly facts: IxFacts | null; readonly crash: string | null; readonly gap: string | null };
// ixCheckFn on a log the injection already wrote to: the globals bound in scope 0, then the cell's function
export const mdInferFn = (ixFoldFacts) => (K: IxK, C: IxCtls, X: MdCtx, fn: FnNode, injected: Ty[]): { fnT: Ty; facts: IxFacts } => {
  const T: IxTypes = new Map(), V: IxVars = new Map(), W: IxFlows = new Map([[0, new Map()]]);
  for (const g of X.R.globals) {
    C.nextId += 1;
    V.set(`0:${g.name}`, { id: C.nextId, scope: 0, name: g.name, t: g.t, kind: g.kind, nid: -1, fi: -1, fnNode: -1, mutOwned: false, assigned: false, cellParam: false, checked: true, lazy: { k: "none" } });
  }
  const fnT = K.fnExpr(K, T, V, W, C, null, fn, null, injected);
  return { fnT, facts: ixFoldFacts(T, V, C.facts) };
};
// ownership and actionEscapes, then the captures by binding (opaqueCaptures) and memo's rules, over one index of the cell's tree
export const mdAfterInfer = (owIndex, owCheckIn, owOpaqueCaptures, mdMemoErrs, ixDrain, ixPush, captureMessage) => (K: IxK, C: IxCtls, X: MdCtx, F: IxFacts, fn: FnNode, tainted: Map<string, string>, skip: Set<number>): string | null => {
  const T = owIndex(F, fn);
  const own = owCheckIn(K.reg, F, T);
  ixDrain(K, C);
  for (const d of [...own.diags, ...own.actions]) C.diags = ixPush(C.diags, d);
  for (const u of own.unsup) C.unsup = ixPush(C.unsup, u);
  const opaque = owOpaqueCaptures({ T, F, R: K.reg }, tainted, skip);
  ixDrain(K, C);
  for (const c of opaque) C.diags = ixPush(C.diags, { start: c.at.start, end: c.at.end, rule: "action-capture", msg: captureMessage(c) });
  for (const d of mdMemoErrs(K, X, { T, F, R: K.reg }, tainted)) C.diags = ixPush(C.diags, d);
  ixDrain(K, C);
  return T.other;
};
// what a parameter of memo's function may not hold (no freeze reaches these, or they are state), and what its result may
// not hold (every call would share it)
export const MEMO_PARAM_BAD = () => ["Mut", "Borrowed", "State", "StateCell", "Action", "Events", "Listener", "Promise", "Generator", "AsyncGenerator", "Pool", "Compile", "Elem", "FetchResponse", "URLSearchParams", "DataView"];
export const MEMO_RESULT_BAD = () => ["Mut", "Borrowed", "State", "StateCell", "Action", "Events", "Listener", "Promise", "Generator", "AsyncGenerator", "Iterator", "IterableIterator", "Pool", "Compile", "FetchResponse"];
// memo(f) (S2.13): each parameter of f takes data, and f's result holds no shared state
export const mdMemoSig = (holdsWith, ixFnParts, show, owIter, MEMO_PARAM_BAD, MEMO_RESULT_BAD) => (K: IxK, X: MdCtx, O: OwCtx, f: AstNode): IxDiag[] => {
  const t = O.F.types.get(f.nid), parts = ixFnParts(f), holds = holdsWith(X.R.ops);
  if (t === undefined || t.k !== "fn" || parts === null || parts.async || parts.generator) return [];
  const out: Mut<IxDiag[]> = [];
  const err = (at: AstNode, msg: string) => out.push({ start: at.start, end: at.end, rule: "memo-pure", msg });
  t.ps.forEach((p, i) => {
    const at = parts.params[i] ?? f, w = holds(p.t, MEMO_PARAM_BAD);
    if (K.reg.mayHide(p.t)) err(at, `a parameter of memo's function is ${show(p.t)}, which may be or hold a function: a function may read a capability, so the stored result could be stale; take data`);
    else if (w === "Mut") err(at, `a parameter of memo's function is ${show(p.t)}: memo freezes its arguments, so take it under its plain type`);
    else if (w !== null) err(at, `a parameter of memo's function holds a ${w}, which memo cannot freeze or which is state; take data`);
  });
  const r = holds(t.ret, MEMO_RESULT_BAD);
  if (r !== null) err(f, `memo's function returns a value that holds a ${r}, which every call would share`);
  const it = r === null ? owIter(K.reg, t.ret) : null;
  if (it) err(f, `memo's function returns a value that may hold an iterator (${it}), which every call would share and reading uses up; return an array`);
  return out;
};
// memo(f) (S2.13): from outside itself f uses only what an action body may (owCapturesIn), no capability, and no
// state handle or action; a let or a Mut it captures is R-K's ([let-capture], [mut-capture])
export const mdMemoUses = (owCapturesIn, owFree, owIdsAndComps, holdsWith, isNamed) => (X: MdCtx, O: OwCtx, tainted: Map<string, string>, f: AstNode): IxDiag[] => {
  const err = (at: AstNode, msg: string): IxDiag => ({ start: at.start, end: at.end, rule: "memo-pure", msg });
  const tail = "; a memoised function may use from outside itself only inputs that hold no state and the consts and functions made from them, since a stored result would not see a change: pass the value as an argument";
  const rk = (b: IxBinding) => b.kind === "let" || b.mutOwned || isNamed(b.t, "Mut");
  const out: Mut<IxDiag[]> = [], seen: Mut<Set<string>> = new Set();
  for (const c of owCapturesIn(O, tainted, new Set(), [f])) {
    const b = O.F.bindings.get(O.F.bindingOf.get(c.at.nid) ?? -1);
    seen.add(c.name);
    const why = c.opaque ? c.why.replace("after the action is made", "after memo's function is made") : c.why.startsWith("capability ") ? "is a capability" : `depends on state (${c.why})`;
    if (b === undefined || !rk(b)) out.push(err(c.at, `${c.name} ${why}${tail}`));
  }
  const holds = holdsWith(X.R.ops);
  for (const b of new Set(owFree(O, { ...owIdsAndComps(O), tainted }, [f]))) {
    if (seen.has(b.name)) continue;
    seen.add(b.name);
    const w = b.cellParam && X.R.capabilities.has(b.name) ? `the capability ${b.name}` : holds(b.t, ["State", "StateCell", "Action", "Events", "Listener"]);
    if (w !== null) out.push(err(f, `memo's function uses ${b.name}, which is or holds ${w.startsWith("the ") ? w : (w === "Action" || w === "Events" ? "an " : "a ") + w}: a call that gives a stored result would skip what it does${tail}`));
  }
  return out;
};
// each memo(f) of the cell: the prelude's memo (the call's fact), f a function literal
export const mdMemoErrs = (mdMemoSig, mdMemoUses, isFnNode) => (K: IxK, X: MdCtx, O: OwCtx, tainted: Map<string, string>): IxDiag[] =>
  O.T.all.flatMap((n) => {
    if (n.type !== "CallExpression" || O.F.calls.get(n.nid)?.prelude !== "memo") return [];
    const f = n.arguments[0];
    return f !== undefined && isFnNode(f) ? [...mdMemoSig(K, X, O, f), ...mdMemoUses(X, O, tainted, f)] : [];
  });
// the try: a throw keeps what the log holds and becomes an unsupported item at the cell's function
export const mdRunChecks = (mdInferFn, mdAfterInfer, ixDrain, ixUnsup, ERR) => (K: IxK, C: IxCtls, X: MdCtx, d: MdDef, injected: Ty[], tainted: Map<string, string>, skip: Set<number>): MdRun => {
  let fnT: Ty = ERR, facts: IxFacts | null = null, gap: string | null = null;
  try {
    const r = mdInferFn(K, C, X, d.fn, injected);
    fnT = r.fnT;
    facts = r.facts;
    gap = mdAfterInfer(K, C, X, r.facts, d.fn, tainted, skip);
  } catch (e) {
    ixDrain(K, C);
    const msg = messageOf(e);
    ixUnsup(K, C, d.fn, `checker crashed: ${msg}`);
    return { fnT, facts, crash: msg, gap: C.gap };
  }
  ixDrain(K, C);
  return { fnT, facts, crash: null, gap: C.gap ?? gap };
};
// core.ts dedupe: the first of each line, rule and message
export const mdDedupe = () => (es: MdErr[]): MdErr[] => {
  const seen: Mut<Set<string>> = new Set();
  const out: Mut<MdErr[]> = [];
  for (const e of es) {
    const k = `${e.line}:${e.rule}:${e.msg}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
};
