// Probe (m56): run-one decides a run is over by reading the panel's CURRENT entry
// (`document.querySelector("[data-rc5-group]").active`). A turn that switches the panel to a new session (the
// agent tested its new Cmd+Shift+L shortcut by dispatching it in the live page, run 20260929-0620-m56-before,
// 144-160s) leaves `active` a fresh entry with no log and no session: run-one polled 20 min, then threw
// "Cannot read properties of null (reading 'abort')" and wrote no trace. The fix follows the entry the prompt
// was sent to (window.__rc5Run). This probe runs a scripted turn, clicks the panel's new-session button mid-turn,
// and checks both predicates. Model-free.
//   node tools/scratch/rc5-sessions/s86-run-one-follows-session-switch.mjs <notebook.html> [run-one.mjs to check, default tools/scratch/rc5-evals/run-one.mjs]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const nb = resolve(process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const src = readFileSync(resolve(process.argv[3] ?? "tools/scratch/rc5-evals/run-one.mjs"), "utf8");
const browser = await chromium.launch();
let fail = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(pathToFileURL(nb).href);
  await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active, null, { timeout: 120000 });
  const r = await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const rt = globalThis.__ojs_runtime;
    const agents = [...rt._variables].find(v => v._name === "rc5_agents" && v._value && "makeSession" in v._value)._value;
    await agents.ready;
    const fake = () => { const messages = []; return { messages, dispose() {}, async send(input) {
      messages.push({ role: "user", content: input }); await sleep(1500); messages.push({ role: "assistant", content: "done" }); return { finishReason: "stop" }; } }; };
    Object.defineProperty(agents, "makeSession", { configurable: true, get: () => fake, set() {} });
    const root = document.querySelector("[data-rc5-group]");
    const send = [...root.querySelectorAll("button")].find(b => b.textContent.trim() === "Send");
    const ta = send.parentElement.querySelector("textarea");
    const newchat = [...root.querySelectorAll("button")].find(b => b.textContent.trim() === "⟲");
    ta.value = "go"; send.click();
    await sleep(50);
    const run = root.active;                 // what the fixed run-one records right after sending
    await sleep(300);
    newchat.click();                         // the turn switches the panel away from itself
    await sleep(2500);
    const shown = document.querySelector("[data-rc5-group]").active;
    return { runDone: !!run.log && !run.busy, shownDone: !!shown.log && !shown.busy, shownSession: shown.session === null ? "null" : typeof shown.session, switched: shown !== run };
  });
  console.log(JSON.stringify(r));
  if (!r.switched || !r.runDone) { console.log("FAIL setup: the scripted turn did not settle in its own entry"); fail++; }
  const followsRun = /window\.__rc5Run/.test(src) && !/done: \(e => !!e\.log && !e\.busy\)\(document\.querySelector\("\[data-rc5-group\]"\)\.active\)/.test(src);
  if (!followsRun) { console.log("FAIL run-one decides 'done' from the panel's shown entry (done=" + r.shownDone + ", session " + r.shownSession + "): it would poll to timeout, then .active.session.abort() throws"); fail++; }
  else console.log("ok run-one follows the entry it sent to (done=" + r.runDone + ")");
} finally { await browser.close(); }
process.exit(fail ? 1 : 0);
