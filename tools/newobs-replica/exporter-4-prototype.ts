// exporter-4, option C, headless prototype.
//
// Exports a LIVE notebook-kit module as a lopecode `define(runtime, observer)` module that keeps the
// runtime's own names (`cell 11`, `viewof$view`, `mutable$q`), boots the export into a fresh runtime,
// and compares E0 fingerprints. Then re-exports the booted copy and checks the source is a fixed point.
//
// Per variable, by cell-map-2's `roleOf` (name, type, inputs only):
//   body                       definition text, verbatim
//   projection                 regenerated `(exports) => exports["<name>"]`   (define.ts:91 closes over o)
//   view-input                 notebook-kit `input`, referenced                (define.ts:78, not copyable)
//   mutator on `cell N`        notebook-kit `Mutator`, referenced              (define.ts:85, not copyable)
//   nk mutable getter/accessor regenerated                                     (define.ts:82,86)
//   classic glue               verbatim; every classic shape is self-contained
//   builtin/constant/implicit  skipped; the runtime recreates them on reference
//   shadow                     skipped; rebuilt from the owner's `_shadow` keys as define.ts:47-70 does
// Anything else refuses loudly rather than serialising a closure.
//
// Unverified here: post-run import aliases (headless imports never run, so every import output is
// still a pre-run projection), and where `nk` comes from inside a lopecode page (E3).
//
// run: bun tools/newobs-replica/exporter-4-prototype.ts
import { Window } from "happy-dom";
import { Runtime } from "@observablehq/runtime";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { importNotebookModule } from "../notebook-import.ts";
import { transpileJavaScript } from "../../vendor/notebook-kit/src/javascript/transpile.ts";
import { transpileObservable } from "../../vendor/notebook-kit/src/javascript/observable.ts";
import { define } from "../../vendor/notebook-kit/src/runtime/define.ts";
import { display, clear } from "../../vendor/notebook-kit/src/runtime/display.ts";
import { input } from "../../vendor/notebook-kit/src/runtime/stdlib/generators/index.ts";
import { Mutator } from "../../vendor/notebook-kit/src/runtime/stdlib/mutable.ts";

const window = new Window();
for (const k of ["Element", "Text", "Node", "HTMLElement", "DocumentFragment"]) (globalThis as any)[k] = (window as any)[k];
(globalThis as any).document = window.document;
process.on("unhandledRejection", () => {});

const cm = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
const roleOf = await cm.value("roleOf");
const acc = await cm.value("runtimeAccessors");
const defInfo = await cm.value("defInfo");

const moduleVars = (module: any) => [...module._runtime._variables].filter((v: any) => v._module === module);
const holderName = (n: unknown) => typeof n === "string" && /^cell \d+$/.test(n);
const observed = (v: any) => typeof v._observer !== "symbol";
const shadowKeys = (v: any) => (v._shadow ? [...v._shadow.keys()].sort() : []);
// A shadow input resolves to an anonymous variable, so its name is the key that holds it.
const inputNames = (v: any) =>
  v._inputs.map((i: any) => i._name ?? [...(v._shadow ?? [])].find(([, s]: any) => s === i)?.[0] ?? null);

// E0: a multiset of per-variable structure. Bodies contribute their text; glue contributes its role,
// because glue text is bundle-specific and is exactly what the export is allowed to change.
function fingerprint(module: any): string[] {
  const vars = moduleVars(module);
  const named = new Map(vars.filter((v: any) => v._name != null).map((v: any) => [v._name, v]));
  return vars
    .map((v: any) => {
      const role = roleOf(v, acc, (n: string) => named.get(n));
      const body = role === "body" ? String(v._definition) : role;
      return [v._name ?? "(anon)", v._type, inputNames(v).join(","), observed(v), shadowKeys(v).join(","), body].join(" | ");
    })
    .sort();
}

