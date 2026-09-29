// rc5-train eval (20260929-0620-m47): the user extends the notebook's languages with a yaml`…` tagged
// template. Scored on behaviour only, whatever module or library the agent chooses:
//   parse    — every `yaml` function visible in a module created during the turn parses FIXTURE
//              (nested maps, a block list, a flow list, a double-quoted string holding ": " and " #",
//              a single-quoted string, two interpolations) to EXPECTED.
//   reacts   — an example cell that reads `yaml` and another cell of the module: redefining that other
//              cell changes the example's value to include the new value.
//   offline  — exportToHTML (as a save does), boot the file in a srcdoc iframe whose CSP refuses every
//              http(s) source, and the saved copy's `yaml` still parses FIXTURE to EXPECTED. This is the
//              save-and-reopen check too: nothing in the frame comes from the live page.
// Fixture provenance: the list/flow-list lines are the frontmatter of
// knowledge/vendoring-npm-dependencies.md as embedded in lopebooks/notebooks/@tomlarkworthy_robocoop-5.html
// (block @tomlarkworthy/markdown-wiki/vendoring-npm-dependencies.md), with the regex escapes dropped (a
// backslash's meaning differs between strings and strings.raw, which is spelling, not behaviour). The
// nested `page` map, the quoted title and the interpolations are seeded: the frontmatter has none.
// The offline iframe is the one from rc5t-fsm-offline (20260928-0847-m13).
// js-yaml is served from fixtures/js-yaml-4.1.0.mjs (jsDelivr npm/js-yaml@4.1.0/dist/js-yaml.mjs, MIT) by
// setup.routes, so the oracle and the controls run offline (pattern of rc5t-world-map-offline).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const JSYAML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures/js-yaml-4.1.0.mjs"), "utf8");

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
  globalThis.__rc5tBuiltins = [...rt._variables].filter(v => v._module === rt._builtin).length;
})()`;

const COLLECT = String.raw`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  const out = { parse: "not run", reacts: "not run", offline: "not run", builtins: "not run", ms: {} };
  // builtins: the turn defined no runtime builtin (md, htl, Inputs are defined by the bootloader at boot)
  {
    const rt0 = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
    const now = [...rt0._variables].filter(v => v._module === rt0._builtin);
    const added = now.length - globalThis.__rc5tBuiltins;
    const made = [...rt0._variables].some(v => !globalThis.__rc5tBefore.has(v._module) && v._module !== rt0._builtin && v._name === "yaml");
    out.builtins = !made ? "no yaml cell was created" : added === 0 ? "ok" : added + " runtime builtin variable(s) added during the turn: " + [...new Set(now.slice(-Math.max(added, 0)).map(v => v._name))].join(",");
  }
  const EXPECTED = {
    scope: ["local-development", "in-notebook"],
    "write-triggers": ["new Worker", "topojson"],
    page: { title: "Vendoring: an npm dependency # into a notebook", sections: { storage: 1, shape: 2 }, measured: true },
    owner: "Ada Lovelace",
    count: 7
  };
  const canon = x => JSON.stringify(x, (k, v) => v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(key => [key, v[key]])) : v);
  const FIXTURE = ["\nscope: [local-development, in-notebook]\nwrite-triggers:\n  - \"new Worker\"\n  - 'topojson'\npage:\n  title: \"Vendoring: an npm dependency # into a notebook\"\n  sections:\n    storage: 1\n    shape: 2\n  measured: true\nowner: ", "\ncount: ", "\n"];
  const tryParse = f => {
    const strings = FIXTURE.slice();
    strings.raw = FIXTURE.slice();
    Object.freeze(strings.raw); Object.freeze(strings);
    try { return f(strings, "Ada Lovelace", 7); }
    catch (e) { return "yaml threw: " + String(e?.message ?? e).slice(0, 200); }
  };
  const check = async (reg, before, deadline) => {
    const rt = [...reg.mains.values()].find(m => m && m._runtime)._runtime;
    const fresh = [...rt._variables].filter(v => !before(v._module) && v._name && v._name !== "@variable" && !String(v._name).startsWith("module "));
    if (!fresh.length) return { verdict: "no module was created" };
    const yamls = fresh.filter(v => v._name === "yaml");
    if (!yamls.length) return { fresh, verdict: "no cell named yaml in a new module (names: " + [...new Set(fresh.map(v => v._name))].slice(0, 20).join(",") + ")" };
    const keepers = [];
    for (const v of yamls) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
    try {
      while (Date.now() < deadline && !yamls.every(v => v._value !== undefined || v._error != null)) await sleep(200);
      const res = verdict => ({ verdict, fresh });
      for (const v of yamls) {
        if (v._error != null) return res("yaml errors: " + String(v._error?.message ?? v._error).slice(0, 200));
        if (typeof v._value !== "function") return res("yaml is " + (v._value === undefined ? "unresolved" : typeof v._value));
        let got = tryParse(v._value);
        if (got && typeof got.then === "function") got = await got;
        if (typeof got === "string" && got.startsWith("yaml threw")) return res(got);
        if (canon(got) !== canon(EXPECTED)) return res("parsed to " + canon(got)?.slice(0, 300));
      }
      return { verdict: "ok", fresh, rt };
    } finally { for (const k of keepers) { try { k.delete(); } catch {} } }
  };

  const liveBefore = m => globalThis.__rc5tBefore.has(m);
  let live;
  try { live = await check(globalThis.__ojs_runtime, liveBefore, Date.now() + 8000); out.parse = live.verdict; }
  catch (e) { out.parse = "check threw: " + (e?.message ?? e); }
  out.ms.parse = Date.now() - t0;

  // reacts: an example cell that reads yaml and some other cell of a new module
  try {
    const fresh = live?.fresh || [];
    const yamlVars = new Set(fresh.filter(v => v._name === "yaml"));
    const users = fresh.filter(v => [...(v._inputs || [])].some(i => i._name === "yaml"));
    let verdict = users.length ? null : "no cell reads yaml";
    for (const u of users) {
      const ups = [...u._inputs].filter(i => i._name !== "yaml" && !liveBefore(i._module) && i._module === u._module && typeof i._value !== "function" && !(i._value instanceof Node));
      if (!ups.length) { verdict = verdict || "cell " + u._name + " reads yaml but no other cell (a constant interpolation does not react)"; continue; }
      const keep = u._module.variable(true).define([u._name], x => x);
      try {
        for (let i = 0; i < 40 && u._value === undefined && u._error == null; i++) await sleep(100);
        const up = ups[0];
        const old = up._value;
        const nu = typeof old === "number" ? old + 1234 : typeof old === "string" ? old + "Zq9" : typeof old === "boolean" ? !old : 1234;
        const beforeVal = JSON.stringify(u._value);
        const origDef = up._definition, origInputs = up._inputs.map(i => i._name);
        up.define(up._name, [], () => nu);
        let after;
        for (let i = 0; i < 40; i++) { await sleep(100); after = JSON.stringify(u._value); if (after !== beforeVal && u._value !== undefined) break; }
        up.define(up._name, origInputs, origDef);
        const needle = typeof nu === "string" ? "Zq9" : String(nu);
        if (after !== beforeVal && after && after.includes(needle)) { verdict = "ok"; break; }
        verdict = "changing " + up._name + " to " + JSON.stringify(nu) + " left " + u._name + " = " + String(after).slice(0, 160);
      } finally { try { keep.delete(); } catch {} }
    }
    out.reacts = verdict;
  } catch (e) { out.reacts = "reacts threw: " + (e?.message ?? e); }
  out.ms.reacts = Date.now() - t0;

  // offline: export as a save does, reopen with every http(s) source refused
  let frame;
  try {
    const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
    const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
    const r = await f({ mains: globalThis.__ojs_runtime.mains });
    let html = typeof r === "string" ? r : r.source;
    out.exportBytes = html.length;
    const csp = '<meta http-equiv="Content-Security-Policy" content="default-src file: blob: data: \'unsafe-inline\' \'unsafe-eval\'; connect-src file: blob: data:; worker-src blob: data:">';
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + csp) : csp + html;
    const userMods = [...globalThis.__ojs_runtime.mains.keys()].filter(k => {
      const m = globalThis.__ojs_runtime.mains.get(k);
      return m && !globalThis.__rc5tBefore.has(m);
    });
    out.userMods = userMods;
    const blocked = [];
    frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;left:0;top:0;width:900px;height:700px;z-index:2147483647;background:#fff";
    frame.srcdoc = html;
    document.body.appendChild(frame);
    const deadline = t0 + 26000;
    const ready = () => { const reg = frame.contentWindow?.__ojs_runtime; return reg?.mains && userMods.length && userMods.every(k => reg.mains.get(k)); };
    while (Date.now() < deadline && !ready()) await sleep(250);
    frame.contentWindow?.document?.addEventListener("securitypolicyviolation", e => blocked.push(e.blockedURI));
    if (!userMods.length) out.offline = "no module was created";
    else if (!ready()) out.offline = "saved notebook did not boot " + userMods.join(",") + " within the deadline";
    else {
      const reg = frame.contentWindow.__ojs_runtime;
      const userSet = new Set(userMods.map(k => reg.mains.get(k)));
      // in the frame, "new" = the modules that were new on the live page, plus what they import
      const frt = [...reg.mains.values()].find(m => m && m._runtime)._runtime;
      const reach = new Set(userSet);
      for (const v of frt._variables) if (userSet.has(v._module)) for (const i of v._inputs || []) if (i._name === "yaml") reach.add(i._module);
      const offline = await check(reg, m => !reach.has(m), deadline);
      out.offline = offline.verdict;
    }
    out.blocked = [...new Set(blocked)].slice(0, 8);
  } catch (e) { out.offline = "offline check threw: " + (e?.message ?? e); }
  finally { frame?.remove(); }
  out.ms.total = Date.now() - t0;
  delete out.fresh;
  return out;
})()`;

// Oracle: js-yaml's own ESM build (dist/js-yaml.mjs, one self-contained file) as an attachment, loaded
// from a blob URL like the _lib cell of vendoring-npm-dependencies.md § 4 (@tomlarkworthy/jszip-3-10-1),
// wrapped as a tag function the way @tomlarkworthy/monty._py (lopebooks/notebooks/tomlarkworthy_monty.html)
// is: a cell whose value is `(strings, ...values) => …`.
const SOLUTION = `const _intro = function intro(md){return(
md\`# YAML cells

\\\`yaml\\\` is a tagged template like \\\`md\\\`: it parses its contents as YAML with js-yaml 4.1.0, vendored as an attachment.\`
)};
const _jsyaml = async function jsyaml(FileAttachment){
  const src = await FileAttachment("js-yaml-4.1.0.mjs").text();
  const objectURL = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  try { return await import(objectURL); } finally { URL.revokeObjectURL(objectURL); }
};
const _yaml = function yaml(jsyaml){return(
(strings, ...values) => {
  const raw = strings.raw.map((s) => s.replace(/\\\\(\`|\\$\\{)/g, "$1"));
  return jsyaml.load(String.raw({ raw }, ...values));
}
)};
const _viewof_servings = function viewof_servings(Inputs){return(
Inputs.range([1, 12], { label: "servings", step: 1, value: 4 })
)};
const _servings = (G, _) => G.input(_);
const _recipe = function recipe(yaml,servings){return(
yaml\`
name: Pancakes
servings: \${servings}
ingredients:
  - flour
  - milk
\`
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_jsyaml", "jsyaml", ["FileAttachment"], _jsyaml);
  $def("_yaml", "yaml", ["jsyaml"], _yaml);
  $def("_viewof_servings", "viewof servings", ["Inputs"], _viewof_servings);
  main.variable(observer("servings")).define("servings", ["Generators", "viewof servings"], _servings);
  $def("_recipe", "recipe", ["yaml", "servings"], _recipe);
  return main;
}
`;

// Negative control (M47_NEG=1): the same module, but the library comes from a CDN at run time. It
// parses and reacts online and must fail `offline`.
const CDN = SOLUTION.replace(`const _jsyaml = async function jsyaml(FileAttachment){
  const src = await FileAttachment("js-yaml-4.1.0.mjs").text();
  const objectURL = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  try { return await import(objectURL); } finally { URL.revokeObjectURL(objectURL); }
};`, `const _jsyaml = async function jsyaml(){
  return await import("https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs");
};`).replace(`["FileAttachment"], _jsyaml`, `[], _jsyaml`);
if (CDN === SOLUTION) throw new Error("m47 eval: negative-control edit did not apply");

// The module the baseline agent wrote (run 20260929-0620-m47-before: its last write_file on
// /src/@user/yaml.js plus the three edit_files after it), with the js-yaml 5.4.2 browser build it attached.
const TRACE = "const _intro = function intro(md){return(\nmd`# yaml\n\nA \\`yaml\\` tagged template literal \u2014 parses YAML into JavaScript objects, like \\`md\\` for YAML.\n\n\\`\\`\\`js\nconfig = yaml\\`\nname: MyApp\nversion: \\${version}\nfeatures:\n  - fast\n  - offline\n\\`\n\\`\\`\\`\n\nInterpolated values are safely YAML-serialized (quoted as needed). Nested objects work too.`\n)};\nconst _yamlLib = async function yamlLib(FileAttachment){\n  const url = URL.createObjectURL(await FileAttachment(\"js-yaml.mjs\").blob());\n  try { return await import(url); } finally { URL.revokeObjectURL(url); }\n};\nconst _yamlBuiltin = function yamlBuiltin(yamlLib){\n  function yaml(strings, ...values) {\n    const serialize = (v) => {\n      if (v === null || v === undefined) return \"null\";\n      if (typeof v === \"string\") {\n        if (v === \"\") return '\"\"';\n        if (/[:{}\\[\\],&*?|>!%@`#'\"\\n\\r]/.test(v) || /^\\s|\\s$/.test(v))\n          return '\"' + v.replace(/\\\\/g, \"\\\\\\\\\").replace(/\"/g, '\\\\\"').replace(/\\n/g, \"\\\\n\").replace(/\\r/g, \"\\\\r\") + '\"';\n        return v;\n      }\n      if (typeof v === \"number\" || typeof v === \"boolean\") return String(v);\n      return yamlLib.dump(v, { lineWidth: -1 }).replace(/\\n+$/, \"\");\n    };\n    let src = strings[0];\n    for (let i = 0; i < values.length; i++) src += serialize(values[i]) + strings[i + 1];\n    return yamlLib.load(src);\n  }\n  const rt = window.__ojs_runtime;\n  if (rt && rt._builtin) rt._builtin.define(\"yaml\", [], () => yaml);\n  return yaml;\n};\nconst _example = function example(yaml, md){\n  const name = \"lopecode\";\n  const version = 3;\n  const config = yaml`\nname: ${name}\nversion: ${version}\nfeatures:\n  - reactive\n  - offline\n  - vendored\nsettings:\n  theme: dark\n  autoSave: true\n`;\n  return md`### Example result\n\n\\`\\`\\`json\n${JSON.stringify(config, null, 2)}\n\\`\\`\\`\n\n**\\`config.name\\`** = \\`\"${config.name}\"\\`  \u00b7  **\\`config.version\\`** = \\`${config.version}\\`  \u00b7  **\\`config.features\\`** = [${config.features.map(f => '`\"' + f + '\"`').join(\", \")}]`;\n};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  $def(\"_intro\", \"intro\", [\"md\"], _intro);\n  $def(\"_yamlLib\", \"yamlLib\", [\"FileAttachment\"], _yamlLib);\n  $def(\"_yamlBuiltin\", \"yaml\", [\"yamlLib\"], _yamlBuiltin);\n  $def(\"_example\", \"example\", [\"yaml\", \"md\"], _example);\n  return main;\n}";

const NEG = process.env.M47_NEG;
export default {
  id: "rc5t-yaml-tagged-template",
  category: "rc5-train",
  question: "I want to write some cells in YAML. Add a yaml`...` tagged template (like md`...`) that parses its contents into a JavaScript object, make it available to my notebook's cells, and show me an example cell that uses it with an interpolated ${value}.",
  setup: {
    init: INIT,
    collect: COLLECT,
    // every js-yaml URL gets the vendored 4.1.0 ESM build (the trace control's 5.4.2 URL included)
    routes: ["**/js-yaml@*/dist/*.mjs", "**/js-yaml@*/dist/*/*.mjs"].map((url) => ({ url, contentType: "text/javascript", body: JSYAML })),
  },
  criteria: [
    { name: "collected_equals", args: { key: "builtins", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "offline", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "parse", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "reacts", equals: "ok" }, weight: 1 },
  ],
  // M47_NEG=cdn: library fetched at run time; M47_NEG=none: nothing written (the unmodified notebook);
  // M47_NEG=trace: the module the baseline agent wrote (set by the worker after reading the trace)
  oracle: NEG === "trace" ? [
    { tool: "write_file", args: { file_path: "/src/@user/yaml.js", content: TRACE } },
    { tool: "attach_file", args: { module: "@user/yaml", name: "js-yaml.mjs", url: "https://cdn.jsdelivr.net/npm/js-yaml@5.4.2/dist/browser/js-yaml.esm.min.mjs" } },
  ] : NEG === "none" ? [
    { tool: "read_file", args: { file_path: "/content/bootconf.json" } },
  ] : NEG === "cdn" ? [
    { tool: "write_file", args: { file_path: "/src/@user/yaml.js", content: CDN } },
  ] : [
    { tool: "write_file", args: { file_path: "/src/@user/yaml.js", content: SOLUTION } },
    { tool: "attach_file", args: { module: "@user/yaml", name: "js-yaml-4.1.0.mjs", url: "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.mjs" } },
  ],
};
