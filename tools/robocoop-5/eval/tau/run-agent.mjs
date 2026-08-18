#!/usr/bin/env node
// Arm B — the robocoop-5 SYSTEM on tau-bench retail. The rc5 session runs inside the notebook with:
//   - the editable system prompt (a product feature) set to the tau retail policy wiki,
//   - the 16 retail tools registered on the live tool bus as thin proxies to the fidelity-checked
//     Node environment (page.exposeFunction → invokeTool; DB state lives in Node),
//   - by default the notebook file tools are unregistered so the tool surface matches the baseline
//     arm (pass --keep-tools to test the full surface),
//   - each user-simulator message = one session.send turn; the turn's final assistant text (the
//     task_complete summary) is the reply to the user. '###STOP###' ends the conversation, and so
//     does a terminate tool (transfer_to_human_agents) the instant it fires (T1).
// Grading identical to run-baseline.mjs: final-state delta vs Python oracle + required outputs,
// searched over EVERY assistant text message of the session, not just turn-final replies (T9).
//   node run-agent.mjs [--limit N] [--offset N] [--tasks 1,5,9] [--model m] [--user-model m]
//                      [--notebook path] [--json out] [--headed] [--keep-tools] [--official-budget]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  loadData, invokeTool, grade, userSimSystemPrompt,
  isTerminateTool, assistantTexts, assistantTextsBefore, budgetExhausted, classifyEnd,
} from "./retail-env.mjs";
import { criterionStamp, fileHash } from "../../../robocoop-eval/stamp.mjs";
import { chat, loadKey } from "./openrouter.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const model = flag("--model", "xiaomi/mimo-v2.5-pro"); // NEVER read OPENROUTER_MODEL — evals are mimo
const userModel = flag("--user-model", "xiaomi/mimo-v2.5-pro");
const limit = Number(flag("--limit", 115));
const offset = Number(flag("--offset", 0));
const taskSel = flag("--tasks", null);
const notebook = flag("--notebook", join(here, "..", "robocoop-5-eval.html"));
const headed = args.includes("--headed");
const keepTools = args.includes("--keep-tools");
// --no-context: unregister all rc5-context providers before the conversation, so no <environment>
// block is injected. Diagnostic arm for the 2026-08-16 principles-gate regression (the context
// system postdates July's runs and injects page/layout/notebook noise into retail conversations).
const noContext = args.includes("--no-context");
// --official-budget: cap the episode at the official 30 LLM calls TOTAL
// (ToolCallingAgent.solve(max_num_steps=30)), counting session steps across every turn, and grade
// as-is when it runs out. OFF by default — the fair-game test-time-compute design (an rc5 turn
// spends as many steps as it needs) is the standard arm; this flag builds strict-fidelity arms.
// Granularity is one turn: the cap is tested after each send() returns, so an episode can overshoot
// by at most the session's maxStepsPerTurn — stopping mid-send would mean aborting the turn.
const officialBudget = args.includes("--official-budget");
const jsonOut = flag("--json", join(here, "results", `agent-${taskSel ? "sel" : offset + "-" + (offset + limit)}.json`));
// --trajectories [dir]: persist each task's FULL agent-session messages + user-sim messages for
// counterfactual attribution (plan/robocoop-5-credit-assignment.md). The `trajectory` field in the
// results JSON truncates tool observations to 400 chars — not enough to resume a session from a
// prefix; these files are the complete record. Key-prone (whole conversations) — keep untracked.
const trajIdx = args.indexOf("--trajectories");
const trajDir = trajIdx >= 0
  ? (args[trajIdx + 1] && !args[trajIdx + 1].startsWith("--") ? args[trajIdx + 1] : join(here, "results", "trajectories"))
  : null;
const SEND_TIMEOUT = 240000;
const TASK_DEADLINE = 15 * 60 * 1000;
const MAX_EXCHANGES = 20;

