// Code lines per top-level declaration of a TypeScript file: the lines holding a token (comments are not tokens),
// from acorn's onToken with the TS plugin, within each statement's span on the file's AST.
// Run: bun lines.ts <file> ...   (prints each cell's code lines, and the file's total)
import * as acorn from "./base/lite/node_modules/acorn/dist/acorn.mjs";
import { tsPlugin } from "./base/lite/node_modules/@sveltejs/acorn-typescript/index.js";
import { readFileSync } from "node:fs";

const TS = acorn.Parser.extend(tsPlugin() as any);
export function codeLines(src: string): { decls: { name: string; kind: string; lines: number }[]; total: number } {
  const tokenLines: number[] = [];
  const ast: any = TS.parse(src, { ecmaVersion: "latest", sourceType: "module", locations: true, onToken: (t: any) => { if (t.type.label !== "eof") tokenLines.push(t.loc.start.line, t.loc.end.line); } } as any);
  const linesIn = (a: number, b: number) => new Set(tokenLines.filter((l) => l >= a && l <= b)).size;
  const decls = ast.body.map((st: any) => {
    const d = st.type === "ExportNamedDeclaration" && st.declaration ? st.declaration : st;
    const name = d.type === "VariableDeclaration" ? d.declarations.map((x: any) => x.id.name).join(",") : d.id?.name ?? d.type;
    const kind = d.type === "VariableDeclaration" || d.type === "FunctionDeclaration" ? "cell" : d.type === "TSTypeAliasDeclaration" || d.type === "TSInterfaceDeclaration" ? "type" : d.type;
    return { name, kind, lines: linesIn(st.loc.start.line, st.loc.end.line) };
  });
  return { decls, total: new Set(tokenLines).size };
}
if (import.meta.main) for (const f of process.argv.slice(2)) {
  const { decls, total } = codeLines(readFileSync(f, "utf8"));
  const cells = decls.filter((d) => d.kind === "cell");
  console.log(`${f}: ${total} code lines; ${cells.length} cells (${cells.reduce((s, d) => s + d.lines, 0)} lines), ${decls.length - cells.length} type declarations (${decls.filter((d) => d.kind !== "cell").reduce((s, d) => s + d.lines, 0)} lines)`);
  console.log(`  cells by size: ${cells.toSorted((a, b) => b.lines - a.lines).map((d) => `${d.name} ${d.lines}`).join(", ")}`);
}
