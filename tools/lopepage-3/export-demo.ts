// Rewrites modules/@tomlarkworthy/notebook-kit-demo.js as exporter-4 writes it: the title cell, then the
// Notebook Kit cells from `nk_sources` defined through js-toolchain's defineCell. The result has no
// nk_boot; its cells are rebuilt by $nk on load. Run once to convert the demo; a second run finds no
// nk_sources and exits.
//
// Headless rather than exported from a browser tab: a paired tab would bake its cc= token into the file.
//
// run: bun tools/lopepage-3/export-demo.ts
import { Runtime } from "@observablehq/runtime";
import * as acorn from "acorn";
import * as acorn_walk from "acorn-walk";
import { readFileSync, writeFileSync } from "node:fs";
import { importNotebookModule } from "../notebook-import.ts";
import { nkRuntime } from "../js-toolchain/runtime/display-scenarios.ts";

const DEMO = "modules/@tomlarkworthy/notebook-kit-demo.js";
const NAME = "@tomlarkworthy/notebook-kit-demo";

const jtm = await importNotebookModule("modules/@tomlarkworthy/js-toolchain.js", { overrides: { nkRuntime, acorn, acorn_walk } });
const jt = await jtm.values(["defineCell", "displayStateOf", "transpileJavaScript"]);
const sdk = await importNotebookModule("modules/@tomlarkworthy/runtime-sdk.js", {
  overrides: { no_observer: Symbol("no-observer"), trace_variable: undefined, "mutable trace_history": { value: [] } }
});
const { realize, persistentId } = await sdk.values(["realize", "persistentId"]);
const e4 = await importNotebookModule("modules/@tomlarkworthy/exporter-4.js", {
  overrides: { pid: persistentId, acorn, displayStateOf: jt.displayStateOf, _runtime: null }
});
const exportModuleJS = await e4.value("exportModuleJS");

// evaluated from text, not import()ed: bun transpiles an imported file, and the title cell's toString()
// would then be bun's reformatting instead of the source
const demoText = readFileSync(DEMO, "utf8");
const marker = "export default function define(";
if (demoText.split(marker).length !== 2) throw new Error(`${DEMO} has no single default define`);
const demoRuntime = new Runtime();
const demoModule = demoRuntime.module(new Function(demoText.replace(marker, "return function define("))());
const demo = { runtime: demoRuntime, module: demoModule, value: (name: string) => demoModule.value(name) };
const own = [...demo.runtime._variables].filter((v: any) => v._module === demo.module);
const sourcesVar = own.find((v: any) => v._name === "nk_sources");
if (!sourcesVar) {
  console.log(`${DEMO} has no nk_sources; already converted`);
  process.exit(0);
}
const title = own.find((v: any) => v.pid === "_nkdtitle");
if (!title) throw new Error("no title cell (_nkdtitle)");
const sources: string[] = await demo.value("nk_sources");

const runtime = new Runtime();
const module = runtime.module();
const titleVar = module.variable().define(null, title._inputs.map((i: any) => i._name), title._definition);
titleVar.pid = title.pid;
for (const [i, source] of sources.entries()) {
  const t = jt.transpileJavaScript(source);
  const [body] = await realize([t.body], runtime);
  jt.defineCell(module, { ...t, id: i + 1, body });
}

const { source } = await exportModuleJS(NAME, { runtime, moduleNamesFn: () => new Map([[module, { name: NAME }]]) });
writeFileSync(DEMO, source);
console.log(`wrote ${DEMO}: title + ${sources.length} Notebook Kit cells (${source.length} bytes)`);
process.exit(0);