function exportModule(module: any): string {
  const vars = moduleVars(module);
  const named = new Map(vars.filter((v: any) => v._name != null).map((v: any) => [v._name, v]));
  const importHolders = vars.filter((v: any) => defInfo(v._definition).importCell);
  const lines: string[] = [];
  for (const v of vars) {
    const name = v._name ?? null;
    const inputs = inputNames(v);
    const role = roleOf(v, acc, (n: string) => named.get(n));
    let fn: string;
    switch (role) {
      case "builtin":
      case "constant":
      case "implicit":
      case "shadow":
        continue;
      case "body":
        fn = String(v._definition);
        break;
      case "projection":
        fn = `(exports) => exports[${JSON.stringify(name)}]`;
        break;
      case "view-input":
        fn = "nk.input";
        break;
      case "mutator":
        fn = holderName(name) ? "nk.Mutator" : String(v._definition);
        break;
      case "mutable-getter":
        fn = holderName(inputs[0]) ? "([mutable]) => mutable" : String(v._definition);
        break;
      case "mutable-accessor":
        // an output of an unrun import holder is also named mutable$… with a cell N input
        if (holderName(inputs[0]) && importHolders.some((h: any) => h._name === inputs[0])) fn = `(exports) => exports[${JSON.stringify(name)}]`;
        else fn = holderName(inputs[0]) ? "([, mutator]) => mutator" : String(v._definition);
        break;
      case "view-getter":
        fn = String(v._definition);
        break;
      case "import-alias": {
        const owner = importHolders.find((h: any) => defInfo(h._definition).locals.includes(name));
        if (!owner) throw Error(`import alias ${name} has no import cell enumerating it`);
        lines.push(`  $v(true, ${JSON.stringify(name)}, [${JSON.stringify(owner._name)}], (exports) => exports[${JSON.stringify(name)}]);`);
        continue;
      }
      default:
        throw Error(`refusing to export ${name}: unhandled role ${role}`);
    }
    const shadow = shadowKeys(v);
    const pid = v.pid ? `, ${JSON.stringify(v.pid)}` : "";
    lines.push(`  $v(${observed(v)}, ${JSON.stringify(name)}, ${JSON.stringify(inputs)}, ${fn}, ${JSON.stringify(shadow)}${pid});`);
  }
  return `export default function define(runtime, observer, nk = globalThis.__notebookKit) {
  const main = runtime.module();
  // Rebuilds define.ts:47-70. The shadows close over per-cell display state, so they cannot be copied.
  const $shadow = (v, inputs, keys, output) => {
    const state = { root: document.createElement("div"), expanded: [], variables: [v] };
    let displayVersion = -1;
    const vd = new v.constructor(2, main);
    vd.define(inputs.filter((i) => i !== "display" && i !== "view"), () => {
      const version = v._version;
      return (value) => {
        if (version < displayVersion) throw new Error("stale display");
        else if (version > displayVersion) nk.clear(state);
        displayVersion = version;
        nk.display(state, value, output);
        return value;
      };
    });
    v._shadow.set("display", vd);
    if (keys.includes("view")) {
      const vv = new v.constructor(2, main, null, { shadow: {} });
      vv._shadow.set("display", vd);
      vv.define(["display"], (display) => (value) => nk.input(display(value)));
      v._shadow.set("view", vv);
    }
  };
  const $v = (isObserved, name, inputs, fn, shadow = [], pid) => {
    const v = main.variable(isObserved ? observer(name) : undefined, shadow.length ? { shadow: {} } : undefined);
    if (shadow.length) $shadow(v, inputs, shadow, name);
    v.define(name, inputs, fn);
    if (pid) v.pid = pid;
    return v;
  };
${lines.join("\n")}
  return main;
}
`;
}

const outDir = resolve("tools/scratch/exporter-4-out");
mkdirSync(outDir, { recursive: true });
const nkHelpers = { input, Mutator, display, clear };

// Not `import()`: Bun transpiles an imported file and re-prints every function, so `toString()` of a
// booted body stops matching the text that was exported. A browser keeps the text; so does this.
async function boot(source: string, label: string) {
  await Bun.write(`${outDir}/${label}.js`, source);
  const head = "export default function define(";
  if (!source.startsWith(head)) throw Error("export does not start with its own define header");
  const defineFn = new Function(`return function define(${source.slice(head.length)}`)();
  const rt = new Runtime();
  return defineFn(rt, () => true, nkHelpers);
}

