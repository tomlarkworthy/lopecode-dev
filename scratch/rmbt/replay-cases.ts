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

const SWEEP = process.argv.includes("--sweep");

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

// ---- --sweep: offline knob sweep over the whole archive -------------------
// The in-notebook rig sweeps too, but it reads a collection that the camera is
// still writing to, so it restarts whenever a frame is kept and can never
// finish. Offline the case list is frozen, so a sweep actually completes and
// is reproducible.
if (SWEEP) {
  const sweep = await page.evaluate(async (payload) => {
    const rt = (window as any).__ojs_runtime;
    const vars = [...rt._variables];
    const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
    const analyzeFrameMan: any = await val("analyzeFrameMan");
    const hexRigScore: any = await val("hexRigScore");
    const hexRigLoo: any = await val("hexRigLoo");
    const manLayout: any = await val("manLayout");

    const frames = payload.map((c: any) => {
      const bin = atob(c.grayB64);
      const gray = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
      return { name: c.meta.name, gray, w: c.meta.w, h: c.meta.h, truth: c.meta.truth };
    }).filter((f: any) => f.gray.length === f.w * f.h);

    // The knobs, and the value each one has today.
    const BASE: any = { stride: 4, edgeThreshold: 12, minRows: 3, minVotes: 2, voteRatio: 2, gapFrac: 0.3, offerWhole: false };
    const LAYOUT_BASE: any = { minAxisRatio: 1 / 3, minCover: 0.3, maxASpread: 0.35 };
    const LAYOUT_KEYS = new Set(["minAxisRatio", "minCover", "maxASpread"]);

    const runAll = (over: any) => {
      const opts: any = { ...BASE, bothAxes: false };
      const lay: any = { ...LAYOUT_BASE };
      for (const k of Object.keys(over)) (LAYOUT_KEYS.has(k) ? lay : opts)[k] = over[k];
      opts.layout = { ...manLayout, ...lay };
      let read = 0, misplaced = 0, located = 0, missing = 0, offTarget = 0, total = 0, ms = 0;
      const loos: number[] = [];
      let worstName = null, worstVal = -1, worstRead = null;
      // LOO refits on n-1 points; a homography needs 4, so at n=5 the refit is
      // exactly determined and the residual is unbounded. Only n>=6 measures
      // anything about the detector.
      const loos6: number[] = [];
      for (const f of frames) {
        const res = analyzeFrameMan({ gray: f.gray, w: f.w, h: f.h }, opts);
        const s = hexRigScore(res, f.truth);
        read += s.counts.read; misplaced += s.counts.misplaced;
        located += s.counts.located; missing += s.counts.missing;
        offTarget += s.offTarget.length;
        total += (f.truth || []).length;
        ms += res.ms;
        const l = hexRigLoo(res);
        if (l && isFinite(l.worstPx)) {
          loos.push(l.worstPx);
          if (l.worstPx > worstVal) { worstVal = l.worstPx; worstName = f.name; worstRead = s.counts.read; }
          if (s.counts.read >= 6) loos6.push(l.worstPx);
        }
      }
      loos.sort((a, b) => a - b); loos6.sort((a, b) => a - b);
      return {
        read, total, misplaced, located, missing, offTarget,
        medLoo: loos.length ? +loos[loos.length >> 1].toFixed(2) : null,
        worstLoo: loos.length ? +loos[loos.length - 1].toFixed(2) : null,
        msPerFrame: +(ms / frames.length).toFixed(1),
        worstCase: worstName, worstCaseRead: worstRead,
        n6: loos6.length,
        medLoo6: loos6.length ? +loos6[loos6.length >> 1].toFixed(2) : null,
        worstLoo6: loos6.length ? +loos6[loos6.length - 1].toFixed(2) : null,
      };
    };

    const GRID: any = {
      stride: [2, 3, 4, 6],
      edgeThreshold: [6, 8, 10, 12, 16],
      minRows: [3, 4, 5],
      minVotes: [2, 3, 4],
      voteRatio: [1.5, 2, 3],
      gapFrac: [0.2, 0.3, 0.4],
      minAxisRatio: [0.2, 0.25, 1 / 3],
      minCover: [0.2, 0.3, 0.4],
      maxASpread: [0.35, 0.5],
      offerWhole: [true],
    };

    const baseline = runAll({});
    const ofat: any[] = [];
    for (const knob of Object.keys(GRID)) {
      for (const v of GRID[knob]) {
        const cur = (LAYOUT_KEYS.has(knob) ? LAYOUT_BASE : BASE)[knob];
        const sameVal = typeof v === "number" && typeof cur === "number" ? Math.abs(v - cur) < 1e-9 : v === cur;
        if (sameVal) continue;
        ofat.push({ knob, value: v, ...runAll({ [knob]: v }) });
      }
    }

    // Best single change per knob, judged on reads first then wrong reads.
    const better = (a: any, b: any) =>
      a.read !== b.read ? a.read > b.read : (a.misplaced !== b.misplaced ? a.misplaced < b.misplaced : a.medLoo < b.medLoo);
    const winners: any[] = [];
    for (const knob of Object.keys(GRID)) {
      const cands = ofat.filter((o) => o.knob === knob);
      let best: any = null;
      for (const c of cands) if (!best || better(c, best)) best = c;
      if (best && better(best, baseline)) winners.push(best);
    }
    const COMBOS: any[] = [
      { label: "gapFrac 0.2", over: { gapFrac: 0.2 } },
      { label: "offerWhole", over: { offerWhole: true } },
      { label: "offerWhole + gapFrac 0.2", over: { offerWhole: true, gapFrac: 0.2 } },
      { label: "offerWhole + minAxisRatio 0.2", over: { offerWhole: true, minAxisRatio: 0.2 } },
      { label: "offerWhole + gap 0.2 + axis 0.2", over: { offerWhole: true, gapFrac: 0.2, minAxisRatio: 0.2 } },
      { label: "all four (recall max)", over: { stride: 2, edgeThreshold: 16, gapFrac: 0.2, minAxisRatio: 0.2 } },
    ];
    const combos = COMBOS.map((c) => ({ label: c.label, over: c.over, ...runAll(c.over) }));

    const combined: any = {};
    for (const w of winners) combined[w.knob] = w.value;
    const applied = Object.keys(combined).length ? runAll(combined) : null;

    return { baseline, ofat, winners, combined, applied, combos, nFrames: frames.length };
  }, cases);

  const b = sweep.baseline;
  const line = (label: string, r: any) =>
    `  ${label.padEnd(28)} ${String(r.read).padStart(3)}/${String(r.total).padEnd(3)} ` +
    `${String(r.misplaced).padStart(5)} ${String(r.located).padStart(6)} ${String(r.missing).padStart(6)} ` +
    `${String(r.medLoo).padStart(7)} ${String(r.medLoo6).padStart(8)} ${String(r.worstLoo6).padStart(9)} ` +
    `${String(r.n6).padStart(4)} ${String(r.msPerFrame).padStart(7)}`;

  console.log(`offline sweep over ${sweep.nFrames} archived case(s)\n`);
  console.log("                              read  wrong  locatd  missng  medLoo  medLoo6 worstLoo6  n>=6   ms/fr");
  console.log(line("BASELINE (shipping)", b));
  console.log("");
  let lastKnob = "";
  for (const o of sweep.ofat) {
    if (o.knob !== lastKnob) { console.log(""); lastKnob = o.knob; }
    const dr = o.read - b.read;
    const tag = `${o.knob} = ${typeof o.value === "number" ? +o.value.toFixed(3) : o.value}`;
    console.log(line(tag, o) + `  ${dr > 0 ? "+" + dr : dr === 0 ? " 0" : dr}` +
      (o.worstLoo > 30 ? `   <- ${o.worstCase} (read ${o.worstCaseRead})` : ""));
  }
  console.log("\nbest single change per knob (reads first, then wrong reads):");
  if (!sweep.winners.length) console.log("  none beat the baseline");
  for (const w of sweep.winners)
    console.log(`  ${w.knob} = ${+Number(w.value).toFixed(3)}   read ${w.read}/${w.total} (${w.read - b.read >= 0 ? "+" : ""}${w.read - b.read}), wrong ${w.misplaced}, medLoo ${w.medLoo}`);
  console.log("\nnamed combinations:");
  console.log(line("BASELINE", b));
  for (const c of sweep.combos)
    console.log(line(c.label, c) + `  ${c.read - b.read >= 0 ? "+" : ""}${c.read - b.read}`);

  if (sweep.applied) {
    console.log("\nall winning changes applied together:");
    console.log(line("COMBINED", sweep.applied) + `  ${sweep.applied.read - b.read >= 0 ? "+" : ""}${sweep.applied.read - b.read}`);
    const sumParts = sweep.winners.reduce((a: number, w: any) => a + (w.read - b.read), 0);
    console.log(`  sum of parts would be +${sumParts}; combined is ${sweep.applied.read - b.read >= 0 ? "+" : ""}${sweep.applied.read - b.read}` +
      ` -- ${sweep.applied.read - b.read < sumParts ? "they do NOT compose" : "they compose"}`);
    console.log(`  config: ${JSON.stringify(sweep.combined)}`);
  }
  await browser.close();
  process.exit(0);
}

