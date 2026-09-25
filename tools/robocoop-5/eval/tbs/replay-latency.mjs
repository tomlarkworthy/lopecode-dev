#!/usr/bin/env node
// Measure whether mimo-2.6-flash's slow agent steps come from the OpenRouter
// provider, by replaying the exact request prefix the agent sent right before
// two observed long waits, against different provider routings.
//
// The trajectory JSON has no `tools` schema attached (checked: its top-level
// keys are slug/turn/model/capturedAt/question/seedPaths/conversation/
// toolCalls/toolTimes/finishReason/usage/steps/error/artifacts/pass/
// verifierTail/console/srcFiles/filesError/seedFailures/ledgerRestored/
// ledgerEntries/attestRestored/attestEntries/coreStatus/fetches — no `tools`
// key). The live tool schema is assembled by a `toolsView` reactive box
// inside the running notebook (see driver-core.mjs), not serialized anywhere
// static, so it can't be reconstructed offline. Per the task's fallback, we
// send the prefix with NO `tools` field and max_tokens 200: we are timing
// time-to-first-token of the model on this context, not full agent behavior.
//
// Usage: node replay-latency.mjs [path/to/trajectory.json]

import { readFileSync } from "node:fs";
import path from "node:path";

const ENV_PATH = "/Users/tom.larkworthy/dev/lopecode-dev/tools/robocoop-4/.env";
const TRAJ_PATH = path.resolve(
  process.argv[2] ||
    "trajectories/walk-20260924aj-variable-star-vetting/variable-star-vetting-1.json"
);
const CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 600_000;
const MAX_TOKENS = 200;
const BUDGET_USD = 0.5;

function loadApiKey() {
  const env = readFileSync(ENV_PATH, "utf8");
  const m = env.match(/^OPENROUTER_API_KEY=(.*)$/m);
  if (!m || !m[1].trim()) {
    throw new Error(`OPENROUTER_API_KEY not found in ${ENV_PATH}`);
  }
  return m[1].trim();
}

function loadPrefixes() {
  const traj = JSON.parse(readFileSync(TRAJ_PATH, "utf8"));
  const conv = traj.conversation;
  if (!Array.isArray(conv)) throw new Error("trajectory has no conversation array");

  // Step boundaries for this trajectory (verified by hand against
  // toolTimes/toolCalls): assistant tool_calls messages sit at conversation
  // indices 4 (step1: read_file,read_file,glob), 9 (step2: write_file),
  // 11 (step3: edit_file x2), 15 (step4: eval_js), 18 (step5: edit_file x4).
  // "Prefix before step N" = conversation truncated to include the tool
  // result(s) of step N-1, per the task's instruction — this deliberately
  // excludes any harness-injected message (e.g. a "TIME CHECK" nudge) that
  // may also have preceded the real step-N request; see report.
  const beforeStep2 = conv.slice(0, 8); // through tool results of step 1 (idx 5-7)
  const beforeStep5 = conv.slice(0, 17); // through tool result of step 4 (idx 16)

  return {
    "before-step2 (write_file@196670ms, 136s wait)": beforeStep2,
    "before-step5 (eval_js@320718ms, 559s wait)": beforeStep5,
  };
}

function approxTokens(messages) {
  let chars = 0;
  for (const m of messages) {
    chars += (m.content || "").length;
    for (const tc of m.tool_calls || []) chars += JSON.stringify(tc).length;
  }
  return Math.round(chars / 4);
}

async function runOnce(apiKey, messages, { model, provider, reasoning }) {
  const body = {
    model,
    messages,
    max_tokens: MAX_TOKENS,
    stream: true,
    usage: { include: true },
  };
  if (provider) body.provider = provider;
  if (reasoning) body.reasoning = reasoning;

  const t0 = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === "AbortError") {
      return { timedOut: true, ttft: null, total: (performance.now() - t0) / 1000 };
    }
    return { error: String(e), ttft: null, total: (performance.now() - t0) / 1000 };
  }

  if (!res.ok || !res.body) {
    clearTimeout(timer);
    const text = await res.text().catch(() => "");
    return { error: `HTTP ${res.status}: ${text.slice(0, 300)}`, ttft: null, total: (performance.now() - t0) / 1000 };
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let ttft = null;
  let provName = null;
  let usage = null;
  let rejected = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        let chunk;
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }
        if (chunk.error) rejected = JSON.stringify(chunk.error).slice(0, 300);
        if (chunk.provider && !provName) provName = chunk.provider;
        const delta = chunk.choices?.[0]?.delta;
        if (ttft === null && delta && ((delta.content && delta.content.length) || (delta.reasoning && delta.reasoning.length))) {
          ttft = (performance.now() - t0) / 1000;
        }
        if (chunk.usage) usage = chunk.usage;
      }
    }
  } catch (e) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      return { timedOut: true, ttft, total: (performance.now() - t0) / 1000, provider: provName };
    }
    return { error: String(e), ttft, total: (performance.now() - t0) / 1000, provider: provName };
  }
  clearTimeout(timer);

  const total = (performance.now() - t0) / 1000;
  return {
    ttft,
    total,
    provider: provName,
    promptTokens: usage?.prompt_tokens ?? null,
    cost: usage?.cost ?? null,
    rejected,
  };
}

