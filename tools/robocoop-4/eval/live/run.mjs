#!/usr/bin/env node
// Live eval CLI for robocoop-4: drives the REAL notebook with a real OpenRouter model and scores the
// resulting world state with deterministic criteria. See ./CONTRACT.md.
//   bun tools/robocoop-4/eval/live/run.mjs [--only <id>] [--category <cat>] [--model <m>]
//       [--timeout <ms>] [--headed] [--json <path>] [--fail-under <0..1>] [--notebook <path>]

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { createDriver } from './driver.mjs';
import { EVALS } from './evals.mjs';
import { scoreEval, toGepaRecord } from './score.mjs';

const here = dirname(fileURLToPath(import.meta.url)); // .../tools/robocoop-4/eval/live
const repoRoot = join(here, '..', '..', '..', '..'); // .../lopecode-dev

// Minimal .env loader (matches tools/robocoop-4/eval/run-eval.mjs). Existing process.env wins; later
// files don't override earlier ones. Search order: tools/robocoop-4/.env then repo-root .env.
function loadEnv() {
  const candidates = [join(here, '..', '..', '.env'), join(repoRoot, '.env')];
  for (const file of candidates) {
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    for (const line of text.split('\n')) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      const eq = s.indexOf('=');
      if (eq < 0) continue;
      const key = s.slice(0, eq).trim();
      let val = s.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (key && !(key in process.env)) process.env[key] = val;
    }
  }
}
loadEnv();

function parseArgs(argv) {
  const flags = {
    only: null, ids: null, category: null, model: null, timeout: null,
    headed: false, json: null, failUnder: 0, notebook: null, legacyNoToolGate: false,
    toolSurface: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--only': flags.only = argv[++i]; break;
      case '--ids': flags.ids = argv[++i].split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--category': flags.category = argv[++i]; break;
      case '--model': flags.model = argv[++i]; break;
      case '--timeout': flags.timeout = Number(argv[++i]); break;
      case '--headed': flags.headed = true; break;
      case '--json': flags.json = argv[++i]; break;
      case '--fail-under': flags.failUnder = Number(argv[++i]); break;
      case '--notebook': flags.notebook = argv[++i]; break;
      // For historical/foreign builds that predate the Claude-shaped file tools (e.g. the bash-only
      // BEFORE build in the A/B): don't wait for read_file to register before sending — that build has
      // no such tool, so the default gate would time out. Outcome criteria still apply; tool-presence
      // criteria (tool_used edit_file …) are expected to score 0 by construction.
      case '--legacy-no-tool-gate': flags.legacyNoToolGate = true; break;
      // Off-distribution arm: replace bash + Read/Write/Edit with the structured runtime API
      // (create_module/define_variable/delete_variable/list_variables/eval_code). Measures the on- vs
      // off-distribution "cliff". Tool-presence criteria for bash/edit_file will score 0 by construction.
      case '--tool-surface': flags.toolSurface = argv[++i]; break;
      default: console.error(`unknown flag: ${a}`); process.exit(2);
    }
  }
  return flags;
}

function statusLabel(scored) {
  if (scored.aggregate >= 0.999) return 'PASS';
  if (scored.aggregate <= 0.001) return 'FAIL';
  return 'PART';
}

