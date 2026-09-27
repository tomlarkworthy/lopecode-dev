// Drive the real robocoop-5 chat UI with one prompt, headless, and record the trace: every message as it
// lands (with its arrival time), tool calls + results, reasoning, status lines, console errors.
//   node tools/scratch/rc5-evals/run-one.mjs "<prompt>" [--model <id>] [--timeout-min 20] [--out name] [--notebook f.html]
// While it runs, out/<name>.live.log gets one line per message. Writing a reason into out/<name>.abort stops
// the turn (the session is aborted, outcome "aborted: <reason>") and the trace is still dumped.
// --answer answers the agent's request_files card: comma-separated local file paths, a URL, or "skip".
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const model = flag("--model", null);
const timeoutMin = Number(flag("--timeout-min", 20));
const name = flag("--out", "run-" + new Date().toISOString().replace(/[:.]/g, "-"));
const answer = flag("--answer", null);
const nb = resolve(flag("--notebook", resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html")));
const prompt = args.join(" ");
if (!prompt) { console.error("usage: run-one.mjs <prompt>"); process.exit(2); }
mkdirSync(resolve(here, "out"), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const consoleErrors = [];
page.on("pageerror", e => consoleErrors.push({ t: Date.now(), msg: String(e).slice(0, 300) }));
page.on("console", m => { if (m.type() === "error") consoleErrors.push({ t: Date.now(), msg: m.text().slice(0, 300) }); });
if (model) await page.addInitScript(m => { try { localStorage.setItem("robocoop4_model", JSON.stringify(m)); } catch {} }, model);
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session, null, { timeout: 120000 });
const modelShown = await page.evaluate(() => [...document.querySelector("[data-rc5-group]").querySelectorAll("div")].map(d => d.textContent).find(t => t.startsWith("model: ")));

// Poll the live session: a message is recorded the first time it is seen, stamped with that time.
await page.evaluate(() => {
  const root = document.querySelector("[data-rc5-group]");
  const seen = new WeakSet();
  window.__trace = { t0: Date.now(), msgs: [], status: [] };
  let lastStatus = "";
  window.__poll = setInterval(() => {
    const s = root.active?.session;
    for (const m of s?.messages ?? []) {
      if (seen.has(m)) continue;
      seen.add(m);
      window.__trace.msgs.push({ t: Date.now() - window.__trace.t0, role: m.role, content: m.content,
        tool_calls: m.tool_calls, tool_call_id: m.tool_call_id, reasoning: m.reasoning ?? null });
    }
    // the status line under the transcript (thinking… / ⚙ tool · step n)
    const st = [...root.querySelectorAll("div")].find(d => d.style.fontStyle === "italic" && d.style.display !== "none")?.textContent || "";
    if (st && st !== lastStatus) { window.__trace.status.push({ t: Date.now() - window.__trace.t0, st }); lastStatus = st; }
  }, 250);
});
const ta = page.locator('[data-rc5-group] textarea[placeholder^="Message robocoop-5"]');
await ta.fill(prompt);
await ta.press("Enter");
const t0 = Date.now();
let outcome = "done";
const liveFile = resolve(here, "out", name + ".live.log"), abortFile = resolve(here, "out", name + ".abort");
writeFileSync(liveFile, "");
const line = m => {
  const at = (m.t / 1000).toFixed(0).padStart(5) + "s ";
  if (m.role === "assistant") {
    const tc = (m.tool_calls || []).map(t => t.function.name + " " + t.function.arguments.slice(0, 300)).join(" | ");
    return at + "A " + (m.reasoning ? "[r" + m.reasoning.length + "] " : "") + (tc || String(m.content ?? "").slice(0, 400)).replace(/\n/g, " ");
  }
  if (m.role === "tool") return at + "  → " + String(m.content ?? "").slice(0, 400).replace(/\n/g, " ");
  return at + m.role[0].toUpperCase() + " " + String(typeof m.content === "string" ? m.content : JSON.stringify(m.content)).slice(0, 300).replace(/\n/g, " ");
};
for (let n = 0; ; ) {
  const snap = await page.evaluate(n => ({ fresh: window.__trace.msgs.slice(n), status: window.__trace.status.at(-1)?.st ?? "",
    done: (e => !!e.log && !e.busy)(document.querySelector("[data-rc5-group]").active) }), n);
  for (const m of snap.fresh) appendFileSync(liveFile, line(m) + "\n");
  n += snap.fresh.length;
  if (snap.done) break;
  const asked = await page.evaluate(() => document.querySelector("[data-rc5-group]").active.session?.askBus?.pending?.prompt ?? null);
  if (asked != null) {
    let given;
    if (!answer || answer === "skip") { given = "skip"; await page.evaluate(() => document.querySelector("[data-rc5-group]").active.session.askBus.skip()); }
    else if (/^https?:/.test(answer)) { given = answer; await page.evaluate(u => document.querySelector("[data-rc5-group]").active.session.askBus.respond([u]), answer); }
    else {
      const files = answer.split(",").map(f => ({ name: f.split("/").pop(), b64: readFileSync(resolve(f)).toString("base64") }));
      given = files.map(f => f.name).join(",");
      await page.evaluate(fs => document.querySelector("[data-rc5-group]").active.session.askBus.respond(
        fs.map(f => new File([Uint8Array.from(atob(f.b64), c => c.charCodeAt(0))], f.name, { type: /\.csv$/.test(f.name) ? "text/csv" : "" }))), files);
    }
    appendFileSync(liveFile, "ASK " + asked + " -> " + given + "\n");
  }
  if (existsSync(abortFile)) { outcome = "aborted: " + readFileSync(abortFile, "utf8").trim().slice(0, 300); break; }
  if (Date.now() - t0 > timeoutMin * 60000) { outcome = "timeout"; break; }
  await page.waitForTimeout(2000);
}
if (outcome !== "done") await page.evaluate(() => document.querySelector("[data-rc5-group]").active.session.abort?.());
appendFileSync(liveFile, "END " + outcome + "\n");
await page.waitForTimeout(1500);
const trace = await page.evaluate(() => {
  clearInterval(window.__poll);
  const root = document.querySelector("[data-rc5-group]");
  const shadowText = [...root.querySelectorAll("*")].flatMap(el => el.shadowRoot ? [el.shadowRoot.textContent] : []).join("\n");
  const agentErrors = [...root.querySelectorAll("*")].flatMap(el => el.shadowRoot ? [...el.shadowRoot.querySelectorAll("div")] : []).concat([...root.querySelectorAll("div")])
    .map(d => d.textContent).filter(t => t.startsWith("⚠ agent error"));
  // wiki discipline: which docs the session read, and which writes the read-gate refused first
  const st = root.active.session.sessionState ?? {};
  const wiki = { read: [...(st.wikiRead ?? [])], refusals: st.wikiRefusals ?? [] };
  return { ...window.__trace, agentErrors, wiki, transcriptTail: shadowText.slice(-3000) };
});
const result = { prompt, model: modelShown, outcome, wallS: (Date.now() - t0) / 1000, consoleErrors, ...trace };
const file = resolve(here, "out", name + ".json");
writeFileSync(file, JSON.stringify(result, null, 2));
// compact step view
const calls = trace.msgs.filter(m => m.role === "assistant");
console.log(`${outcome} in ${result.wallS.toFixed(0)}s, ${calls.length} assistant messages, ${trace.msgs.filter(m => m.role === "tool").length} tool results — ${result.model}`);
for (const m of trace.msgs) {
  if (m.role === "assistant") {
    const tc = (m.tool_calls || []).map(t => t.function.name + " " + t.function.arguments.slice(0, 140)).join(" | ");
    console.log(`${(m.t / 1000).toFixed(0).padStart(5)}s A ${m.reasoning ? "[r" + m.reasoning.length + "] " : ""}${tc || String(m.content ?? "").slice(0, 200).replace(/\n/g, " ")}`);
  } else if (m.role === "tool") console.log(`${(m.t / 1000).toFixed(0).padStart(5)}s   → ${String(m.content ?? "").slice(0, 160).replace(/\n/g, " ")}`);
  else if (m.role === "user") console.log(`${(m.t / 1000).toFixed(0).padStart(5)}s U ${String(typeof m.content === "string" ? m.content : JSON.stringify(m.content)).slice(0, 160)}`);
  else if (m.role === "system" && !String(m.content).startsWith("<environment")) console.log(`${(m.t / 1000).toFixed(0).padStart(5)}s S ${String(m.content).slice(0, 160).replace(/\n/g, " ")}`);
}
console.log("wiki read:", JSON.stringify(trace.wiki.read.map(p => p.split("/").pop())), "| gate refusals:", trace.wiki.refusals.length,
  trace.wiki.refusals.length ? "(read only after being refused)" : trace.wiki.read.length ? "(read unprompted)" : "");
console.log("agent errors", JSON.stringify(trace.agentErrors), "console errors", consoleErrors.length, "→", file);
await browser.close();
