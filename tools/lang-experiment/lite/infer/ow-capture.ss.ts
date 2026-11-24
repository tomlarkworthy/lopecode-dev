// Captures to a fixpoint through helper calls, and what one may not capture (lite/own.ts iterIn and the captures
// part of ownership): iterator-capture, borrowed-escape, mut-capture, let-capture.

// what in t may be a one-shot iterator; none: per alias without type arguments, the least depth its walk found nothing from
// the member types iterIn looks into, in own.ts's order
export const owTyKids = () => (t: Ty): Ty[] => {
  switch (t.k) {
    case "arr": return [t.el];
    case "tup": return t.els;
    case "union": return t.ts;
    case "rec": return [...[...t.props.values()].map((p) => p.t), ...(t.index ? [t.index] : [])];
    default: return [];
  }
};
export const owIterIn = (show, owTyKids) => {
  function iterIn(R: IxRegCore, t: Ty, depth: number, none: Mut<Map<string, number>>): string | null {
    if (depth > 12) return null;
    switch (t.k) {
      case "tv": return `the type parameter ${show(t)}`;
      case "arr": case "tup": case "union": case "rec": return inner(R, owTyKids(t), depth, none);
      case "named": {
        // d1 (2026-11-24): a FetchResponse's body can be read once, so it is one-shot as an iterator is
        if (t.n === "Iterable" || t.n === "Generator" || t.n === "FetchResponse") return show(t);
        if (t.n === "Action" || t.n === "State" || t.n === "Events") return null;
        if (!R.isAlias(t.n)) return inner(R, t.args, depth, none);
        const plain = !t.args.length, at = none.get(t.n);
        if (plain && at !== undefined && at <= depth) return null;
        const w = iterIn(R, R.expand(t), depth + 1, none);
        if (!w && plain) none.set(t.n, depth);
        return w;
      }
      default: return null;
    }
  }
  function inner(R: IxRegCore, ts: Ty[], depth: number, none: Mut<Map<string, number>>): string | null {
    for (const x of ts) { const w = iterIn(R, x, depth + 1, none); if (w) return w; }
    return null;
  }
  return iterIn;
};
export const owIter = (owIterIn) => (R: IxRegCore, t: Ty): string | null => {
  const none: Mut<Map<string, number>> = new Map();
  return owIterIn(R, t, 0, none);
};
// where a type holds Mut<…>: through arrays, tuples, unions, records, type arguments and aliases; not inside a function
// type (its parameters are its callers'; a result can hold only a Mut the caller gave it, as a registry's memo)
export const owMutIn = (show, owTyKids) => {
  function mutIn(R: IxRegCore, t: Ty, depth: number, none: Mut<Map<string, number>>): string | null {
    if (depth > 12) return null;
    switch (t.k) {
      case "arr": case "tup": case "union": case "rec": return inner(R, owTyKids(t), depth, none);
      case "named": {
        if (t.n === "Mut") return show(t);
        if (!R.isAlias(t.n)) return inner(R, t.args, depth, none);
        const plain = !t.args.length, at = none.get(t.n);
        if (plain && at !== undefined && at <= depth) return null;
        const w = mutIn(R, R.expand(t), depth + 1, none);
        if (!w && plain) none.set(t.n, depth);
        return w;
      }
      default: return null;
    }
  }
  function inner(R: IxRegCore, ts: Ty[], depth: number, none: Mut<Map<string, number>>): string | null {
    for (const x of ts) { const w = mutIn(R, x, depth + 1, none); if (w) return w; }
    return null;
  }
  return mutIn;
};
// rule set R (r2; k1, 2026-11-23): where a value of type t lets its holder reach a Mut: record fields, elements, unions,
// type arguments, aliases, and the result of a function or of a record's call or construct signature, not a parameter
// (what the holder gives). R-K, R-Y and R-A take a binding whose type this finds. A part already walked, or an alias met
// again with the same arguments, adds nothing; more than 12 expansions of generic aliases on one path, or more than
// 200 levels, count as holding one
export const owMutDeep = (show, typeKey, owTyKids) => (R: IxRegCore, t0: Ty): string | null => {
  const seen: Mut<Set<string>> = new Set(), done: Mut<Set<Ty>> = new Set();
  function step(t: Ty, d: number, g: number): string | null {
    const inner = (ts: Ty[]): string | null => { for (const x of ts) { const w = deep(x, d + 1, g); if (w) return w; } return null; };
    if (t.k === "fn") return inner([t.ret]);
    if (t.k === "rec") return inner([...owTyKids(t), ...[...(t.calls ?? []), ...(t.ctors ?? [])].map((c) => c.ret)]);
    if (t.k !== "named") return inner(owTyKids(t));
    if (t.n === "Mut") return show(t);
    if (!R.isAlias(t.n)) return inner(t.args);
    const key = typeKey(t);
    if (seen.has(key)) return null;
    seen.add(key);
    return deep(R.expand(t), d + 1, t.args.length ? g + 1 : g);
  }
  function deep(t: Ty, d: number, g: number): string | null {
    if (done.has(t)) return null;
    if (d > 200 || g > 12) return `a part nested more deeply than the checker looks (${show(t)})`;
    const w = step(t, d, g);
    done.add(t);
    return w;
  }
  return deep(t0, 0, 0);
};
// a local of an enclosing function whose type holds a Mut (owMutDeep): not a cell input, a global, a prelude name or a
// function declaration, which R-K, R-Y and R-A do not follow
export const owLocalHoldsMut = (owMutDeep) => (O: OwCtx, b: IxBinding): boolean =>
  !b.cellParam && b.kind !== "global" && b.kind !== "prelude" && b.kind !== "fn" && owMutDeep(O.R, b.t) !== null;
