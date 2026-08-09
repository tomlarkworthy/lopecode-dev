// Adds instantiateDataflow (+ the cloneViaSandbox shim, + its documentation) to a checked-out
// @tomlarkworthy/dataflow-templating.js. cloneDataflow is left exactly as it is: three of its four
// corpus consumers are untested against the sandbox, and the one-way bridge is a real regression
// for any template that writes back to a captured mutable.
//
// Mechanical and reversible: seven cells appended, one import line added, one md cell edited.
import { readFileSync, writeFileSync } from "node:fs";

const here = (p) => new URL(p, import.meta.url).pathname;
const MODULE = new URL("../../modules/@tomlarkworthy/dataflow-templating.js", import.meta.url)
  .pathname;

const impl = readFileSync(here("./instantiate-dataflow.mjs"), "utf8")
  .replace(/^export default [^\n]*\n/gm, "")
  .replace(/^export /gm, "")
  .trim();

let src = readFileSync(MODULE, "utf8");
if (src.includes("instantiateDataflow")) throw new Error("already baked — re-checkout first");

// md`…` is a template literal in the emitted .js, so a backtick or a ${ in the prose has to survive
// two levels of quoting.
const mdCell = (pid, body) =>
  `const ${pid} = function ${pid}(md){return(\nmd\`${body
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${")}\`\n)};\n`;

const PROSE = [
  [
    "_dtv2a",
    `## Instancing into a sandbox Runtime

\`cloneDataflow\` defines its clones into the module it copied from, so every instance is a variable in the page's own runtime. Measured on [@tomlarkworthy/editor-5](https://observablehq.com/@tomlarkworthy/editor-5) on 2026-08-09, at rest with 132 cell shells and 3 open panels:

\`\`\`
runtime._variables      3107
  "dynamic " clones      862   (28%)
editorModule._scope     1031
\`\`\`

Opening one more panel added 21 variables, and fired 21 code-change events at 7 listeners.

This is not a CPU problem. The \`check_for_code_change\` pass costs 0.33ms with those clones present against 0.19ms without, and it is debounced. The problem is that a clone is indistinguishable from a real cell, so seven unrelated modules carry a hand-rolled \`dynamic \` name filter to hide them: \`exporter-3\` (without it clones are serialised into the export), \`local-change-history\`, \`cell-map\`, \`lopepage\`, \`lopepage-2\`, and \`module-map\`/\`modules.js\` which catch only the narrower \`dynamic observe \`. Two of those are correctness guards, not cosmetics.

\`instantiateDataflow\` builds the instance in a second \`Runtime\` instead. Nothing to filter, and nothing in the origin module's scope: the same page with every editor on the sandbox reports 2291 primary variables, 7 clones, and a module scope of 215.`
  ],
  [
    "_dtv2b",
    `### API

\`\`\`js
// One factory per page. It creates its sandbox Runtime lazily and shares it across instances.
instantiateDataflow = instantiateDataflowFactory(runtime.constructor, {
  builtins: {}            // builtins for the sandbox Runtime; default is none
})

instance = instantiateDataflow(
  template,                // Variable[] — the same argument cloneDataflow takes
  {
    params: {},            // {name: value}, injected; shadows a template variable of that name
    observers: (name) => ({fulfilled, rejected, pending}), // as cloneDataflow's observerFactory
    watch: onCodeChange    // (cb) => unsub; without it the instance ignores later source edits
  }
)

instance.value("widget")           // promise of a cell's value
instance.observe("widget", obs)    // attach an observer afterwards; returns a detach function
instance.variables                 // Map<name, Variable> — the instance body
instance.captures                  // names bridged in from the origin module
instance.diagnostics               // [{code, name}] — warn/mixed-modules, warn/shadowed
instance.dispose()                 // true the first time, false after
\`\`\`

\`instantiateDataflow.stats()\` reports \`{sandboxRuntime, bridges, modules}\`, and \`instantiateDataflow.destroy()\` disposes the sandbox Runtime and every bridge.

\`params\` is what \`cloneDataflow\` has no answer for. A parameter is defined in the instance module ahead of the body, so a template variable of the same name is simply not created and every downstream variable reads the injected value.`
  ],
  [
    "_dtv2c",
    `### What crosses the boundary

An input a template variable reads but does not itself define — \`Inputs\`, \`htl\`, a shared \`time\` range — is a **capture**. Each one becomes a single variable in the origin module, named \`dynamic bridge <name> <uid>\`, whose observer republishes into the sandbox as an async generator. Bridges are keyed by \`(module, name)\`, shared by every instance and refcounted, so they do not scale with instance count: editor-5 with 135 editors holds **36** bridges, against the 862 clone variables \`cloneDataflow\` produced. Break-even is 6 instances.

\`invalidation\`, \`visibility\` and \`@variable\` are never bridged. They are symbols the runtime resolves per-variable, so the sandbox mints its own.

**The bridge is one-way.** A template that writes back to a captured \`mutable\` works under \`cloneDataflow\` and does not work here. That is the one known behavioural regression, and it is why \`cloneDataflow\` remains exported and supported.`
  ],
  [
    "_dtv2d",
    `### Migrating a call site

\`cloneViaSandbox\` has \`cloneDataflow\`'s signature and returns the same disposal function, so a call site moves by one identifier:

\`\`\`js
dispose = cloneViaSandbox(template, observerFactory)
\`\`\`

Corpus-wide there are four \`cloneDataflow\` consumers: \`@tomlarkworthy/editor-5\`, \`@tomlarkworthy/robocoop-2\`, \`@tomlarkworthy/robocoop-3\` and \`@tomlarkworthy/parametric-svg\`. Only editor-5 is migrated, on 2026-08-09 — all 135 editors built on the sandbox from boot, the page exported, and the export re-booted with zero console errors. The other three are untested, and none of them has been checked against the \`mutable\` write-back above.

Disposal is not simply "delete what was created". Deleting a variable that still has outputs does **not** free its scope entry — \`variable.js\` substitutes a fresh implicit variable so the references stay wired — so \`dispose()\` deletes in reverse dependency order and then sweeps whatever survived out of the module scope.`
  ]
];

