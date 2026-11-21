// Alias tests, member lookup, subtyping, call signatures, iteration and inference unification over Ty, as SoundScript
// cells. What needs the Registry's declarations (alias expansion, an interface's members) or object identity comes in
// as DeclOps and RegOps, which registry.ts makes once per Registry. Under bun, types.ts links these cells with types.ss.ts; in the notebook they
// are compiled cells of @tomlarkworthy/soundscript-checker.

// Two reads a SoundScript cell cannot make. same is object identity: s === t on types is the fast path of sub. at
// reads an element unchecked, undefined past the end, where the TypeScript checker read one without a guard (the
// arguments of a Map or Iterable written with none), so the checker's verdicts on such a type stay what they were.
export type RegOps = {
  readonly expand: (t: Ty) => Ty;
  readonly isAlias: (n: string) => boolean;
  readonly member: (t: Ty, name: string) => Prop | undefined;
  readonly isTypedArray: (t: Ty) => boolean;
  readonly same: (a: Ty, b: Ty) => boolean;
  readonly at: (ts: Ty[], i: number) => Ty;
  // a new number each call, for type variable names no other comparison uses: alias expansion memoises by name
  readonly fresh: () => number;
};
// a declared type name as the Registry holds it: an alias or an interface, where it was declared, its type parameters
export type DeclInfo = { readonly kind: "alias" | "iface"; readonly origin: string; readonly tps: string[] };
// what member lookup takes from the Registry: its declarations, an interface's record, and the strict-index setting
export type DeclOps = {
  readonly decl: (n: string) => DeclInfo | undefined;
  readonly expand: (t: Ty) => Ty;
  readonly ifaceRec: (n: string) => Rec;
  readonly strictIndex: () => boolean;
  readonly at: (ts: Ty[], i: number) => Ty;
};
// seen: the alias pairs assumed to hold while they are compared, shared by every comparison one call makes
export type Sub = (s: Ty, t: Ty, seen: Mut<Set<string>>) => boolean;
export type FnSub = (s: Fn, t: Fn, seen: Mut<Set<string>>) => boolean;
export type Unify = (p: Ty, a: Ty, m: Mut<Subst>, tvs: Set<string>, depth: number) => void;

// a name expanded before it is compared: an alias, or an interface of the module, a foreign file or JSX. Elem is the
// one JSX type that is not structural: only JSX makes one (h at run time), so a record is not one
export const isAliasWith = (WRAPPERS) => (D: DeclOps) => (n: string): boolean => {
  const d = D.decl(n);
  return !!d && !WRAPPERS.has(n) && (d.kind === "alias" || d.origin === "user" || d.origin === "foreign" || (d.origin === "jsx" && n !== "Elem"));
};

// the names convert reads before any declaration
export const CONVERT_NAMES = () => ["Js", "Array", "ReadonlyArray", "Record", "Action", "ValueOf"];
// The type names the checker gives a meaning of its own: declared by the intrinsics, the prelude or JSX, the
// wrappers, and the names convert reads first. decls: the Registry's declarations before the user's are loaded
export const builtinNamesOf = (WRAPPERS, CONVERT_NAMES) => (decls: [string, DeclInfo][]): Set<string> =>
  new Set([...decls.filter(([, d]) => d.origin !== "user" && d.origin !== "foreign").map(([n]) => n), ...WRAPPERS, ...CONVERT_NAMES]);

// a named type's property: an interface's, with the type arguments put in for its parameters
export const namedMemberWith = (UNKNOWN, subst) => (D: DeclOps, member: (t: Ty, name: string) => Prop | undefined) => (t: Named, name: string): Prop | undefined => {
  if (t.n === "Mut" || t.n === "Borrowed") return member(D.at(t.args, 0), name);
  if (t.n === "Iterable" || t.n === "ArrayLike") return undefined;
  const d = D.decl(t.n), p = d ? D.ifaceRec(t.n).props.get(name) : undefined;
  if (!d || !p) return undefined;
  const m: Subst = new Map(d.tps.map((n, i): [string, Ty] => [n, t.args[i] ?? UNKNOWN]));
  return { ...p, t: subst(p.t, m) };
};
// The declared property name of t, not yet with undefined added for an optional or index read
export const memberWith = (STR, NUM, UNDEF, named, union, namedMemberWith) => (D: DeclOps) => {
  const namedMember = namedMemberWith(D, member);
  function member(t0: Ty, name: string): Prop | undefined {
    const t = D.expand(t0);
    switch (t.k) {
      case "named": return namedMember(t, name);
      case "rec": {
        const p = t.props.get(name), index = t.index;
        return p ? p : index ? { t: D.strictIndex() ? union([index, UNDEF]) : index, opt: false } : undefined;
      }
      case "arr": return member(named("Array", t.el), name);
      case "tup": return name === "length" ? { t: { k: "lit", v: t.els.length }, opt: false } : member(named("Array", union(t.els)), name);
      case "str": return member(named("String"), name);
      case "num": return member(named("Number"), name);
      case "lit": return member(typeof t.v === "string" ? STR : typeof t.v === "number" ? NUM : named("Boolean"), name);
      case "union": return t.ts.every((x) => x.k === "lit" && typeof x.v === "boolean") ? member(named("Boolean"), name) : undefined;
      default: return undefined;
    }
  }
  return member;
};

