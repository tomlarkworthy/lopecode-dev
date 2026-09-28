// probe (20260928-0847-m33): console noise from the user's module must reach the agent.
// Seeds @user/unemployment with three noise sources that leave every display intact (build.mjs):
//   S1 Plot console.warn "…appears to use faceted data, but isn't faceted" (every render)
//   S2 a failed fetch of industry-notes.json, caught by .catch (boot)
//   S3 an unhandled rejection from an async "input" listener when "none" is picked
// Then drives the tools an agent uses to look at a module (read_file, list_values, try_control on every control
// and on "none", write_file of the same source) with the chat session's watch bus, draining it as the engine
// does between steps. No model calls.   node probe.mjs <notebook.html>   (run from the repo root)
// PASS: each source is named in some tool result or drain, and the browser console confirms each one fired.
import { resolve, join } from "node:path";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const ROOT = process.cwd();
const NB = resolve(process.argv[2] || join(ROOT, "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const FIXTURE = process.env.M33_FIXTURE ? readFileSync(process.env.M33_FIXTURE, "utf8")
  : readFileSync(join(ROOT, "tools/scratch/rc5-sessions/fixtures/unemployment-noisy.js"), "utf8");
const { bootNotebook } = await import(pathToFileURL(join(ROOT, "tools/robocoop-5/lib/notebook-boot.mjs")).href);

const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))", timeout: 120000 });
const browserConsole = [];
page.on("console", m => { if (m.type() === "warning" || m.type() === "error") browserConsole.push(m.type() + ": " + m.text().slice(0, 200)); });
page.on("pageerror", e => browserConsole.push("pageerror: " + e.message.slice(0, 200)));
const out = await page.evaluate(async ([FIXTURE, process_env_debug]) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "rc5_host"].forEach(n => H.force(n));
  const t0 = Date.now();
  const sessionOf = () => document.querySelector('[data-rc5-group="robocoop5-session"]')?.active?.session;
  while (Date.now() - t0 < 60000 && !(H.byName("toolsView")?.value?.length >= 10 && sessionOf()?.watchBus && H.byName("rc5_host"))) await new Promise(r => setTimeout(r, 300));
  const bus = sessionOf().watchBus;
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {}, watchBus: bus };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = [];
  const ul = () => { try { return H.byName("uncaughtLog").text("@user/unemployment", false); } catch (e) { return "ERR " + e.message; } };
  const step = async (label, id, args) => { const o = await run(id, args); await sleep(1500); log.push({ label, out: o, drain: bus.drain(), ul: process_env_debug ? ul() : "" }); };
  bus.drain();
  const seed = await H.byName("rc5_host").seedFile("/src/@user/unemployment.js", FIXTURE);
  log.push({ label: "seed", out: JSON.stringify(seed).slice(0, 300), drain: [] });
  await sleep(1500);
  log.push({ label: "after seed", out: "", drain: bus.drain() });
  await step("read_file", "read_file", { file_path: "/src/@user/unemployment.js" });
  await step("list_values", "list_values", { module: "@user/unemployment" });
  await step("try_control all", "try_control", { module: "@user/unemployment" });
  await step("try_control none", "try_control", { module: "@user/unemployment", control: "selectedIndustry", value: "none" });
  await step("write_file same", "write_file", { file_path: "/src/@user/unemployment.js", content: FIXTURE });
  await step("try_control none again", "try_control", { module: "@user/unemployment", control: "selectedIndustry", value: "none" });
  await step("get_context", "get_context", {});
  return log;
}, [FIXTURE, !!process.env.M33_DEBUG]);
await page.waitForTimeout(500);

const SRC = {
  S1: { what: "Plot facet console.warn", agent: /isn.t faceted|faceted data/i, browser: /isn.t faceted/ },
  S2: { what: "failed fetch industry-notes.json", agent: /industry-notes\.json[^\n]{0,40}(failed|HTTP \d)/i, browser: /industry-notes\.json/ },
  S3: { what: "unhandled rejection (reduce of empty array)", agent: /Reduce of empty array/i, browser: /Reduce of empty array/ },
};
let fail = 0;
for (const r of out) console.log(`-- ${r.label}: ${r.out.replace(/\s+/g, " ").slice(0, 400)}${r.drain.length ? "\n   drain: " + r.drain.join(" | ").replace(/\s+/g, " ").slice(0, 400) : ""}${r.ul ? "\n   uncaughtLog: " + r.ul.slice(0, 300) : ""}`);
console.log("\nbrowser console (warnings/errors):\n  " + [...new Set(browserConsole)].slice(0, 20).join("\n  "));
for (const [k, s] of Object.entries(SRC)) {
  const fired = browserConsole.some(l => s.browser.test(l));
  const seenBy = out.filter(r => s.agent.test(r.out) || r.drain.some(x => s.agent.test(x))).map(r => r.label);
  const ok = fired && seenBy.length > 0;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${k} ${s.what}: fired in browser ${fired}; reached the agent in: ${seenBy.join(", ") || "(nothing)"}`);
}
console.log(fail ? `FAIL (${fail})` : "PASS");
await close();
process.exit(fail ? 1 : 0);
