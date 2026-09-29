// S91: a failed fetch in a tool result says the browser does not report the cause.
// rc5-train 20260929-0620-m44: api.dictionaryapi.dev returned HTTP 522; the page saw only "Failed to fetch" and the
// agent told the user the API "blocks CORS". A refused connection (127.0.0.1:9) gives the same TypeError here.
// Checks: eval_js returning the caught message, eval_js throwing, and a success with no hint. No model calls.
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
  await run("write_file", { file_path: "/src/@probe/net.js", content: `const _x = function _x(){return(1)};
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("x")).define("x", [], _x).pid = "_x";
  return main;
}` });
  const caught = await run("eval_js", { module: "@probe/net", code: "try { await fetch('http://127.0.0.1:9/x'); return 'no'; } catch (e) { return {error: e.message}; }" });
  const thrown = await run("eval_js", { module: "@probe/net", code: "return (await fetch('http://127.0.0.1:9/y')).status;" });
  const fine = await run("eval_js", { module: "@probe/net", code: "return 'fine';" });
  const hint = s => /does not say why/.test(s);
  return { caught: caught.slice(0, 400), thrown: thrown.slice(0, 400), fine: fine.slice(0, 200),
    pass: /Failed to fetch/.test(caught) && hint(caught) && /Failed to fetch/.test(thrown) && hint(thrown) && !hint(fine) };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
