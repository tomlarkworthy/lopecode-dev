// JSX (lite/infer.ts jsx): checked as the call it lowers to, an intrinsic tag against IntrinsicElements[tag] and a
// component as a call with one props object. The synthetic nodes take the original spans and fresh nids.

export type IxSpan = { nid: number; start: number; end: number; line: number };
export const ixAt = () => (C: IxCtls, n: AstNode): IxSpan => {
  C.nextNid += 1;
  return { nid: C.nextNid, start: n.start, end: n.end, line: n.line };
};
export const ixJsxProp = (ixAt) => (C: IxCtls, n: AstNode, keyAt: AstNode, name: string, value: AstNode): AstNode =>
  ({ ...ixAt(C, n), type: "Property", kind: "init", computed: false, method: false, shorthand: false, key: { ...ixAt(C, keyAt), type: "Identifier", name, optional: null, typeAnnotation: null }, value });
// a text child as the string literal it gives; null for whitespace that holds a line break
export const ixJsxText = (ixAt) => (C: IxCtls, c: JSXText): AstNode | null => {
  const t = c.value.replace(/\s*\n\s*/g, " ");
  if (t.trim() === "" && c.value.includes("\n")) return null;
  return { ...ixAt(C, c), type: "Literal", value: t, raw: JSON.stringify(t), regex: null, bigint: null };
};
export const ixJsxChildren = (ixJsxText, ixUnsup, ixGap) => (K: IxK, C: IxCtls, e: JSXElement | JSXFragment): AstNode[] | null => {
  const out: Mut<AstNode[]> = [];
  for (const c of e.children) {
    if (c.type === "Other") { ixGap(C, `jsx child ${c.kind} (Other)`); return null; }
    if (c.type === "JSXText") { const t = ixJsxText(C, c); if (t !== null) out.push(t); }
    else if (c.type === "JSXExpressionContainer") { if (c.expression.type !== "JSXEmptyExpression") out.push(c.expression); }
    else if (c.type === "JSXElement" || c.type === "JSXFragment") out.push(c);
    else { ixUnsup(K, C, c, c.type); return null; }
  }
  return out;
};
// a bare attribute (<a b/>) is true
export const ixJsxProps = (ixJsxProp, ixAt, ixUnsup, ixGap) => (K: IxK, C: IxCtls, op: JSXOpeningElement): AstNode[] | null => {
  const out: Mut<AstNode[]> = [];
  for (const a of op.attributes) {
    if (a.type === "Other") { ixGap(C, `jsx attribute ${a.kind} (Other)`); return null; }
    if (a.type !== "JSXAttribute" || a.name.type !== "JSXIdentifier") { ixUnsup(K, C, a, a.type === "JSXAttribute" ? "namespaced attribute" : "spread attribute"); return null; }
    const raw = a.value;
    let v: AstNode;
    if (raw === null) v = { ...ixAt(C, a), type: "Literal", value: true, raw: "true", regex: null, bigint: null };
    else if (raw.type === "Literal") v = raw;
    else if (raw.type === "JSXExpressionContainer" && raw.expression.type !== "JSXEmptyExpression") v = raw.expression;
    else { ixUnsup(K, C, a, "attribute value"); return null; }
    out.push(ixJsxProp(C, a, a.name, a.name.name, v));
  }
  return out;
};
// e1 (2026-11-23), B4: key is the renderer's, as on an element (CommonProps), and is not given to the component; a9
// (2026-11-23), B-1: h does not pass it (lite/jsx/h.ts), so a component whose props declare key is rejected after the call
export const ixJsxGiven = (ixAt, union, STR, NUM) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, op: AstNode, all: AstNode[]): AstNode => {
  const isKey = (x: AstNode): boolean => x.type === "Property" && x.key.type === "Identifier" && x.key.name === "key";
  for (const k of all.filter(isKey)) if (k.type === "Property") K.check(K, T, V, W, C, env, k.value, union([STR, NUM]), false, false);
  return { ...ixAt(C, op), type: "ObjectExpression", properties: all.filter((x) => !isKey(x)) };
};
export const ixJsxKeyProp = (ixUm, ixErr) => (K: IxK, T: IxTypes, C: IxCtls, e: AstNode, callee: AstNode, name: string): void => {
  const ct = T.get(callee.nid);
  if (ct === undefined || ct.k === "err") return;
  const declares = K.reg.callSigs(ct).some((s) => { const p = s.ps[0]?.t; return p !== undefined && ixUm(K.reg, p).some((m) => m.k !== "err" && K.reg.member(m, "key") !== undefined); });
  if (declares) ixErr(K, C, e, "type", `component ${name}'s props declare key, which JSX keeps for the renderer and does not pass to a component: rename the prop (for example id) and pass it as id={...}`);
};
export const ixJsx = (ixJsxChildren, ixJsxProps, ixJsxProp, ixJsxGiven, ixJsxKeyProp, ixAt, ixUnsup, ixErr, ixGap, named, show, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode): Ty => {
  const ELEM = named("Elem");
  if (e.type !== "JSXElement" && e.type !== "JSXFragment") return ixGap(C, `jsx ${e.type}`);
  const children = ixJsxChildren(K, C, e);
  if (children === null) return ERR;
  if (e.type === "JSXFragment") { for (const k of children) K.check(K, T, V, W, C, env, k, named("Child"), false, false); return ELEM; }
  const op = e.openingElement;
  if (op.type !== "JSXOpeningElement") return ixGap(C, `jsx opening ${op.type}`);
  const props = ixJsxProps(K, C, op);
  if (props === null) return ERR;
  const all = children.length ? [...props, ixJsxProp(C, e, e, "children", { ...ixAt(C, e), type: "ArrayExpression", elements: children })] : props;
  const obj: AstNode = { ...ixAt(C, op), type: "ObjectExpression", properties: all };
  const name = op.name;
  if (name.type !== "JSXIdentifier") { ixUnsup(K, C, name, "member or namespaced element name"); return ERR; }
  if (/^[a-z]/.test(name.name)) {
    const p = K.reg.member(named("IntrinsicElements"), name.name);
    if (!p) { ixErr(K, C, name, "no-member", `<${name.name}> is not a declared element`); K.infer(K, T, V, W, C, env, obj); return ERR; }
    K.check(K, T, V, W, C, env, obj, p.t, false, false);
    return ELEM;
  }
  const callee: AstNode = { ...ixAt(C, name), type: "Identifier", name: name.name, optional: null, typeAnnotation: null };
  const t = K.call(K, T, V, W, C, env, { ...ixAt(C, e), type: "CallExpression", optional: false, callee, arguments: [ixJsxGiven(K, T, V, W, C, env, op, all)], typeArguments: null }, ELEM);
  if (t.k !== "err" && !K.reg.sub(t, ELEM)) ixErr(K, C, e, "type", `component ${name.name} returns ${show(t)}, not Elem`);
  ixJsxKeyProp(K, T, C, e, callee, name.name);
  return ELEM;
};
