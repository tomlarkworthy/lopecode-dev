// S98: a grep/glob that finds nothing for a misspelled name offers the close names the notebook knows.
// Live session 2026-09-29: asked to "add annote", the agent grepped /src and /content for "annote", found nothing,
// guessed api.observablehq.com URLs for 5 users and gave up. @tomlarkworthy/annotate is named in this page's own
// module sources. Checks: grep "annote" suggests @tomlarkworthy/annotate and the import hint spells that id;
// glob for a misspelled embedded module suggests it; a miss with no close name adds no suggestion. No model calls.
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
  const g = await run("grep", { pattern: "annote", path: "/" });
  const gl = await run("glob", { pattern: "/src/**/spectral-layuot*" });
  const none = await run("grep", { pattern: "qzxwvk", path: "/" });
  const checks = {
    grepSuggests: /Did you mean [^?]*@tomlarkworthy\/annotate/.test(g),
    grepImportSpellsIt: g.includes('main.define("module @tomlarkworthy/annotate"'),
    globSuggests: /Did you mean [^?]*@tomlarkworthy\/spectral-layout/.test(gl),
    quietWhenNothingClose: /^\(no matches\)/.test(none) && !/Did you mean/.test(none)
  };
  return { g: g.slice(0, 300), gl: gl.slice(0, 200), checks, pass: Object.values(checks).every(Boolean) };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