const EXPORT = JSON.parse(readFileSync(join(here, "retail-export.json"), "utf8"));
const WIKI = EXPORT.wiki;
const TOOLS_INFO = EXPORT.tools_info;
let tasks = taskSel
  ? EXPORT.tasks.filter((t) => taskSel.split(",").map(Number).includes(t.idx))
  : EXPORT.tasks.slice(offset, offset + limit);
const apiKey = loadKey();
const nbPath = notebook.startsWith("/") ? notebook : join(process.cwd(), notebook);
console.log(`model: ${model}  user-model: ${userModel}  tasks: ${tasks.length}  notebook: ${nbPath}${keepTools ? "  (full tool surface)" : ""}`);

// Criterion identity for this run (plan/rqgm-and-robocoop-5.md, U2): which core modules, which
// runner protocol, which task export, which environment/grader. Scores whose stamps differ are NOT
// comparable — see eval/ladder.mjs.
const stamp = criterionStamp({
  notebookPath: nbPath,
  extra: {
    runnerPath: fileURLToPath(import.meta.url),
    retailExportHash: fileHash(join(here, "retail-export.json")),
    envHash: fileHash(join(here, "retail-env.mjs")),
    officialBudget, // a capped arm is a different criterion from an uncapped one
  },
});

const LAYOUT = "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";

