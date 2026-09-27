// A cell whose value is (or contains) a <canvas> must be described by its pixels, not by its text.
// Observed 2026-09-27 (rc5-train 20260927-2352 w5, eval-base2): inspect_value on the Mandelbrot `canvas`
// cell returned "" and the agent replied "The canvas is live and rendering." A text-only model has no
// other readout of a canvas. No model calls.   node probe.mjs [notebook.html]
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
  for (const p of ["writing-cells-in-module-source.md", "drawing-on-a-canvas.md"]) await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/" + p });
  const draw = `const c = html\`<canvas width=300 height=200>\`; const g = c.getContext("2d");
  for (let x = 0; x < 300; x++) { g.fillStyle = "hsl(" + x + ",80%,50%)"; g.fillRect(x, 0, 1, 200); }`;
  const SRC = `const _drawn = function drawn(html){\n${draw}\nreturn html\`<div>${"${c}"}<p>caption</p></div>\`;\n};
const _blank = function blank(html){return( html\`<canvas width=300 height=200>\` )};
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("drawn")).define("drawn", ["html"], _drawn);
  main.variable(observer("blank")).define("blank", ["html"], _blank);
  return main;
}
`;
  const r = {};
  r.write = await run("write_file", { file_path: "/src/@user/canvasprobe.js", content: SRC });
  r.drawn = await run("inspect_value", { module: "@user/canvasprobe", name: "drawn" });
  r.blank = await run("inspect_value", { module: "@user/canvasprobe", name: "blank" });
  return r;
});
const checks = [
  ["inspect_value of a drawn canvas reports size and colours", /canvas 300×200: \d{2,} colours/.test(out.drawn)],
  ["inspect_value of a blank canvas says nothing is drawn", /canvas 300×200: 1 colour, commonest transparent 100% — nothing drawn/.test(out.blank)],
  ["write_file values describe the canvas", /drawn=[^·]*canvas 300×200/.test(out.write)],
];
let fail = 0;
for (const [l, ok] of checks) { if (!ok) fail++; console.log((ok ? "PASS " : "FAIL ") + l); }
console.log("raw", JSON.stringify({ drawn: out.drawn, blank: out.blank, write: out.write.slice(0, 400) }));
await close();
process.exit(fail ? 1 : 0);