const out = await page.evaluate(async (payload) => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const val = async (n: string) => { const v = vars.find((z: any) => z._name === n); return v ? await v._module.value(n) : null; };
  const analyzeFrameMan: any = await val("analyzeFrameMan");
  const hexRigScore: any = await val("hexRigScore");
  const hexRigLoo: any = await val("hexRigLoo");
  const unrotatePoint: any = await val("unrotatePoint");
  const fitHexPose: any = await val("fitHexPose");

  const rows: any[] = [];
  for (const c of payload) {
    const bin = atob(c.grayB64);
    const gray = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) gray[i] = bin.charCodeAt(i);
    const { w, h } = c.meta;
    if (gray.length !== w * h) { rows.push({ name: c.meta.name, error: `size ${gray.length} != ${w}x${h}` }); continue; }
    // Run BOTH arms on identical pixels. The cases were all captured with
    // bothAxes on, so the arm that produced the frozen labels is not
    // necessarily the arm that should be trusted -- comparing them here is the
    // only way to see whether the merge helps or hurts on real frames.
    const base = { stride: c.meta.cfg?.stride ?? 4, edgeThreshold: c.meta.cfg?.edgeThreshold ?? 12 };
    const arm = (bothAxes: boolean) => {
      const res = analyzeFrameMan({ gray, w, h }, { ...base, bothAxes });
      const s = hexRigScore(res, c.meta.truth);
      const loo = hexRigLoo(res);
      return {
        read: s.counts.read, located: s.counts.located, missing: s.counts.missing,
        misplaced: s.counts.misplaced, off: s.offTarget.length, score: s.score,
        looPx: loo ? +loo.worstPx.toFixed(2) : null,
        ms: +res.ms.toFixed(0),
        axisOnly: (res.axisOnly ?? []).length,
        conflicts: (res.conflicts ?? []).length,
        bothN: res.bothAxes ?? null,
        worstCrossPx: res.worstCrossPx ?? null,
      };
    };
    // --- label audit -----------------------------------------------------
    // The frozen labels were produced by a fit, with bothAxes on, so scoring a
    // replay against them cannot tell us whether they are right. The hex
    // target IS rigid though, so its own geometry is independent evidence: fit
    // the known layout to the stored label positions and see whether they are
    // mutually consistent. A label set that cannot be explained by any pose of
    // a rigid honeycomb has at least one bad point in it.
    const truthPts = (c.meta.truth || [])
      .filter((t: any) => t.state === "read")
      .map((t: any) => ({ id: t.id, xc: t.x, yc: t.y, a: t.radiusPx, b: t.radiusPx, posed: true }));
    let truthAudit: any = { n: truthPts.length, rmsPx: null, looPx: null };
    if (truthPts.length >= 4) {
      const tp = fitHexPose ? fitHexPose(truthPts) : null;
      const tl = hexRigLoo({ fused: truthPts });
      truthAudit = {
        n: truthPts.length,
        rmsPx: tp && tp.rmsPx != null ? +tp.rmsPx.toFixed(2) : null,
        looPx: tl ? +tl.worstPx.toFixed(2) : null,
        looId: tl && tl.worstId != null ? tl.worstId : null,
      };
    }

    const R = arm(false), B = arm(true);

    // Candidate merge policies, scored on the SAME two passes. The current
    // policy always takes y from the column pass on the grounds that it
    // measured it; that is only right when the column fit is itself sound, so
    // the alternatives gate on independent evidence (how many rows supported
    // each fit) or on the size of the disagreement.
    const full = analyzeFrameMan({ gray, w, h }, { ...base, bothAxes: true });
    const rowsPass = full.axes.rows.fused;
    const colsRaw = full.axes.cols.fused;
    const backP = (f: any) => {
      const p = unrotatePoint(f.xc, f.yc, 1, w, h);
      return { ...f, xc: p.x, yc: p.y, a: f.b, b: f.a };
    };
    const colsPass = colsRaw.map(backP);
    const pair = (r: any) => {
      const size = r.a ?? r.wHalf ?? 24;
      let m = null, bd = Infinity;
      for (const c of colsPass) {
        if (c.id !== r.id) continue;
        const d = Math.hypot(c.xc - r.xc, c.yc - r.yc);
        if (d < 0.8 * size && d < bd) { bd = d; m = c; }
      }
      return { m, d: bd };
    };
    const policy = (name: string, take: (r: any, c: any, d: number) => any) => {
      const fused = rowsPass.map((r: any) => {
        const { m, d } = pair(r);
        return m ? take(r, m, d) : { ...r };
      });
      const loo = hexRigLoo({ fused });
      return { name, looPx: loo ? +loo.worstPx.toFixed(2) : null };
    };
    const policies = [
      // y always from the column pass -- what ships today
      policy("colAlways", (r, c) => ({ ...r, yc: c.yc, b: c.b ?? r.b })),
      // only when the column fit rests on at least as many rows as the row fit
      policy("colIfMoreRows", (r, c) => (c.rows >= r.rows ? { ...r, yc: c.yc, b: c.b ?? r.b } : { ...r })),
      // only when the two passes broadly agree (large gap = one is wrong, and
      // nothing here says which, so keep the gated one)
      policy("colIfAgree8", (r, c, d) => (d <= 8 ? { ...r, yc: c.yc, b: c.b ?? r.b } : { ...r })),
      // average the two -- halves any single bad estimate
      policy("meanY", (r, c) => ({ ...r, yc: (r.yc + c.yc) / 2 })),
    ];
    rows.push({
      name: c.meta.name, w, h,
      capturedRead: c.meta.capture?.counts?.read ?? null,
      capturedWithBothAxes: !!c.meta.cfg?.bothAxes,
      rowsOnly: R, both: B,
      policies, truthAudit,
      // did the merge help or hurt the plane on this frame?
      looDelta: R.looPx != null && B.looPx != null ? +(B.looPx - R.looPx).toFixed(2) : null,
      readDelta: B.read - R.read,
    });
  }
  return rows;
}, cases);

