// Boot the patched notebook headlessly and check the disk edits actually took:
// the two new prose cells, the §4.7 ordering, the repaired relabelReport, and
// the regenerated bank labels reaching the runtime through FileAttachment.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const HASH = "#view=R100(S100(@tomlarkworthy/coded-landmark-tracking))";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}${HASH}`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(20000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const mod = vars.find((v: any) => v._name === "relabelCase")?._module;
  const mine = vars.filter((v: any) => v._module === mod);
  const idx = mine.findIndex((v: any) => v._name === "denseLabel");
  const bankVar = vars.find((v: any) => v._name === "hexFrameBank");
  let bank: any = null;
  try { bank = await Promise.race([bankVar._promise, new Promise((r) => setTimeout(() => r("PENDING"), 15000))]); } catch (e: any) { bank = "ERR " + e.message; }
  const rr = vars.find((v: any) => v._name === "relabelReport");
  return {
    moduleVars: mine.length,
    order: mine.slice(idx, idx + 9).map((v: any) => v._name ?? "md"),
    hasRingProse: mine.some((v: any) => String(v._definition).includes("#### The ring lattice")),
    hasConstraintProse: mine.some((v: any) => String(v._definition).includes("#### What one mark constrains")),
    s47ok: mine.some((v: any) => String(v._definition).includes("not the tracker's own output")),
    relabelReportOk: !!rr && !String(rr._definition).includes("SyntaxError"),
    jumpMax: mine.some((v: any) => String(v._definition).includes("jumpMax")),
    bankFrames: Array.isArray(bank) ? bank.length : String(bank).slice(0, 60),
    firstFrame: Array.isArray(bank) && bank[0] ? { name: bank[0].name, marks: (bank[0].truth ?? bank[0].labels ?? []).length, x0: (bank[0].truth ?? bank[0].labels ?? [])[0]?.x } : null
  };
});
console.log(JSON.stringify(out, null, 1));
console.log("pageerrors:", errs.length ? errs.slice(0, 6) : "none");

// cross-check the first label against the file we installed
const nf = JSON.parse(readFileSync("scratch/rmbt/bank/hexframes.json", "utf8"));
const frames = Array.isArray(nf) ? nf : nf.frames;
const f0 = frames.find((f: any) => f.name === out.firstFrame?.name) ?? frames[0];
console.log(`expected first label x for ${f0.name}:`, (f0.truth ?? f0.labels)[0]?.x, " got:", out.firstFrame?.x0);

await browser.close();
