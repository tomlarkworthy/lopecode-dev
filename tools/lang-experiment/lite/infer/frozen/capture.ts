// FROZEN FIXTURE (2026-11-21, switch3): the TypeScript checker as it was before checkSources ran the cells. Read by
// lite/infer/diff.ts, lite/infer/complete-diff.ts, lite/syntax.test.ts and selfhost/checker-shape, checker-survey;
// nothing shipped imports it, and the build does not reach it.
// action-capture: the body of an action(...) may not use a value that depends on state. A cell's
// value parameters that are state-dependent (the caller says which, and why) taint the cell; a const,
// let or function in the cell whose initialiser or body uses a tainted name is tainted too. Any use of
// a tainted name inside an action body is reported. Names the action declares itself (its parameters
// and locals) are not the cell's, whatever they are called.
import { kids, isFn, type Node } from "./ts/parse.ts";
import type { Checker, Binding } from "./infer.ts";
import { isNamed, unwrap } from "../../types.ts";

export type Capture = { node: Node; name: string; why: string; opaque?: boolean };

const isActionCall = (n: Node) => n.type === "CallExpression" && n.callee?.type === "Identifier" && n.callee.name === "action";

// identifier nodes that read a binding (not property names, keys, labels or JSX attribute names)
function refs(n: Node, out: Node[] = [], parent: Node | null = null, key = ""): Node[] {
  if (n.type === "Identifier") {
    if (parent?.type === "MemberExpression" && key === "property" && !parent.computed) return out;
    if ((parent?.type === "Property" || parent?.type === "MethodDefinition" || parent?.type === "PropertyDefinition") && key === "key" && !parent.computed) return out;
    if (parent?.type === "LabeledStatement" || parent?.type === "BreakStatement" || parent?.type === "ContinueStatement") return out;
    out.push(n);
    return out;
  }
  if (n.type === "JSXIdentifier") return out;
  for (const k in n) {
    if (k === "loc" || k === "typeAnnotation" || k === "returnType" || k === "typeParameters" || k === "typeArguments") continue;
    const v = n[k];
    if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === "string") refs(x, out, n, k); }
    else if (v && typeof v === "object" && typeof v.type === "string") refs(v, out, n, k);
  }
  return out;
}

// names bound by a pattern
function bound(p: Node | null | undefined, out: Set<string>) {
  if (!p) return out;
  switch (p.type) {
    case "Identifier": out.add(p.name); break;
    case "ObjectPattern": for (const q of p.properties) bound(q.type === "RestElement" ? q.argument : q.value, out); break;
    case "ArrayPattern": for (const q of p.elements) bound(q, out); break;
    case "RestElement": bound(p.argument, out); break;
    case "AssignmentPattern": bound(p.left, out); break;
    case "TSParameterProperty": bound(p.parameter, out); break;
  }
  return out;
}

// every name declared anywhere inside fn (its parameters, locals, nested functions' names and parameters)
function declaredIn(fn: Node): Set<string> {
  const out = new Set<string>();
  for (const p of fn.params ?? []) bound(p, out);
  (function walk(n: Node) {
    if (n.type === "VariableDeclarator") bound(n.id, out);
    if ((n.type === "FunctionDeclaration" || n.type === "FunctionExpression") && n.id) out.add(n.id.name);
    if (isFn(n)) for (const p of n.params ?? []) bound(p, out);
    if (n.type === "CatchClause") bound(n.param, out);
    if (n.type === "ClassDeclaration" && n.id) out.add(n.id.name);
    for (const k of kids(n)) walk(k);
  })(fn.body);
  return out;
}

export function captures(cellFn: Node, tainted: Map<string, string>): Capture[] {
  const taint = new Map(tainted);
  // locals of the cell, outside any action body, computed from a tainted name (to a fixpoint)
  const locals: { names: Set<string>; from: Node }[] = [];
  (function walk(n: Node) {
    if (isActionCall(n)) return;
    if (n.type === "VariableDeclarator" && n.init) locals.push({ names: bound(n.id, new Set()), from: n.init });
    if (n.type === "FunctionDeclaration" && n.id) locals.push({ names: new Set([n.id.name]), from: n.body });
    for (const k of kids(n)) walk(k);
  })(cellFn.body);
  for (let changed = true; changed; ) {
    changed = false;
    for (const l of locals) {
      if ([...l.names].every((x) => taint.has(x))) continue;
      const hit = refs(l.from).find((r) => taint.has(r.name));
      if (!hit) continue;
      for (const x of l.names) if (!taint.has(x)) { taint.set(x, `computed from ${hit.name}`); changed = true; }
    }
  }
  if (!taint.size) return [];
  const out: Capture[] = [];
  (function walk(n: Node) {
    if (isActionCall(n)) {
      const f = n.arguments?.[0];
      if (f && isFn(f)) {
        const own = declaredIn(f);
        const seen = new Set<string>();
        for (const r of refs(f.body)) if (taint.has(r.name) && !own.has(r.name) && !seen.has(r.name)) { seen.add(r.name); out.push({ node: r, name: r.name, why: taint.get(r.name)! }); }
        for (const p of f.params ?? []) for (const r of refs(p)) if (taint.has(r.name) && !own.has(r.name)) out.push({ node: r, name: r.name, why: taint.get(r.name)! });
      }
      return;
    }
    for (const k of kids(n)) walk(k);
  })(cellFn.body);
  return out;
}

