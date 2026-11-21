// [action-pass] and [handle-pass] (lite/infer.ts hides and the walks it makes). Every registry call here is the
// quiet one: the original makes these walks inside Registry.peek.

// the first type in s that one of the names marks, looked for in elements, properties, type arguments and returns
export const ixHeldIn = (show) => {
  function heldIn(R: IxRegCore, s: Ty, depth: number, hit: (s: Ty) => boolean, calls: boolean): string | null {
    if (depth > 10) return null;
    const first = (xs: Ty[]): string | null => { for (const x of xs) { const w = heldIn(R, x, depth + 1, hit, calls); if (w) return w; } return null; };
    switch (s.k) {
      case "named":
        if (hit(s)) return show(s);
        if (R.isAlias(s.n)) return heldIn(R, R.expand(s), depth + 1, hit, calls);
        return first(s.args);
      case "arr": return first([s.el]);
      case "tup": return first(s.els);
      case "union": return first(s.ts);
      case "rec": return first([...[...s.props.values()].map((p) => p.t), ...(s.index ? [s.index] : []), ...(calls ? (s.calls ?? []).map((c) => c.ret) : [])]);
      case "fn": return calls ? first([s.ret]) : null;
      default: return null;
    }
  }
  return heldIn;
};
// actionIn: the first Action held anywhere in s
export const ixActionIn = (ixHeldIn) => (R: IxRegCore, s: Ty): string | null => ixHeldIn(R, s, 0, (x) => x.k === "named" && x.n === "Action", true);
// handleIn: the first State or Events handle
export const ixHandleIn = (ixHeldIn) => (R: IxRegCore, s: Ty): string | null => ixHeldIn(R, s, 0, (x) => x.k === "named" && (x.n === "State" || x.n === "Events"), true);
// promiseIn: the first promise-like, a Promise, a type with a then member, or object
export const ixPromiseIn = (show) => {
  function promiseIn(R: IxRegCore, s: Ty, depth: number): string | null {
    if (depth > 10) return null;
    const first = (xs: Ty[]): string | null => { for (const x of xs) { const w = promiseIn(R, x, depth + 1); if (w) return w; } return null; };
    if (s.k === "object" || (s.k !== "union" && s.k !== "err" && R.member(s, "then"))) return show(s);
    switch (s.k) {
      case "named":
        if (s.n === "Promise") return show(s);
        if (R.isAlias(s.n)) return promiseIn(R, R.expand(s), depth + 1);
        return first(s.args);
      case "arr": return first([s.el]);
      case "tup": return first(s.els);
      case "union": return first(s.ts);
      case "rec": return first([...[...s.props.values()].map((p) => p.t), ...(s.index ? [s.index] : [])]);
      default: return null;
    }
  }
  return promiseIn;
};
// t has, somewhere hidden walks, unknown, object, a type parameter or a function; true past a depth of generic aliases
export const ixMayHide = () => {
  function anyHides(R: IxRegCore, seen: Mut<Set<string>>, xs: Ty[], d: number): boolean {
    for (const x of xs) if (go(R, seen, x, d)) return true;
    return false;
  }
  function go(R: IxRegCore, seen: Mut<Set<string>>, x: Ty, d: number): boolean {
    switch (x.k) {
      case "unknown": case "object": case "tv": case "fn": return true;
      case "named":
        if (!R.isAlias(x.n)) return anyHides(R, seen, x.args, d);
        if (x.args.length) return d > 10 || go(R, seen, R.expand(x), d + 1);
        if (seen.has(x.n)) return false;
        seen.add(x.n);
        return go(R, seen, R.expand(x), d);
      case "arr": return go(R, seen, x.el, d);
      case "tup": return anyHides(R, seen, x.els, d);
      case "union": return anyHides(R, seen, x.ts, d);
      case "rec": return !!x.calls?.length || !!x.ctors?.length || (!!x.index && go(R, seen, x.index, d)) || anyHides(R, seen, [...x.props.values()].map((p) => p.t), d);
      default: return false;
    }
  }
  return (R: IxRegCore, t: Ty): boolean => {
    const hit = R.mayHideMemo.get(t);
    if (hit !== undefined) return hit;
    const seen: Mut<Set<string>> = mut(new Set());
    const r = go(R, seen, t, 0);
    R.mayHideMemo.set(t, r);
    return r;
  };
};
// t may be or hold a function, for the fed rule (S11.9): what ixMayHide says, or a record a function is assignable to
// (one with no required property, as {}) where the same walk reaches
export const ixMayHoldFn = (ixMayHide) => {
  function anyFnLike(R: IxRegCore, seen: Mut<Set<string>>, xs: Ty[], d: number): boolean {
    for (const x of xs) if (go(R, seen, x, d)) return true;
    return false;
  }
  function go(R: IxRegCore, seen: Mut<Set<string>>, x: Ty, d: number): boolean {
    switch (x.k) {
      case "named":
        if (!R.isAlias(x.n)) return anyFnLike(R, seen, x.args, d);
        if (x.args.length) return d <= 10 && go(R, seen, R.expand(x), d + 1);
        if (seen.has(x.n)) return false;
        seen.add(x.n);
        return go(R, seen, R.expand(x), d);
      case "arr": return go(R, seen, x.el, d);
      case "tup": return anyFnLike(R, seen, x.els, d);
      case "union": return anyFnLike(R, seen, x.ts, d);
      case "rec": return (!x.index && [...x.props.values()].every((p) => p.opt) && R.sub({ k: "fn", tps: [], ps: [], ret: { k: "never" } }, x)) || (!!x.index && go(R, seen, x.index, d)) || anyFnLike(R, seen, [...x.props.values()].map((p) => p.t), d);
      default: return false;
    }
  }
  return (R: IxRegCore, t: Ty): boolean => {
    if (ixMayHide(R, t)) return true;
    const seen: Mut<Set<string>> = mut(new Set());
    return go(R, seen, t, 0);
  };
};
export type IxHide = { R: IxRegCore; opaque: Set<string> | null; find: (x: Ty) => string | null };
// the first Action (or handle, by find) in s that a position of t of type unknown, object or an opaque type
// parameter would take
export const ixHidden = (ixMayHide, ixHiddenIn, isNamed) => {
  function hidden(H: IxHide, s: Ty, t: Ty, depth: number): string | null {
    if (depth > 10 || s.k === "err" || t.k === "err" || s.k === "never") return null;
    if (!ixMayHide(H.R, t)) return null;
    const R = H.R;
    if (t.k === "unknown" || t.k === "object" || (t.k === "tv" && H.opaque?.has(t.n))) return H.find(s);
    if (s.k === "named" && R.isAlias(s.n)) return hidden(H, R.expand(s), t, depth + 1);
    if (t.k === "named" && R.isAlias(t.n)) return hidden(H, s, R.expand(t), depth + 1);
    if (s.k === "union") { for (const m of s.ts) { const w = hidden(H, m, t, depth + 1); if (w) return w; } return null; }
    if (s.k === "named" && (s.n === "Mut" || s.n === "Borrowed") && !isNamed(t, s.n)) return hidden(H, s.args[0] ?? s, t, depth + 1);
    if (t.k === "union") {
      // s goes to a member it is assignable to; it is hidden only when every such member hides it
      let w: string | null = null;
      for (const m of t.ts.filter((x) => R.sub(s, x))) { const x = hidden(H, s, m, depth + 1); if (!x) return null; w = x; }
      return w;
    }
    return ixHiddenIn(H, hidden, s, t, depth);
  }
  return hidden;
};
export type IxHiddenFn = (H: IxHide, s: Ty, t: Ty, depth: number) => string | null;
// hidden by the kind of t, once neither side is an alias or a union
export const ixHiddenIn = (ixHiddenFn, propT, NEVER) => (H: IxHide, hidden: IxHiddenFn, s: Ty, t: Ty, depth: number): string | null => {
  const R = H.R, sx = R.expand(s);
  const each = (pairs: [Ty, Ty][]): string | null => { for (const [a, b] of pairs) { const w = hidden(H, a, b, depth + 1); if (w) return w; } return null; };
  switch (t.k) {
    case "arr": return each((sx.k === "arr" ? [sx.el] : sx.k === "tup" ? sx.els : [R.iterElem(sx) ?? NEVER]).map((x): [Ty, Ty] => [x, t.el]));
    case "tup": return sx.k !== "tup" ? null : each(t.els.flatMap((x, i): [Ty, Ty][] => { const y = sx.els[i]; return y ? [[y, x]] : []; }));
    case "rec": {
      for (const [k, p] of t.props) { const sp = R.member(sx, k); const w = sp && hidden(H, propT(sp), propT(p), depth + 1); if (w) return w; }
      const index = t.index;
      if (index && sx.k === "rec") for (const p of sx.props.values()) { const w = hidden(H, propT(p), index, depth + 1); if (w) return w; }
      for (const c of t.calls ?? []) { const w = ixHiddenFn(H, hidden, s, c, depth); if (w) return w; }
      return null;
    }
    case "fn": return ixHiddenFn(H, hidden, s, t, depth);
    case "named": {
      const a0 = t.args[0];
      if (t.n === "Iterable" || t.n === "ArrayLike") { const el = R.iterElem(sx); return el && a0 ? hidden(H, el, a0, depth + 1) : null; }
      if (sx.k !== "named" || sx.n !== t.n) return null;
      return each(t.args.flatMap((x, i): [Ty, Ty][] => { const y = sx.args[i]; return y ? [[y, x]] : []; }));
    }
    default: return null;
  }
};
// a function of type s used as t: its return goes to t's return, and what t's caller passes to s's parameters
export const ixHiddenFn = () => (H: IxHide, hidden: IxHiddenFn, s: Ty, t: Fn, depth: number): string | null => {
  const f = H.R.callSigs(s)[0];
  if (!f) return null;
  const w = hidden(H, f.ret, t.ret, depth + 1);
  if (w) return w;
  for (let i = 0; i < t.ps.length && i < f.ps.length; i++) {
    const a = t.ps[i], b = f.ps[i];
    const x = a && b ? hidden(H, a.t, b.t, depth + 1) : null;
    if (x) return x;
  }
  return null;
};
// hides: an Action or a handle placed where its type becomes unknown, object or an opaque type parameter (S6.6)
export const ixHides = (ixHidden, ixActionIn, ixHandleIn, ixErr, show) => (K: IxK, C: IxCtls, at: AstNode, t: Ty, expected: Ty, opaque: Set<string> | null): boolean => {
  const R = K.reg.quiet, same = K.reg.same(t, expected);
  const w = same ? null : ixHidden({ R, opaque, find: (x: Ty) => ixActionIn(R, x) }, t, expected, 0);
  if (w) ixErr(K, C, at, "action-pass", `${show(t)} is given the type ${show(expected)}, which hides its ${w}; an Action goes only where an Action is expected`);
  const h = w || same ? null : ixHidden({ R, opaque, find: (x: Ty) => ixHandleIn(R, x) }, t, expected, 0);
  if (h) ixErr(K, C, at, "handle-pass", `${show(t)} is given the type ${show(expected)}, which hides its ${h}; a State or Events handle goes only where its own type is expected`);
  return !w && !h;
};
