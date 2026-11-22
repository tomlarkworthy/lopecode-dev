// bun k3-ta.ts: over the K3 corpus, locals made by `new <TypedArray>(…)` / `<TypedArray>.from|of(…)` / `new ArrayBuffer(…)`
// whose name is later a call argument, returned (return x / arrow body x), a literal element, or yielded. Under R4 each such
// use with a non-Mut target is a static error (or a slice()). AST walk; targets' parameter types are not resolved.
import ts from "typescript";
import { readFileSync } from "node:fs";
import { Glob } from "bun";
import { TYPED_ARRAYS } from "../../../lite/intrinsics.ts";
const ROOT = new URL("../../../", import.meta.url).pathname;
const files = [...new Glob("lite/**/*.ss.ts").scanSync(ROOT)].filter((f) => !f.includes(".scratch"))
  .concat([...new Glob("lite/notebook/examples/*.{ts,tsx}").scanSync(ROOT)], [...new Glob("lite/soundscript/spec-*.ts").scanSync(ROOT)]);
const TA = new Set([...TYPED_ARRAYS, "ArrayBuffer"]);
const isTA = (e: ts.Expression) => (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && TA.has(e.expression.text)) ||
  (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ts.isIdentifier(e.expression.expression) && TA.has(e.expression.expression.text) && /^(from|of)$/.test(e.expression.name.text));
let locals = 0; const uses: string[] = [];
for (const file of files) {
  const sf = ts.createSourceFile(file, readFileSync(ROOT + file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const ln = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  const v = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && isTA(n.initializer)) {
      locals++;
      const name = n.name.text; let body: ts.Node = n; while (body.parent && !ts.isArrowFunction(body) && !ts.isFunctionDeclaration(body) && !ts.isFunctionExpression(body)) body = body.parent;
      const w = (m: ts.Node): void => {
        if (ts.isIdentifier(m) && m.text === name && m !== n.name) {
          const p = m.parent;
          const why = ts.isCallExpression(p) && p.arguments.includes(m as any) ? "arg" : ts.isNewExpression(p) && p.arguments?.includes(m as any) ? "new-arg"
            : ts.isReturnStatement(p) || (ts.isArrowFunction(p) && p.body === m) ? "return" : ts.isArrayLiteralExpression(p) || ts.isShorthandPropertyAssignment(p) || (ts.isPropertyAssignment(p) && p.initializer === m) ? "literal" : ts.isYieldExpression(p) ? "yield" : null;
          if (why) uses.push(`${file}:${ln(m)} ${name} ${why}: ${p.getText().slice(0, 70).replace(/\n/g, " ")}`);
        }
        ts.forEachChild(m, w);
      };
      w(body);
    }
    ts.forEachChild(n, v);
  };
  v(sf);
}
console.log(`typed-array/ArrayBuffer locals ${locals}; uses that R4 makes a conversion ${uses.length}`);
for (const u of uses) console.log("  " + u);