console.log(`replayed ${out.length} saved case(s) from ${DIR}\n`);
console.log("                     capt |    rows-only     |        bothAxes            | delta");
console.log("  case                read | read  loo    ms | read  loo  axOnly cfl  ms | loo   read");
let agree = 0, helped = 0, hurt = 0, same = 0;
for (const r of out) {
  if (r.error) { console.log(`  ${r.name}  ERROR ${r.error}`); continue; }
  if (r.capturedRead === r.both.read) agree++;
  if (r.looDelta != null) { if (r.looDelta < -0.05) helped++; else if (r.looDelta > 0.05) hurt++; else same++; }
  const d = r.looDelta == null ? "   -" : (r.looDelta > 0 ? "+" : "") + r.looDelta;
  console.log(
    `  ${String(r.name).padEnd(16)} ${String(r.capturedRead).padStart(5)} |` +
    `${String(r.rowsOnly.read).padStart(5)} ${String(r.rowsOnly.looPx).padStart(6)} ${String(r.rowsOnly.ms).padStart(4)} |` +
    `${String(r.both.read).padStart(5)} ${String(r.both.looPx).padStart(6)} ${String(r.both.axisOnly).padStart(6)}` +
    ` ${String(r.both.conflicts).padStart(3)} ${String(r.both.ms).padStart(4)} |` +
    ` ${d.padStart(6)} ${(r.readDelta > 0 ? "+" : "") + r.readDelta}`
  );
}
{
  // A mismatch against the capture-time count is only bad in one direction.
  // The detector has moved since these were captured, so read MORE is the
  // whole point; read FEWER is the regression to watch.
  const g = out.filter((r: any) => r.capturedRead != null && r.rowsOnly);
  const more = g.filter((r: any) => r.rowsOnly.read > r.capturedRead);
  const fewer = g.filter((r: any) => r.rowsOnly.read < r.capturedRead);
  const eq = g.filter((r: any) => r.rowsOnly.read === r.capturedRead);
  const sumCap = g.reduce((a: number, r: any) => a + r.capturedRead, 0);
  const sumNow = g.reduce((a: number, r: any) => a + r.rowsOnly.read, 0);
  console.log(`\nshipping detector vs the settings each case was captured with, over ${g.length} case(s):`);
  console.log(`  ${more.length} read MORE, ${fewer.length} read FEWER, ${eq.length} unchanged` +
    `   (${sumCap} -> ${sumNow} marks, ${sumNow - sumCap >= 0 ? "+" : ""}${sumNow - sumCap})`);
  if (fewer.length)
    console.log(`  regressions: ${fewer.map((r: any) => `${r.name} ${r.capturedRead}->${r.rowsOnly.read}`).join(", ")}`);
}
console.log(`leave-one-out vs rows-only:  ${helped} better, ${hurt} WORSE, ${same} unchanged`);
const worst = out.filter((r: any) => r.looDelta != null).sort((a: any, b: any) => b.looDelta - a.looDelta)[0];
if (worst && worst.looDelta > 0.05)
  console.log(`worst regression: ${worst.name}  loo ${worst.rowsOnly.looPx} -> ${worst.both.looPx}px` +
    `  (axisOnly ${worst.both.axisOnly}, conflicts ${worst.both.conflicts}, worstCross ${worst.both.worstCrossPx}px)`);