export const owMut = (owMutIn) => (R: IxRegCore, t: Ty): string | null => {
  const none: Mut<Map<string, number>> = new Map();
  return owMutIn(R, t, 0, none);
};
// S4.4 (k1, 2026-11-23): what a cell exposes, with every Mut<X> that owMutDeep finds read as X, at any depth (inside a
// function's result too, not in a parameter). An alias met again inside itself, or a part deeper than owMutDeep looks,
// that holds a Mut is unknown
export const owStripMut = (owMutDeep, typeKey, union, UNKNOWN) => (R: IxRegCore, t0: Ty): Ty => {
  const open: Mut<Set<string>> = new Set(), done: Mut<Map<string, Ty>> = new Map();
  function named(t: Named, d: number, g: number): Ty {
    if (t.n === "Mut") return strip(t.args[0] ?? UNKNOWN, d + 1, g);
    if (!R.isAlias(t.n)) return { k: "named", n: t.n, args: t.args.map((x) => strip(x, d + 1, g)) };
    const key = typeKey(t), hit = done.get(key);
    if (hit !== undefined || open.has(key)) return hit ?? UNKNOWN;
    open.add(key);
    const r = strip(R.expand(t), d + 1, t.args.length ? g + 1 : g);
    open.delete(key); done.set(key, r);
    return r;
  }
  function strip(t: Ty, d: number, g: number): Ty {
    if (owMutDeep(R, t) === null) return t;
    if (d > 200 || g > 12) return UNKNOWN;
    const s = (x: Ty): Ty => strip(x, d + 1, g);
    if (t.k === "arr") return { k: "arr", el: s(t.el) };
    if (t.k === "tup") return { k: "tup", els: t.els.map((x) => s(x)) };
    if (t.k === "union") return union(t.ts.map((x) => s(x)));
    if (t.k === "fn") return { ...t, ret: s(t.ret) };
    if (t.k === "named") return named(t, d, g);
    if (t.k !== "rec") return t;
    return { ...t, props: new Map([...t.props].map(([k, p]): [string, Prop] => [k, { ...p, t: s(p.t) }])), index: t.index ? s(t.index) : t.index, calls: t.calls?.map((c): Fn => ({ ...c, ret: s(c.ret) })), ctors: t.ctors?.map((c): Fn => ({ ...c, ret: s(c.ret) })) };
  }
  return strip(t0, 0, 0);
};
// r is written: an assignment's or update's target, or a destructuring target
export const owAssignedRef = () => (O: OwCtx, r: AstNode): boolean => {
  const p = O.T.parent.get(r.nid);
  if (p === undefined) return false;
  if (p.type === "AssignmentExpression") return p.left.nid === r.nid;
  if (p.type === "UpdateExpression") return p.argument.nid === r.nid;
  if (p.type === "ArrayPattern") return true;
  if (p.type === "Property") return O.T.parent.get(p.nid)?.type === "ObjectPattern";
  return p.type === "AssignmentPattern" && p.left.nid === r.nid;
};
// r writes the value its binding holds: the object of a member write, an update or a delete, the receiver of a
// mutating method (through a chain of members), or an argument to a parameter typed Mut<…>
export const owWriteRef = (owArgIndex, owMutParamArg) => (O: OwCtx, r: AstNode): boolean => {
  let cur = r;
  for (let p = O.T.parent.get(cur.nid); p !== undefined; p = O.T.parent.get(cur.nid)) {
    if (p.type === "CallExpression") return p.callee.nid !== cur.nid && owMutParamArg(O, p, owArgIndex(p.arguments, cur));
    if (p.type !== "MemberExpression" || p.object.nid !== cur.nid) return false;
    const up = O.T.parent.get(p.nid);
    if (up !== undefined && up.type === "CallExpression" && up.callee.nid === p.nid) return !!O.F.memberFlags.get(p.nid)?.mutates;
    if (up !== undefined && ((up.type === "AssignmentExpression" && up.left.nid === p.nid) || up.type === "UpdateExpression" || (up.type === "UnaryExpression" && up.operator === "delete"))) return true;
    cur = p;
  }
  return false;
};
// e1 (2026-11-23): a copy keeps a type parameter, so for a type that holds one the fix is not a copy
export const owIterMsg = (hasTv) => (b: IxBinding, it: string): string => it === "FetchResponse"
  ? `${b.name} holds a FetchResponse, captured by a nested function: a response's body can be read once, so the function may find it used up; read what the function needs before it (const ok = ${b.name}.ok, or const data = await ${b.name}.json()) and capture that`
  : hasTv(b.t)
  ? `${b.name} may hold an iterator (${it}: a type parameter may be one), which reading uses up, so a function that captures it may give a different result for the same call; a copy has the same type, so read ${b.name} without a nested function that captures it (a for loop in place of a callback), or give it a type with no type parameter`
  : `${b.name} may hold an iterator (${it}), which reading uses up, so a function that captures it may give a different result for the same call; copy it into an array where it is made, under a read-only type, and capture that (const c: readonly T[] = [...${b.name}], T its element type)`;