export const callSigsWith = () => (R: RegOps) => {
  function callSigs(t0: Ty): Fn[] {
    const t = R.expand(t0);
    if (t.k === "fn") return [t];
    if (t.k === "rec") return t.calls ?? [];
    return t.k === "named" && (t.n === "Mut" || t.n === "Borrowed") ? callSigs(R.at(t.args, 0)) : [];
  }
  return callSigs;
};

// the element type of a named iterable: a collection, a typed array or a match
export const namedElemWith = (union, STR, NUM, UNDEF) => (R: RegOps, iterElem: (t: Ty) => Ty | undefined) => (t: Named): Ty | undefined => {
  if (t.n === "Iterable" || t.n === "ArrayLike" || t.n === "Set") return t.args[0];
  if (t.n === "Mut" || t.n === "Borrowed") return iterElem(R.at(t.args, 0));
  if (t.n === "Map") return { k: "tup", els: [R.at(t.args, 0), R.at(t.args, 1)] };
  if (R.isTypedArray(t)) return NUM;
  // a match is an array of the whole match and each group, undefined for a group that did not take part
  return t.n === "RegExpMatchArray" ? union([STR, UNDEF]) : undefined;
};
// the element type of for...of, spread or Iterable<T>, or undefined when t is not iterable
export const iterElemWith = (union, STR, ERR, namedElemWith) => (R: RegOps) => {
  const namedElem = namedElemWith(R, iterElem);
  function iterElem(t0: Ty): Ty | undefined {
    const t = R.expand(t0);
    switch (t.k) {
      case "arr": return t.el;
      case "tup": return union(t.els);
      case "str": return STR;
      case "lit": return typeof t.v === "string" ? STR : undefined;
      case "err": return ERR;
      case "named": return namedElem(t);
      case "union": {
        const es: Mut<Ty[]> = mut([]);
        let all = true;
        for (const x of t.ts) { const e = iterElem(x); if (e) es.push(e); else all = false; }
        return all ? union(freeze(es)) : undefined;
      }
      default: return undefined;
    }
  }
  return iterElem;
};

// t is one of the types with no parts: s <: t by kind and literal value
export const primSub = () => (s: Ty, t: Ty): boolean => {
  switch (t.k) {
    case "num": return s.k === "num" || (s.k === "lit" && typeof s.v === "number");
    case "str": return s.k === "str" || (s.k === "lit" && typeof s.v === "string");
    case "lit": return s.k === "lit" && s.v === t.v;
    case "void": return s.k === "void" || s.k === "undef";
    case "null": case "undef": case "bigint": case "symbol": case "never": return s.k === t.k;
    case "object": return ["rec", "arr", "tup", "fn", "named", "object"].includes(s.k);
    default: return false;
  }
};

// arrays are covariant; a tuple is an array of each of its elements
export const seqSubWith = () => (R: RegOps, sub: Sub) => (s: Ty, t: { k: "arr"; el: Ty } | { k: "tup"; els: Ty[] }, seen: Mut<Set<string>>): boolean => {
  if (t.k === "arr") {
    if (s.k === "arr") return sub(s.el, t.el, seen);
    if (s.k !== "tup") return false;
    for (const e of s.els) if (!sub(e, t.el, seen)) return false;
    return true;
  }
  if (s.k !== "tup" || s.els.length !== t.els.length) return false;
  let i = 0;
  for (const a of s.els) if (!sub(a, R.at(t.els, i++), seen)) return false;
  return true;
};

