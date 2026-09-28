// S66: attach_file copies an existing attachment to another module with path /content/<module>/<file>.
// FileAttachment is per module, so cells moved into a new module need their files attached there; before
// the fix `path` took only /local-disk/ and the base run (20260928-0847-m43) spent 8 steps looking for a way
// (blob URL, eval_js .text(), /local-disk) before leaving the data in the old module. No model calls.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve("tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await sleep(300);
  const tools = () => new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args) => { try { return String((await tools().get(id).execute(args, {}))?.output ?? ""); } catch (e) { return "THREW " + e; } };
  const mod = (name, cell) => `${cell}
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_t", "t", ["FileAttachment"], _t);
  return main;
}`;
  const CSV = "a,b\n1,\"x, y\"\n2,é\n";
  await run("write_file", { file_path: "/src/@probe/old.js", content: mod("old", "const _t = function _t(FileAttachment){return(FileAttachment(\"d.csv\").text())};") });
  const a1 = await run("attach_file", { module: "@probe/old", name: "d.csv", content: CSV, mime: "text/csv" });
  await run("write_file", { file_path: "/src/@probe/new.js", content: mod("new", "const _t = function _t(FileAttachment){return(FileAttachment(\"d.csv\").text())};") });
  // the attachment inventory refreshes asynchronously after an attach
  for (let i = 0; i < 40 && !(await run("glob", { pattern: "/content/@probe/old/**" })).includes("d.csv"); i++) await sleep(250);
  const copy = await run("attach_file", { module: "@probe/new", name: "d.csv", path: "/content/@probe/old/d.csv" });
  await sleep(1500);
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@probe/new");
  const v = [...rt._variables].find(x => x._module === m && x._name === "t");
  let text; try { text = await Promise.race([v?._promise, sleep(4000).then(() => "TIMEOUT")]); } catch (e) { text = "ERR " + (e?.message ?? e); }
  return { a1: a1.slice(0, 120), copy: copy.slice(0, 200), text, pass: text === CSV };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