async function bootPage(browser, onToolCall) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.exposeFunction("__tauInvoke", (name, kwargs) => onToolCall(name, kwargs));
  await page.addInitScript(([k, m]) => {
    try {
      localStorage.setItem("OPENROUTER_API_KEY", k);
      localStorage.setItem("robocoop4_model", m);
    } catch {}
  }, [apiKey, model]);
  await page.goto(`file://${nbPath}#view=${LAYOUT}`, { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(
    () => globalThis.__ojs_runtime && globalThis.__ojs_runtime.mains && globalThis.__ojs_runtime.mains.size > 0,
    { timeout: 30000 },
  );
  // client + session readiness (same probing as the shared eval driver-core)
  const ready = await page.evaluate(async ({ key, mdl, maxMs }) => {
    const reg = globalThis.__ojs_runtime;
    const allVars = () => {
      const out = []; const seen = new Set();
      for (const m of reg.mains.values()) {
        const rt = m && m._runtime;
        if (!rt || seen.has(rt)) continue;
        seen.add(rt);
        for (const v of rt._variables) out.push(v);
      }
      return out;
    };
    const byName = (n) => allVars().find((v) => v._name === n);
    const observe = (n) => { const v = byName(n); try { if (v && v._module) v._module.value(n).catch(() => {}); } catch {} };
    const setView = (name, value) => {
      const v = byName(name);
      const el = v && v._value;
      if (!el || typeof el !== "object") return false;
      const input = el.querySelector?.("input,select,textarea");
      if (input) {
        if (input.tagName === "SELECT" && ![...input.options].some((o) => o.value === value)) {
          const opt = input.ownerDocument.createElement("option");
          opt.value = value; opt.textContent = value;
          input.appendChild(opt);
        }
        input.value = value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      try { el.value = value; } catch {}
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    };
    for (const n of ["viewof OPENROUTER_API_KEY", "viewof model", "client", "session", "toolsView", "hostSetup", "rc5_host"]) observe(n);
    const deadline = Date.now() + maxMs;
    let injected = false;
    while (Date.now() < deadline) {
      const c = byName("client");
      if (c && c._value != null && !(c._value instanceof Error)) {
        const s = byName("session");
        const tv = byName("toolsView");
        const toolsArr = tv && tv._value && Array.isArray(tv._value.value) ? tv._value.value : [];
        const mv = byName("model");
        const me = byName("viewof model");
        const resolved = (mv && mv._value) || (me && me._value && me._value.value);
        if (s && s._value && typeof s._value.send === "function" && toolsArr.some((t) => t && t.id === "read_file") && resolved === mdl)
          return true;
      }
      if (!injected) { setView("viewof OPENROUTER_API_KEY", key); setView("viewof model", mdl); injected = true; }
      for (const n of ["viewof model", "model", "client", "session", "toolsView", "hostSetup", "rc5_host"]) observe(n);
      await new Promise((r) => setTimeout(r, 250));
    }
    return false;
  }, { key: apiKey, mdl: model, maxMs: 45000 });
  if (!ready) { await context.close(); throw new Error("notebook did not initialize (client/session/tools)"); }
  return { context, page };
}

async function setupRetail(page, toolsInfo, wiki, keepTools, noContext) {
  await page.evaluate(async ({ toolsInfo, wiki, keepTools, noContext }) => {
    const reg = globalThis.__ojs_runtime;
    const allVars = () => {
      const out = []; const seen = new Set();
      for (const m of reg.mains.values()) {
        const rt = m && m._runtime;
        if (!rt || seen.has(rt)) continue;
        seen.add(rt);
        for (const v of rt._variables) out.push(v);
      }
      return out;
    };
    const byName = (n) => allVars().find((v) => v._name === n);
    // 1. system prompt = tau retail policy wiki (drive the editable prompt textarea — product surface)
    const pv = byName("viewof rc5_systemPrompt");
    const el = pv && pv._value;
    if (!el) throw new Error("viewof rc5_systemPrompt not found");
    const ta = el.querySelector("textarea");
    ta.value = wiki;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    // 2. tool surface: optionally drop the notebook tools, then register the retail proxies
    const registerTool = byName("registerTool")?._value;
    const unregisterTool = byName("unregisterTool")?._value;
    const toolsView = byName("toolsView")?._value;
    if (typeof registerTool !== "function") throw new Error("registerTool unavailable");
    if (!keepTools && typeof unregisterTool === "function" && toolsView && Array.isArray(toolsView.value))
      for (const t of [...toolsView.value]) unregisterTool(t.id);
    for (const info of toolsInfo) {
      const f = info.function;
      registerTool({
        id: f.name,
        description: f.description,
        parameters: f.parameters,
        execute: async (args) => ({ output: String(await window.__tauInvoke(f.name, args || {})) }),
      });
    }
    // 3. optionally silence situational context (diagnostic arm)
    if (noContext) {
      const unregisterContext = byName("unregisterContext")?._value;
      const contextView = byName("contextView")?._value;
      if (typeof unregisterContext === "function" && contextView && Array.isArray(contextView.value))
        for (const p of [...contextView.value]) if (p && p.id) unregisterContext(p.id);
    }
  }, { toolsInfo, wiki, keepTools, noContext });
}

async function sendTurn(page, userMsg, timeoutMs) {
  return page.evaluate(async ({ userMsg, timeoutMs }) => {
    const reg = globalThis.__ojs_runtime;
    const allVars = () => {
      const out = []; const seen = new Set();
      for (const m of reg.mains.values()) {
        const rt = m && m._runtime;
        if (!rt || seen.has(rt)) continue;
        seen.add(rt);
        for (const v of rt._variables) out.push(v);
      }
      return out;
    };
    const session = allVars().find((v) => v._name === "session")?._value;
    if (!session || typeof session.send !== "function") throw new Error("session unavailable");
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("session.send timed out after " + timeoutMs + "ms")), timeoutMs));
    const turn = await Promise.race([session.send(userMsg), timeout]);
    const msgs = (turn && (turn.turnMessages || turn.messages)) || [];
    // Hand the WHOLE turn back (text + which tools each assistant message called) — the outputs
    // corpus (T9) and the terminate cut (T1) are computed Node-side against retail-env's helpers,
    // so this bridge stays a dumb transport.
    const messages = msgs.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : "",
      tools: (Array.isArray(m.tool_calls) ? m.tool_calls : []).map((tc) => tc?.function?.name).filter(Boolean),
    }));
    return { messages, steps: turn?.steps ?? null, finishReason: turn?.finishReason ?? null };
  }, { userMsg, timeoutMs });
}