// a function type: parameters contravariant, the result covariant unless t returns void. Generic on both sides
// with as many type parameters: compared with both renamed to the same fresh names
export const fnSubWith = (subst) => (R: RegOps, sub: Sub) => {
  function fnSub(s: Fn, t: Fn, seen: Mut<Set<string>>): boolean {
    if (s.tps.length || t.tps.length) {
      if (s.tps.length !== t.tps.length) return false;
      const fresh: Ty[] = s.tps.map(() => ({ k: "tv", n: `$a${R.fresh()}` }));
      const open = (f: Fn): Fn => { const g = subst({ ...f, tps: [] }, new Map(f.tps.map((x, i): [string, Ty] => [x, R.at(fresh, i)]))); return g.k === "fn" ? g : f; };
      return fnSub(open(s), open(t), seen);
    }
    let required = 0;
    for (const p of s.ps) if (!p.opt) required++;
    const tRest = t.rest, sRest = s.rest;
    if (required > t.ps.length + (tRest ? Infinity : 0)) return false;
    for (let i = 0; i < s.ps.length; i++) {
      const tp = t.ps[i]?.t ?? tRest, sp = s.ps[i];
      if (!tp || !sp) break;
      if (!sub(tp, sp.t, seen)) return false;
    }
    if (tRest && sRest && !sub(tRest, sRest, seen)) return false;
    return t.ret.k === "void" || sub(s.ret, t.ret, seen);
  }
  return fnSub;
};

// some call signature of fs is a subtype of c
export const someFnSub = () => (fnSub: FnSub) => (fs: Fn[], c: Fn, seen: Mut<Set<string>>): boolean => {
  for (const f of fs) if (fnSub(f, c, seen)) return true;
  return false;
};

// a record type t: each of its properties, its index signature and its call signatures
export const recSubWith = (propT, someFnSub) => (R: RegOps, sub: Sub, fnSub: FnSub, callSigs: (t: Ty) => Fn[]) => (s: Ty, t: Rec, seen: Mut<Set<string>>): boolean => {
  if (["null", "undef", "void"].includes(s.k)) return false;
  if (s.k === "named" && ["State", "StateCell", "Action"].includes(s.n)) return false; // nominal
  const se = R.expand(s), some = someFnSub(fnSub);
  for (const [k, p] of t.props) {
    const sp = R.member(se, k);
    if (!sp) { if (p.opt) continue; return false; }
    if (sp.flags?.banned || (!p.opt && sp.opt)) return false;
    // a spread, rest or clone copies only own enumerable properties; a member from a prototype is not one
    if (!p.opt && !p.flags?.intrinsic && (se.k !== "rec" || sp.flags?.intrinsic)) return false;
    if (!sub(propT(sp), propT(p), seen)) return false;
  }
  const index = t.index;
  if (index) {
    if (se.k !== "rec") return false;
    for (const [, p] of se.props) if (p.flags?.banned || !sub(propT(p), index, seen)) return false;
    const sIndex = se.index;
    if (sIndex && !sub(sIndex, index, seen)) return false;
  }
  for (const c of t.calls ?? []) if (!some(callSigs(se), c, seen)) return false;
  return true;
};

// a named type t: Iterable and ArrayLike by element, Mut and State invariant, Action contravariant, the rest covariant
export const namedSubWith = (UNKNOWN) => (R: RegOps, sub: Sub, iterElem: (t: Ty) => Ty | undefined) => (s: Ty, t: Named, seen: Mut<Set<string>>): boolean => {
  const t0 = R.at(t.args, 0);
  if (t.n === "Iterable" || t.n === "ArrayLike") {
    const e = iterElem(s);
    return !!e && (t.n === "Iterable" || s.k !== "named" || !["Map", "Set"].includes(s.n)) && sub(e, t0, seen);
  }
  if (s.k !== "named" || s.n !== t.n) return false;
  const s0 = R.at(s.args, 0);
  if (t.n === "Mut" || t.n === "State") return sub(s0, t0, seen) && sub(t0, s0, seen);
  if (t.n === "Action") return sub(t0, s0, seen);
  let i = 0;
  for (const a of t.args) if (!sub(s.args[i++] ?? UNKNOWN, a, seen)) return false;
  return true;
};

