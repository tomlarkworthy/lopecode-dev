// Object and array literals, as const, and destructuring patterns (lite/infer.ts objLit, arrLit, constLit,
// bindPattern, notOwn, indexOf).

// a spread or rest copies own enumerable properties; an intrinsic object's members (Math.floor) are not
export const ixNotOwn = (ixErr) => (K: IxK, C: IxCtls, r: Rec, at: AstNode): void => {
  const k = [...r.props].find(([, p]) => p.flags?.intrinsic)?.[0];
  if (k !== undefined) ixErr(K, C, at, "type", `${at.type === "RestElement" ? "rest" : "spread"} of a built-in object: its member ${k} is not an own property, so the copy would not have it`);
};
// the record members of the expected type, and whether a property it does not name is an excess one
export const ixObjCtx = (ixUm, isNamed) => (R: IxRegCore, expected: Ty | null): { recs: Rec[]; exact: boolean } => {
  if (expected === null) return { recs: [], exact: false };
  const recs = ixUm(R, expected).map((m) => R.expand(isNamed(m, "Mut") && m.k === "named" ? m.args[0] ?? m : m)).flatMap((m) => (m.k === "rec" ? [m] : []));
  const exact = recs.length > 0 && recs.length === ixUm(R, expected).filter((m) => m.k !== "null" && m.k !== "undef").length && recs.every((x) => !x.index);
  return { recs, exact };
};
export const ixObjSpread = (ixUm, ixUnsup, ixNotOwn, unwrap, show) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, p: SpreadElement, props: Mut<Map<string, Prop>>): void => {
  const st = K.infer(K, T, V, W, C, env, p.argument);
  const ms = ixUm(K.reg, unwrap(st)).filter((m) => m.k !== "undef" && m.k !== "null");
  const m0 = ms[0];
  if (ms.length !== 1 || m0 === undefined) { if (st.k !== "err") ixUnsup(K, C, p, `object spread of ${show(st)}`); return; }
  const x = K.reg.expand(m0);
  if (x.k !== "rec" || x.index) { if (x.k !== "err") ixUnsup(K, C, p, `object spread of ${show(x)}`); return; }
  ixNotOwn(K, C, x, p);
  for (const [k, v] of x.props) props.set(k, v);
};
export const ixObjLit = (ixObjCtx, ixObjSpread, ixProtoKey, ixErr, ixUnsup, ixGap, union, widen, show) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: ObjectExpression, expected: Ty | null): Ty => {
  const props: Mut<Map<string, Prop>> = mut(new Map());
  const { recs, exact } = ixObjCtx(K.reg, expected);
  for (const p of e.properties) {
    if (p.type === "SpreadElement") { ixObjSpread(K, T, V, W, C, env, p, props); continue; }
    if (p.type !== "Property") { ixGap(C, `object member ${p.type}`); continue; }
    if (p.kind !== "init") { ixUnsup(K, C, p, `${p.kind} accessor`); continue; }
    if (p.computed) { ixUnsup(K, C, p, "computed property"); continue; }
    ixProtoKey(K, C, p);
    const key = p.key, k = key.type === "Identifier" ? key.name : key.type === "Literal" ? String(key.value) : null;
    if (k === null) { ixGap(C, `object key ${key.type}`); continue; }
    const cs = recs.flatMap((x) => { const c = x.props.get(k)?.t ?? x.index; return c ? [c] : []; });
    const ctx = cs.length ? union(cs) : null;
    if (exact && ctx === null && expected !== null) ixErr(K, C, p, "excess-property", `property ${k} is not in ${show(expected)}`);
    const t = K.check(K, T, V, W, C, env, p.value, ctx, false, false);
    props.set(k, { t: expected === null ? widen(t) : t, opt: false });
  }
  return { k: "rec", props: freeze(props) };
};
// the element context of an array literal: an array's element, an iterable's
export const ixElCtx = (union, NEVER) => (ms: Ty[]): Ty | null => {
  const c = union(ms.map((m) => (m.k === "arr" ? m.el : m.k === "named" && (m.n === "Iterable" || m.n === "ArrayLike") ? m.args[0] ?? NEVER : NEVER)));
  return c.k === "never" ? null : c;
};
export const ixArrLit = (ixUm, ixElCtx, ixErr, ixUnsup, union, widen, arr, show, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: ArrayExpression, expected: Ty | null): Ty => {
  const ms = expected === null ? [] : ixUm(K.reg, expected).map((m) => K.reg.expand(m));
  const tup = ms.find((m) => m.k === "tup" && m.els.length === e.elements.length);
  const noSpread = e.elements.every((x) => x !== null && x.type !== "SpreadElement");
  if (tup !== undefined && tup.k === "tup" && noSpread) {
    const ts: Mut<Ty[]> = mut([]);
    for (const [i, x] of e.elements.entries()) if (x !== null) ts.push(K.check(K, T, V, W, C, env, x, tup.els[i] ?? null, false, false));
    return { k: "tup", els: freeze(ts) };
  }
  const ctx = expected === null ? null : ixElCtx(ms);
  const els: Mut<Ty[]> = mut([]);
  for (const x of e.elements) {
    if (x === null) { ixUnsup(K, C, e, "array hole"); continue; }
    if (x.type === "SpreadElement") {
      const st = K.infer(K, T, V, W, C, env, x.argument), el = K.reg.iterElem(st);
      if (!el) ixErr(K, C, x, "type", `spread of non-iterable ${show(st)}`);
      els.push(el ?? ERR);
      continue;
    }
    els.push(K.check(K, T, V, W, C, env, x, ctx, false, false));
  }
  const el = union(freeze(els));
  return arr(ctx !== null ? el : widen(el));
};
export const ixConstLit = (ixUnsup, ixProtoKey, ERR) => {
  function constLit(K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode): Ty {
    if (e.type === "ArrayExpression") {
      const els: Mut<Ty[]> = mut([]);
      for (const x of e.elements) {
        if (x !== null && x.type !== "SpreadElement") els.push(constLit(K, T, V, W, C, env, x));
        else { ixUnsup(K, C, e, "as const with spread"); els.push(ERR); }
      }
      const t: Ty = { k: "tup", els: freeze(els) };
      T.set(e.nid, t);
      return t;
    }
    if (e.type !== "ObjectExpression") return K.infer(K, T, V, W, C, env, e);
    const props: Mut<Map<string, Prop>> = mut(new Map());
    for (const p of e.properties) {
      if (p.type !== "Property" || p.computed || p.kind !== "init" || p.method) { ixUnsup(K, C, p, "as const object member"); continue; }
      ixProtoKey(K, C, p);
      const key = p.key;
      props.set(key.type === "Identifier" ? key.name : key.type === "Literal" ? String(key.value) : "undefined", { t: constLit(K, T, V, W, C, env, p.value), opt: false });
    }
    const r: Ty = { k: "rec", props: freeze(props) };
    T.set(e.nid, r);
    return r;
  }
  return constLit;
};

