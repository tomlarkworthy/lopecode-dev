// Classifies the top-level consts and the statements of `export default function define` in a compiled
// lopecode module, with acorn. Shared by fold-suite.ts and merge-cells.ts.
import * as acorn from "acorn";

export type Stmt = { kind: "module" | "import" | "cell" | "other"; name?: string | null; pid?: string; module?: string; start: number; end: number; text: string };
export type Const = { start: number; end: number; text: string };

export function analyse(src: string) {
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" }) as any;
  const consts = new Map<string, Const>();
  let define: any;
  for (const node of ast.body) {
    if (node.type === "VariableDeclaration") for (const d of node.declarations) consts.set(d.id.name, { start: node.start, end: node.end, text: src.slice(node.start, node.end) });
    if (node.type === "ExportDefaultDeclaration") define = node;
  }
  const str = (n: any) => (n?.type === "Literal" ? n.value : undefined);
  const stmts: Stmt[] = define.declaration.body.body.map((s: any): Stmt => {
    const base = { start: s.start, end: s.end, text: src.slice(s.start, s.end) };
    const call = s.type === "ExpressionStatement" && s.expression.type === "CallExpression" ? s.expression : null;
    const callee = call?.callee;
    if (callee?.type === "MemberExpression" && callee.object.name === "main" && callee.property.name === "define") {
      const name = str(call.arguments[0]);
      // exporter-3 writes `main.define("module X", async () => …)`; cell-map-2's hand-written form passes `[]` inputs too
      const noInputs = call.arguments.length === 3 && call.arguments[1]?.type === "ArrayExpression" && call.arguments[1].elements.length === 0;
      if ((call.arguments.length === 2 || noInputs) && name?.startsWith("module ")) return { ...base, kind: "module", name };
      const deps = call.arguments[1];
      if (deps?.type === "ArrayExpression" && str(deps.elements[1]) === "@variable") return { ...base, kind: "import", name, module: str(deps.elements[0]) };
    }
    if (callee?.type === "Identifier" && callee.name === "$def") return { ...base, kind: "cell", pid: str(call.arguments[0]), name: str(call.arguments[1]) ?? null };
    return { ...base, kind: "other" };
  });
  return { consts, stmts, exportStart: define.start };
}
