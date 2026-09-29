// S88: try_control reaches a button inside a rendered cell that is not a viewof, and a sweep that tried nothing
// does not count as trying the module's controls.
// rc5-train 20260929-0620-m49 ("Make .csv file attachments show as a table preview in the file panel"): the agent
// put a Preview button in @tomlarkworthy/fileattachments.file_browser (a plain DOM cell). try_control listed only the
// module's 3 viewof controls, skipped all 3, never saw Preview, and the completion gate accepted "all skipped".
// Cases: (1) control "Preview" clicks the button and reports the cell's change; (2) the sweep names the
// rendered-cell buttons it did not click; (3) after a sweep that skipped every control the module stays untried,
// after the click it does not. No model calls.
//   node tools/scratch/rc5-sessions/s88-try-control-buttons-in-rendered-cells.mjs <notebook.html>   (from the repo root)
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
  const ctx = { sessionState: {} };
  const run = async (id, args) => { try { return String((await tools().get(id).execute(args, ctx))?.output ?? ""); } catch (e) { return "THREW " + e; } };
  // a file picker (the sweep has no value to pick for it) and a panel cell whose rows carry Preview/Delete buttons
  const SRC = `const _f = function _f(Inputs){return(Inputs.file({label: "Upload"}))};
const _panel = function _panel(html){
  const rows = ["a.csv", "b.txt"].map(n => {
    const tr = html\`<tr><td>\${n}</td><td><button>Preview</button> <button>Delete</button></td></tr>\`;
    tr.querySelector("button").onclick = () => tr.after(html\`<tr><td colspan=2><table><tr><td>x</td><td>1</td></tr></table></td></tr>\`);
    return tr;
  });
  return html\`<table>\${rows}</table>\`;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("viewof upload")).define("viewof upload", ["Inputs"], _f);
  main.variable(observer("upload")).define("upload", ["Generators", "viewof upload"], (G, v) => G.input(v));
  main.variable(observer("panel")).define("panel", ["html"], _panel);
  return main;
}`;
  // the onclick and the hand-written define are gated on two wiki pages; read them so the write lands
  for (const d of ["event-handlers-in-cells.md", "writing-cells-in-module-source.md"])
    await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/" + d, limit: 3 });
  const w = await run("write_file", { file_path: "/src/@probe/panel.js", content: SRC });
  await sleep(500);
  const untried0 = ctx.sessionState.untried?.has("@probe/panel") ?? false;
  const sweep = await run("try_control", { module: "@probe/panel" });
  const untriedAfterSweep = ctx.sessionState.untried?.has("@probe/panel") ?? false;
  const click = await run("try_control", { module: "@probe/panel", control: "Preview" });
  const untriedAfterClick = ctx.sessionState.untried?.has("@probe/panel") ?? false;
  const checks = {
    written: /applied|wrote|Wrote/i.test(w) && untried0,
    sweepNamesButtons: /Preview/.test(sweep) && /panel/.test(sweep),
    sweepSkippedStaysUntried: untriedAfterSweep,
    clickReachesButton: /by clicking/.test(click) && /panel \(rendered table\):[\s\S]*text=x/.test(click),
    clickClearsUntried: !untriedAfterClick,
  };
  return { w: w.slice(0, 120), sweep: sweep.slice(0, 700), click: click.slice(0, 500), checks, pass: Object.values(checks).every(Boolean) };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
