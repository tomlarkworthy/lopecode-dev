// The cell-level rules on a cell's value type (core.ts checkSources lines 343-366), run after the cell's problems are
// collected and deduplicated: so these are never deduplicated, and what the registry reports while they run is dropped.

// the value type: the function's result, without the Promise of an async cell or the Generator of a generator
export const mdValueType = (isNamed, ERR) => (fn: FnNode, fnT: Ty): { ret: Ty; gen: boolean; gap: string | null } => {
  let ret: Ty = fnT.k === "fn" ? fnT.ret : ERR;
  // core.ts reads args[0] unguarded
  if (fn.async && ret.k === "named" && isNamed(ret, "Promise")) { const a = ret.args[0]; if (a === undefined) return { ret, gen: false, gap: "Promise with no type argument" }; ret = a; }
  if (!fn.generator || ret.k !== "named" || !isNamed(ret, "Generator")) return { ret, gen: false, gap: null };
  const y = ret.args[0];
  return y === undefined ? { ret, gen: false, gap: "Generator with no type argument" } : { ret: y, gen: true, gap: null };
};
// core.ts fnKept: a cell fed a function from another language may not keep a value that may hold one
export const mdKept = (ixMayHoldFn, show) => (R: IxRegCore, name: string, fedBy: string | null, line: number, what: string, t: Ty, then: string): MdErr[] =>
  fedBy !== null && ixMayHoldFn(R, t) ? [{ rule: "action-capture", line, msg: `${what} ${show(t)}, which may be or hold a function from another language (${name} ${fedBy}); ${then}` }] : [];
// a state cell's content: not undefined, no State or StateCell in it, no function from another language
export const mdStateRules = (mdKept, admitsUndefinedWith, holdsWith, show) => (R: IxReg, X: MdCtx, name: string, fedBy: string | null, line: number, inner: Ty): MdErr[] => {
  const nested = holdsWith(X.R.ops)(inner, ["State", "StateCell"]);
  return [
    ...(admitsUndefinedWith(X.R.ops)(inner) ? [{ rule: "state-undefined", line, msg: `a state cell's value may not be undefined (its type is ${show(inner)}): Observable skips an undefined value, so the cell would never have one. Use null` }] : []),
    ...(nested ? [{ rule: "state-in-state", line, msg: `a state cell holds ${show(inner)}, which contains ${nested}; a state cell's content may not contain a State or StateCell` }] : []),
    ...mdKept(R, name, fedBy, line, "a state cell holds", inner, "an action that reads the state cell could call it"),
  ];
};
// a value with a callable then (holes7): the runtime, and an async cell's own return, call then and give the cells that
// take the value what then passes on, not this type
export const mdThenable = () => (t: Ty): boolean => {
  const todo: Mut<Ty[]> = [t];
  for (let u = todo.pop(); u !== undefined; u = todo.pop()) {
    if (u.k === "union") todo.push(...u.ts);
    else if (u.k === "rec" && u.props.get("then")?.t.k === "fn") return true;
  }
  return false;
};
export type MdValueOut = { readonly errors: MdErr[]; readonly value: Ty; readonly events: Ty | null; readonly ref: Ty | null; readonly listener: boolean; readonly gap: string | null };
// the rules in core.ts's order: events, state cell, iterator, listener; and what the cell gives the cells after it
export const mdValueRules = (mdValueType, mdKept, mdStateRules, owIter, owStripMut, holdsWith, isNamed, show, mdThenable) => (R: IxReg, X: MdCtx, d: MdDef, fnT: Ty, fedBy: string | null): MdValueOut => {
  const v = mdValueType(d.fn, fnT);
  const line = X.line(d.fn.start), sync = d.fn.generator && !d.fn.async;
  // S4: a cell's value, each value it yields and a state's value are the read-only view (frozen at run time)
  let ret = owStripMut(R, v.ret);
  const events = v.gen && sync ? ret : null;
  const errs = sync ? mdKept(R, d.name, fedBy, line, "an events cell yields", ret, "a listener's action would receive it") : [];
  const sc = ret.k === "named" && isNamed(ret, "StateCell");
  const inner = ret.k === "named" && sc ? ret.args[0] : undefined;
  if (sc && inner === undefined) return { errors: errs, value: ret, events, ref: null, listener: false, gap: "StateCell with no type argument" };
  const state = inner === undefined ? [] : mdStateRules(R, X, d.name, fedBy, line, inner);
  if (inner !== undefined) ret = inner;
  const it = owIter(R, ret);
  const iter = it === null ? [] : [{ rule: "iterator-cell", line, msg: `value ${show(ret)} may hold an iterator (${it}); every cell that takes it would use up the same one, so what each computes would depend on the order the cells run in. Make it an array` }];
  const then = mdThenable(ret) ? [{ rule: "type", line, msg: `value ${show(ret)} has a callable then: the runtime would call it and give the cells that take it what then passes on, not this type. Rename then` }] : [];
  const isL = (t: Ty): boolean => t.k === "named" && isNamed(t, "Listener");
  const listener = isL(ret) || (ret.k === "union" && ret.ts.every(isL));
  const held = listener ? null : holdsWith(X.R.ops)(ret, ["Listener"]);
  const place = held ? [{ rule: "listener-placement", line, msg: `value ${show(ret)} holds a Listener; a listener is only the whole value of a cell` }] : [];
  return { errors: [...errs, ...state, ...iter, ...then, ...place], value: ret, events, ref: inner ?? null, listener, gap: v.gap };
};
