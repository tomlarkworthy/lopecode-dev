#!/usr/bin/env node
// Arm A — raw model on the aider-polyglot JS subset, two-attempt protocol (aider's pass@2):
// attempt 1 from instructions + stub; on failure, attempt 2 sees the jest output. No agent harness.
//   node run-baseline.mjs [--limit N] [--offset N] [--model m] [--json out] [--concurrency N]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { criterionStamp, fileHash } from "../../../robocoop-eval/stamp.mjs";
import { gradeSolution } from "./grade.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function loadKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  for (const f of [join(here, "..", "..", "..", "robocoop-4", ".env"), join(here, "..", "..", "..", "..", ".env")]) {
    try {
      const m = /^OPENROUTER_API_KEY=(.*)$/m.exec(readFileSync(f, "utf8"));
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch {}
  }
  throw new Error("OPENROUTER_API_KEY not found");
}

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const limit = Number(flag("--limit", 49));
const offset = Number(flag("--offset", 0));
const model = flag("--model", "xiaomi/mimo-v2.5-pro"); // NEVER read OPENROUTER_MODEL — evals are mimo
const jsonOut = flag("--json", join(here, "results", `baseline-${offset}-${offset + limit}.json`));
const concurrency = Number(flag("--concurrency", 2));

const key = loadKey();
const problems = JSON.parse(readFileSync(join(here, "problems.json"), "utf8")).slice(offset, offset + limit);
console.log(`model: ${model}  problems: ${problems.length} (offset ${offset})`);

// Criterion identity (plan/rqgm-and-robocoop-5.md, U2), same shape as the agent arm's. The two arms
// share the axes that define the TASK — problem set and grader — and differ on the axes that define
// the ARM: this one runs no notebook (coreModuleHashes null) and its own runner protocol.
const stamp = criterionStamp({
  notebookPath: null,
  extra: {
    runnerPath: fileURLToPath(import.meta.url),
    problemsJsonHash: fileHash(join(here, "problems.json")),
    graderHash: fileHash(join(here, "grade.mjs")),
  },
});

function extractCode(text) {
  const blocks = [...text.matchAll(/```(?:js|javascript)?\n([\s\S]*?)```/g)].map((m) => m[1]);
  if (blocks.length) return blocks[blocks.length - 1];
  return text;
}

async function chat(messages) {
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt + Math.random() * 1000));
    try {
      // STREAMING is load-bearing here: the sandbox's egress proxy kills connections idle ~200s, and a
      // non-streaming completion looks idle for the whole generation. SSE chunks keep it alive.
      // AbortSignal.timeout is the overall ceiling; a dead stream stalls the reader and hits it too.
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        // default temperature: temp 0 sends reasoning models into degenerate never-ending think loops
        // stream_options.include_usage: the final SSE chunk carries token counts and OpenRouter's own
        // cost, so the raw arm can be charged on the ladder's cost axis like the agent arm.
        body: JSON.stringify({ model, messages, max_tokens: 30000, stream: true, stream_options: { include_usage: true } }),
        signal: AbortSignal.timeout(900000),
      });
      if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", content = "", sawChunk = false, rawUsage = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            if (j.usage) rawUsage = j.usage;
            const delta = j.choices?.[0]?.delta;
            if (delta?.content) { content += delta.content; sawChunk = true; }
            if (delta?.reasoning != null) sawChunk = true;
          } catch {}
        }
      }
      if (!sawChunk || !content) throw new Error("empty streamed completion");
      return { content, usage: normUsage(rawUsage) };
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// OpenRouter usage blob → the field names eval/ladder.mjs reads. One call per attempt in this arm.
function normUsage(u) {
  if (!u) return null;
  return {
    promptTokens: u.prompt_tokens ?? 0,
    completionTokens: u.completion_tokens ?? 0,
    cachedTokens: u.prompt_tokens_details?.cached_tokens ?? 0,
    costUSD: u.cost != null ? Number(u.cost) : null,
    calls: 1,
  };
}

// Aider's instructions_addendum (benchmark/benchmark.py), appended to the exercise instructions in
// every official run. Both arms get it verbatim (run-agent.mjs has the same text bound to its paths).
const addendum = (p) =>
  `\n\n####\n\nUse the above instructions to modify the supplied files: ${p.solutionFile}\n` +
  "Don't change the names of existing functions or classes, as they may be referenced from other " +
  "code like unit tests, etc.\n" +
  "Only use standard libraries, don't suggest installing any packages.";

