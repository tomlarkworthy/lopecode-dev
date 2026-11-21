// How the cost of one call passing FNode[] grows with the union: unions of the first k records of ast-a.ss.ts
// (k = 8, 16, 32, 64, 121), each cell calling f(nodes) 4 times. Median of 5 checkSources runs, minus the same source
// without the calling cell. Run: bun selfhost/flat-ast/probe-union-scaling.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../lite/core.ts";
import { parse } from "../../lite/parse.ts";
const src = readFileSync(join(import.meta.dir, "ast-a.ss.ts"), "utf8");
// the record type declarations, by AST
const decls = parse(src).program.body.filter((s: any) => s.type === "ExportNamedDeclaration" && s.declaration?.type === "TSTypeAliasDeclaration" && s.declaration.typeAnnotation.type === "TSTypeLiteral").map((s: any) => ({ name: s.declaration.id.name, text: src.slice(s.start, s.end) }));
const time = (s: string) => { const ms: number[] = []; checkSources({ cells: s, tsx: false }); for (let i = 0; i < 5; i++) { const t0 = performance.now(); checkSources({ cells: s, tsx: false }); ms.push(performance.now() - t0); } return ms.toSorted((a, b) => a - b)[2]!; };
for (const k of [8, 16, 32, 64, decls.length]) {
  const ds = decls.slice(0, k);
  const ty = ds.map((d: any) => d.text).join("\n") + `\nexport type FNode = ${ds.map((d: any) => d.name).join(" | ")};`;
  const f = `\nexport const f = () => (nodes: FNode[]): number => nodes.length;`;
  const base = time(ty + f), with4 = time(ty + f + `\nexport const g = (f) => (nodes: FNode[]): number => f(nodes) + f(nodes) + f(nodes) + f(nodes);`);
  console.log(`k=${String(k).padStart(3)} records: per call ${((with4 - base) / 4).toFixed(2)} ms`);
}
