// Does the seam+policy help or break a real heterogeneous notebook?
// Compares stock Tour against hooked Tour on: boot health (errored cells),
// settle time, and what the policy actually managed to offload.
import { chromium } from "playwright";

const run = async (url, label, waitPolicy) => {
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
  const t0 = Date.now();
  await p.goto(url);
  await p.waitForFunction(() => !!window.__ojs_runtime, null, { timeout: 60000 });
  if (waitPolicy) await p.waitForFunction(() => !!window.__ojs_hooks?.policy, null, { timeout: 90000 }).catch(() => errs.push("policy never installed"));
  // settle: wait until the count of resolved variables stops growing
  await p.waitForFunction(() => {
    const rt = window.__ojs_runtime;
    let ok = 0;
    for (const v of rt._variables) if (v._value !== undefined) ok++;
    const prev = window.__settleProbe || 0;
    window.__settleProbe = ok;
    window.__settleSame = (ok === prev) ? (window.__settleSame || 0) + 1 : 0;
    return window.__settleSame >= 4;
  }, null, { timeout: 120000, polling: 500 }).catch(() => errs.push("never settled"));
  const settleMs = Date.now() - t0;
  const r = await p.evaluate(() => {
    const rt = window.__ojs_runtime;
    let total = 0, ok = 0, pending = 0;
    const errored = [];
    for (const v of rt._variables) {
      if (!v._name || v._type !== 1) continue;
      total++;
      if (v._value !== undefined) ok++; else pending++;
    }
    const st = [...rt._variables].find((v) => v._name === "policyState")?._value;
    return {
      total, ok, pending,
      inspectorErrors: document.querySelectorAll(".observablehq--error").length,
      canvases: document.querySelectorAll("canvas").length,
      policy: st ? {
        attempts: st.attempts, completed: st.completed, declined: st.declined,
        failures: st.failures, workerMs: Math.round(st.workerMs),
        topOffloaded: [...st.byCell].filter(([, x]) => x.ok > 0).sort((a, b) => b[1].ms - a[1].ms)
          .slice(0, 12).map(([n, x]) => n + " " + x.ms.toFixed(0) + "ms x" + x.ok),
        failLog: st.log.slice(0, 10)
      } : null
    };
  });
  await p.screenshot({ path: "tools/screenshots/tour-" + label + ".png" });
  await b.close();
  return { label, settleMs, errs: errs.slice(0, 6), ...r };
};

const stock = await run("file:///tmp/tour-stock-qa.html", "stock", false);
const hooked = await run("file:///tmp/tour-hooked-qa.html", "hooked", true);
for (const r of [stock, hooked]) {
  console.log("\n=== " + r.label + " ===");
  console.log("settle " + r.settleMs + " ms | named cells " + r.total + " (resolved " + r.ok + ", pending " + r.pending + ")" +
    " | inspector errors " + r.inspectorErrors + " | canvases " + r.canvases);
  if (r.errs.length) console.log("pageerrors:", r.errs.join(" | "));
  if (r.policy) {
    console.log("policy: attempts " + r.policy.attempts + ", completed " + r.policy.completed +
      ", declined " + r.policy.declined + ", fell back " + r.policy.failures + ", worker time " + r.policy.workerMs + " ms");
    console.log("offloaded:", r.policy.topOffloaded.join("\n           "));
    console.log("fallbacks:", r.policy.failLog.join("\n           "));
  }
}
console.log("\nDELTA resolved cells:", hooked.ok - stock.ok, " inspector errors:", hooked.inspectorErrors - stock.inspectorErrors);
process.exit(0);
