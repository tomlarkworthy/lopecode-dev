// EXPERIMENT: does instructing a non-thinking model to write its intent as markdown BEFORE each
// code step ("off-board thinking into the notebook") improve hard multi-step notebook builds?
//
// Design: 2 arms (control = base prompt; treatment = base + plan-first nudge) x N hard tasks x R reps,
// one model, live OpenRouter. Each run gets a fresh isolated InMemoryFs; runs execute concurrently
// (cap). Grading is partial-credit (plan-tasks.mjs). Reports per-arm mean score / pass-rate / steps
// and the treatment-minus-control delta, with raw per-run rows saved to JSON.
//
// SAFETY: touches nothing outside tools/robocoop-4/eval/. The treatment is only a prompt string here;
// the canonical robocoop-4 modules and the notebook are never modified.
//
// Run: OPENROUTER_API_KEY=$(grep -oP '(?<=^OPENROUTER_API_KEY=).*' tools/robocoop-4/.env) \
//        node tools/robocoop-4/eval/plan-experiment.mjs [--model google/gemini-2.5-flash] [--reps 3] [--conc 5] [--only id]

import { writeFileSync } from 'node:fs';
import { InMemoryFs } from '../../justbash-build/node_modules/just-bash/dist/bundle/index.js';
import { createNodeSession } from '../nodeSession.mjs';
import { createBashTool } from '../bashTool.mjs';
import { createAgentLoop } from '../agentLoop.mjs';
import { createOpenRouterClient } from '../openrouter.mjs';
import { systemPrompt, composeFooter } from '../systemPrompt.mjs';
import { planTasks } from './plan-tasks.mjs';

const args = (() => {
  const a = { model: 'google/gemini-2.5-flash', reps: 3, conc: 5, only: null, maxSteps: 25, arms: null, ts: String(Date.now()) };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '--model') a.model = v[++i];
    else if (v[i] === '--reps') a.reps = Number(v[++i]);
    else if (v[i] === '--conc') a.conc = Number(v[++i]);
    else if (v[i] === '--only') a.only = v[++i];
    else if (v[i] === '--max-steps') a.maxSteps = Number(v[++i]);
    else if (v[i] === '--arms') a.arms = v[++i];
  }
  return a;
})();

// The treatment nudge: off-board reasoning into the notebook as markdown, step by step.
const PLAN_NUDGE =
  '\n\nPLAN-FIRST (important): You do not have a private scratchpad — use the notebook itself to think.\n' +
  'Before each code change, FIRST write your intent for that step as markdown in the notebook (e.g. add or\n' +
  'update an md`...` cell, or a brief `// plan:` comment) stating what you are about to build and why.\n' +
  'Then implement that step. Re-read your plan as you go so a multi-step build stays coherent. Keep the\n' +
  'plan short and update it as the design evolves.';

// Lighter variant: plan ONCE up front (one markdown design cell), then build — far less step overhead.
const PLAN_ONCE_NUDGE =
  '\n\nPLAN-FIRST (important): You do not have a private scratchpad — use the notebook itself to think.\n' +
  'As your FIRST action, add a single markdown md`...` cell to the notebook that lays out the full plan:\n' +
  'the cells you will create, their dataflow (what depends on what), and the key formula/logic for each.\n' +
  'Then implement the cells. Re-read your plan cell as you go and keep it in sync. Do not re-plan before\n' +
  'every step — plan once, then build efficiently.';

const base = systemPrompt + composeFooter({ workdir: '/notebook', model: args.model });
const ALL_ARMS = {
  control: { name: 'control', prompt: base },
  'plan-each': { name: 'plan-each', prompt: base + PLAN_NUDGE },
  'plan-once': { name: 'plan-once', prompt: base + PLAN_ONCE_NUDGE },
};
const ARMS = (args.arms ? args.arms.split(',') : ['control', 'plan-each']).map((n) => {
  if (!ALL_ARMS[n]) throw new Error('unknown arm: ' + n);
  return ALL_ARMS[n];
});

async function seedFs(files) {
  const fs = new InMemoryFs();
  await fs.mkdir('/notebook', { recursive: true });
  for (const [path, src] of Object.entries(files ?? {})) {
    const dir = path.slice(0, path.lastIndexOf('/'));
    if (dir) await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path, src);
  }
  return fs;
}

