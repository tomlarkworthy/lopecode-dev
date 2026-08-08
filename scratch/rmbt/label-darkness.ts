// Is a label on a mark? Asked of the pixels, not of the detector -- and then used to decide.
//
// Every other claim about these labels comes from the cascade, or from a plane fitted to the
// cascade's output. Neither can adjudicate between an old label and a new one, because both
// sides are the same instrument. The mark's own design can: manColor puts a dark disc at
// r < 6mm inside a light framing ring, out of R = 28.5mm. A point at a mark's centre has a
// dark core and a light collar; a point 20px away has neither.
//
//   score = mean(collar at 0.25..0.32 R) - mean(core at < 0.12 R)
//
// This is what caught the first pass: every label the plane PREDICTED scored worse than the
// one it replaced, and every label measured from 8+ directions scored better. So the rule is
// that a candidate must be measured, and the image has to agree before it is written.
//
//   bun scratch/rmbt/label-darkness.ts            # report only
//   bun scratch/rmbt/label-darkness.ts --write    # patch data/hexcases/*.json (backed up first)
import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { importNotebookModule } from "../../tools/notebook-import.ts";

// The seven marks are coplanar by construction, so one homography accounts for all of them.
// That is the set-level check the per-label pixel test cannot make, and it is what caught the
// first write: a case with five corrected labels and two stale ones is inconsistent with ANY
// plane, and is worse to train on than either set whole.
(globalThis as any).window = {
  performance,
  lopecode: { contentSync: () => ({ status: 404, mime: "application/octet-stream", bytes: new Uint8Array(0) }) },
};
const { Runtime } = await import("../../tools/node_modules/@observablehq/runtime/src/index.js");
if (!(Runtime as any).prototype.fileAttachments) (Runtime as any).prototype.fileAttachments = () => () => ({});
const nbm = await importNotebookModule("modules/@tomlarkworthy/coded-landmark-tracking.js");
const fitHomography: any = await nbm.value("fitHomography");
const hexTarget: any = await nbm.value("hexTarget");

const planeFrom = (labels: any[]) => {
  const pairs = labels.filter((t) => hexTarget.byId.has(t.id))
    .map((t) => { const mk = hexTarget.byId.get(t.id); return { sx: mk.xMm, sy: mk.yMm, dx: t.x, dy: t.y, id: t.id }; });
  return pairs.length >= 4 ? fitHomography(pairs) : null;
};
const looOf = (labels: any[]) => {
  const pairs = labels.filter((t) => hexTarget.byId.has(t.id))
    .map((t) => { const mk = hexTarget.byId.get(t.id); return { sx: mk.xMm, sy: mk.yMm, dx: t.x, dy: t.y, id: t.id }; });
  if (pairs.length < 5) return null;
  let worst = 0;
  for (let i = 0; i < pairs.length; i++) {
    const fit = fitHomography(pairs.filter((_, j) => j !== i));
    if (!fit) continue;
    const [px, py] = fit.map(pairs[i].sx, pairs[i].sy);
    worst = Math.max(worst, Math.hypot(px - pairs[i].dx, py - pairs[i].dy));
  }
  return +worst.toFixed(2);
};

const DIR = resolve("data/hexcases");
const BACKUP = resolve("scratch/rmbt/hexcases-backup");
const WRITE = process.argv.includes("--write");
const NEW = JSON.parse(readFileSync(resolve("scratch/rmbt/dense-labels.json"), "utf8"));
const newBy = new Map(NEW.map((r: any) => [r.name, r]));

// Calibrated, not guessed. Labels that 8+ directions confirmed within 2px of where they already
// were -- two independent things agreeing -- score p01=23, p05=28, p50=66. So 40 vetoes about
// one in seven KNOWN-GOOD labels, which is not a veto, it is noise. The score's job is to catch
// a measurement that is plainly not on a mark; the evidence FOR a measurement is the 12
// directions agreeing to sub-pixel rms and the seven-point plane closing to 0.2px.
const ON = 22;        // below p01 of confirmed-good labels
const SLACK = 25;     // a candidate may not be dramatically worse than what it replaces
const MARK = 40;      // "clearly on a mark", used for reporting only
const MIN_SET = 5;    // measured marks before a case is relabelled at all (4 = no redundancy)

const sample = (gray: Buffer, w: number, h: number, cx: number, cy: number, r0: number, r1: number) => {
  let s = 0, n = 0;
  const R = Math.ceil(r1);
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy);
      if (d < r0 || d > r1) continue;
      const x = Math.round(cx + dx), y = Math.round(cy + dy);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      s += gray[y * w + x]; n++;
    }
  }
  return n ? s / n : null;
};

