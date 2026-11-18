// v0: lite/types.ts with only the cell form applied (each declaration a cell, dependencies as parameters,
// recursion through a local function declaration, the module-level counter moved to a parameter). Kept to
// record what the checker says about code changed no further. Not used by anything.
export type Flags = { mutates?: boolean; fresh?: boolean; view?: boolean; retains?: boolean; banned?: boolean; intrinsic?: boolean };
export type Param = { n: string; t: Ty; opt: boolean };
export type Fn = { k: "fn"; tps: string[]; ps: Param[]; rest?: Ty; ret: Ty; flags?: Flags; decl?: Fn };
export type Prop = { t: Ty; opt: boolean; flags?: Flags };
export type Rec = { k: "rec"; props: Map<string, Prop>; index?: Ty; calls?: Fn[]; ctors?: Fn[] };
export type Ty =
  | { k: "num" } | { k: "str" } | { k: "bigint" } | { k: "null" } | { k: "undef" } | { k: "void" }
  | { k: "never" } | { k: "unknown" } | { k: "object" } | { k: "symbol" } | { k: "err" }
  | { k: "lit"; v: string | number | boolean }
  | Rec
  | { k: "arr"; el: Ty }
  | { k: "tup"; els: Ty[] }
  | Fn
  | { k: "union"; ts: Ty[] }
  | { k: "named"; n: string; args: Ty[] }
  | { k: "tv"; n: string };

export const NUM = (): Ty => ({ k: "num" }), STR = (): Ty => ({ k: "str" }), BIGINT = (): Ty => ({ k: "bigint" }), NULL = (): Ty => ({ k: "null" });
export const UNDEF = (): Ty => ({ k: "undef" }), VOID = (): Ty => ({ k: "void" }), NEVER = (): Ty => ({ k: "never" }), UNKNOWN = (): Ty => ({ k: "unknown" });
export const OBJECT = (): Ty => ({ k: "object" }), ERR = (): Ty => ({ k: "err" }), SYMBOL = (): Ty => ({ k: "symbol" });
export const TRUE = (): Ty => ({ k: "lit", v: true }), FALSE = (): Ty => ({ k: "lit", v: false });
export const BOOL = (TRUE: Ty, FALSE: Ty): Ty => ({ k: "union", ts: [TRUE, FALSE] });
export const lit = () => (v: string | number | boolean): Ty => ({ k: "lit", v });
export const arr = () => (el: Ty): Ty => ({ k: "arr", el });
export const named = () => (n: string, ...args: Ty[]): Ty => ({ k: "named", n, args });
export const rec = () => (props: Record<string, Ty>, opt: string[] = []): Rec => ({
  k: "rec",
  props: new Map(Object.entries(props).map(([k, t]) => [k, { t, opt: opt.includes(k) }])),
});

export const WRAPPERS = () => new Set(["Mut", "State", "StateCell", "Action", "Borrowed", "Promise", "Generator", "Iterable", "ArrayLike"]);
export const isNamed = () => (t: Ty, n: string): t is { k: "named"; n: string; args: Ty[] } => t.k === "named" && t.n === n;
export const unwrap = (isNamed) => (t: Ty): Ty => (isNamed(t, "Mut") || isNamed(t, "Borrowed") ? t.args[0] : t);
export const propT = (union, UNDEF) => (p: Prop): Ty => (p.opt ? union([p.t, UNDEF]) : p.t);
export const tpNames = () => (tp: any): string[] => (tp?.params ?? []).map((x: any) => x.name?.name ?? x.name);

export const union = (show, ERR, UNKNOWN, NEVER) => (ts: Ty[]): Ty => {
  const flat: Ty[] = [];
  const add = (t: Ty) => {
    if (t.k === "union") t.ts.forEach(add);
    else if (t.k !== "never") flat.push(t);
  };
  ts.forEach(add);
  if (flat.some((t) => t.k === "err")) return ERR;
  if (flat.some((t) => t.k === "unknown")) return UNKNOWN;
  const seen = new Set<string>();
  const out: Ty[] = [];
  const has = (k: string) => flat.some((t) => t.k === k);
  for (const t of flat) {
    if (t.k === "lit" && ((typeof t.v === "string" && has("str")) || (typeof t.v === "number" && has("num")))) continue;
    const key = show(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.length === 0 ? NEVER : out.length === 1 ? out[0] : { k: "union", ts: out };
};
export const members = () => (t: Ty): Ty[] => (t.k === "union" ? t.ts : t.k === "never" ? [] : [t]);

export const show = () => {
  function show(t: Ty, depth = 0): string {
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
        if (hasT && hasF) rest.push("boolean");
        return rest.join(" | ");
      }
      case "named": return t.args.length ? `${t.n}<${t.args.map(s).join(", ")}>` : t.n;
      case "tv": return t.n;
      case "fn": return `${t.tps.length ? `<${t.tps.join(", ")}>` : ""}(${[...t.ps.map((p) => `${p.n}${p.opt ? "?" : ""}: ${s(p.t)}`), ...(t.rest ? [`...r: ${s(t.rest)}[]`] : [])].join(", ")}) => ${s(t.ret)}`;
      case "rec": {
        const ps = [...t.props].map(([k, p]) => `${k}${p.opt ? "?" : ""}: ${s(p.t)}`);
        if (t.index) ps.push(`[k: string]: ${s(t.index)}`);
        for (const c of t.calls ?? []) ps.push(s(c));
        return `{ ${ps.join("; ")} }`;
      }
      default: return t.k;
    }
  }
  return show;
};

export type Subst = Map<string, Ty>;
export const subst = (union) => {
  function subst(t: Ty, m: Subst): Ty {
    if (m.size === 0) return t;
    switch (t.k) {
      case "tv": return m.get(t.n) ?? t;
      case "arr": return { k: "arr", el: subst(t.el, m) };
      case "tup": return { k: "tup", els: t.els.map((x) => subst(x, m)) };
      case "union": return union(t.ts.map((x) => subst(x, m)));
      case "named": return t.args.length ? { k: "named", n: t.n, args: t.args.map((x) => subst(x, m)) } : t;
      case "fn": {
        const inner = t.tps.length ? new Map([...m].filter(([k]) => !t.tps.includes(k))) : m;
        return { ...t, ps: t.ps.map((p) => ({ ...p, t: subst(p.t, inner) })), rest: t.rest && subst(t.rest, inner), ret: subst(t.ret, inner), decl: t.decl ?? t };
      }
      case "rec": {
        const props = new Map<string, Prop>();
        for (const [k, p] of t.props) props.set(k, { ...p, t: subst(p.t, m) });
        return { k: "rec", props, index: t.index && subst(t.index, m), calls: t.calls?.map((c) => subst(c, m) as Fn), ctors: t.ctors?.map((c) => subst(c, m) as Fn) };
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
// the counter that was a module-level `let fresh` is the caller's: fresh is its value before this call
export const instantiate = (subst) => (f: Fn, fresh: number): { f: Fn; tvs: string[] } => {
  if (!f.tps.length) return { f, tvs: [] };
  const m: Subst = new Map(f.tps.map((n) => [n, { k: "tv", n: `${n}'${++fresh}` }]));
  const g = subst({ ...f, tps: [] }, m) as Fn;
  return { f: { ...g, decl: f.decl ?? f }, tvs: [...m.values()].map((t) => (t as { n: string }).n) };
};

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
