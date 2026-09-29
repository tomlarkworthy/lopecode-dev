// Drive the real robocoop-5 chat UI with one prompt, headless, and record the trace: every message as it
// lands (with its arrival time), tool calls + results, reasoning, status lines, console errors.
//   node tools/scratch/rc5-evals/run-one.mjs "<prompt>" [--model <id>] [--timeout-min 20] [--out name] [--notebook f.html]
// While it runs, out/<name>.live.log gets one line per message. Writing a reason into out/<name>.abort stops
// the turn (the session is aborted, outcome "aborted: <reason>") and the trace is still dumped.
// --export <file.html> after the run: export the page from its live state, reopen the file, and write
// out/<name>.persist.json with the same snapshot before and after (colours, mains, cells, errors).
// --answer answers the agent's request_files card: comma-separated local file paths, a URL, or "skip".
// --answer-via chat|card types a URL answer the way a person would (into the chat box, or the card's URL
// field) instead of handing it to the ask channel directly.
// --extend <n> (default 1): a turn that ends on its step cap while still progressing (judgeProgress in
// tools/robocoop-eval/progress.mjs) is continued by typing CONTINUE_PROMPT, up to n times; each adds
// --timeout-min to the wall budget. Logged as "EXTEND <why>" / "NO-EXTEND <why>".
import { chromium } from "playwright";
import { judgeProgress, CONTINUE_PROMPT } from "../../robocoop-eval/progress.mjs";
import { writeFileSync, mkdirSync, appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const model = flag("--model", null);
const timeoutMin = Number(flag("--timeout-min", 20));
const extend = Number(flag("--extend", 1));
const name = flag("--out", "run-" + new Date().toISOString().replace(/[:.]/g, "-"));
const answer = flag("--answer", null);
const answerVia = flag("--answer-via", "bus");
const exportTo = flag("--export", null);
const demo = args.includes("--demo") ? (args.splice(args.indexOf("--demo"), 1), true) : false;
const nb = resolve(flag("--notebook", resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html")));
const prompt = args.join(" ");
if (!prompt || args.some(a => a.startsWith("--"))) {
  console.error("usage: run-one.mjs [--demo] [--notebook f] [--out name] [--model m] [--timeout-min n] [--extend n] [--answer paths|URL|skip] [--answer-via bus|chat|card] [--export f] <prompt>" + (prompt ? "\nunknown flag in: " + prompt : ""));
  process.exit(2);
}
// Without a key the chat runs in demo mode through the public gateway, whose daily quota is shared with
// real users ("429 … Come back tomorrow"). Use the eval harness's key unless --demo asks for that path.
const envKey = () => {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  for (const f of ["../../robocoop-5/.env", "../../robocoop-4/.env", "../../../.env"]) {
    try { const m = /^OPENROUTER_API_KEY=["']?([^"'\n]+)/m.exec(readFileSync(resolve(here, f), "utf8")); if (m) return m[1].trim(); } catch {}
  }
  return null;
};
const apiKey = demo ? null : envKey();
if (!demo && !apiKey) { console.error("run-one: no OPENROUTER_API_KEY in env or tools/robocoop-4/.env; pass --demo to use the public demo gateway"); process.exit(2); }
mkdirSync(resolve(here, "out"), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const consoleErrors = [];
page.on("pageerror", e => consoleErrors.push({ t: Date.now(), msg: String(e).slice(0, 300) }));
// "error building module dependancy map" is background noise from module-map on every boot (146-241 a run):
// counted, not listed, so a real page error is not buried under it.
let noise = 0;
page.on("console", m => { if (m.type() !== "error") return; const t = m.text(); if (/^error building module dependancy map/.test(t)) return void noise++; consoleErrors.push({ t: Date.now(), msg: t.slice(0, 300) }); });
if (apiKey) await page.addInitScript(k => { try { localStorage.setItem("OPENROUTER_API_KEY", k); } catch {} }, apiKey);
if (model) await page.addInitScript(m => { try { localStorage.setItem("robocoop4_model", m); } catch {} }, model);
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session, null, { timeout: 120000 });
const modelShown = await page.evaluate(() => [...document.querySelector("[data-rc5-group]").querySelectorAll("div")].map(d => d.textContent).find(t => t.startsWith("model: ")));

// Poll the live session: a message is recorded the first time it is seen, stamped with that time.
await page.evaluate(() => {
  const root = document.querySelector("[data-rc5-group]");
  const seen = new WeakSet();
  window.__trace = { t0: Date.now(), msgs: [], status: [], turns: [] };
  // the UI keeps no turn result; wrap send to record how each turn ended
  const s0 = root.active.session, send0 = s0.send.bind(s0);
  s0.send = async (...a) => { const r = await send0(...a); window.__trace.turns.push({ t: Date.now() - window.__trace.t0, finishReason: r?.finishReason ?? null, steps: r?.steps ?? null }); return r; };
  let lastStatus = "";
  window.__poll = setInterval(() => {
    const s = (window.__rc5Run ?? root.active)?.session;
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
// The run is the entry this prompt went to. The agent can switch the panel to another session (a "new chat"
// it just built, tested by dispatching the key in the live page); the turn carries on in this entry.
await page.evaluate(() => { window.__rc5Run = document.querySelector("[data-rc5-group]").active; });
const t0 = Date.now();
let outcome = "done";
let switched = false;
const extensions = [];
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
    done: (e => !!e.log && !e.busy)(window.__rc5Run), shownOther: document.querySelector("[data-rc5-group]")?.active !== window.__rc5Run }), n);
  if (snap.shownOther && !switched) { switched = true; appendFileSync(liveFile, "SWITCHED the panel now shows another session; following the run's own\n"); }
  for (const m of snap.fresh) appendFileSync(liveFile, line(m) + "\n");
  n += snap.fresh.length;
  if (snap.done) {
    const last = await page.evaluate(() => window.__trace.turns.at(-1) ?? null);
    if (last?.finishReason !== "max_steps" || extensions.length >= extend) break;
    const msgs = await page.evaluate(() => window.__trace.msgs);
    const verdict = judgeProgress(msgs.slice(msgs.map(m => m.role).lastIndexOf("user") + 1));
    extensions.push({ t: Date.now() - t0, granted: verdict.progressing, why: verdict.why });
    appendFileSync(liveFile, (verdict.progressing ? "EXTEND " : "NO-EXTEND ") + verdict.why + "\n");
    if (!verdict.progressing) break;
    const turnsBefore = await page.evaluate(() => window.__trace.turns.length);
    await ta.fill(CONTINUE_PROMPT);
    await ta.press("Enter");
    await page.waitForFunction(k => window.__rc5Run.busy || window.__trace.turns.length > k, turnsBefore, { timeout: 30000 });
    continue;
  }
  const asked = await page.evaluate(() => window.__rc5Run.session?.askBus?.pending?.prompt ?? null);
  if (asked != null) {
    let given;
    if (!answer || answer === "skip") { given = "skip"; await page.evaluate(() => window.__rc5Run.session.askBus.skip()); }
    else if (/^https?:/.test(answer) && answerVia === "chat") { given = answer + " (typed in chat)"; await ta.fill(answer); await ta.press("Enter"); }
    else if (/^https?:/.test(answer) && answerVia === "card") {
      given = answer + " (card)";
      const card = page.locator('[data-rc5-group] div:has(> div > b:text-matches("asking for"))').last();
      await card.locator("input[type=url]").fill(answer);
      await card.locator('button:text("Use URL")').click();
    }
    else if (/^https?:/.test(answer)) { given = answer; await page.evaluate(u => window.__rc5Run.session.askBus.respond([u]), answer); }
    else {
      const files = answer.split(",").map(f => ({ name: f.split("/").pop(), b64: readFileSync(resolve(f)).toString("base64") }));
      given = files.map(f => f.name).join(",");
      await page.evaluate(fs => window.__rc5Run.session.askBus.respond(
        fs.map(f => new File([Uint8Array.from(atob(f.b64), c => c.charCodeAt(0))], f.name, { type: /\.csv$/.test(f.name) ? "text/csv" : "" }))), files);
    }
    appendFileSync(liveFile, "ASK " + asked + " -> " + given + "\n");
  }
  if (existsSync(abortFile)) { outcome = "aborted: " + readFileSync(abortFile, "utf8").trim().slice(0, 300); break; }
  if (Date.now() - t0 > timeoutMin * 60000 * (1 + extensions.filter(x => x.granted).length)) { outcome = "timeout"; break; }
  await page.waitForTimeout(2000);
}
if (outcome !== "done") await page.evaluate(() => window.__rc5Run.session?.abort?.());
appendFileSync(liveFile, "END " + outcome + "\n");
await page.waitForTimeout(1500);
const trace = await page.evaluate(() => {
  clearInterval(window.__poll);
  const root = document.querySelector("[data-rc5-group]");
  const shadowText = [...root.querySelectorAll("*")].flatMap(el => el.shadowRoot ? [el.shadowRoot.textContent] : []).join("\n");
  const agentErrors = [...root.querySelectorAll("*")].flatMap(el => el.shadowRoot ? [...el.shadowRoot.querySelectorAll("div")] : []).concat([...root.querySelectorAll("div")])
    .map(d => d.textContent).filter(t => t.startsWith("⚠ agent error"));
  // wiki discipline: which docs the session read, and which writes the read-gate refused first
  const st = window.__rc5Run.session?.sessionState ?? {};
  const wiki = { read: [...(st.wikiRead ?? [])], refusals: st.wikiRefusals ?? [] };
  return { ...window.__trace, agentErrors, wiki, transcriptTail: shadowText.slice(-3000) };
});
const result = { prompt, model: modelShown, outcome, switched, extensions, consoleNoise: noise, wallS: (Date.now() - t0) / 1000, consoleErrors, ...trace };
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
if (exportTo) {
  const snap = () => page.evaluate(async () => {
    const rt = window.__ojs_runtime;
    const cs = e => { const c = getComputedStyle(e); return { bg: c.backgroundColor, fg: c.color }; };
    const user = [...rt.mains.keys()].filter(k => !k.startsWith("@tomlarkworthy/"));
    const cells = {}, errors = [];
    for (const k of user) {
      const m = rt.mains.get(k);
      const vs = [...rt._variables].filter(v => v._module === m && v._name && !v._name.startsWith("module "));
      cells[k] = vs.map(v => v._name);
      for (const v of vs) { try { await Promise.race([v._promise, new Promise(r => setTimeout(r, 2000))]); } catch (e) { errors.push(k + ":" + v._name + " " + String(e?.message ?? e).slice(0, 120)); } }
    }
    return { page: cs(document.body), html: cs(document.documentElement), mains: [...rt.mains.keys()].length, userModules: cells, errors };
  });
  const post = { live: await snap().catch(e => String(e)) };
  try {
    const html = await page.evaluate(async () => {
      const rt = window.__ojs_runtime;
      const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
      const r = await f({ mains: rt.mains });
      return typeof r === "string" ? r : r.source;
    });
    writeFileSync(resolve(exportTo), html);
    await page.goto(pathToFileURL(resolve(exportTo)).href);
    await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session, null, { timeout: 120000 });
    await page.waitForTimeout(4000);
    post.reopened = await snap().catch(e => String(e));
  } catch (e) { post.exportError = String(e); }
  writeFileSync(resolve(here, "out", name + ".persist.json"), JSON.stringify(post, null, 2));
  console.log("PERSIST", JSON.stringify(post).slice(0, 600));
}
await browser.close();
