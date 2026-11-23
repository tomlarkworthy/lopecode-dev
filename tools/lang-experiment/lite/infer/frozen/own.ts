// FROZEN FIXTURE (2026-11-21, switch3): the TypeScript checker as it was before checkSources ran the cells. Read by
// lite/infer/diff.ts, lite/infer/complete-diff.ts, lite/syntax.test.ts and selfhost/checker-shape, checker-survey;
// nothing shipped imports it, and the build does not reach it.
// Changed since: [prelude-value], [prelude-shadow], [mut-source] and a Mut member's position (holes step 1, 2026-11-22),
// as the cells' owPreludeName and owMutSource in owPlacement. mutIn (holes step 2), as owMutIn.
// Changed since: helper asks every name of a function (holes step 3, 2026-11-22), as owHelper. [regexp-state] (holes
// step 4) in the placement loop, as owRegexpPlace. A literal key naming an Object.prototype member on an index record
// (holes step 6), as owProtoRead. includes, indexOf, lastIndexOf on objects (holes step 7), as owIdentityOp.
// Changed since: owned groups (holes2 step C, 2026-11-22): a member that is or may be a Mut by its declared type, a
// group spread or given to a function, lent twice, an owned field written, mut(...) as an owned field, as the cells
// of ow-group.ss.ts, owMutSource and owMutPlace.
// Ownership rules over one checked cell, using the facts infer.ts recorded:
//  - mut(e): e fresh, bound to a local const; Mut/Borrowed/view expressions only in whitelisted positions
//  - captures: a nested function may use a Mut (or assign a let) only if it is a non-escaping local helper,
//    transitively through the helpers it calls; a Borrowed is never captured
//  - flow: no use of a Mut after freeze, no use of a Borrowed after await/yield (loops to a fixpoint;
//    a call of a helper is a use of every Mut it captures)
//  - state(...) and borrow(...) placement
import { kids, isFn, type Node } from "./ts/parse.ts";
import type { Checker, Binding } from "./infer.ts";
import { isNamed, unwrap, show, ERR, isPrimitive, union, typeKey, UNKNOWN, type Ty } from "../../types.ts";
import type { Registry } from "./ts/registry.ts";
import { PRELUDE_FNS } from "../../intrinsics.ts";

type Rule = { node: Node; rule: string; msg: string };
export { kids };

// What in t may be a one-shot iterator: Iterable (values(), keys() and entries() give one, and an array typed Iterable
// may be one), Generator, or a type parameter. A function type holds none: a call makes its result anew.
const PROTO_NAMES = new Set(["__proto__", "constructor", "toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"]);
// none: per alias without type arguments, the least depth its walk found nothing from; from as deep it finds nothing again
export function iterIn(t: Ty, reg: Registry, depth = 0, none = new Map<string, number>()): string | null {
  if (depth > 12) return null;
  const inner = (ts: Ty[]) => { for (const x of ts) { const w = iterIn(x, reg, depth + 1, none); if (w) return w; } return null; };
  switch (t.k) {
    case "tv": return `the type parameter ${show(t)}`;
    case "arr": return inner([t.el]);
    case "tup": return inner(t.els);
    case "union": return inner(t.ts);
    case "rec": return inner([...[...t.props.values()].map((p) => p.t), ...(t.index ? [t.index] : [])]);
    case "named": {
      if (t.n === "Iterable" || t.n === "Generator") return show(t);
      if (t.n === "Action" || t.n === "State" || t.n === "Events") return null;
      if (!reg.isAlias(t.n)) return inner(t.args ?? []);
      const plain = !t.args?.length, at = none.get(t.n);
      if (plain && at !== undefined && at <= depth) return null;
      const w = iterIn(reg.expand(t), reg, depth + 1, none);
      if (!w && plain) none.set(t.n, depth);
      return w;
    }
    default: return null;
  }
}

// DELIBERATE CHANGE (2026-11-22, S4 language change): what a cell exposes is never Mut (the cells' owStripMut)
// DELIBERATE CHANGE (2026-11-23, k1): every Mut that mutDeep finds, inside a function's result too; an alias met again
// inside itself, or a part deeper than mutDeep looks, that holds one is unknown
export function stripMut(t0: Ty, reg: Registry): Ty {
  const open = new Set<string>(), done = new Map<string, Ty>();
  const named = (t: Ty & { k: "named" }, d: number, g: number): Ty => {
    if (t.n === "Mut") return go(t.args[0] ?? UNKNOWN, d + 1, g);
    if (!reg.isAlias(t.n)) return { k: "named", n: t.n, args: (t.args ?? []).map((x) => go(x, d + 1, g)) };
    const key = typeKey(t), hit = done.get(key);
    if (hit !== undefined || open.has(key)) return hit ?? UNKNOWN;
    open.add(key);
    const r = go(reg.expand(t), d + 1, t.args?.length ? g + 1 : g);
    open.delete(key); done.set(key, r);
    return r;
  };
  const go = (t: Ty, d: number, g: number): Ty => {
    if (mutDeep(t, reg) === null) return t;
    if (d > 200 || g > 12) return UNKNOWN;
    const s = (x: Ty) => go(x, d + 1, g);
    switch (t.k) {
      case "arr": return { k: "arr", el: s(t.el) };
      case "tup": return { k: "tup", els: t.els.map(s) };
      case "union": return union(t.ts.map(s));
      case "fn": return { ...t, ret: s(t.ret) };
      case "rec": return { ...t, props: new Map([...t.props].map(([k, p]) => [k, { ...p, t: s(p.t) }])), index: t.index ? s(t.index) : t.index, calls: t.calls?.map((c) => ({ ...c, ret: s(c.ret) })), ctors: t.ctors?.map((c) => ({ ...c, ret: s(c.ret) })) };
      case "named": return named(t, d, g);
      default: return t;
    }
  };
  return go(t0, 0, 0);
}
// holes step 2 (2026-11-22): where a type holds Mut<…>, not inside a function type (as the cells' owMutIn)
export function mutIn(t: Ty, reg: Registry, depth = 0, none = new Map<string, number>()): string | null {
  if (depth > 12) return null;
  const inner = (ts: Ty[]) => { for (const x of ts) { const w = mutIn(x, reg, depth + 1, none); if (w) return w; } return null; };
  switch (t.k) {
    case "arr": return inner([t.el]);
    case "tup": return inner(t.els);
    case "union": return inner(t.ts);
    case "rec": return inner([...[...t.props.values()].map((p) => p.t), ...(t.index ? [t.index] : [])]);
    case "named": {
      if (t.n === "Mut") return show(t);
      if (!reg.isAlias(t.n)) return inner(t.args ?? []);
      const plain = !t.args?.length, at = none.get(t.n);
      if (plain && at !== undefined && at <= depth) return null;
      const w = mutIn(reg.expand(t), reg, depth + 1, none);
      if (!w && plain) none.set(t.n, depth);
      return w;
    }
    default: return null;
  }
}

