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
import { isNamed, unwrap, show, ERR, isPrimitive, type Ty } from "../../types.ts";
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

  // ---- captures, to a fixpoint through helper calls ----
  const capMut = new Map<Node, Set<Binding>>();
  const capLet = new Map<Node, Set<Binding>>();
  const calls = new Map<Node, Set<Binding>>();
  for (const f of fns) { capMut.set(f, new Set()); capLet.set(f, new Set()); calls.set(f, new Set()); }
  for (const [b, rs] of refs) {
    for (const r of rs) {
      for (let f: Node | undefined = encl(r); f && f !== cellFn && fns.includes(f); f = parent.get(f) ? encl(f) : undefined) {
        if (inside(b, f)) break;
        if (isMutB(b) || isBorB(b)) capMut.get(f)!.add(b);
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
      for (const cap of [capMut, capLet])
        for (const b of cap.get(h.fnNode)!) if (!inside(b, f) && !cap.get(f)!.has(b)) { cap.get(f)!.add(b); changed = true; }
    }
  }
  for (const f of fns) {
    if (f === cellFn) continue;
    const h = helper(f);
    for (const b of capMut.get(f)!) {
      if (isBorB(b)) err(f, "borrowed-escape", `Borrowed ${b.name} captured by a nested function`);
      else if (!h) err(f, "mut-capture", `Mut ${b.name} captured by a function that escapes (not a local helper that is only called)`);
    }
    for (const b of capLet.get(f)!) if (!h) err(f, "let-capture", `${b.kind} ${b.name} assigned from a function that escapes`);
  }

  // ---- positions ----
  const viewOf = new Set<Node>();
  for (const n of all) {
    if (n.type !== "MemberExpression" || !F.memberFlags.get(n)?.view) continue;
    const rt = typeOf(n.object);
    if (!rt || !(isNamed(rt, "Mut") || viewOf.has(n.object))) continue;
    const p = parent.get(n);
    viewOf.add(p && p.type === "CallExpression" && p.callee === n ? p : n);
  }
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
  // Is expression x (of kind) in an allowed position? Returns a description of the position if not.
  const position = (x: Node, kind: "mut" | "borrowed" | "view", b?: Binding): string | null => {
    const p = parent.get(x);
    if (!p) return "cell body";
    switch (p.type) {
      case "MemberExpression":
        if (p.object !== x) return "computed key";
        if (kind === "view") {
          const pp = parent.get(p);
          if (pp?.type === "CallExpression" && pp.callee === p && F.memberFlags.get(p)?.mutates) return "write through a view";
        }
        return null;
      case "CallExpression": case "NewExpression": {
        if (p.callee === x) return "callee";
        const i = p.arguments.indexOf(x);
        const pre = prelude(p);
        if (pre === "freeze") {
          if (kind !== "mut" || x.type !== "Identifier" || !b) return "freeze of a non-binding";
          if (!b.mutOwned && b.kind !== "param") return null; // an alias: reported where it was bound
          if (!b.mutOwned) { err(p, "mut-freeze-param", `freeze(${b.name}): only a Mut created by mut() in this function can be frozen, not a Mut parameter`); return null; }
          if (encl(p) !== b.fi?.node) { err(p, "mut-capture", `freeze of captured Mut ${b.name} inside a nested function`); return null; }
          return null;
        }
        if (pre === "borrow") return kind === "mut" ? null : "borrow of a non-Mut";
        if (pre === "snapshot") return kind === "mut" ? "snapshot of a Mut" : null;
        if (pre === "equals" || pre === "messageOf") return null;
        if (pre) return `argument of ${pre}()`;
        if (kind === "mut" && mutParamArg(p, i)) return null;
        if (nonRetainingArg(p, i)) return null;
        return kind === "mut" ? "argument to a parameter not typed Mut<…>" : "argument to a parameter that may keep it";
      }
      case "SpreadElement": {
        const pp = parent.get(p)!;
        if (pp.type === "ArrayExpression" || pp.type === "ObjectExpression") return null;
        if (pp.type === "CallExpression" || pp.type === "NewExpression") return nonRetainingArg(pp, pp.arguments.indexOf(p)) ? null : "spread into a call that may keep it";
        return "spread";
      }
      case "ForOfStatement": return p.right === x ? null : "for...of target";
      case "TemplateLiteral": case "ExpressionStatement": case "UnaryExpression": case "BinaryExpression": return null;
      case "IfStatement": case "WhileStatement": case "DoWhileStatement": case "ForStatement": case "SwitchCase": return p.test === x ? null : "statement";
      case "SwitchStatement": return p.discriminant === x ? null : "statement";
      case "ConditionalExpression": return p.test === x ? null : position(p, kind, undefined);
      case "LogicalExpression": case "ChainExpression": return position(p, kind, undefined);
      case "VariableDeclarator": return "bound to a second name";
      case "AssignmentExpression": return p.right === x ? "assigned to a binding" : "assignment target";
      case "ReturnStatement": case "ArrowFunctionExpression": return "returned";
      case "YieldExpression": return "yielded";
      case "AwaitExpression": return "awaited";
      case "ArrayExpression": return "placed in an array literal";
      case "Property": return "placed in an object literal";
      case "ThrowStatement": return "thrown";
      case "JSXExpressionContainer": return "placed in JSX";
      default: return p.type;
    }
  };
  for (const [b, rs] of refs) {
    const kind = isMutB(b) ? "mut" : isBorB(b) ? "borrowed" : null;
    if (!kind) continue;
    for (const r of rs) {
      const pos = position(r, kind, b);
      if (pos) err(r, kind === "mut" ? "mut-escape" : "borrowed-escape", `${kind === "mut" ? "Mut" : "Borrowed"} ${b.name} ${pos}`);
    }
  }
  // holes2 step C (2026-11-22): owned groups, as the cells of ow-group.ss.ts and owMutPlace/owMutSource
  const isGroup = (t: Ty | undefined): boolean => !!t && ((isNamed(t, "Mut") && !!mutIn(unwrap(t), ch.reg)) || (t.k === "union" && t.ts.some((m) => isNamed(m, "Mut") && !!mutIn(unwrap(m), ch.reg))));
  const topMut = (t: Ty): boolean => { const x = ch.reg.expand(t); return isNamed(x, "Mut") || (x.k === "union" && x.ts.some((m) => isNamed(ch.reg.expand(m), "Mut"))); };
  const memberName = (n: Node): string | null => !n.computed && n.property.type === "Identifier" ? n.property.name : n.property.type === "Literal" && typeof n.property.value === "string" ? n.property.value : null;
  const fieldOf = (n: Node): boolean => {
    const t = typeOf(n), o = typeOf(n.object), k = memberName(n);
    if (t && topMut(t)) return true;
    if (!o) return false;
    if (!t && isGroup(o)) return true;
    return k !== null && ch.um(o).some((m) => { const r = ch.reg.expand(unwrap(m)); const p = r.k === "rec" ? r.props.get(k) : undefined; return !!p && topMut(p.t); });
  };
  const written = (n: Node): boolean => { const p = parent.get(n); return !!p && ((p.type === "AssignmentExpression" && p.left === n) || (p.type === "UnaryExpression" && p.operator === "delete")); };
  const groupParam = (dp: Ty, at: Ty): boolean => {
    if (!isNamed(dp, "Mut") || !isNamed(at, "Mut")) return false;
    const d = ch.reg.expand(unwrap(dp)), a = ch.reg.expand(unwrap(at));
    if (d.k !== "rec" || a.k !== "rec" || d.index) return false;
    if ([...d.props.values()].some((p) => ch.reg.expand(p.t).k === "tv")) return false;
    return [...a.props].every(([k, p]) => !topMut(p.t) || (!!d.props.get(k) && isNamed(ch.reg.expand(d.props.get(k)!.t), "Mut")));
  };
  const lent = (n: Node, out: string[]): void => {
    if (n.type === "ConditionalExpression") { lent(n.consequent, out); lent(n.alternate, out); return; }
    if (n.type === "LogicalExpression") { lent(n.left, out); lent(n.right, out); return; }
    if (n.type === "ChainExpression") { lent(n.expression, out); return; }
    if (n.type === "SpreadElement") { lent(n.argument, out); return; }
    const g = n.type === "MemberExpression" ? n.object : n;
    const b = g.type === "Identifier" ? F.bindingOf.get(g) : undefined;
    if (!b || !(isGroup(b.t) || isGroup(typeOf(g)))) return;
    const k = n.type === "MemberExpression" ? memberName(n) : null;
    out.push(k === null ? `${b.id}` : `${b.id}.${k}`);
  };
  const groupArg = (p: Node, n: Node, at: Ty | undefined): string | null => {
    const i = p.arguments.indexOf(n), pre = prelude(p);
    if (pre === "freeze" || pre === "equals" || pre === "messageOf") return null;
    const dp = !pre && i >= 0 ? declParam(p, i, false) : undefined;
    if (dp && at && groupParam(dp, at)) return null;
    if (pre === "borrow") return "borrowed whole: a reader could write its fields";
    return "passed where its fields could come back out: a group goes only to a parameter declared as a group whose owned fields are each Mut<…>, or to freeze, equals or messageOf";
  };
  for (const n of all) {
    const p = parent.get(n), b = n.type === "Identifier" ? F.bindingOf.get(n) : undefined, t = typeOf(n);
    if (p && (isGroup(t) || (b && isGroup(b.t)))) {
      const what = n.type === "Identifier" ? `group ${n.name}` : "a group";
      if (p.type === "SpreadElement") err(n, "mut-escape", `${what} spread: its fields would have a second name`);
      else if ((p.type === "CallExpression" || p.type === "NewExpression") && p.callee !== n) { const why = groupArg(p, n, b ? b.t : t); if (why) err(n, "mut-escape", `${what} ${why}`); }
    }
    if (n.type === "CallExpression" || n.type === "NewExpression") {
      const cb = n.callee.type === "Identifier" ? F.bindingOf.get(n.callee) : undefined;
      const held = [...(cb?.fnNode ? capMut.get(cb.fnNode) ?? [] : [])].map((x) => `${x.id}`);
      const clash = (a: string, c: string) => a === c || a.startsWith(`${c}.`) || c.startsWith(`${a}.`);
      for (const a of n.arguments) {
        const ks: string[] = [];
        lent(a, ks);
        if (ks.some((k) => held.some((h) => clash(k, h)))) err(a, "mut-escape", "a group or its field lent twice in one call (two arguments, or an argument of a helper that captures the group): two names would write one container");
        held.push(...ks);
      }
    }
    if (n.type === "MemberExpression" && written(n) && isNamed(typeOf(n.object) ?? ERR, "Mut") && fieldOf(n)) err(n, "mut-field-assign", "an owned field of a group is made once, by mut(...) in the group's literal; it is not assigned or deleted");
  }
  for (const n of all) {
    if ((n.type !== "CallExpression" && n.type !== "MemberExpression") || prelude(n) === "borrow") continue;
    const t = typeOf(n);
    if (t && isNamed(t, "Borrowed")) {
      const pos = position(n, "borrowed");
      if (pos) err(n, "borrowed-escape", `a view of a Borrowed, ${pos}`);
    }
  }
  for (const v of viewOf) {
    const pos = position(v, "view");
    if (pos) err(v, "mut-view", `a view aliasing a Mut buffer, ${pos}; consume it immediately as an argument of a non-retaining intrinsic`);
  }
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
    if (nb && nb.kind !== "prelude" && nb.kind !== "global" && nb.node === n && ["mut", "freeze", "borrow", "snapshot"].includes(n.name)) err(n, "prelude-shadow", `${n.name} names a prelude function; a binding of that name would hide it from the rules of ${n.name}(...)`);
    const st = n.type === "CallExpression" || n.type === "NewExpression" || n.type === "MemberExpression" || n.type === "AwaitExpression" ? typeOf(n) : undefined;
    if (n.type === "MemberExpression" && ((st && isNamed(st, "Mut")) || fieldOf(n)) && !(written(n) && isNamed(typeOf(n.object) ?? ERR, "Mut") && fieldOf(n))) { const pos = position(n, "mut"); if (pos) err(n, "mut-escape", `a Mut member ${pos}`); }
    if (st && isNamed(st, "Mut") && n.type !== "MemberExpression" && prelude(n) !== "mut") err(n, "mut-source", "a Mut comes only from mut(...): this expression gives a Mut<…> that another name may also hold");
    if (nb && nb.node === n && (nb.kind === "const" || nb.kind === "let") && isMutB(nb) && !nb.mutOwned) {
      const p = parent.get(n);
      if (!(p?.type === "VariableDeclarator" && p.id === n && p.init)) err(n, "mut-source", `${nb.name} is typed Mut<…> but not bound to mut(...): another name may also hold it`);
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
    if (pre === "mut") {
      const p = parent.get(n)!;
      const decl = parent.get(p);
      const constInit = (x: Node) => { const q = parent.get(x)!, d = parent.get(q); return q.type === "VariableDeclarator" && q.init === x && q.id.type === "Identifier" && d?.kind === "const"; };
      const lit = (p.type === "Property" || p.type === "ObjectProperty") && p.value === n && !p.computed && !p.shorthand && !p.method && p.kind === "init" ? parent.get(p) : undefined;
      const outer = lit?.type === "ObjectExpression" ? parent.get(lit) : undefined;
      const group = !!outer && outer.type === "CallExpression" && prelude(outer) === "mut" && outer.arguments[0] === lit && constInit(outer);
      if (!(p.type === "VariableDeclarator" && p.init === n && p.id.type === "Identifier" && decl?.kind === "const") && !group) err(n, "mut-bind", "mut(...) must be the initializer of a local const");
      const a = n.arguments[0];
      if (a && !fresh(a)) err(a, "mut-not-fresh", "mut(e) needs a fresh value: a literal, a spread copy, new on an intrinsic, or an intrinsic marked @fresh");
    } else if (pre === "borrow") {
      const p = parent.get(n);
      if (!(p?.type === "YieldExpression" && encl(n) === cellFn && cellFn.generator)) err(n, "borrow-placement", "borrow(x) only as the operand of yield in a generator cell");
    } else if (pre === "state") {
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
  for (const f of fns) flowCheck(f);
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
