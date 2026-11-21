// Registry.expand, ifaceRec, quiet and sub. The memos are keyed as registry.ts keys them (an alias by its show(),
// which is shortened past depth 6); an interface's record is in its memo before it is filled, and a read of it
// while it is filled (a cycle of extends) sees it as filled so far, later reads as filled.

export const rgExpand = (show, subst, ERR, rgUnsup, rgGap, rgUndoPush, rgIsBuilding, rgAliasAdd) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, t: Ty): Ty => {
  if (t.k !== "named" || !G.isAlias(t.n)) return t;
  const key = show(t);
  const hit = E.get(key);
  if (hit !== undefined) return hit;
  const d = Y.get(t.n), at = d?.nodes[0];
  if (d === undefined || at === undefined) return rgGap(Q, `expand: no declaration of ${t.n}`);
  if (d.tps.length !== t.args.length && d.tps.length > 0) return rgUnsup(Q, at, `generic type ${t.n} used with ${t.args.length} arguments`);
  // a directly self-referential alias expands to ERR (unsupported)
  E.set(key, ERR);
  rgUndoPush(Q, "expand", key);
  const m: Subst = new Map(d.tps.map((n, i): [string, Ty] => [n, G.at(t.args, i)]));
  if (d.kind === "alias") {
    const body = at.type === "TSTypeAliasDeclaration" ? G.convert(G, Y, E, I, Q, at.typeAnnotation, { tps: new Set(d.tps), look: null, ast: d.ast, origin: d.origin }) : rgGap(Q, "alias declaration held as Other");
    const out = subst(body, m);
    E.set(key, out);
    return out;
  }
  const building = rgIsBuilding(Q, t.n);
  const out = subst(G.ifaceRec(G, Y, E, I, Q, t.n), m);
  if (building && d.tps.length === 0) rgAliasAdd(Q, t.n, key);
  E.set(key, out);
  return out;
};
export const rgIsBuilding = () => (Q: RgCtls, name: string): boolean => {
  for (let b = Q.building; b !== null; b = b.next) if (b.name === name) return true;
  return false;
};
export const rgAliasAdd = () => (Q: RgCtls, name: string, key: string): void => {
  Q.aliases = { name, key, next: Q.aliases };
};
// the record of an interface being built, as filled so far, in its memo and in each expansion key that holds it
export const rgLiveSet = () => (E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, name: string, r: Rec): void => {
  if (I.has(name)) I.set(name, r);
  for (let a = Q.aliases; a !== null; a = a.next) if (a.name === name && E.has(a.key)) E.set(a.key, r);
};
// the interface is built: it leaves the building list and its keys need no more updates
export const rgBuilt = () => (Q: RgCtls, name: string): void => {
  const keep: Mut<RgAlias[]> = mut([]);
  for (let a = Q.aliases; a !== null; a = a.next) if (a.name !== name) keep.push(a);
  let out: RgAlias | null = null;
  for (let i = keep.length - 1; i >= 0; i--) { const a = keep[i]; if (a !== undefined) out = { name: a.name, key: a.key, next: out }; }
  Q.aliases = out;
  const b = Q.building;
  if (b !== null && b.name === name) Q.building = b.next;
};
export const rgIfaceRec = (rgIfaceExtends, rgIfaceOwn, rgLiveSet, rgBuilt, rgUndoPush, rgGap) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, name: string): Rec => {
  const hit = I.get(name);
  if (hit !== undefined) return hit;
  const d = Y.get(name);
  let r: Rec = { k: "rec", props: new Map() };
  if (d === undefined) { rgGap(Q, `ifaceRec: no declaration of ${name}`); return r; }
  I.set(name, r);
  rgUndoPush(Q, "iface", name);
  Q.building = { name, next: Q.building };
  for (const node of d.nodes) r = rgIfaceExtends(G, Y, E, I, Q, name, node, r);
  const c: RgCtx = { tps: new Set(d.tps), look: null, ast: d.ast, origin: d.origin };
  for (const node of d.nodes) {
    r = rgIfaceOwn(G, Y, E, I, Q, node, c, r);
    rgLiveSet(E, I, Q, name, r);
  }
  rgBuilt(Q, name);
  return r;
};
// the bases an interface declaration extends, merged in: what r has stays, call signatures add up
export const rgIfaceExtends = (named, ERR, rgUnsup, rgLiveSet, rgGap) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, name: string, node: AstNode, r0: Rec): Rec => {
  if (node.type !== "TSInterfaceDeclaration") { rgGap(Q, "interface declaration held as Other"); return r0; }
  let r = r0;
  for (const h of node.extends) {
    if (h.type === "Other" || (h.type === "TSExpressionWithTypeArguments" && h.expression.type === "Other")) { rgGap(Q, "extends clause held as Other"); continue; }
    const base = h.type === "TSExpressionWithTypeArguments" && h.expression.type === "Identifier" ? G.expand(G, Y, E, I, Q, named(h.expression.name)) : ERR;
    if (base.k !== "rec") { rgUnsup(Q, h, "interface extends a non-object type"); continue; }
    const props: Mut<Map<string, Prop>> = mut(new Map(r.props));
    for (const [k, v] of base.props) if (!props.has(k)) props.set(k, v);
    const calls = base.calls !== undefined ? [...(r.calls ?? []), ...base.calls] : r.calls;
    r = { k: "rec", props: freeze(props), index: r.index ?? base.index, calls, ctors: r.ctors };
    rgLiveSet(E, I, Q, name, r);
  }
  return r;
};
// an interface declaration's own members over what r has
export const rgIfaceOwn = (rgGap) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, node: AstNode, c: RgCtx, r: Rec): Rec => {
  if (node.type !== "TSInterfaceDeclaration" || node.body.type !== "TSInterfaceBody") { rgGap(Q, "interface body held as Other"); return r; }
  const own = G.literal(G, Y, E, I, Q, node.body.body, c);
  const props: Mut<Map<string, Prop>> = mut(new Map(r.props));
  for (const [k, v] of own.props) props.set(k, v);
  const calls = own.calls !== undefined ? [...(r.calls ?? []), ...own.calls] : r.calls;
  return { k: "rec", props: freeze(props), index: own.index ?? r.index, calls, ctors: own.ctors ?? r.ctors };
};

