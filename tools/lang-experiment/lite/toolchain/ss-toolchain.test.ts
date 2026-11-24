// bun lite/toolchain/ss-toolchain.test.ts — per-cell round trip over every example and fixture
import { Glob } from "bun";
import * as acorn from "acorn";
import { compileModule, compileCell, contextOf, decompileModule, decompileVariable, splitCells, langOf } from "./ss-toolchain.ts";
import * as toolchain from "./ss-toolchain.ts";
// an events cell's compiled definition, read on its parse: a function named _<name> that calls
// ss_events(<module name or null>, "<name>", [inputs], fn, invalidation)
const passesModule = (def: string, name: string, module: string | null = null) => {
  const fn: any = acorn.parseExpressionAt(def, 0, { ecmaVersion: "latest" });
  const p = toolchain.parseCompiled(def), a = p?.call?.arguments ?? [];
  return fn.type === "FunctionExpression" && fn.id?.name === `_${name}` && toolchain.compiledKind(def)?.kind === "events" && p?.name === name &&
    a[0]?.type === "Literal" && a[0].value === module && a.at(-1)?.type === "Identifier" && a.at(-1).name === "invalidation";
};

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
    // the checker's messages for a cell it does not accept come only from a check
    const ctx = { ...contextOf(texts, tsx, checked ? acceptedOf(checked) : null), why: fromCheck?.why ?? null };
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
        // a state cell's value variable is Observable's own, and holds no source
        if (langOf(v.definition) !== "ss" && v.definition !== "(G, _) => G.input(_)") throw new Error(`${v.name}: first comment is not the lang marker`);
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
  expect(JSON.stringify(g.get("world")?.inputs) === JSON.stringify(["Generators", "viewof world"]) && g.get("world")?.definition === "(G, _) => G.input(_)", "a state cell's value variable is Generators.input of its handle: " + g.get("world")?.inputs);
  expect(JSON.stringify(g.get("viewof world")?.inputs) === JSON.stringify(["ss_state", "ss_ref", "start"]), "a state cell's handle is viewof world and takes its inputs: " + g.get("viewof world")?.inputs);
  expect(JSON.stringify(g.get("tick")?.inputs) === JSON.stringify(["ss_action", "ss_out", "ss_closure", "viewof world", "step"]), "a State<T> parameter reads the handle: " + g.get("tick")?.inputs);
  expect([...g.values()].every((v) => !v.inputs.includes("@variable")), "no variable takes @variable (the exporter reads two inputs ending in @variable as an import)");
  expect(toolchain.compiledKind(g.get("ticks")!.definition)?.callee === "events" && !g.has("viewof ticks"), "a generator taken as Events is one handle variable");
  expect(passesModule(g.get("ticks")!.definition, "ticks"), "an events cell's definition is a function that passes its module name: " + g.get("ticks")!.definition.slice(0, 40));
  expect(JSON.stringify(g.get("ticks")?.inputs) === JSON.stringify(["ss_events", "ss_now", "playing", "over", "invalidation"]), "an events cell takes invalidation: " + g.get("ticks")?.inputs);
  expect(JSON.stringify(g.get("onTick")?.inputs) === JSON.stringify(["ss_on", "ss_out", "ss_listen", "ticks", "tick", "invalidation"]) && toolchain.compiledKind(g.get("onTick")!.definition)?.callee === "listen", "on(...) makes a listener that takes invalidation (w1: and ss_out, whose run guards the body): " + g.get("onTick")?.inputs + " " + toolchain.compiledKind(g.get("onTick")!.definition)?.callee);
  const w = by(await Bun.file(root + "lite/notebook/examples/07-workers.tsx").text());
  expect(JSON.stringify(w.get("inPool")?.inputs) === JSON.stringify(["ss_out", "ss_compileFor", "ss_compile", "width", "height", "maxIter", "ss_pool"]), "compile refs are inputs, in the order the definition reads them: " + w.get("inPool")?.inputs);
  const m = by(await Bun.file(root + "lite/notebook/examples/06-model.tsx").text());
  // S4 (2026-11-22): 03-mut.ts has no rejected cell any more; two cells the checker rejects, named as before
  const mutSrc = "const xs = () => [1];\nconst leak = (xs: number[]) => { xs.push(2); return 0; };\nconst late = () => { const u = [1]; const f = () => { u.push(2); return 0; }; return f; };";
  const mu = new Map(compileModule(mutSrc, false, accepted(mutSrc, false)).map((v) => [v.name, v]));
  expect(["leak", "late"].every((n) => toolchain.compiledKind(mu.get(n)!.definition)?.callee === "rejected" && JSON.stringify(mu.get(n)!.inputs) === JSON.stringify(["ss_rejected", "ss_release"])), "cells the checker rejects (leak, late) compile to a body that only raises: ss_rejected(..., ss_release(this)), which first ends a listener or events the cell held");
  // a parameter named for an Object.prototype member is no capability: a cell of that name, or inject-unknown
  for (const n of ["valueOf", "constructor", "toString", "hasOwnProperty", "__proto__"]) {
    const alone = checkSources({ cells: `const a = (${n}) => 1;`, tsx: false }).cells[0];
    expect(alone?.status === "rejected" && alone.errors.map((e) => e.rule).join() === "inject-unknown", `a parameter ${n} that names no cell is inject-unknown: ${JSON.stringify(alone)}`);
    const src = `const ${n} = () => 2;\nconst b = (${n}) => ${n} + 1;`;
    const both = checkSources({ cells: src, tsx: false }).cells.map((c) => `${c.name}:${c.status}:${c.value}`).join();
    expect(both === `${n}:ok:number,b:ok:number`, `a parameter ${n} takes the cell ${n}: ${both}`);
    const b = new Map(compileModule(src, false, accepted(src, false)).map((v) => [v.name, v])).get("b");
    expect(JSON.stringify(b?.inputs) === JSON.stringify(["ss_out", n]), `the compiled b takes the variable ${n}: ${JSON.stringify(b?.inputs)}`);
  }
  const cap = checkSources({ cells: "const n = () => state(0);\nconst copy = (n: State<number>, constructor: number) => action(() => n.set(constructor));", tsx: false, outside: [{ name: "constructor" }] }).cells[1];
  const capMsg = cap?.errors.map((e) => `${e.rule}: ${e.msg}`).join(" | ") ?? "";
  expect(cap?.status === "rejected" && capMsg.startsWith("action-capture: ") && capMsg.includes("(the value of constructor, a cell in another language)") && cap.errors.length === 1, `an outside cell named constructor is that cell's value in an action: ${capMsg}`);
}
console.log(`${pass} files pass, ${fail} fail; ${cells} cells, ${vars} variables; ${skipped} cells skipped (pool or compile); ${factsCompared} cells compiled the same from the check's facts`);
if (fail) process.exit(1);