// ---- patterns ----
export const ixBind = (ixDeclare, ixBindObject, ixBindArray, ixNonUndef, ixUnsup, ixGap, widen, union) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, p: AstNode, t: Ty, kind: IxKind, extra: IxExtra): void => {
  switch (p.type) {
    case "Identifier": ixDeclare(V, C, env, p.name, kind === "let" ? widen(t) : t, kind, p, extra, { k: "none" }, false, -1); return;
    case "AssignmentPattern": {
      const nt = ixNonUndef(K.reg, t);
      const dt = K.check(K, T, V, W, C, env, p.right, nt, false, false);
      K.bind(K, T, V, W, C, env, p.left, K.reg.sub(dt, nt) && nt.k !== "never" ? nt : union([nt, dt]), kind, extra);
      return;
    }
    case "ObjectPattern": ixBindObject(K, T, V, W, C, env, p, t, kind, extra); return;
    case "ArrayPattern": ixBindArray(K, T, V, W, C, env, p, t, kind, extra); return;
    case "Other": ixGap(C, `pattern ${p.kind} (Other)`); return;
    default: ixUnsup(K, C, p, `pattern ${p.type}`);
  }
};
export const ixBindObject = (ixBindRest, ixUm, ixErr, ixUnsup, ixInActionOnly, ixPropOf, ixFact, ixGap, isNamed, unwrap) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, p: ObjectPattern, t: Ty, kind: IxKind, extra: IxExtra): void => {
  const used: Mut<string[]> = mut([]);
  for (const prop of p.properties) {
    if (prop.type === "RestElement") { ixBindRest(K, T, V, W, C, env, prop, t, [...used], kind, extra); continue; }
    if (prop.type !== "Property") { ixGap(C, `object pattern member ${prop.type}`); continue; }
    const key = prop.key;
    if (prop.computed || (key.type !== "Identifier" && key.type !== "Literal")) { ixUnsup(K, C, prop, "computed destructuring key"); continue; }
    const k = key.type === "Identifier" ? key.name : String(key.value);
    used.push(k);
    if (ixUm(K.reg, t).some((m) => m.k !== "err" && K.reg.member(m, k)?.flags?.banned)) ixErr(K, C, prop, "banned-member", `${k} is banned`);
    if (ixUm(K.reg, t).some((m) => isNamed(unwrap(m), "State") && K.reg.member(m, k))) {
      ixInActionOnly(K, C, env, prop, "state-write", `State.${k} outside action(...)`);
      ixFact(C, { k: "stateProp", at: prop.nid });
    }
    K.bind(K, T, V, W, C, env, prop.value, ixPropOf(K, C, t, k, prop), kind, extra);
  }
};
export const ixBindRest = (ixUnsup, ixNotOwn, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, prop: RestElement, t: Ty, used: string[], kind: IxKind, extra: IxExtra): void => {
  const base = K.reg.expand(t);
  if (base.k !== "rec") { ixUnsup(K, C, prop, "object rest of a non-record"); K.bind(K, T, V, W, C, env, prop.argument, ERR, kind, extra); return; }
  const r: Rec = { k: "rec", props: new Map([...base.props].filter(([k]) => !used.includes(k))) };
  ixNotOwn(K, C, r, prop);
  K.bind(K, T, V, W, C, env, prop.argument, r, kind, extra);
};
export const ixBindArray = (ixIndexOf, arr, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, p: ArrayPattern, t: Ty, kind: IxKind, extra: IxExtra): void => {
  for (const [i, el] of p.elements.entries()) {
    if (el === null) continue;
    if (el.type !== "RestElement") { K.bind(K, T, V, W, C, env, el, ixIndexOf(K, C, t, i, el), kind, extra); continue; }
    const e = K.reg.expand(t);
    K.bind(K, T, V, W, C, env, el.argument, e.k === "tup" ? { k: "tup", els: e.els.slice(i) } : arr(K.reg.iterElem(t) ?? ERR), kind, extra);
  }
};
export const ixIndexOf = (ixUm, ixErr, unwrap, union, show, UNDEF, ERR) => (K: IxK, C: IxCtls, t: Ty, i: number, at: AstNode): Ty => {
  const out: Mut<Ty[]> = mut([]);
  for (const m0 of ixUm(K.reg, t)) {
    const m = unwrap(m0), e = K.reg.expand(m);
    if (e.k === "tup") {
      const x = e.els[i];
      if (x === undefined) { ixErr(K, C, at, "type", `tuple ${show(e)} has no element ${i}`); return ERR; }
      out.push(x);
      continue;
    }
    const el = K.reg.iterElem(e);
    if (!el) { ixErr(K, C, at, "type", `${show(m)} is not indexable`); return ERR; }
    out.push(el);
    if (K.reg.strictIndex) out.push(UNDEF);
  }
  return union(freeze(out));
};
