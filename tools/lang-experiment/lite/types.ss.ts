// Type representation, normalisation, printing, subtyping, substitution and inference unification.
// Named types (aliases, interfaces, intrinsic classes, Mut/State/...) stay unexpanded until a Registry
// expands them, so recursive aliases are finite.
// SoundScript cells: each cell's parameters are the cells it takes. Under bun, types.ts links them;
// in the notebook they are compiled cells of @tomlarkworthy/soundscript-checker.

export type Flags = { mutates?: boolean; fresh?: boolean; view?: boolean; retains?: boolean; banned?: boolean; intrinsic?: boolean };
export type Param = { n: string; t: Ty; opt: boolean };
export type Fn = { k: "fn"; tps: string[]; ps: Param[]; rest?: Ty | undefined; ret: Ty; flags?: Flags; decl?: Fn };
export type Prop = { t: Ty; opt: boolean; flags?: Flags };
export type Rec = { k: "rec"; props: Map<string, Prop>; index?: Ty | undefined; calls?: Fn[] | undefined; ctors?: Fn[] | undefined; exact?: boolean; without?: string[] };
export type Named = { k: "named"; n: string; args: Ty[] };
export type Ty =
  | { k: "num" } | { k: "str" } | { k: "bigint" } | { k: "null" } | { k: "undef" } | { k: "void" }
  | { k: "never" } | { k: "unknown" } | { k: "object" } | { k: "symbol" } | { k: "err" }
  | { k: "lit"; v: string | number | boolean }
  | Rec
  | { k: "arr"; el: Ty }
  | { k: "tup"; els: Ty[] }
  | Fn
  | { k: "union"; ts: Ty[] }
  | Named
  | { k: "tv"; n: string };

export const NUM = (): Ty => ({ k: "num" });
export const STR = (): Ty => ({ k: "str" });
export const BIGINT = (): Ty => ({ k: "bigint" });
export const NULL = (): Ty => ({ k: "null" });
export const UNDEF = (): Ty => ({ k: "undef" });
export const VOID = (): Ty => ({ k: "void" });
export const NEVER = (): Ty => ({ k: "never" });
export const UNKNOWN = (): Ty => ({ k: "unknown" });
export const OBJECT = (): Ty => ({ k: "object" });
export const ERR = (): Ty => ({ k: "err" });
export const SYMBOL = (): Ty => ({ k: "symbol" });
export const TRUE = (): Ty => ({ k: "lit", v: true });
export const FALSE = (): Ty => ({ k: "lit", v: false });
export const BOOL = (TRUE: Ty, FALSE: Ty): Ty => ({ k: "union", ts: [TRUE, FALSE] });
export const lit = () => (v: string | number | boolean): Ty => ({ k: "lit", v });
export const arr = () => (el: Ty): Ty => ({ k: "arr", el });
export const named = () => (n: string, ...args: Ty[]): Ty => ({ k: "named", n, args });
export const rec = () => (props: Record<string, Ty>, opt: string[] = []): Rec => ({
  k: "rec",
  props: new Map(Object.entries(props).map(([k, t]) => [k, { t, opt: opt.includes(k) }])),
});

// Wrappers with fixed meaning. Everything else named is an alias/interface (Registry) or an intrinsic class.
export const WRAPPERS = () => new Set(["Mut", "State", "StateCell", "Action", "Borrowed", "Promise", "Generator", "Iterable", "ArrayLike"]);
// types.ts gives this its TypeScript type, the predicate t is Named; a SoundScript type has no predicates
export const isNamed = () => (t: Ty, n: string): boolean => t.k === "named" && t.n === n;
export const unwrap = () => (t: Ty): Ty => (t.k === "named" && (t.n === "Mut" || t.n === "Borrowed") ? t.args[0] ?? t : t);
// The type a read of the property sees: optional adds undefined.
export const propT = (union, UNDEF) => (p: Prop): Ty => (p.opt ? union([p.t, UNDEF]) : p.t);
// the names of a type parameter list node (acorn-typescript gives each name as an Identifier or a string)
export const tpNames = () => (tp: { readonly params?: readonly { readonly name: string | { readonly name: string } }[] } | null | undefined): string[] =>
  (tp?.params ?? []).map((x) => (typeof x.name === "string" ? x.name : x.name.name));

