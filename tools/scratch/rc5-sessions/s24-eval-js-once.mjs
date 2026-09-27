// eval_js runs its snippet once. Observed 2026-09-27 (run 20260927-2352-w5-after, t=128s): a snippet
// clicked the canvas and then read `fractal.querySelector("canvas")`; the click re-ran `fractal`, the
// runtime re-ran the snippet (it depends on `fractal`), which clicked again, until "timed out after 60s".
// No model calls.   node probe-eval-once.mjs [notebook.html]
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { bootNotebook } from "../../robocoop-5/lib/notebook-boot.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const NB = process.argv[2] ? resolve(process.argv[2]) : join(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers; ["toolsView", "hostSetup"].forEach(n => H.force(n));
  const t0 = Date.now(); while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t])); const ctx = { sessionState: {} };
  const run = async (id, a) => String((await byId.get(id).execute(a, ctx))?.output ?? "").trim();
  await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" });
  const SRC = `const _k = function viewof_k(Inputs){return( Inputs.range([0, 1000], {value: 1, step: 1}) )};
const _double = function double(k){return( k * 2 )};
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("viewof k")).define("viewof k", ["Inputs"], _k);
  main.variable(observer("k")).define("k", ["Generators", "viewof k"], (G, v) => G.input(v));
  main.variable(observer("double")).define("double", ["k"], _double);
  return main;
}
`;
  await run("write_file", { file_path: "/src/@user/evalonce.js", content: SRC });
  const t = performance.now();
  const res = await run("eval_js", { module: "@user/evalonce", code: "viewof_k.value = viewof_k.value + 1;\nviewof_k.dispatchEvent(new Event('input'));\nawait new Promise(r => setTimeout(r, 100));\nreturn double;" });
  const ms = Math.round(performance.now() - t);
  await new Promise(r => setTimeout(r, 300));
  const k = await run("inspect_value", { module: "@user/evalonce", name: "k" });
  return { res, ms, k };
});
const checks = [["eval_js returns promptly", out.ms < 5000], ["the snippet acted once (k 1 -> 2)", out.k === "2"]];
let fail = 0;
for (const [l, ok] of checks) { if (!ok) fail++; console.log((ok ? "PASS " : "FAIL ") + l); }
console.log("raw", JSON.stringify(out));
await close();
process.exit(fail ? 1 : 0);