const score = (gray: Buffer, w: number, h: number, x: number, y: number, R: number) => {
  if (!(R > 4)) return null;
  const core = sample(gray, w, h, x, y, 0, Math.max(1.5, 0.12 * R));
  const collar = sample(gray, w, h, x, y, 0.25 * R, 0.32 * R);
  if (core == null || collar == null) return null;
  return +(collar - core).toFixed(1);
};

const names = readdirSync(DIR).filter((f) => f.endsWith(".gray")).map((f) => f.slice(0, -5)).sort();
const rows: any[] = [];
const perCase: any[] = [];

for (const n of names) {
  // Always decide against the ORIGINAL capture, never against a previous run's output, so
  // re-running with a changed rule cannot compound on itself.
  const orig = resolve(BACKUP, n + ".json");
  const meta = JSON.parse(readFileSync(existsSync(orig) ? orig : resolve(DIR, n + ".json"), "utf8"));
  const gray = readFileSync(resolve(DIR, n + ".gray"));
  if (gray.length !== meta.w * meta.h) continue;
  const nu = newBy.get(n) as any;
  if (!nu) continue;
  const truth: any[] = [];
  const quality: any[] = [];
  const accepted: any[] = [];
  for (const t of meta.truth ?? []) {
    const cand = nu.truth.find((z: any) => z.id === t.id);
    const q = nu.quality.find((z: any) => z.id === t.id) ?? {};
    // Both positions are scored at the SAME radius, so the comparison is about position only --
    // the collar sits at a fixed fraction of R, so two different radii sample two different
    // rings. Which radius: the MEASURED one when there is one. Scoring at the captured radius
    // was the first attempt and it fails exactly where it matters -- on a frame whose labels
    // are on the wrong marks the captured radii are wrong too, so a correct new position gets
    // scored through a collar of the wrong size and reads as a miss (hexcase-6ib0-12 id 22:
    // dead centre on the mark, scored -18).
    const R = cand && q.src === "measured" && cand.radiusPx > 4 ? cand.radiusPx : t.radiusPx;
    const sOld = score(gray, meta.w, meta.h, t.x, t.y, R);
    const sNew = cand ? score(gray, meta.w, meta.h, cand.x, cand.y, R) : null;
    const measured = q.src === "measured";
    const agrees = measured && sNew != null && sNew >= ON && (sOld == null || sNew >= sOld - SLACK);
    accepted.push({ t, cand, q, agrees, sOld, sNew });
    rows.push({ case: n, id: t.id, state: t.state, cand: q.src, dirs: q.dirs, rms: q.rms, moved: q.moved, sOld, sNew, agrees });
  }

  // Whole case or nothing. Below MIN_SET the plane has no redundancy, so neither the accepted
  // labels nor a prediction from them can be trusted, and mixing corrected labels with stale
  // ones produces a set no plane fits.
  const good = accepted.filter((a) => a.agrees);
  const relabel = good.length >= MIN_SET;
  const plane = relabel ? planeFrom(good.map((a) => a.cand)) : null;
  for (const a of accepted) {
    let x = a.t.x, y = a.t.y, src = "captured";
    if (relabel && a.agrees) { x = a.cand.x; y = a.cand.y; src = "measured"; }
    else if (relabel && plane && hexTarget.byId.has(a.t.id)) {
      // a prediction is only offered off a REDUNDANT fit; off 3-4 points it threw labels 400px
      const mk = hexTarget.byId.get(a.t.id);
      const p = plane.map(mk.xMm, mk.yMm);
      x = +p[0].toFixed(1); y = +p[1].toFixed(1); src = "predicted";
    }
    truth.push({ id: a.t.id, x, y, radiusPx: a.t.radiusPx, state: a.t.state });
    quality.push({
      id: a.t.id, src,
      dirs: a.q.dirs ?? 0, rms: a.q.rms ?? null,
      score: src === "measured" ? a.sNew : a.sOld,
      onMark: (src === "measured" ? a.sNew : a.sOld) != null && (src === "measured" ? a.sNew! : a.sOld!) > MARK,
      moved: +Math.hypot(x - a.t.x, y - a.t.y).toFixed(1),
    });
  }
  perCase.push({
    name: n, w: meta.w, h: meta.h, relabelled: relabel, measured: good.length,
    planeRms: plane ? +plane.rmsResidual.toFixed(2) : null,
    looBefore: looOf(meta.truth ?? []), looAfter: looOf(truth),
    truth, quality, meta,
  });
}

const q = (a: number[], p: number) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.round(p * (a.length - 1)))];
const stat = (a: number[]) => a.length ? `n=${String(a.length).padStart(4)} p10=${q(a, 0.1).toFixed(0).padStart(4)} p50=${q(a, 0.5).toFixed(0).padStart(4)} mean=${(a.reduce((s, x) => s + x, 0) / a.length).toFixed(0).padStart(4)}` : "n=0";

