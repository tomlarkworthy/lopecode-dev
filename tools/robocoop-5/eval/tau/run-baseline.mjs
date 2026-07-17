#!/usr/bin/env node
// Arm A — raw model on tau-bench retail via native function calling, mirroring
// tau_bench.agents.tool_calling_agent exactly: system = wiki, ONE tool call per step (extras
// truncated), content-only message = reply to the LLM user simulator, '###STOP###' ends.
// Grading = final-state delta vs Python oracle + required outputs in agent replies.
//   node run-baseline.mjs [--limit N] [--offset N] [--tasks 1,5,9] [--model m] [--user-model m]
//                         [--concurrency N] [--json out]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadData, invokeTool, grade, userSimSystemPrompt } from "./retail-env.mjs";
import { chat } from "./openrouter.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const model = flag("--model", "xiaomi/mimo-v2.5-pro"); // NEVER read OPENROUTER_MODEL — evals are mimo
const userModel = flag("--user-model", "xiaomi/mimo-v2.5-pro");
const limit = Number(flag("--limit", 115));
const offset = Number(flag("--offset", 0));
const taskSel = flag("--tasks", null);
const concurrency = Number(flag("--concurrency", 2));
const jsonOut = flag("--json", join(here, "results", `baseline-${taskSel ? "sel" : offset + "-" + (offset + limit)}.json`));
const MAX_STEPS = 30; // tau-bench run.py default

const EXPORT = JSON.parse(readFileSync(join(here, "retail-export.json"), "utf8"));
const WIKI = EXPORT.wiki;
const TOOLS_INFO = EXPORT.tools_info;
let tasks = taskSel
  ? EXPORT.tasks.filter((t) => taskSel.split(",").map(Number).includes(t.idx))
  : EXPORT.tasks.slice(offset, offset + limit);
console.log(`model: ${model}  user-model: ${userModel}  tasks: ${tasks.length}`);

async function userSim(simMessages) {
  const r = await chat(simMessages, { model: userModel, max_tokens: 4000 });
  const text = (r.content || "").trim();
  simMessages.push({ role: "assistant", content: text });
  return text;
}

async function runTask(task) {
  const data = loadData();
  const initial = loadData();
  const agentReplies = [];
  const trajectory = [];
  const simMessages = [
    { role: "system", content: userSimSystemPrompt(task.instruction) },
    { role: "user", content: "Hi! How can I help you today?" },
  ];
  const firstUser = await userSim(simMessages);
  const messages = [
    { role: "system", content: WIKI },
    { role: "user", content: firstUser },
  ];
  trajectory.push({ user: firstUser });

  let steps = 0;
  for (; steps < MAX_STEPS; steps++) {
    const r = await chat(messages, { model, tools: TOOLS_INFO, max_tokens: 16000 });
    if (r.tool_calls) {
      const tc = r.tool_calls[0]; // official behavior: truncate to first
      let kwargs = {};
      let obs;
      try { kwargs = JSON.parse(tc.function.arguments || "{}"); } catch (e) { obs = `Error: invalid JSON arguments`; }
      if (obs === undefined) obs = invokeTool(data, tc.function.name, kwargs);
      messages.push(
        { role: "assistant", content: r.content, tool_calls: [tc] },
        { role: "tool", tool_call_id: tc.id, name: tc.function.name, content: obs },
      );
      trajectory.push({ tool: tc.function.name, kwargs, obs: String(obs).slice(0, 400) });
    } else {
      const reply = r.content || "";
      agentReplies.push(reply);
      trajectory.push({ agent: reply });
      simMessages.push({ role: "user", content: reply });
      const userMsg = await userSim(simMessages);
      trajectory.push({ user: userMsg });
      if (userMsg.includes("###STOP###")) break;
      messages.push({ role: "assistant", content: reply }, { role: "user", content: userMsg });
    }
  }
  const g = grade(task, initial, data, agentReplies);
  return { idx: task.idx, reward: g.reward, r_actions: g.r_actions, r_outputs: g.r_outputs, missing: g.missing, steps, trajectory };
}

const results = [];
let cursor = 0;
async function worker() {
  for (;;) {
    const i = cursor++;
    if (i >= tasks.length) return;
    const task = tasks[i];
    const t0 = Date.now();
    let rec;
    try {
      rec = await runTask(task);
    } catch (e) {
      rec = { idx: task.idx, reward: 0, error: String(e && e.message).slice(0, 300) };
    }
    rec.seconds = Math.round((Date.now() - t0) / 1000);
    results.push(rec);
    console.log(`${rec.reward ? "PASS" : "FAIL"}  task ${task.idx}  steps=${rec.steps ?? "-"} (${rec.seconds}s)${rec.error ? "  err=" + rec.error : rec.reward ? "" : `  r_actions=${rec.r_actions} r_outputs=${rec.r_outputs}`}`);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

results.sort((a, b) => a.idx - b.idx);
const passed = results.filter((r) => r.reward === 1).length;
console.log(`\npass@1: ${passed}/${results.length} = ${(passed / results.length).toFixed(3)}`);
mkdirSync(join(here, "results"), { recursive: true });
writeFileSync(jsonOut, JSON.stringify({ arm: "baseline", model, userModel, pass1: passed, total: results.length, results }, null, 1));
console.log("wrote", jsonOut);
