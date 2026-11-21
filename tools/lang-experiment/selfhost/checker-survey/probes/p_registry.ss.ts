// uses: ast, types
// Sampled Registry members, full bodies, as functions of a registry record (the class's state, frozen after load)
// or, for convert, inside one cell whose onUnsup/onErr hooks are local writers of a diagnostics Mut.
export type Origin = "intrinsic" | "prelude" | "jsx" | "foreign" | "user";
export type Decl = { kind: "alias" | "iface"; tps: string[]; nodes: Node[]; origin: Origin; parsed: Parsed };
export type TypeCtx = { tps: Set<string>; typeofLookup?: (name: string, node: Node) => Ty | undefined };
export type Diag = { node: Node; rule: string; msg: string };
export type RegState = { types: Map<string, Decl> };
export const CONVERT_NAMES = () => ["Js", "Array", "ReadonlyArray", "Record", "Action", "ValueOf"];
export const ONE_ARG = () => new Set(["State", "StateCell", "Events", "Mut", "Borrowed"]);
export const KEYWORDS = (NUM, STR, BOOL, BIGINT, NULL, UNDEF, VOID, NEVER, UNKNOWN, OBJECT, SYMBOL, ERR) => new Map<string, Ty>([
  ["TSNumberKeyword", NUM], ["TSStringKeyword", STR], ["TSBooleanKeyword", BOOL], ["TSBigIntKeyword", BIGINT],
  ["TSNullKeyword", NULL], ["TSUndefinedKeyword", UNDEF], ["TSVoidKeyword", VOID], ["TSNeverKeyword", NEVER],
  ["TSUnknownKeyword", UNKNOWN], ["TSObjectKeyword", OBJECT], ["TSSymbolKeyword", SYMBOL], ["TSAnyKeyword", ERR],
]);
// builtinTypeNames (full body)
export const builtinTypeNames = (WRAPPERS, CONVERT_NAMES) => (reg: RegState): Set<string> =>
  new Set([...[...reg.types].filter(([, d]) => d.origin !== "user" && d.origin !== "foreign").map(([n]) => n), ...WRAPPERS, ...CONVERT_NAMES]);

