// probe (rc5-train m58): task_complete sent in the same step as other tool calls must not end the turn
// before the model has seen those calls' results. In 20260929-0620-m58-before (32s) the model sent
// request_files + task_complete together; the file arrived, and the turn ended on a summary written before
// it did ("I don't see a projects.csv file ... Once I have it ..."). Scripted model (fetch stub), no key.
//   turn 1: step 1 = [glob, task_complete "EARLY"]; step 2 (if the loop asks) = [task_complete "LATE"]
//   turn 2: [glob], then [task_complete "ALONE"]: a completion on its own still ends the turn at once
// Usage: node probe.mjs <notebook.html>   (exit 1 unless every check passes)
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const STUB = String.raw`(() => {
  const S = globalThis.__m58 = { queue: [], reqs: [] };
  const orig = globalThis.fetch;
  const sse = (model, delta, finish) => "data: " + JSON.stringify({ id: "x", model, choices: [{ index: 0, delta }] }) + "\n\n" +
    "data: " + JSON.stringify({ id: "x", model, choices: [{ index: 0, delta: {}, finish_reason: finish }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }) + "\n\ndata: [DONE]\n\n";
  globalThis.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || String(input);
    if (!/\/chat\/completions/.test(url)) return orig.apply(this, arguments);
    let body = {}; try { body = JSON.parse((init && init.body) || "{}"); } catch {}
    if (!(body.tools && body.tools.length)) return new Response(sse(body.model, { role: "assistant", content: "probe title" }, "stop"), { status: 200, headers: { "content-type": "text/event-stream" } });
    S.reqs.push(body.messages.slice(-4).map(m => m.role + ":" + String(m.content ?? "").slice(0, 60)));
    const step = S.queue.shift() || [["task_complete", { summary: "IDLE" }]];
    const delta = { role: "assistant", tool_calls: step.map(([name, args], i) => ({ index: i, id: "c" + S.reqs.length + "_" + i, type: "function", function: { name, arguments: JSON.stringify(args) } })) };
    return new Response(sse(body.model, delta, "tool_calls"), { status: 200, headers: { "content-type": "text/event-stream" } });
  };
  try { localStorage.setItem("OPENROUTER_API_KEY", "sk-probe-not-a-key"); } catch {}
})()`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.addInitScript(STUB);
await page.goto(pathToFileURL(NB).href);
const out = await page.evaluate(async () => {
  const S = globalThis.__m58, sleep = ms => new Promise(r => setTimeout(r, ms));
  let sv; const t0 = Date.now();
  while (!(sv = [...(globalThis.__ojs_runtime?._variables ?? [])].find(v => v._name === "session" && v._value?.send)) && Date.now() - t0 < 120000) await sleep(300);
  if (!sv) return { error: "no session" };
  // tools register after `session` exists (rc5_boot); wait for the registry, or glob is "unknown tool"
  const hasGlob = async () => { const tv = [...globalThis.__ojs_runtime._variables].find(v => v._name === "toolsView"); if (!tv) return false;
    const t = await tv._module.value("toolsView").catch(() => null); return (Array.isArray(t) ? t : t?.value ?? []).some(x => x.id === "glob"); };
  while (!(await hasGlob()) && Date.now() - t0 < 120000) await sleep(300);
  const session = sv._value;
  const run = async (steps, text) => {
    S.queue.length = 0; S.queue.push(...steps); const r0 = S.reqs.length, m0 = session.messages.length;
    const turn = await session.send(text);
    const msgs = session.messages.slice(m0);
    const last = [...msgs].reverse().find(m => m.role === "assistant" && m.content);
    return { requests: S.reqs.length - r0, finish: turn?.finishReason, final: last?.content ?? null,
      toolResults: msgs.filter(m => m.role === "tool").map(m => String(m.content).slice(0, 90)) };
  };
  const t1 = await run([[["glob", { pattern: "/src/@probe/none-*.js" }], ["task_complete", { summary: "EARLY" }]], [["task_complete", { summary: "LATE" }]]], "list probe files");
  const t2 = await run([[["glob", { pattern: "/src/@probe/none-*.js" }]], [["task_complete", { summary: "ALONE" }]]], "list them again");
  return { t1, t2 };
});
await browser.close();
const checks = {
  batchedCompletionDoesNotEndTurn: out.t1?.requests === 2 && out.t1?.final === "LATE",
  batchedTurnCompletes: out.t1?.finish === "completed",
  loneCompletionEndsInOneStep: out.t2?.requests === 2 && out.t2?.final === "ALONE" && out.t2?.finish === "completed",
};
console.log(JSON.stringify({ ...out, checks }, null, 1));
const ok = Object.values(checks).every(Boolean);
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
