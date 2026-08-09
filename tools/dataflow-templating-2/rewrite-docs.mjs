// Rewrites the instantiateDataflow documentation cells in a checked-out
// @tomlarkworthy/dataflow-templating.js.
//
// The first version was four long md cells and no demo, in a notebook whose entire method is to
// render the working thing and then explain it — cloneDataflow gets a live pizza widget before a
// word of prose. This replaces them with one idea per cell and a working demo of the same
// template, plus a live cost readout the reader can move with a slider.
import { readFileSync, writeFileSync } from "node:fs";

const PATH = new URL("../../modules/@tomlarkworthy/dataflow-templating.js", import.meta.url).pathname;
let src = readFileSync(PATH, "utf8");

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const md = (pid, body) => `const ${pid} = function ${pid}(md){return(\nmd\`${esc(body)}\`\n)};\n`;

const INTRO = md(
  "_dtv2a",
  `## instantiateDataflow

Everything above defines the clones into the module they were copied from, so each instance is a set of variables in the page's own runtime. \`instantiateDataflow\` builds the instance in a **second \`Runtime\`** instead. The templating is the same — same \`template\`, same observer factory — but the page's runtime never sees the instance.

Here is the pizza widget again, instanced that way, with a live count of what each approach costs the page. The \`cloneDataflow\` figure counts every instance on the page, including the single widget further up, so read the slope and not the number: six more variables per widget, against none.`
);

// Bound separately from the demo so moving the slider does not rebuild the slider under the cursor
// — the same reason the startDay/endDay binds above are their own cells.
const SLIDER = `const _dtv2j = function _dtv2j(Inputs,$0){return(
Inputs.bind(Inputs.range([1, 4], { label: "widgets", step: 1 }), $0)
)};
`;

const DEMO = `const _dtv2i = function _instances(widgetCount,instantiateDataflow,template,Inspector,invalidation)
{
  const root = document.createElement("div");
  root.style = "display: flex; flex-wrap: wrap; gap: 4px;";

  const live = Array.from({ length: widgetCount }, () => {
    const cell = document.createElement("div");
    root.append(cell);
    return instantiateDataflow(template, {
      observers: (name) => (name === "widget" ? new Inspector(cell) : null)
    });
  });
  invalidation.then(() => live.forEach((instance) => instance.dispose()));

  root.captures = live[0] ? live[0].captures : [];
  root.count = live.length;
  return root;
};
`;

const COST = `const _dtv2k = function _instancingCost(runtime,template,widgetCount,dataflows,instances)
{
  const sanitize = (s) => s.replace(/[^\\w$]/g, "_");
  const templateNames = new Set(template.map((v) => sanitize(v._name)));
  const captureNames = new Set(instances.captures.map(sanitize));
  // both arms name their variables "dynamic <what> <uid>", so the uid comes off the end
  const stem = (n) => (n.match(/^dynamic (?:bridge )?(.+) [^ ]+$/) || [])[1];
  // scoped to this notebook's own module: editor-5 is instanced on this page too, and its bridges
  // carry the same names (Inputs, htl, Generators) as ours
  const dynamic = [...runtime._variables]
    .filter((v) => v._module === template[0]._module)
    .map((v) => v._name)
    .filter((n) => typeof n === "string" && n.startsWith("dynamic "));

  return {
    widgets: widgetCount,
    "cloneDataflow → variables added to this page's runtime": dynamic.filter(
      (n) => !n.startsWith("dynamic bridge ") && templateNames.has(stem(n))
    ).length,
    "instantiateDataflow → variables added to this page's runtime": dynamic.filter(
      (n) => n.startsWith("dynamic bridge ") && captureNames.has(stem(n))
    ).length,
    "instantiateDataflow → modules in the sandbox runtime": instances.count
  };
};
`;

const API = md(
  "_dtv2b",
  `### API

\`\`\`js
// One factory per page. It creates the sandbox Runtime lazily and shares it across instances.
instantiateDataflow = instantiateDataflowFactory(runtime.constructor, {
  builtins: {}           // builtins for the sandbox Runtime; default is none
})

instance = instantiateDataflow(
  template,               // Variable[] — the same argument cloneDataflow takes
  {
    params: {},           // {name: value} injected; the template variable of that name is not created
    observers: (name) => ({fulfilled, rejected, pending}),  // as cloneDataflow's observerFactory
    watch: onCodeChange   // (cb) => unsub; without it the instance ignores later source edits
  }
)

instance.value("widget")         // promise of a cell's value
instance.observe("widget", obs)  // attach an observer afterwards; returns a detach function
instance.variables               // Map<name, Variable> — the instance body
instance.captures                // names bridged in from the origin module
instance.diagnostics             // [{code, name}] — warn/mixed-modules, warn/shadowed
instance.dispose()               // true the first time, false after

instantiateDataflow.stats()      // {sandboxRuntime, bridges, modules}
instantiateDataflow.destroy()    // dispose the sandbox Runtime and every bridge
\`\`\`

\`params\` is the one thing \`cloneDataflow\` has no answer for. The parameter is defined ahead of the body, so the template variable of that name is never created and everything downstream reads the injected value.`
);