function firstPrompt(p) {
  // grep is a COMMAND-LINE exercise: its spec spawns `node grep.js …` and compares stdout/stderr, so
  // "keep the module style of the skeleton" would be actively wrong. The agent arm gets the same
  // framing (it has to carry the program as a cell string) — the hint is symmetric across arms.
  const shape = p.slug === "grep"
    ? "This exercise is a COMMAND-LINE program: the official tests run `node grep.js <flags> <pattern> " +
      "<files...>` and compare stdout/stderr. Reply with the COMPLETE contents of grep.js as a plain " +
      "CommonJS script (it reads process.argv, reads files with require('fs'), and console.logs matching " +
      "lines) — it must NOT export anything."
    : "Keep the same export names and module style (ES module exports) as the skeleton.";
  return (
    `# Exercise: ${p.slug}\n\n${p.instructions}${addendum(p)}\n\n` +
    `# Skeleton file ${p.solutionFile}\n\n\`\`\`js\n${p.stub}\n\`\`\`\n\n` +
    `Implement the exercise. Reply with the COMPLETE contents of ${p.solutionFile} in a single ` +
    "```js code block. " + shape + " No explanation."
  );
}

const results = [];
let i = 0;
async function worker() {
  while (i < problems.length) {
    const idx = i++;
    const p = problems[idx];
    const started = Date.now();
    let rec = { slug: p.slug, pass1: false, pass2: false, error: null };
    try {
      const messages = [
        { role: "system", content: "You are an expert JavaScript programmer solving an Exercism exercise." },
        { role: "user", content: firstPrompt(p) },
      ];
      const r1 = await chat(messages);
      const reply1 = r1.content;
      rec.usage1 = r1.usage;
      const cand1 = extractCode(reply1);
      const g1 = gradeSolution(p, cand1, { mode: "esm" });
      rec.pass1 = g1.pass;
      rec.candidate1 = cand1;
      console.log(`  ..${p.slug} attempt1 ${g1.pass ? "pass" : "fail"} (${Math.round((Date.now() - started) / 1000)}s)`);
      if (!g1.pass) {
        messages.push({ role: "assistant", content: reply1 });
        messages.push({
          role: "user",
          content:
            // Uncut, like official aider (grade.mjs's 60000-char guard is the only ceiling).
            "Your solution fails the official test suite. Test output:\n\n```\n" +
            g1.output +
            "\n```\n\nFix the solution. Reply with the COMPLETE corrected contents of " +
            p.solutionFile + " in a single ```js code block. No explanation.",
        });
        const r2 = await chat(messages);
        const reply2 = r2.content;
        rec.usage2 = r2.usage;
        const cand2 = extractCode(reply2);
        const g2 = gradeSolution(p, cand2, { mode: "esm" });
        rec.pass2 = g2.pass;
        rec.candidate2 = cand2;
        rec.error = g2.pass ? null : g2.output.slice(0, 1500);
      } else {
        rec.pass2 = true;
      }
    } catch (e) { rec.error = e.message; }
    rec.durationMs = Date.now() - started;
    results[idx] = rec;
    console.log(`${rec.pass2 ? "PASS" : "FAIL"}${rec.pass1 ? "@1" : rec.pass2 ? "@2" : "  "}  ${p.slug}  (${Math.round(rec.durationMs / 1000)}s)`);
    mkdirSync(join(here, "results"), { recursive: true });
    writeFileSync(jsonOut, JSON.stringify({ arm: "baseline", model, stamp, offset, limit, results: results.filter(Boolean) }, null, 1));
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

const p1 = results.filter((r) => r.pass1).length, p2 = results.filter((r) => r.pass2).length;
console.log(`\npass@1: ${p1}/${results.length} = ${(p1 / results.length).toFixed(3)}`);
console.log(`pass@2: ${p2}/${results.length} = ${(p2 / results.length).toFixed(3)}`);
writeFileSync(jsonOut, JSON.stringify({ arm: "baseline", model, stamp, offset, limit, pass1: p1, pass2: p2, total: results.length, results }, null, 1));
console.log("wrote", jsonOut);
