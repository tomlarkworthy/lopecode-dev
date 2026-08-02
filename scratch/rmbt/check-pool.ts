// What does the worker pool actually buy, and where does it stop buying?
//
// Drives the notebook's OWN poolBenchmark cell rather than timing the detector
// from here: that cell already knows to warm the pool, take a median of five
// and report the spread, and a second stopwatch in this file would be a second
// opinion about methodology that nobody asked for.
import { chromium } from "playwright";
import { resolve } from "node:path";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const SIZES = (process.argv.includes("--sizes")
  ? process.argv[process.argv.indexOf("--sizes") + 1]
  : "0,1,2,4,6,8"
).split(",").map(Number);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime;
  let cap = false;
  Object.defineProperty(window, "Runtime", {
    get() { return orig; },
    set(N: any) {
      const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
      W.prototype = N.prototype; Object.assign(W, N); return W;
    },
  });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);

const cores = await page.evaluate(() => navigator.hardwareConcurrency);
console.log(`hardwareConcurrency ${cores}\n`);

// Tear-down under load, first, because getting this wrong does not look like a
// bug in the pool -- it looks like the notebook died. Terminating a worker
// abandons the jobs it was holding; if their promises never settle, the caller
// parks forever, and since Observable runs updates in one chain the ENTIRE
// runtime stops computing. Observed once for real, while sweeping sizes.
const teardown = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const vars = [...rt._variables].filter((v: any) => v._module === mod);
  const V = (nm: string) => vars.find((x: any) => x._name === nm);
  const bank = await mod.value("hexFrameBank");
  const pool = await mod.value("detectPool");
  const run = await mod.value("analyzeFrameManAsync");
  if (!pool) return { skipped: "pool off at boot" };

  // start a job, then pull the pool out from under it
  const inflight = run(bank[0].frame, { runRows: pool.runRows }).then(
    () => "resolved", (e: any) => "rejected: " + e.message);
  const vo = V("viewof poolSize")._value as HTMLElement & { value: number };
  vo.value = 2;
  vo.dispatchEvent(new Event("input", { bubbles: true }));

  const jobOutcome = await Promise.race([
    inflight,
    new Promise((r) => setTimeout(() => r("HUNG"), 5000)),
  ]);
  // and is the runtime still alive afterwards?
  const alive = await Promise.race([
    mod.value("detectPool").then((p: any) => "computes, size " + (p ? p.size : 0)),
    new Promise((r) => setTimeout(() => r("RUNTIME WEDGED"), 8000)),
  ]);
  return { jobOutcome, alive };
});
console.log("tear-down under load:", JSON.stringify(teardown));
if (String(teardown.jobOutcome) === "HUNG" || String(teardown.alive).includes("WEDGED")) {
  console.log("\nFAIL: tearing the pool down mid-job stalls the runtime");
  await browser.close();
  process.exit(1);
}
console.log();
console.log("workers  serial_ms  pool_ms  speedup  fps  worst_spread%  agree");

for (const n of SIZES) {
  const row = await page.evaluate(async (size) => {
    const rt = (window as any).__ojs_runtime;
    const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
    const vars = [...rt._variables].filter((v: any) => v._module === mod);
    const V = (nm: string) => vars.find((x: any) => x._name === nm);

    // set the pool size the way the input would
    const vo = V("viewof poolSize")._value as HTMLElement & { value: number };
    vo.value = size;
    vo.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 800));

    // Let poolAgreement finish FIRST. It runs the whole bank through the very
    // same workers, so benchmarking while it is still going measures the
    // benchmark queued behind the notebook's own correctness check -- which is
    // what made the pool arm look no faster than serial.
    const agree = await mod.value("poolAgreement");
    await new Promise((r) => setTimeout(r, 500));

    const btn = (V("viewof poolBenchGo")._value as HTMLElement).querySelector("button") as HTMLButtonElement;
    btn.click();
    await new Promise((r) => setTimeout(r, 300));
    const b = await mod.value("poolBenchmark");
    return { b, agree: agree.allIdentical === undefined ? "n/a" : String(agree.allIdentical) };
  }, n);
  const b = row.b;
  if (!b || b.note) { console.log(`${String(n).padStart(7)}  ${b ? b.note : "no result"}`); continue; }
  console.log(
    `${String(b.workers).padStart(7)}  ${String(b.serialMsMedian).padStart(9)}  ${String(b.poolMsMedian).padStart(7)}  ` +
    `${String(b.speedupMedian).padStart(7)}  ${String(Math.round(1000 / b.poolMsMedian)).padStart(3)}  ` +
    `${String(b.worstSpreadPct).padStart(13)}  ${row.agree}`
  );
}
await browser.close();