async function runOne({ task, arm, rep }) {
  const fs = await seedFs(task.files);
  const session = createNodeSession(fs);
  const client = createOpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY,
    referer: 'https://lopecode.com',
    title: 'robocoop-4-plan-experiment',
    defaultModel: args.model,
  });
  const loop = createAgentLoop({
    client,
    tools: [createBashTool()],
    systemPrompt: arm.prompt,
    model: args.model,
    maxSteps: args.maxSteps,
    runCommand: session.runCommand,
  });

  let steps = 0, finishReason = null, error = null, malformed = 0;
  const t0 = Date.now();
  try {
    const r = await loop.run(task.prompt);
    steps = r.steps; finishReason = r.finishReason; malformed = r.malformed ?? 0;
  } catch (e) { error = e.message || String(e); }
  let g;
  try { g = await task.assert(fs); } catch (e) { g = { ok: false, passed: 0, total: 1, score: 0, detail: 'assert threw: ' + e.message }; }

  return {
    task: task.id, arm: arm.name, rep,
    pass: !error && g.ok, score: error ? 0 : g.score, passed: g.passed, total: g.total,
    steps, finishReason, malformed, error, ms: Date.now() - t0, detail: g.detail,
  };
}

// concurrency-capped pool
async function pool(jobs, conc, worker) {
  const out = new Array(jobs.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(conc, jobs.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= jobs.length) break;
      out[i] = await worker(jobs[i], i);
    }
  }));
  return out;
}

function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function pct(x) { return (100 * x).toFixed(0) + '%'; }

async function main() {
  if (!process.env.OPENROUTER_API_KEY) { console.error('OPENROUTER_API_KEY missing'); process.exit(2); }
  const tasks = args.only ? planTasks.filter((t) => t.id === args.only) : planTasks;
  const jobs = [];
  for (const task of tasks) for (const arm of ARMS) for (let rep = 0; rep < args.reps; rep++) jobs.push({ task, arm, rep });

  console.log(`plan-experiment — model=${args.model} reps=${args.reps} tasks=${tasks.length} arms=2 → ${jobs.length} runs, conc=${args.conc}\n`);
  let done = 0;
  const rows = await pool(jobs, args.conc, async (job) => {
    const r = await runOne(job);
    done++;
    console.log(`[${String(done).padStart(2)}/${jobs.length}] ${r.arm.padEnd(9)} ${r.task.padEnd(14)} rep${r.rep} ` +
      `score=${(r.score * 100).toFixed(0).padStart(3)}% steps=${String(r.steps).padStart(2)} ${r.pass ? 'PASS' : 'fail'}` +
      (r.error ? ' ERR:' + r.error.slice(0, 60) : ''));
    return r;
  });

  // aggregate
  const summarize = (rs) => ({ n: rs.length, meanScore: mean(rs.map((r) => r.score)), passRate: mean(rs.map((r) => (r.pass ? 1 : 0))), meanSteps: mean(rs.map((r) => r.steps)), meanMalformed: mean(rs.map((r) => r.malformed || 0)), errRate: mean(rs.map((r) => (r.error ? 1 : 0))) });
  console.log('\n=== per-arm ===');
  const byArm = {};
  for (const arm of ARMS) { byArm[arm.name] = summarize(rows.filter((r) => r.arm === arm.name)); }
  for (const arm of ARMS) { const s = byArm[arm.name]; console.log(`${arm.name.padEnd(10)} meanScore=${pct(s.meanScore)}  passRate=${pct(s.passRate)}  meanSteps=${s.meanSteps.toFixed(1)}  malformed/run=${s.meanMalformed.toFixed(2)}  errRate=${pct(s.errRate)}  (n=${s.n})`); }
  if (byArm.control) for (const arm of ARMS) {
    if (arm.name === 'control') continue;
    const dScore = byArm[arm.name].meanScore - byArm.control.meanScore;
    const dPass = byArm[arm.name].passRate - byArm.control.passRate;
    console.log(`DELTA (${arm.name} - control): meanScore ${(dScore >= 0 ? '+' : '') + (dScore * 100).toFixed(1)}pp  passRate ${(dPass >= 0 ? '+' : '') + (dPass * 100).toFixed(1)}pp`);
  }

  console.log('\n=== per-task meanScore by arm ===');
  console.log('task'.padEnd(14) + ARMS.map((a) => a.name.padStart(11)).join(''));
  for (const task of tasks) {
    const cells = ARMS.map((a) => pct(summarize(rows.filter((r) => r.task === task.id && r.arm === a.name)).meanScore).padStart(11));
    console.log(task.id.padEnd(14) + cells.join(''));
  }

  const outPath = `tools/robocoop-4/eval/live/plan-experiment-${args.ts}.json`;
  writeFileSync(outPath, JSON.stringify({ args, byArm, rows }, null, 2));
  console.log(`\nraw → ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
