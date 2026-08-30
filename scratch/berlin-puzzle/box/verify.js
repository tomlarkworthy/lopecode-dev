// Mondtresor verifier: full assembly simulation + mechanism state machine.
//  A. Assembly: every part swept along its real insertion path against all
//     previously placed parts (rings drop, keys press up, drawer slides in,
//     dropper falls down its channel, splines drop, lid slides in from front).
//  B. Mechanism states:
//     locked  = cams at 0deg, bolts extended       -> lid must NOT slide out
//     open    = cams at open angle, bolts retracted -> lid must slide out clean
//     upright = dropper down                        -> drawer must NOT slide
//     inverted= dropper raised                      -> drawer slides out clean
//  C. Cam sweep: full dial revolution, extended bolt never penetrates cam;
//     retraction blocked except at the open angle.
//  D. Static closed-pose pairwise scan, min-web cut integrity, fits audit.
import { parts, audits, BOLT, TRAVEL, DROPPER_RAISE } from "./design.js";
import { Solid, penetrates } from "../lib/solid.js";
import { rotatePoly, bbox, pointInPoly, distPointPoly } from "../lib/geom.js";

const byId = new Map(parts.map((p) => [p.id, p]));
const solids = new Map(parts.map((p) => [p.id, new Solid(p)]));
const report = { pass: [], fail: [], warn: [] };
const ok = (m) => report.pass.push(m);
const fail = (m) => report.fail.push(m);

// rotated-cam variants
function camSolid(id, deg) {
  const p = byId.get(id);
  const [cx, cy] = BOLT.find((b) => `CAM${b.id}` === id).cam;
  const rot = (pts) => rotatePoly(pts, deg, cx, cy);
  return new Solid({ ...p, outline: rot(p.outline), holes: p.holes.map(rot) });
}

// ---------------------------------------------------------------- helpers
// sweep a group of parts (with per-part extra offsets) along waypoints vs placed
function groupSweep(ids, way, placed, extra = {}, statesolids = {}) {
  const members = ids.map((id) => ({ id, S: statesolids[id] || solids.get(id), off: extra[id] || [0, 0, 0] }));
  const placedS = placed.filter((pid) => !ids.includes(pid)).map((pid) => ({ id: pid, S: statesolids[pid] || solids.get(pid) }));
  let steps = 0;
  const wps = [...way, [0, 0, 0]];
  for (let leg = 0; leg + 1 < wps.length; leg++) {
    const a = wps[leg], b = wps[leg + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(2, Math.ceil(len / 0.8));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const off = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      for (const m of members) {
        const mo = [off[0] + m.off[0], off[1] + m.off[1], off[2] + m.off[2]];
        for (const q of placedS) {
          const pen = penetrates(m.S, q.S, mo);
          if (pen) return { hit: { part: m.id, vs: q.id, off, at: pen.at } };
        }
      }
      steps++;
    }
  }
  return { steps };
}

// must-collide test: group displaced by dir penetrates something
function mustCollide(ids, dir, placed, extra = {}, statesolids = {}) {
  for (const id of ids) {
    const S = statesolids[id] || solids.get(id);
    const base = extra[id] || [0, 0, 0];
    const off = [dir[0] + base[0], dir[1] + base[1], dir[2] + base[2]];
    for (const pid of placed) {
      if (ids.includes(pid)) continue;
      const QS = statesolids[pid] || solids.get(pid);
      if (penetrates(S, QS, off, 0.15)) return { part: id, vs: pid };
    }
  }
  return null;
}

