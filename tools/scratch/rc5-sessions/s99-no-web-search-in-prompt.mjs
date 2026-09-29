// S99: the system prompt says the agent has no web search or browsing and must not present recalled material as research.
// Live session 2026-09-29: with no web search the agent "researched" by writing code that printed a hardcoded
// JSON list and presented it as research. run_python is off by default now, so the line names no language.
// Checks: the composed rc5_systemPrompt (the text the model receives) carries the line, and the line does not
// mention Python. No model calls.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve("tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  H.force("rc5_systemPrompt");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && typeof H.byName("rc5_systemPrompt") !== "string") await sleep(300);
  const p = H.byName("rc5_systemPrompt") || "";
  const line = p.split(/\n(?=[A-Z])/).find(l => /no web search/i.test(l)) || "";
  const checks = {
    saysNoWebSearch: /no web search or browsing/i.test(p),
    saysNotResearch: /never present material you\s+recalled or made up[^.]*as research/.test(p),
    lineNamesNoPython: !!line && !/python/i.test(line)
  };
  return { line, promptChars: p.length, checks, pass: Object.values(checks).every(Boolean) };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
