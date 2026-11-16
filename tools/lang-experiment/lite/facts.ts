// What the compiler and the in-page compile need to know about a cell, read from its function node:
// parameter names and whether each is typed Ref<T> or Events<T>, whether it returns a ref, whether it
// is a generator, and its compile(...) calls. The checker computes these from its own parse (LiteCell
// .facts), so a caller holding a check result does not parse the cells again; cellsOf parses source.
import { parse, type Node } from "./parse.ts";
import { specOf, compileCalls, type IslandSpec } from "./island.ts";

// span: the cell's statement in the source that was parsed, [start, end)
export type CellInfo = { name: string; span?: [number, number]; params: { name: string; refTyped: boolean; eventsTyped: boolean; boundary?: { shape: unknown; ref: boolean; view?: boolean } }[]; returnsRef: boolean; generator: boolean; compiles: IslandSpec[] };
function isRefCall(e: Node | null | undefined): boolean {
  while (e && (e.type === "ParenthesizedExpression" || e.type === "TSAsExpression")) e = e.expression;
  return !!e && e.type === "CallExpression" && e.callee.type === "Identifier" && e.callee.name === "ref";
}

export function factsOf(name: string, fn: Node, stmt?: Node): CellInfo {
  const rt = fn.returnType?.typeAnnotation;
  const returnsRef = (rt?.type === "TSTypeReference" && rt.typeName.name === "RefCell") ||
    (fn.body.type === "BlockStatement" ? fn.body.body.some((s: Node) => s.type === "ReturnStatement" && isRefCall(s.argument)) : isRefCall(fn.body));
  return {
    name, ...(stmt ? { span: [stmt.start, stmt.end] as [number, number] } : {}), returnsRef, generator: !!fn.generator,
    compiles: compileCalls(fn).map(specOf).filter((s): s is NonNullable<ReturnType<typeof specOf>> => !!s).map(({ inputs, refs, outputs }) => ({ inputs, refs, outputs })),
    params: fn.params.map((p: Node) => {
      const a = p.typeAnnotation?.typeAnnotation;
      const ref = (n: string) => a?.type === "TSTypeReference" && a.typeName.name === n;
      return { name: p.type === "Identifier" ? p.name : "", refTyped: ref("Ref"), eventsTyped: ref("Events") };
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

