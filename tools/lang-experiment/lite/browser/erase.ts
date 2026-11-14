// Type erasure over the acorn-typescript tree, for the browser where Bun.Transpiler is absent.
// Covers what RULES.md allows in cells.ts: annotations, type parameters and arguments, type
// aliases, interfaces, `import type`, `as const`, optional-parameter `?`, and `export`.
import { parse, type Node } from "../parse.ts";

const TYPE_KEYS = new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);

export function erase(src: string): string {
  const P = parse(src);
  const cuts: [number, number][] = [];
  const walk = (n: Node) => {
    if (n.type === "TSTypeAliasDeclaration" || n.type === "TSInterfaceDeclaration" || n.type === "TSDeclareFunction" ||
      (n.type === "ImportDeclaration" && n.importKind === "type") ||
      (n.type === "ExportNamedDeclaration" && n.declaration && /^TS/.test(n.declaration.type))) {
      cuts.push([n.start, n.end]);
      return;
    }
    if (n.type === "ExportNamedDeclaration" && n.declaration) cuts.push([n.start, n.declaration.start]);
    if (n.type === "TSAsExpression" || n.type === "TSSatisfiesExpression") {
      cuts.push([n.expression.end, n.end]);
      walk(n.expression);
      return;
    }
    if (n.type === "Identifier" && n.optional) {
      const q = src.indexOf("?", n.start + n.name.length);
      if (q >= 0) cuts.push([q, q + 1]);
    }
    for (const k in n) {
      if (k === "loc" || k === "start" || k === "end" || k === "type") continue;
      const v = n[k];
      const each = (x: any) => {
        if (!x || typeof x.type !== "string") return;
        if (TYPE_KEYS.has(k)) cuts.push([x.start, x.end]);
        else walk(x);
      };
      if (Array.isArray(v)) v.forEach(each);
      else each(v);
    }
  };
  walk(P.program);
  cuts.sort((a, b) => a[0] - b[0]);
  let out = "", at = 0;
  for (const [s, e] of cuts) {
    if (s < at) { at = Math.max(at, e); continue; }
    out += src.slice(at, s);
    at = e;
  }
  return out + src.slice(at);
}
