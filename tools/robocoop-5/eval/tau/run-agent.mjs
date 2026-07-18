#!/usr/bin/env node
// Arm B — the robocoop-5 SYSTEM on tau-bench retail. The rc5 session runs inside the notebook with:
//   - the editable system prompt (a product feature) set to the tau retail policy wiki,
//   - the 16 retail tools registered on the live tool bus as thin proxies to the fidelity-checked
//     Node environment (page.exposeFunction → invokeTool; DB state lives in Node),
//   - by default the notebook file tools are unregistered so the tool surface matches the baseline
//     arm (pass --keep-tools to test the full surface),
//   - each user-simulator message = one session.send turn; the turn's final assistant text (the
//     task_complete summary) is the reply to the user. '###STOP###' ends the conversation.
// Grading identical to run-baseline.mjs: final-state delta vs Python oracle + required outputs.
//   node run-agent.mjs [--limit N] [--offset N] [--tasks 1,5,9] [--model m] [--user-model m]
//                      [--notebook path] [--json out] [--headed] [--keep-tools]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { loadData, invokeTool, grade, userSimSystemPrompt } from "./retail-env.mjs";
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
const jsonOut = flag("--json", join(here, "results", `agent-${taskSel ? "sel" : offset + "-" + (offset + limit)}.json`));
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

async function setupRetail(page, toolsInfo, wiki, keepTools) {
  await page.evaluate(async ({ toolsInfo, wiki, keepTools }) => {
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
  }, { toolsInfo, wiki, keepTools });
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
    let reply = "";
    for (const m of msgs) if (m.role === "assistant" && typeof m.content === "string" && m.content.trim()) reply = m.content;
    return { reply, steps: turn?.steps ?? null, finishReason: turn?.finishReason ?? null };
  }, { userMsg, timeoutMs });
}

async function userSim(simMessages) {
  const r = await chat(simMessages, { model: userModel, max_tokens: 4000 });
  const text = (r.content || "").trim();
  simMessages.push({ role: "assistant", content: text });
  return text;
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
  const agentReplies = [];
  let rec = { idx: task.idx };
  let context = null;
  try {
    const booted = await bootPage(browser, (name, kwargs) => {
      const obs = invokeTool(data, name, kwargs);
      trajectory.push({ tool: name, kwargs, obs: String(obs).slice(0, 400) });
      return obs;
    });
    context = booted.context;
    await setupRetail(booted.page, TOOLS_INFO, WIKI, keepTools);

    const simMessages = [
      { role: "system", content: userSimSystemPrompt(task.instruction) },
      { role: "user", content: "Hi! How can I help you today?" },
    ];
    let userMsg = await userSim(simMessages);
    trajectory.push({ user: userMsg });
    let totalSteps = 0;
    for (let ex = 0; ex < MAX_EXCHANGES; ex++) {
      if (Date.now() - t0 > TASK_DEADLINE) throw new Error("task deadline exceeded");
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
      const reply = turn.reply || "(no reply)";
      agentReplies.push(reply);
      trajectory.push({ agent: reply, steps: turn.steps, finishReason: turn.finishReason });
      simMessages.push({ role: "user", content: reply });
      userMsg = await userSim(simMessages);
      trajectory.push({ user: userMsg });
      if (userMsg.includes("###STOP###")) break;
    }
    const g = grade(task, initial, data, agentReplies);
    rec = { idx: task.idx, reward: g.reward, r_actions: g.r_actions, r_outputs: g.r_outputs, missing: g.missing, steps: totalSteps, trajectory };
  } catch (e) {
    const g = grade(task, initial, data, agentReplies);
    rec = { idx: task.idx, reward: g.reward, r_actions: g.r_actions, r_outputs: g.r_outputs, error: String(e && e.message).slice(0, 300), trajectory };
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
mkdirSync(join(here, "results"), { recursive: true });
writeFileSync(jsonOut, JSON.stringify({ arm: keepTools ? "agent-fullsurface" : "agent", model, userModel, pass1: passed, total: results.length, results }, null, 1));
console.log("wrote", jsonOut);
