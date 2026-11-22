// bun ast-casts.ts <tree> <file>...: every `as` (other than `as const`), `<T>x` and `x!` in the given infer files, on the TypeScript AST.
import ts from "typescript";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const [tree, ...files] = process.argv.slice(2);
let n = 0;
for (const f of files) {
  const p = join(import.meta.dir, tree!, "lite/infer", f);
  const sf = ts.createSourceFile(f, readFileSync(p, "utf8"), ts.ScriptTarget.Latest, true);
  sf.forEachChild(function v(x) {
    const isConst = ts.isAsExpression(x) && ts.isTypeReferenceNode(x.type) && x.type.getText() === "const";
    if ((ts.isAsExpression(x) && !isConst) || ts.isNonNullExpression(x) || ts.isTypeAssertionExpression(x)) { n++; console.log(`${tree}/${f}:${sf.getLineAndCharacterOfPosition(x.getStart()).line + 1} ${x.getText().slice(0, 80)}`); }
    x.forEachChild(v);
  });
}
console.log(`${tree}: ${files.length} files, ${n} casts or non-null assertions`);