// e1 (2026-11-23): a typed array or URL cannot be frozen, and a copy of one is one too: what a kept function may capture
// is the data copied out (S4.10)
export const owUnfreezableFix = () => (n: string, name: string): string => n === "URL"
  ? `its text (const c = ${name}.href)`
  : `its elements as a read-only array (const c: readonly number[] = [...${name}])`;
export const owAdd = () => (xs: number[], id: number): number[] => (xs.includes(id) ? xs : [...xs, id]);
// one reference, for each function from the innermost out to the first that declares the binding
export const owCaptureRef = (owEncl, owInside, owIsMut, owIsBor, owIter, owIterMsg, owErr, owAssignedRef, owWriteRef, owIsCallee, owAdd) => (O: OwCtx, W: OwW, caps: OwCaps, b: IxBinding, r: AstNode): void => {
  for (let f = owEncl(O, r); f.nid !== O.T.fn.nid; f = owEncl(O, f)) {
    if (owInside(O, b, f)) break;
    const c = caps.get(f.nid) ?? { mut: [], wmut: [], let: [], read: [], calls: [] };
    const it = b.kind !== "global" && b.kind !== "prelude" ? owIter(O.R, b.t) : null;
    if (it) owErr(W, r, "iterator-capture", owIterMsg(b, it));
    const lets = owAssignedRef(O, r) && (b.kind === "let" || b.kind === "param");
    caps.set(f.nid, {
      mut: owIsMut(b) || owIsBor(b) ? owAdd(c.mut, b.id) : c.mut,
      wmut: owIsMut(b) && owWriteRef(O, r) ? owAdd(c.wmut, b.id) : c.wmut,
      let: lets ? owAdd(c.let, b.id) : c.let,
      read: b.kind !== "global" && b.kind !== "prelude" ? owAdd(c.read, b.id) : c.read,
      calls: b.fnNode >= 0 && owIsCallee(O, r) ? owAdd(c.calls, b.id) : c.calls,
    });
  }
};
// a helper's captures are its caller's, except what the caller declares; one pass over the functions
export const owCapPass = (owInside) => (O: OwCtx, caps: OwCaps): boolean => {
  let changed = false;
  for (const f of O.T.fns) for (const h of caps.get(f.nid)?.calls ?? []) {
    const hb = O.F.bindings.get(h), hc = hb === undefined ? undefined : caps.get(hb.fnNode);
    if (hb === undefined || hb.fnNode < 0 || hc === undefined) continue;
    const fc = caps.get(f.nid) ?? { mut: [], wmut: [], let: [], read: [], calls: [] };
    const take = (from: number[], into: number[]): number[] => [...into, ...from.filter((id) => {
      const b = O.F.bindings.get(id);
      return b !== undefined && !owInside(O, b, f) && !into.includes(id);
    })];
    const mutT = take(hc.mut, fc.mut), wT = take(hc.wmut, fc.wmut), letT = take(hc.let, fc.let), rT = take(hc.read, fc.read);
    if (mutT.length !== fc.mut.length || wT.length !== fc.wmut.length || letT.length !== fc.let.length || rT.length !== fc.read.length) { changed = true; caps.set(f.nid, { mut: mutT, wmut: wT, let: letT, read: rT, calls: fc.calls }); }
  }
  return changed;
};
export const owCaptures = (owCaptureRef, owCapPass) => (O: OwCtx, W: OwW): Map<number, OwCap> => {
  const caps: OwCaps = new Map();
  for (const f of O.T.fns) caps.set(f.nid, { mut: [], wmut: [], let: [], read: [], calls: [] });
  for (const [id, rs] of O.T.refs) {
    const b = O.F.bindings.get(id);
    if (b !== undefined) for (const r of rs) owCaptureRef(O, W, caps, b, r);
  }
  for (let changed = true; changed; ) changed = owCapPass(O, caps);
  return caps;
};
// a function the cell keeps (returned, stored, passed on; not a local helper that is only called, nor a callback an
// intrinsic runs before it returns) may read a captured Mut, which is then frozen where the function is made (the
// compiler emits the freeze): it may not write it, nor may the body write it after the function; a typed array cannot
// be frozen, so it may not be captured. It may not assign a captured let either.
export const owKept = (owHelper, owNonRetainingArg, owArgIndex) => (O: OwCtx, byFn: Map<number, number>, f: AstNode): boolean => {
  const p = O.T.parent.get(f.nid);
  if (p !== undefined && p.type === "CallExpression" && p.callee.nid !== f.nid && owNonRetainingArg(O, p, owArgIndex(p.arguments, f))) return false;
  return owHelper(O, byFn, f) === undefined;
};
// B6: what Object.freeze does not stop writing (internal slots behind setters): typed arrays, buffers, URL
export const OW_UNFREEZABLE = () => new Set(["Float32Array", "Float64Array", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "ArrayBuffer", "DataView", "URL", "URLSearchParams"]);
// a write r to a binding a kept function f captures may run after f is made: it is not before f in the text, or it is
// inside a function, or inside a loop that also holds f (no run-time freeze at f is emitted yet: holes5)
export const owLateWrite = (isFnNode) => (O: OwCtx, r: AstNode, f: AstNode): boolean => {
  if (r.start > f.end) return true;
  for (let p = O.T.parent.get(r.nid); p !== undefined && p.nid !== O.T.fn.nid; p = O.T.parent.get(p.nid)) {
    if (isFnNode(p)) return true;
    const loop = p.type === "ForStatement" || p.type === "ForOfStatement" || p.type === "ForInStatement" || p.type === "WhileStatement" || p.type === "DoWhileStatement";
    if (loop && p.start <= f.start && f.end <= p.end) return true;
  }
  return false;
};
// where t holds a typed array (which cannot be frozen): through what owTyKids looks into, Mut, type arguments, aliases
// whether a value of type t holds a promise (not through a function type): a function the cell keeps cannot capture one,
// as the promise settles after the function is published (freeze.ts throws at publish; holes8, 2026-11-22)
export const owPromiseIn = (owTyKids) => {
  function promiseIn(R: IxRegCore, t: Ty, depth: number): boolean {
    if (depth > 12) return false;
    if (t.k === "named" && t.n === "Promise") return true;
    const ks = t.k === "named" ? (R.isAlias(t.n) ? [R.expand(t)] : t.args) : owTyKids(t);
    return ks.some((x) => promiseIn(R, x, depth + 1));
  }
  return (R: IxRegCore, t: Ty): boolean => promiseIn(R, t, 0);
};
export const owTypedIn = (owTyKids, OW_UNFREEZABLE) => {
  function typedIn(R: IxRegCore, t: Ty, depth: number): string | null {
    if (depth > 12) return null;
    const U: Set<string> = OW_UNFREEZABLE;
    if (t.k === "named" && U.has(t.n)) return t.n;
    const ks = t.k === "named" ? (R.isAlias(t.n) ? [R.expand(t)] : t.args) : owTyKids(t);
    for (const x of ks) { const w = typedIn(R, x, depth + 1); if (w !== null) return w; }
    return null;
  }
  return (R: IxRegCore, t: Ty): string | null => typedIn(R, t, 0);
};
// a binding no one else can write: a cell input, or a const typed read-only whose initializer is a fresh copy
export const owTypedSafeB = (owFresh, isNamed) => (O: OwCtx, b: IxBinding): boolean => {
  if (b.cellParam) return true;
  const d = O.T.parent.get(b.nid);
  return b.kind === "const" && !isNamed(b.t, "Mut") && d !== undefined && d.type === "VariableDeclarator" && d.init !== null && owFresh(O, d.init);
};
// an expression that holds no typed array a name in this cell can still write: a fresh copy, a safe binding, a
// literal of such, or a type with no typed array in it
export const owTypedSafe = (owTypedSafeB, owTypedIn, owFresh) => {
  function safe(O: OwCtx, e: AstNode): boolean {
    if (owFresh(O, e) && e.type !== "ArrayExpression" && e.type !== "ObjectExpression") return true;
    if (e.type === "ArrayExpression") return e.elements.every((x) => x === null || safe(O, x.type === "SpreadElement" ? x.argument : x));
    if (e.type === "ObjectExpression") return e.properties.every((p) => (p.type === "SpreadElement" ? safe(O, p.argument) : p.type !== "Property" || safe(O, p.value)));
    const t = O.F.types.get(e.nid);
    if (t === undefined || owTypedIn(O.R, t) === null) return true;
    const id = e.type === "Identifier" ? O.F.bindingOf.get(e.nid) : undefined, b = id === undefined ? undefined : O.F.bindings.get(id);
    return b !== undefined && owTypedSafeB(O, b);
  }
  return safe;
};
// a let (or parameter) a kept function reads, assigned where it may run after the function is made
export const owLateLet = (owAssignedRef, owLateWrite, owErr) => (O: OwCtx, W: OwW, f: AstNode, b: IxBinding): void => {
  if (b.kind !== "let" && b.kind !== "param") return;
  for (const r of O.T.refs.get(b.id) ?? [])
    if ((r.start < f.start || r.start > f.end) && owAssignedRef(O, r) && owLateWrite(O, r, f)) owErr(W, r, "let-capture", `${b.kind} ${b.name} is assigned where it may run after a function the cell keeps read it: that function sees its captures unchanged`);
};
// a write site: n writes the value of expression x (a member assignment, update or delete; a mutating method's receiver)
export const owWriteSite = () => (O: OwCtx, n: AstNode): AstNode | null => {
  const p = O.T.parent.get(n.nid);
  if (n.type !== "MemberExpression" || p === undefined) return null;
  if (p.type === "CallExpression" && p.callee.nid === n.nid) return O.F.memberFlags.get(n.nid)?.mutates ? n.object : null;
  const w = (p.type === "AssignmentExpression" && p.left.nid === n.nid) || p.type === "UpdateExpression" || (p.type === "UnaryExpression" && p.operator === "delete");
  return w ? n.object : null;
};
// n is inside an async or generator function the cell makes: it may run after the cell has returned
export const owInLateFn = (ixFnParts) => (O: OwCtx, n: AstNode): boolean => {
  for (let p = O.T.parent.get(n.nid); p !== undefined && p.nid !== O.T.fn.nid; p = O.T.parent.get(p.nid)) {
    const fp = ixFnParts(p);
    if (fp !== null && (fp.async || fp.generator)) return true;
  }
  return false;
};
// a kept function f can be seen while the cell still runs (a generator cell between yields, an async or generator
// function it made, after it returned): no Mut (under any name, or from a call) is written there after f is made; f
// may have captured it (no run-time freeze at f is emitted yet: holes5)
export const owGenLateWrites = (owWriteSite, owLateWrite, owInLateFn, owErr, ixFnParts, isNamed) => (O: OwCtx, W: OwW, f: AstNode, b: IxBinding): void => {
  const cf = ixFnParts(O.T.fn), gen = cf !== null && cf.generator;
  for (const n of O.T.all) {
    const x = owWriteSite(O, n), t = x === null ? undefined : O.F.types.get(x.nid);
    if (x !== null && t !== undefined && isNamed(t, "Mut") && (n.start < f.start || n.start > f.end) && (gen ? owLateWrite(O, n, f) : owInLateFn(O, n)))
      owErr(W, n, "mut-capture", `a Mut is written where it may run after ${b.name}'s reader, a function the cell keeps, is yielded: it may be what that function captured`);
  }
};
// r is (part of) what f returns or yields: through parentheses, conditional branches, logical operands, a sequence's
// last, a cast, an array or object literal and a spread, up to f's return, its expression body, or a yield in f
export const owFlowsOut = (owEncl) => (O: OwCtx, r: AstNode, f: AstNode): boolean => {
  let cur = r;
  for (let p = O.T.parent.get(cur.nid); p !== undefined; p = O.T.parent.get(cur.nid)) {
    if (p.nid === f.nid) return f.type === "ArrowFunctionExpression" && f.body.nid === cur.nid;
    if (p.type === "ReturnStatement" || p.type === "YieldExpression") return owEncl(O, p).nid === f.nid;
    const through = p.type === "ParenthesizedExpression" || p.type === "ArrayExpression" || p.type === "SpreadElement" || p.type === "ObjectExpression"
      || (p.type === "Property" && p.value.nid === cur.nid) || (p.type === "ConditionalExpression" && p.test.nid !== cur.nid) || p.type === "LogicalExpression"
      || (p.type === "SequenceExpression" && p.expressions.at(-1)?.nid === cur.nid) || p.type === "TSAsExpression" || p.type === "TSNonNullExpression" || p.type === "TSSatisfiesExpression";
    if (!through) return false;
    cur = p;
  }
  return false;
};
// R-K (2026-11-22): a function the cell keeps can run after the cell has given its value, so it captures no Mut and no
// let of an enclosing function, reads included; what to bind instead
export const owKeptReadMsg = (owStripMut, show, isNamed, owMutDeep) => (O: OwCtx, b: IxBinding): string => b.kind !== "let" && !isNamed(b.t, "Mut")
  ? `${b.name}, whose type holds ${owMutDeep(O.R, b.t)}, captured by a function the cell keeps, which can run after the cell has given its value; bind it under a type with no Mut before the function (const c: ${show(owStripMut(O.R, b.t))} = ${b.name}) and capture that, or make it inside the function`
  : isNamed(b.t, "Mut")
  ? `Mut ${b.name} captured by a function the cell keeps, which can run after the cell has given its value; bind it under its plain type before the function (const c: ${show(owStripMut(O.R, b.t))} = ${b.name}) and capture that, or make it inside the function`
  : `let ${b.name} captured by a function the cell keeps, which can run after the cell has given its value; bind its value to a const before the function (const c = ${b.name}) and capture that`;
