// bun f-pop.ts: the population rule F acts on, over the K3 corpus (AST). (1) functions with no result annotation that
// return a local of their own made fresh (array/object literal, new, or a Mut<…> annotation): their inferred result is
// Mut<…>. (2) cells (top-level const arrows) with a parameter annotated by a type containing a function type: a
// cell-to-cell check where F may reject a producer whose inferred type has Mut beneath a function.
import ts from "typescript";
import { readFileSync } from "node:fs";
import { Glob } from "bun";
const ROOT = new URL("../../../", import.meta.url).pathname;
const files = [...new Glob("lite/**/*.ss.ts").scanSync(ROOT)].filter((f) => !f.includes(".scratch"))
  .concat([...new Glob("lite/notebook/examples/*.{ts,tsx}").scanSync(ROOT)], [...new Glob("lite/soundscript/spec-*.ts").scanSync(ROOT)]);
const fresh = (d: ts.VariableDeclaration) => (d.type ? ts.isTypeReferenceNode(d.type) && ts.isIdentifier(d.type.typeName) && d.type.typeName.text === "Mut"
  : !!d.initializer && (ts.isArrayLiteralExpression(d.initializer) || ts.isObjectLiteralExpression(d.initializer) || ts.isNewExpression(d.initializer)));
let fns = 0, mutRet = 0, cells = 0, fnInputs = 0; const ex: string[] = [], ex2: string[] = [];
const hasFnType = (t: ts.Node): boolean => ts.isFunctionTypeNode(t) || !!ts.forEachChild(t, (c) => (hasFnType(c) ? true : undefined));
for (const file of files) {
  const sf = ts.createSourceFile(file, readFileSync(ROOT + file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const ln = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  const v = (n: ts.Node): void => {
    if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n)) && !n.type) {
      fns++;
      const own = new Set<string>();
      const rets: ts.Expression[] = [];
      const w = (m: ts.Node): void => {
        if (m !== n && (ts.isArrowFunction(m) || ts.isFunctionExpression(m) || ts.isFunctionDeclaration(m))) return;
        if (ts.isVariableDeclaration(m) && ts.isIdentifier(m.name) && fresh(m)) own.add(m.name.text);
        if (ts.isReturnStatement(m) && m.expression) rets.push(m.expression);
        ts.forEachChild(m, w);
      };
      ts.forEachChild(n, w);
      if (ts.isArrowFunction(n) && !ts.isBlock(n.body)) rets.push(n.body);
      if (rets.some((r) => ts.isIdentifier(r) && own.has(r.text))) { mutRet++; if (ex.length < 6) ex.push(`${file}:${ln(n)}`); }
    }
    ts.forEachChild(n, v);
  };
  v(sf);
  for (const st of sf.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
    if (!d.initializer || !ts.isArrowFunction(d.initializer)) continue;
    cells++;
    if (d.initializer.parameters.some((p) => p.type && hasFnType(p.type))) { fnInputs++; if (ex2.length < 6) ex2.push(`${file}:${ln(d)}`); }
  }
}
console.log(`functions without a result annotation ${fns}; returning an own fresh local (inferred Mut result) ${mutRet}`);
console.log("  e.g. " + ex.join(" "));
console.log(`top-level arrow cells ${cells}; with a function-typed annotated input ${fnInputs}`);
console.log("  e.g. " + ex2.join(" "));
