// bun census.ts <tree> [--json out]: on the TypeScript AST of <tree>/lite/infer/{ix,ow,md}-*.ss.ts, every function that
// is a cell's inner function or nested in one: its parameter count and its Mut-typed parameters (an annotation that
// is Mut<...> or an alias, through aliases, of Mut<...>). Per file: functions, parameters, Mut parameters, functions
// taking 2 or more Mut parameters, and the run lengths of the tables K,T,V,W,C (ix) / W,X (ow). Also where each
// Mut alias is made (a const initialised by mut(...) whose annotation names it).
import ts from "typescript";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const tree = process.argv[2] ?? "base";
const D = join(import.meta.dir, tree, "lite/infer");
const files = readdirSync(D).filter((f) => /^(ix|ow|md)-.*\.ss\.ts$/.test(f)).sort();
const srcs = new Map(files.map((f) => [f, ts.createSourceFile(f, readFileSync(join(D, f), "utf8"), ts.ScriptTarget.Latest, true)]));
// type aliases across all files: name -> type node
const aliases = new Map<string, ts.TypeNode>();
for (const sf of srcs.values()) sf.forEachChild(function v(n) { if (ts.isTypeAliasDeclaration(n)) aliases.set(n.name.text, n.type); n.forEachChild(v); });
const isMutType = (t: ts.TypeNode | undefined, seen = new Set<string>()): boolean => {
  if (!t) return false;
  if (ts.isParenthesizedTypeNode(t)) return isMutType(t.type, seen);
  if (!ts.isTypeReferenceNode(t) || !ts.isIdentifier(t.typeName)) return false;
  const n = t.typeName.text;
  if (n === "Mut") return true;
  if (seen.has(n) || !aliases.has(n)) return false;
  seen.add(n);
  return isMutType(aliases.get(n), seen);
};
const typeName = (t: ts.TypeNode | undefined) => (t ? t.getText() : "");
type Fn = { file: string; line: number; cell: string; params: string[]; mutParams: string[]; muts: string[] };
const fns: Fn[] = [];
const makers: string[] = [];
for (const [f, sf] of srcs) {
  // a cell: export const name = (deps) => <inner function or value>; the deps list is not counted (it is the cell graph)
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      const cell = d.name.getText();
      const outer = d.initializer;
      if (!outer || !(ts.isArrowFunction(outer) || ts.isFunctionExpression(outer))) continue;
      const visit = (n: ts.Node) => {
        if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n)) && n !== outer) {
          const ps = n.parameters.map((p) => p.name.getText());
          const mp = n.parameters.filter((p) => isMutType(p.type)).map((p) => `${p.name.getText()}: ${typeName(p.type)}`);
          fns.push({ file: f, line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, cell, params: ps, mutParams: mp, muts: n.parameters.filter((p) => isMutType(p.type)).map((p) => p.name.getText()) });
        }
        if (ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText() === "mut")
          makers.push(`${f}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1} ${cell} ${n.name.getText()}${n.type ? ": " + n.type.getText() : ""}`);
        n.forEachChild(visit);
      };
      outer.forEachChild(visit);
    }
  }
}
// the knot types: function types inside type aliases (IxK, OwK) count as signatures too
const sigs: Fn[] = [];
for (const [f, sf] of srcs) sf.forEachChild(function v(n) {
  if (ts.isFunctionTypeNode(n)) sigs.push({ file: f, line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, cell: "(type)", params: n.parameters.map((p) => p.name.getText()), mutParams: n.parameters.filter((p) => isMutType(p.type)).map((p) => `${p.name.getText()}: ${typeName(p.type)}`), muts: n.parameters.filter((p) => isMutType(p.type)).map((p) => p.name.getText()) });
  n.forEachChild(v);
});
const fam = (f: string) => f.slice(0, 2);
const rows: string[] = [];
const sum = (xs: Fn[]) => ({ fns: xs.length, params: xs.reduce((s, x) => s + x.params.length, 0), mutParams: xs.reduce((s, x) => s + x.muts.length, 0), multi: xs.filter((x) => x.muts.length >= 2).length, multiParams: xs.filter((x) => x.muts.length >= 2).reduce((s, x) => s + x.muts.length, 0) });
rows.push("file                 fns  params  mutParams  fns>=2Mut  mutParamsInThose");
for (const f of files) { const s = sum(fns.filter((x) => x.file === f)); rows.push(`${f.padEnd(20)} ${String(s.fns).padStart(4)} ${String(s.params).padStart(7)} ${String(s.mutParams).padStart(10)} ${String(s.multi).padStart(10)} ${String(s.multiParams).padStart(17)}`); }
for (const g of ["ix", "ow", "md"]) { const s = sum(fns.filter((x) => fam(x.file) === g)); rows.push(`${("all " + g).padEnd(20)} ${String(s.fns).padStart(4)} ${String(s.params).padStart(7)} ${String(s.mutParams).padStart(10)} ${String(s.multi).padStart(10)} ${String(s.multiParams).padStart(17)}`); }
const all = sum(fns); rows.push(`${"all".padEnd(20)} ${String(all.fns).padStart(4)} ${String(all.params).padStart(7)} ${String(all.mutParams).padStart(10)} ${String(all.multi).padStart(10)} ${String(all.multiParams).padStart(17)}`);
const ss = sum(sigs); rows.push(`function types (knots): ${ss.fns} signatures, ${ss.params} params, ${ss.mutParams} Mut params, ${ss.multi} with >=2 Mut (${ss.multiParams} params)`);
// which Mut param sets occur, by names
const sets = new Map<string, number>();
for (const x of fns) if (x.muts.length >= 2) sets.set(x.muts.join(","), (sets.get(x.muts.join(",")) ?? 0) + 1);
rows.push("Mut parameter sets of 2+ (names, in order): " + [...sets].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} x${n}`).join("; "));
rows.push(`mut(...) bindings: ${makers.length}`);
for (const m of makers.filter((m) => /: (Ix|Ow|Md)[A-Za-z]*$/.test(m) || / (T|V|W|C|X|caps)(:|$)/.test(m))) rows.push("  " + m);
console.log(rows.join("\n"));
const out = process.argv.indexOf("--json");
if (out > 0) writeFileSync(process.argv[out + 1]!, JSON.stringify({ fns, sigs, makers }, null, 1));
