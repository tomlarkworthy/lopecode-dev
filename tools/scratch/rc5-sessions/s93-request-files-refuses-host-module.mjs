// S93: request_files refuses to attach the user's files to the notebook's own tooling (robocoop-5*, lopepage*).
// rc5-train 20260929-0620-m58: the agent passed module "@tomlarkworthy/robocoop-5" (the chat UI) before any
// module of its own existed; projects.csv was attached to the chat UI, where no cell of the user's reads it.
// The refusal comes before the user is asked. A @probe module is the control. No model calls; the askBus is a stub.
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
  let asked = 0;
  const askBus = { request: async () => { asked++; return [new File(["id,cost\n1,2\n"], "projects.csv", { type: "text/csv" })]; } };
  const run = async (module) => { try { return String((await tools().get("request_files").execute({ module, prompt: "your projects.csv" }, { askBus }))?.output ?? ""); } catch (e) { return "THREW " + e; } };
  const ui = await run("@tomlarkworthy/robocoop-5");
  const askedAfterUi = asked;
  const engine = await run("@tomlarkworthy/robocoop-5-engine");
  const askedAfterEngine = asked;
  const user = await run("@probe/projects");
  return { ui: ui.slice(0, 300), engine: engine.slice(0, 160), user: user.slice(0, 160), askedAfterUi, askedAfterEngine, asked,
    pass: /^ERROR/.test(ui) && /^ERROR/.test(engine) && askedAfterEngine === 0 && /Attached projects\.csv .* to @probe\/projects/.test(user) && asked === 1 };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
