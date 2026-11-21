// Registry.convert over the typed tree: a type annotation node to a Ty, one cell per case. A node the typed tree
// holds as Other where registry.ts reads its fields is a gap.

// KEYWORDS: TSAnyKeyword is reported as no-any by the syntax pass
export const RG_KEYWORDS = (NUM, STR, BOOL, BIGINT, NULL, UNDEF, VOID, NEVER, UNKNOWN, OBJECT, SYMBOL, ERR) => new Map<string, Ty>([
  ["TSNumberKeyword", NUM], ["TSStringKeyword", STR], ["TSBooleanKeyword", BOOL], ["TSBigIntKeyword", BIGINT],
  ["TSNullKeyword", NULL], ["TSUndefinedKeyword", UNDEF], ["TSVoidKeyword", VOID], ["TSNeverKeyword", NEVER],
  ["TSUnknownKeyword", UNKNOWN], ["TSObjectKeyword", OBJECT], ["TSSymbolKeyword", SYMBOL], ["TSAnyKeyword", ERR],
]);
// the node types convert reads fields of
export const RG_CONVERTED = () => new Set(["TSParenthesizedType", "TSLiteralType", "TSUnionType", "TSArrayType", "TSTupleType", "TSTypeOperator", "TSFunctionType", "TSTypeLiteral", "TSTypeQuery", "TSTypeReference"]);
// the generics of the prelude that take exactly one argument, whatever a module declares under their names
export const RG_ONE_ARG = () => new Set(["State", "StateCell", "Events", "Mut", "Borrowed"]);
// the type inside a TSTypeAnnotation
export const rgAnn = (rgOther) => (Q: RgCtls, n: AstNode | null): AstNode | null => (rgOther(Q, n) || n === null || n.type !== "TSTypeAnnotation" ? null : n.typeAnnotation);
// an Other node where registry.ts reads a field: a gap
export const rgOther = (rgGap, nodeKind) => (Q: RgCtls, n: AstNode | null): boolean => {
  if (n === null || n.type !== "Other") return false;
  rgGap(Q, `${nodeKind(n)} held as Other`);
  return true;
};
// a ctx with no type parameters and no typeof lookup, in a parse
export const rgBareCtx = () => (ast: Ast, origin: RgOrigin): RgCtx => ({ tps: new Set(), look: null, ast, origin });

