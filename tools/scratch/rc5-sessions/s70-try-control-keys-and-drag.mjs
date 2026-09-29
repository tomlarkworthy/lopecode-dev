// S70: try_control presses keys on a control and drags across it.
// Asked for on 2026-09-29 after the drum-pad pairing session: a keyboard-driven view (arrow keys, a game) or a
// drag-driven one (a canvas slider, a sketch pad) could only be exercised through eval_js, whose values are read
// before the runtime settles. The keyboard view listens on window, the drag view on window for moves, as the
// corpus's games and drag handles do. No model calls.
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
  const SRC = `const _steps = function _steps(html, invalidation){
  const el = html\`<div tabindex="0" style="width:100px;height:40px;background:#eee">steps</div>\`;
  el.value = 0;
  const on = e => { if (e.key === "ArrowUp") { el.value += 1; el.dispatchEvent(new Event("input", {bubbles: true})); } };
  window.addEventListener("keydown", on);
  invalidation.then(() => window.removeEventListener("keydown", on));
  return el;
};
const _level = function _level(html, invalidation){
  const el = html\`<div style="width:200px;height:30px;background:#ddd">level</div>\`;
  el.value = 0;
  let down = false;
  el.addEventListener("pointerdown", () => { down = true; });
  const move = e => { if (!down) return; const r = el.getBoundingClientRect(); el.value = Math.round(100 * (e.clientX - r.left) / r.width); el.dispatchEvent(new Event("input", {bubbles: true})); };
  const up = () => { down = false; };
  window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  invalidation.then(() => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); });
  return el;
};
const _report = function _report(steps, level){return(\`steps=\${steps} level=\${level}\`)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_steps", "viewof steps", ["html", "invalidation"], _steps);
  main.variable(observer("steps")).define("steps", ["Generators", "viewof steps"], (G, v) => G.input(v));
  $def("_level", "viewof level", ["html", "invalidation"], _level);
  main.variable(observer("level")).define("level", ["Generators", "viewof level"], (G, v) => G.input(v));
  $def("_report", "report", ["steps", "level"], _report);
  return main;
}`;
  await run("write_file", { file_path: "/src/@probe/gest.js", content: SRC });
  await sleep(500);
  const k = await run("try_control", { module: "@probe/gest", control: "viewof steps", keys: "ArrowUp ArrowUp ArrowUp" });
  const d = await run("try_control", { module: "@probe/gest", control: "viewof level", drag: { from: [0.1, 0.5], to: [0.9, 0.5] } });
  const n = await run("try_control", { module: "@probe/gest", keys: "ArrowUp" });
  return {
    k: k.slice(0, 260), d: d.slice(0, 260), n: n.slice(0, 120),
    pass: /steps=0 level=0 → steps=3 level=0/.test(k) && /steps=3 level=0 → steps=3 level=90/.test(d) && /need `control`/.test(n)
  };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