export const union = (show, typeKey, ERR, UNKNOWN, NEVER) => (ts: Ty[]): Ty => {
  function flatten(t: Ty): Ty[] {
    return t.k === "union" ? t.ts.flatMap(flatten) : t.k === "never" ? [] : [t];
  }
  const flat = ts.flatMap(flatten);
  if (flat.some((t) => t.k === "err")) return ERR;
  if (flat.some((t) => t.k === "unknown")) return UNKNOWN;
  const seen = mut(new Set<string>());
  const out: Mut<Ty[]> = mut([]);
  const has = (k: string) => flat.some((t) => t.k === k);
  for (const t of flat) {
    if (t.k === "lit" && ((typeof t.v === "string" && has("str")) || (typeof t.v === "number" && has("num")))) continue;
    const key = show(t);
    if (seen.has(key) && out.some((o) => show(o) === key && typeKey(o) === typeKey(t))) continue;
    seen.add(key);
    out.push(t);
  }
  const kept = freeze(out);
  const first = kept[0];
  return first === undefined ? NEVER : kept.length === 1 ? first : { k: "union", ts: kept };
};
// a type in full, with what show() leaves out past depth 6, a closed record and a member's flags (not a parameter's
// name or a signature's flags, which show() and the dedupe before it leave out too): two types with one key are one type. A memo or a dedupe keyed by show() takes two types for one when they differ only deep (holes step 8)
export const typeKey = () => {
  const fl = (f: Flags | undefined): string => (f === undefined ? "" : `#${f.mutates ? "m" : ""}${f.fresh ? "f" : ""}${f.view ? "v" : ""}${f.retains ? "r" : ""}${f.banned ? "b" : ""}${f.intrinsic ? "i" : ""}`);
  function key(t: Ty, d: number): string {
    if (d > 200) return "…";
    const k = (x: Ty) => key(x, d + 1);
    switch (t.k) {
      case "lit": return `L${typeof t.v}:${JSON.stringify(t.v)}`;
      case "arr": return `A(${k(t.el)})`;
      case "tup": return `T(${t.els.map(k).join(",")})`;
      case "union": return `U(${t.ts.map(k).join("|")})`;
      case "named": return `N${t.n}<${t.args.map(k).join(",")}>`;
      case "tv": return `V${t.n}`;
      case "fn": return `F<${t.tps.join(",")}>(${t.ps.map((p) => `${p.opt ? "?" : ""}${k(p.t)}`).join(",")}${t.rest ? `...${k(t.rest)}` : ""})=>${k(t.ret)}`;
      case "rec": {
        const ps = [...t.props].map(([n, p]) => `${JSON.stringify(n)}${p.opt ? "?" : ""}${fl(p.flags)}:${k(p.t)}`);
        return `R${t.exact === true ? "!" : ""}{${ps.join(";")}|${t.index ? k(t.index) : ""}|${(t.calls ?? []).map(k).join(",")}|${(t.ctors ?? []).map(k).join(",")}|${(t.without ?? []).join(",")}}`;
      }
      default: return t.k;
    }
  }
  return (t: Ty): string => key(t, 0);
};
// t with no closed record type: what a Mut or a state cell holds may be replaced or written by other values
export const inexact = () => {
  function go(t: Ty, d: number): Ty {
    if (d > 12) return t;
    switch (t.k) {
      case "rec": return { k: "rec", props: new Map([...t.props].map(([k, p]): [string, Prop] => [k, { ...p, t: go(p.t, d + 1) }])), index: t.index, calls: t.calls, ctors: t.ctors };
      case "arr": return { k: "arr", el: go(t.el, d + 1) };
      case "tup": return { k: "tup", els: t.els.map((x) => go(x, d + 1)) };
      case "union": return { k: "union", ts: t.ts.map((x) => go(x, d + 1)) };
      case "named": return { k: "named", n: t.n, args: t.args.map((x) => go(x, d + 1)) };
      default: return t;
    }
  }
  return (t: Ty): Ty => go(t, 0);
};
export const members = () => (t: Ty): Ty[] => (t.k === "union" ? t.ts : t.k === "never" ? [] : [t]);