// expanding t, or any alias it reaches, reports no problem; keys found quiet are kept for later calls
export const rgQuiet = () => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, K: RgQuietKeys, t: Ty): boolean => {
  const seen: Mut<Set<string>> = mut(new Set());
  const ok = G.quietGo(G, Y, E, I, Q, K, seen, t);
  if (ok) for (const k of seen) K.add(k);
  return ok;
};
export const rgQuietGo = (show, rgTrial, rgQuietAll) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, K: RgQuietKeys, S: Mut<Set<string>>, x: Ty): boolean => {
  switch (x.k) {
    case "named": {
      if (!G.isAlias(x.n)) return rgQuietAll(G, Y, E, I, Q, K, S, x.args);
      const key = show(x);
      if (K.has(key) || S.has(key)) return true;
      if (S.size > 1000) return false;
      S.add(key);
      const e = E.get(key) ?? rgTrial(G, Y, E, I, Q, x);
      return e !== null && e.k !== "err" && G.quietGo(G, Y, E, I, Q, K, S, e);
    }
    case "arr": return G.quietGo(G, Y, E, I, Q, K, S, x.el);
    case "tup": return rgQuietAll(G, Y, E, I, Q, K, S, x.els);
    case "union": return rgQuietAll(G, Y, E, I, Q, K, S, x.ts);
    case "rec": return rgQuietAll(G, Y, E, I, Q, K, S, [...x.props.values()].map((p) => p.t)) && (x.index === undefined || G.quietGo(G, Y, E, I, Q, K, S, x.index)) && rgQuietAll(G, Y, E, I, Q, K, S, [...(x.calls ?? []), ...(x.ctors ?? [])]);
    case "fn": return rgQuietAll(G, Y, E, I, Q, K, S, x.ps.map((p) => p.t)) && G.quietGo(G, Y, E, I, Q, K, S, x.ret);
    default: return true;
  }
};
export const rgQuietAll = () => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, K: RgQuietKeys, S: Mut<Set<string>>, xs: Ty[]): boolean => {
  for (const x of xs) if (!G.quietGo(G, Y, E, I, Q, K, S, x)) return false;
  return true;
};
// the scan memberOf skips would record pairs in a seen of the caller's, and convert aliases, which may report
export const rgSub = (rgQuiet) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, K: RgQuietKeys, s: Ty, t: Ty): boolean => {
  if (rgQuiet(G, Y, E, I, Q, K, s) && rgQuiet(G, Y, E, I, Q, K, t) && G.memberOf(s, t)) return true;
  const seen: Mut<Set<string>> = mut(new Set());
  return G.subOps(s, t, seen);
};