const DEFS = [
  ["_dtv2h", null, ["md"], `const _dtv2h = function _dtv2h(md){return(\nmd\`## instantiateDataflow\`\n)};\n`],
  [
    "_dtv2f",
    "instantiateDataflowFactory",
    [],
    `const _dtv2f = function _instantiateDataflowFactory(){\n${impl}\n\nreturn instantiateDataflowFactory;\n};\n`
  ],
  [
    "_dtv2m",
    "instantiateDataflow",
    ["instantiateDataflowFactory", "runtime"],
    `const _dtv2m = function _instantiateDataflow(instantiateDataflowFactory,runtime){return(\ninstantiateDataflowFactory(runtime.constructor, {})\n)};\n`
  ],
  [
    "_dtv2s",
    "cloneViaSandbox",
    ["instantiateDataflow", "onCodeChange"],
    `const _dtv2s = function _cloneViaSandbox(instantiateDataflow,onCodeChange){return(\n(variables, observerFactory = () => ({})) => {\n  const inst = instantiateDataflow(variables, {\n    observers: observerFactory,\n    watch: onCodeChange\n  });\n  return () => inst.dispose();\n}\n)};\n`
  ]
];

const at = (needle) => {
  const i = src.indexOf(needle);
  if (i < 0) throw new Error(`anchor not found: ${needle}`);
  return i;
};

// 1. prose, after the "Releasing Resources" cell and before the `---` rule
const rule = "const _jw42sg = function _46(md){return(";
src =
  src.slice(0, at(rule)) +
  PROSE.map(([pid, body]) => mdCell(pid, body)).join("") +
  src.slice(at(rule));

// 2. definitions, after cloneDataflow and before the References cell
const refs = "const _1nie1nr = function _49(md){return(";
src = src.slice(0, at(refs)) + DEFS.map((d) => d[3]).join("") + src.slice(at(refs));

// 3. register the prose in cell order — before the `---` rule's own $def
const ruleDef = `  $def("_jw42sg", null, ["md"], _jw42sg);`;
if (!src.includes(ruleDef)) throw new Error("rule $def not found");
src = src.replace(
  ruleDef,
  PROSE.map(([pid]) => `  $def("${pid}", null, ["md"], ${pid});`).join("\n") + "\n" + ruleDef
);

// 4. register the definitions after cloneDataflow's $def
const cloneDef = `  $def("_ifa1z4", "cloneDataflow", ["observeSet"], _ifa1z4);`;
if (!src.includes(cloneDef)) throw new Error("cloneDataflow $def not found");
src = src.replace(
  cloneDef,
  cloneDef +
    "\n" +
    DEFS.map(
      ([pid, name, deps]) =>
        `  $def("${pid}", ${JSON.stringify(name)}, ${JSON.stringify(deps)}, ${pid});`
    ).join("\n")
);

// 5. cloneViaSandbox needs onCodeChange, which this module did not import before
const observeSetImport = `  main.define("observeSet", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observeSet", _));`;
if (!src.includes(observeSetImport)) throw new Error("observeSet import not found");
src = src.replace(
  observeSetImport,
  observeSetImport +
    `\n  main.define("onCodeChange", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("onCodeChange", _));`
);

// 6. the header import example
const oldImport = "import {cloneDataflow, thisModule, lookupVariable} from '@tomlarkworthy/dataflow-templating'";
if (!src.includes(oldImport)) throw new Error("header import cell not found");
src = src.replace(
  oldImport,
  "import {instantiateDataflow, cloneViaSandbox, cloneDataflow, thisModule, lookupVariable} from '@tomlarkworthy/dataflow-templating'"
);

writeFileSync(MODULE, src);
console.log(`baked: ${PROSE.length} prose cells, ${DEFS.length} definition cells, onCodeChange imported`);
