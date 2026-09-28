// probe (20260928-0847-m25): a cell is its `const _x = function…` declaration AND its $def line. Removing
// only one of the two must say so, naming the holder and the $def line. m20's runs (tidy-unused-cells) deleted
// declarations first; each edit came back "FAILED TO COMPILE: _catv1 is not defined", which names only the
// first missing holder, so after five deletions the agent spent two read_files finding the $def lines.
// usage (from the repo root): node <this file> <notebook.html>
import { resolve } from "node:path";
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { bootNotebook } = await import(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs"));
const P = "/src/@probe/tidy.js";
const mod = cells => cells.map(([pid, name, deps, body]) => `const ${pid} = function _${name}(${deps.join(",")}){return(\n${body}\n)};`).join("\n") +
  `\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };\n` +
  cells.map(([pid, name, deps]) => `  $def("${pid}", ${JSON.stringify(name)}, ${JSON.stringify(deps)}, ${pid});`).join("\n") + "\n  return main;\n}\n";
// pids differ from cell names, as in exported modules (m20: const _catv1 = function _categories_v1)
const BASE = mod([["_a", "a", [], "2"], ["_b", "b", ["a"], "a * 3"], ["_old", "categories_v1", [], "[1, 2, 3]"], ["_scr", "scratch", ["b"], "b + 1"]]);
const decl = pid => BASE.match(new RegExp(`const ${pid} = [\\s\\S]*?\\n\\)\\};\\n`))[0];
const defLine = pid => BASE.split("\n").find(l => l.includes(`$def("${pid}"`)) + "\n";
const lineNo = pid => BASE.split("\n").findIndex(l => l.includes(`$def("${pid}"`)) + 1;
const edit = (o, n = "") => ["edit_file", { file_path: P, old_string: o, new_string: n }];
const w = ["write_file", { file_path: P, content: BASE }];
const cases = {
  // (a) delete only a declaration
  delDecl: [w, edit(decl("_old"))],
  // m20 fixed2 replayed: two declarations deleted, then their $def lines one at a time on the kept draft
  delTwo: [w, edit(decl("_old")), edit(decl("_scr")), edit(defLine("_old")), edit(defLine("_scr"))],
  // (b) delete only a $def line
  delDef: [w, edit(defLine("_old"))],
  // (c) add a declaration, forget its $def
  addDecl: [w, edit("export default", "const _extra = function _extraCell(a){return(\na + 1\n)};\nexport default")],
  // (c) the same, with the function expression named like its holder (batch 58's count saw 2 mentions and passed it)
  addDeclSelf: [w, edit("export default", "const _extra = function _extra(a){return(\na + 1\n)};\nexport default")],
  // (c') add a $def, forget its declaration
  addDef: [w, edit(defLine("_b"), defLine("_b") + `  $def("_extra", "extra", ["a"], _extra);\n`)],
  // negative: an undefined name that is not a $def holder gets no $def hint
  otherUndef: [w, edit("  return main;", "  main.define(\"x\", [], helperFn);\n  return main;")],
};
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async (cases) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const res = {};
  let i = 0;
  for (const [k, steps] of Object.entries(cases)) {
    const ctx = { sessionState: {} };
    await byId.get("read_file").execute({ file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" }, ctx);
    const outs = [];
    // a fresh module per case: rename the path
    const path = "/src/@probe/tidy" + (i++) + ".js";
    for (const [tool, args] of steps) outs.push(String((await byId.get(tool).execute({ ...args, file_path: path }, ctx))?.output ?? ""));
    res[k] = outs;
  }
  return res;
}, cases);
const both = /declaration AND its \$def line/;
const checks = [
  ["(a) delDecl: fails, names $def line N and _old, says a cell is both", /FAILED TO COMPILE: _old is not defined/.test(out.delDecl[1]) && new RegExp(`line ${lineNo("_old") - decl("_old").split("\n").length + 1} \`\\$def\\("_old"`).test(out.delDecl[1]) && both.test(out.delDecl[1])],
  ["(a) delTwo: 2nd failure names BOTH missing holders, not only the first", /_old/.test(out.delTwo[2]) && /\$def\("_scr"/.test(out.delTwo[2]) && /2 \$def lines/.test(out.delTwo[2])],
  ["(a) delTwo: after one $def removed, the remaining one is named", /FAILED TO COMPILE/.test(out.delTwo[3]) && /\$def\("_scr"/.test(out.delTwo[3]) && !/\$def\("_old"/.test(out.delTwo[3])],
  ["(a) delTwo: the draft was kept; the last edit applies", /applied live/.test(out.delTwo[4])],
  ["(b) delDef: applies, names _old as a function no $def registers", /applied live/.test(out.delDef[1]) && /no \$def in define\(\) registers it[^·]*_old/.test(out.delDef[1]) && /Add a \$def line for each, or delete/.test(out.delDef[1])],
  ["(c) addDecl: applies, names _extra as a function no $def registers", /no \$def in define\(\) registers it[^·]*_extra/.test(out.addDecl[1])],
  ["(c) addDeclSelf: a self-named function with no $def is named too", /no \$def in define\(\) registers it[^·]*_extra/.test(out.addDeclSelf[1])],
  ["(c') addDef: fails, names the $def line for _extra, says a cell is both", /FAILED TO COMPILE/.test(out.addDef[1]) && /\$def\("_extra"/.test(out.addDef[1]) && both.test(out.addDef[1])],
  ["negative: an undefined non-holder name gets no $def hint", /FAILED TO COMPILE: helperFn is not defined/.test(out.otherUndef[1]) && !both.test(out.otherUndef[1])],
];
let ok = true;
for (const [name, pass] of checks) { ok &&= pass; console.log(pass ? "ok  " : "FAIL", name); }
if (process.env.VERBOSE || !ok) for (const [k, v] of Object.entries(out)) console.log("\n--", k, "\n" + v.map(s => s.replace(/ · (metrics|source of)[\s\S]*?(?= · |$)/g, "").slice(0, 900)).join("\n>> "));
console.log(ok ? "PASS" : "FAIL");
await close();
process.exit(ok ? 0 : 1);
