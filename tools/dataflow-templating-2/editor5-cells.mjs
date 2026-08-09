// Generates the cells that put editor-5 on instantiateDataflow.
//
// The experiment is deliberately a ONE IDENTIFIER swap: `cloneViaSandbox` presents exactly
// cloneDataflow's signature, and cellEditor is lifted verbatim from the module with
// `cloneDataflow` -> `cloneViaSandbox`. Anything that changes behaviour is then the templating
// implementation, not a rewrite of the caller.
import { readFileSync, writeFileSync } from "node:fs";

const here = (p) => new URL(p, import.meta.url).pathname;
const REPO = "/Users/tom.larkworthy/dev/lopecode-dev/";

const impl = readFileSync(here("./instantiate-dataflow.mjs"), "utf8")
  .replace(/^\/\/[^\n]*\n/gm, (m, off) => (off < 700 ? "" : m))
  .replace(/^export default [^\n]*\n/gm, "")
  .replace(/^export /gm, "")
  .trim();

// Lift cellEditor out of the module rather than retyping it, so the control and the arm differ by
// one identifier and nothing else.
const mod = readFileSync(REPO + "modules/@tomlarkworthy/editor-5.js", "utf8");
const m = mod.match(/const _\w+ = function _cellEditor\([^)]*\)\{return\(\n([\s\S]*?)\n\)\};/);
if (!m) throw new Error("cellEditor not found in editor-5.js");
const original = m[1];
if (!/\bcloneDataflow\(/.test(original)) throw new Error("no cloneDataflow call sites to swap");
const swapped = original.replace(/\bcloneDataflow\b/g, "cloneViaSandbox");
const sites = (original.match(/\bcloneDataflow\(/g) || []).length;

const cells = [
  `instantiateDataflowFactory = {\n${impl}\n\nreturn instantiateDataflowFactory;\n}`,

  // runtime.constructor rather than an import of @tomlarkworthy/observable-runtime-v6: that module
  // is not embedded in this notebook, and using the primary runtime's own class makes the sandbox
  // behaviourally identical instead of merely similar. A shipped version should take the import.
  `instantiateDataflow = instantiateDataflowFactory(runtime.constructor, {})`,

  // cloneDataflow's exact signature, so cellEditor needs no other change.
  `cloneViaSandbox = (variables, observerFactory = () => ({})) => {
  const inst = instantiateDataflow(variables, {
    observers: observerFactory,
    watch: onCodeChange
  });
  return () => inst.dispose();
}`,

  `cellEditor = ${swapped}`
];

writeFileSync(here("./cells.json"), JSON.stringify(cells, null, 2));
console.log(`${cells.length} cells, ${sites} cloneDataflow call sites swapped`);
