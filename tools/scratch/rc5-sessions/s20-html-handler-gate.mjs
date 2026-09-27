// Probe (no model): the pomodoro module robocoop-5 wrote in run 20260927-2243-w1-before builds its button
// with the stdlib `html` and onclick=${() => …}. The button renders its handler as text and does nothing.
// After the change, a session that has not read event-handlers-in-cells.md is refused that write, and
// the page is listed in the wiki index.
//   node DIR/probe.mjs <notebook.html>      PASS/FAIL on the last line
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { bootNotebook } from "../../../../robocoop-5/lib/notebook-boot.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const NB = resolve(process.argv[2] ?? join(here, "notebook.html"));
const SRC = readFileSync(join(here, "../rc5-train/20260927-2243/w1/pomodoro-before.js"), "utf8");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async (src) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "wiki_index"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const WIKI = "/content/@tomlarkworthy/markdown-wiki/";
  // the session has read the viewof/mutable page (the before-run did), not the handler page
  const ctx = { sessionState: { wikiRead: new Set([WIKI + "writing-cells-in-module-source.md"]) } };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const first = await run("write_file", { file_path: "/src/@user/pomodoro.js", content: src });
  const refused = first.startsWith("REFUSED") && first.includes("event-handlers-in-cells.md");
  // whatever the gate did, show what the stdlib-html button is once written
  if (refused) await run("read_file", { file_path: WIKI + "event-handlers-in-cells.md", limit: 3 });
  const second = refused ? await run("write_file", { file_path: "/src/@user/pomodoro.js", content: src }) : first;
  await new Promise(r => setTimeout(r, 1000));
  const v = n => H.allVars().find(x => x._name === n && x._module?._scope?.has("toggleBtn"));
  const btn = v("toggleBtn")?._value;
  const shape = btn instanceof Element ? { attrs: [...btn.attributes].map(a => a.name + "=" + a.value.slice(0, 20)), onclick: typeof btn.onclick, text: btn.textContent.trim().slice(0, 50) } : String(btn);
  btn?.click?.();
  await new Promise(r => setTimeout(r, 2500));
  const idx = String(H.byName("wiki_index") ?? "");
  return { first: first.slice(0, 260), second: second.slice(0, 120), refused, shape,
    runningAfterClick: v("running")?._value, remainingAfter2_5s: v("remaining")?._value,
    indexLine: idx.split("\n").find(l => l.includes("event-handlers")) ?? null };
}, SRC);
console.log(JSON.stringify(out, null, 1));
console.log(out.refused && out.indexLine ? "PASS: stdlib-html handler write refused until event-handlers-in-cells.md is read"
  : "FAIL: stdlib-html handler write applied without the page (button click started timer: " + (out.runningAfterClick === true) + ")");
await close();