// --- label audit ----------------------------------------------------------
// Independent of the detector: can a rigid honeycomb explain the stored label
// positions at all? Labels that cannot be are not ground truth, whatever the
// capture-time rms said.
const aud = out.filter((r: any) => r.truthAudit && r.truthAudit.looPx != null);
if (aud.length) {
  const bad = aud.filter((r: any) => r.truthAudit.looPx > 4).sort((a: any, b: any) => b.truthAudit.looPx - a.truthAudit.looPx);
  const looAll = aud.map((r: any) => r.truthAudit.looPx).sort((a: number, b: number) => a - b);
  console.log(`\nlabel audit -- fitting the rigid hex to the FROZEN labels (${aud.length} case(s)):`);
  console.log(`  label self-consistency (leave-one-out): median ${looAll[looAll.length >> 1].toFixed(2)}px, worst ${looAll[looAll.length - 1].toFixed(2)}px`);
  if (bad.length) {
    console.log(`  ${bad.length} case(s) whose labels a rigid hex CANNOT explain (>4px):`);
    for (const r of bad)
      console.log(`    ${String(r.name).padEnd(16)} n=${r.truthAudit.n}  rms ${r.truthAudit.rmsPx}px  loo ${r.truthAudit.looPx}px` +
        (r.truthAudit.looId != null ? `  worst id ${r.truthAudit.looId}` : ""));
  } else {
    console.log("  no case exceeds 4px — labels are internally consistent");
  }
}

