import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
await p.goto("file:///tmp/@tomlarkworthy_parallel-runtime-qa.html");
await p.waitForFunction(() => !!window.__ojs_hooks, null, { timeout: 60000 });
await p.waitForTimeout(12000);
const r = await p.evaluate(async () => {
  const rt = window.__ojs_hooks.runtime;
  const out = { policyInstalled: !!window.__ojs_hooks.policy, cells: {} };
  for (const v of rt._variables) {
    if (["policyState", "installedPolicy", "screen", "acorn", "policyOn", "scope"].includes(v._name)) {
      try { out.cells[v._name] = v._name === "policyState" ? JSON.parse(JSON.stringify({
        attempts: v._value?.attempts, completed: v._value?.completed, declined: v._value?.declined,
        failures: v._value?.failures, workerMs: Math.round(v._value?.workerMs || 0),
        bands: [...(v._value?.byCell || new Map())].filter(([n])=>/^(band\d|cfg|checksum|renderBand|figure|parallelFlag)$/.test(n)).map(([n,x])=>n+" tries="+x.tries+" ok="+x.ok+" fail="+x.fail+" "+x.ms.toFixed(0)+"ms :: "+x.reason),
        log: v._value?.log?.slice(0,5)
      })) : String(v._value).slice(0, 120); }
      catch (e) { out.cells[v._name] = "ERR " + e.message; }
    }
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await b.close();
process.exit(0);