// expand, member, isAlias, callSigs, iterElem's isTypedArray: stubs with their signatures
export type RegFns = { expand: (t: Ty) => Ty; isAlias: (n: string) => boolean; member: (t: Ty, k: string) => Prop | undefined; callSigs: (t: Ty) => Fn[]; isTypedArray: (t: Ty) => boolean };
export const regFns = (): RegFns => ({
  expand: (t: Ty): Ty => t, isAlias: (n: string): boolean => false, member: (t: Ty, k: string): Prop | undefined => undefined,
  callSigs: (t: Ty): Fn[] => [], isTypedArray: (t: Ty): boolean => false,
});
// iterElem, original form ((t as any).v, es as Ty[])
export const iterElem = (union, STR, ERR, NUM) => (R: RegFns) => {
  function iterElem(t0: Ty): Ty | undefined {
    const t = R.expand(t0);
    switch (t.k) {
      case "arr": return t.el;
      case "tup": return union(t.els);
      case "str": case "lit": return typeof (t as any).v === "number" || typeof (t as any).v === "boolean" ? undefined : STR;
      case "err": return ERR;
      default: return undefined;
    }
  }
  return iterElem;
};
// iterElem, rewritten: the cases split so t narrows; the every/cast pair as a loop
export const iterElem_rw = (union, STR, ERR, NUM) => (R: RegFns) => {
  function iterElem(t0: Ty): Ty | undefined {
    const t = R.expand(t0);
    switch (t.k) {
      case "arr": return t.el;
      case "tup": return union(t.els);
      case "str": return STR;
      case "lit": return typeof t.v === "number" || typeof t.v === "boolean" ? undefined : STR;
      case "err": return ERR;
      case "named": {
        const a0 = t.args[0], a1 = t.args[1];
        if (t.n === "Iterable" || t.n === "ArrayLike") return a0;
        if (t.n === "Mut" || t.n === "Borrowed") return a0 === undefined ? undefined : iterElem(a0);
        if (t.n === "Map") return a0 && a1 ? { k: "tup", els: [a0, a1] } : undefined;
        if (t.n === "Set") return a0;
        if (R.isTypedArray(t)) return NUM;
        return undefined;
      }
      case "union": {
        const es: Mut<Ty[]> = mut([]);
        for (const x of t.ts) { const e = iterElem(x); if (!e) return undefined; es.push(e); }
        return union(freeze(es));
      }
      default: return undefined;
    }
  }
  return iterElem;
};
// sub + fnSub (one cell: mutually recursive), rewritten: s === t -> equals; seen a Mut parameter; every/some
// callbacks that call sub (which writes seen) as loops; (s as any).n by narrowing; strict index with ??
export const sub = (show, isNamed, propT, UNKNOWN) => (R: RegFns, iterElem: (t: Ty) => Ty | undefined) => {
  function fnSub(s: Fn, t: Fn, seen: Mut<Set<string>>): boolean {
    if (s.tps.length || t.tps.length) return false;
    let required = 0;
    for (const p of s.ps) if (!p.opt) required++;
    if (required > t.ps.length + (t.rest ? Infinity : 0)) return false;
    for (let i = 0; i < s.ps.length; i++) {
      const tp = t.ps[i]?.t ?? t.rest;
      const sp = s.ps[i];
      if (!tp || !sp) break;
      if (!sub(tp, sp.t, seen)) return false;
    }
    if (t.rest && s.rest && !sub(t.rest, s.rest, seen)) return false;
    return t.ret.k === "void" || sub(s.ret, t.ret, seen);
  }
  function sub(s: Ty, t: Ty, seen: Mut<Set<string>>): boolean {
    if (equals(s, t) || t.k === "unknown" || s.k === "err" || t.k === "err" || s.k === "never") return true;
    if ((s.k === "named" && R.isAlias(s.n)) || (t.k === "named" && R.isAlias(t.n))) {
      const key = show(s) + " <: " + show(t);
      if (seen.has(key)) return true;
      seen.add(key);
      return sub(R.expand(s), R.expand(t), seen);
    }
    if (s.k === "union") { for (const m of s.ts) if (!sub(m, t, seen)) return false; return true; }
    if (s.k === "named" && (s.n === "Mut" || s.n === "Borrowed") && !isNamed(t, s.n)) return sub(s.args[0] ?? UNKNOWN, t, seen);
    if (t.k === "union") { for (const m of t.ts) if (sub(s, m, seen)) return true; return false; }
    if (s.k === "tv") return t.k === "tv" && t.n === s.n;
    switch (t.k) {
      case "num": return s.k === "num" || (s.k === "lit" && typeof s.v === "number");
      case "str": return s.k === "str" || (s.k === "lit" && typeof s.v === "string");
      case "lit": return s.k === "lit" && s.v === t.v;
      case "void": return s.k === "void" || s.k === "undef";
      case "null": case "undef": case "bigint": case "symbol": case "never": return s.k === t.k;
      case "object": return ["rec", "arr", "tup", "fn", "named", "object"].includes(s.k);
      case "arr": {
        if (s.k === "arr") return sub(s.el, t.el, seen);
        if (s.k !== "tup") return false;
        for (const e of s.els) if (!sub(e, t.el, seen)) return false;
        return true;
      }
      case "tup": {
        if (s.k !== "tup" || s.els.length !== t.els.length) return false;
        for (let i = 0; i < s.els.length; i++) { const a = s.els[i], b = t.els[i]; if (!a || !b || !sub(a, b, seen)) return false; }
        return true;
      }
      case "fn": { for (const f of R.callSigs(s)) if (fnSub(f, t, seen)) return true; return false; }
      case "rec": {
        if (["null", "undef", "void"].includes(s.k)) return false;
        if (s.k === "named" && ["State", "StateCell", "Action"].includes(s.n)) return false;
        const se = R.expand(s);
        for (const [k, p] of t.props) {
          const sp = R.member(se, k);
          if (!sp) { if (p.opt) continue; return false; }
          if (sp.flags?.banned || (!p.opt && sp.opt)) return false;
          if (!sub(propT(sp), propT(p), seen)) return false;
        }
        if (t.index) {
          if (se.k !== "rec") return false;
          for (const [, p] of se.props) if (p.flags?.banned || !sub(propT(p), t.index, seen)) return false;
          if (se.index && !sub(se.index, t.index, seen)) return false;
        }
        for (const c of t.calls ?? []) {
          let any = false;
          for (const f of R.callSigs(se)) if (fnSub(f, c, seen)) any = true;
          if (!any) return false;
        }
        return true;
      }
      case "named": {
        const t0 = t.args[0] ?? UNKNOWN;
        if (t.n === "Iterable" || t.n === "ArrayLike") {
          const e = iterElem(s);
          return !!e && (t.n === "Iterable" || s.k !== "named" || !["Map", "Set"].includes(s.n)) && sub(e, t0, seen);
        }
        if (s.k !== "named" || s.n !== t.n) return false;
        const s0 = s.args[0] ?? UNKNOWN;
        if (t.n === "Mut" || t.n === "State") return sub(s0, t0, seen) && sub(t0, s0, seen);
        if (t.n === "Action") return sub(t0, s0, seen);
        for (let i = 0; i < t.args.length; i++) { const a = t.args[i]; if (a && !sub(s.args[i] ?? UNKNOWN, a, seen)) return false; }
        return true;
      }
      default: return false;
    }
  }
  return (s: Ty, t: Ty): boolean => { const seen = mut(new Set<string>()); return sub(s, t, seen); };
};
// unify, original style reduced: the closure U over the Mut map m, called from forEach
export const unifyReduced = () => (p: Ty, a: Ty, m: Mut<Map<string, Ty>>): void => {
  const U = (x: Ty, y: Ty): void => { m.set("T", y); };
  if (p.k === "arr" && a.k === "tup") a.els.forEach((e) => U(p.el, e));
};
// ifaceRec, reduced: the memo entry is put in before it is filled, then filled in place
export const ifaceRecReduced = () => (name: string, memo: Mut<Map<string, Rec>>): Rec => {
  const r: Rec = { k: "rec", props: new Map() };
  memo.set(name, r);
  r.props.set("x", { t: { k: "num" }, opt: false });
  return r;
};
