// The injected parameter types of core.ts checkSources (lines 235-301): what each parameter of a cell is given, and the
// rules on it. Errors go straight to the cell's record (L); the registry's reports and [action-pass]/[handle-pass] go
// to the cell's Checker log (C), as core.ts's diag and ch do.

// the annotation of a parameter, pattern or rest element (p.typeAnnotation?.typeAnnotation)
export const mdAnn = () => (p: AstNode): AstNode | null => {
  const a = p.type === "Identifier" || p.type === "ObjectPattern" || p.type === "ArrayPattern" || p.type === "RestElement" ? p.typeAnnotation : null;
  return a !== null && a.type === "TSTypeAnnotation" ? a.typeAnnotation : null;
};
// the plain name of a type reference (ann.typeName.name)
export const mdRefName = () => (ann: AstNode | null): string | null =>
  ann !== null && ann.type === "TSTypeReference" && ann.typeName.type === "Identifier" ? ann.typeName.name : null;
// diag: an error of the cell's record at a node's line
export const mdDiag = () => (X: MdCtx, L: MdL, at: AstNode, rule: string, msg: string): void => {
  L.errors = [...L.errors, { rule, line: X.line(at.start), msg }];
};
// a handle parameter (State<T>, Events<T>) naming a cell: the cell's inner type must be T both ways
export const mdInjectHandle = (mdDiag, isNamed, show, ixGap) => (K: IxK, C: IxCtls, X: MdCtx, M: MdMod, L: MdL, p: Identifier, ann: AstNode, wrapper: string): Ty => {
  const state = wrapper === "State", name = p.name;
  const inner = (state ? M.refInner : M.eventsInner).get(name);
  const want = K.reg.convert(ann, [], null);
  const wrapped = want.k === "named" && isNamed(want, wrapper);
  const a0 = want.k === "named" && wrapped ? want.args[0] : undefined;
  // core.ts reads want.args[0] unguarded
  if (wrapped && a0 === undefined) return ixGap(C, "State or Events with no type argument");
  const ok = inner !== undefined && a0 !== undefined && K.reg.sub(inner, a0) && K.reg.sub(a0, inner);
  if (!ok) mdDiag(X, L, p, state ? "inject-state" : "inject-events", `${name} is not a ${state ? "state cell" : "sync generator cell"} ${state ? `of ${show(want)}` : `yielding ${show(a0 ?? want)}`}`);
  return want;
};
// a parameter that names a cell of the module: its value type (null when it takes it as it is), or ERR
export const mdInjectCell = (mdDiag, mdInjectHandle, ERR) => (K: IxK, C: IxCtls, X: MdCtx, M: MdMod, L: MdL, p: Identifier, ann: AstNode | null, wrapper: string | null): { t: Ty; done: boolean } => {
  const name = p.name, v = M.value.get(name);
  if (v === null || v === undefined) { L.blockedBy = [...L.blockedBy, name]; return { t: ERR, done: true }; }
  if (wrapper !== null && ann !== null) return { t: mdInjectHandle(K, C, X, M, L, p, ann, wrapper), done: true };
  if (M.listeners.has(name)) { mdDiag(X, L, p, "listener-placement", `${name} is a listener; no cell may take one, so it ends only when ${name} runs again`); return { t: ERR, done: true }; }
  if (X.takenAsEvents.has(name)) { mdDiag(X, L, p, "inject-events", `${name} is taken as Events elsewhere, so a reader gets the handle; type this parameter Events<...>`); return { t: ERR, done: true }; }
  return { t: v, done: false };
};
// a parameter that names a foreign value
export const mdInjectForeign = (mdDiag, owIter, show) => (K: IxK, X: MdCtx, L: MdL, p: Identifier, fv: MdForeignValue): Ty => {
  if (fv.marker === "effect") mdDiag(X, L, p, "foreign-effect", `checked cell takes /** effect */ foreign ${p.name}`);
  const fit = owIter(K.reg, fv.t);
  if (fit !== null) mdDiag(X, L, p, "iterator-cell", `foreign ${p.name}: ${show(fv.t)} may hold an iterator (${fit}); every cell that takes it would use up the same one`);
  return fv.t;
};
// a shell cell typed as a function crosses as a function from another language does (core.ts shellFn)
export const mdShellFn = () => (X: MdCtx, ann: AstNode | null, wrapper: string | null): boolean => ann !== null && wrapper === null && X.R.peekType(ann).k === "fn";
// the boundary's rules on a parameter's annotation (the last two of the cell in another language's branch)
export const mdBoundaryRules = (mdDiag, boundaryShapeAt, show) => (K: IxK, X: MdCtx, M: MdMod, L: MdL, cell: string, p: Identifier, inner: Ty, state: boolean): MdBoundary | null => {
  const shape = boundaryShapeAt(inner, { expand: K.reg.expand, isAlias: K.reg.isAlias }, !state);
  if (shape.k === "error") { mdDiag(X, L, p, "boundary-type", `${p.name}: ${show(inner)} cannot cross from another language: it is or holds ${shape.error}`); return null; }
  if (!state) return { shape, ref: false };
  const first = M.viewTypes.get(p.name);
  if (first !== undefined && !(K.reg.sub(first.ty, inner) && K.reg.sub(inner, first.ty))) {
    mdDiag(X, L, p, "boundary-state", `viewof ${p.name} is taken as State<${show(first.ty)}> by ${first.cell}; every State to one view has the same type`);
    return null;
  }
  if (first === undefined) M.viewTypes = new Map([...M.viewTypes, [p.name, { ty: inner, cell }]]);
  return { shape, ref: true };
};
// a cell in another language (or a shell cell): the annotation is the type, checked when a value crosses
export const mdInjectBoundary = (mdDiag, mdBoundaryRules, hasErrWith, isNamed, ixGap, ERR) => (K: IxK, C: IxCtls, X: MdCtx, M: MdMod, L: MdL, cell: string, p: Identifier, ann: AstNode | null, wrapper: string | null): Ty => {
  const name = p.name;
  if (ann === null) { mdDiag(X, L, p, "boundary-unannotated", `${name} is a cell in another language; annotate the parameter with the type it must have, e.g. ${name}: number`); return ERR; }
  if (wrapper === "Events") { mdDiag(X, L, p, "boundary-type", `${name} is a cell in another language; it cannot be taken as Events`); return ERR; }
  const view = X.outside.get(name)?.view ?? false;
  if (wrapper === "State" && !view) { mdDiag(X, L, p, "boundary-state", `${name} has no viewof; only an Observable JavaScript view, or a SoundScript state cell imported with its viewof, can be taken as State`); return ERR; }
  const want = K.reg.convert(ann, [], null);
  const state = wrapper === "State";
  const isState = want.k === "named" && isNamed(want, "State");
  const a0 = want.k === "named" && isState ? want.args[0] : undefined;
  if (state && isState && a0 === undefined) return ixGap(C, "State with no type argument");
  const inner = state && a0 !== undefined ? a0 : want;
  if (hasErrWith(X.R.ops)(inner)) return ERR;
  const b = mdBoundaryRules(K, X, M, L, cell, p, inner, state);
  if (b === null) return ERR;
  const mine: Map<string, MdBoundary> = M.boundaries.get(cell) ?? new Map();
  M.boundaries = new Map([...M.boundaries, [cell, new Map([...mine, [name, b]])]]);
  return want;
};
// the annotation of a parameter given a value type: the value must be assignable to it, and not hide an Action
export const mdInjectAnn = (mdDiag, ixHides, isNamed, show) => (K: IxK, C: IxCtls, X: MdCtx, L: MdL, p: Identifier, ann: AstNode | null, vt: Ty): Ty => {
  if (ann === null) return vt;
  const want = K.reg.convert(ann, [], null);
  const widenBorrow = vt.k === "named" && isNamed(vt, "Borrowed") && !(want.k === "named" && isNamed(want, "Borrowed"));
  if (widenBorrow || !K.reg.sub(vt, want)) mdDiag(X, L, p, "inject-type", `${p.name}: ${show(vt)} is not assignable to ${show(want)}`);
  else ixHides(K, C, p, vt, want, null);
  return want;
};
// one parameter's injected type, by what it names: a cell, a foreign value, a shell cell, a capability, a cell in
// another language; a handle (State, Events) only of a cell
export const mdInjectParam = (mdAnn, mdRefName, mdDiag, mdInjectCell, mdInjectForeign, mdShellFn, mdInjectBoundary, mdInjectAnn, named, UNKNOWN, ERR) => (K: IxK, C: IxCtls, X: MdCtx, M: MdMod, L: MdL, cell: string, p: AstNode): Ty => {
  if (p.type !== "Identifier") { mdDiag(X, L, p, "inject-pattern", "an injected parameter must be a plain identifier"); return ERR; }
  const name = p.name, ann = mdAnn(p), ref = mdRefName(ann);
  if (ref === "Source" || ref === "Sub") {
    mdDiag(X, L, p, "inject-events", ref === "Source" ? "Source was renamed Events: type this parameter Events<...>" : "Sub was renamed Listener, and no cell may take a listener");
    return ERR;
  }
  const wrapper = ref === "State" || ref === "Events" ? ref : null;
  let vt: Ty = ERR;
  if (X.cellNames.has(name)) {
    const r = mdInjectCell(K, C, X, M, L, p, ann, wrapper);
    if (r.done) return r.t;
    vt = r.t;
  } else {
    const fv = X.foreign.get(name), cap = X.R.capabilities.get(name), shell = X.shellNames.has(name);
    if (fv !== undefined) vt = mdInjectForeign(K, X, L, p, fv);
    else if (shell && !mdShellFn(X, ann, wrapper)) vt = UNKNOWN;
    else if (cap !== undefined && !shell) vt = named(cap);
    else if (X.outside.has(name) || shell) return mdInjectBoundary(K, C, X, M, L, cell, p, ann, wrapper);
    else { mdDiag(X, L, p, "inject-unknown", `parameter ${name} names no cell, foreign or capability`); return ERR; }
  }
  if (wrapper !== null) { mdDiag(X, L, p, wrapper === "State" ? "inject-state" : "inject-events", `${name} is not a ${wrapper === "State" ? "state cell" : "sync generator cell"}`); return ERR; }
  return mdInjectAnn(K, C, X, L, p, ann, vt);
};
// every parameter's type, then the parameters whose type holds one lite does not understand
export const mdInject = (mdInjectParam, mdDiag, owMut, hasErrWith) => (K: IxK, C: IxCtls, X: MdCtx, M: MdMod, L: MdL, d: MdDef): Ty[] => {
  const injected: Mut<Ty[]> = [];
  for (const p of d.fn.params) injected.push(mdInjectParam(K, C, X, M, L, d.name, p));
  const hasErr = hasErrWith(X.R.ops);
  for (const [i, t] of injected.entries()) {
    const p = d.fn.params[i], mt = owMut(K.reg, t);
    // an input is never a Mut, annotated so or given one (a foreign value typed Mut<…> included)
    if (mt !== null && p !== undefined && p.type === "Identifier") mdDiag(X, L, p, "mut-cell", `input ${p.name}: ${mt}; an input is never a Mut: the cell it comes from and every other cell that takes it share it`);
    if (t.k !== "err" && hasErr(t) && p !== undefined && p.type === "Identifier") L.blockedBy = [...L.blockedBy, `${p.name} (type not understood)`];
  }
  return injected;
};
