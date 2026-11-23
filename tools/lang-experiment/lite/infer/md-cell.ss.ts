// One step of core.ts's cell loop (checkSources lines 226-367): a cell's syntax pass, injection, captures, check and
// value rules, its record, and what it gives the cells after it.

// the syntax pass: bans as errors of the record, satisfies as unsupported in the Checker log; then a reserved cell name
export const mdSyntax = (syntaxBans, mdDiag, ixUnsup, reservedCellName, RESERVED_CELL_MSG) => (K: IxK, C: IxCtls, X: MdCtx, L: MdL, d: MdDef): void => {
  for (const s of syntaxBans(d.fn)) {
    if (s.unsup) ixUnsup(K, C, s.at, s.msg);
    else mdDiag(X, L, s.at, s.rule, s.msg);
  }
  if (reservedCellName(d.name)) mdDiag(X, L, d.fn, "reserved-name", RESERVED_CELL_MSG(d.name));
};
// the compile hook of this cell's check: the module's tables as they are now, and this cell's errors so far
export const mdHookOf = (mdCompileType) => (ix: IxReg, X: MdCtx, value: Map<string, Ty | null>, refInner: Map<string, Ty>, out: Map<string, MdCellRec>, me: MdCellRec) =>
  (e: AstNode, options: Ty | null): MdCompiled => mdCompileType({ X, value, refInner, out: new Map([...out, [me.name, me]]) }, ix, e, options);
// the record: the errors written straight to it, then the Checker's, each list deduplicated; the value rules after
export const mdRecord = (mdDedupe) => (X: MdCtx, L: MdL, rec: MdCellRec, ch: IxDiag[], chUnsup: IxDiag[]): MdCellRec => ({
  ...rec,
  errors: mdDedupe([...L.errors, ...ch.map((x) => ({ rule: x.rule, line: X.line(x.start), msg: x.msg }))]),
  unsupported: mdDedupe(chUnsup.map((x) => ({ rule: "unsupported", line: X.line(x.start), msg: x.msg }))),
  blockedBy: L.blockedBy, ch, chUnsup,
});
// what the cell gives the cells after it: its value type when usable, its inner types, and whether it is a listener
export const mdKeep = (hasErrWith, show) => (X: MdCtx, M: MdMod, d: MdDef, rec: MdCellRec, v: MdValueOut): MdCellRec => {
  // [mut-cell] on a value is a backstop: a Mut reaches a value only past a rule that already reported in the cell
  const errors = [...rec.errors, ...v.errors.filter((e) => e.rule !== "mut-cell" || rec.errors.length === 0)];
  const usable = !hasErrWith(X.R.ops)(v.value) && (rec.unsupported.length === 0 || d.fn.returnType !== null);
  M.value = new Map([...M.value, [d.name, usable ? v.value : null]]);
  const ev = v.events;
  if (ev !== null) M.eventsInner = new Map([...M.eventsInner, [d.name, ev]]);
  const ref = v.ref;
  if (ref !== null) {
    M.refInner = new Map([...M.refInner, [d.name, ref]]);
    M.stateful = new Map([...M.stateful, [d.name, "is a state cell"]]);
  }
  if (v.listener) M.listeners = new Set([...M.listeners, d.name]);
  const status: MdStatus = errors.length ? "rejected" : rec.unsupported.length ? "unsupported" : rec.blockedBy.length ? "blocked" : "ok";
  return { ...rec, errors, value: show(v.value), status };
};
// one cell's check; the first thing the port does not implement, or null
export const mdCell = (ixKnot, ixFreshCtl, ixDrain, mdSyntax, mdInject, mdTainted, mdFedBy, mdMarkStateful, owTaintCaptures, captureMessage, mdDiag, mdHookOf, mdRunChecks, ixOut, mdRecord, mdValueRules, mdKeep) => (X: MdCtx, M: MdMod, d: MdDef): string | null => {
  const rec = M.out.get(d.name);
  if (M.value.has(d.name) || rec === undefined) return null;
  const R = X.R.cell(d.fn.start);
  const K: IxK = ixKnot(R.ix, X.src, X.cellNames, X.R.allowed, X.probe);
  const C: IxCtls = { ...ixFreshCtl(X.count) };
  C.nextFlow = 1;
  const L: MdL = { errors: rec.errors, ch: [], chUnsup: [], blockedBy: [] };
  mdSyntax(K, C, X, L, d);
  const injected = mdInject(K, C, X, M, L, d);
  const tainted = mdTainted(X, M, d), fedBy = mdFedBy(M, d);
  mdMarkStateful(M, d, tainted, fedBy);
  const byName = owTaintCaptures(d.fn, tainted);
  for (const cap of byName) mdDiag(X, L, cap.at, "action-capture", captureMessage(cap));
  ixDrain(K, C);
  const hook = mdHookOf(R.ix, X, M.value, M.refInner, M.out, { ...rec, errors: L.errors });
  const K2: IxK = ixKnot(R.withHook(hook), X.src, X.cellNames, X.R.allowed, X.probe);
  const run = mdRunChecks(K2, C, X, d, injected, tainted, new Set(byName.map((c) => c.at.nid)));
  const r1 = mdRecord(X, L, rec, ixOut(C.diags), ixOut(C.unsup));
  const v = mdValueRules(K2.reg, X, d, run.fnT, fedBy);
  // what the registry reports from here on reaches the Checker but not the record (core.ts copies the lists above)
  ixDrain(K2, C);
  if (M.probe === null) M.probe = C.probe;
  M.out = new Map([...M.out, [d.name, { ...mdKeep(X, M, d, r1, v), ch: ixOut(C.diags), chUnsup: ixOut(C.unsup), casts: C.casts.toSorted((a, b) => a[0] - b[0]).map((x) => x[1]) }]]);
  return run.gap ?? v.gap;
};
