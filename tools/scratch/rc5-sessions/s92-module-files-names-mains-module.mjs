// S92: fileattachments.all_module_files names a module booted from mains by its id, not "main".
// rc5-train 20260929-0620-m49: @user/latency (a mains module) showed in the file panel as "main (1 file)",
// because all_module_files named modules only through `module <id>` loader variables. No model calls.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve("tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "all_module_files"].forEach(n => H.force(n));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await sleep(300);
  const tools = () => new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args) => { try { return String((await tools().get(id).execute(args, {}))?.output ?? ""); } catch (e) { return "THREW " + e; } };
  await run("write_file", { file_path: "/src/@probe/owner.js", content: `const _t = function _t(FileAttachment){return(FileAttachment("d.csv").text())};
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("t")).define("t", ["FileAttachment"], _t).pid = "_t";
  return main;
}` });
  const att = await run("attach_file", { module: "@probe/owner", name: "d.csv", content: "a,b\n1,2\n", mime: "text/csv" });
  const rt = window.__ojs_runtime;
  const inMains = rt.mains.has("@probe/owner");
  let rows = [];
  for (let i = 0; i < 60; i++) {
    const v = [...rt._variables].find(x => x._name === "all_module_files" && Array.isArray(x._value) && x._value.some(f => f.name === "d.csv"));
    if (v) { rows = v._value.filter(f => f.name === "d.csv").map(f => f.module); break; }
    await sleep(250);
  }
  return { att: att.slice(0, 120), inMains, rows, pass: inMains && rows.length > 0 && rows.every(m => m === "@probe/owner") };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
