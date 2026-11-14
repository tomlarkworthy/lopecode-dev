// bun lite/toolchain/ss-toolchain.test.ts — per-cell round trip over every example and fixture
import { Glob } from "bun";
import * as acorn from "acorn";
import { compileModule, compileCell, contextOf, decompileModule, decompileVariable, splitCells, langOf } from "./ss-toolchain.ts";

const root = new URL("../..", import.meta.url).pathname;
const files = [...new Glob("lite/notebook/examples/*.ts*").scanSync(root), ...new Glob("fixtures/*/*/cells.ts*").scanSync(root)].sort();
let pass = 0, skipped = 0, fail = 0, cells = 0, vars = 0;
for (const f of files) {
  const src = await Bun.file(root + f).text();
  const tsx = f.endsWith("x");
  try {
    const texts = splitCells(src, tsx);
    const ctx = contextOf(texts, tsx);
    for (const t of texts) {
      let vs;
      try { vs = compileCell(t, tsx, ctx); } catch (e) {
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
// whole modules
for (const f of ["05-reducer.tsx", "07-workers.tsx", "09-breakout.tsx"]) {
  const whole = await Bun.file(root + "lite/notebook/examples/" + f).text();
  const mod = decompileModule(compileModule(whole, true).map((v) => v.definition));
  if (mod !== splitCells(whole, true).join("\n\n") + "\n") { fail++; console.log("FAIL module round trip " + f); }
}
// shapes the runtime and cell-map depend on
{
  const by = (src: string) => new Map(compileModule(src, true).map((v) => [v.name, v]));
  const g = by(await Bun.file(root + "lite/notebook/examples/09-breakout.tsx").text());
  const expect = (ok: boolean, what: string) => { if (!ok) { fail++; console.log("FAIL " + what); } };
  expect(JSON.stringify(g.get("world")?.inputs) === JSON.stringify(["viewof world", "ss"]), "a ref's value variable reads its handle first: " + g.get("world")?.inputs);
  expect(g.has("viewof world") && !g.has("ref world"), "a ref's handle is viewof world");
  expect(JSON.stringify(g.get("tick")?.inputs) === JSON.stringify(["ss", "viewof world", "step"]), "Ref<T> parameter reads the handle: " + g.get("tick")?.inputs);
  expect(/kind: "source"/.test(g.get("ticks")!.definition) && !g.has("viewof ticks"), "a generator taken as Source is one handle variable");
  expect(JSON.stringify(g.get("subscriptions")?.inputs) === JSON.stringify(["ss", "ticks", "tick", "playing", "over", "invalidation"]), "on(...) adds invalidation: " + g.get("subscriptions")?.inputs);
  expect(/memo: true/.test(g.get("bricksView")!.definition), "bricksView is memoised");
  expect(/memo: false/.test(g.get("ticks")!.definition), "a generator is not memoised");
  const w = by(await Bun.file(root + "lite/notebook/examples/07-workers.tsx").text());
  expect(JSON.stringify(w.get("inPool")?.inputs) === JSON.stringify(["ss", "ss_compile", "ss_pool", "width", "height", "maxIter"]), "compile refs are hidden inputs: " + w.get("inPool")?.inputs);
  const m = by(await Bun.file(root + "lite/notebook/examples/06-model.tsx").text());
  expect(/memo: false/.test(m.get("stamped")!.definition), "a cell taking now is not memoised");
}
console.log(`${pass} files pass, ${fail} fail; ${cells} cells, ${vars} variables; ${skipped} cells skipped (Source, pool or compile)`);
if (fail) process.exit(1);