function fmt(n, d = 2) {
  return n === null || n === undefined ? "-" : Number(n).toFixed(d);
}

async function main() {
  const apiKey = loadApiKey();
  const prefixes = loadPrefixes();

  for (const [label, msgs] of Object.entries(prefixes)) {
    console.log(`# ${label}: ${msgs.length} messages, ~${approxTokens(msgs)} approx tokens`);
  }
  console.log(
    "# tools field: OMITTED (no tools schema in the trajectory JSON; the toolsView box that builds it lives inside the live notebook runtime, not serialized to disk). Timing time-to-first-token on the raw context only.\n"
  );

  const variants = [
    { key: "a", label: "default routing", model: "xiaomi/mimo-v2.6-flash", provider: undefined, reasoning: undefined, repeats: 2 },
    { key: "b", label: "provider=DeepInfra", model: "xiaomi/mimo-v2.6-flash", provider: { order: ["DeepInfra"], allow_fallbacks: false }, reasoning: undefined, repeats: 2 },
    { key: "c", label: "provider=Xiaomi", model: "xiaomi/mimo-v2.6-flash", provider: { order: ["Xiaomi"], allow_fallbacks: false }, reasoning: undefined, repeats: 2 },
    { key: "d", label: "2.5-pro control, default routing", model: "xiaomi/mimo-v2.5-pro", provider: undefined, reasoning: undefined, repeats: 1 },
    { key: "e", label: "2.6-flash, reasoning disabled, default routing", model: "xiaomi/mimo-v2.6-flash", provider: undefined, reasoning: { enabled: false }, repeats: 1 },
  ];

  const rows = [];
  let spend = 0;

  for (const [prefixLabel, msgs] of Object.entries(prefixes)) {
    for (const v of variants) {
      for (let i = 0; i < v.repeats; i++) {
        if (spend >= BUDGET_USD) {
          console.log(`# BUDGET STOP: cumulative spend $${spend.toFixed(4)} >= $${BUDGET_USD}; skipping remaining runs`);
          printTable(rows);
          return;
        }
        const runLabel = `${v.key}${v.repeats > 1 ? `#${i + 1}` : ""} ${v.label}`;
        process.stderr.write(`running: ${runLabel} | ${prefixLabel} ... `);
        const r = await runOnce(apiKey, msgs, { model: v.model, provider: v.provider, reasoning: v.reasoning });
        if (typeof r.cost === "number") spend += r.cost;
        process.stderr.write(
          r.timedOut
            ? "TIMEOUT\n"
            : r.error
            ? `ERROR ${r.error}\n`
            : `ttft=${fmt(r.ttft)}s total=${fmt(r.total)}s provider=${r.provider} cost=$${fmt(r.cost, 5)}\n`
        );
        rows.push({ variant: runLabel, model: v.model, prefix: prefixLabel, ...r });
      }
    }
  }

  console.log(`\n# cumulative spend: $${spend.toFixed(4)}`);
  printTable(rows);
}

function printTable(rows) {
  console.log("\n| variant | prefix | TTFT (s) | total (s) | provider | prompt tokens | cost ($) |");
  console.log("|---|---|---|---|---|---|---|");
  for (const r of rows) {
    const status = r.timedOut ? "TIMEOUT" : r.rejected ? `REJECTED: ${r.rejected}` : r.error ? `ERROR: ${r.error}` : "";
    console.log(
      `| ${r.variant} (${r.model}) | ${r.prefix} | ${status || fmt(r.ttft)} | ${fmt(r.total)} | ${r.provider ?? "-"} | ${r.promptTokens ?? "-"} | ${fmt(r.cost, 5)} |`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
