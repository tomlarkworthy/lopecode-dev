// Probe (no model): the habit-tracker modules robocoop-5 wrote in run 20260928-0240-w36-before and in
// eval-base key calendar days with toISOString().slice(0, 10), which is the UTC date. After the change, a
// session that has read the pages both runs read (state, module source, handlers) but not
// calendar-days-in-the-users-time-zone.md is refused that write, and the page is in the wiki index.
//   node tools/scratch/rc5-train/20260928-0240/w36/probe.mjs <notebook.html>   (run from the repo root)
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const ROOT = process.cwd();
const { bootNotebook } = await import(pathToFileURL(resolve(ROOT, "tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] ?? resolve(ROOT, "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const SRC = readFileSync(resolve(ROOT, "tools/scratch/rc5-sessions/fixtures/w36-base-module.js"), "utf8");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async (src) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "wiki_index"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const WIKI = "/content/@tomlarkworthy/markdown-wiki/";
  const PAGE = "calendar-days-in-the-users-time-zone.md";
  const ctx = { sessionState: { wikiRead: new Set(["keeping-user-state-in-the-saved-notebook.md", "writing-cells-in-module-source.md", "event-handlers-in-cells.md"].map(p => WIKI + p)) } };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const first = await run("write_file", { file_path: "/src/@user/habit-probe.js", content: src });
  const refused = first.startsWith("REFUSED") && first.includes(PAGE);
  let second = first;
  if (refused) { await run("read_file", { file_path: WIKI + PAGE, limit: 3 }); second = await run("write_file", { file_path: "/src/@user/habit-probe.js", content: src }); }
  const idx = String(H.byName("wiki_index") ?? "");
  return { first: first.slice(0, 220), second: second.slice(0, 120), refused, indexLine: idx.split("\n").find(l => l.includes("calendar-days")) ?? null };
}, SRC);
console.log(JSON.stringify(out, null, 1));
console.log(out.refused && out.indexLine && /^Wrote/.test(out.second) ? "PASS: a UTC day key is refused until calendar-days-in-the-users-time-zone.md is read, then written"
  : "FAIL: the toISOString().slice(0, 10) day key was written without the page (refused=" + out.refused + ", index=" + !!out.indexLine + ")");
await close();
