// Shared live-eval CLI for the robocoop harnesses. A thin per-harness run.mjs passes its config:
//   runEvalCli({ argv, evals, createDriver, defaultNotebook, resultsDir, envCandidates, extraFlags })
// Flags: [--only <id>] [--ids <a,b>] [--category <cat>] [--model <m>] [--timeout <ms>] [--headed]
//        [--json <path>] [--fail-under <0..1>] [--notebook <path>] [--concurrency <n>]
//        + any harness extraFlags (booleans).

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { scoreEval, toGepaRecord } from '../robocoop-4/eval/live/score.mjs';

// Minimal .env loader. Existing process.env wins; later files don't override earlier ones.
function loadEnv(candidates) {
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

function parseArgs(argv, extraFlags) {
  const flags = {
    only: null, ids: null, category: null, model: null, timeout: null,
    headed: false, json: null, failUnder: 0, notebook: null, concurrency: 1,
  };
  for (const f of extraFlags) flags[f.key] = false;
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
      case '--concurrency': flags.concurrency = Number(argv[++i]); break;
      default: {
        const extra = extraFlags.find((f) => f.flag === a);
        if (extra) { flags[extra.key] = true; break; }
        console.error(`unknown flag: ${a}`); process.exit(2);
      }
    }
  }
  return flags;
}

function statusLabel(scored) {
  if (scored.aggregate >= 0.999) return 'PASS';
  if (scored.aggregate <= 0.001) return 'FAIL';
  return 'PART';
}

export async function runEvalCli({ argv, evals: allEvals, createDriver, defaultNotebook, resultsDir, envCandidates = [], extraFlags = [] }) {
  loadEnv(envCandidates);
  const flags = parseArgs(argv, extraFlags);

  // Oracle runs never reach OpenRouter (the driver executes a scripted reference solution), so they
  // need no key — the placeholder only satisfies createDriver's argument check.
  const apiKey = process.env.OPENROUTER_API_KEY || (flags.oracle ? "oracle-no-key" : "");
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not set. Add it to a .env the harness searches, or pass it ' +
      'inline: OPENROUTER_API_KEY=... node run.mjs');
    return 2;
  }

  const model = flags.model || process.env.OPENROUTER_MODEL || 'xiaomi/mimo-v2.5-pro';
  const notebookPath = flags.notebook ? resolve(flags.notebook) : defaultNotebook;
  const jsonPath = flags.json ? resolve(flags.json) : join(resultsDir, 'latest.json');

  let evals = allEvals;
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

  const driverOpts = { notebookPath, apiKey, model, headed: flags.headed };
  for (const f of extraFlags) driverOpts[f.key] = flags[f.key];
  if (flags.timeout) driverOpts.timeoutMs = flags.timeout;
  const driver = await createDriver(driverOpts);

  const scoredAll = [];
  const gepa = [];
  // Transcripts/console can echo the key; redact any OpenRouter token before persisting.
  const redact = (t) => {
    let r = t.replace(/sk-or-[A-Za-z0-9-]{8,}/g, "sk-or-REDACTED");
    if (apiKey) r = r.split(apiKey).join("sk-or-REDACTED");
    return r;
  };
  const writePartial = (evalsOut, gepaOut) => {
    try {
      mkdirSync(dirname(jsonPath), { recursive: true });
      const out = { model, when: new Date().toISOString(), evals: evalsOut, gepa: gepaOut };
      writeFileSync(jsonPath, redact(JSON.stringify(out, null, 2)));
    } catch {}   // persistence must never take the run down
  };
  // Evals are INDEPENDENT (own browser context, own notebook boot, own fixtures), and a turn is ~100%
  // model latency — 2996s of per-eval duration measured against a 2996s wall clock on 2026-08-30, i.e.
  // the local machine idles through the whole run. So concurrency buys close to linear wall-clock at
  // almost no CPU cost. Default stays 1: sequential is the reproducible baseline, and the scored order
  // is restored below either way so results never depend on completion order.
  const CONCURRENCY = Math.max(1, Number(flags.concurrency) || 1);
  const runOne = async (evalDef) => {
      let snapshot;
      // Transient failures (empty turn, network "Failed to fetch", boot/timeout race) are NOT eval
      // signal — retry up to 3 attempts before accepting a failed run.
      const MAX_ATTEMPTS = 3;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          // HARD DEADLINE around the whole question, not just session.send. The turn timeout lives
          // inside page.evaluate; if the RENDERER wedges (a cell the agent wrote spinning, a crashed
          // page), page.evaluate never returns — Playwright puts no default timeout on it — and the
          // run hangs with no output. Observed 2026-08-30: a deepseek-v4-flash run sat 44min against a
          // 30min cap with OpenRouter usage flat to 9 decimal places, i.e. zero calls in flight.
          const deadlineMs = (flags.timeout || 180000) + 300000;
          let deadlineTimer;
          const deadline = new Promise((_, rej) => {
            deadlineTimer = setTimeout(
              () => rej(new Error(`eval wedged: no result within ${deadlineMs}ms (renderer hang?)`)),
              deadlineMs);
          });
          try {
            snapshot = await Promise.race([driver.runQuestion(evalDef), deadline]);
          } finally { clearTimeout(deadlineTimer); }
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
        // Nor does the TURN CAP: `session.send timed out after Nms` means the agent was still working
        // when --timeout expired, and an identical re-run expires identically. Measured 2026-08-30 on
        // xiaomi/mimo-v2.5: all 5 vendoring-patterns evals burned 3 attempts each this way, 1500s and
        // 120 OpenRouter calls for one run's worth of signal. Raise --timeout instead.
        if (/\b(402|401)\b|insufficient|requires more credits|daily limit|quota/i.test(snapshot.error || "")) {
          console.log(`  ✗ ${evalDef.id} non-retryable: ${String(snapshot.error).slice(0, 120)}`);
          break;
        }
        if (/session\.send timed out after \d+ms/.test(snapshot.error || "")) {
          console.log(`  ✗ ${evalDef.id} hit the turn cap (${String(snapshot.error).slice(0, 80)}) — not retried; raise --timeout`);
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
      // A turn-capped row IS scored (criteria.mjs grades the surviving world state) but the agent was
      // still working — mark it so the number is read as a lower bound, not a finished attempt.
      writePartial(scoredAll, gepa);   // a later wedge must not discard what already finished
      const capped = /session\.send timed out after \d+ms/.test(snapshot.error || "");
      console.log(
        `${statusLabel(scored)}  ${scored.id}  ${scored.aggregate.toFixed(2)}  ` +
        `steps=${snapshot.steps}  (${scored.passed}/${scored.total})${capped ? "  [turn cap — lower bound]" : ""}`,
      );
      // An oracle run scores the eval's own reference solution: anything below 1.00 is a BROKEN EVAL
      // (unsatisfiable criterion, drifted ground truth), so print the failing criteria immediately.
      if (flags.oracle) {
        for (const r of scored.results) if (!r.pass) console.log(`      ✗ [${r.name}] ${r.feedback}`);
      }
  };
  try {
    if (CONCURRENCY === 1) {
      for (const evalDef of evals) await runOne(evalDef);
    } else {
      console.log(`running ${evals.length} eval(s) ${CONCURRENCY} at a time`);
      const queue = [...evals];
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        for (let next = queue.shift(); next; next = queue.shift()) await runOne(next);
      }));
      // Completion order is nondeterministic under concurrency; report in the declared eval order.
      const rank = new Map(evals.map((e, i) => [e.id, i]));
      scoredAll.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
      gepa.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    }
  } finally {
    await driver.close();
  }

  writePartial(scoredAll, gepa);
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
