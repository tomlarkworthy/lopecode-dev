// action-capture: the body of an action(...) may not use a value that depends on state. A cell's
// value parameters that are state-dependent (the caller says which, and why) taint the cell; a const,
// let or function in the cell whose initialiser or body uses a tainted name is tainted too. Any use of
// a tainted name inside an action body is reported. Names the action declares itself (its parameters
// and locals) are not the cell's, whatever they are called.
import { kids, isFn, type Node } from "./parse.ts";

export type Capture = { node: Node; name: string; why: string };

const isAction = (n: Node) => n.type === "CallExpression" && n.callee?.type === "Identifier" && n.callee.name === "action";

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
    if (isAction(n)) return;
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
    if (isAction(n)) {
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

export const captureMessage = (c: Capture) => c.why.startsWith("capability ")
  ? `${c.name} is a capability, so an action using it would make the stored state depend on something the calls do not record; take the value as an argument of the action`
  : `${c.name} depends on state (${c.why}), so an action using it would act on the value from the cell's last run; read the ref inside the action with read(...), or pass the value to the action when it is called`;
