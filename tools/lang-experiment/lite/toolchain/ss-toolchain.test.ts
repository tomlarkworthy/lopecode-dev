// bun lite/toolchain/ss-toolchain.test.ts — per-cell round trip over every example and fixture
import { Glob } from "bun";
import * as acorn from "acorn";
import { compileModule, compileCell, decompileModule, decompileVariable, splitCells, langOf } from "./ss-toolchain.ts";

const root = new URL("../..", import.meta.url).pathname;
const files = [...new Glob("lite/notebook/examples/*.ts*").scanSync(root), ...new Glob("fixtures/*/*/cells.ts*").scanSync(root)].sort();
let pass = 0, skipped = 0, fail = 0, cells = 0, vars = 0;
for (const f of files) {
  const src = await Bun.file(root + f).text();
  const tsx = f.endsWith("x");
  try {
    const texts = splitCells(src, tsx);
    for (const t of texts) {
      let vs;
      try { vs = compileCell(t, tsx); } catch (e) {
        if (/not supported by ss_toolchain yet/.test(String(e))) { skipped++; continue; }
        throw e;
      }
      cells++;
      for (const v of vs) {
        vars++;
        acorn.parseExpressionAt(v.definition, 0, { ecmaVersion: "latest" });
        if (langOf(v.definition) !== "ss") throw new Error(`${v.name}: first comment is not the lang marker`);
        const back = (0, eval)(`(${v.definition})`).toString();
        if (back !== v.definition) throw new Error(`${v.name}: Function.toString changed the text`);
      }
      const own = vs.map((v) => decompileVariable(v.definition)).filter((x) => x !== null);
      if (own.length !== 1 || own[0] !== t) throw new Error(`cell round trip differs:\n--- want\n${t}\n--- got\n${own.join("\n|\n")}`);
    }
    pass++;
  } catch (e) { fail++; console.log("FAIL", f, String((e as Error).message).slice(0, 400)); }
}
// whole module, for files with nothing unsupported
const whole = await Bun.file(root + "lite/notebook/examples/05-reducer.tsx").text();
const mod = decompileModule(compileModule(whole, true).map((v) => v.definition));
if (mod !== splitCells(whole, true).join("\n\n") + "\n") { fail++; console.log("FAIL module round trip 05-reducer"); }
console.log(`${pass} files pass, ${fail} fail; ${cells} cells, ${vars} variables; ${skipped} cells skipped (Source, pool or compile)`);
if (fail) process.exit(1);
