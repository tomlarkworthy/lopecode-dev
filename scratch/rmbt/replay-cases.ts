// Replay saved hexRig cases from disk through the real cascade and score them
// against the labels frozen at capture. This is the proof that the archive is
// an archive: if a stored case cannot be graded offline it is just bytes.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";

const DIR = resolve("data/hexcases");
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const names = readdirSync(DIR).filter((f) => f.endsWith(".gray")).map((f) => f.slice(0, -5)).sort();
if (!names.length) { console.log("no cases"); process.exit(0); }

const cases = names.map((n) => {
  const meta = JSON.parse(readFileSync(resolve(DIR, n + ".json"), "utf8"));
  const gray = readFileSync(resolve(DIR, n + ".gray"));
  return { meta, grayB64: gray.toString("base64") };
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; },
    set(N: any) { const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; }; W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 120000 });
await page.waitForTimeout(9000);

const out = await page.evaluate(async (payload) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const analyzeFrameMan: any = await val("analyzeFrameMan");
  const hexRigScore: any = await val("hexRigScore");
  const hexRigLoo: any = await val("hexRigLoo");

  const rows: any[] = [];
  for (const c of payload) {
    const bin = atob(c.grayB64);
    const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    const { w, h } = c.meta;
    if (gray.length !== w * h) { rows.push({ name: c.meta.name, error: `size ${gray.length} != ${w}x${h}` }); continue; }
    const opts = { stride: c.meta.cfg?.stride ?? 4, edgeThreshold: c.meta.cfg?.edgeThreshold ?? 12,
                   bothAxes: !!c.meta.cfg?.bothAxes };
    const res = analyzeFrameMan({ gray, w, h }, opts);
    const s = hexRigScore(res, c.meta.truth);
    const loo = hexRigLoo(res);
    rows.push({
      name: c.meta.name, w, h,
      capturedRead: c.meta.capture?.counts?.read ?? null,
      replayRead: s.counts.read,
      located: s.counts.located, missing: s.counts.missing, misplaced: s.counts.misplaced,
      off: s.offTarget.length, score: s.score,
      looPx: loo ? loo.worstPx : null,
      ms: +res.ms.toFixed(0),
      bothAxes: opts.bothAxes,
    });
  }
  return rows;
}, cases);

console.log(`replayed ${out.length} saved case(s) from ${DIR}\n`);
console.log("  case              size      captured  replay  loc mis msp off  score  loo    ms");
let agree = 0;
for (const r of out) {
  if (r.error) { console.log(`  ${r.name}  ERROR ${r.error}`); continue; }
  if (r.capturedRead === r.replayRead) agree++;
  const flag = r.capturedRead === r.replayRead ? " " : "*";
  console.log(
    `  ${String(r.name).padEnd(16)} ${(r.w + "x" + r.h).padEnd(9)} ${String(r.capturedRead).padStart(8)}` +
    `${String(r.replayRead).padStart(8)}${flag} ${String(r.located).padStart(3)} ${String(r.missing).padStart(3)} ` +
    `${String(r.misplaced).padStart(3)} ${String(r.off).padStart(3)} ${String(r.score).padStart(6)}  ` +
    `${String(r.looPx).padStart(5)} ${String(r.ms).padStart(5)}`
  );
}
console.log(`\n${agree}/${out.length} replays reproduce the read count recorded at capture` +
  (agree === out.length ? " — archive is faithful" : " — * marks a mismatch"));
await browser.close();