const diff = (a: string[], b: string[]) => {
  const count = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
  const ca = count(a), cb = count(b);
  const onlyA = [...ca].flatMap(([k, n]) => Array(Math.max(0, n - (cb.get(k) ?? 0))).fill(k));
  const onlyB = [...cb].flatMap(([k, n]) => Array(Math.max(0, n - (ca.get(k) ?? 0))).fill(k));
  return { onlyLive: onlyA, onlyExport: onlyB };
};

async function roundTrip(label: string, liveModule: any, settle?: (m: any) => Promise<unknown>) {
  const live = fingerprint(liveModule);
  const first = exportModule(liveModule);
  const booted = await boot(first, `${label}-1`);
  if (settle) await settle(booted);
  const fpBooted = fingerprint(booted);
  const second = exportModule(booted);
  await Bun.write(`${outDir}/${label}-2.js`, second);
  const d = diff(live, fpBooted);
  console.log(`\n== ${label}: live ${live.length} variables, booted export ${fpBooted.length}`);
  console.log(`   fingerprint equal: ${d.onlyLive.length === 0 && d.onlyExport.length === 0}`);
  for (const x of d.onlyLive) console.log("   only live:  ", x.slice(0, 160));
  for (const x of d.onlyExport) console.log("   only export:", x.slice(0, 160));
  console.log(`   re-export is a fixed point: ${first === second} (${first.length} bytes)`);
  return { live, fpBooted, first, second };
}

const realizeFallback = async (sources: string[]) => sources.map((src) => { let f: any; eval("f = " + src); return f; });
const kit = { transpileJavaScript, transpileObservable, define };
const nk = await importNotebookModule("modules/@tomlarkworthy/notebook-kit-semantics.js", {
  overrides: { kit, Runtime, realize: realizeFallback, runtime: { _global: () => undefined } }
});
const fixture = await nk.value("nkFixture");
await roundTrip("nkFixture", fixture.module);

const buildNkFixture = await nk.value("buildNkFixture");
const rt = new Runtime();
const module = rt.module();
await buildNkFixture(module, [
  { id: 1, mode: "js", value: 'const counter = view(Inputs.range([0, 10], {label: "counter"}));' },
  { id: 2, mode: "js", value: "display(counter * 2);" },
  { id: 3, mode: "js", value: "const a = 1, b = 2;" },
  { id: 4, mode: "ojs", value: "mutable m = 1" },
  { id: 5, mode: "ojs", value: "viewof v = Inputs.range()" },
  { id: 6, mode: "ojs", value: "y = a + b + m + v" },
  { id: 7, mode: "ojs", value: "k = 42" }
], {});
await roundTrip("view-display", module);

// Controls: an export broken on purpose must change the fingerprint, or the equalities above are vacuous.
{
  const first = exportModule(module);
  const live = fingerprint(module);
  const controls: [string, (s: string) => string][] = [
    ["shadows not rebuilt", (s) => s.replace("if (shadow.length) $shadow(v, inputs, shadow, name);", "")],
    ["viewof$v renamed to legacy viewof v", (s) => s.replaceAll('"viewof$v"', '"viewof v"')],
    ["observers dropped", (s) => s.replace("isObserved ? observer(name) : undefined", "undefined")]
  ];
  console.log("\n== controls on view-display (each should report equal = false)");
  for (const [label, mutate] of controls) {
    const src = mutate(first);
    if (src === first) {
      console.log(`   control ${label}: MUTATION DID NOT APPLY`);
      continue;
    }
    let equal: boolean | string;
    try {
      const d = diff(live, fingerprint(await boot(src, `control-${label.replace(/\W+/g, "-")}`)));
      equal = d.onlyLive.length === 0 && d.onlyExport.length === 0;
    } catch (e) {
      equal = "boot threw: " + String(e).slice(0, 80);
    }
    console.log(`   control ${label}: equal = ${equal}`);
  }
}

