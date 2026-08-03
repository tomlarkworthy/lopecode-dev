// Run the full eval suite for several models with bounded concurrency; one run.mjs child per model, each
// writing results/compare/<slug>.json. Prints a mean-score table at the end. Usage:
//   bun compare-models.mjs [--concurrency 4] model1 model2 ...
import { spawn } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "results", "compare");
mkdirSync(outDir, { recursive: true });

const argv = process.argv.slice(2);
let concurrency = 4; const models = [];
for (let i=0;i<argv.length;i++){ const a=argv[i]; if(a==="--concurrency")concurrency=Number(argv[++i]); else models.push(a); }
if (!models.length) { console.error("pass model ids"); process.exit(2); }
const slug = (m) => m.replace(/[^a-z0-9.]+/gi, "_");

const runOne = (model) => new Promise((res) => {
  const json = join(outDir, slug(model) + ".json");
  const t0 = Date.now();
  const child = spawn("bun", [join(here, "run.mjs"), "--model", model, "--timeout", "180000", "--json", json], { stdio: ["ignore", "pipe", "pipe"] });
  let mean = null, tail = "";
  const grab = (b) => { tail = (tail + b.toString()).slice(-4000); const m = tail.match(/mean aggregate: ([\d.]+) over (\d+)/); if (m) mean = { mean: Number(m[1]), n: Number(m[2]) }; };
  child.stdout.on("data", grab); child.stderr.on("data", grab);
  child.on("close", (code) => {
    const secs = Math.round((Date.now()-t0)/1000);
    console.log(`[done ${secs}s] ${model} -> ${mean ? mean.mean.toFixed(2)+" /"+mean.n : "(no mean; exit "+code+")"}`);
    res({ model, json, mean, code });
  });
});

// simple pool
const queue = [...models]; const results = []; let active = 0;
await new Promise((resolveAll) => {
  const pump = () => {
    if (!queue.length && active === 0) return resolveAll();
    while (active < concurrency && queue.length) {
      const model = queue.shift(); active++;
      console.log(`[start] ${model}  (${active} active, ${queue.length} queued)`);
      runOne(model).then((r) => { results.push(r); active--; pump(); });
    }
  };
  pump();
});

// summary — read each JSON for eval score + total cost (OpenRouter usage.cost, USD)
console.log("\n=== QUALITY + COST (full suite, 1 run each) ===");
const table = results.map((r) => {
  let mean = null, n = null, cost = null, calls = null;
  try {
    const j = JSON.parse(readFileSync(r.json, "utf8"));
    const arr = j.evals || [];
    mean = arr.reduce((s, e) => s + e.aggregate, 0) / arr.length; n = arr.length;
    cost = arr.reduce((s, e) => s + (e.usage?.costUSD || 0), 0);
    calls = arr.reduce((s, e) => s + (e.usage?.calls || 0), 0);
  } catch {}
  return { model: r.model, mean, n, cost, calls };
}).sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1));
console.log("score  cost      calls  model");
for (const t of table)
  console.log(`${t.mean != null ? t.mean.toFixed(2) : " ?? "}   $${t.cost != null ? t.cost.toFixed(4) : " ?? "}  ${String(t.calls ?? "?").padStart(5)}  ${t.model}`);