const CAPTURES = md(
  "_dtv2c",
  `### Captures

A name a template variable reads but does not define — \`Inputs\`, \`htl\`, the shared \`time\` range — is a **capture**, and it cannot resolve across runtimes. Each one gets a bridge: a single variable in the origin module named \`dynamic bridge <name> <uid>\`, republished into the sandbox as an async generator. Bridges are keyed by \`(module, name)\` and shared by every instance, which is why the count above stops growing after the first widget.

\`invalidation\`, \`visibility\` and \`@variable\` are never bridged. They are symbols the runtime resolves per variable, so the sandbox mints its own.

A capture reaches the instance one tick after the origin settles it. That latency is the real cost of a bridge.

**Writes still cross.** A bridge republishes the capture's *value*, and for a \`mutable\` or a \`viewof\` element that value is the same object the origin holds — so \`mutable count = 42\` in a template runs the origin's setter, and the new value returns through the same bridge. What no bridge does is let a variable in the origin module depend on one in the sandbox. \`cloneDataflow\` cannot do that either: its clones are named \`dynamic <name> <uid>\` and nothing references them.`
);

const CHOICE = md(
  "_dtv2d",
  `### Which to use

\`cloneDataflow\` is still here and still supported. Its instances are ordinary variables in the page, so a debugger can plot them and an exporter can serialise them — sometimes that is exactly what you want.

The case for the sandbox is that those same variables are indistinguishable from real cells. On [@tomlarkworthy/editor-5](https://observablehq.com/@tomlarkworthy/editor-5), 862 of 3107 variables were clones, and seven unrelated modules had grown a hand-rolled \`dynamic \` name filter to keep them out of the exporter, the change history and three cell lists. Two of those filters are correctness guards rather than cosmetics. Moving editor-5 onto the sandbox took the page to 2297 variables and its module scope from 1031 to 212.

Not speed. The pass that walks those variables cost 0.33ms with them and 0.19ms without, and it is debounced.

To migrate, \`cloneViaSandbox\` has \`cloneDataflow\`'s signature and returns the same disposal function, so a call site moves by one identifier:

\`\`\`js
dispose = cloneViaSandbox(template, observerFactory)
\`\`\`

All four consumers in the lopecode corpus moved on 2026-08-09: \`editor-5\`, \`robocoop-2\`, \`robocoop-3\` and \`parametric-svg\`.`
);

// --- splice the cell functions -------------------------------------------------------------
const start = src.indexOf("const _dtv2a = function");
const end = src.indexOf("const _jw42sg = function");
if (start < 0 || end < 0 || end < start) throw new Error("doc cell block not found");
src =
  src.slice(0, start) + INTRO + SLIDER + DEMO + COST + API + CAPTURES + CHOICE + src.slice(end);

// --- and their registrations ---------------------------------------------------------------
const defs = [
  `  $def("_dtv2a", null, ["md"], _dtv2a);`,
  `  $def("_dtv2j", null, ["Inputs","viewof widgetCount"], _dtv2j);`,
  `  $def("_dtv2i", "instances", ["widgetCount","instantiateDataflow","template","Inspector","invalidation"], _dtv2i);`,
  `  $def("_dtv2k", "instancingCost", ["runtime","template","widgetCount","dataflows","instances"], _dtv2k);`,
  `  $def("_dtv2b", null, ["md"], _dtv2b);`,
  `  $def("_dtv2c", null, ["md"], _dtv2c);`,
  `  $def("_dtv2d", null, ["md"], _dtv2d);`
].join("\n");

// Matches however many doc $def lines are currently there, so re-running the script is safe.
// The definition cells further down (_dtv2h/f/m/s) are deliberately outside this character class.
const oldDefs = /(?:^ *\$def\("_dtv2[ajikbcd]".*\n)+/m;
if (!oldDefs.test(src)) throw new Error("no doc $def lines found");
src = src.replace(oldDefs, defs + "\n");

writeFileSync(PATH, src);
console.log("rewrote: 4 prose cells -> 4 prose cells + a bound slider, a live demo, a cost readout");