// --- merge policy comparison, all scored on the same two passes -----------
const graded = out.filter((r: any) => r.policies && r.rowsOnly.looPx != null);
if (graded.length) {
  const names = graded[0].policies.map((p: any) => p.name);
  console.log(`\nmerge policy vs rows-only, over ${graded.length} case(s) with a scorable plane:`);
  console.log("  policy            better  WORSE  same |  median loo  worst loo");
  const baseline = graded.map((r: any) => r.rowsOnly.looPx);
  const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return +s[s.length >> 1].toFixed(2); };
  console.log(`  ${"(rows-only)".padEnd(16)} ${"-".padStart(6)} ${"-".padStart(6)} ${"-".padStart(5)} |` +
    ` ${String(med(baseline)).padStart(10)} ${String(Math.max(...baseline).toFixed(2)).padStart(10)}`);
  for (const n of names) {
    let better = 0, worseN = 0, sameN = 0; const vals: number[] = [];
    for (const r of graded) {
      const p = r.policies.find((z: any) => z.name === n);
      if (!p || p.looPx == null) continue;
      vals.push(p.looPx);
      const d = p.looPx - r.rowsOnly.looPx;
      if (d < -0.05) better++; else if (d > 0.05) worseN++; else sameN++;
    }
    if (!vals.length) continue;
    console.log(`  ${n.padEnd(16)} ${String(better).padStart(6)} ${String(worseN).padStart(6)} ${String(sameN).padStart(5)} |` +
      ` ${String(med(vals)).padStart(10)} ${String(Math.max(...vals).toFixed(2)).padStart(10)}`);
  }
}
await browser.close();