async function userSim(simMessages) {
  const r = await chat(simMessages, { model: userModel, max_tokens: 4000 });
  const text = (r.content || "").trim();
  simMessages.push({ role: "assistant", content: text });
  return text;
}

// Read the agent session's complete message history off the live page and persist it with the
// user-sim conversation — everything a counterfactual resume needs (DB state refolds from the
// tool calls inside the messages; sim state is the simMessages slice).
async function saveTauTrajectory(page, task, simMessages, agentReplies, rec, sessionTexts = []) {
  if (!page) return;
  const conversation = await page.evaluate(() => {
    const reg = globalThis.__ojs_runtime;
    const out = []; const seen = new Set();
    let session = null;
    for (const m of reg.mains.values()) {
      const rt = m && m._runtime;
      if (!rt || seen.has(rt)) continue;
      seen.add(rt);
      for (const v of rt._variables) if (v._name === "session") { session = v._value; break; }
      if (session) break;
    }
    if (!session || !Array.isArray(session.messages)) return null;
    return session.messages.map((m) => {
      const o = { role: m.role, content: m.content ?? "" };
      if (Array.isArray(m.tool_calls)) o.tool_calls = m.tool_calls;
      if (m.tool_call_id) o.tool_call_id = m.tool_call_id;
      return o;
    });
  }).catch(() => null);
  mkdirSync(trajDir, { recursive: true });
  writeFileSync(join(trajDir, `task-${task.idx}.json`), JSON.stringify({
    idx: task.idx, capturedAt: new Date().toISOString(), model, userModel,
    instruction: task.instruction, reward: rec.reward ?? null, error: rec.error ?? null,
    steps: rec.steps ?? null, endReason: rec.endReason ?? null,
    terminatedByTransfer: rec.terminatedByTransfer ?? false,
    conversation: conversation || [], simMessages, agentReplies, sessionTexts,
  }, null, 1));
}

const browser = await chromium.launch({
  headless: !headed,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
});