console.log("=== contrast score (collar - core), higher = the label sits on a mark ===");
for (const grp of ["read", "located", "missing", "misplaced"]) {
  const g = rows.filter((r) => r.state === grp && r.sOld != null && r.sNew != null);
  if (!g.length) continue;
  const acc = g.filter((r) => r.agrees);
  console.log(`${grp.padEnd(10)} old      ${stat(g.map((r) => r.sOld))}   on-mark ${g.filter((r) => r.sOld > MARK).length}/${g.length}`);
  console.log(`${"".padEnd(10)} accepted ${stat(g.map((r) => (r.agrees ? r.sNew : r.sOld)))}   on-mark ${g.filter((r) => (r.agrees ? r.sNew : r.sOld) > MARK).length}/${g.length}   (${acc.length} replaced)`);
}

const relab = perCase.filter((c) => c.relabelled);
const moved = rows.filter((r) => r.agrees && r.moved > 5);
console.log(`\n=== decision (whole case or nothing, ${MIN_SET}+ measured marks required) ===`);
console.log(`  cases relabelled    ${relab.length} / ${perCase.length}`);
console.log(`  labels measured     ${perCase.flatMap((c) => c.quality).filter((q: any) => q.src === "measured").length}`);
console.log(`  labels predicted    ${perCase.flatMap((c) => c.quality).filter((q: any) => q.src === "predicted").length}   (off a redundant plane, in relabelled cases only)`);
console.log(`  labels as captured  ${perCase.flatMap((c) => c.quality).filter((q: any) => q.src === "captured").length}`);
console.log(`  moved >5px          ${perCase.flatMap((c) => c.quality).filter((q: any) => q.moved > 5).length}   >20px ${perCase.flatMap((c) => c.quality).filter((q: any) => q.moved > 20).length}`);

const laf = relab.map((c) => c.looAfter).filter((x) => x != null) as number[];
const lbf = relab.map((c) => c.looBefore).filter((x) => x != null) as number[];
console.log(`\n=== leave-one-out over the label set itself, relabelled cases (px) ===`);
console.log(`  before ${stat(lbf)}  max=${Math.max(...lbf).toFixed(1)}`);
console.log(`  after  ${stat(laf)}  max=${Math.max(...laf).toFixed(1)}`);
console.log(`  NOTE: "before" is near zero because the captured labels were GENERATED by a`);
console.log(`  fitted plane, so they satisfy one by construction. It grades consistency, not`);
console.log(`  accuracy -- a set can be perfectly planar and sit entirely off the marks.`);
console.log(`  What it does catch is a set that is internally contradictory.`);
console.log(`\n  worst LOO after relabelling:`);
for (const c of relab.slice().sort((a, b) => (b.looAfter ?? 0) - (a.looAfter ?? 0)).slice(0, 10))
  console.log(`    ${c.name.padEnd(20)} loo=${String(c.looAfter).padStart(7)}  planeRms=${c.planeRms}  measured=${c.measured}  ${c.quality.filter((q: any) => q.src === "predicted").length} predicted`);
console.log(`\n  biggest accepted corrections:`);
for (const r of moved.sort((a, b) => b.moved - a.moved).slice(0, 12))
  console.log(`    ${r.case.padEnd(20)} id=${String(r.id).padEnd(3)} ${r.moved.toFixed(0).padStart(4)}px  score ${String(r.sOld).padStart(6)} -> ${r.sNew}  dirs=${r.dirs} rms=${r.rms}`);
console.log(`\n  cases NOT relabelled (too few measured marks): ${perCase.filter((c) => !c.relabelled).length}`);
console.log("    " + perCase.filter((c) => !c.relabelled).map((c) => `${c.name}(${c.measured})`).slice(0, 14).join("  "));

if (WRITE) {
  if (!existsSync(BACKUP)) mkdirSync(BACKUP, { recursive: true });
  let touched = 0;
  for (const c of perCase) {
    const src = resolve(DIR, c.name + ".json");
    // WRITE-ONCE. An unconditional copy here overwrote the pristine captures with this
    // script's own previous output on the second run -- the backup has to hold the capture,
    // not the last thing written.
    const bak = resolve(BACKUP, c.name + ".json");
    if (!existsSync(bak)) copyFileSync(src, bak);
    const out = { ...c.meta, truth: c.truth, labelQuality: c.quality, relabelled: c.relabelled, planeRms: c.planeRms, looPx: c.looAfter, labelledBy: "dense-label 12dir stride1 + pixel veto + plane" };
    writeFileSync(src, JSON.stringify(out, null, 1));
    touched++;
  }
  console.log(`\nwrote ${touched} case files; originals copied to ${BACKUP}`);
}
