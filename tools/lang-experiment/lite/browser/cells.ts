// The parts of the cell runner that need no Observable Runtime: cell shapes read from source, the
// subscription value on(...) builds, and the guard a generator runs under. run.ts (the private
// runner) and the per-cell toolchain both use them; the notebook bundle has no Runtime.
import { parse, type Node } from "../parse.ts";
import * as P from "../../prelude.runtime.ts";
import { specOf, compileCalls, type IslandSpec } from "../island.ts";

export type CellInfo = { name: string; params: { name: string; refTyped: boolean; sourceTyped: boolean }[]; returnsRef: boolean; generator: boolean; compiles: IslandSpec[] };
// on(source, action): a subscription, as a value. The runner keeps running the set a cell returns.
export const SUB = Symbol("sub");
export const on = (source: unknown, act: unknown) => Object.freeze({ [SUB]: true, source, action: act });
export const isSubs = (v: unknown): v is { source: { make: () => any }; action: (x: unknown) => void }[] =>
  Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === "object" && SUB in x);

function isRefCall(e: Node | null | undefined): boolean {
  while (e && (e.type === "ParenthesizedExpression" || e.type === "TSAsExpression")) e = e.expression;
  return !!e && e.type === "CallExpression" && e.callee.type === "Identifier" && e.callee.name === "ref";
}

export function cellsOf(src: string): CellInfo[] {
  const out: CellInfo[] = [];
  const add = (name: string, fn: Node) => {
    const rt = fn.returnType?.typeAnnotation;
    const returnsRef = (rt?.type === "TSTypeReference" && rt.typeName.name === "RefCell") ||
      (fn.body.type === "BlockStatement" ? fn.body.body.some((s: Node) => s.type === "ReturnStatement" && isRefCall(s.argument)) : isRefCall(fn.body));
    out.push({
      name, returnsRef, generator: !!fn.generator,
      compiles: compileCalls(fn).map(specOf).filter((s): s is NonNullable<ReturnType<typeof specOf>> => !!s).map(({ inputs, refs, outputs }) => ({ inputs, refs, outputs })),
      params: fn.params.map((p: Node) => {
        const a = p.typeAnnotation?.typeAnnotation;
        const ref = (n: string) => a?.type === "TSTypeReference" && a.typeName.name === n;
        return { name: p.type === "Identifier" ? p.name : "", refTyped: ref("Ref"), sourceTyped: ref("Source") };
      }),
    });
  };
  for (const st of parse(src).program.body) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : null;
    if (d?.type === "FunctionDeclaration") add(d.id.name, d);
    else if (d?.type === "VariableDeclaration")
      for (const x of d.declarations)
        if (x.id.type === "Identifier" && x.init && /^(Arrow)?FunctionExpression$/.test(x.init.type)) add(x.id.name, x.init);
  }
  return out;
}

export const generatorish = (v: any): v is Generator => !!v && typeof v.next === "function" && typeof v.return === "function";
export function guard(g: Generator) {
  const wrap = (m: "next" | "return" | "throw") => (...a: unknown[]) => {
    P.state.evalDepth++;
    try { return (g[m] as (...x: unknown[]) => unknown)(...a); } finally { P.state.evalDepth--; }
  };
  return { next: wrap("next"), return: wrap("return"), throw: wrap("throw"), [Symbol.iterator]() { return this; } };
}