// DELIBERATE CHANGE (2026-11-22, R r2): where a type holds Mut<…> anywhere, also in a function type's result (the cells' owMutDeep)
// DELIBERATE CHANGE (2026-11-23, k1): also a record's call and construct signatures' results; a part already walked, or an
// alias met again with the same arguments, adds nothing; more than 12 generic alias expansions on a path, or more than
// 200 levels, count as holding one
export function mutDeep(t0: Ty, reg: Registry): string | null {
  const seen = new Set<string>(), done = new Set<Ty>();
  const step = (t: Ty, d: number, g: number): string | null => {
    const inner = (ts: Ty[]) => { for (const x of ts) { const w = deep(x, d + 1, g); if (w) return w; } return null; };
    switch (t.k) {
      case "fn": return inner([t.ret]);
      case "arr": return inner([t.el]);
      case "tup": return inner(t.els);
      case "union": return inner(t.ts);
      case "rec": return inner([...[...t.props.values()].map((p) => p.t), ...(t.index ? [t.index] : []), ...[...(t.calls ?? []), ...(t.ctors ?? [])].map((c) => c.ret)]);
      case "named": {
        if (t.n === "Mut") return show(t);
        if (!reg.isAlias(t.n)) return inner(t.args ?? []);
        const key = typeKey(t);
        if (seen.has(key)) return null;
        seen.add(key);
        return deep(reg.expand(t), d + 1, t.args?.length ? g + 1 : g);
      }
      default: return null;
    }
  };
  const deep = (t: Ty, d: number, g: number): string | null => {
    if (done.has(t)) return null;
    if (d > 200 || g > 12) return `a part nested more deeply than the checker looks (${show(t)})`;
    const w = step(t, d, g);
    done.add(t);
    return w;
  };
  return deep(t0, 0, 0);
}

