// U3 step 2 — measure held-out agreement between candidate reviewer prompts and the test verdict.
// A MEASUREMENT ONLY: nothing here is wired into the gate. The deterministic criteria in
// tools/robocoop-4/eval/live/CONTRACT.md are untouched — the reviewer is a separate role
// (plan/rqgm-and-robocoop-5.md §U3).
//
//   node reviewer-measure.mjs [--corpus results/reviewer-corpus.json] [--cap 80]
//                             [--max-calls 240] [--max-cost 2.50] [--dry-run]
//
// One chat call per (held-out row × candidate prompt), temperature 0. Imported (not run) it exports
// the pure helpers the tests pin.

import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { jeffreysInterval } from "../../../robocoop-eval/stats.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export const SPEC_LIMIT = 6000;
export const PATCH_LIMIT = 8000;
export const QUALITY_PASS_AT = 6;

// ── candidate reviewer prompts ──────────────────────────────────────────────

export const PROMPTS = [
  {
    name: "predict-tests",
    mode: "binary",
    system: [
      "You review a candidate solution against an exercise specification.",
      "Predict whether it passes the official test suite.",
      "Answer with a single word first, PASS or FAIL, then one sentence of reasoning.",
    ].join(" "),
  },
  {
    name: "spec-check",
    mode: "binary",
    system: [
      "You review a candidate solution against an exercise specification, as a checklist.",
      "Work through these checks in order, one short line each:",
      "1. Export contract — does the code export every name the spec requires, with the required",
      "default export if one is named? An extra or missing export is a failure.",
      "2. Examples — for every literal example in the spec, trace the code on that input and compare",
      "its result to the stated result, including thrown errors and their messages.",
      "3. Signatures and types — do the argument counts, argument order, and returned shapes match",
      "what the examples imply (array vs object vs string, class vs function, method vs property)?",
      "4. Edge cases the spec states explicitly (empty input, invalid input, boundaries).",
      "Then output a final line: VERDICT: PASS if every check passes, otherwise VERDICT: FAIL.",
      "Judge only against the specification — do not fail code for style.",
    ].join(" "),
  },
  {
    name: "code-quality",
    mode: "score",
    system: [
      "You are a code quality reviewer. Score a candidate solution against its exercise",
      "specification on a 0-10 scale, where 10 is production quality and 0 is unusable.",
      "Weight the criteria in this order, correctness risk highest:",
      "correctness against the specification and its examples (half the weight);",
      "completeness of the required interface (exports, signatures, edge cases);",
      "robustness (error handling, boundaries);",
      "then clarity and structure (lowest weight).",
      "Output a first line of exactly `SCORE: <n>` with n an integer 0-10, then at most three",
      "sentences justifying it, naming the single largest correctness risk you found.",
    ].join(" "),
  },
];

// ── prompt assembly + verdict parsing ───────────────────────────────────────

export function truncate(text, limit) {
  const s = String(text ?? "");
  return s.length > limit ? { text: s.slice(0, limit), truncated: true } : { text: s, truncated: false };
}

export function buildUserMessage(spec, patch) {
  const s = truncate(spec, SPEC_LIMIT), p = truncate(patch, PATCH_LIMIT);
  const body = [
    "## Exercise specification",
    s.text + (s.truncated ? "\n…[specification truncated]" : ""),
    "",
    "## Candidate solution",
    "```javascript",
    p.text + (p.truncated ? "\n…[solution truncated]" : ""),
    "```",
  ].join("\n");
  return { content: body, specTruncated: s.truncated, patchTruncated: p.truncated };
}

// Binary prompts: an explicit `VERDICT: PASS|FAIL` line wins if the model wrote one, otherwise the
// first bare PASS/FAIL token. The precedence matters — spec-check's per-check lines each carry a
// PASS/FAIL of their own, so first-token parsing would read check 1 as the verdict. When several
// VERDICT lines appear the last is taken (a restated conclusion is the conclusion). Score prompts
// are read as a number and mapped at QUALITY_PASS_AT. Anything unreadable returns verdict null —
// counted as a disagreement, never quietly dropped.
export function parseVerdict(text, mode = "binary") {
  const raw = String(text ?? "");
  if (mode === "score") {
    let m = /SCORE\s*[:=]?\s*(\d+(?:\.\d+)?)/i.exec(raw)
      || /\b(\d+(?:\.\d+)?)\s*\/\s*10\b/.exec(raw)
      || /^\W*(\d+(?:\.\d+)?)\b/.exec(raw);
    if (!m) return { verdict: null, score: null };
    const score = Number(m[1]);
    if (!Number.isFinite(score) || score < 0 || score > 10) return { verdict: null, score: null };
    return { verdict: score >= QUALITY_PASS_AT ? "pass" : "fail", score };
  }
  const verdicts = [...raw.matchAll(/VERDICT\s*[:=\-—]*\s*\**\s*(PASS|FAIL)\b/gi)];
  if (verdicts.length) return { verdict: verdicts[verdicts.length - 1][1].toLowerCase(), score: null };
  const m = /\b(PASS|FAIL)\b/i.exec(raw);
  if (!m) return { verdict: null, score: null };
  return { verdict: m[1].toLowerCase(), score: null };
}

