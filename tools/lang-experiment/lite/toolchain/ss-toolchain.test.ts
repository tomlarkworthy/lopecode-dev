// bun lite/toolchain/ss-toolchain.test.ts — per-cell round trip over every example and fixture
import { Glob } from "bun";
import * as acorn from "acorn";
import { compileModule, compileCell, contextOf, decompileModule, decompileVariable, splitCells, langOf } from "./ss-toolchain.ts";
import { checkSources } from "../core.ts";
import { acceptedOf, contextFromCheck } from "./ss-toolchain.ts";
const accepted = (src: string, tsx = true) => acceptedOf(checkSources({ cells: src, tsx }));

const root = new URL("../..", import.meta.url).pathname;
const files = [...new Glob("lite/notebook/examples/*.ts*").scanSync(root), ...new Glob("fixtures/*/*/cells.ts*").scanSync(root)].sort();
let pass = 0, skipped = 0, fail = 0, cells = 0, vars = 0, factsCompared = 0;
for (const f of files) {
  const src = await Bun.file(root + f).text();
  const tsx = f.endsWith("x");
  try {
    const texts = splitCells(src, tsx);
    // the context and facts from one check of the module must compile every cell to the same text
    // as the context and facts the compiler parses for itself
    let checked = null;
    try { checked = checkSources({ cells: src, tsx }); } catch {}
    const fromCheck = checked ? contextFromCheck(checked) : null;
    const ctx = contextOf(texts, tsx, checked ? acceptedOf(checked) : null);
    if (fromCheck && (JSON.stringify([...fromCheck.generators].sort()) !== JSON.stringify([...ctx.generators].sort()) || JSON.stringify([...fromCheck.events].sort()) !== JSON.stringify([...ctx.events].sort())))
      throw new Error(`contextFromCheck differs from contextOf: ${JSON.stringify([[...fromCheck.generators], [...ctx.generators]])}`);
    for (const t of texts) {
      let vs;
      try { vs = compileCell(t, tsx, ctx); } catch (e) {
        if (/not supported by ss_toolchain yet/.test(String(e))) { skipped++; continue; }
        throw e;
      }
      cells++;
      if (fromCheck) {
        const again = JSON.stringify(compileCell(t, tsx, fromCheck));
        if (again !== JSON.stringify(vs)) throw new Error(`a cell compiles differently with the check's facts:\n${again}\n${JSON.stringify(vs)}`);
        factsCompared++;
      }
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
  const by = (src: string) => new Map(compileModule(src, true, accepted(src)).map((v) => [v.name, v]));
  const g = by(await Bun.file(root + "lite/notebook/examples/09-breakout.tsx").text());
  const expect = (ok: boolean, what: string) => { if (!ok) { fail++; console.log("FAIL " + what); } };
  expect(JSON.stringify(g.get("world")?.inputs) === JSON.stringify(["viewof world", "ss"]), "a ref's value variable reads its handle first: " + g.get("world")?.inputs);
  expect(g.has("viewof world") && !g.has("ref world"), "a ref's handle is viewof world");
  expect(JSON.stringify(g.get("tick")?.inputs) === JSON.stringify(["ss", "viewof world", "step"]), "Ref<T> parameter reads the handle: " + g.get("tick")?.inputs);
  expect(/kind: "events"/.test(g.get("ticks")!.definition) && !g.has("viewof ticks"), "a generator taken as Events is one handle variable");
  expect(g.get("ticks")!.definition.startsWith("function (") && /prev: this, id:/.test(g.get("ticks")!.definition), "an events cell's definition is a function that passes this: " + g.get("ticks")!.definition.slice(0, 40));
  expect(JSON.stringify(g.get("ticks")?.inputs) === JSON.stringify(["ss", "ss_now", "playing", "over", "invalidation"]), "an events cell takes invalidation: " + g.get("ticks")?.inputs);
  expect(JSON.stringify(g.get("onTick")?.inputs) === JSON.stringify(["ss", "ticks", "tick", "invalidation"]) && /kind: "listener"/.test(g.get("onTick")!.definition), "on(...) makes a listener that takes invalidation: " + g.get("onTick")?.inputs);
  expect(/memo: true/.test(g.get("bricksView")!.definition), "bricksView is memoised");
  expect(/memo: false/.test(g.get("ticks")!.definition), "a generator is not memoised");
  const w = by(await Bun.file(root + "lite/notebook/examples/07-workers.tsx").text());
  expect(JSON.stringify(w.get("inPool")?.inputs) === JSON.stringify(["ss", "ss_compile", "ss_pool", "width", "height", "maxIter"]), "compile refs are hidden inputs: " + w.get("inPool")?.inputs);
  const m = by(await Bun.file(root + "lite/notebook/examples/06-model.tsx").text());
  expect(/memo: false/.test(m.get("stamped")!.definition), "a cell taking now is not memoised");
  const mutSrc = await Bun.file(root + "lite/notebook/examples/03-mut.ts").text();
  const mu = new Map(compileModule(mutSrc, false, accepted(mutSrc, false)).map((v) => [v.name, v]));
  expect(/memo: false/.test(mu.get("leak")!.definition) && /memo: false/.test(mu.get("late")!.definition), "cells the checker rejects (leak, late) are not memoised");
  expect([...mu.values()].some((v) => /memo: true/.test(v.definition)), "an accepted cell of 03-mut is memoised");
  expect(compileModule(mutSrc, false).every((v) => !/memo: true/.test(v.definition)), "with no verdicts, nothing is memoised");
}
console.log(`${pass} files pass, ${fail} fail; ${cells} cells, ${vars} variables; ${skipped} cells skipped (pool or compile); ${factsCompared} cells compiled the same from the check's facts`);
if (fail) process.exit(1);
