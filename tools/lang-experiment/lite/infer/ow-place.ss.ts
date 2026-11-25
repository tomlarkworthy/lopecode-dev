// The placement rules (lite/own.ts ownership, the loop after the positions): on and read only called, mut(...) as
// a local const's fresh initializer, borrow under yield, state(...) and on(...) as the cell's value.

// a name, not a value: a callee, a member's or a key's name, or in a type
export const owNamePlace = (nodeKind) => (O: OwCtx, n: AstNode): boolean => {
  const p = O.T.parent.get(n.nid);
  if (p === undefined) return true;
  if (p.type === "CallExpression") return p.callee.nid === n.nid;
  if (p.type === "MemberExpression") return p.property.nid === n.nid && !p.computed;
  if (p.type === "Property") return p.key.nid === n.nid && !p.computed && !p.shorthand;
  return nodeKind(p).startsWith("TS");
};
export const owOnRead = (owNamePlace, owBindingAt, owErr) => (O: OwCtx, W: OwW, n: AstNode): void => {
  if (n.type !== "Identifier" || (n.name !== "on" && n.name !== "read")) return;
  const b = owBindingAt(O, n);
  if ((b !== undefined && b.kind !== "prelude") || owNamePlace(O, n)) return;
  if (n.name === "on") owErr(W, n, "listener-placement", "on is only called, as the whole value of a cell; it is not a value");
  else owErr(W, n, "read-outside-action", "read is only called, in an action body; it is not a value");
};
// a literal, a spread copy, new on an intrinsic, or an intrinsic marked @fresh
export const owFresh = () => {
  function fresh(O: OwCtx, a: AstNode): boolean {
    switch (a.type) {
      case "ArrayExpression": case "ObjectExpression": return true;
      case "ConditionalExpression": return fresh(O, a.consequent) && fresh(O, a.alternate);
      case "NewExpression": case "CallExpression": {
        const s = O.F.calls.get(a.nid)?.sig ?? null;
        return s !== null && !!s.flags?.intrinsic && !!s.flags.fresh && !s.flags.view;
      }
      default: return false;
    }
  }
  return fresh;
};
// on(...): the cell's whole value, through parentheses and the branches of a conditional
export const owOnWhole = (owEncl) => (O: OwCtx, body: AstNode, n: AstNode): boolean => {
  let cur = n, p = O.T.parent.get(n.nid);
  while (p !== undefined && (p.type === "ParenthesizedExpression" || (p.type === "ConditionalExpression" && p.test.nid !== cur.nid))) { cur = p; p = O.T.parent.get(p.nid); }
  return body.nid === cur.nid || (p !== undefined && p.type === "ReturnStatement" && owEncl(O, p).nid === O.T.fn.nid);
};
export const owCellPlace = (owEncl, owOnWhole, owErr, ixFnParts) => (O: OwCtx, W: OwW, n: AstNode, pre: string): void => {
  const f = ixFnParts(O.T.fn), p = O.T.parent.get(n.nid);
  if (f === null) return;
  if (pre === "borrow") {
    if (!(p !== undefined && p.type === "YieldExpression" && owEncl(O, n).nid === O.T.fn.nid && f.generator)) owErr(W, n, "borrow-placement", "borrow(x) only as the operand of yield in a generator cell");
  } else if (pre === "state") {
    const okRet = p !== undefined && p.type === "ReturnStatement" && O.T.parent.get(p.nid)?.nid === f.body.nid;
    if (!(f.body.nid === n.nid || okRet) || f.async || f.generator) owErr(W, n, "state-placement", "state(...) only as the returned value of a sync, non-generator cell");
  } else if (pre === "on") {
    if (!owOnWhole(O, f.body, n) || f.async || f.generator) owErr(W, n, "listener-placement", "on(...) only as the whole value of a sync, non-generator cell (what it returns, or a branch of a conditional that it returns)");
  }
};
// a prelude function only as the callee of a call (on and read have rules of their own); no binding named like one of
// the ownership functions, mut, freeze, borrow, snapshot (pre)
// an identifier with no binding fact is taken for the prelude's when it has a prelude name, as owOnRead does (a
// shorthand property's key is not: its value carries the binding)
export const owPreludeName = (owNamePlace, owBindingAt, owErr) => (O: OwCtx, W: OwW, pre: Set<string>, all: Set<string>, n: AstNode): void => {
  if (n.type !== "Identifier") return;
  const p = O.T.parent.get(n.nid), key = p !== undefined && p.type === "Property" && p.key.nid === n.nid && p.value.nid !== n.nid;
  const b = owBindingAt(O, n), isPre = b === undefined ? all.has(n.name) && !key : b.kind === "prelude";
  if (isPre && n.name !== "on" && n.name !== "read" && !owNamePlace(O, n)) owErr(W, n, "prelude-value", `${n.name} is only called, as ${n.name}(...); as a value its calls would skip the rules of ${n.name}`);
  if (b !== undefined && b.kind !== "prelude" && b.kind !== "global" && b.nid === n.nid && pre.has(n.name)) owErr(W, n, "prelude-shadow", `${n.name} names a prelude function; a binding of that name would hide it from the rules of ${n.name}(...)`);
};
// a regexp that may have the g or y flag keeps lastIndex, which test, exec, match and replace read or write: it is
// used only where it is made, as a member's object or an argument an intrinsic does not keep (a String method's)
export const owRegexpPlace = (owNonRetainingArg, owArgIndex, owErr) => (O: OwCtx, W: OwW, n: AstNode): void => {
  const gy = (f: string) => f.includes("g") || f.includes("y");
  const flags = n.type === "NewExpression" && n.callee.type === "Identifier" && n.callee.name === "RegExp" ? n.arguments[1] : undefined;
  const lit = n.type === "Literal" && n.regex !== null && gy(n.regex.flags);
  const made = n.type === "NewExpression" && flags !== undefined && !(flags.type === "Literal" && typeof flags.value === "string" && !gy(flags.value));
  if (!lit && !made) return;
  const p = O.T.parent.get(n.nid);
  if (p !== undefined && p.type === "MemberExpression" && p.object.nid === n.nid) return;
  if (p !== undefined && p.type === "CallExpression" && p.callee.nid !== n.nid && owNonRetainingArg(O, p, owArgIndex(p.arguments, n))) return;
  owErr(W, n, "regexp-state", "a regexp that may have the g or y flag keeps lastIndex, which test, exec, match and replace write: use it only where it is made, as the receiver of a call or a String method's argument");
};
// Object.prototype's members, which every record made by a literal, JSON.parse or Object.fromEntries also has
export const PROTO_NAMES = () => new Set(["__proto__", "constructor", "toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"]);
// the names a key may be: its string literals, [] for a number, null for any string
export const owKeyNames = (ixUm) => (O: OwCtx, k: AstNode, computed: boolean): string[] | null => {
  if (!computed && k.type === "Identifier") return [k.name];
  if (k.type === "Literal") return typeof k.value === "string" ? [k.value] : [];
  const t = O.F.types.get(k.nid);
  if (t === undefined) return null;
  const ms: Ty[] = ixUm(O.R, t);
  if (!ms.every((m) => m.k === "num" || m.k === "lit")) return null;
  return ms.flatMap((m) => (m.k === "lit" && typeof m.v === "string" ? [m.v] : []));
};
// a record with an index signature types every key it is read at by the signature; a key that names a member of
// Object.prototype reads that member instead (a function, or the prototype). d1 (2026-11-24): a key that may be any
// string (not a literal, a union of literals or a number) is refused, since it may name one
export const owProtoRead = (owKeyNames, PROTO_NAMES, ixUm, unwrap, owErr) => (O: OwCtx, W: OwW, n: AstNode): void => {
  const at = n.type === "MemberExpression" ? { o: n.object, k: n.property, c: n.computed } : n.type === "BinaryExpression" && n.operator === "in" ? { o: n.right, k: n.left, c: true } : null;
  if (at === null) return;
  const t = O.F.types.get(at.o.nid);
  if (t === undefined || !ixUm(O.R, t).some((m) => { const x = O.R.expand(unwrap(m)); return x.k === "rec" && x.index !== undefined; })) return;
  const names = owKeyNames(O, at.k, at.c), P: Set<string> = PROTO_NAMES;
  if (names === null) return owErr(W, n, "banned-member", "a key known only at run time, on a record with an index signature, can name an inherited member such as toString or __proto__, which is not an entry; keep the entries in a Map<string, T> (m.get(k), m.set(k, v), m.has(k), m.delete(k)), or use a literal key");
  const k = names.find((x) => P.has(x));
  if (k !== undefined) owErr(W, n, "banned-member", `${k} on a record with an index signature is Object.prototype's ${k}, not an entry`);
};
// a type that may hold an object, which === compares by identity
export const owMayObject = (ixUm, isPrimitive) => (O: OwCtx, t: Ty | undefined): boolean => t !== undefined && !ixUm(O.R, t).every((m) => isPrimitive(m));
// includes, indexOf and lastIndexOf compare by identity, as === does: an element and an argument that may both be
// objects. (Object.is and a Map or Set keyed by objects are identity too; not checked, holes step 7)
export const owIdentityOp = (owMayObject, owErr) => (O: OwCtx, W: OwW, n: AstNode): void => {
  const sig = O.F.calls.get(n.nid)?.sig;
  if (n.type !== "CallExpression" || n.callee.type !== "MemberExpression" || n.callee.computed || n.callee.property.type !== "Identifier" || sig === null || sig === undefined || !sig.flags?.intrinsic) return;
  const m = n.callee.property.name, a0 = n.arguments[0];
  if (a0 === undefined || !["includes", "indexOf", "lastIndexOf"].includes(m)) return;
  if (owMayObject(O, sig.ps[0]?.t) && owMayObject(O, O.F.types.get(a0.nid))) owErr(W, n, "strict-eq-object", `${m} on an element and an argument that may both be objects compares by identity, as === does; use equals(a, b) with some or findIndex`);
};
// S4: a generator cell keeps running after a value is out, and a typed array cannot be frozen: a Mut typed array it
// yields must be a fresh copy at the yield (buf.slice()). An async cell's body has ended when its value is out.
export const owTypedOut = (owEncl, owTypedSafe, owTypedIn, owErr, ixFnParts) => (O: OwCtx, W: OwW, n: AstNode): void => {
  const f = ixFnParts(O.T.fn);
  if (f === null || !f.generator || n.type !== "YieldExpression") return;
  const a = n.argument;
  if (a === null || owEncl(O, n).nid !== O.T.fn.nid) return;
  const t = O.F.types.get(a.nid), w = t === undefined ? null : owTypedIn(O.R, t);
  const u = { n: w ?? "" };
  if (w !== null && !owTypedSafe(O, a)) owErr(W, a, "mut-yield", `a ${u.n} the cell may still write, yielded: a typed array or URL cannot be frozen; yield a copy (${u.n === "ArrayBuffer" || u.n === "DataView" ? "snapshot(x)" : "x.slice()"})`);
};
export const owPlacement = (owOnRead, owPreludeName, owRegexpPlace, owProtoRead, owIdentityOp, owCellPlace, owTypedOut, owPrelude) => (O: OwCtx, W: OwW): void => {
  // open part 6: every prelude name of S2.6
  const preNames = new Set(["state", "action", "mut", "freeze", "borrow", "snapshot", "equals", "on", "read", "messageOf", "memo", "cast"]);
  const allPre = new Set([...O.F.bindings.values()].filter((b) => b.kind === "prelude").map((b) => b.name));
  for (const n of O.T.all) {
    owOnRead(O, W, n);
    owPreludeName(O, W, preNames, allPre, n);
    owRegexpPlace(O, W, n);
    owProtoRead(O, W, n);
    owIdentityOp(O, W, n);
    owTypedOut(O, W, n);
    if (n.type !== "CallExpression") continue;
    const pre = owPrelude(O, n);
    if (pre !== null) owCellPlace(O, W, n, pre);
  }
};
