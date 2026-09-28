// m37: inspect_value / list_values report "⚠ runtime error: timed out after 5s" for a computed cell whose value
// is undefined (an anonymous display cell that shows nothing in one state). Run 20260928-0847-m37 eval-base-2:
// the agent read this as a fault in its Generators.observe loader and rewrote a working module into a Mutable.
// No model calls. argv[2] = notebook path (default: the canonical); exits 1 when the defect is present.
import { join, resolve } from "node:path";
const { bootNotebook } = await import(join(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs"));
const NB = process.argv[2] ? resolve(process.argv[2]) : join(process.cwd(), "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const src = `const _s = function status(){return(
{ state: "ready" }
)};
const _m = function _msg(status){return(
status.state === "loading" ? "Loading…" : undefined
)};
const _e = function _boom(status){return(
status.missing.field
)};
const _n = function blank(status){return(
status.state === "loading" ? "Loading…" : undefined
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_s", "status", [], _s);
  $def("_m", null, ["status"], _m);
  $def("_e", null, ["status"], _e);
  $def("_n", "blank", ["status"], _n);
  return main;
}`;
  const write = await run("write_file", { file_path: "/src/@probe/undef.js", content: src });
  const t1 = Date.now();
  const anon = await run("inspect_value", { module: "@probe/undef", pid: "_m" });
  const anonMs = Date.now() - t1;
  const named = await run("inspect_value", { module: "@probe/undef", name: "blank" });
  const err = await run("inspect_value", { module: "@probe/undef", pid: "_e" });
  const list = await run("list_values", { module: "@probe/undef" });
  return { write: write.slice(0, 200), anon: anon.slice(0, 200), anonMs, named: named.slice(0, 200), err: err.slice(0, 120), list: list.slice(0, 600) };
});
console.log(JSON.stringify(out, null, 1));
await close();
const bad = [out.anon, out.named].some(s => /timed out|runtime error/.test(s)) || /_m \(anonymous\) = ⚠/.test(out.list) || !/runtime error: .*(undefined|field)/.test(out.err);
console.log(bad ? "FAIL: a computed undefined value is reported as a timeout/runtime error" : "PASS");
process.exit(bad ? 1 : 0);
