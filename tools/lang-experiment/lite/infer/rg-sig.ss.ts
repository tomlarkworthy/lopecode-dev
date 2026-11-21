// Registry.sig and Registry.literal over the typed tree: signatures, their parameters, and the members of a type
// literal or interface body, with the @-flags of their leading comments.

export const RG_FLAG_NAMES = () => ["mutates", "fresh", "view", "retains", "banned"];
// flagsOf: the flags a declaration's leading comments name, and intrinsic for the intrinsics; null for none
export const rgFlags = (RG_FLAG_NAMES, leadingComments) => (ast: Ast, n: AstNode, origin: RgOrigin): Flags | null => {
  const f: Mut<Flags> = mut({});
  let any = false;
  for (const c of leadingComments(ast, n.start)) for (const k of RG_FLAG_NAMES) {
    if (!c.text.includes("@" + k)) continue;
    any = true;
    if (k === "mutates") f.mutates = true; else if (k === "fresh") f.fresh = true; else if (k === "view") f.view = true; else if (k === "retains") f.retains = true; else f.banned = true;
  }
  if (origin === "intrinsic") { f.intrinsic = true; any = true; }
  return any ? freeze(f) : null;
};
export const rgKeyName = () => (k: AstNode): string | null => (k.type === "Identifier" ? k.name : k.type === "Literal" ? String(k.value) : null);
// the names of a type parameter declaration
export const rgTpNames = (rgGap) => (Q: RgCtls, tp: AstNode | null): string[] => {
  if (tp === null) return [];
  if (tp.type !== "TSTypeParameterDeclaration") { rgGap(Q, `type parameters held as ${tp.type}`); return []; }
  for (const x of tp.params) if (x.type !== "TSTypeParameter") rgGap(Q, `type parameter held as ${x.type}`);
  return tp.params.flatMap((x) => (x.type === "TSTypeParameter" ? [x.name] : []));
};
export const rgTpChecks = (rgUnsup) => (Q: RgCtls, tp: AstNode | null): void => {
  if (tp === null || tp.type !== "TSTypeParameterDeclaration") return;
  for (const x of tp.params) if (x.type === "TSTypeParameter" && (x.constraint !== null || x.default !== null)) rgUnsup(Q, x, "type parameter constraint/default");
};
export const rgSig = (rgTpNames, rgTpChecks, rgSigParam, VOID) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, params: AstNode[], ret: AstNode | null, tp: AstNode | null, c: RgCtx, flags: Flags | null): Fn => {
  const tps = rgTpNames(Q, tp);
  rgTpChecks(Q, tp);
  const inner: RgCtx = { ...c, tps: new Set([...c.tps, ...tps]) };
  const ps: Mut<Param[]> = mut([]);
  let rest: Ty | undefined = undefined;
  for (const q of params) {
    const o = rgSigParam(G, Y, E, I, Q, q, inner);
    if (o.k === "param") ps.push(o.p);
    else if (o.k === "rest") rest = o.t;
  }
  const r = ret !== null ? G.convert(G, Y, E, I, Q, ret, inner) : VOID;
  return flags !== null ? { k: "fn", tps, ps: freeze(ps), rest, ret: r, flags } : { k: "fn", tps, ps: freeze(ps), rest, ret: r };
};
// the annotation of a parameter's name or pattern
export const rgParamAnn = (rgAnn, rgOther) => (Q: RgCtls, id: AstNode): AstNode | null =>
  rgOther(Q, id) ? null : id.type === "Identifier" || id.type === "ObjectPattern" || id.type === "ArrayPattern" || id.type === "RestElement" ? rgAnn(Q, id.typeAnnotation) : null;
export const RG_PARAMS = () => new Set(["RestElement", "Identifier", "ObjectPattern", "ArrayPattern", "AssignmentPattern"]);
export const rgSigParam = (rgParamAnn, rgUnsup, rgGap, RG_PARAMS, nodeKind, UNKNOWN, ERR) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, q: AstNode, c: RgCtx): RgParamOut => {
  if (q.type === "RestElement") {
    const a = rgParamAnn(Q, q) ?? rgParamAnn(Q, q.argument);
    const t = a !== null ? G.convert(G, Y, E, I, Q, a, c) : UNKNOWN;
    return { k: "rest", t: t.k === "arr" ? t.el : rgUnsup(Q, q, "rest parameter type") };
  }
  if (q.type === "Identifier" || q.type === "ObjectPattern" || q.type === "ArrayPattern" || q.type === "AssignmentPattern") {
    const id = q.type === "AssignmentPattern" ? q.left : q;
    const a = rgParamAnn(Q, id);
    const t = a !== null ? G.convert(G, Y, E, I, Q, a, c) : rgUnsup(Q, q, "untyped parameter in a signature");
    const opt = (id.type === "Identifier" && id.optional === true) || q.type === "AssignmentPattern";
    return { k: "param", p: { n: id.type === "Identifier" ? id.name : "_", t, opt } };
  }
  if (RG_PARAMS.has(nodeKind(q))) { rgGap(Q, `parameter ${nodeKind(q)} held as Other`); return { k: "param", p: { n: "_", t: ERR, opt: false } }; }
  rgUnsup(Q, q, `parameter ${nodeKind(q)}`);
  return { k: "none" };
};