async function main(argv) {
  const flags = parseArgs(argv);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not set. Add it to tools/robocoop-4/.env or repo-root .env, ' +
      'or pass it inline: OPENROUTER_API_KEY=... bun tools/robocoop-4/eval/live/run.mjs');
    return 2;
  }

  const model = flags.model || process.env.OPENROUTER_MODEL || 'xiaomi/mimo-v2.5-pro';
  const notebookPath = flags.notebook
    ? resolve(flags.notebook)
    : join(repoRoot, 'lopebooks', 'notebooks', '@tomlarkworthy_robocoop-4.html');
  const jsonPath = flags.json
    ? resolve(flags.json)
    : join(here, 'results', 'latest.json');

  let evals = EVALS;
  if (flags.only) evals = evals.filter((e) => e.id === flags.only);
  if (flags.ids) evals = evals.filter((e) => flags.ids.includes(e.id));
  if (flags.category) evals = evals.filter((e) => e.category === flags.category);
  if (evals.length === 0) {
    console.error('no evals matched the given filters');
    return 2;
  }

  console.log(`model:    ${model}`);
  console.log(`notebook: ${notebookPath}`);
  console.log(`evals:    ${evals.length}\n`);

  const driverOpts = { notebookPath, apiKey, model, headed: flags.headed, legacyNoToolGate: flags.legacyNoToolGate, toolSurface: flags.toolSurface };
  if (flags.toolSurface) console.log(`surface:  ${flags.toolSurface} (off-distribution)`);
  if (flags.timeout) driverOpts.timeoutMs = flags.timeout;
  const driver = await createDriver(driverOpts);

  const scoredAll = [];
  const gepa = [];
  try {
    for (const evalDef of evals) {
      let snapshot;
      // Transient failures (empty turn, network "Failed to fetch", boot/timeout race) are NOT eval
      // signal — retry up to 3 attempts before accepting a failed run.
      const MAX_ATTEMPTS = 3;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          snapshot = await driver.runQuestion(evalDef);
        } catch (err) {
          // Driver-level failure: synthesize a failed snapshot so scoring still produces a row.
          snapshot = {
            ok: false, error: String(err && err.message ? err.message : err),
            question: evalDef.question, model, durationMs: 0, steps: 0, finishReason: null,
            conversation: [], toolCalls: [], files: {}, modules: {}, errors: [], console: [],
          };
        }
        if (snapshot.ok !== false) break;
        // Quota/credit/auth errors (402/401/429-daily) won't clear on retry — fail fast.
        if (/\b(402|401)\b|insufficient|requires more credits|daily limit|quota/i.test(snapshot.error || "")) {
          console.log(`  ✗ ${evalDef.id} non-retryable: ${String(snapshot.error).slice(0, 120)}`);
          break;
        }
        if (attempt < MAX_ATTEMPTS) {
          console.log(`  … ${evalDef.id} transient (${String(snapshot.error).slice(0, 120)}); retry ${attempt + 1}/${MAX_ATTEMPTS}`);
        }
      }
      const scored = scoreEval(evalDef, snapshot);
      scored.usage = snapshot.usage || null;   // token/cost usage for this eval (OpenRouter usage.cost in USD, incl. cachedTokens)
      scored.steps = snapshot.steps;
      scored.durationMs = snapshot.durationMs;  // wall-clock for the turn (driver-measured)
      scored.finishReason = snapshot.finishReason ?? null;
      // Persist the full transcript — prompt optimization (and any wander/step-count analysis) needs to see
      // HOW the agent worked, not just the final scores. Without it the GEPA records can't reflect on actions.
      scored.transcript = {
        conversation: snapshot.conversation || [],
        toolCalls: snapshot.toolCalls || [],
        errors: snapshot.errors || [],
        consoleEvents: snapshot.console || [],
      };
      scoredAll.push(scored);
      gepa.push(toGepaRecord(scored, snapshot));
      console.log(
        `${statusLabel(scored)}  ${scored.id}  ${scored.aggregate.toFixed(2)}  ` +
        `steps=${snapshot.steps}  (${scored.passed}/${scored.total})`,
      );
    }
  } finally {
    await driver.close();
  }

  const out = { model, when: new Date().toISOString(), evals: scoredAll, gepa };
  mkdirSync(dirname(jsonPath), { recursive: true });
  // Transcripts/console can echo the key; redact any OpenRouter token before persisting.
  const redact = (s) => {
    let r = s.replace(/sk-or-[A-Za-z0-9-]{8,}/g, "sk-or-REDACTED");
    if (apiKey) r = r.split(apiKey).join("sk-or-REDACTED");
    return r;
  };
  writeFileSync(jsonPath, redact(JSON.stringify(out, null, 2)));
  console.log(`\nwrote ${jsonPath}`);

  const mean = scoredAll.reduce((s, e) => s + e.aggregate, 0) / scoredAll.length;
  console.log(`mean aggregate: ${mean.toFixed(2)} over ${scoredAll.length} eval(s)`);
  const costUSD = scoredAll.reduce((s, e) => s + (e.usage?.costUSD || 0), 0);
  const calls = scoredAll.reduce((s, e) => s + (e.usage?.calls || 0), 0);
  const promptTok = scoredAll.reduce((s, e) => s + (e.usage?.promptTokens || 0), 0);
  const cachedTok = scoredAll.reduce((s, e) => s + (e.usage?.cachedTokens || 0), 0);
  const totalMs = scoredAll.reduce((s, e) => s + (e.durationMs || 0), 0);
  const hitRate = promptTok ? ((cachedTok / promptTok) * 100).toFixed(0) : "0";
  console.log(`suite cost: $${costUSD.toFixed(4)} over ${calls} call(s)`);
  console.log(`prompt tokens: ${promptTok} (${cachedTok} cached, ${hitRate}% hit)  ·  wall-clock: ${(totalMs / 1000).toFixed(1)}s`);

  const allPass = scoredAll.every((e) => e.aggregate >= flags.failUnder);
  return allPass ? 0 : 1;
}

const code = await main(process.argv.slice(2));
process.exit(code);