// s is or has as a member (aliases expanded) a Mut or Borrowed, which sub unwraps before it scans a union; a generic
// alias is not walked and counts as one that may
export const unwrapsWith = () => (R: RegOps) => (s: Ty): boolean => {
  const aliases: Mut<Set<string>> = mut(new Set());
  function unwraps(x: Ty): boolean {
    if (x.k === "union") { for (const m of x.ts) if (unwraps(m)) return true; return false; }
    if (x.k !== "named") return false;
    if (!R.isAlias(x.n)) return x.n === "Mut" || x.n === "Borrowed";
    if (x.args.length) return true;
    if (aliases.has(x.n)) return false;
    aliases.add(x.n);
    return unwraps(R.expand(x));
  }
  return unwraps(s);
};

// s <: t found without the scan sub makes of a union: s is t, s is a member of t (t's alias expanded) by object or by
// alias without type arguments, or arrays or a union of s made of such; a member that unwraps is left to sub, and so
// is a type sub takes without expanding. Only for a whole comparison (Registry.sub): within one, a pair the scan
// tried stays in seen and is taken as true when it is met again
export const memberOfWith = (unwrapsWith) => (R: RegOps) => (s: Ty, t: Ty): boolean => {
  const unwraps = unwrapsWith(R);
  const sameAlias = (a: Ty, b: Ty): boolean => a.k === "named" && b.k === "named" && a.n === b.n && !a.args.length && !b.args.length && R.isAlias(a.n);
  function sure(x: Ty, y: Ty): boolean {
    if (R.same(x, y)) return true;
    if (y.k === "unknown" || x.k === "err" || y.k === "err" || x.k === "never") return false;
    if (x.k === "arr" && y.k === "arr") return sure(x.el, y.el);
    if (x.k === "union") { for (const m of x.ts) if (!sure(m, y)) return false; return true; }
    const ye = y.k === "named" && R.isAlias(y.n) ? R.expand(y) : y;
    return ye.k === "union" && ye.ts.some((m) => R.same(x, m) || sameAlias(x, m)) && !unwraps(x);
  }
  return sure(s, t);
};

// Subtyping. Values are immutable: covariant everywhere except function parameters, Mut and State
export const subWith = (show, isNamed, primSub, seqSubWith, fnSubWith, someFnSub, recSubWith, namedSubWith) => (R: RegOps, iterElem: (t: Ty) => Ty | undefined, callSigs: (t: Ty) => Fn[]) => {
  const seqSub = seqSubWith(R, sub), fnSub = fnSubWith(R, sub), some = someFnSub(fnSub);
  const recSub = recSubWith(R, sub, fnSub, callSigs), namedSub = namedSubWith(R, sub, iterElem);
  function sub(s: Ty, t: Ty, seen: Mut<Set<string>>): boolean {
    if (R.same(s, t) || t.k === "unknown" || s.k === "err" || t.k === "err" || s.k === "never") return true;
    if ((s.k === "named" && R.isAlias(s.n)) || (t.k === "named" && R.isAlias(t.n))) {
      const key = show(s) + " <: " + show(t);
      if (seen.has(key)) return true;
      seen.add(key);
      return sub(R.expand(s), R.expand(t), seen);
    }
    if (s.k === "union") { for (const m of s.ts) if (!sub(m, t, seen)) return false; return true; }
    if (s.k === "named" && (s.n === "Mut" || s.n === "Borrowed") && !isNamed(t, s.n)) return sub(R.at(s.args, 0), t, seen);
    if (t.k === "union") { for (const m of t.ts) if (sub(s, m, seen)) return true; return false; }
    if (s.k === "tv") return t.k === "tv" && t.n === s.n;
    switch (t.k) {
      case "arr": case "tup": return seqSub(s, t, seen);
      case "fn": return some(callSigs(s), t, seen);
      case "rec": return recSub(s, t, seen);
      case "named": return namedSub(s, t, seen);
      default: return primSub(s, t);
    }
  }
  return sub;
};