// Behaviour: structure equal is not values equal. These cells compute headlessly (no Inputs), and
// exercise the three non-copyable paths: a view shadow, the referenced `input`, and `Mutator`.
async function behaviour(m: any) {
  const read = async (n: string) => {
    try {
      const v = await Promise.race([m.value(n), new Promise((_, r) => setTimeout(() => r(new Error("hung 3s")), 3000))]);
      return v instanceof (globalThis as any).Element ? `<${v.tagName.toLowerCase()} value=${JSON.stringify((v as any).value)}>` : v;
    } catch (e) {
      return "ERR " + String(e).slice(0, 60);
    }
  };
  const out: any = {};
  for (const n of ["counter", "viewof$w", "w", "m", "mplus", "a", "b", "sum"]) out[n] = await read(n);
  const accessor: any = await read("mutable$m");
  if (accessor && typeof accessor === "object") {
    accessor.value = 5;
    await new Promise((r) => setTimeout(r, 50));
    out["mplus after mutable$m.value = 5"] = await read("mplus");
  } else out["mutable$m"] = accessor;
  return out;
}
{
  const brt = new Runtime();
  const bmod = brt.module();
  await buildNkFixture(bmod, [
    { id: 21, mode: "js", value: 'const counter = view(Object.assign(document.createElement("input"), {value: "5"}));' },
    { id: 22, mode: "ojs", value: 'viewof w = Object.assign(document.createElement("input"), {value: "hi"})' },
    { id: 23, mode: "ojs", value: "mutable m = 1" },
    { id: 24, mode: "ojs", value: "mplus = m + 1" },
    { id: 25, mode: "js", value: "const a = 1, b = 2;" },
    { id: 26, mode: "ojs", value: "sum = a + b + Number(counter)" }
  ], {});
  const { first } = await roundTrip("behaviour", bmod);
  const liveValues = await behaviour(bmod);
  const bootedValues = await behaviour(await boot(first, "behaviour-values"));
  console.log("   live values:  ", JSON.stringify(liveValues));
  console.log("   booted values:", JSON.stringify(bootedValues));
  console.log(`   values equal: ${JSON.stringify(liveValues) === JSON.stringify(bootedValues)}`);
}

// Post-run imports. Headlessly the api.observablehq.com import fails, so every import output above
// stayed a pre-run projection and the import-alias branch never ran. Pointing the URL at the recorded
// /api/import fixture BEFORE the live module is built lets the imports run and rewire each output to
// its remote variable. The live body text then already holds the local URL, so the export needs no
// rewrite of its own. This is a stand-in for E4's networking normalization, not a test of it.
{
  const API = JSON.stringify("https://api.observablehq.com/@tomlarkworthy/dependancy.js?v=4");
  const LOCAL = JSON.stringify(pathToFileURL(resolve("tools/newobs-fixtures/api-import/@tomlarkworthy/dependancy.js")).href);
  let localised = 0;
  const localRealize = async (sources: string[]) =>
    sources.map((src) => {
      const s = src.split(API).join(LOCAL);
      if (s !== src) localised++;
      let f: any;
      eval("f = " + s);
      return f;
    });
  const doc = await nk.value("nkFixtureDoc");
  const prt = new Runtime();
  const pmod = prt.module();
  await buildNkFixture(pmod, doc, { realize: localRealize });
  if (!localised) throw Error("no import body carried the dependancy URL; the post-run case would be vacuous");
  const settle = async (m: any) => {
    const r = await Promise.race([m.value("dep"), new Promise((res) => setTimeout(() => res("TIMEOUT"), 5000))]);
    await new Promise((res) => setTimeout(res, 200));
    return r;
  };
  const dep = await settle(pmod);
  const named = new Map(moduleVars(pmod).filter((v: any) => v._name != null).map((v: any) => [v._name, v]));
  const aliases = moduleVars(pmod).filter((v: any) => roleOf(v, acc, (n: string) => named.get(n)) === "import-alias").map((v: any) => v._name);
  console.log(`\n== post-run imports: ${localised} import bodies localised, dep = ${JSON.stringify(dep)}, import-alias roles: ${aliases.length} ${JSON.stringify(aliases)}`);
  if (!aliases.length) console.log("   VACUOUS: no import output was rewired, so the import-alias branch did not run");
  await roundTrip("nkFixture-post-run", pmod, settle);
}

nk.dispose();
cm.dispose();
process.exit(0);
