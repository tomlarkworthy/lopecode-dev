// One step of core.ts's cell loop (checkSources lines 226-367): a cell's syntax pass, injection, captures, check and
// value rules, its record, and what it gives the cells after it.

// the syntax pass: bans as errors of the record, satisfies as unsupported in the Checker log; then a reserved cell name
// d1 (2026-11-24): a cell named after a prelude name a compiled cell binds from the runtime module (X.bound, core.ts)
export const RESERVED_PRELUDE_MSG = () => (name: string): string =>
  `${name} is reserved as a cell name: it is a prelude name, which a compiled cell that uses it binds from the runtime module, so a cell named ${name} clashes with that binding; give the cell another name`;
// t1 (2026-11-24), F-1/F-2: a cell named after a capability or a global a compiled cell takes by name; F-3: a $ in a
// cell name (runCells names a state cell's handle x$ref), and a binding h in a cell with JSX (JSX lowers to h(...))
export const RESERVED_INPUT_MSG = () => (name: string): string =>
  `${name} is reserved as a cell name: a compiled cell takes ${name} (a capability or a global) by that name from outside the module, so a reader of a cell named ${name} gets that and not the cell; give the cell another name`;
export const RESERVED_DOLLAR_MSG = () => (name: string): string =>
  `${name} is reserved as a cell name: a cell name may not hold $, which the runners use in the names they make (a state cell x has a handle x$ref); give the cell another name`;
export const RESERVED_JSX_H_MSG = () => "h is reserved in a cell with JSX: each JSX element is a call h(...), which a local or parameter named h would take; give it another name";
export const PROTO_MEMBER_MSG = () => (name: string, opt: boolean): string => opt
  ? `${name} may not be a member's name: it is a member of Object.prototype or one a conversion calls (a template string, +, ==, String(), JSON.stringify, join, sort and await call toString, valueOf, toJSON and then), so a conversion would run a value's own ${name} or read the inherited one; give the member another name`
  : `__proto__ may not be declared as a member: it is the object's prototype, not a member; give the member another name`;
