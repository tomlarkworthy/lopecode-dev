// rc5-train probe (20260929-0620-m63): get_context "layout" must say where each pane is, which panes are
// hidden tabs, when a layout name is not a module, and when the chat itself left the page. In run
// 20260929-0620-m63 eval-base the agent wrote #view=S100(R50(@user/sales-chart,@user/sales-table),R100(...)):
// every pane vanished, the chat included, and the layout context listed "R50(@user/sales-chart" as an open
// pane with no warning; the agent reported "Done". No model calls. Usage: node tools/scratch/rc5-sessions/s78-layout-pane-positions.mjs <notebook.html>
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S60(@tomlarkworthy/robocoop-5),S40(@tomlarkworthy/inputs-reference,@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const tool = H.byName("toolsView").value.find(t => t.id === "get_context");
  const layout = async () => String((await tool.execute({ id: "layout" }, { sessionState: {} }))?.output ?? "");
  const go = async h => { history.pushState(null, "", h); dispatchEvent(new HashChangeEvent("hashchange")); await new Promise(r => setTimeout(r, 1500)); };
  const tabs = await layout();                        // srctools is a background tab of inputs-reference's stack
  await go("#view=S100(R50(@tomlarkworthy/inputs-reference,@tomlarkworthy/robocoop-5-srctools),R100(@tomlarkworthy/robocoop-5))");
  const broken = await layout();                      // the malformed hash from the trace
  await go("#view=C100(R60(S50(@tomlarkworthy/inputs-reference),S50(@tomlarkworthy/robocoop-5-srctools)),S40(@tomlarkworthy/robocoop-5))");
  const good = await layout();
  return { tabs, broken, good };
});
await close();
const checks = {
  "background tab reported hidden": /robocoop-5-srctools: HIDDEN/.test(out.tabs),
  "malformed name reported": /NOT a module/.test(out.broken),
  "chat missing reported": /chat .* is not shown/.test(out.broken),
  "shown panes carry positions": /inputs-reference: shown x \d+-\d+ y \d+-\d+/.test(out.good) && !/HIDDEN|NOT a module|not shown/.test(out.good),
  "grammar line present": /S\(a,b\) = TABS/.test(out.good),
};
console.log(JSON.stringify(out, null, 1));
console.log("chars: " + Object.entries(out).map(([k, v]) => k + " " + v.length).join(", "));
for (const [k, v] of Object.entries(checks)) console.log((v ? "PASS " : "FAIL ") + k);
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