export function ownership(cellFn: Node, ch: Checker): Rule[] {
  const F = ch.facts;
  const errs: Rule[] = [];
  const seenErr = new Set<string>();
  const err = (node: Node, rule: string, msg: string) => {
    const k = `${node.start}:${rule}`;
    if (!seenErr.has(k)) { seenErr.add(k); errs.push({ node, rule, msg }); }
  };
  const parent = new Map<Node, Node>();
  const fns: Node[] = [];
  const refs = new Map<Binding, Node[]>();
  const all: Node[] = [];
  (function walk(n: Node, p: Node | null) {
    if (p) parent.set(n, p);
    all.push(n);
    if (isFn(n)) fns.push(n);
    if (n.type === "Identifier") {
      const b = F.bindingOf.get(n);
      if (b && b.node !== n) { const l = refs.get(b) ?? []; l.push(n); refs.set(b, l); }
    }
    for (const c of kids(n)) walk(c, n);
  })(cellFn, null);

  const typeOf = (n: Node): Ty | undefined => F.types.get(n);
  const encl = (n: Node): Node => { let p = parent.get(n); while (p && !isFn(p)) p = parent.get(p); return p ?? cellFn; };
  const inside = (b: Binding, f: Node) => b.node && b.node.start >= f.start && b.node.end <= f.end;
  const isMutB = (b: Binding) => isNamed(b.t, "Mut");
  const isBorB = (b: Binding) => isNamed(b.t, "Borrowed");
  const bindingOfFn = new Map<Node, Binding>();
  for (const b of new Set([...F.bindingOf.values()])) if (b.fnNode) bindingOfFn.set(b.fnNode, b);
  const isCallee = (r: Node) => { const p = parent.get(r); return !!p && p.type === "CallExpression" && p.callee === r; };
  // holes step 3 (2026-11-22): every name of f only called; a function expression also bound to a const (as owHelper)
  const helper = (f: Node): Binding | undefined => {
    const b = bindingOfFn.get(f);
    if (!b || (b.kind !== "const" && b.kind !== "fn")) return undefined;
    let bound = f.type !== "FunctionExpression";
    for (const x of new Set(F.bindingOf.values())) {
      if (x.fnNode !== f) continue;
      if (x.kind === "const") bound = true;
      if (!(refs.get(x) ?? []).every(isCallee)) return undefined;
    }
    return bound ? b : undefined;
  };
  const prelude = (c: Node): string | undefined => (c.type === "CallExpression" ? F.calls.get(c)?.prelude : undefined);

  // the declared (uninstantiated) type of argument i of a resolved call
  const declParam = (call: Node, i: number, rest: boolean): Ty | undefined => {
    const sig = F.calls.get(call)?.sig;
    const d = sig && (sig.decl ?? sig);
    return d && (i < d.ps.length ? d.ps[i].t : rest ? d.rest : undefined);
  };
  const nonRetainingArg = (call: Node, i: number): boolean => {
    const flags = F.calls.get(call)?.sig?.flags;
    const dp = declParam(call, i, true);
    return !!flags?.intrinsic && !flags.retains && !!dp && dp.k !== "tv";
  };
  const mutParamArg = (call: Node, i: number): boolean => { const dp = declParam(call, i, false); return !!dp && isNamed(dp, "Mut"); };
  // DELIBERATE CHANGE (2026-11-22, S4): r writes the value its binding holds (the cells' owWriteRef)
  const writeRef = (r: Node): boolean => {
    let cur = r;
    for (let p = parent.get(cur); p; p = parent.get(cur)) {
      if (p.type === "CallExpression") return p.callee !== cur && mutParamArg(p, p.arguments.indexOf(cur));
      if (p.type !== "MemberExpression" || p.object !== cur) return false;
      const up = parent.get(p);
      if (up && up.type === "CallExpression" && up.callee === p) return !!F.memberFlags.get(p)?.mutates;
      if (up && ((up.type === "AssignmentExpression" && up.left === p) || up.type === "UpdateExpression" || (up.type === "UnaryExpression" && up.operator === "delete"))) return true;
      cur = p;
    }
    return false;
  };
  // ---- captures, to a fixpoint through helper calls ----
  const capMut = new Map<Node, Set<Binding>>();
  const capW = new Map<Node, Set<Binding>>();
  const capLet = new Map<Node, Set<Binding>>();
  const capRead = new Map<Node, Set<Binding>>();
  const calls = new Map<Node, Set<Binding>>();
  for (const f of fns) { capMut.set(f, new Set()); capW.set(f, new Set()); capLet.set(f, new Set()); capRead.set(f, new Set()); calls.set(f, new Set()); }
  for (const [b, rs] of refs) {
    for (const r of rs) {
      for (let f: Node | undefined = encl(r); f && f !== cellFn && fns.includes(f); f = parent.get(f) ? encl(f) : undefined) {
        if (inside(b, f)) break;
        if (isMutB(b) || isBorB(b)) capMut.get(f)!.add(b);
        if (isMutB(b) && writeRef(r)) capW.get(f)!.add(b);
        if (b.kind !== "global" && b.kind !== "prelude") capRead.get(f)!.add(b);
        const it = b.kind !== "global" && b.kind !== "prelude" && iterIn(b.t, ch.reg);
        if (it) err(r, "iterator-capture", `${b.name} may hold an iterator (${it}), which reading uses up, so a function that captures it may give a different result for the same call; copy it into an array where it is made ([...${b.name}]) and capture the array`);
        const p = parent.get(r)!;
        const assigned = (p.type === "AssignmentExpression" && p.left === r) || (p.type === "UpdateExpression" && p.argument === r)
          || (p.type === "ArrayPattern" || p.type === "Property" && parent.get(p)?.type === "ObjectPattern" || p.type === "AssignmentPattern" && p.left === r);
        if (assigned && (b.kind === "let" || b.kind === "param")) capLet.get(f)!.add(b);
        if (b.fnNode && isCallee(r)) calls.get(f)!.add(b);
      }
    }
  }
  for (let changed = true; changed; ) {
    changed = false;
    for (const f of fns) for (const h of calls.get(f)!) {
      if (!h.fnNode || !capMut.has(h.fnNode)) continue;
      for (const cap of [capMut, capW, capLet, capRead])
        for (const b of cap.get(h.fnNode)!) if (!inside(b, f) && !cap.get(f)!.has(b)) { cap.get(f)!.add(b); changed = true; }
    }
  }
  // DELIBERATE CHANGE (2026-11-22, S4): a function the cell keeps may read a captured Mut (frozen where the function is made), not
  // write it; the body may not write it after the function; a typed array cannot be frozen (the cells' owCaptureErrs)
  const UNFREEZABLE = new Set(["Float32Array", "Float64Array", "Int8Array", "Uint8Array", "Uint8ClampedArray", "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "ArrayBuffer", "DataView", "URL", "URLSearchParams"]);
  const lateWrite = (r: Node, f: Node): boolean => {
    if (r.start > f.end) return true;
    for (let p = parent.get(r); p && p !== cellFn; p = parent.get(p)) {
      if (isFn(p)) return true;
      if (/^(ForStatement|ForOfStatement|ForInStatement|WhileStatement|DoWhileStatement)$/.test(p.type) && p.start <= f.start && f.end <= p.end) return true;
    }
    return false;
  };
  const assignedRef = (r: Node): boolean => { const p = parent.get(r)!; return (p.type === "AssignmentExpression" && p.left === r) || (p.type === "UpdateExpression" && p.argument === r)
    || (p.type === "ArrayPattern" || p.type === "Property" && parent.get(p)?.type === "ObjectPattern" || p.type === "AssignmentPattern" && p.left === r); };
  const typedIn = (t: Ty, depth = 0): string | null => {
    if (depth > 12) return null;
    if (t.k === "named" && UNFREEZABLE.has(t.n)) return t.n;
    const ks: Ty[] = t.k === "named" ? (ch.reg.isAlias(t.n) ? [ch.reg.expand(t)] : t.args ?? []) : t.k === "arr" ? [t.el] : t.k === "tup" ? t.els : t.k === "union" ? t.ts : t.k === "rec" ? [...[...t.props.values()].map((p) => p.t), ...(t.index ? [t.index] : [])] : [];
    for (const x of ks) { const w = typedIn(x, depth + 1); if (w !== null) return w; }
    return null;
  };
  // DELIBERATE CHANGE (2026-11-22, holes8): a function the cell keeps may not capture a promise (the cells' owPromiseIn)
  const promiseIn = (t: Ty, depth = 0): boolean => {
    if (depth > 12) return false;
    if (t.k === "named" && t.n === "Promise") return true;
    const ks: Ty[] = t.k === "named" ? (ch.reg.isAlias(t.n) ? [ch.reg.expand(t)] : t.args ?? []) : t.k === "arr" ? [t.el] : t.k === "tup" ? t.els : t.k === "union" ? t.ts : t.k === "rec" ? [...[...t.props.values()].map((p) => p.t), ...(t.index ? [t.index] : [])] : [];
    return ks.some((x) => promiseIn(x, depth + 1));
  };
  const typedSafeB = (b: Binding): boolean => {
    if (b.cellParam) return true;
    const d = b.node && parent.get(b.node);
    return b.kind === "const" && !isNamed(b.t, "Mut") && !!d && d.type === "VariableDeclarator" && !!d.init && fresh(d.init);
  };
  const typedSafe = (e: Node): boolean => {
    if (fresh(e) && e.type !== "ArrayExpression" && e.type !== "ObjectExpression") return true;
    if (e.type === "ArrayExpression") return e.elements.every((x: Node | null) => x === null || typedSafe(x.type === "SpreadElement" ? x.argument : x));
    if (e.type === "ObjectExpression") return e.properties.every((p: Node) => (p.type === "SpreadElement" ? typedSafe(p.argument) : p.type !== "Property" || typedSafe(p.value)));
    const t = typeOf(e);
    if (!t || typedIn(t) === null) return true;
    const b = e.type === "Identifier" ? F.bindingOf.get(e) : undefined;
    return !!b && typedSafeB(b);
  };
  const writeSite = (n: Node): Node | null => {
    const p = parent.get(n);
    if (n.type !== "MemberExpression" || !p) return null;
    if (p.type === "CallExpression" && p.callee === n) return F.memberFlags.get(n)?.mutates ? n.object : null;
    const w = (p.type === "AssignmentExpression" && p.left === n) || p.type === "UpdateExpression" || (p.type === "UnaryExpression" && p.operator === "delete");
    return w ? n.object : null;
  };
  const inLateFn = (n: Node): boolean => { for (let p = parent.get(n); p && p !== cellFn; p = parent.get(p)) if (isFn(p) && (p.async || p.generator)) return true; return false; };
  const genLateWrites = (f: Node, b: Binding) => {
    for (const n of all) {
      const x = writeSite(n), t = x && typeOf(x);
      if (x && t && isNamed(t, "Mut") && (n.start < f.start || n.start > f.end) && (cellFn.generator ? lateWrite(n, f) : inLateFn(n))) err(n, "mut-capture", `a Mut is written where it may run after ${b.name}'s reader, a function the cell keeps, is yielded: it may be what that function captured`);
    }
  };
  const flowsOut = (r: Node, f: Node): boolean => {
    let cur = r;
    for (let p = parent.get(cur); p; p = parent.get(cur)) {
      if (p === f) return f.type === "ArrowFunctionExpression" && f.body === cur;
      if (p.type === "ReturnStatement" || p.type === "YieldExpression") return encl(p) === f;
      const through = /^(ParenthesizedExpression|ArrayExpression|SpreadElement|ObjectExpression|LogicalExpression|TSAsExpression|TSNonNullExpression|TSSatisfiesExpression)$/.test(p.type)
        || (p.type === "Property" && p.value === cur) || (p.type === "ConditionalExpression" && p.test !== cur) || (p.type === "SequenceExpression" && p.expressions.at(-1) === cur);
      if (!through) return false;
      cur = p;
    }
    return false;
  };
  const kept = (f: Node): boolean => {
    const p = parent.get(f);
    if (p && p.type === "CallExpression" && p.callee !== f && nonRetainingArg(p, p.arguments.indexOf(f))) return false;
    return !helper(f);
  };
  // DELIBERATE CHANGE (2026-11-22, R-K): a function the cell keeps captures no Mut and no let, reads included (the cells' owKeptReadMsg)
  // DELIBERATE CHANGE (2026-11-23, k1): R-K also takes a local whose type holds a Mut that is not its own type (mutDeep)
  const keptReadMsg = (b: Binding): string => b.kind !== "let" && !isMutB(b)
    ? `${b.name}, whose type holds ${mutDeep(b.t, ch.reg)}, captured by a function the cell keeps, which can run after the cell has given its value; bind it under a type with no Mut before the function (const c: ${show(stripMut(b.t, ch.reg))} = ${b.name}) and capture that, or make it inside the function`
    : isMutB(b)
    ? `Mut ${b.name} captured by a function the cell keeps, which can run after the cell has given its value; bind it under its plain type before the function (const c: ${show(stripMut(b.t, ch.reg))} = ${b.name}) and capture that, or make it inside the function`
    : `let ${b.name} captured by a function the cell keeps, which can run after the cell has given its value; bind its value to a const before the function (const c = ${b.name}) and capture that`;
  for (const f of fns) {
    if (f === cellFn || !kept(f)) continue;
    for (const b of capMut.get(f)!) {
      const u = ch.reg.expand(unwrap(b.t));
      if (isBorB(b)) err(f, "borrowed-escape", `Borrowed ${b.name} captured by a nested function`);
      else if (capW.get(f)!.has(b)) err(f, "mut-capture", `Mut ${b.name} written by a function the cell keeps (not a local helper that is only called): it is frozen where the function is made`);
      else if (u.k === "named" && UNFREEZABLE.has(u.n)) err(f, "mut-capture", `Mut ${b.name} (${u.n}) captured by a function the cell keeps: a typed array or URL cannot be frozen; capture a read-only copy (const c: ${u.n} = ${b.name}.slice())`);
      else if ((refs.get(b) ?? []).some((r) => r.start > f.start && r.end <= f.end && flowsOut(r, f))) err(f, "mut-capture", `Mut ${b.name} returned or yielded by a function the cell keeps: whoever calls it could write ${b.name}; return a copy`);
      else { genLateWrites(f, b); for (const r of refs.get(b) ?? []) if ((r.start < f.start || r.start > f.end) && writeRef(r) && lateWrite(r, f)) err(r, "mut-capture", `${b.name} may be written after a function the cell keeps captured it (later in the text, in a loop that makes the function, or in a function): a function the cell keeps sees its captures unchanged`); err(f, "mut-capture", keptReadMsg(b)); }
    }
    for (const b of capLet.get(f)!) err(f, "let-capture", `${b.kind} ${b.name} assigned from a function that escapes`);
    for (const b of capRead.get(f)!) {
      if (b.kind === "let" || b.kind === "param") for (const r of refs.get(b) ?? []) if ((r.start < f.start || r.start > f.end) && assignedRef(r) && lateWrite(r, f)) err(r, "let-capture", `${b.kind} ${b.name} is assigned where it may run after a function the cell keeps read it: that function sees its captures unchanged`);
      if (b.kind === "let") err(f, "let-capture", keptReadMsg(b));
      else if (!capMut.get(f)!.has(b) && !b.cellParam && b.kind !== "global" && b.kind !== "prelude" && b.kind !== "fn" && mutDeep(b.t, ch.reg) !== null) err(f, "mut-capture", keptReadMsg(b));
      const ta = capMut.get(f)!.has(b) ? null : typedIn(b.t);
      if (promiseIn(b.t)) err(f, "mut-capture", `${b.name} holds a promise, captured by a function the cell keeps: it settles after the function is published, so it cannot be frozen with it; make the promise inside the function, or publish the promise itself`);
      if (ta !== null && !typedSafeB(b)) err(f, "mut-capture", `${b.name} holds a ${ta} that a name in this cell can still write, captured by a function the cell keeps: a typed array or URL cannot be frozen; capture a read-only copy (const c: ${ta} = x.slice())`);
    }
  }

  // DELIBERATE CHANGE (2026-11-22, S4): the position rules ([mut-escape], [borrowed-escape], [mut-view]) and owned groups are gone
  for (const n of all) {
    // on is only called: a listener made anywhere else could escape its cell
    // read is only called too: a read taken as a value could be called where no action runs (S6.8)
    if (n.type === "Identifier" && (n.name === "on" || n.name === "read") && (!F.bindingOf.has(n) || F.bindingOf.get(n)!.kind === "prelude")) {
      const p = parent.get(n);
      const name = !p || (p.type === "CallExpression" && p.callee === n) || (p.type === "MemberExpression" && p.property === n && !p.computed)
        || ((p.type === "Property" || p.type === "ObjectProperty") && p.key === n && !p.computed && !p.shorthand) || /^TS/.test(p.type);
      if (!name && n.name === "on") err(n, "listener-placement", "on is only called, as the whole value of a cell; it is not a value");
      else if (!name) err(n, "read-outside-action", "read is only called, in an action body; it is not a value");
    }
    // holes step 1 (2026-11-22): a prelude function only called; no binding named mut, freeze, borrow, snapshot; a Mut only from mut(...)
    const nb = n.type === "Identifier" ? F.bindingOf.get(n) : undefined;
    const np = parent.get(n), shKey = !!np && (np.type === "Property" || np.type === "ObjectProperty") && np.key === n && np.value !== n;
    if (n.type === "Identifier" && (nb ? nb.kind === "prelude" : PRELUDE_FNS.has(n.name) && !shKey) && n.name !== "on" && n.name !== "read") {
      const p = parent.get(n);
      const name = !p || (p.type === "CallExpression" && p.callee === n) || (p.type === "MemberExpression" && p.property === n && !p.computed)
        || ((p.type === "Property" || p.type === "ObjectProperty") && p.key === n && !p.computed && !p.shorthand) || /^TS/.test(p.type);
      if (!name) err(n, "prelude-value", `${n.name} is only called, as ${n.name}(...); as a value its calls would skip the rules of ${n.name}`);
    }
    if (nb && nb.kind !== "prelude" && nb.kind !== "global" && nb.node === n && ["snapshot"].includes(n.name)) err(n, "prelude-shadow", `${n.name} names a prelude function; a binding of that name would hide it from the rules of ${n.name}(...)`);
    // DELIBERATE CHANGE (2026-11-22, S4): [mut-source] is gone
    // DELIBERATE CHANGE (2026-11-22, S4): a generator cell's yielded Mut typed array must be a fresh copy (owTypedOut)
    if (n.type === "YieldExpression" && cellFn.generator && n.argument && encl(n) === cellFn) {
      const t = typeOf(n.argument), w = t ? typedIn(t) : null, u = { n: w ?? "" };
      if (w !== null && !typedSafe(n.argument)) err(n.argument, "mut-yield", `a ${u.n} the cell may still write, yielded: a typed array or URL cannot be frozen; yield a copy (${u.n === "ArrayBuffer" || u.n === "DataView" ? "snapshot(x)" : "x.slice()"})`);
    }
    // holes step 4 (2026-11-22): a regexp that may have the g or y flag only where it is made (as owRegexpPlace)
    {
      const gy = (f: string) => f.includes("g") || f.includes("y");
      const fl = n.type === "NewExpression" && n.callee.type === "Identifier" && n.callee.name === "RegExp" ? n.arguments[1] : undefined;
      const lit = n.type === "Literal" && !!n.regex && gy(n.regex.flags);
      const made = n.type === "NewExpression" && !!fl && !(fl.type === "Literal" && typeof fl.value === "string" && !gy(fl.value));
      const p = parent.get(n);
      if ((lit || made) && !(p?.type === "MemberExpression" && p.object === n) && !(p?.type === "CallExpression" && p.callee !== n && nonRetainingArg(p, p.arguments.indexOf(n))))
        err(n, "regexp-state", "a regexp that may have the g or y flag keeps lastIndex, which test, exec, match and replace write: use it only where it is made, as the receiver of a call or a String method's argument");
    }
    // holes step 6 (2026-11-22): a literal key naming an Object.prototype member on a record with an index signature (as owProtoRead)
    {
      const at = n.type === "MemberExpression" ? { o: n.object, k: n.property, c: n.computed } : n.type === "BinaryExpression" && n.operator === "in" ? { o: n.right, k: n.left, c: true } : undefined;
      const ot = at && typeOf(at.o);
      if (at && ot && ch.um(ot).some((m) => { const x = ch.reg.expand(unwrap(m)); return x.k === "rec" && !!x.index; })) {
        const kt = typeOf(at.k);
        const names = !at.c && at.k.type === "Identifier" ? [at.k.name] : at.k.type === "Literal" ? (typeof at.k.value === "string" ? [at.k.value] : [])
          : kt && ch.um(kt).every((m) => m.k === "num" || m.k === "lit") ? ch.um(kt).flatMap((m) => (m.k === "lit" && typeof m.v === "string" ? [m.v] : [])) : null;
        const k = names?.find((x) => PROTO_NAMES.has(x));
        if (k !== undefined) err(n, "banned-member", `${k} on a record with an index signature is Object.prototype's ${k}, not an entry`);
      }
    }
    // holes step 7 (2026-11-22): includes, indexOf, lastIndexOf on an element and an argument that may both be objects (as owIdentityOp)
    if (n.type === "CallExpression" && n.callee.type === "MemberExpression" && !n.callee.computed && n.callee.property.type === "Identifier" && ["includes", "indexOf", "lastIndexOf"].includes(n.callee.property.name) && n.arguments[0]) {
      const sig = F.calls.get(n)?.sig, at = typeOf(n.arguments[0]), el = sig?.ps[0]?.t;
      const obj = (t: Ty | undefined) => !!t && !ch.um(t).every((m) => isPrimitive(m));
      if (sig?.flags?.intrinsic && obj(el) && obj(at)) err(n, "strict-eq-object", `${n.callee.property.name} on an element and an argument that may both be objects compares by identity, as === does; use equals(a, b) with some or findIndex`);
    }
    if (n.type !== "CallExpression") continue;
    const pre = prelude(n);
    // DELIBERATE CHANGE (2026-11-22, S4): mut(...) and borrow(...) are gone ([mut-bind], [mut-not-fresh], [borrow-placement])
    if (pre === "state") {
      const p = parent.get(n);
      const okBody = cellFn.body === n;
      const okRet = p?.type === "ReturnStatement" && parent.get(p) === cellFn.body;
      if (!(okBody || okRet) || cellFn.async || cellFn.generator) err(n, "state-placement", "state(...) only as the returned value of a sync, non-generator cell");
    } else if (pre === "on") {
      // the cell's whole value: its expression body or a return of the cell function, through parentheses and conditional branches
      let cur = n, p = parent.get(n);
      while (p && (p.type === "ParenthesizedExpression" || (p.type === "ConditionalExpression" && p.test !== cur))) { cur = p; p = parent.get(p); }
      const whole = cellFn.body === cur || (p?.type === "ReturnStatement" && encl(p) === cellFn);
      if (!whole || cellFn.async || cellFn.generator) err(n, "listener-placement", "on(...) only as the whole value of a sync, non-generator cell (what it returns, or a branch of a conditional that it returns)");
    }
  }
  // DELIBERATE CHANGE (2026-11-22, R-Y and R-A): no Mut, nor a let of a type that is not primitive, declared before a yield
  // (or an await in a function whose values may be seen before it ends) is used after it (the cells of ow-late.ss.ts)
  {
    const within = (a: Node, b: Node) => a.start >= b.start && a.end <= b.end;
    const LOOPS = /^(ForStatement|ForOfStatement|ForInStatement|WhileStatement|DoWhileStatement)$/;
    // DELIBERATE CHANGE (2026-11-22, R r2): a binding whose type holds a Mut anywhere; every nested function is visible
    const local = (b: Binding) => !b.cellParam && b.kind !== "global" && b.kind !== "prelude" && b.kind !== "fn";
    const cand = (b: Binding) => (local(b) && mutDeep(b.t, ch.reg) !== null) || (!b.cellParam && b.kind === "let" && isPrimitive(b.t) === false);
    const visible = (g: Node): boolean => !!g.generator || g !== cellFn;
    const writeAt = (r: Node): Node | null => {
      for (let cur = r, p = parent.get(r); p; cur = p, p = parent.get(p)) {
        if (/^(CallExpression|AssignmentExpression|UpdateExpression)$/.test(p.type) || (p.type === "UnaryExpression" && p.operator === "delete")) return p;
        if (!((p.type === "MemberExpression" && p.object === cur) || /^(ArrayPattern|ObjectPattern|Property|AssignmentPattern)$/.test(p.type))) return null;
      }
      return null;
    };
    const loopsOut = (n: Node, g: Node): Node[] => { const out: Node[] = []; for (let p = parent.get(n); p && p !== g && !isFn(p); p = parent.get(p)) if (LOOPS.test(p.type)) out.push(p); return out; };
    const usesOf = (b: Binding): { at: Node; write: boolean }[] => [...(refs.get(b) ?? []).map((r) => ({ at: r, write: assignedRef(r) || writeRef(r) })),
      ...fns.flatMap((f) => { const hb = capRead.get(f)!.has(b) ? bindingOfFn.get(f) : undefined; return hb ? (refs.get(hb) ?? []).filter(isCallee).map((r) => ({ at: parent.get(r)!, write: capW.get(f)!.has(b) || capLet.get(f)!.has(b) })) : []; })];
    const after = (g: Node, d: Node, captured: boolean, u: { at: Node; write: boolean }, p: Node): boolean => {
      if (!captured && d.start >= p.start) return false;
      const r = u.at, right = p.type === "ForOfStatement" ? p.right : null, inRight = !!right && within(r, right);
      if (r.start >= (right ? right.end : p.end) && !inRight) return true;
      const we = u.write ? writeAt(r) : null;
      if (we && within(p, we)) return true;
      const l = [...(right ? [p] : []), ...loopsOut(p, g)].find((x) => within(r, x) && !(x === p && inRight));
      return !!l && (captured || !within(d, l.body));
    };
    const lateMsg = (b: Binding, p: Node): string => {
      const w0 = mutDeep(b.t, ch.reg), what = isMutB(b) ? `Mut ${b.name}` : w0 !== null ? `${b.name}, whose type holds ${w0},` : `let ${b.name} of type ${show(b.t)}`;
      const at = p.type === "YieldExpression" ? "a yield" : "an await in a function whose values may be seen before it ends";
      const w = p.type === "YieldExpression" ? "yield" : "await";
      return `${what} is declared before ${at} and used after it, and the code after it runs once a value has been given; declare it in the loop body that holds the ${w}, or build the value in a helper call (const v = make(k)); to only read it there, bind it under its plain type before the ${w} (const c: ${show(stripMut(b.t, ch.reg))} = ...) and read c${w0 !== null ? "" : "; a let of a primitive type may be used across it"}`;
    };
    for (const g of fns) {
      if (!g.async && !g.generator) continue;
      const aw = !!g.async && visible(g);
      const ps = all.filter((n) => encl(n) === g && (n.type === "YieldExpression" || (aw && (n.type === "AwaitExpression" || (n.type === "ForOfStatement" && !!n.await)))));
      if (!ps.length) continue;
      for (const b of refs.keys()) {
        if (!cand(b) || !b.node) continue;
        const d = b.node, captured = encl(d) !== g;
        if (captured && !capRead.get(g)!.has(b)) continue;
        for (const u of usesOf(b)) {
          if (u.at === d || (captured && !within(u.at, g))) continue;
          const p = ps.find((x) => after(g, d, captured, u, x));
          if (!p) continue;
          err(u.at, p.type === "YieldExpression" ? "mut-yield" : "mut-await", lateMsg(b, p));
          break;
        }
      }
    }
    // DELIBERATE CHANGE (2026-11-23, m1 step 2, R-M): a Mut local named in an argument of a call of a memoised function
    // the cell knows (a const bound to memo(...)) is not written after that call in the same function (ow-late owMemoArgs)
    const memos = new Set<Binding>();
    for (const n of all) if (n.type === "VariableDeclarator" && n.init?.type === "CallExpression" && n.id.type === "Identifier" && F.calls.get(n.init)?.prelude === "memo") { const b = F.bindingOf.get(n.id); if (b && b.kind === "const") memos.add(b); }
    const snaps = all.filter((n) => n.type === "CallExpression" && F.calls.get(n)?.prelude === "snapshot");
    const given = (r: Node, a: Node) => within(r, a) && !snaps.some((s) => within(r, s) && within(s, a));
    if (memos.size) for (const c of all) {
      if (c.type !== "CallExpression" || c.callee.type !== "Identifier" || !memos.has(F.bindingOf.get(c.callee)!)) continue;
      const g = encl(c), name = c.callee.name;
      for (const [b, rs] of refs) {
        const d = b.node;
        if (!d || b.cellParam || !(b.mutOwned || isMutB(b)) || encl(d) !== g) continue;
        if (!rs.some((r) => (c.arguments as Node[]).some((a) => given(r, a)) && encl(r) === g)) continue;
        const u = usesOf(b).find((x) => x.write && after(g, d, false, x, c));
        if (!u) continue;
        const w = u.at.type === "CallExpression" ? u.at : writeAt(u.at);
        err(u.at, w && w.type === "CallExpression" ? "mutating-method" : "member-write", `${b.name} is written after it was given to the memoised function ${name}, which froze it in place, so the write would throw; write it before the call, or give ${name} a copy (snapshot(${b.name}))`);
      }
    }
    // DELIBERATE CHANGE (2026-11-23, p1, R-P): a local whose type holds a Mut (or a Mut it owns), declared before a point
    // at which the function publishes a value to a holder while it still runs (a State's set or update, called or read as
    // a value; an action called with arguments or passed to a call), is not written after the point; a point inside a
    // helper or a callback a built-in calls at once is a point at that call (ow-late owPubNode, owPubPoints, owPubWrites)
    {
      const isTy = (x: Node, n: string) => { const t = F.types.get(x); return !!t && ch.um(t).some((m) => isNamed(unwrap(m), n)); };
      const pubNode = (n: Node): boolean => {
        const p = parent.get(n);
        if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier" && (n.property.name === "set" || n.property.name === "update")) return isTy(n.object, "State");
        if (n.type === "CallExpression") return n.arguments.length > 0 && isTy(n.callee, "Action");
        return (n.type === "Identifier" || n.type === "MemberExpression") && !!p && (p.type === "CallExpression" || p.type === "NewExpression") && (p.arguments as Node[]).includes(n) && isTy(n, "Action");
      };
      const atOnce = (p: Node, x: Node): boolean => {
        const sig = F.calls.get(p)?.sig, fl = sig?.flags, d = sig && (sig.decl ?? sig), i = (p.arguments as Node[]).indexOf(x);
        const dp = d && (i < d.ps.length ? d.ps[i]?.t : d.rest);
        if (fl?.intrinsic && !fl.retains && dp && ch.reg.callSigs(dp).length) return true;
        const c = p.callee;
        return p.type === "CallExpression" && c.type === "MemberExpression" && !c.computed && c.property.type === "Identifier" && c.property.name === "update" && isTy(c.object, "State");
      };
      const pts = new Map<Node, Node[]>(), seen = new Set<string>(), todo = all.filter(pubNode);
      for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
        const e = encl(n), k = `${e.start}:${e.end}:${n.start}:${n.end}:${n.type}`;
        if (seen.has(k)) continue;
        seen.add(k);
        pts.set(e, [...(pts.get(e) ?? []), n]);
        const p = parent.get(e);
        if (!p || e === cellFn) continue;
        if (p.type === "CallExpression" && (p.callee === e || atOnce(p, e))) { todo.push(p); continue; }
        const id = p.type === "VariableDeclarator" && p.init === e && p.id.type === "Identifier" && parent.get(p)?.type === "VariableDeclaration" && parent.get(p)?.kind === "const" ? p.id : e.type === "FunctionDeclaration" ? e.id : null;
        const b = id ? F.bindingOf.get(id) : undefined;
        if (b && b.fnNode === e) for (const r of refs.get(b) ?? []) { const c = parent.get(r); if (c && isCallee(r)) todo.push(c); }
      }
      const what = (p: Node): string => {
        const n = p.type === "CallExpression" ? p.callee : p;
        if (n.type === "Identifier") return `${n.name}(…)`;
        if (n.type === "MemberExpression" && !n.computed && n.property.type === "Identifier") return n.object.type === "Identifier" ? `${n.object.name}.${n.property.name}${p.type === "CallExpression" ? "(…)" : ""}` : `….${n.property.name}(…)`;
        return "a call";
      };
      for (const g of [cellFn, ...fns]) {
        const ps = pts.get(g) ?? [];
        if (!ps.length) continue;
        for (const b of refs.keys()) {
          const d = b.node;
          if (!d || b.cellParam || !(b.mutOwned || isMutB(b) || (local(b) && mutDeep(b.t, ch.reg) !== null))) continue;
          const captured = encl(d) !== g;
          if (captured && !capRead.get(g)?.has(b)) continue;
          for (const u of usesOf(b)) {
            if (!u.write || (captured && !within(u.at, g))) continue;
            const p = ps.find((x) => after(g, d, captured, u, x));
            if (!p) continue;
            const w = u.at.type === "CallExpression" ? u.at : writeAt(u.at);
            err(u.at, w && w.type === "CallExpression" ? "mutating-method" : "member-write", `${b.name} is written after a value is published at ${what(p)} in the same run of this function; a function published there may read ${b.name} through a read-only name (S4.10) and would see the write (S4.11); finish every write to ${b.name} before ${what(p)}, or write to a new local declared after it`);
            break;
          }
        }
      }
    }
  }
  function fresh(a: Node): boolean {
    switch (a.type) {
      case "ArrayExpression": case "ObjectExpression": return true;
      case "ConditionalExpression": return fresh(a.consequent) && fresh(a.alternate);
      case "NewExpression": case "CallExpression": {
        const s = F.calls.get(a)?.sig;
        return !!s && !!s.flags?.intrinsic && !!s.flags.fresh && !s.flags.view;
      }
      default: return false;
    }
  }

  // ---- flow: use after freeze / after await ----
  // DELIBERATE CHANGE (2026-11-22, S4): the flow check ([mut-after-freeze], [borrowed-await]) is gone
  void flowCheck;
  function flowCheck(f: Node) {
    const tracked = new Set<Binding>();
    for (const b of refs.keys()) {
      if (b.fi?.node === f && isBorB(b) && b.kind === "param") tracked.add(b);
    }
    for (const b of F.bindingOf.values()) if (b.fi?.node === f && isMutB(b) && b.mutOwned) tracked.add(b);
    // an async function's Mut that it did not make (a parameter, or a helper's capture) is its caller's again after an await
    const loaned = new Set<Binding>();
    if (f.async) for (const b of [...refs.keys(), ...capMut.get(f)!]) if (isMutB(b) && !(b.fi?.node === f && b.mutOwned) && (b.fi?.node === f || capMut.get(f)!.has(b))) { tracked.add(b); loaned.add(b); }
    if (!tracked.size) return;
    const borrowed = [...tracked].filter((b) => isBorB(b) || loaned.has(b));
    type St = Set<Binding>;
    // innermost first: a loop takes break and continue, a switch only break
    const loops: { breaks: St[]; conts: St[]; isSwitch?: boolean }[] = [];
    let tryAcc: St[] | null = null;
    const join = (...ss: (St | null)[]): St | null => {
      const live = ss.filter((x): x is St => !!x);
      if (!live.length) return null;
      const out = new Set<Binding>();
      for (const s of live) for (const b of s) out.add(b);
      return out;
    };
    const use = (b: Binding, at: Node, st: St) => {
      if (!st.has(b)) return;
      if (isBorB(b)) err(at, "borrowed-await", `Borrowed ${b.name} used after an await/yield (it may be reused by its owner)`);
      else if (loaned.has(b)) err(at, "borrowed-await", `Mut ${b.name} used after an await: this async function did not make it, and its caller runs at the first await and may change or freeze it`);
      else err(at, "mut-after-freeze", `Mut ${b.name} used after freeze(${b.name})`);
    };
    const expr = (n: Node, st: St): St => {
      if (isFn(n)) return st;
      if (tryAcc) tryAcc.push(new Set(st));
      switch (n.type) {
        case "Identifier": {
          const b = F.bindingOf.get(n);
          if (b && tracked.has(b) && b.node !== n) use(b, n, st);
          return st;
        }
        case "LogicalExpression": {
          const a = expr(n.left, st);
          const r = expr(n.right, new Set(a));
          return join(a, r)!;
        }
        case "ConditionalExpression": {
          const t = expr(n.test, st);
          return join(expr(n.consequent, new Set(t)), expr(n.alternate, new Set(t)))!;
        }
        case "ChainExpression": return join(st, expr(n.expression, new Set(st)))!;
        case "CallExpression": {
          for (const c of kids(n)) st = expr(c, st);
          const h = F.calls.get(n)?.helper;
          if (h?.fnNode) for (const b of capMut.get(h.fnNode) ?? []) if (tracked.has(b)) use(b, n, st);
          if (prelude(n) === "freeze" && n.arguments[0]?.type === "Identifier") {
            const b = F.bindingOf.get(n.arguments[0]);
            if (b && tracked.has(b)) st = new Set(st).add(b);
          }
          return st;
        }
        case "AwaitExpression": case "YieldExpression": {
          for (const c of kids(n)) st = expr(c, st);
          if (borrowed.length) { st = new Set(st); for (const b of borrowed) st.add(b); }
          return st;
        }
        default:
          for (const c of kids(n)) st = expr(c, st);
          return st;
      }
    };
    const stmt = (s: Node, st: St): St | null => {
      if (tryAcc) tryAcc.push(new Set(st));
      switch (s.type) {
        case "BlockStatement": {
          let cur: St | null = st;
          for (const x of s.body) { if (!cur) return null; cur = stmt(x, cur); }
          return cur;
        }
        case "VariableDeclaration": {
          for (const d of s.declarations) {
            if (d.init) st = expr(d.init, st);
            for (const c of kids(d.id)) st = expr(c, st);
            const b = d.id.type === "Identifier" ? F.bindingOf.get(d.id) : undefined;
            if (b && tracked.has(b)) { st = new Set(st); st.delete(b); }
          }
          return st;
        }
        case "FunctionDeclaration": case "EmptyStatement": return st;
        case "ExpressionStatement": return expr(s.expression, st);
        case "ReturnStatement": case "ThrowStatement": if (s.argument) expr(s.argument, st); return null;
        case "IfStatement": {
          const t = expr(s.test, st);
          return join(stmt(s.consequent, new Set(t)), s.alternate ? stmt(s.alternate, new Set(t)) : t);
        }
        case "BreakStatement": case "ContinueStatement":
          if (s.label) { ch.unsupported(s, "labelled break/continue in a function holding a Mut/Borrowed"); return null; }
          if (s.type === "BreakStatement") loops[loops.length - 1]?.breaks.push(st);
          else loops.findLast((l) => !l.isSwitch)?.conts.push(st);
          return null;
        case "WhileStatement": case "DoWhileStatement": case "ForStatement": case "ForOfStatement": {
          let entry = st;
          if (s.type === "ForStatement" && s.init) entry = s.init.type === "VariableDeclaration" ? stmt(s.init, entry)! : expr(s.init, entry);
          if (s.type === "ForOfStatement") entry = expr(s.right, entry);
          let cur = entry;
          let exit: St | null = null;
          for (let iter = 0; iter < 20; iter++) {
            const ctx = { breaks: [] as St[], conts: [] as St[] };
            loops.push(ctx);
            let afterTest = cur;
            let bodyIn = cur;
            if (s.type !== "DoWhileStatement" && s.test) { afterTest = expr(s.test, new Set(cur)); bodyIn = afterTest; }
            if (s.type === "ForOfStatement") {
              bodyIn = new Set(cur);
              const d = s.left.declarations?.[0];
              const b = d?.id.type === "Identifier" ? F.bindingOf.get(d.id) : undefined;
              if (b && tracked.has(b)) bodyIn.delete(b);
            }
            let end = stmt(s.body, new Set(bodyIn));
            loops.pop();
            let back = join(end, ...ctx.conts);
            if (back && s.type === "ForStatement" && s.update) back = expr(s.update, back);
            if (back && s.type === "DoWhileStatement") { afterTest = expr(s.test, back); back = afterTest; }
            const infinite = s.type !== "ForOfStatement" && (!s.test || (s.test.type === "Literal" && s.test.value === true));
            exit = join(infinite ? null : s.type === "DoWhileStatement" ? afterTest : s.type === "ForOfStatement" ? cur : afterTest, ...ctx.breaks);
            const next = join(entry, back)!;
            if (next.size === cur.size) break;
            cur = next;
          }
          return exit;
        }
        case "TryStatement": {
          if (s.finalizer) { ch.unsupported(s, "try/finally in a function holding a Mut/Borrowed"); return st; }
          const outer = tryAcc;
          tryAcc = [new Set(st)];
          const a = stmt(s.block, new Set(st));
          const seen = join(...tryAcc)!;
          tryAcc = outer;
          if (tryAcc) tryAcc.push(seen);
          const c = s.handler ? stmt(s.handler.body, new Set(seen)) : null;
          return join(a, c);
        }
        case "SwitchStatement": {
          // every test may run before a body is entered; a body is entered by its case or from the body before it
          let tests = expr(s.discriminant, st);
          for (const c of s.cases) if (c.test) tests = expr(c.test, tests);
          const ctx = { breaks: [] as St[], conts: [] as St[], isSwitch: true };
          loops.push(ctx);
          let prev: St | null = null;
          for (const c of s.cases) {
            let cur: St | null = join(tests, prev);
            for (const x of c.consequent) { if (!cur) break; cur = stmt(x, cur); }
            prev = cur;
          }
          loops.pop();
          return join(prev, ...ctx.breaks, s.cases.some((c: Node) => !c.test) ? null : tests);
        }
        case "LabeledStatement":
          ch.unsupported(s, `${s.type} in a function holding a Mut/Borrowed`);
          return st;
        default:
          for (const c of kids(s)) st = isFn(c) ? st : expr(c, st);
          return st;
      }
    };
    if (f.body.type === "BlockStatement") stmt(f.body, new Set());
    else expr(f.body, new Set());
  }
  return errs;
}

// A write, action call or read() in a function made inside an action body is allowed only when that function
// runs before the action's function returns (S6.19): it is sync and is called where it is made, passed to a
// built-in that calls it before returning (not @retains), or a local helper that is only called from such places.
// Each function from the use out to the action body must pass. A State's set or update taken as a value is a
// function that writes, and is held to the same rule.
export function actionEscapes(cellFn: Node, ch: Checker): Rule[] {
  if (!ch.actionBodies.size) return [];
  const F = ch.facts;
  const parent = new Map<Node, Node>();
  const callees = new Map<Binding, Node[]>(); // the references of each binding, for helpers
  const members: Node[] = []; // member reads and destructured properties of a State
  (function walk(n: Node, p: Node | null) {
    if (p) parent.set(n, p);
    if (n.type === "Identifier") {
      const b = F.bindingOf.get(n);
      if (b && b.node !== n) { const l = callees.get(b) ?? []; l.push(n); callees.set(b, l); }
    }
    if (n.type === "MemberExpression" || ch.stateProps.has(n)) members.push(n);
    for (const c of kids(n)) walk(c, n);
  })(cellFn, null);
  const enclFn = (n: Node): Node | null => { let p = parent.get(n); while (p && !isFn(p)) p = parent.get(p); return p ?? null; };
  const isState = (n: Node | undefined) => { const t = n && F.types.get(n); return !!t && ch.um(t).some((m) => isNamed(unwrap(m), "State")); };
  const memo = new Map<Node, string | null>(); // null: runs in the call; a string: why it may not
  // every function from f out to the function `to` (exclusive) runs in the call
  const chain = (f: Node | null, to: Node): string | null => {
    for (let g = f; g && g !== to; g = enclFn(g)) {
      if (ch.actionBodies.has(g)) return "it is called from another action's body";
      const w = why(g);
      if (w) return w;
    }
    return null;
  };
  function why(f: Node): string | null {
    if (memo.has(f)) return memo.get(f)!;
    memo.set(f, null); // a helper that calls itself: decided by its other uses
    const r = why1(f);
    memo.set(f, r);
    return r;
  }
  // a built-in calls at once a function given to a parameter of function type that it does not keep
  const callsAtOnce = (p: Node, x: Node): boolean => {
    const fl = F.calls.get(p)?.sig?.flags;
    const sig = F.calls.get(p)?.sig, d = sig && (sig.decl ?? sig), i = p.arguments.indexOf(x);
    const dp = d && (i < d.ps.length ? d.ps[i].t : d.rest);
    if (fl?.intrinsic && !fl.retains && dp && ch.reg.callSigs(dp).length) return true;
    // State.update calls its function at once, inside the write
    const c = p.callee;
    return p.type === "CallExpression" && c.type === "MemberExpression" && !c.computed && c.property.name === "update" && isState(c.object);
  };
  // each reference of b is a direct call from a function that runs while the one holding b's declaration does
  const onlyCalled = (b: Binding, decl: Node): string | null => {
    const home = enclFn(decl) ?? cellFn;
    for (const r of callees.get(b) ?? []) {
      const rp = parent.get(r);
      if (!(rp && rp.type === "CallExpression" && rp.callee === r)) return `${b.name} is used other than by a direct call`;
      const w = chain(enclFn(r), home);
      if (w) return `${b.name} is called from a function that may run after the call (${w})`;
    }
    return null;
  };
  function why1(f: Node): string | null {
    if (f.async || f.generator) return `it is ${f.async ? "async" : "a generator"}, so it may resume after the call has finished`;
    const p = parent.get(f);
    if (!p) return "it is not called where it is made";
    if (p.type === "CallExpression" && p.callee === f) return null;
    if ((p.type === "CallExpression" || p.type === "NewExpression") && p.arguments.includes(f))
      return callsAtOnce(p, f) ? null : "it is passed to a function that may keep it";
    const declared = p.type === "VariableDeclarator" && p.init === f && p.id.type === "Identifier" && parent.get(p)?.kind === "const" ? p.id
      : f.type === "FunctionDeclaration" ? f.id : null;
    const b = declared ? F.bindingOf.get(declared) : undefined;
    if (b && b.fnNode === f) return onlyCalled(b, f);
    return "it is kept: returned, stored, or placed where it may be called later";
  }
  // a set or update read as a value (x, a member read or a destructured property): where it may be called
  function methodValue(x: Node): string | null {
    const p = parent.get(x)!;
    if (x.type === "MemberExpression") {
      if (p.type === "CallExpression" && p.callee === x) return null;
      if ((p.type === "CallExpression" || p.type === "NewExpression") && p.arguments.includes(x)) return callsAtOnce(p, x) ? null : "it is passed to a function that may keep it";
      if (p.type === "VariableDeclarator" && p.init === x && p.id.type === "Identifier" && parent.get(p)?.kind === "const") {
        const b = F.bindingOf.get(p.id);
        return b ? onlyCalled(b, p) : "it is bound to a name the checker does not follow";
      }
      return "it is kept: returned, stored, or placed where it may be called later";
    }
    // a property of `const { set } = handle`
    const pat = p, d = parent.get(pat);
    if (x.value?.type === "Identifier" && d?.type === "VariableDeclarator" && d.id === pat && parent.get(d)?.kind === "const") {
      const b = F.bindingOf.get(x.value);
      return b ? onlyCalled(b, d) : "it is bound to a name the checker does not follow";
    }
    return "it is kept: bound where the checker does not follow it";
  }
  const out: Rule[] = [];
  for (const u of ch.inActionUses) {
    let root: Node | null = u.fi.node;
    while (root && !ch.actionBodies.has(root)) root = enclFn(root);
    const w = chain(u.fi.node, root ?? cellFn);
    if (w) out.push({ node: u.node, rule: u.rule, msg: `${u.msg}: the function it is in was made in an action body and may run after the call, because ${w}` });
  }
  for (const x of members) {
    const isMember = x.type === "MemberExpression";
    const key = isMember ? x.property : x.key;
    const name = !x.computed && key.type === "Identifier" ? key.name : key.type === "Literal" ? String(key.value) : null;
    if (isMember ? name !== "set" && name !== "update" || !isState(x.object) : false) continue;
    let root: Node | null = enclFn(x);
    while (root && !ch.actionBodies.has(root)) root = enclFn(root);
    if (!root) continue; // outside any action: [state-write] where it is read
    const w = methodValue(x);
    if (w) out.push({ node: x, rule: "state-write", msg: `State.${name ?? "member"} taken as a value in an action body may write after the call, because ${w}` });
  }
  return out;
}
