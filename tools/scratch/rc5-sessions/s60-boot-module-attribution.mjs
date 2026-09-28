// probe (20260928-0847-m36): console noise from a user module that was BOOTED from the notebook HTML (not written
// or seeded through the tools) must reach the agent. m33 attributed noise only to modules written through the
// tools; this is the "I opened my notebook and the console is full of errors" case.
// Builds a copy of the notebook with @user/unemployment embedded as a <script type="text/plain"> block and listed
// in bootconf mains (fixture from m33: S1 Plot console.warn every render, S2 a failed fetch at boot, S3 an
// unhandled rejection when "none" is picked), boots it, picks "none" in the page as a user would, then calls
// read_file on the module. No model calls, no write/seed through the tools.
//   node probe.mjs <notebook.html>     (run from the repo root)
// PASS: each source fired in the browser and is named in the read_file result.
import { resolve, join } from "node:path";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const ROOT = process.cwd();
const NB = resolve(process.argv[2] || join(ROOT, "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const FIXTURE = readFileSync(join(ROOT, "tools/scratch/rc5-sessions/fixtures/unemployment-noisy.js"), "utf8");
const ID = "@user/unemployment";
const OUT = join(ROOT, "tools/scratch/rc5-evals/out");
mkdirSync(OUT, { recursive: true });
const BUILT = join(OUT, "20260928-0847-m36-probe-boot.html");

let html = readFileSync(NB, "utf8");
const block = `<script id="${ID}"\n  type="text/plain"\n  data-mime="application/javascript"\n>\n${FIXTURE.replace(/<\/script/gi, "<\\/script")}\n</script>\n`;
const bootAt = html.lastIndexOf('<script id="bootconf.json"');
if (bootAt < 0) throw new Error("no bootconf.json block");
html = html.slice(0, bootAt) + block + html.slice(bootAt);
const bc = html.lastIndexOf('<script id="bootconf.json"');
const mainsRe = /"mains":\s*\[/g;
mainsRe.lastIndex = bc;
const mm = mainsRe.exec(html);
html = html.slice(0, mm.index + mm[0].length) + JSON.stringify(ID) + "," + html.slice(mm.index + mm[0].length);
writeFileSync(BUILT, html);

const { bootNotebook } = await import(pathToFileURL(join(ROOT, "tools/robocoop-5/lib/notebook-boot.mjs")).href);
const { page, close } = await bootNotebook({ notebookPath: BUILT, layout: `R100(S50(@tomlarkworthy/robocoop-5),S25(${ID}),S25(@tomlarkworthy/robocoop-5-srctools))`, timeout: 120000 });
const browserConsole = [];
page.on("console", m => { if (m.type() === "warning" || m.type() === "error") browserConsole.push(m.type() + ": " + m.text().slice(0, 200)); });
page.on("pageerror", e => browserConsole.push("pageerror: " + e.message.slice(0, 200)));
const out = await page.evaluate(async ([ID]) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "rc5_host"].forEach(n => H.force(n));
  const t0 = Date.now();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const sel = () => [...document.querySelectorAll("select")].find(s => [...s.options].some(o => o.value === "none" || o.text === "none"));
  while (Date.now() - t0 < 60000 && !(H.byName("toolsView")?.value?.length >= 10 && H.byName("uncaughtLog") && sel() && globalThis.__ojs_runtime.mains.has(ID))) await sleep(300);
  if (!sel()) return { err: "no select rendered for " + ID };
  await sleep(2000);
  const s = sel();
  const pick = v => { const o = [...s.options].find(o => o.value === v || o.text === v); s.value = o.value; s.dispatchEvent(new Event("input", { bubbles: true })); };
  pick("none");
  await sleep(1500);
  pick("Finance");
  await sleep(1500);
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  const readLog = async () => String((await byId.get("read_file").execute({ file_path: `/src/${ID}.js` }, ctx))?.output ?? "").split("\n").filter(l => !/^\s*\d+\t/.test(l)).join("\n");
  const read = await readLog();
  // S2 runs once, at boot, before the chat's modules have loaded (see proposal). Re-run that cell from its
  // boot-loaded code, as an upstream change would, to check a failed fetch from a boot-loaded module is charged.
  const v = H.allVars().find(x => x._name === "notes" && x._module === globalThis.__ojs_runtime.mains.get(ID));
  v._module.redefine("notes", [], v._definition);
  await sleep(1500);
  const read2 = await readLog();
  const hostHits = [...globalThis.__ojs_runtime.mains.keys()].filter(m => m !== ID).map(m => [m, H.byName("uncaughtLog").text(m)]).filter(([, t]) => t);
  return { read, read2, hostHits };
}, [ID]);
await page.waitForTimeout(300);
if (out.err) { console.log("FAIL setup: " + out.err); await close(); process.exit(1); }
console.log("read_file (source lines omitted):\n" + (out.read.trim() || "(nothing appended)"));
console.log("\nbrowser console (warnings/errors):\n  " + [...new Set(browserConsole)].slice(0, 20).join("\n  "));
const SRC = {
  S1: { what: "Plot facet console.warn (every render)", agent: /_9: console\.warn: .*isn.t faceted/i, browser: /isn.t faceted/, text: () => out.read },
  S3: { what: "unhandled rejection when \"none\" is picked", agent: /_rememberPick: TypeError: Reduce of empty array/i, browser: /Reduce of empty array/, text: () => out.read },
  S2: { what: "failed fetch industry-notes.json, cell re-run after boot", agent: /_notes: fetch industry-notes\.json[^\n]{0,40}(failed|HTTP \d)/i, browser: /industry-notes\.json/, text: () => out.read2 },
};
let fail = 0;
for (const [k, s] of Object.entries(SRC)) {
  const fired = browserConsole.some(l => s.browser.test(l));
  const seen = s.agent.test(s.text());
  if (!(fired && seen)) fail++;
  console.log(`${fired && seen ? "PASS" : "FAIL"} ${k} ${s.what}: fired in browser ${fired}; in read_file ${seen}`);
}
console.log("read_file after the re-run (source lines omitted):\n" + (out.read2.trim() || "(nothing appended)"));
console.log(`INFO S2 at boot (before the chat loads; not scored): in first read_file ${/industry-notes/.test(out.read)}`);
if (out.hostHits.length) { fail++; console.log("FAIL noise charged to host modules: " + JSON.stringify(out.hostHits).slice(0, 400)); }
else console.log("PASS nothing charged to the host's mains");
console.log(fail ? `FAIL (${fail})` : "PASS");
await close();
process.exit(fail ? 1 : 0);
