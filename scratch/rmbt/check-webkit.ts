// Does the pool work on WebKit? Closest available proxy to the iPhone, where
// the rig is reported dead. No camera here (WebKit has no fake device), so this
// tests the parts that do not need one: blob workers, the kernel, agreement.
import { webkit, chromium } from "playwright";
import { resolve } from "node:path";

const NB = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "file://" + resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const engine = process.argv.includes("--chromium") ? chromium : webkit;

const browser = await engine.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone-ish
const errs: string[] = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") errs.push("CONSOLE " + m.text().slice(0, 200)); });
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
await page.goto(NB, { waitUntil: "load", timeout: 240000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 240000 });
await page.waitForTimeout(20000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const vars = [...rt._variables].filter((v: any) => v._module === mod);
  const errored = vars.filter((v: any) => v._value instanceof Error).map((v: any) => v._name + ": " + String(v._value).slice(0, 100));

  const settle = <T,>(p: Promise<T>, ms: number, tag: string) =>
    Promise.race([p.catch((e: any) => "THREW: " + e.message), new Promise((r) => setTimeout(() => r("PENDING " + tag), ms))]);

  const pool: any = await settle(mod.value("detectPool"), 8000, "detectPool");
  const agree: any = await settle(mod.value("poolAgreement"), 60000, "poolAgreement");

  // does a single pool job work at all?
  let job = "not attempted";
  if (pool && pool.runRows) {
    const bank = await mod.value("hexFrameBank");
    const run = await mod.value("analyzeFrameManAsync");
    job = String(await settle(
      run(bank[0].frame, { runRows: pool.runRows }).then((r: any) => "ok, " + r.fused.length + " marks"),
      20000, "job"));
  }
  return {
    cores: navigator.hardwareConcurrency,
    poolSize: pool && pool.size !== undefined ? pool.size : String(pool),
    agreement: agree && agree.allIdentical !== undefined ? "allIdentical=" + agree.allIdentical : String(agree),
    job,
    errored,
  };
});
await browser.close();
console.log(JSON.stringify({ engine: engine === webkit ? "webkit" : "chromium", url: NB.slice(0, 70), ...out, pageErrors: errs.slice(0, 6) }, null, 1));
