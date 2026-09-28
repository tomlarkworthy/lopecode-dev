// S69: try_control presses a custom view (a div/svg with no input) with the pointer.
// Pairing 2026-09-28: a drum pad dispatched `input` before setting el.value, so each press showed the previous
// hit. try_control answered "is not a button; pass `value`" and the sweep skipped it, so the agent could not see
// the lag. Now a press on the lagging pad is flagged NO VISIBLE EFFECT and one on the fixed pad reports the change.
// No model calls.
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
  const pad = (lag) => `const _pad = function _pad(html){
  const el = html\`<div style="width:120px;height:120px;background:#ccc">hit</div>\`;
  el.value = 0;
  el.addEventListener("pointerdown", () => {
    ${lag ? 'el.dispatchEvent(new Event("input", {bubbles: true})); el.value = el.value + 1;'
          : 'el.value = el.value + 1; el.dispatchEvent(new Event("input", {bubbles: true}));'}
  });
  return el;
};
const _shown = function _shown(hits){return(\`hits: \${hits}\`)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_pad", "viewof hits", ["html"], _pad);
  main.variable(observer("hits")).define("hits", ["Generators", "viewof hits"], (G, v) => G.input(v));
  $def("_shown", "shown", ["hits"], _shown);
  return main;
}`;
  await run("write_file", { file_path: "/src/@probe/lagpad.js", content: pad(true) });
  await run("write_file", { file_path: "/src/@probe/goodpad.js", content: pad(false) });
  await sleep(500);
  const lag = await run("try_control", { module: "@probe/lagpad", control: "viewof hits" });
  const good = await run("try_control", { module: "@probe/goodpad", control: "viewof hits" });
  const sweep = await run("try_control", { module: "@probe/goodpad" });
  return {
    lag: lag.slice(-330), good: good.slice(0, 300), sweep: sweep.slice(0, 200),
    pass: /pressing/.test(good) && /hits: 1/.test(good) && /Set el.value first/.test(lag) && !/skipped/.test(sweep) && /pressing/.test(sweep)
  };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
