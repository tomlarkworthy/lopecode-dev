// Questions the checker asks of a type by walking it, aliases expanded through RegOps (subtype.ss.ts): what a
// structured clone cannot copy, whether undefined is a value of it, and which of some names it mentions. Under bun,
// types.ts links these cells with types.ss.ts and subtype.ss.ts; in the notebook they are compiled cells of
// @tomlarkworthy/soundscript-checker.

// structuredClone to a worker carries data, not functions, state handles, actions or borrowed views (core.ts compile)
export const UNCLONEABLE_NAMES = () => ["Action", "State", "StateCell", "Mut", "Borrowed", "Promise", "Generator", "Pool", "Compile", "Events", "Listener", "Elem"];
export const uncloneableWith = (UNCLONEABLE_NAMES) => (R: RegOps) => {
  function uncloneable(t: Ty, depth: number = 0): string | null {
    if (depth > 8) return null;
    if (t.k === "named" && R.isAlias(t.n)) return uncloneable(R.expand(t), depth + 1);
    const first = (xs: Ty[]): string | null => { for (const x of xs) { const w = uncloneable(x, depth + 1); if (w) return w; } return null; };
    switch (t.k) {
      case "fn": return "a function";
      case "named": return UNCLONEABLE_NAMES.includes(t.n) ? t.n : null;
      case "arr": return uncloneable(t.el, depth + 1);
      case "tup": return first(t.els);
      case "union": return first(t.ts);
      case "rec": return t.calls?.length ? "a function" : first([...t.props.values()].map((p) => p.t));
      default: return null;
    }
  }
  return uncloneable;
};

// what structuredClone cannot copy in a value of type t: it throws on a function, a symbol or a host object, and a
// value of an open type (unknown, object, a type parameter) may be one (infer.ts, a structuredClone call)
export const CLONEABLE_NAMES = () => ["Error", "RegExp", "RegExpMatchArray", "ArrayBuffer", "DataView"];
export const cloneProblemWith = (show, CLONEABLE_NAMES) => (R: RegOps) => {
  function cloneProblem(t: Ty, depth: number = 0): string | null {
    if (depth > 10) return null;
    const first = (xs: Ty[]): string | null => { for (const x of xs) { const w = cloneProblem(x, depth + 1); if (w) return w; } return null; };
    switch (t.k) {
      case "fn": return "is or holds a function";
      case "symbol": return "is or holds a symbol";
      case "unknown": case "object": case "tv": return `may be or hold a function (its type is ${show(t)})`;
      case "arr": return cloneProblem(t.el, depth + 1);
      case "tup": return first(t.els);
      case "union": return first(t.ts);
      case "rec": return t.calls?.length ? "is or holds a function" : first([...[...t.props.values()].map((p) => p.t), ...(t.index ? [t.index] : [])]);
      case "named":
        if (R.isAlias(t.n)) return cloneProblem(R.expand(t), depth + 1);
        if (["Mut", "Borrowed", "Map", "Set"].includes(t.n)) return first(t.args);
        if (CLONEABLE_NAMES.includes(t.n) || R.isTypedArray(t)) return null;
        return `is or holds a ${t.n}`;
      default: return null;
    }
  }
  return cloneProblem;
};

// undefined is a value of t: t is undefined, void or unknown, or a union with one of them (aliases expanded)
export const admitsUndefinedWith = () => (R: RegOps) => {
  function admitsUndefined(t: Ty, depth: number = 0): boolean {
    return depth <= 12 && (t.k === "undef" || t.k === "void" || t.k === "unknown" ||
      (t.k === "named" && R.isAlias(t.n) && admitsUndefined(R.expand(t), depth + 1)) || (t.k === "union" && t.ts.some((x) => admitsUndefined(x, depth + 1))));
  }
  return admitsUndefined;
};

// the types t is made of: elements, members, properties, signatures' parameters and results
export const partsOf = () => (t: Ty): Ty[] => {
  switch (t.k) {
    case "arr": return [t.el];
    case "tup": return t.els;
    case "union": return t.ts;
    case "rec": return [...[...t.props.values()].map((p) => p.t), ...(t.calls ?? []).flatMap((f) => [...f.ps.map((p) => p.t), f.ret]), ...(t.index ? [t.index] : [])];
    case "fn": return [...t.ps.map((p) => p.t), t.ret];
    default: return [];
  }
};
// the first of names that t mentions anywhere (aliases expanded), or null
export const holdsWith = (partsOf) => (R: RegOps) => {
  function holds(t: Ty, names: string[], depth: number = 0): string | null {
    if (depth > 12) return null;
    if (t.k === "named" && names.includes(t.n)) return t.n;
    if (t.k === "named" && R.isAlias(t.n)) return holds(R.expand(t), names, depth + 1);
    for (const k of t.k === "named" ? t.args : partsOf(t)) { const w = holds(k, names, depth + 1); if (w) return w; }
    return null;
  }
  return holds;
};

// t holds err, or an alias the checker could not convert: such a parameter type was reported where it is written
export const hasErrWith = () => (R: RegOps) => {
  function hasErr(t: Ty, depth: number = 0): boolean {
    if (depth > 8) return false;
    const any = (xs: Ty[]): boolean => xs.some((x) => hasErr(x, depth + 1));
    switch (t.k) {
      case "err": return true;
      case "arr": return hasErr(t.el, depth + 1);
      case "tup": return any(t.els);
      case "union": return any(t.ts);
      case "named": return any(t.args) || R.expand(t).k === "err";
      case "fn": return any(t.ps.map((p) => p.t)) || hasErr(t.ret, depth + 1);
      case "rec": return any([...t.props.values()].map((p) => p.t));
      default: return false;
    }
  }
  return hasErr;
};