// w1 (2026-11-24, F-4): each name bound under n (a declarator, a function's name or parameters, a catch parameter) that
// JavaScript reads as a keyword although the parser bound it (the TS plugin takes const this = …): parsed alone as an
// expression, the name is not an Identifier
export const mdKeywordNames = (parseTree, childrenOf) => (n: AstNode): Identifier[] => {
  const out: Mut<Identifier[]> = [];
  const keyword = (name: string): boolean => {
    const p = parseTree(`(${name});`, false), s = p.ok && p.ast.program.type === "Program" ? p.ast.program.body[0] : undefined;
    return s === undefined || s.type !== "ExpressionStatement" || s.expression.type !== "Identifier";
  };
  const pat = (p: AstNode | null): void => {
    if (p === null) return;
    if (p.type === "Identifier") { if (keyword(p.name)) out.push(p); }
    else if (p.type === "ObjectPattern") { for (const x of p.properties) pat(x.type === "Property" ? x.value : x.type === "RestElement" ? x.argument : null); }
    else if (p.type === "ArrayPattern") { for (const x of p.elements) pat(x); }
    else if (p.type === "AssignmentPattern") pat(p.left);
    else if (p.type === "RestElement") pat(p.argument);
  };
  const walk = (x: AstNode): void => {
    if (x.type === "VariableDeclarator") pat(x.id);
    if (x.type === "CatchClause") pat(x.param);
    if (x.type === "FunctionDeclaration" || x.type === "FunctionExpression" || x.type === "ArrowFunctionExpression") { pat(x.id); for (const q of x.params) pat(q); }
    for (const c of childrenOf(x)) walk(c.node);
  };
  walk(n);
  return out;
};
export const KEYWORD_NAME_MSG = () => (name: string): string => `${name} is reserved: JavaScript reads it as a keyword, so the compiled cell would not parse; give it another name`;
export const mdSyntax = (syntaxBans, mdDiag, ixUnsup, reservedCellName, RESERVED_CELL_MSG, RESERVED_PRELUDE_MSG, reservedText, RESERVED_TEXT_MSG, RESERVED_INPUT_MSG, RESERVED_DOLLAR_MSG, RESERVED_JSX_H_MSG, mdJsxH, mdProtoMembers, PROTO_MEMBER_MSG, mdKeywordNames, KEYWORD_NAME_MSG) => (K: IxK, C: IxCtls, X: MdCtx, L: MdL, d: MdDef): void => {
  for (const s of syntaxBans(d.fn)) {
    if (s.unsup) ixUnsup(K, C, s.at, s.msg);
    else mdDiag(X, L, s.at, s.rule, s.msg);
  }
  if (reservedCellName(d.name)) mdDiag(X, L, d.fn, "reserved-name", RESERVED_CELL_MSG(d.name));
  else if (X.bound.includes(d.name)) mdDiag(X, L, d.fn, "reserved-name", RESERVED_PRELUDE_MSG(d.name));
  else if (X.R.inputs.has(d.name)) mdDiag(X, L, d.fn, "reserved-name", RESERVED_INPUT_MSG(d.name));
  else if (d.name.includes("$")) mdDiag(X, L, d.fn, "reserved-name", RESERVED_DOLLAR_MSG(d.name));
  const h = mdJsxH(d.stmt);
  if (h !== null) mdDiag(X, L, h, "reserved-name", RESERVED_JSX_H_MSG);
  for (const p of mdProtoMembers(d.stmt, X.R.proto)) mdDiag(X, L, p.at, "banned-member", PROTO_MEMBER_MSG(p.name, p.opt));
  for (const k of mdKeywordNames(d.stmt)) mdDiag(X, L, k, "reserved-name", KEYWORD_NAME_MSG(k.name));
  const m = reservedText(X.src.slice(d.stmt.start, d.stmt.end));
  if (m !== null) mdDiag(X, L, d.fn, "reserved-name", RESERVED_TEXT_MSG(d.name, m));
};
// F-3: the first binding named h (a declarator, parameter, function name or catch parameter, in any pattern) of a
// statement that holds JSX, or null
export const mdJsxH = (kidsOf) => (n: AstNode): AstNode | null => {
  const st: Mut<{ jsx: boolean; at: AstNode | null }> = { jsx: false, at: null };
  const pat = (p: AstNode | null): void => {
    if (p === null || st.at !== null) return;
    if (p.type === "Identifier") { if (p.name === "h") st.at = p; }
    else if (p.type === "ArrayPattern") for (const x of p.elements) pat(x);
    else if (p.type === "ObjectPattern") for (const x of p.properties) pat(x.type === "RestElement" ? x.argument : x.type === "Property" ? x.value : null);
    else if (p.type === "AssignmentPattern") pat(p.left);
    else if (p.type === "RestElement") pat(p.argument);
  };
  const walk = (x: AstNode): void => {
    if (x.type === "JSXElement" || x.type === "JSXFragment") st.jsx = true;
    if (x.type === "VariableDeclarator") pat(x.id);
    if (x.type === "ArrowFunctionExpression" || x.type === "FunctionExpression" || x.type === "FunctionDeclaration") { pat(x.id); for (const p of x.params) pat(p); }
    if (x.type === "CatchClause") pat(x.param);
    for (const k of kidsOf(x)) walk(k);
  };
  walk(n);
  return st.jsx ? st.at : null;
};
// B-1: each member signature under n (in type positions too) named __proto__ or, w1 (2026-11-24, Step 2), named in
// proto (Object.prototype's names and the conversion members, core.ts PROTO_MEMBERS), optional or not; and each key of
// an object literal named in proto (__proto__ as a key is ix-expr.ss.ts ixProtoKey's)
export const mdProtoMembers = (childrenOf) => (n: AstNode, proto: Set<string>): { at: AstNode; name: string; opt: boolean }[] => {
  const out: Mut<{ at: AstNode; name: string; opt: boolean }[]> = [];
  const nameOf = (k: AstNode): string | null => (k.type === "Identifier" ? k.name : k.type === "Literal" && typeof k.value === "string" ? k.value : null);
  const walk = (x: AstNode): void => {
    if (x.type === "TSPropertySignature" || x.type === "TSMethodSignature") {
      const name = x.computed === true ? null : nameOf(x.key);
      if (name !== null && (name === "__proto__" || proto.has(name))) out.push({ at: x, name, opt: name !== "__proto__" });
    }
    if (x.type === "ObjectExpression") for (const p of x.properties) if (p.type === "Property" && !p.computed) { const name = nameOf(p.key); if (name !== null && name !== "__proto__" && proto.has(name)) out.push({ at: p, name, opt: true }); }
    for (const k of childrenOf(x)) walk(k.node);
  };
  walk(n);
  return out;
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
  return { ...rec, errors, value: show(v.value), status, promises: v.promises };
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
  M.out = new Map([...M.out, [d.name, { ...mdKeep(X, M, d, r1, v), ch: ixOut(C.diags), chUnsup: ixOut(C.unsup), casts: C.casts.toSorted((a, b) => a[0] - b[0]).map((x) => x[1]), holes: C.holes.toSorted((a, b) => a[0] - b[0]).map((x) => x[1]) }]]);
  return run.gap ?? v.gap;
};
