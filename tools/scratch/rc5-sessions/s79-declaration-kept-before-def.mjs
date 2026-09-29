// rc5-train probe (20260929-0620-m67): an edit_file that adds a `const _x = function…` declaration without its
// $def line must keep the declaration in /src, so the next edit (adding the $def) compiles, and must warn that
// it is not a cell yet. Before the fix, cellHelpers.authoredOf counted unresolved import bindings (module loader,
// @variable) as cells, so the post-write snapshot never matched and every /src read re-exported from the runtime,
// dropping the $def-less declaration. The "0 cells changed" count is a separate file-sync jbApply defect (held
// back) and is not checked here. No model calls. Usage: node tools/scratch/rc5-sessions/s79-declaration-kept-before-def.mjs <notebook.html>
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs")).href);
const { page, close } = await bootNotebook({ notebookPath: resolve(process.argv[2]), layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args) => String((await byId.get(id).execute(args, { sessionState: {} }))?.output ?? "");
  const file = "/src/@tomlarkworthy/command-palette.js";
  await run("read_file", { file_path: file });
  const r1 = await run("edit_file", { file_path: file, old_string: "export default function define(runtime, observer) {",
    new_string: "const _probeCell = function probeCell(){return( 1 )};\nexport default function define(runtime, observer) {" });
  await new Promise(r => setTimeout(r, 1500));
  const src1 = await run("read_file", { file_path: file });
  const r2 = await run("edit_file", { file_path: file, old_string: '  $def("_1opf5e1", "moduleFinderPlugin"',
    new_string: '  $def("_probeCell", "probeCell", [], _probeCell);\n  $def("_1opf5e1", "moduleFinderPlugin"' });
  await new Promise(r => setTimeout(r, 1500));
  return { r1, r2, kept: /_probeCell = function/.test(src1) };
});
await close();
const checks = {
  "declaration kept in /src after the declaration-only edit": out.kept,
  "declaration-only edit says the declaration is kept": /declaration is kept in the file/.test(out.r1),
  "declaration-only edit warns the function is not registered": /no \$def in define\(\) registers it/.test(out.r1),
  "the follow-up edit adding the $def applies": /applied live/.test(out.r2) && !/FAILED TO COMPILE/.test(out.r2),
};
for (const [k, ok] of Object.entries(checks)) console.log((ok ? "PASS " : "FAIL ") + k);
console.log("r1: " + out.r1.slice(0, 110) + "\nr2: " + out.r2.slice(0, 110));
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