// the node types literal reads fields of
export const RG_MEMBERS = () => new Set(["TSPropertySignature", "TSMethodSignature", "TSIndexSignature", "TSCallSignatureDeclaration", "TSConstructSignatureDeclaration"]);
export const rgLiteral = (rgMember) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, ms: AstNode[], c: RgCtx): Rec => {
  const props: Mut<Map<string, Prop>> = mut(new Map());
  const over: Mut<Map<string, Fn[]>> = mut(new Map());
  let acc: RgAcc = { index: undefined, calls: undefined, ctors: undefined };
  for (const m of ms) acc = rgMember(G, Y, E, I, Q, props, over, m, c, acc);
  return { k: "rec", props: freeze(props), index: acc.index, calls: acc.calls, ctors: acc.ctors };
};
// a Prop with its flags when it has any
export const rgProp = () => (t: Ty, opt: boolean, flags: Flags | null): Prop => (flags !== null ? { t, opt, flags } : { t, opt });
export const rgMember = (rgFlags, rgPropSig, rgMethodSig, rgIndexSig, rgAnn, RG_MEMBERS, nodeKind, rgUnsup, rgGap) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, props: Mut<Map<string, Prop>>, over: Mut<Map<string, Fn[]>>, m: AstNode, c: RgCtx, acc: RgAcc): RgAcc => {
  const fl = rgFlags(c.ast, m, c.origin);
  if (m.type === "TSPropertySignature") rgPropSig(G, Y, E, I, Q, props, m, c, fl);
  else if (m.type === "TSMethodSignature") rgMethodSig(G, Y, E, I, Q, props, over, m, c, fl);
  else if (m.type === "TSIndexSignature") return { ...acc, index: rgIndexSig(G, Y, E, I, Q, m, c) ?? acc.index };
  else if (m.type === "TSCallSignatureDeclaration") return { ...acc, calls: [...(acc.calls ?? []), G.sig(G, Y, E, I, Q, m.parameters, rgAnn(Q, m.typeAnnotation), m.typeParameters, c, fl)] };
  else if (m.type === "TSConstructSignatureDeclaration") return { ...acc, ctors: [...(acc.ctors ?? []), G.sig(G, Y, E, I, Q, m.parameters, rgAnn(Q, m.typeAnnotation), m.typeParameters, c, fl)] };
  else if (RG_MEMBERS.has(nodeKind(m))) rgGap(Q, `member ${nodeKind(m)} held as Other`);
  else rgUnsup(Q, m, nodeKind(m));
  return acc;
};
export const rgPropSig = (rgKeyName, rgAnn, rgProp, rgUnsup, UNKNOWN, rgOther) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, props: Mut<Map<string, Prop>>, m: AstNode, c: RgCtx, fl: Flags | null): void => {
  if (m.type !== "TSPropertySignature" || rgOther(Q, m.key)) return;
  const k = rgKeyName(m.key);
  if (m.computed || k === null) { rgUnsup(Q, m, "computed property signature"); return; }
  const a = rgAnn(Q, m.typeAnnotation);
  props.set(k, rgProp(a !== null ? G.convert(G, Y, E, I, Q, a, c) : UNKNOWN, m.optional === true, fl));
};
// overloads of one name make a record of call signatures
export const rgMethodSig = (rgKeyName, rgAnn, rgProp, rgUnsup, rgOther) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, props: Mut<Map<string, Prop>>, over: Mut<Map<string, Fn[]>>, m: AstNode, c: RgCtx, fl: Flags | null): void => {
  if (m.type !== "TSMethodSignature" || rgOther(Q, m.key)) return;
  const k = rgKeyName(m.key);
  if (m.computed || k === null || (m.kind !== "" && m.kind !== "method")) { rgUnsup(Q, m, "computed/accessor method signature"); return; }
  const f = G.sig(G, Y, E, I, Q, m.parameters, rgAnn(Q, m.typeAnnotation), m.typeParameters, c, fl);
  const list = [...(over.get(k) ?? []), f];
  over.set(k, list);
  const only = list[0];
  props.set(k, rgProp(list.length === 1 && only !== undefined ? only : { k: "rec", props: new Map(), calls: list }, false, fl));
};
// a string index signature's value type; undefined when it is not one
export const rgIndexSig = (rgAnn, rgUnsup, rgGap, rgOther) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, m: AstNode, c: RgCtx): Ty | undefined => {
  if (m.type !== "TSIndexSignature") return undefined;
  const p0 = m.parameters[0];
  if (p0 !== undefined && rgOther(Q, p0)) return undefined;
  const kt = p0 !== undefined && p0.type === "Identifier" ? rgAnn(Q, p0.typeAnnotation) : null;
  if (kt === null || kt.type !== "TSStringKeyword") { rgUnsup(Q, m, "non-string index signature"); return undefined; }
  const a = rgAnn(Q, m.typeAnnotation);
  if (a === null) { rgGap(Q, "index signature without a type"); return undefined; }
  return G.convert(G, Y, E, I, Q, a, c);
};
