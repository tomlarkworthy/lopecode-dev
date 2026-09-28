// rc5-train 20260928-0847-m35 (gaps found by m34):
// (A) a write that makes a cell's RENDERED text show NaN/undefined/Infinity reported "✓ all cells compute"
//     (m34: md prose showed "(NaN× the mean)"). A cell whose prose always says "NaN" must not be flagged.
// (B) write_file / edit_file that drop an import leave the imported variable behind in the runtime.
// No model calls. argv[2] = notebook path; run from the repo root.
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
const root = process.cwd();
const { bootNotebook } = await import(pathToFileURL(join(root, "tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = process.argv[2] ? resolve(process.argv[2]) : join(root, "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await sleep(1500);
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await sleep(300);
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" });
  const rt = globalThis.__ojs_runtime;
  const names = id => { const m = rt.mains.get(id) || [...rt._variables].find(v => v._module && v._module._name === id)?._module; return [...rt._variables].filter(v => v._module === m && v._name).map(v => v._name); };

  // (A) stats changes shape from {mean, worst} to [mean, worst]; _r (anonymous md) and ratio (named) render NaN
  const nan = shape => `const _s = function _stats(){return(${shape})};
const _r = function _1(md,stats){return(md\`mean \${stats.mean} ms, worst \${stats.worst} ms (\${(stats.worst / stats.mean).toFixed(1)}× the mean)\`)};
const _q = function _ratio(htl,stats){return(htl.html\`<p>ratio: \${(stats.worst / stats.mean).toFixed(2)}</p>\`)};
const _p = function _2(md){return(md\`In JavaScript NaN is not equal to itself, and a missing property reads as undefined.\`)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_s", "stats", [], _s);
  $def("_r", null, ["md", "stats"], _r);
  $def("_q", "ratio", ["htl", "stats"], _q);
  $def("_p", null, ["md"], _p);
  return main;
}`;
  const a0 = await run("write_file", { file_path: "/src/@probe/nan.js", content: nan("{mean: 2, worst: 5}") });
  await sleep(800);
  const a1 = await run("write_file", { file_path: "/src/@probe/nan.js", content: nan("[2, 5]") });

  // (B) a library, and a module importing one name from it
  await run("write_file", { file_path: "/src/@probe/lib.js", content: `const _a = function _summarise(){return((xs) => xs.length)};
const _b = function _summarize(){return((xs) => xs.length)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_a", "summarise", [], _a);
  $def("_b", "summarize", [], _b);
  return main;
}` });
  await sleep(500);
  const user = (imp, use) => `const _u = function _n(${use}){return(${use}([1, 2, 3]))};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  main.define("module @probe/lib", async () => runtime.module((await import("/@probe/lib.js?v=4")).default));
${imp.map(n => `  main.define("${n}", ["module @probe/lib", "@variable"], (_, v) => v.import("${n}", _));`).join("\n")}
  $def("_u", "n", ["${use}"], _u);
  return main;
}`;
  const b0 = await run("write_file", { file_path: "/src/@probe/imp.js", content: user(["summarise"], "summarise") });
  await sleep(800);
  const n0 = names("@probe/imp");
  const b1 = await run("write_file", { file_path: "/src/@probe/imp.js", content: user(["summarize"], "summarize") });
  await sleep(800);
  const n1 = names("@probe/imp");
  // edit_file: add an import back, then remove it with an edit
  await run("write_file", { file_path: "/src/@probe/imp2.js", content: user(["summarise", "summarize"], "summarize").replace(/@probe\/imp\b/g, "@probe/imp2") });
  await sleep(800);
  const n2a = names("@probe/imp2");
  const e1 = await run("edit_file", { file_path: "/src/@probe/imp2.js", old_string: `  main.define("summarise", ["module @probe/lib", "@variable"], (_, v) => v.import("summarise", _));\n`, new_string: "" });
  await sleep(800);
  const n2 = names("@probe/imp2");
  // m34's shape: the library renamed summarise -> summarize, so the old binding errors; one write renames the
  // import and the reader. A 2-import module with the reader defined BEFORE the import lines (imports go last).
  const lib2 = n => `const _a = function _${n}(){return((xs) => xs.length)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_a", "${n}", [], _a);
  return main;
}`;
  await run("write_file", { file_path: "/src/@probe/lib2.js", content: lib2("summarise") });
  await sleep(500);
  const rep = use => user([use], use).replace(/@probe\/lib\b/g, "@probe/lib2").replace(/@probe\/imp\b/g, "@probe/rep");
  await run("write_file", { file_path: "/src/@probe/rep.js", content: rep("summarise") });
  await sleep(800);
  await run("write_file", { file_path: "/src/@probe/lib2.js", content: lib2("summarize") });
  await sleep(800);
  const n3a = names("@probe/rep");
  const b3 = await run("write_file", { file_path: "/src/@probe/rep.js", content: rep("summarize") });
  await sleep(800);
  const n3 = names("@probe/rep");
  const repMod = rt.mains.get("@probe/rep") || [...rt._variables].find(v => v._module && v._module._name === "@probe/rep")?._module;
  const dump3 = [...rt._variables].filter(v => v._module === repMod).map(v => ({ name: v._name, type: v._type, pid: v.pid, inputs: (v._inputs || []).map(i => i && i._name), outputs: v._outputs.size }));
  return { a0, a1, b0: b0.slice(0, 300), b1: b1.slice(0, 400), e1: e1.slice(0, 400), b3: b3.slice(0, 500), n0, n1, n2a, n2, n3a, n3, dump3 };
});
console.log(JSON.stringify({ ...out, a0: out.a0.slice(0, 600), a1: out.a1.slice(0, 1200) }, null, 1));
const A0 = !/NaN|undefined/.test(out.a0.replace(/In JavaScript NaN[^)]*/g, ""));
const A1 = !/✓ all \d+ cells? compute/.test(out.a1) && /anonymous cell _r\b[^·]*shows? "[^"]*NaN/.test(out.a1) && /ratio[^·]*shows? "[^"]*NaN/.test(out.a1);
const Aprose = !/_p\b/.test(out.a0) && !/_p\b/.test(out.a1);
const B1 = out.n0.includes("summarise") && !out.n1.includes("summarise") && out.n1.includes("summarize");
const B2 = out.n2a.includes("summarise") && !out.n2.includes("summarise") && out.n2.includes("summarize");
const B3 = out.n3a.includes("summarise") && !out.n3.includes("summarise") && out.n3.includes("summarize") && !/ERRORING/.test(out.b3);
console.log(`A0 first write (no NaN) not flagged: ${A0 ? "PASS" : "FAIL"}`);
console.log(`A1 write that renders NaN flags the md cell and names it: ${A1 ? "PASS" : "FAIL"}`);
console.log(`A2 prose that always says NaN/undefined never flagged: ${Aprose ? "PASS" : "FAIL"}`);
console.log(`B1 write_file dropping an import deletes its variable: ${B1 ? "PASS" : "FAIL"} (${out.n0.join(",")} -> ${out.n1.join(",")})`);
console.log(`B2 edit_file dropping an import deletes its variable: ${B2 ? "PASS" : "FAIL"} (${out.n2a.join(",")} -> ${out.n2.join(",")})`);
console.log(`B3 renamed import whose old name the library dropped: ${B3 ? "PASS" : "FAIL"} (${out.n3a.join(",")} -> ${out.n3.join(",")})`);
await close();
process.exit(A0 && A1 && Aprose && B1 && B2 && B3 ? 0 : 1);