const results = [];
for (const task of tasks) {
  const t0 = Date.now();
  const data = loadData();
  const initial = loadData();
  const trajectory = [];
  const agentReplies = [];       // one turn-final reply per exchange — what the user simulator saw
  const sessionTexts = [];       // EVERY assistant text message — the outputs corpus (T9)
  let rec = { idx: task.idx };
  let context = null;
  let simMessages = null;
  let stopped = false, deadline = false; // exit flags -> classifyEnd() (T2)
  let transferred = false;       // a terminate tool fired inside the current send() (T1)
  let transferState = null;      // DB snapshot frozen at that instant
  let gradeTexts = null;         // outputs corpus frozen at that instant
  try {
    const booted = await bootPage(browser, (name, kwargs) => {
      const obs = invokeTool(data, name, kwargs);
      trajectory.push({ tool: name, kwargs, obs: String(obs).slice(0, 400) });
      // T1 — official (envs/base.py:108) is done the moment a terminate tool is invoked and grades
      // the state at that step. The tool bus calls us mid-turn, so freeze the state here and let the
      // loop break once send() has returned: killing the browser mid-send would corrupt the session.
      if (isTerminateTool(name) && !transferred) { transferred = true; transferState = structuredClone(data); }
      return obs;
    });
    context = booted.context;
    await setupRetail(booted.page, TOOLS_INFO, WIKI, keepTools, noContext);

    simMessages = [
      { role: "system", content: userSimSystemPrompt(task.instruction) },
      { role: "user", content: "Hi! How can I help you today?" },
    ];
    let userMsg = await userSim(simMessages);
    trajectory.push({ user: userMsg });
    let totalSteps = 0;
    for (let ex = 0; ex < MAX_EXCHANGES; ex++) {
      // A blown deadline is an ENDING, not an error: official grades an episode wherever it stops.
      if (Date.now() - t0 > TASK_DEADLINE) { deadline = true; break; }
      // A network blip inside one turn must not abort the whole task: the session is persistent,
      // so retry the same user message after a pause before giving up.
      let turn, sendErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 20000 * attempt));
        try { turn = await sendTurn(booted.page, userMsg, SEND_TIMEOUT); sendErr = null; break; }
        catch (e) { sendErr = e; trajectory.push({ sendError: String(e && e.message).slice(0, 150), attempt }); }
      }
      if (sendErr) throw sendErr;
      totalSteps += turn.steps || 0;
      const turnTexts = assistantTexts(turn.messages);
      const reply = turnTexts[turnTexts.length - 1] || "(no reply)";
      agentReplies.push(reply);
      trajectory.push({ agent: reply, steps: turn.steps, finishReason: turn.finishReason });
      if (transferred) {
        // Only text the agent had already emitted when it transferred counts as a respond action.
        gradeTexts = sessionTexts.concat(assistantTextsBefore(turn.messages));
        sessionTexts.push(...turnTexts);
        break;
      }
      sessionTexts.push(...turnTexts);
      // T3 — strict-fidelity arms only: out of official steps, grade as it stands. Checked before
      // the simulator is asked for another message: the agent has no calls left to answer it with.
      if (officialBudget && budgetExhausted(totalSteps)) break;
      simMessages.push({ role: "user", content: reply });
      userMsg = await userSim(simMessages);
      trajectory.push({ user: userMsg });
      if (userMsg.includes("###STOP###")) { stopped = true; break; }
    }
    const endReason = classifyEnd({ transferred, stopped, deadline });
    const g = grade(task, initial, transferred ? transferState : data, gradeTexts ?? sessionTexts);
    rec = {
      idx: task.idx, reward: g.reward, r_actions: g.r_actions, r_outputs: g.r_outputs, missing: g.missing,
      steps: totalSteps, endReason, terminatedByTransfer: transferred,
      budgetExceeded: officialBudget && budgetExhausted(totalSteps), trajectory,
    };
    if (trajDir) await saveTauTrajectory(booted.page, task, simMessages, agentReplies, rec, sessionTexts);
  } catch (e) {
    const g = grade(task, initial, transferred ? transferState : data, gradeTexts ?? sessionTexts);
    rec = {
      idx: task.idx, reward: g.reward, r_actions: g.r_actions, r_outputs: g.r_outputs,
      endReason: classifyEnd({ error: true }), terminatedByTransfer: transferred,
      error: String(e && e.message).slice(0, 300), trajectory,
    };
    if (trajDir && context) { try { await saveTauTrajectory(context.pages()[0], task, simMessages ?? [], agentReplies, rec, sessionTexts); } catch {} }
  } finally {
    if (context) { try { await context.close(); } catch {} }
  }
  rec.seconds = Math.round((Date.now() - t0) / 1000);
  results.push(rec);
  console.log(`${rec.reward ? "PASS" : "FAIL"}  task ${task.idx}  steps=${rec.steps ?? "-"} (${rec.seconds}s)${rec.error ? "  err=" + rec.error : rec.reward ? "" : `  r_actions=${rec.r_actions} r_outputs=${rec.r_outputs}`}`);
}

await browser.close();
results.sort((a, b) => a.idx - b.idx);
const passed = results.filter((r) => r.reward === 1).length;
console.log(`\npass@1: ${passed}/${results.length} = ${(passed / results.length).toFixed(3)}`);
const endReasons = {};
for (const r of results) endReasons[r.endReason ?? "unknown"] = (endReasons[r.endReason ?? "unknown"] ?? 0) + 1;
console.log(`endReason: ${Object.entries(endReasons).map(([k, v]) => `${k}=${v}`).join("  ")}`);
mkdirSync(join(here, "results"), { recursive: true });
writeFileSync(jsonOut, JSON.stringify({
  arm: keepTools ? "agent-fullsurface" : "agent", model, userModel, stamp, officialBudget,
  pass1: passed, total: results.length, endReasons, results,
}, null, 1));
console.log("wrote", jsonOut);