export const rgConvert = (RG_KEYWORDS, rgConvertTs, rgOtherType, rgUnsup) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, n: AstNode, c: RgCtx): Ty => {
  const kw = RG_KEYWORDS.get(n.type);
  if (kw !== undefined) return kw;
  if (n.type === "Other") return rgOtherType(Q, n);
  const t = rgConvertTs(G, Y, E, I, Q, n, c);
  return t !== null ? t : rgUnsup(Q, n, `${n.type.startsWith("TS") ? n.type.slice(2) : n.type} type`);
};
// the cases of convert's switch; null for the default
export const rgConvertTs = (union, arr, rgLitType, rgTuple, rgTypeQuery, rgTypeRef, rgUnsup, rgAnn) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, n: AstNode, c: RgCtx): Ty | null => {
  switch (n.type) {
    case "TSParenthesizedType": return G.convert(G, Y, E, I, Q, n.typeAnnotation, c);
    case "TSLiteralType": return rgLitType(Q, n);
    case "TSUnionType": {
      const ts: Mut<Ty[]> = mut([]);
      for (const x of n.types) ts.push(G.convert(G, Y, E, I, Q, x, c));
      return union(freeze(ts));
    }
    case "TSArrayType": return arr(G.convert(G, Y, E, I, Q, n.elementType, c));
    case "TSTupleType": return rgTuple(G, Y, E, I, Q, n, c);
    case "TSTypeOperator": return n.operator === "readonly" ? G.convert(G, Y, E, I, Q, n.typeAnnotation, c) : rgUnsup(Q, n, `type operator ${n.operator}`);
    case "TSFunctionType": return G.sig(G, Y, E, I, Q, n.parameters, rgAnn(Q, n.typeAnnotation), n.typeParameters, c, null);
    case "TSTypeLiteral": return G.literal(G, Y, E, I, Q, n.members, c);
    case "TSTypeQuery": return rgTypeQuery(Q, n, c);
    case "TSTypeReference": return rgTypeRef(G, Y, E, I, Q, n, c);
    default: return null;
  }
};
// an Other node: registry.ts's default message when convert would not read it, else a gap
export const rgOtherType = (RG_CONVERTED, RG_KEYWORDS, nodeKind, rgUnsup, rgGap) => (Q: RgCtls, n: AstNode): Ty => {
  const k = nodeKind(n);
  if (RG_CONVERTED.has(k) || RG_KEYWORDS.has(k)) return rgGap(Q, `convert: ${k} held as Other`);
  return rgUnsup(Q, n, `${k.startsWith("TS") ? k.slice(2) : k} type`);
};
export const rgLitType = (lit, rgUnsup, rgGap, rgOther, ERR) => (Q: RgCtls, n: AstNode): Ty => {
  if (n.type !== "TSLiteralType") return rgGap(Q, "literal type node");
  const l = n.literal;
  if (rgOther(Q, l)) return ERR;
  if (l.type === "Literal" && (typeof l.value === "string" || typeof l.value === "number" || typeof l.value === "boolean")) return lit(l.value);
  if (l.type === "UnaryExpression" && rgOther(Q, l.argument)) return ERR;
  if (l.type === "UnaryExpression" && l.operator === "-" && l.argument.type === "Literal" && typeof l.argument.value === "number") return lit(-l.argument.value);
  if (l.type === "TemplateLiteral" && l.expressions.length === 0) {
    const q = l.quasis[0];
    if (q === undefined || q.type !== "TemplateElement" || q.value.cooked === null) return rgGap(Q, "template literal type");
    return lit(q.value.cooked);
  }
  return rgUnsup(Q, n, "literal type");
};
export const rgTuple = (nodeKind, ERR, rgUnsup) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, n: AstNode, c: RgCtx): Ty => {
  if (n.type !== "TSTupleType") return ERR;
  const els: Mut<Ty[]> = mut([]);
  for (const e of n.elementTypes) {
    const k = nodeKind(e);
    if (k === "TSNamedTupleMember" || k === "TSOptionalType" || k === "TSRestType") return rgUnsup(Q, e, k);
    els.push(G.convert(G, Y, E, I, Q, e, c));
  }
  return { k: "tup", els: freeze(els) };
};
export const rgTypeQuery = (rgUnsup, rgOther, ERR) => (Q: RgCtls, n: AstNode, c: RgCtx): Ty => {
  if (n.type === "TSTypeQuery" && rgOther(Q, n.exprName)) return ERR;
  if (n.type === "TSTypeQuery" && n.exprName.type === "Identifier" && c.look !== null) {
    const t = c.look.get(n.exprName.name);
    if (t !== undefined) return t;
  }
  return rgUnsup(Q, n, "typeof type query");
};
// the type arguments, converted before the name is looked at
export const rgArgs = (rgGap) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, ta: AstNode | null, c: RgCtx): Ty[] => {
  const out: Mut<Ty[]> = mut([]);
  if (ta === null) return freeze(out);
  if (ta.type !== "TSTypeParameterInstantiation") { rgGap(Q, `type arguments held as ${ta.type}`); return freeze(out); }
  for (const x of ta.params) out.push(G.convert(G, Y, E, I, Q, x, c));
  return freeze(out);
};
export const rgTypeRef = (rgOther, rgArgs, rgNamedRef, RG_ONE_ARG, WRAPPERS, UNKNOWN, ERR, arr, named, rgUnsup, rgReport) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, n: AstNode, c: RgCtx): Ty => {
  if (n.type !== "TSTypeReference") return ERR;
  if (rgOther(Q, n.typeName)) return ERR;
  if (n.typeName.type !== "Identifier") return rgUnsup(Q, n, "qualified type name");
  const name = n.typeName.name;
  const args = rgArgs(G, Y, E, I, Q, n.typeArguments, c);
  if (c.tps.has(name)) return { k: "tv", n: name };
  if (name === "Js") return UNKNOWN;
  if (name === "Array" || name === "ReadonlyArray") return arr(args[0] ?? UNKNOWN);
  const a0 = args[0];
  if (name === "Record" && args.length === 2 && a0 !== undefined && a0.k === "str") return { k: "rec", props: new Map(), index: args[1] };
  if (name === "Action") return named("Action", a0 ?? { k: "tup", els: [] });
  if (RG_ONE_ARG.has(name) && args.length !== 1) {
    rgReport(Q, n, "type", `${name} takes one type argument, as ${name}<T>`);
    return ERR;
  }
  if (WRAPPERS.has(name) || Y.has(name)) return rgNamedRef(G, Y, E, I, Q, name, args);
  if (name === "ValueOf") return rgUnsup(Q, n, "ValueOf in checked cells");
  rgReport(Q, n, "unknown-type", `unknown type ${name}`);
  return ERR;
};
// a declared or wrapper name; an alias of Mut<T> or Borrowed<T> is that type, so the ownership rules see it
export const rgNamedRef = (WRAPPERS, named, isNamed, nodeKind, rgGap) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, name: string, args: Ty[]): Ty => {
  const t = named(name, ...args), d = Y.get(name);
  const body = d !== undefined && d.kind === "alias" ? d.nodes[0] : undefined;
  const ofRef = !WRAPPERS.has(name) && body !== undefined && body.type === "TSTypeAliasDeclaration" && nodeKind(body.typeAnnotation) === "TSTypeReference";
  if (ofRef && body !== undefined && body.type === "TSTypeAliasDeclaration" && body.typeAnnotation.type === "Other") return rgGap(Q, "alias body held as Other");
  const e = ofRef ? G.expand(G, Y, E, I, Q, t) : t;
  return isNamed(e, "Mut") || isNamed(e, "Borrowed") ? e : t;
};