// The same rule by binding, default-deny: from outside itself an action body may use only a prelude name, a global,
// a cell input that holds no state, or a const or function whose own free references pass. A let, a catch binding,
// a Mut, or a parameter of an enclosing function does not (a caller may pass it a state-dependent value).
// DELIBERATE CHANGE (2026-11-23, m1 step 1): bodies, the functions checked: the action bodies, or memo's functions
// (the cells' owCapturesIn)
export function opaqueCaptures(cellFn: Node, ch: Checker, tainted: Map<string, string>, skip: Set<Node>, bodies: Node[] = [...ch.actionBodies]): Capture[] {
  if (!bodies.length) return [];
  const F = ch.facts, parent = new Map<Node, Node>(), ids: Node[] = [], comps: Node[] = [];
  (function walk(n: Node, p: Node | null) {
    if (p) parent.set(n, p);
    if (n.type === "Identifier") ids.push(n);
    // a component name has no binding in the facts, so it is not followed
    if (p?.type === "JSXOpeningElement" && p.name === n && (n.type !== "JSXIdentifier" || /^[A-Z]/.test(n.name))) comps.push(n);
    for (const c of kids(n)) walk(c, n);
  })(cellFn, null);
  const within = (x: Node, f: Node) => x.start >= f.start && x.end <= f.end;
  const local = (b: Binding) => b.kind !== "prelude" && b.kind !== "global";
  const free = (span: Node[]) => ids.flatMap((r) => {
    const b = F.bindingOf.get(r);
    return b && local(b) && b.node !== r && span.some((s) => within(r, s)) && !span.some((s) => within(b.node, s)) ? [b] : [];
  });
  const bad = new Map<Binding, string | null>(), visiting = new Set<Binding>();
  const why = (b: Binding): string | null => {
    if (!local(b)) return null;
    if (b.cellParam) return tainted.get(b.name) ?? null;
    if (bad.has(b)) return bad.get(b)!;
    if (visiting.has(b)) return null; // a function that calls itself: decided by its other references
    visiting.add(b);
    const w = why1(b);
    visiting.delete(b);
    if (w || !visiting.size) bad.set(b, w);
    return w;
  };
  // DELIBERATE CHANGE (2026-11-25, open, S6.9): a parameter of a callback that a built-in calls before it returns (not
  // @retains; State.update's function is given the state) is computed from the receiver and the call's other
  // arguments, and from the callback when its declared type is the callback's result's (reduce's accumulator)
  const cbSpan = (b: Binding): Node[] | null => {
    let f = parent.get(b.node);
    while (f && !isFn(f)) f = parent.get(f);
    const p = f && parent.get(f);
    if (!f || !p || p.type !== "CallExpression" || !p.arguments.includes(f) || p.callee.type !== "MemberExpression") return null;
    const sig = F.calls.get(p)?.sig, fl = sig?.flags, d = sig && (sig.decl ?? sig), i = p.arguments.indexOf(f);
    const dp = d && (i < d.ps.length ? d.ps[i].t : d.rest), cs = dp ? ch.reg.callSigs(dp)[0] : undefined;
    const st = F.types.get(p.callee.object);
    if (!fl?.intrinsic || fl.retains || !cs || (st && ch.um(st).some((m) => isNamed(unwrap(m), "State")))) return null;
    const k = f.params.findIndex((q: Node) => within(b.node, q)), fed = cs.ps[k]?.t;
    const acc = !!fed && fed.k === "tv" && cs.ret.k === "tv" && fed.n === cs.ret.n;
    return [p.callee.object, ...p.arguments.filter((a: Node) => a !== f || acc)];
  };
  const why1 = (b: Binding): string | null => {
    const cb = b.kind === "param" ? cbSpan(b) : null;
    if (b.kind === "param" && !cb) return "is a parameter of an enclosing function, so a caller may pass it a value that depends on state";
    if (b.kind === "let") return "is a let or a catch binding, so its value is not fixed where it is declared";
    if (b.mutOwned) return "is a Mut, which the cell may change after the action is made";
    let span: Node[] | null = cb ?? (b.fnNode ? [b.fnNode] : null);
    if (!span) {
      let d = parent.get(b.node);
      while (d && d.type !== "VariableDeclarator") d = parent.get(d);
      const decl = d && parent.get(d), loop = decl && parent.get(decl);
      span = loop?.type === "ForOfStatement" && loop.left === decl ? [decl, loop.right] : d?.init ? [d] : null;
    }
    if (!span) return "is bound where the checker does not follow its value";
    if (comps.some((j) => span!.some((s) => within(j, s)))) return "is computed from a JSX component, which the checker does not follow";
    for (const c of free(span)) { const w = why(c); if (w) return `is computed from ${c.name}, which ${w.startsWith("is ") ? w : `depends on state (${w})`}`; }
    return null;
  };
  const out: Capture[] = [], seen = new Set<string>();
  for (const r of ids) {
    const b = F.bindingOf.get(r);
    if (skip.has(r) || !b || !local(b) || b.node === r) continue;
    const a = bodies.find((a) => within(r, a) && !within(b.node, a));
    const w = a && why(b);
    if (!w || seen.has(`${a.start}:${b.id}`)) continue;
    seen.add(`${a.start}:${b.id}`);
    out.push(b.cellParam ? { node: r, name: b.name, why: w } : { node: r, name: b.name, why: w, opaque: true });
  }
  // DELIBERATE CHANGE (2026-11-23, e1): the message names the fix for a component (B1)
  for (const j of comps) if (bodies.some((a) => within(j, a))) out.push({ node: j, name: `<${j.name ?? "component"}>`, why: "is a JSX component, which the checker does not follow", fix: "an action body may not use one; make the element in a cell that reads the state, and let the action change only the state", opaque: true });
  return out;
}