export function firstLine(text) {
  return String(text ?? "").split("\n").map((l) => l.trim()).find((l) => l.length) || "";
}

// ── sampling + stats ────────────────────────────────────────────────────────

// Deterministic subsample: sort by slug then source, take the first `cap`.
export function subsample(rows, cap) {
  const sorted = [...rows].sort((a, b) =>
    a.slug.localeCompare(b.slug) || a.source.localeCompare(b.source) || String(a.file).localeCompare(String(b.file)));
  return cap != null && sorted.length > cap ? sorted.slice(0, cap) : sorted;
}

const band = (s, f) => { const { lower, upper } = jeffreysInterval(s, f, 0.95); return [lower, upper]; };

// Infra failures are excluded from every count — an API error is not evidence about a reviewer.
export function agreementStats(records) {
  const scored = records.filter((r) => !r.infra);
  const agree = scored.filter((r) => r.predicted === r.truth).length;
  const fails = scored.filter((r) => r.truth === "fail");
  const passes = scored.filter((r) => r.truth === "pass");
  const tp = fails.filter((r) => r.predicted === "fail").length;
  const tn = passes.filter((r) => r.predicted === "pass").length;
  const n = scored.length;
  const usage = scored.reduce((a, r) => ({
    promptTokens: a.promptTokens + (r.usage?.promptTokens || 0),
    completionTokens: a.completionTokens + (r.usage?.completionTokens || 0),
    costUSD: a.costUSD + (r.usage?.costUSD || 0),
  }), { promptTokens: 0, completionTokens: 0, costUSD: 0 });
  return {
    n,
    agree,
    accuracy: n ? agree / n : null,
    accuracyBand: band(agree, n - agree),
    failN: fails.length,
    failDetected: tp,
    sensitivity: fails.length ? tp / fails.length : null,
    sensitivityBand: band(tp, fails.length - tp),
    passN: passes.length,
    passDetected: tn,
    specificity: passes.length ? tn / passes.length : null,
    specificityBand: band(tn, passes.length - tn),
    // Youden's J = sensitivity + specificity - 1. Prevalence-independent, and the one number no
    // constant reviewer can fake: always-PASS and always-FAIL both score exactly 0. J ≤ 0 means the
    // reviewer carries no usable information about the test outcome, whatever its accuracy.
    youdenJ: fails.length && passes.length ? tp / fails.length + tn / passes.length - 1 : null,
    baseRate: n ? passes.length / n : null,
    // The bar a reviewer has to clear is the better of the two constant reviewers, not the pass
    // rate alone: always-PASS scores baseRate, always-FAIL scores 1-baseRate (with sensitivity 1).
    // On a corpus where most patches fail, always-FAIL is the one to beat.
    alwaysPassAccuracy: n ? passes.length / n : null,
    alwaysFailAccuracy: n ? fails.length / n : null,
    majorityBaseline: n ? Math.max(passes.length, fails.length) / n : null,
    majorityLabel: passes.length >= fails.length ? "always-PASS" : "always-FAIL",
    predictedPassRate: n ? scored.filter((r) => r.predicted === "pass").length / n : null,
    unparseable: scored.filter((r) => r.predicted == null).length,
    infra: records.length - n,
    usage: { ...usage, blendedTokens: usage.promptTokens + 5 * usage.completionTokens },
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { chat } = await import("../tau/openrouter.mjs");
  const args = process.argv.slice(2);
  const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
  const corpusPath = flag("--corpus", join(here, "results", "reviewer-corpus.json"));
  const outPath = flag("--out", join(here, "results", "reviewer-agreement.json"));
  const cap = Number(flag("--cap", 80));
  const maxCalls = Number(flag("--max-calls", 240));
  const maxCost = Number(flag("--max-cost", 2.5));
  const concurrency = Number(flag("--concurrency", 4));
  const dryRun = args.includes("--dry-run");
  const reportOnly = args.includes("--report-only");
  // Every completed call is appended here immediately. The first attempt at this measurement lost
  // 70 calls when the machine slept mid-run and the in-memory records went with it; a resumable
  // ledger makes an interrupted run cost nothing.
  const recordsPath = flag("--records", join(here, "results", "reviewer-records.jsonl"));
  const priorCalls = Number(flag("--prior-calls", 0)); // calls already charged elsewhere, for the cap
  const maxSeconds = Number(flag("--max-seconds", 480)); // stop dispatching after this, then exit clean
  const MODEL = "xiaomi/mimo-v2.5-pro"; // pinned — NEVER read OPENROUTER_MODEL
  const ASSUMED_COST = 0.02; // per call, used only when the provider reports none

  const corpus = JSON.parse(readFileSync(corpusPath, "utf8"));
  const heldoutSlugs = new Set(corpus.split.heldout);
  const rows = subsample(corpus.rows.filter((r) => heldoutSlugs.has(r.slug)), cap);
  const problems = JSON.parse(readFileSync(join(here, "problems.json"), "utf8"));
  const specBySlug = new Map(problems.map((p) => [p.slug, p.instructions]));

  // Resume: anything already in the ledger is not re-called.
  const records = [];
  if (existsSync(recordsPath)) {
    for (const line of readFileSync(recordsPath, "utf8").split("\n")) {
      if (line.trim()) records.push(JSON.parse(line));
    }
  }
  const done = new Set(records.map((r) => `${r.prompt}|${r.file}`));

  const all = [];
  for (const prompt of PROMPTS) for (const row of rows) all.push({ prompt, row });
  const jobs = reportOnly ? [] : all.filter((j) => !done.has(`${j.prompt.name}|${j.row.file}`));
  const totalHeldout = corpus.rows.filter((r) => heldoutSlugs.has(r.slug)).length;
  console.log(`held-out rows ${rows.length} (of ${totalHeldout}) × ${PROMPTS.length} prompts = ${all.length} calls`);
  console.log(`already recorded ${records.length}, remaining ${jobs.length}, prior calls charged elsewhere ${priorCalls}`);
  const budgeted = priorCalls + records.length + jobs.length;
  if (budgeted > maxCalls) { console.error(`refusing: ${budgeted} calls exceeds --max-calls ${maxCalls}`); process.exit(1); }
  if (dryRun) { console.log("--dry-run: no model calls made"); process.exit(0); }

  let calls = 0, costUSD = records.reduce((a, r) => a + (r.usage?.costUSD || 0), 0), aborted = null;
  const deadline = Date.now() + maxSeconds * 1000;

  async function runJob({ prompt, row }) {
    if (aborted) return;
    const spec = specBySlug.get(row.slug);
    const user = buildUserMessage(spec ?? "", row.patch);
    let res = null, err = null;
    for (let attempt = 0; attempt < 3; attempt++) { // initial + 2 retries
      try {
        res = await chat(
          [{ role: "system", content: prompt.system }, { role: "user", content: user.content }],
          // mimo reasons before it answers and the reasoning is billed as completion, so 4000 cut
          // spec-check off mid-checklist (finish_reason "length", no VERDICT line) in the smoke run.
          { model: MODEL, temperature: 0, withUsage: true, max_tokens: 12000, timeoutMs: 300000 },
        );
        err = null;
        break;
      } catch (e) { err = String(e?.message || e); res = null; }
    }
    calls++;
    const u = res?.usage || null;
    const callCost = u?.cost != null ? Number(u.cost) : ASSUMED_COST;
    costUSD += callCost;
    if (costUSD > maxCost && !aborted) aborted = `cost cap: $${costUSD.toFixed(4)} > $${maxCost}`;

    const rec = {
      prompt: prompt.name, slug: row.slug, source: row.source, file: row.file,
      truth: row.verdict, specTruncated: user.specTruncated, patchTruncated: user.patchTruncated,
      specMissing: spec == null,
    };
    if (err) {
      Object.assign(rec, { infra: true, error: err, predicted: null, score: null, raw: null, usage: null });
    } else {
      const parsed = parseVerdict(res.content, prompt.mode);
      Object.assign(rec, {
        infra: false,
        finishReason: res.finish_reason || null,
        predicted: parsed.verdict,
        score: parsed.score,
        raw: firstLine(res.content),
        rawFull: String(res.content ?? "").slice(0, 2000), // every parse stays auditable

        usage: {
          promptTokens: u?.prompt_tokens ?? null,
          completionTokens: u?.completion_tokens ?? null,
          costUSD: u?.cost != null ? Number(u.cost) : null,
        },
      });
    }
    records.push(rec);
    appendFileSync(recordsPath, JSON.stringify(rec) + "\n"); // durable before the next call starts
    if (calls % 5 === 0) console.log(`  ${calls}/${jobs.length} this run, $${costUSD.toFixed(4)} cumulative`);
  }

  mkdirSync(dirname(recordsPath), { recursive: true });
  const queue = jobs.slice();
  let ranOut = false;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    for (;;) {
      if (Date.now() > deadline) { ranOut = true; break; }
      const job = queue.shift();
      if (!job || aborted) break;
      await runJob(job);
    }
  }));
  if (aborted) console.error(`ABORTED: ${aborted}`);
  const remaining = queue.length + (ranOut ? 0 : 0);
  if (remaining || ranOut) {
    console.log(`\n${calls} calls this run; ${queue.length} jobs still queued (time budget ${maxSeconds}s reached).`);
    console.log(`ledger: ${records.length} records in ${recordsPath} — re-run the same command to continue.`);
  }

  const perPrompt = {};
  for (const p of PROMPTS) perPrompt[p.name] = agreementStats(records.filter((r) => r.prompt === p.name));

  const doc = {
    generatedAt: new Date().toISOString(),
    model: MODEL, temperature: 0, corpus: corpusPath,
    heldoutRows: rows.length, promptsMeasured: PROMPTS.map((p) => ({ name: p.name, mode: p.mode, system: p.system })),
    qualityPassAt: QUALITY_PASS_AT,
    totals: {
      calls: records.length, callsThisRun: calls, priorCallsElsewhere: priorCalls, costUSD,
      costSource: records.some((r) => r.usage?.costUSD != null) ? "provider" : `assumed $${ASSUMED_COST}/call`,
      complete: queue.length === 0 && !aborted,
    },
    aborted,
    perPrompt,
    records,
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(doc, null, 1));

  const pct = (x) => (x == null ? "  n/a " : (100 * x).toFixed(1).padStart(5) + "%");
  const bandStr = (b) => `[${b[0].toFixed(3)}, ${b[1].toFixed(3)}]`;
  const pad = (s, n) => String(s).padEnd(n);
  const ref = perPrompt[PROMPTS[0].name];
  console.log(`\nheld-out agreement, ${rows.length} rows`);
  console.log(`base rate (truth = pass) ${pct(ref.baseRate)} — always-PASS scores ${pct(ref.alwaysPassAccuracy)},`);
  console.log(`always-FAIL scores ${pct(ref.alwaysFailAccuracy)} at 100.0% fail-sensitivity.`);
  console.log(`THE BAR IS THE BETTER CONSTANT REVIEWER: ${ref.majorityLabel} at ${pct(ref.majorityBaseline)}.`);
  console.log(`\n${pad("prompt", 15)} ${pad("n", 4)} ${pad("acc", 6)} ${pad("Jeffreys 95%", 18)} ${pad("vs always-PASS", 14)} ${pad("vs majority", 12)} ${pad("fail-sens", 9)} ${pad("Jeffreys 95%", 18)} ${pad("spec", 6)} ${pad("J", 7)} ${pad("unpars", 6)}`);
  const verdictVs = (acc, lo, bar) => (lo > bar ? "yes (band)" : acc > bar ? "point only" : "no");
  for (const p of PROMPTS) {
    const s = perPrompt[p.name];
    const j = s.youdenJ == null ? "  n/a " : (s.youdenJ >= 0 ? "+" : "") + s.youdenJ.toFixed(3);
    console.log(`${pad(p.name, 15)} ${pad(s.n, 4)} ${pct(s.accuracy)} ${pad(bandStr(s.accuracyBand), 18)} ${pad(verdictVs(s.accuracy, s.accuracyBand[0], s.alwaysPassAccuracy), 14)} ${pad(verdictVs(s.accuracy, s.accuracyBand[0], s.majorityBaseline), 12)} ${pct(s.sensitivity)} ${pad(bandStr(s.sensitivityBand), 18)} ${pct(s.specificity)} ${pad(j, 7)} ${pad(s.unparseable, 6)}`);
  }
  console.log(`\nJ = Youden's J (sensitivity + specificity - 1). Both constant reviewers score exactly 0,`);
  console.log(`so J is the discriminative signal that cannot be faked by guessing the majority class.`);
  console.log(`\nfail-sensitivity is the number U3 needs: a reviewer that cannot flag failing patches is`);
  console.log(`useless as a second utility, however high its accuracy. Note always-FAIL has 100%`);
  console.log(`fail-sensitivity for free, so sensitivity only counts when specificity is also above chance.`);
  console.log(`\n${pad("prompt", 15)} ${pad("prompt tok", 11)} ${pad("compl tok", 11)} ${pad("blended", 11)} ${pad("cost", 9)} ${pad("infra", 5)}`);
  for (const p of PROMPTS) {
    const s = perPrompt[p.name];
    console.log(`${pad(p.name, 15)} ${pad(s.usage.promptTokens, 11)} ${pad(s.usage.completionTokens, 11)} ${pad(s.usage.blendedTokens, 11)} ${pad("$" + s.usage.costUSD.toFixed(4), 9)} ${pad(s.infra, 5)}`);
  }
  console.log(`\ntotal ${records.length} recorded calls (${calls} this run, ${priorCalls} charged elsewhere), $${costUSD.toFixed(4)} (${doc.totals.costSource})`);
  console.log(`complete: ${doc.totals.complete}`);
  console.log(`wrote ${outPath}`);
}
