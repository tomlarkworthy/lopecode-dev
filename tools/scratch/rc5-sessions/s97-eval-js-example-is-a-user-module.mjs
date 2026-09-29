// S97: eval_js's `module` example names a user module, and a snippet run inside a robocoop-5 module says so.
// Live session 2026-09-29: the parameter's example was "@tomlarkworthy/robocoop-5-engine"; the agent copied it
// for 7 of 7 eval_js calls and ran every snippet inside the engine. Not a refusal: the snippet still runs.
// Checks: the example is not a robocoop-5 module; eval_js in robocoop-5-engine returns its value plus the note;
// eval_js in a user module returns no note. No model calls.
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
  const t = tools().get("eval_js");
  let example = "";
  const seen = new Set();
  const walk = o => { if (!o || typeof o !== "object" || seen.has(o)) return; seen.add(o); for (const k in o) { const v = o[k]; if (typeof v === "string" && v.startsWith("Module id to scope to")) example = v; else walk(v); } };
  walk(t);
  await run("write_file", { file_path: "/src/@probe/ev.js", content: `const _x = function _x(){return(\n41\n)};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  main.variable(observer("x")).define("x", [], _x).pid = "_x";\n  return main;\n}\n` });
  const inEngine = await run("eval_js", { module: "@tomlarkworthy/robocoop-5-engine", code: "1 + 1" });
  const inUser = await run("eval_js", { module: "@probe/ev", code: "x + 1" });
  const checks = {
    exampleNotHost: !!example && !/robocoop-5/.test(example) && /@user\//.test(example),
    engineStillRuns: /^2\b/.test(inEngine),
    engineNoted: /part of robocoop-5 itself/.test(inEngine),
    userQuiet: /^42\b/.test(inUser) && !/robocoop-5 itself/.test(inUser)
  };
  return { example, inEngine, inUser, checks, pass: Object.values(checks).every(Boolean) };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
