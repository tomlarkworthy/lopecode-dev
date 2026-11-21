// The variables and imports of a notebook module block (the exporter's `export default function define`), read
// from its parse: each `$def(pid, name, inputs, _fn)` call with the text of `const _fn = ...`, and each
// `main.define(name, ["module M", "@variable"], (_, v) => v.import(remote?, local, _))`.
import * as acorn from "acorn";

export type ModuleVar = { pid: string; name: string | null; inputs: string[]; definition: string };
export type ModuleImport = { from: string; remote: string; local: string };

const lit = (n: any) => (n?.type === "Literal" ? n.value : undefined);
const strings = (n: any): string[] | undefined => (n?.type === "ArrayExpression" && n.elements.every((e: any) => typeof lit(e) === "string") ? n.elements.map(lit) : undefined);

export function moduleJs(src: string): { variables: ModuleVar[]; imports: ModuleImport[] } {
  const ast: any = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });
  const consts = new Map<string, string>();
  for (const st of ast.body) if (st.type === "VariableDeclaration") for (const d of st.declarations) if (d.id.type === "Identifier" && d.init) consts.set(d.id.name, src.slice(d.init.start, d.init.end));
  const variables: ModuleVar[] = [], imports: ModuleImport[] = [];
  const walk = (n: any) => {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "CallExpression") {
      const [a0, a1, a2, a3] = n.arguments;
      if (n.callee.type === "Identifier" && n.callee.name === "$def" && a3?.type === "Identifier") {
        variables.push({ pid: lit(a0), name: lit(a1) ?? null, inputs: strings(a2) ?? [], definition: consts.get(a3.name)! });
      } else if (n.callee.type === "MemberExpression" && n.callee.property.name === "define" && strings(a1)?.[1] === "@variable" && strings(a1)![0].startsWith("module ")) {
        const call = a2?.body;
        if (call?.type === "CallExpression" && call.callee.property?.name === "import") {
          const args = call.arguments.map(lit).filter((x: unknown) => typeof x === "string");
          imports.push({ from: strings(a1)![0].slice(7), remote: args[0], local: args[args.length - 1] });
        }
      }
    }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === "string") walk(v); }
  };
  for (const st of ast.body) if (st.type === "ExportDefaultDeclaration") walk(st.declaration);
  return { variables, imports };
}

// the message of the stand-in the standard compiler gives a cell that does not parse: a definition that throws
// Object.assign(new SyntaxError(message), {_sourceExpression: ...}); null for any other definition
export function syntaxStub(definition: string): string | null {
  let msg: string | null = null;
  const walk = (n: any) => {
    if (msg !== null || !n || typeof n.type !== "string") return;
    const a = n.type === "ThrowStatement" ? n.argument : null;
    if (a?.type === "CallExpression" && a.callee.type === "MemberExpression" && a.callee.object.name === "Object" && a.callee.property.name === "assign" &&
      a.arguments[0]?.type === "NewExpression" && a.arguments[0].callee.name === "SyntaxError" && a.arguments[1]?.properties?.some((p: any) => p.key?.name === "_sourceExpression")) {
      msg = String(a.arguments[0].arguments[0]?.value);
      return;
    }
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === "string") walk(v); }
  };
  walk(acorn.parseExpressionAt(definition, 0, { ecmaVersion: "latest" }));
  return msg;
}
