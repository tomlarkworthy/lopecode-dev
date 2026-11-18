// bun lite/soundscript/ts-cells.test.ts [notebook.html]
// The generated @tomlarkworthy/soundscript-runtime and -checker modules (ts-cells.ts):
//  1. every generated cell decompiles and recompiles to the same variables with the standard
//     toolchain (@tomlarkworthy/observablejs-toolchain's compile and decompile);
//  2. the two module blocks of the built notebook, loaded into one headless Runtime with the parser
//     injected, give a `soundscript` with entry.ts's keys, the same kind of value per key, and the same
//     checker verdicts, compiled cells and decompiled sources as entry.ts on the example sources.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import { tsPlugin } from "@sveltejs/acorn-typescript";
import { Runtime } from "@observablehq/runtime";
import { blockContent } from "../../../lib/notebook-blocks.ts";
import { loadNotebook } from "../../../lope-runtime.js";
import { generate, ENTRY, RUNTIME, CHECKER } from "./ts-cells.ts";
import { moduleJs } from "../toolchain/module-js.ts";

process.on("unhandledRejection", () => {});
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const html = readFileSync(resolve(process.argv[2] ?? join(ROOT, "lopebooks/notebooks/soundscript.html")), "utf8");
let pass = 0, fail = 0;
const t = (ok: boolean, what: string) => { console.log(`${ok ? "pass" : "FAIL"} ${what}`); ok ? pass++ : fail++; };

const entry = await import(ENTRY);
const keys = Object.keys(entry).filter((k) => k !== "default").sort();

// 1. decompile, recompile
{
  const log = console.log;
  console.log = () => {};
  const exec = await loadNotebook(join(ROOT, "lopecode/notebooks/@tomlarkworthy_observablejs-toolchain.html"), { settleTimeout: 15000 });
  const compile = (await exec.waitForVariable("compile")).value, decompile = (await exec.waitForVariable("decompile")).value;
  console.log = log;
  const g = generate(compile, keys);
  const shape = (vs: any[]) => JSON.stringify(vs.map((v) => [v._name ?? null, v._inputs ?? [], String(v._definition)]));
  const bad: string[] = [];
  let n = 0;
  // the import cell is left out: the toolchain decompiles an import from live Variables (it resolves the module variable)
  for (const src of [...g.runtime, ...g.checker].filter((s) => !s.startsWith("import "))) {
    const vs = compile(src);
    const again = compile(await decompile(vs));
    n++;
    if (shape(again) !== shape(vs)) { bad.push(src.slice(0, 60)); if (process.env.DEBUG) console.error(await decompile(vs), "\n", shape(vs).slice(0, 600), "\n", shape(again).slice(0, 600)); }
  }
  t(bad.length === 0, `${n} generated cells (all but the import) decompile and recompile to the same variables${bad.length ? ": " + bad.join(" | ") : ""}`);
  exec.dispose();
}

// 2. the built modules, headless
// Generators is a builtin of the notebook's runtime; here, Observable's own Generators.input, which the runtime tests use
const { input } = await import(join(ROOT, "vendor/observable-stdlib/src/generators/input.js"));
const runtime = new Runtime({ Generators: { input } });
const mods = new Map<string, any>();
const realize = (def: string) => new Function(`return (${def});`)();
const load = (name: string, inject: Record<string, unknown> = {}) => {
  const src = blockContent(html, name);
  if (!src) throw new Error(`no ${name} block`);
  const m = runtime.module();
  mods.set(name, m);
  // the definitions, and the imports and $def calls of define(), read from the block's parse
  const { variables, imports } = moduleJs(src);
  for (const v of variables) {
    if (v.name !== null && v.name in inject) m.define(v.name, [], () => inject[v.name!]);
    else m.define(v.name, v.inputs, realize(v.definition));
  }
  for (const x of imports) {
    const from = mods.get(x.from);
    if (!from) throw new Error(`${name} imports ${x.from}, not loaded`);
    m.import(x.remote, x.local, from);
  }
  return m;
};
// every named cell of a module evaluates; the runtime module first, alone
const all = async (name: string) => {
  const names = moduleJs(blockContent(html, name)!).variables.map((v) => v.name).filter((n): n is string => n !== null);
  const failed: string[] = [];
  for (const n of names) await mods.get(name).value(n).catch((e: Error) => failed.push(`${n}: ${e.message}`));
  t(failed.length === 0, `${name}: all ${names.length} named cells evaluate${failed.length ? "; " + failed.join("; ") : ""}`);
};
load(RUNTIME);
await all(RUNTIME);
const checker = load(CHECKER, { parser_lib: { acorn, tsPlugin } });
await all(CHECKER);
const ss = await checker.value("soundscript");
const got = Object.keys(ss).sort();
t(JSON.stringify(got) === JSON.stringify(keys), `soundscript has entry.ts's ${keys.length} keys${JSON.stringify(got) === JSON.stringify(keys) ? "" : ": " + JSON.stringify({ extra: got.filter((k) => !keys.includes(k)), missing: keys.filter((k) => !got.includes(k)) })}`);
const kind = (v: unknown) => (typeof v === "function" ? (v.toString().startsWith("class") ? "class" : "function") : v === null ? "null" : Array.isArray(v) ? "array" : typeof v === "object" ? Object.prototype.toString.call(v) : typeof v);
const kinds = keys.filter((k) => kind(ss[k]) !== kind(entry[k]));
t(kinds.length === 0, `each key holds the same kind of value${kinds.length ? ": " + kinds.map((k) => `${k} ${kind(ss[k])} vs ${kind(entry[k])}`).join(", ") : ""}`);

// the example sources: checked, compiled and decompiled by both, compared as JSON
const EXAMPLES = join(HERE, "../notebook/examples");
const json = (v: unknown) => JSON.stringify(v, (_, x) => (x instanceof Map ? [...x] : x instanceof Set ? [...x] : typeof x === "function" ? "fn" : x));
const sources = [...readdirSync(EXAMPLES).sort().map((f) => readFileSync(join(EXAMPLES, f), "utf8")), readFileSync(join(HERE, "core-example.ts"), "utf8")];
let same = 0;
const differ: string[] = [];
for (const [i, src] of sources.entries()) {
  const a = entry.checkSources({ cells: src, tsx: true }), b = ss.checkSources({ cells: src, tsx: true });
  const strip = (r: any) => ({ ...r, ms: undefined, timings: undefined });
  if (json(strip(a)) !== json(strip(b))) { differ.push(`check ${i}`); continue; }
  const texts = entry.splitCells(src, true);
  const ca = entry.contextFromCheck(a, src, true), cb = ss.contextFromCheck(b, src, true);
  const va = texts.map((x: string) => entry.compileCell(x, true, ca)), vb = texts.map((x: string) => ss.compileCell(x, true, cb));
  if (json(va) !== json(vb)) { differ.push(`compile ${i}`); continue; }
  const da = va.flat().map((v: any) => entry.decompileVariable(v.definition)), db = vb.flat().map((v: any) => ss.decompileVariable(v.definition));
  if (json(da) !== json(db)) { differ.push(`decompile ${i}`); continue; }
  same++;
}
t(differ.length === 0, `${same}/${sources.length} example sources: the same check, compiled variables and decompiled sources${differ.length ? "; differ: " + differ.join(", ") : ""}`);
runtime.dispose();
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
