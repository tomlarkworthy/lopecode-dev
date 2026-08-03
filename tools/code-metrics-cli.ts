#!/usr/bin/env bun
// Offline code-metrics over canonical /modules/*.js cells — no browser needed.
// REUSES @tomlarkworthy/code-metrics verbatim (no copied formulas): we extract each module's cells,
// feed them to the real `metricsRows` cell via importNotebookModule, and print the result.
//
// Usage: bun tools/code-metrics-cli.ts <file.js | glob> [...]   e.g. 'modules/@tomlarkworthy/robocoop-4*.js'

import * as acorn from "acorn";
import * as acornWalk from "acorn-walk";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { importNotebookModule } from "./notebook-import.ts";

const files = process.argv.slice(2);
if (!files.length) { console.error("usage: code-metrics-cli.ts <file.js> ..."); process.exit(1); }

// Extract top-level cells (`const _x = function name(deps){…}`) from each module file.
// Shape each as the {variable, module, name} that code-metrics' `allCells` produces; `variable._definition`
// is the cell function source (code-metrics calls `.toString()` on it — a string returns itself).
const allCells: Array<{ variable: { _definition: string; _inputs: any[] }; module: string; name: string }> = [];
for (const file of files) {
  const code = readFileSync(file, "utf8");
  const mod = basename(file, ".js");
  let prog: any;
  try { prog = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module", allowReturnOutsideFunction: true }); }
  catch (e: any) { console.error(`parse fail ${file}: ${e.message}`); continue; }
  for (const stmt of prog.body) {
    if (stmt.type !== "VariableDeclaration") continue;
    for (const d of stmt.declarations) {
      const init = d.init;
      if (!init || (init.type !== "FunctionExpression" && init.type !== "ArrowFunctionExpression")) continue;
      const name = init.id?.name || (d.id as any)?.name || "?";
      if (name === "define") continue; // module-registration wrapper, not a cell
      allCells.push({
        variable: { _definition: code.slice(init.start, init.end), _inputs: new Array((init.params || []).length) },
        module: mod,
        name,
      });
    }
  }
}

// Reuse the canonical metric pipeline: override the runtime-coupled inputs (acorn, acornWalk, allCells),
// then read the real `metricsRows` cell — MI/CC/Halstead/cognitive/nesting all computed by the notebook.
const m = await importNotebookModule("modules/@tomlarkworthy/code-metrics.js", {
  overrides: { acorn, acornWalk, allCells },
});
const rows: any[] = await m.value("metricsRows");
m.dispose();

const pad = (s: any, n: number) => String(s).padEnd(n);
const lpad = (s: any, n: number) => String(s).padStart(n);
console.log(`\n${rows.length} cells analyzed.  Flags: MI<65 = ${rows.filter(r => r.mi < 65).length} · CC>=10 = ${rows.filter(r => r.cyclomatic >= 10).length} · nest>=4 = ${rows.filter(r => r.nesting >= 4).length}\n`);
console.log(`${lpad("MI", 3)}  ${pad("name", 30)} ${pad("module", 26)} ${lpad("LOC", 4)} ${lpad("CC", 3)} ${lpad("Cog", 4)} ${lpad("Nst", 3)} ${lpad("H.Vol", 6)} ${lpad("In", 3)}`);
console.log("-".repeat(92));
for (const r of rows) {
  console.log(`${lpad(r.mi, 3)}  ${pad(r.name, 30)} ${pad(r.module, 26)} ${lpad(r.loc, 4)} ${lpad(r.cyclomatic, 3)} ${lpad(r.cognitive, 4)} ${lpad(r.nesting, 3)} ${lpad(r.vol, 6)} ${lpad(r.fanIn, 3)}${r.mi < 65 ? "  ⚠" : ""}`);
}