export const show = () => {
  function show(t: Ty, depth: number): string {
    if (depth > 6) return "…";
    const s = (x: Ty) => show(x, depth + 1);
    switch (t.k) {
      case "num": return "number";
      case "str": return "string";
      case "undef": return "undefined";
      case "lit": return typeof t.v === "string" ? JSON.stringify(t.v) : String(t.v);
      case "arr": return (t.el.k === "union" || t.el.k === "fn" ? `(${s(t.el)})` : s(t.el)) + "[]";
      case "tup": return `[${t.els.map(s).join(", ")}]`;
      case "union": {
        const hasT = t.ts.some((x) => x.k === "lit" && x.v === true), hasF = t.ts.some((x) => x.k === "lit" && x.v === false);
        const rest = t.ts.filter((x) => !(hasT && hasF && x.k === "lit" && typeof x.v === "boolean")).map(s);
        return (hasT && hasF ? [...rest, "boolean"] : rest).join(" | ");
      }
      case "named": return t.args.length ? `${t.n}<${t.args.map(s).join(", ")}>` : t.n;
      case "tv": return t.n;
      case "fn": return `${t.tps.length ? `<${t.tps.join(", ")}>` : ""}(${[...t.ps.map((p) => `${p.n}${p.opt ? "?" : ""}: ${s(p.t)}`), ...(t.rest ? [`...r: ${s(t.rest)}[]`] : [])].join(", ")}) => ${s(t.ret)}`;
      case "rec": {
        const ps = [
          ...[...t.props].map(([k, p]) => `${k}${p.opt ? "?" : ""}: ${s(p.t)}`),
          ...(t.index ? [`[k: string]: ${s(t.index)}`] : []),
          ...(t.calls ?? []).map(s),
        ];
        return `{ ${ps.join("; ")} }`;
      }
      default: return t.k;
    }
  }
  return (t: Ty, depth: number = 0): string => show(t, depth);
};

// ---- substitution ----
export type Subst = Map<string, Ty>;
export const subst = (union) => {
  function substFn(f: Fn, m: Subst): Fn {
    const inner = f.tps.length ? new Map([...m].filter(([k]) => !f.tps.includes(k))) : m;
    return { ...f, ps: f.ps.map((p) => ({ ...p, t: subst(p.t, inner) })), rest: f.rest && subst(f.rest, inner), ret: subst(f.ret, inner), decl: f.decl ?? f };
  }
  function subst(t: Ty, m: Subst): Ty {
    if (m.size === 0) return t;
    switch (t.k) {
      case "tv": return m.get(t.n) ?? t;
      case "arr": return { k: "arr", el: subst(t.el, m) };
      case "tup": return { k: "tup", els: t.els.map((x) => subst(x, m)) };
      case "union": return union(t.ts.map((x) => subst(x, m)));
      case "named": return t.args.length ? { k: "named", n: t.n, args: t.args.map((x) => subst(x, m)) } : t;
      case "fn": return substFn(t, m);
      case "rec": {
        const props = mut(new Map<string, Prop>());
        for (const [k, p] of t.props) props.set(k, { ...p, t: subst(p.t, m) });
        return { k: "rec", props: freeze(props), index: t.index && subst(t.index, m), calls: t.calls?.map((c) => substFn(c, m)), ctors: t.ctors?.map((c) => substFn(c, m)) };
      }
      default: return t;
    }
  }
  return subst;
};
export const hasTv = () => {
  function hasTv(t: Ty, names?: Set<string>): boolean {
    switch (t.k) {
      case "tv": return !names || names.has(t.n);
      case "arr": return hasTv(t.el, names);
      case "tup": return t.els.some((x) => hasTv(x, names));
      case "union": return t.ts.some((x) => hasTv(x, names));
      case "named": return t.args.some((x) => hasTv(x, names));
      case "fn": return t.ps.some((p) => hasTv(p.t, names)) || (!!t.rest && hasTv(t.rest, names)) || hasTv(t.ret, names);
      case "rec": return [...t.props.values()].some((p) => hasTv(p.t, names)) || (!!t.index && hasTv(t.index, names));
      default: return false;
    }
  }
  return hasTv;
};
// Rename a generic function's type parameters to unique names so nested instantiations do not collide.
// fresh: the caller's count of names made so far; the names are n'(fresh+1), n'(fresh+2), ...
export const instantiate = (subst) => (f: Fn, fresh: number): { f: Fn; tvs: string[] } => {
  if (!f.tps.length) return { f, tvs: [] };
  const tvs = f.tps.map((n, i) => `${n}'${fresh + i + 1}`);
  const m: Subst = new Map(f.tps.map((n, i): [string, Ty] => [n, { k: "tv", n: tvs[i] ?? n }]));
  const g = subst({ ...f, tps: [] }, m);
  // subst maps a fn to a fn
  if (g.k !== "fn") throw new Error(`instantiate: subst gave ${g.k}`);
  return { f: { ...g, decl: f.decl ?? f }, tvs };
};

// Shallow literal widening (let bindings, inferred returns, inferred type arguments).
export const widen = (STR, NUM, BOOL, union) => {
  function widen(t: Ty): Ty {
    if (t.k === "lit") return typeof t.v === "string" ? STR : typeof t.v === "number" ? NUM : BOOL;
    if (t.k === "union") return union(t.ts.map(widen));
    return t;
  }
  return widen;
};

export const isPrimitive = (members) => (t: Ty): boolean =>
  members(t).every((m) => ["num", "str", "bigint", "null", "undef", "void", "lit", "symbol", "never", "err"].includes(m.k));
