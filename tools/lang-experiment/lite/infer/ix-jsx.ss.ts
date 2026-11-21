// JSX (lite/infer.ts jsx): checked as the call it lowers to, an intrinsic tag against IntrinsicElements[tag] and a
// component as a call with one props object. The synthetic nodes take the original spans and fresh nids.

export type IxSpan = { nid: number; start: number; end: number; line: number };
export const ixAt = () => (C: IxCtls, n: AstNode): IxSpan => {
  C.nextNid += 1;
  return { nid: C.nextNid, start: n.start, end: n.end, line: n.line };
};
export const ixJsxProp = (ixAt) => (C: IxCtls, n: AstNode, keyAt: AstNode, name: string, value: AstNode): AstNode =>
  ({ type: "Property", ...ixAt(C, n), kind: "init", computed: false, method: false, shorthand: false, key: { type: "Identifier", ...ixAt(C, keyAt), name, optional: null, typeAnnotation: null }, value });
// a text child as the string literal it gives; null for whitespace that holds a line break
export const ixJsxText = (ixAt) => (C: IxCtls, c: JSXText): AstNode | null => {
  const t = c.value.replace(/\s*\n\s*/g, " ");
  if (t.trim() === "" && c.value.includes("\n")) return null;
  return { type: "Literal", ...ixAt(C, c), value: t, raw: JSON.stringify(t), regex: null, bigint: null };
};
export const ixJsxChildren = (ixJsxText, ixUnsup, ixGap) => (K: IxK, C: IxCtls, e: JSXElement | JSXFragment): AstNode[] | null => {
  const out: Mut<AstNode[]> = mut([]);
  for (const c of e.children) {
    if (c.type === "Other") { ixGap(C, `jsx child ${c.kind} (Other)`); return null; }
    if (c.type === "JSXText") { const t = ixJsxText(C, c); if (t !== null) out.push(t); }
    else if (c.type === "JSXExpressionContainer") { if (c.expression.type !== "JSXEmptyExpression") out.push(c.expression); }
    else if (c.type === "JSXElement" || c.type === "JSXFragment") out.push(c);
    else { ixUnsup(K, C, c, c.type); return null; }
  }
  return freeze(out);
};
// a bare attribute (<a b/>) is true
export const ixJsxProps = (ixJsxProp, ixAt, ixUnsup, ixGap) => (K: IxK, C: IxCtls, op: JSXOpeningElement): AstNode[] | null => {
  const out: Mut<AstNode[]> = mut([]);
  for (const a of op.attributes) {
    if (a.type === "Other") { ixGap(C, `jsx attribute ${a.kind} (Other)`); return null; }
    if (a.type !== "JSXAttribute" || a.name.type !== "JSXIdentifier") { ixUnsup(K, C, a, a.type === "JSXAttribute" ? "namespaced attribute" : "spread attribute"); return null; }
    const raw = a.value;
    let v: AstNode;
    if (raw === null) v = { type: "Literal", ...ixAt(C, a), value: true, raw: "true", regex: null, bigint: null };
    else if (raw.type === "Literal") v = raw;
    else if (raw.type === "JSXExpressionContainer" && raw.expression.type !== "JSXEmptyExpression") v = raw.expression;
    else { ixUnsup(K, C, a, "attribute value"); return null; }
    out.push(ixJsxProp(C, a, a.name, a.name.name, v));
  }
  return freeze(out);
};
export const ixJsx = (ixJsxChildren, ixJsxProps, ixJsxProp, ixAt, ixUnsup, ixErr, ixGap, named, show, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode): Ty => {
  const ELEM = named("Elem");
  if (e.type !== "JSXElement" && e.type !== "JSXFragment") return ixGap(C, `jsx ${e.type}`);
  const children = ixJsxChildren(K, C, e);
  if (children === null) return ERR;
  if (e.type === "JSXFragment") { for (const k of children) K.check(K, T, V, W, C, env, k, named("Child"), false, false); return ELEM; }
  const op = e.openingElement;
  if (op.type !== "JSXOpeningElement") return ixGap(C, `jsx opening ${op.type}`);
  const props = ixJsxProps(K, C, op);
  if (props === null) return ERR;
  const all = children.length ? [...props, ixJsxProp(C, e, e, "children", { type: "ArrayExpression", ...ixAt(C, e), elements: children })] : props;
  const obj: AstNode = { type: "ObjectExpression", ...ixAt(C, op), properties: all };
  const name = op.name;
  if (name.type !== "JSXIdentifier") { ixUnsup(K, C, name, "member or namespaced element name"); return ERR; }
  if (/^[a-z]/.test(name.name)) {
    const p = K.reg.member(named("IntrinsicElements"), name.name);
    if (!p) { ixErr(K, C, name, "no-member", `<${name.name}> is not a declared element`); K.infer(K, T, V, W, C, env, obj); return ERR; }
    K.check(K, T, V, W, C, env, obj, p.t, false, false);
    return ELEM;
  }
  const callee: AstNode = { type: "Identifier", ...ixAt(C, name), name: name.name, optional: null, typeAnnotation: null };
  const t = K.call(K, T, V, W, C, env, { type: "CallExpression", ...ixAt(C, e), optional: false, callee, arguments: [obj], typeArguments: null }, ELEM);
  if (t.k !== "err" && !K.reg.sub(t, ELEM)) ixErr(K, C, e, "type", `component ${name.name} returns ${show(t)}, not Elem`);
  return ELEM;
};