export const owCaptureErrs = (owKept, owIsBor, owWriteRef, owLateWrite, owLateLet, owGenLateWrites, owFlowsOut, owTypedIn, owTypedSafeB, owPromiseIn, owKeptReadMsg, owLocalHoldsMut, owUnfreezableFix, owStripMut, ixCopyText, owErr, show, unwrap, OW_UNFREEZABLE, owIter) => (O: OwCtx, W: OwW, caps: Map<number, OwCap>, byFn: Map<number, number>): void => {
  const holds: Mut<Map<number, boolean>> = new Map();
  for (const f of O.T.fns) {
    const c = caps.get(f.nid);
    if (f.nid === O.T.fn.nid || c === undefined || !owKept(O, byFn, f)) continue;
    for (const b of c.mut.flatMap((id) => O.F.bindings.get(id) ?? []).filter((x) => owIter(O.R, x.t) !== "FetchResponse")) {
      const u = O.R.expand(unwrap(b.t)), U: Set<string> = OW_UNFREEZABLE;
      if (owIsBor(b)) owErr(W, f, "borrowed-escape", `Borrowed ${b.name} captured by a nested function`);
      else if (c.wmut.includes(b.id)) owErr(W, f, "mut-capture", `Mut ${b.name} written by a function the cell keeps (not a local helper that is only called): it is frozen where the function is made, so the write would throw; make ${b.name} inside the function, or keep it in a state cell that an action writes`);
      else if (u.k === "named" && U.has(u.n)) owErr(W, f, "mut-capture", `Mut ${b.name} (${u.n}) captured by a function the cell keeps: a typed array or URL cannot be frozen, nor can a copy of one; capture ${owUnfreezableFix(u.n, b.name)}`);
      else if ((O.T.refs.get(b.id) ?? []).some((r) => r.start > f.start && r.end <= f.end && owFlowsOut(O, r, f))) owErr(W, f, "mut-capture", `Mut ${b.name} returned or yielded by a function the cell keeps: whoever calls it could write ${b.name}; bind it under its plain type before the function (const c: ${show(owStripMut(O.R, b.t))} = ${b.name}) and return a copy of that (${ixCopyText(O.R, owStripMut(O.R, b.t), "c")})`);
      else { owGenLateWrites(O, W, f, b); for (const r of O.T.refs.get(b.id) ?? []) if ((r.start < f.start || r.start > f.end) && owWriteRef(O, r) && owLateWrite(O, r, f)) owErr(W, r, "mut-capture", `${b.name} may be written after a function the cell keeps captured it (later in the text, in a loop that makes the function, or in a function): a function the cell keeps sees its captures unchanged`); owErr(W, f, "mut-capture", owTypedIn(O.R, b.t) !== null ? `Mut ${b.name} holds a ${owTypedIn(O.R, b.t)}, captured by a function the cell keeps: a typed array or URL cannot be frozen, nor can a copy of one; copy the data out of it before the function and capture that (for the ${owTypedIn(O.R, b.t)} x, ${owUnfreezableFix(owTypedIn(O.R, b.t) ?? "", "x")})` : owKeptReadMsg(O, b)); }
    }
    for (const b of c.let.flatMap((id) => O.F.bindings.get(id) ?? [])) owErr(W, f, "let-capture", `${b.kind} ${b.name} assigned from a function that escapes`);
    for (const b of c.read.flatMap((id) => O.F.bindings.get(id) ?? []).filter((x) => owIter(O.R, x.t) !== "FetchResponse")) {
      owLateLet(O, W, f, b);
      if (b.kind === "let") owErr(W, f, "let-capture", owKeptReadMsg(O, b));
      else if (!c.mut.includes(b.id) && (holds.get(b.id) ?? holds.set(b.id, owLocalHoldsMut(O, b)).get(b.id))) owErr(W, f, "mut-capture", owKeptReadMsg(O, b));
      const ta = c.mut.includes(b.id) ? null : owTypedIn(O.R, b.t);
      if (owPromiseIn(O.R, b.t)) owErr(W, f, "mut-capture", `${b.name} holds a promise, captured by a function the cell keeps: it settles after the function is published, so it cannot be frozen with it; make the promise inside the function, or publish the promise itself`);
      if (ta !== null && !owTypedSafeB(O, b)) owErr(W, f, "mut-capture", `${b.name} holds a ${ta} that a name in this cell can still write, captured by a function the cell keeps: a typed array or URL cannot be frozen, nor can a copy of one; copy the data out of the ${ta} before the function and capture that (for the ${ta} x, ${owUnfreezableFix(ta, "x")})`);
    }
  }
};
