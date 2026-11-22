// FROZEN FIXTURE (2026-11-22, switch4): lite/facts.ts as it was before the rg, cp and tc cells were switched on.
// Only the differentials and tests compare against it; nothing shipped imports it, and the build does not reach it.
// What the compiler and the in-page compile need to know about a cell, read from its function node:
// parameter names and whether each is typed State<T> or Events<T>, whether it returns state(...), whether it
// is a generator, and its compile(...) calls. The checker computes these from its own parse (LiteCell
// .facts), so a caller holding a check result does not parse the cells again; cellsOf parses source.
import { parse, kids, type Node } from "./parse.ts";
import { specOf, compileCalls, type IslandSpec } from "./island.ts";

// span: the cell's statement in the source that was parsed, [start, end)
export type CellInfo = { name: string; span?: [number, number]; params: { name: string; refTyped: boolean; eventsTyped: boolean; boundary?: { shape: unknown; ref: boolean } }[]; returnsRef: boolean; generator: boolean; compiles: IslandSpec[] };

// The calls in fn of the prelude function `name`: the callee is that bare name and no parameter or
// declaration between the call and the cell binds it. A property key, a type member or a local of that name is not one.
export const preludeCalls = (fn: Node, name: string): Set<Node> =>
  freeUses(fn, name, (n) => n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === name);
// The references in fn to the global `name` that no parameter or declaration binds
export const globalRefs = (fn: Node, name: string): Set<Node> =>
  freeUses(fn, name, (n, p) => n.type === "Identifier" && n.name === name && !(p && !p.computed &&
    ((p.type === "MemberExpression" && p.property === n) || (/^(Property|MethodDefinition|PropertyDefinition)$/.test(p.type) && p.key === n && p.value !== n))) &&
    !(p && /^(Labeled|Break|Continue)Statement$/.test(p.type)));
// the nodes in fn that pick accepts, outside every scope in which `name` is bound
function freeUses(fn: Node, name: string, pick: (n: Node, parent: Node | null) => boolean): Set<Node> {
  const binds = (p: Node | null): boolean => !!p && (p.type === "Identifier" ? p.name === name
    : p.type === "ObjectPattern" ? p.properties.some((x: Node) => binds(x.type === "RestElement" ? x.argument : x.value))
    : p.type === "ArrayPattern" ? p.elements.some(binds)
    : p.type === "AssignmentPattern" ? binds(p.left) : p.type === "RestElement" ? binds(p.argument) : false);
  const declares = (st: Node): boolean => st.type === "VariableDeclaration" ? st.declarations.some((d: Node) => binds(d.id))
    : /^(Function|Class)Declaration$/.test(st.type) && st.id?.name === name;
  const out = new Set<Node>();
  const walk = (n: Node, parent: Node | null) => {
    if (/^(Arrow)?Function(Expression|Declaration)$/.test(n.type) && (n.params.some(binds) || (n.type === "FunctionExpression" && n.id?.name === name))) return;
    if ((n.type === "BlockStatement" || n.type === "StaticBlock") && n.body.some(declares)) return;
    if (n.type === "SwitchStatement" && n.cases.some((c: Node) => c.consequent.some(declares))) return;
    if (n.type === "CatchClause" && binds(n.param)) return;
    if (/^For(In|Of)?Statement$/.test(n.type) && [n.init, n.left].some((x) => x?.type === "VariableDeclaration" && declares(x))) return;
    if (pick(n, parent)) out.add(n);
    kids(n).forEach((k) => walk(k, n));
  };
  walk(fn, null);
  return out;
}

export function factsOf(name: string, fn: Node, stmt?: Node): CellInfo {
  const stateCalls = preludeCalls(fn, "state");
  const isRefCall = (e: Node | null | undefined): boolean => {
    while (e && (e.type === "ParenthesizedExpression" || e.type === "TSAsExpression")) e = e.expression;
    return !!e && stateCalls.has(e);
  };
  const rt = fn.returnType?.typeAnnotation;
  const returnsRef = (rt?.type === "TSTypeReference" && rt.typeName.name === "StateCell") ||
    (fn.body.type === "BlockStatement" ? fn.body.body.some((s: Node) => s.type === "ReturnStatement" && isRefCall(s.argument)) : isRefCall(fn.body));
  return {
    name, ...(stmt ? { span: [stmt.start, stmt.end] as [number, number] } : {}), returnsRef, generator: !!fn.generator,
    compiles: compileCalls(fn).map(specOf).filter((s): s is NonNullable<ReturnType<typeof specOf>> => !!s).map(({ inputs, refs, outputs }) => ({ inputs, refs, outputs })),
    params: fn.params.map((p: Node) => {
      const a = p.typeAnnotation?.typeAnnotation;
      const ref = (n: string) => a?.type === "TSTypeReference" && a.typeName.name === n;
      return { name: p.type === "Identifier" ? p.name : "", refTyped: ref("State"), eventsTyped: ref("Events") };
    }),
  };
}

export function cellsOf(src: string): CellInfo[] {
  const out: CellInfo[] = [];
  for (const st of parse(src).program.body) {
    const add = (name: string, fn: Node) => out.push(factsOf(name, fn, st));
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
    if (d?.type === "FunctionDeclaration") add(d.id.name, d);
    else if (d?.type === "VariableDeclaration")
      for (const x of d.declarations)
        if (x.id.type === "Identifier" && x.init && /^(Arrow)?FunctionExpression$/.test(x.init.type)) add(x.id.name, x.init);
  }
  return out;
}

