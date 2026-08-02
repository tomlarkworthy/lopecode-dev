// Cold-boot the notebook and report EVERY cell that errored, plus the named
// regressions. Used to prove that stripping the simulator's unused PNG
// attachments broke nothing that this notebook actually reaches.
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve(process.argv[2] ?? "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const pageErrors: string[] = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") pageErrors.push("console: " + m.text().slice(0, 200)); });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", {
    get() { return orig; },
    set(N: any) {
      const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
      W.prototype = N.prototype; Object.assign(W, N); return W;
    },
  });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 120000 });
await page.waitForTimeout(12000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const errored: string[] = [];
  const pending: string[] = [];
  for (const v of vars) {
    if (!v._name) continue;
    // _reachable/_value are runtime internals; only used to survey, not to drive
    if (v._error) errored.push(v._name + ": " + String(v._error).slice(0, 120));
  }
  const get = async (name: string) => {
    const v = vars.find((z: any) => z._name === name);
    if (!v) return "MISSING";
    try { return await v._module.value(name); } catch (e: any) { return "ERROR: " + e.message; }
  };
  const named: Record<string, any> = {};
  for (const n of [
    "hexRigSelfTest", "manAxesTest", "manSceneTest", "hexPrintCheck",
    "manFrameResults", "frameResults", "sceneTest", "hexRendererCheck",
  ]) named[n] = await get(n);
  // the symbols imported from the three earlier-part modules: every one must resolve
  const imported: Record<string, string> = {};
  for (const n of ["edges1D", "fitMobiusLS", "xFromK", "dpScratch", "dpAlignFast",
                   "FRAME", "rowOf", "crossRatio", "crDistance", "fuseCluster",
                   "THREE", "templateAtOffset", "SVD"]) {
    const val = await get(n);
    imported[n] = typeof val === "string" && val.startsWith("ERROR") ? val
      : val == null ? "NULL" : typeof val;
  }
  return { errored, pending, named, imported, nVars: vars.length };
});
console.log("variables:", out.nVars);
console.log("\n=== errored cells ===\n" + (out.errored.length ? out.errored.join("\n") : "(none)"));
console.log("\n=== imported symbols ===");
for (const [k, v] of Object.entries(out.imported)) console.log(`  ${k.padEnd(18)} ${v}`);
console.log("\n=== regressions ===");
for (const [k, v] of Object.entries(out.named)) {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  console.log(`--- ${k} ---\n${String(s).slice(0, 700)}`);
}
console.log("\n=== page errors ===\n" + (pageErrors.length ? pageErrors.join("\n") : "(none)"));
await browser.close();
