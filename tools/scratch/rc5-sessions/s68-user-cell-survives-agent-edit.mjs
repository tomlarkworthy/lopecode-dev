// S68: a cell the user adds in the notebook survives the agent's next edit of that module.
// /src/<m>.js returned the agent's last written text, so an edit_file made from it re-applied a module without
// the user's cell and deleted it (pairing 2026-09-28: the user's anonymous `drumPad` display cell under the pad,
// reported only as "removed 1 cell: _7az39bu (anonymous)"). Also: a chat log module (session_meta) is not listed
// as the user's module in the notebook context. No model calls.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve("tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "ctx_notebook"].forEach(n => H.force(n));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await sleep(300);
  const tools = () => new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args) => { try { return String((await tools().get(id).execute(args, {}))?.output ?? ""); } catch (e) { return "THREW " + e; } };
  const SRC = `const _a = function _a(){return(1)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_a", "a", [], _a);
  return main;
}`;
  const w1 = await run("write_file", { file_path: "/src/@probe/pad.js", content: SRC });
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@probe/pad");
  // what the editor does when the user adds a cell: a new pid'd variable in the live module
  const uv = m.variable({}).define(["a"], a => a * 10);
  uv.pid = "_user1";
  await sleep(300);
  const alive = (pid = "_user1") => [...rt._variables].some(v => v._module === m && v.pid === pid);
  const e1 = await run("edit_file", { file_path: "/src/@probe/pad.js", old_string: "return(1)", new_string: "return(2)" });
  await sleep(500);
  const afterEdit = alive();
  // a second user cell, then a whole-file write from memory that lacks it
  const uv2 = m.variable({}).define(["a"], a => a * 100);
  uv2.pid = "_user2";
  await sleep(300);
  const w2 = await run("write_file", { file_path: "/src/@probe/pad.js", content: SRC.replace("return(1)", "return(3)") });
  await sleep(500);
  const afterWrite = alive("_user2");
  // a chat log in mains is the chat's, not the user's
  const LOG = `const _session_meta = function _session_meta(){return({id: "x"})};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_session_meta", "session_meta", [], _session_meta);
  return main;
}`;
  await run("write_file", { file_path: "/src/@robocoop5-session/probe-log.js", content: LOG });
  await sleep(300);
  let ctx = "";
  try { ctx = H.byName("ctx_notebook").render() || ""; } catch (e) { ctx = "ERR " + e; }
  const userLine = ctx.split("\n").find(l => l.startsWith("the user's modules")) || "";
  return {
    w1: w1.slice(0, 80), e1: e1.slice(0, 160), w2: w2.slice(0, 300),
    afterEdit, afterWrite, userLine,
    pass: afterEdit && afterWrite && /not applied/.test(w2) && userLine.includes("@probe/pad") && !userLine.includes("probe-log")
  };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