// ------------------------------------------------------- assembly sequence
const LID_IDS = ["RUNNER", "LFRAME", "LTOP", "BOLTA", "BOLTB", "CAMA", "CAMB", "NECKA", "NECKB", "KNOBA", "KNOBB", "DKEYA", "DKEYB", "RK0", "RK1", "RK2", "RK3"];
const DRAWER_IDS = parts.filter((p) => p.kind === "drawer").map((p) => p.id);
const SEQ = [
  { ids: ["L00"], way: [] },
  { ids: ["L01"], way: [[0, 0, 25]] },
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({ ids: [`K${i}`], way: [[0, 0, -12]] })),
  { ids: ["L02"], way: [[0, 0, 25]] }, { ids: ["L03"], way: [[0, 0, 25]] },
  { ids: ["L04"], way: [[0, 0, 25]] }, { ids: ["L05"], way: [[0, 0, 25]] },
  { ids: DRAWER_IDS, way: [[0, 55, 0]], label: "drawer (slides in from back)" },
  { ids: ["L06"], way: [[0, 0, 25]] },
  ...[7, 8, 9, 10, 11, 12, 13, 14].map((k) => ({ ids: [`L${String(k).padStart(2, "0")}`], way: [[0, 0, 25]] })),
  { ids: ["DROP"], way: [[0, 0, 38]], label: "dropper (falls down its channel)" },
  { ids: ["L15"], way: [[0, 0, 25]] },
  { ids: ["L16"], way: [[0, 0, 25]] },
  // front/back splines drop in BEFORE the groove/rim rings close over them
  ...parts.filter((p) => p.kind === "spline" && p.id !== "SPML" && p.id !== "SPMR").map((p) => ({ ids: [p.id], way: [[0, 0, 62]] })),
  { ids: ["L17"], way: [[0, 0, 25]] }, { ids: ["L18"], way: [[0, 0, 25]] },
  ...["SPML", "SPMR"].map((id) => ({ ids: [id], way: [[0, 0, 62]] })),
  {
    ids: LID_IDS, way: [[0, -112, 0]], label: "lid (slides in from front, dials open)",
    extra: { BOLTA: [TRAVEL, 0, 0], BOLTB: [TRAVEL, 0, 0] },
    statesolids: { CAMA: camSolid("CAMA", BOLT[0].open), CAMB: camSolid("CAMB", BOLT[1].open) },
  },
];

const placed = [];
for (const step of SEQ) {
  const label = step.label || step.ids.join(",");
  if (!step.way.length) { placed.push(...step.ids); ok(`assembly: ${label} placed (seed)`); continue; }
  const res = groupSweep(step.ids, step.way, placed, step.extra, step.statesolids);
  if (res.hit) fail(`ASSEMBLY ${label}: ${res.hit.part} collides ${res.hit.vs} at offset [${res.hit.off.map((v) => v.toFixed(1))}] world [${res.hit.at.map((v) => v.toFixed(1))}]`);
  else ok(`assembly: ${label} sweeps in clean (${res.steps} poses)`);
  placed.push(...step.ids);
}

// after lid inserted with dials open, dials turn to locked; bolts extend.
// check extended-static pose is clean:
{
  const state = {}; // cams at 0 deg = as drawn; bolts at drawn (extended) = no offsets
  let bad = null;
  for (const id of ["BOLTA", "BOLTB"]) {
    for (const q of placed) {
      if (q === id) continue;
      const pen = penetrates(solids.get(id), solids.get(q), [0, 0, 0]);
      if (pen) { bad = { id, q, at: pen.at }; break; }
    }
  }
  if (bad) fail(`STATIC locked pose: ${bad.id} penetrates ${bad.q} at [${bad.at.map((v) => v.toFixed(1))}]`);
  else ok("static: locked pose clean (bolts extended into rim notches)");
}