// the names in tvs that t mentions, read from its display
export const hasAnyTv = (show) => (t: Ty, tvs: Set<string>): boolean => show(t).split(/[^\w']+/).some((w) => tvs.has(w));

// p a union: each member of a takes the member of p of its shape, else a type parameter if p has exactly one
export const unifyUnionWith = (members, hasAnyTv) => (unify: Unify, sub: Sub) => (p: { k: "union"; ts: Ty[] }, a: Ty, m: Mut<Subst>, tvs: Set<string>, depth: number): void => {
  const tvM = p.ts.filter((x) => x.k === "tv" && tvs.has(x.n));
  const others = p.ts.filter((x) => !(x.k === "tv" && tvs.has(x.n)));
  const only = tvM.length === 1 ? tvM[0] : undefined;
  for (const x of members(a)) {
    const shape = others.find((q) => (q.k === x.k && (q.k !== "named" || (x.k === "named" && x.n === q.n))) || (q.k === "arr" && x.k === "tup"));
    if (shape && hasAnyTv(shape, tvs)) unify(shape, x, m, tvs, depth + 1);
    else if (others.some((q) => { const seen = mut(new Set<string>()); return sub(x, q, seen); })) continue;
    else if (only) unify(only, x, m, tvs, depth + 1);
  }
};

// p a record type: each property of p takes a's property of that name, and p's index signature every property of a
export const unifyRecWith = (propT) => (R: RegOps, unify: Unify) => (p: Rec, a: Ty, m: Mut<Subst>, tvs: Set<string>, depth: number): void => {
  const U = (x: Ty, y: Ty) => unify(x, y, m, tvs, depth + 1);
  const ae = R.expand(a), index = p.index;
  for (const [k, q] of p.props) { const ap = R.member(ae, k); if (ap) U(q.t, ap.t); }
  if (index && ae.k === "rec") { for (const [, ap] of ae.props) U(index, propT(ap)); if (ae.index) U(index, ae.index); }
};
// p an array, tuple, function, record or named type: a takes the parts of p it has
export const unifyShapeWith = () => (R: RegOps, unify: Unify, unifyRec: (p: Rec, a: Ty, m: Mut<Subst>, tvs: Set<string>, depth: number) => void, iterElem: (t: Ty) => Ty | undefined, callSigs: (t: Ty) => Fn[]) => (p: Ty, a: Ty, m: Mut<Subst>, tvs: Set<string>, depth: number): void => {
  const U = (x: Ty, y: Ty) => unify(x, y, m, tvs, depth + 1);
  let i = 0;
  switch (p.k) {
    case "arr":
      if (a.k === "arr") U(p.el, a.el);
      else if (a.k === "tup") { for (const e of a.els) U(p.el, e); }
      else if (a.k === "named" && (a.n === "Iterable" || a.n === "ArrayLike")) U(p.el, R.at(a.args, 0));
      return;
    case "tup": if (a.k === "tup") for (const e of p.els) { const x = a.els[i++]; if (x) U(e, x); } return;
    case "fn": {
      const f = callSigs(a)[0];
      if (f) { for (const q of p.ps) { const x = f.ps[i++]; if (x) U(q.t, x.t); } U(p.ret, f.ret); }
      return;
    }
    case "rec": unifyRec(p, a, m, tvs, depth); return;
    case "named": {
      const e = p.n === "Iterable" || p.n === "ArrayLike" ? iterElem(a) : undefined;
      if (p.n === "Iterable" || p.n === "ArrayLike") { if (e) U(R.at(p.args, 0), e); }
      else if (a.k === "named" && a.n === p.n) for (const x of p.args) { const y = a.args[i++]; if (y) U(x, y); }
      return;
    }
    default: return;
  }
};

// Inference: the candidates for the type variables in tvs, found by matching parameter type p against argument type a
export const unifyWith = (union, isNamed, unifyUnionWith, unifyRecWith, unifyShapeWith) => (R: RegOps, sub: Sub, iterElem: (t: Ty) => Ty | undefined, callSigs: (t: Ty) => Fn[]) => {
  const byUnion = unifyUnionWith(unify, sub), byShape = unifyShapeWith(R, unify, unifyRecWith(R, unify), iterElem, callSigs);
  function unify(p: Ty, a: Ty, m: Mut<Subst>, tvs: Set<string>, depth: number): void {
    if (depth > 12 || a.k === "err") return;
    if (p.k === "tv") {
      const prev = m.get(p.n);
      if (tvs.has(p.n)) m.set(p.n, prev ? union([prev, a]) : a);
      return;
    }
    if (a.k === "named" && R.isAlias(a.n)) unify(p, R.expand(a), m, tvs, depth + 1);
    else if (p.k === "named" && R.isAlias(p.n)) unify(R.expand(p), a, m, tvs, depth + 1);
    else if (p.k === "union") byUnion(p, a, m, tvs, depth);
    else if (a.k === "union" && p.k !== "named") { for (const x of a.ts) unify(p, x, m, tvs, depth + 1); }
    else if (a.k === "named" && (a.n === "Mut" || a.n === "Borrowed") && !isNamed(p, a.n)) unify(p, R.at(a.args, 0), m, tvs, depth + 1);
    else byShape(p, a, m, tvs, depth);
  }
  return unify;
};
