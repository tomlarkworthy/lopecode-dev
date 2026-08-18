import { readFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(f, "utf8"));
  let pt = 0, ct = 0, cached = 0, cost = 0, calls = 0, n = 0;
  for (const r of d.results) for (const u of [r.usage1, r.usage2]) if (u) {
    pt += u.promptTokens || 0; ct += u.completionTokens || 0; cached += u.cachedTokens || 0;
    cost += u.costUSD || 0; calls += u.calls || 0; n++;
  }
  console.log(`${f}\n  attempts=${n} calls=${calls} prompt=${pt} (cached ${cached}) completion=${ct} blended=${pt + ct} costUSD=${cost.toFixed(4)}`);
}