// ------------------------------------------------------- mechanism states
// M1 locked: lid must not slide out; bolts must not retract
{
  const hit = mustCollide(LID_IDS, [0, -3, 0], placed);
  if (hit) ok(`lock: lid blocked sliding out (tooth ${hit.part} vs ${hit.vs})`);
  else fail("LOCK: lid slides out while LOCKED");
  for (const b of BOLT) {
    const hit2 = mustCollide([`BOLT${b.id}`], [TRAVEL, 0, 0], placed);
    if (hit2) ok(`lock: bolt ${b.id} retraction blocked by cam edge (${hit2.vs})`);
    else fail(`LOCK: bolt ${b.id} retracts with dial at wrong angle`);
  }
  const up = mustCollide(LID_IDS, [0, 0, 2.4], placed);
  if (up) ok(`lock: lid cannot lift (rim overhang, ${up.part} vs ${up.vs})`);
  else fail("LOCK: lid lifts straight up");
}
// M2 open: bolts retract clean, lid slides out clean
{
  const state = { CAMA: camSolid("CAMA", BOLT[0].open), CAMB: camSolid("CAMB", BOLT[1].open) };
  for (const b of BOLT) {
    const res = groupSweep([`BOLT${b.id}`], [[0, 0, 0]], placed, {}, state); // static probe at 0
    const sweep = (() => {
      // manual sweep 0 -> +TRAVEL
      for (let t = 0; t <= 1.001; t += 0.1) {
        const off = [TRAVEL * t, 0, 0];
        for (const q of placed) {
          if (q === `BOLT${b.id}`) continue;
          const QS = state[q] || solids.get(q);
          if (penetrates(solids.get(`BOLT${b.id}`), QS, off)) return { q, t };
        }
      }
      return null;
    })();
    if (sweep) fail(`OPEN: bolt ${b.id} retraction hits ${sweep.q} at t=${sweep.t.toFixed(2)}`);
    else ok(`open: bolt ${b.id} retracts fully at dial angle ${b.open}`);
  }
  const res = groupSweep(
    LID_IDS.map((x) => x), [[0, 0, 0]], placed, {}, state,
  );
  // outward slide: simulate reversed (sweep group along -y out to -112): reuse groupSweep with waypoints from 0 -> -112 by giving way=[[0,0,0]] then manual:
  let hit = null;
  outer: for (let t = 0; t <= 1.001; t += 1 / 150) {
    const off = [0, -112 * t, 0];
    for (const id of LID_IDS) {
      const base = id.startsWith("BOLT") ? [TRAVEL, 0, 0] : [0, 0, 0];
      const S = state[id] || solids.get(id);
      const mo = [off[0] + base[0], off[1] + base[1], off[2] + base[2]];
      for (const q of placed) {
        if (LID_IDS.includes(q)) continue;
        const QS = state[q] || solids.get(q);
        if (penetrates(S, QS, mo)) { hit = { id, q, t }; break outer; }
      }
    }
  }
  if (hit) fail(`OPEN: lid extraction hits ${hit.q} via ${hit.id} at t=${hit.t.toFixed(2)}`);
  else ok("open: lid slides fully out of the front, clean");
}
// M3 cam full-revolution sweep with extended bolt
{
  for (const b of BOLT) {
    let bad = null, retractSomewhereElse = null;
    for (let a = 0; a < 360; a += 7.5) {
      const cs = camSolid(`CAM${b.id}`, a);
      if (penetrates(solids.get(`BOLT${b.id}`), cs, [0, 0, 0])) { bad = a; break; }
      // retraction attempt: allowed near open angle only
      const diff = ((a - b.open) % 360 + 540) % 360 - 180; // [-180,180)
      const isOpen = Math.abs(diff) <= 14;
      const canRetract = !penetrates(solids.get(`BOLT${b.id}`), cs, [TRAVEL, 0, 0], 0.15);
      if (canRetract && !isOpen) { retractSomewhereElse = a; break; }
    }
    if (bad !== null) fail(`CAM ${b.id}: extended bolt jams cam at dial=${bad}`);
    else ok(`cam ${b.id}: dial spins full revolution without jamming`);
    if (retractSomewhereElse !== null) fail(`CAM ${b.id}: bolt retracts at wrong dial angle ${retractSomewhereElse}`);
    else ok(`cam ${b.id}: retraction possible ONLY at the marked angle`);
  }
}
// M4 drawer: locked upright, opens inverted
{
  const hit = mustCollide(DRAWER_IDS, [0, 4, 0], placed);
  if (hit) ok(`drawer: locked upright (${hit.part} vs ${hit.vs})`);
  else fail("DRAWER: slides out while dropper engaged");
  // inverted: dropper raised
  const state = {};
  const dropRaised = [0, 0, DROPPER_RAISE];
  let bad = null;
  outer2: for (let t = 0; t <= 1.001; t += 1 / 80) {
    const off = [0, 58 * t, 0];
    for (const id of DRAWER_IDS) {
      for (const q of placed) {
        if (DRAWER_IDS.includes(q)) continue;
        const extra = q === "DROP" ? dropRaised : [0, 0, 0];
        // displace dropper: emulate by shifting drawer opposite? penetrates(A,B,offset) supports only A offset.
        // do the check as: dropper-vs-drawer with dropper offset:
        if (q === "DROP") {
          if (penetrates(solids.get("DROP"), solids.get(id), [dropRaised[0] - off[0], dropRaised[1] - off[1], dropRaised[2] - off[2]])) { bad = { id, q, t }; break outer2; }
        } else if (penetrates(solids.get(id), solids.get(q), off)) { bad = { id, q, t }; break outer2; }
      }
    }
  }
  if (bad) fail(`DRAWER inverted: hits ${bad.q} via ${bad.id} at t=${bad.t.toFixed(2)}`);
  else ok("drawer: with box inverted (dropper clear) it glides fully out");
  // dropper raised must clear everything statically
  let sbad = null;
  for (const q of placed) {
    if (q === "DROP") continue;
    if (penetrates(solids.get("DROP"), solids.get(q), dropRaised)) { sbad = q; break; }
  }
  if (sbad) fail(`DROPPER raised position collides ${sbad}`);
  else ok("dropper: raised position sits clean inside its channel");
}
// M5 splines captive when lid closed
{
  for (const p of parts.filter((q) => q.kind === "spline")) {
    const hit = mustCollide([p.id], [0, 0, 4], placed);
    if (hit) ok(`spline ${p.id}: capped by the closed lid (${hit.vs})`);
    else fail(`SPLINE ${p.id}: can be extracted with the lid closed`);
  }
}
// D static pairwise at closed pose
{
  let bad = null;
  const list = [...placed];
  for (let i = 0; i < list.length && !bad; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const pen = penetrates(solids.get(list[i]), solids.get(list[j]), [0, 0, 0]);
      if (pen) { bad = { a: list[i], b: list[j], at: pen.at }; break; }
    }
  }
  if (bad) fail(`STATIC: ${bad.a} penetrates ${bad.b} at [${bad.at.map((v) => v.toFixed(1))}]`);
  else ok("static: closed pose has zero pairwise penetrations");
}
// E min web
function minWeb(part, minGap) {
  const issues = [];
  const H = part.holes;
  for (let i = 0; i < H.length; i++) {
    let dEdge = Infinity;
    for (const p of H[i]) dEdge = Math.min(dEdge, distPointPoly(p, part.outline));
    if (dEdge < minGap) issues.push(`hole${i}->outline ${dEdge.toFixed(2)}mm`);
    for (let k = i + 1; k < H.length; k++) {
      const bbA = bbox(H[i]), bbB = bbox(H[k]);
      if (bbA.x0 > bbB.x1 + minGap || bbB.x0 > bbA.x1 + minGap || bbA.y0 > bbB.y1 + minGap || bbB.y0 > bbA.y1 + minGap) continue;
      let d = Infinity;
      for (const p of H[i]) d = Math.min(d, distPointPoly(p, H[k]));
      for (const p of H[k]) d = Math.min(d, distPointPoly(p, H[i]));
      if (d < minGap) issues.push(`hole${i}<->hole${k} ${d.toFixed(2)}mm`);
    }
  }
  return issues;
}
for (const p of parts) {
  if (!p.holes.length) continue;
  const min = p.kind === "layer" ? 1.9 : 1.2;
  const issues = minWeb(p, min);
  if (issues.length) issues.forEach((i) => fail(`WEB ${p.id}: ${i}`));
  else ok(`web: ${p.id} ok (${p.holes.length} holes)`);
}
// F fits audit from design
for (const a of audits) {
  if (a.ok) ok(`fit: ${a.name} = ${a.actual.toFixed(2)}`);
  else fail(`FIT ${a.name}: ${a.actual} want ${a.want}`);
}

// ---------------------------------------------------------------- report
console.log(`\n=== BOX VERIFICATION ${report.fail.length ? "FAILED" : "PASSED"} ===`);
console.log(`${report.pass.length} pass, ${report.fail.length} fail\n`);
for (const f of report.fail) console.log("  FAIL", f);
if (process.argv.includes("--verbose")) for (const p of report.pass) console.log("  ok  ", p);
process.exit(report.fail.length ? 1 : 0);
