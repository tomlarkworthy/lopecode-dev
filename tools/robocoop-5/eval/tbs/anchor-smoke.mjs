// df33: a cell enters the core only with evidence anchored in the task's data.
//
// Oracle mode, no model calls, over attest-fixture.mjs MODULE_ANCHOR:
//   page A  globalThis.__rc5SeedRoots = ["/local-disk/task/data"] pre-boot (GIVEN_INIT_SCRIPT).
//           (b) synthetic-only attestations record but do not make a core cell; (c) an evidence
//           reading `load` whose numbers move on destroyed data is real-anchored; (d) one that reads
//           `load` but ignores it is demoted; (e) nullchecks: on the task's data anchored with no
//           sensitivity run, on invented noise synthetic; (f) a function-cell loader is replaced by a
//           destroying wrapper; (g) an evidence slow on destroyed data is unmeasured (~60 s);
//           (h) destroy() on the four shapes; plus the df33 tool-result cap (20x8 table, 8 kB text).
//   page B  no global: (a) a synthetic-only cell enters the core exactly as on df32.
// On df32 (the control, gated by the bundle name) cases b-g must not fire: every cell attested
// twice is in the core, and no anchoring text appears anywhere.
// df34 (gated like df33): (i) destroy() REDRAWS numeric columns within [min, max] instead of
// permuting them, so refCad — a cadence reference that uses only loadC's sorted time stamps — is
// real-anchored on df34 and demoted on df33 (the control line); (j) a real-anchored nullcheck no longer
// completes a cell: estE (refSynE + nullReal) is out of the core with the null-only sentence until the
// sensitive reference refRealE is recorded.
// df35 (k): only rows the mutant breaks are compared on destroyed data. ev6 demoted; ev7 (+ a row
// asserting a real time stamp, which never calls lsq) demoted with the df35 sentence; ev8 (the
// recovered period as a number) real-anchored. Control df34: ev6 demoted, ev7 real-anchored.
//
//   node tbs/anchor-smoke.mjs [--notebook path]

import { join, resolve } from "node:path";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { MODULE_ANCHOR, GIVEN_INIT_SCRIPT } from "./attest-fixture.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df33.html")));
const df33plus = /df3[3-9]|df[4-9]\d/.test(notebook);
const df34plus = /df3[4-9]|df[4-9]\d/.test(notebook);
const df35plus = /df3[5-9]|df[4-9]\d/.test(notebook);

const M = "@test/anchor";
const PATH = "/src/@test/anchor.js";
const at = (cell, evidence, kind) => ({ tool: "attest", args: { module: M, cell, evidence, ...(kind ? { kind } : {}) } });
const cs = () => ({ tool: "core_status", args: { module: M } });
const ev = (code) => ({ tool: "eval_js", args: { module: M, code } });

// (h) destroy() unit checks, run in the page against the bundle's own function.
const DESTROY_PROBE = `
  const d = globalThis.__rc5AnchorDestroy;
  if (typeof d !== 'function') return 'NO-DESTROY';
  const sorted = a => a.slice().sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const res = {};
  const recs = Array.from({length: 30}, (_, i) => ({ t: i, y: i * i, s: 'r' + i }));
  const r1 = d(recs), r2 = d(recs);
  res.recShape = r1.length === 30 && r1.every(r => same(Object.keys(r), ['t', 'y', 's'])) && ['t', 'y', 's'].every(k => same(sorted(r1.map(r => r[k])), sorted(recs.map(r => r[k]))));
  res.recBroken = r1.filter(r => r.y === r.t * r.t).length <= 3 && r1.filter(r => r.s === 'r' + r.t).length <= 3;
  res.recDet = same(r1, r2) && recs[5].y === 25;
  const nums = Array.from({length: 50}, (_, i) => i + 1);
  const n1 = d(nums);
  res.numShape = n1.length === 50 && same(sorted(n1), sorted(nums));
  res.numBroken = n1.filter((x, i) => x === i + 1).length <= 5;
  res.numDet = same(n1, d(nums));
  const csv = 't,y\\n' + Array.from({length: 25}, (_, i) => i + ',' + (2 * i)).join('\\n') + '\\n';
  const c1 = d(csv);
  const L = c1.split('\\n').filter(Boolean), L0 = csv.split('\\n').filter(Boolean);
  const col = (ls, j) => ls.slice(1).map(l => l.split(',')[j]);
  res.csvShape = typeof c1 === 'string' && L[0] === 't,y' && L.length === L0.length && same(sorted(col(L, 0)), sorted(col(L0, 0))) && same(sorted(col(L, 1)), sorted(col(L0, 1))) && c1.endsWith('\\n');
  res.csvBroken = L.slice(1).filter(l => { const [t, y] = l.split(',').map(Number); return y === 2 * t; }).length <= 3;
  res.csvDet = d(csv) === c1;
  const nested = { meta: { name: 'x', n: 5 }, series: { t: nums.slice(0, 20), y: nums.slice(0, 20).map(v => v * 3) }, rows: recs.slice(0, 10) };
  const o1 = d(nested);
  res.nestShape = same(Object.keys(o1), ['meta', 'series', 'rows']) && same(o1.meta, { name: 'x', n: 5 }) && o1.series.t.length === 20 && o1.rows.length === 10 && same(sorted(o1.series.y), sorted(nested.series.y));
  res.nestBroken = o1.series.t.filter((t, i) => o1.series.y[i] === 3 * t).length <= 3 && o1.rows.filter(r => r.y === r.t * r.t).length <= 2;
  res.nestDet = same(o1, d(nested));
  res.scalar = d(7) === 7 && d('plain text') === 'plain text' && d(null) === null;
  // df34: numeric columns are redrawn within their own [min, max]; integers stay integers.
  const inRange = (a, lo, hi, int) => a.every(v => typeof v === 'number' && v >= lo && v <= hi && (!int || Number.isInteger(v)));
  const moved = (a, b) => !same(sorted(a), sorted(b));
  res.r34recShape = r1.length === 30 && r1.every(r => same(Object.keys(r), ['t', 'y', 's'])) && inRange(r1.map(r => r.t), 0, 29, true) && inRange(r1.map(r => r.y), 0, 841, true) && same(sorted(r1.map(r => r.s)), sorted(recs.map(r => r.s)));
  res.r34recRedrawn = moved(r1.map(r => r.t), recs.map(r => r.t)) && moved(r1.map(r => r.y), recs.map(r => r.y));
  res.r34numShape = n1.length === 50 && inRange(n1, 1, 50, true) && moved(n1, nums);
  const fl = Array.from({length: 40}, (_, i) => i * 0.25 + 0.1);
  const f1 = d(fl);
  res.r34floatRedrawn = f1.length === 40 && inRange(f1, 0.1, 9.85, false) && f1.some(v => !Number.isInteger(v * 4)) && same(f1, d(fl));
  const csvF = 't,y,band\\n' + Array.from({length: 25}, (_, i) => (i * 0.5).toFixed(2) + ',' + (2 * i) + ',' + (i % 2 ? 'r' : 'g')).join('\\n') + '\\n';
  const cf = d(csvF);
  const LF = cf.split('\\n').filter(Boolean), LF0 = csvF.split('\\n').filter(Boolean);
  const colF = (ls, j) => ls.slice(1).map(l => l.split(',')[j]);
  res.r34csvShape = LF[0] === 't,y,band' && LF.length === LF0.length && cf.endsWith('\\n') && colF(LF, 0).every(c => /^\\d+\\.\\d\\d$/.test(c) && +c >= 0 && +c <= 12) && colF(LF, 1).every(c => /^\\d+$/.test(c) && +c <= 48) && same(sorted(colF(LF, 2)), sorted(colF(LF0, 2)));
  res.r34csvRedrawn = moved(colF(LF, 0), colF(LF0, 0)) && moved(colF(LF, 1), colF(LF0, 1)) && d(csvF) === cf;
  const k1 = d([{ a: 3, b: 1 }, { a: 3, b: 2 }, { a: 3, b: 9 }, { a: 3, b: 4 }]);
  res.r34constant = k1.every(r => r.a === 3) && same(d([5, 5, 5]), [5, 5, 5]);
  const h1 = d([1, NaN, 3, null, 5, 7, undefined, 9]);
  res.r34holes = h1.length === 8 && Number.isNaN(h1[1]) && h1[3] === null && h1[6] === undefined && inRange([h1[0], h1[2], h1[4], h1[5], h1[7]], 1, 9, true);
  const ta = new Float64Array(fl), t1 = d(ta);
  res.r34typed = t1 instanceof Float64Array && t1.length === 40 && inRange(Array.from(t1), 0.1, 9.85, false) && moved(Array.from(t1), fl);
  res.r34nested = same(o1.meta, { name: 'x', n: 5 }) && inRange(o1.series.y, 3, 60, true) && moved(o1.series.y, nested.series.y) && same(o1, d(nested));
  return 'DESTROY<<' + JSON.stringify(res) + '>>';
`;
// df33 cap: a 20x8 table of numbers and ~8 kB of text must arrive intact.
const TABLE_PROBE = `return Array.from({length: 20}, (_, i) => ({ a: i * 1000 + 0.5, b: i * 1000 + 1.5, c: i * 1000 + 2.5, d: i * 1000 + 3.5, e: i * 1000 + 4.5, f: i * 1000 + 5.5, g: i * 1000 + 6.5, h: i * 1000 + 7.5 }));`;
const TEXT_PROBE = `return Array.from({length: 400}, (_, i) => 'line' + String(i).padStart(4, '0') + '-abcdefghij').join('\\n');`;

const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail && !ok ? "\n       " + String(detail).replace(/\n/g, "\n       ") : ""}`); };
const info = (name, ok) => console.log(`INFO ${name}: ${ok}`);
const toolOuts = (r) => (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
const lineOf = (s, re) => String(s || "").split("\n").find((l) => re.test(l)) || "";
const coreLine = (s) => lineOf(s, /^CORE \(/);
const inCore = (s, n) => new RegExp(`\\b${n}\\b`).test(coreLine(s).replace(/^CORE \([^)]*\)/, ""));
const SENT = (n) => new RegExp(`${n} → no REAL-ANCHORED evidence: every attestation of ${n} reads only invented data — attest ${n} with an evidence cell whose inputs include the task's data`);

const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 600000, oracle: true });
let rA, rB;
const t0 = Date.now();
try {
  rA = await driver.runQuestion({
    id: "anchor-A", question: "anchor A",
    setup: { files: { [PATH]: MODULE_ANCHOR }, initScript: GIVEN_INIT_SCRIPT },
    oracle: [
      at("est", "refSyn"),                    // 0 synthetic
      at("est", "nullSyn", "nullcheck"),      // 1 nullcheck with no given upstream: synthetic
      cs(),                                   // 2 est NOT in core, sentence
      at("est", "refReal"),                   // 3 real-anchored -> IN CORE
      cs(),                                   // 4 anchored: yes (by refReal)
      at("estD", "refConstD"),                // 5 demoted: insensitive
      at("estD", "nullSynD", "nullcheck"),    // 6 synthetic
      at("estE", "nullReal", "nullcheck"),    // 7 anchored, no sensitivity run
      at("estE", "refSynE"),                  // 8 -> IN CORE
      at("est2", "refFn"),                    // 9 function loader: wrapper path
      at("est2", "refSyn2"),                  // 10 -> IN CORE
      at("estG", "refSlow"),                  // 11 unmeasured (~60 s)
      at("estG", "nullSynG", "nullcheck"),    // 12
      cs(),                                   // 13
      ev(DESTROY_PROBE),                      // 14
      ev(TABLE_PROBE),                        // 15
      ev(TEXT_PROBE),                         // 16
      at("pfind", "refSynP"),                 // 17 synthetic
      at("pfind", "refCad"),                  // 18 df34: real-anchored -> IN CORE; df33: demoted
      at("estE", "refRealE"),                 // 19 df34: the reference beyond the null -> IN CORE
      cs(),                                   // 20
      at("lsq", "ev6"),                       // 21 df34+: demoted
      at("lsq", "ev7"),                       // 22 df35: demoted (df35 sentence); df34: real-anchored
      at("lsq", "ev8"),                       // 23 df35: real-anchored
    ],
  });
  rB = await driver.runQuestion({
    id: "anchor-B", question: "anchor B",
    setup: { files: { [PATH]: MODULE_ANCHOR } },
    oracle: [at("est", "refSyn"), at("est", "nullSyn", "nullcheck"), cs()],
  });
} finally { await driver.close(); }
console.log(`(ran in ${Math.round((Date.now() - t0) / 1000)} s, notebook ${notebook.split("/").pop()}, df33 rules ${df33plus ? "ON" : "OFF (control)"})`);

const a = toolOuts(rA), b = toolOuts(rB);
check("page A: run", !rA.error, rA.error);
check("page B: run", !rB.error, rB.error);

// (a) no global: synthetic-only est enters the core, as on df32 — on every bundle.
check("(a) no global: est IN CORE on synthetic evidence alone", /est: IN CORE \(evidence: refSyn, nullSyn\)/.test(b[1] || ""), (b[1] || "").slice(0, 400));
check("(a) no global: no anchoring text in attest or core_status", !/anchoring:|anchored:|REAL-ANCHORED/.test(b.join("\n")), b.join("\n").slice(0, 600));

const ALL = a.join("\n");
if (df33plus) {
  // (b)
  check("(b) refSyn records as synthetic", /RECORDED/.test(a[0] || "") && /anchoring: synthetic — nothing upstream of refSyn reads the task's data/.test(a[0] || ""), a[0]);
  check("(b) two synthetic attestations: est NOT in core", /est: NOT IN THE CORE YET/.test(a[1] || "") && !inCore(a[2], "est"), (a[1] || "") + "\n" + coreLine(a[2]));
  check("(b) core_status carries the blocked sentence and `anchored: NO`",
    SENT("est").test(lineOf(a[2], /^ +est →/)) && /^ +anchored: NO$/.test(String(a[2]).split("\n")[String(a[2]).split("\n").findIndex((l) => /^ +est →/.test(l)) + 1] || ""), a[2]);
  check("(b) task_complete still blocked on the sentence", SENT("est").test(lineOf(a[2], /^task_complete still blocked on:/)), lineOf(a[2], /^task_complete/));
  // (c)
  check("(c) refReal is real-anchored (via load)", /anchoring: real-anchored — refReal depends on the task's data \(reads it via load\); its outcome changed/.test(a[3] || ""), a[3]);
  check("(c) est IN CORE after refReal", /est: IN CORE/.test(a[3] || "") && inCore(a[4], "est"), (a[3] || "").slice(0, 400));
  check("(c) core_status: `est — anchored: yes (by refReal)`", /^ +est — anchored: yes \(by refReal\)$/m.test(a[4] || ""), a[4]);
  // (d)
  check("(d) refConstD is demoted: insensitive", /anchoring: demoted: insensitive — refConstD anchored but INSENSITIVE: the verdict did not change when the task's data was destroyed — this evidence does not depend on the data \(df33\)/.test(a[5] || ""), a[5]);
  check("(d) estD NOT in core, with the sentence", /estD: NOT IN THE CORE YET — no REAL-ANCHORED evidence/.test(a[6] || "") && !inCore(a[13], "estD") && SENT("estD").test(lineOf(a[13], /^ +estD →/)), (a[6] || "") + "\n" + lineOf(a[13], /^ +estD →/));
  // (e)
  check("(e) a nullcheck on the task's data is anchored without a sensitivity run", /anchoring: real-anchored — nullReal depends on the task's data \(reads it via load\); a nullcheck is anchored without a sensitivity run/.test(a[7] || ""), a[7]);
  check("(e) a nullcheck on invented noise is synthetic", /anchoring: synthetic — nothing upstream of nullSyn reads/.test(a[1] || ""), a[1]);
  if (!df34plus)
    check("(e) estE IN CORE, anchored by nullReal", /estE: IN CORE/.test(a[8] || "") && /^ +estE — anchored: yes \(by nullReal\)$/m.test(a[13] || ""), a[8]);
  // (f)
  check("(f) refFn over the function loader loadT is real-anchored", /anchoring: real-anchored — refFn depends on the task's data \(reads it via loadT\); its outcome changed/.test(a[9] || ""), a[9]);
  check("(f) est2 IN CORE, anchored by refFn", /est2: IN CORE/.test(a[10] || "") && /^ +est2 — anchored: yes \(by refFn\)$/m.test(a[13] || ""), a[10]);
  // (g)
  check("(g) refSlow is unmeasured (sensitivity run over 60 s)", /anchoring: unmeasured — refSlow anchoring UNMEASURED: the sensitivity run exceeded 60 s — use a lighter evidence \(3 targets, not 100\)/.test(a[11] || ""), a[11]);
  check("(g) estG NOT in core (unmeasured is synthetic)", !inCore(a[13], "estG") && SENT("estG").test(lineOf(a[13], /^ +estG →/)) && /^ +anchored: NO$/m.test(a[13] || ""), lineOf(a[13], /^ +estG →/));
  check("scratch clones are gone after the runs", !/__rc5anc_/.test(ALL), (ALL.match(/.{0,80}__rc5anc_.{0,40}/) || [""])[0]);
  // df34 (j): a real-anchored null alone does not complete estE.
  const NULLSENT = (n) => new RegExp(`${n} → no REAL-ANCHORED evidence beyond a null: a shuffled-real null shows ${n} does not invent signals; the core also needs one executed reference/metamorphic/crossing whose inputs include the task's data and whose verdict depends on it \\(df34\\)`);
  if (df34plus) {
    check("(j) the nullReal attest line says anchored (null only)", /a nullcheck is anchored without a sensitivity run — anchored \(null only\): it cannot complete estE alone/.test(a[7] || ""), a[7]);
    check("(j) synthetic ref + real null: estE NOT in core, null-only sentence", /estE: NOT IN THE CORE YET — no REAL-ANCHORED evidence beyond a null/.test(a[8] || "") && !inCore(a[13], "estE") && NULLSENT("estE").test(lineOf(a[13], /^ +estE →/)), (a[8] || "").slice(0, 500) + "\n" + lineOf(a[13], /^ +estE →/));
    check("(j) core_status: `anchored: null only (nullReal)` under estE", (() => { const L = String(a[13] || "").split("\n"); const i = L.findIndex((l) => /^ +estE →/.test(l)); return i >= 0 && /^ +anchored: null only \(nullReal\)$/.test(L[i + 1] || ""); })(), a[13]);
    check("(j) + refRealE (sensitive, real-anchored): estE IN CORE", /anchoring: real-anchored — refRealE depends on the task's data \(reads it via load\); its outcome changed/.test(a[19] || "") && /estE: IN CORE/.test(a[19] || "") && inCore(a[20], "estE") && /^ +estE — anchored: yes \(by refRealE\)$/m.test(a[20] || ""), (a[19] || "").slice(0, 500));
    // (i) the cadence reference.
    check("(i) refCad (planted on the real time stamps only) is real-anchored on redrawn times", /anchoring: real-anchored — refCad depends on the task's data \(reads it via loadC\); its outcome changed/.test(a[18] || ""), a[18]);
    check("(i) pfind IN CORE, anchored by refCad", /pfind: IN CORE/.test(a[18] || "") && inCore(a[20], "pfind") && /^ +pfind — anchored: yes \(by refCad\)$/m.test(a[20] || ""), (a[18] || "").slice(0, 500));
  } else {
    check("(i) control (df33): refCad demoted: insensitive — a permutation keeps the set of times", /anchoring: demoted: insensitive — refCad anchored but INSENSITIVE/.test(a[18] || ""), a[18]);
    check("(i) control (df33): pfind NOT in core", !inCore(a[20], "pfind"), coreLine(a[20]));
  }
  // df35 (k): a row anchors only if the mutant breaks it AND it flips on destroyed data.
  if (df35plus) {
    check("(k) ev6 (string details only) is demoted: insensitive", /anchoring: demoted: insensitive — ev6 anchored but INSENSITIVE/.test(a[21] || ""), a[21]);
    check("(k) ev7 (+ a timestamp row that never calls lsq) is demoted with the df35 sentence", /anchoring: demoted: insensitive — ev7 anchored but INSENSITIVE: no row that tests lsq depends on the task's data — the rows that flip on destroyed data do not exercise lsq \(df35\)/.test(a[22] || ""), a[22]);
    check("(k) ev8 (recovered period as a number in the tested row) is real-anchored", /anchoring: real-anchored — ev8 depends on the task's data \(reads it via loadC\); its outcome changed/.test(a[23] || ""), a[23]);
  } else if (df34plus) {
    check("(k) control (df34): ev6 demoted: insensitive", /anchoring: demoted: insensitive — ev6 anchored but INSENSITIVE/.test(a[21] || ""), a[21]);
    check("(k) control (df34): ev7 real-anchored by the timestamp row", /anchoring: real-anchored — ev7 depends on the task's data/.test(a[22] || ""), a[22]);
  }
  // (h)
  const m = /DESTROY<<(.*)>>/.exec(a[14] || "");
  let dr = null; try { dr = m && JSON.parse(m[1]); } catch (e) { dr = null; }
  check("(h) destroy probe ran", !!dr, a[14]);
  const H33 = [["recShape", "records: shape preserved"], ["recBroken", "records: relationships broken"], ["recDet", "records: deterministic, input untouched"],
    ["numShape", "numbers: shape preserved"], ["numBroken", "numbers: order broken"], ["numDet", "numbers: deterministic"],
    ["csvShape", "CSV: header kept, columns preserved"], ["csvBroken", "CSV: row pairing broken"], ["csvDet", "CSV: deterministic"],
    ["nestShape", "nested: shape preserved, scalars unchanged"], ["nestBroken", "nested: relationships broken"], ["nestDet", "nested: deterministic"], ["scalar", "scalars unchanged"]];
  const H34 = [["r34recShape", "records: keys kept, numeric fields redrawn within [min,max] as integers, string field permuted"], ["r34recRedrawn", "records: numeric multisets changed"],
    ["recBroken", "records: relationships broken"], ["recDet", "records: deterministic, input untouched"],
    ["r34numShape", "numbers: redrawn within [min,max], multiset changed"], ["numBroken", "numbers: order broken"], ["numDet", "numbers: deterministic"],
    ["r34floatRedrawn", "float array: redrawn within [min,max], off the 0.25 grid, deterministic"],
    ["r34csvShape", "CSV: header kept, numeric columns redrawn in range and format, text column permuted"], ["r34csvRedrawn", "CSV: numeric multisets changed, deterministic"],
    ["csvBroken", "CSV: row pairing broken"], ["r34constant", "a constant column stays constant"], ["r34holes", "NaN/null/undefined keep their place"],
    ["r34typed", "typed array: same type, redrawn in range"], ["r34nested", "nested: scalars unchanged, arrays redrawn, deterministic"], ["nestBroken", "nested: relationships broken"], ["scalar", "scalars unchanged"]];
  for (const [k, lbl] of (df34plus ? H34 : H33))
    check(`(h) ${lbl}`, !!(dr && dr[k]), JSON.stringify(dr));
} else {
  // Control: none of b-g fires.
  check("control: no anchoring text anywhere on page A", !/anchoring:|anchored:|REAL-ANCHORED/.test(ALL), (ALL.match(/.{0,80}anchor.{0,80}/) || [""])[0]);
  check("control: est IN CORE on synthetic evidence (b does not fire)", /est: IN CORE \(evidence: refSyn, nullSyn\)/.test(a[1] || ""), a[1]);
  check("control: estD IN CORE (d does not fire)", /estD: IN CORE/.test(a[6] || ""), a[6]);
  check("control: estE and est2 IN CORE", /estE: IN CORE/.test(a[8] || "") && /est2: IN CORE/.test(a[10] || ""), (a[8] || "") + (a[10] || ""));
  check("control: estG IN CORE (g does not fire)", /estG: IN CORE/.test(a[12] || ""), a[12]);
}

// df33 tool-result cap.
const tableOk = (() => { const s = a[15] || ""; for (let i = 0; i < 20; i++) for (let j = 0; j < 8; j++) if (s.indexOf(String(i * 1000 + j + 0.5)) < 0) return false; return !/…|truncated/.test(s); })();
const textOk = (() => { const s = a[16] || ""; for (let i = 0; i < 400; i += 1) if (s.indexOf("line" + String(i).padStart(4, "0") + "-abcdefghij") < 0) return false; return !/…|truncated/.test(s); })();
console.log(`INFO table result ${String(a[15] || "").length} chars, text result ${String(a[16] || "").length} chars`);
if (df33plus) {
  check("cap: a 20x8 numeric table from eval_js arrives intact", tableOk, String(a[15] || "").slice(-300));
  check("cap: ~8 kB of text from eval_js arrives intact", textOk, String(a[16] || "").slice(-300));
} else { info("control: 20x8 table intact", tableOk); info("control: 8 kB text intact", textOk); }

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${failed ? "FAIL" : "PASS"} anchor-smoke: ${checks.length - failed}/${checks.length} assertions`);
process.exit(failed ? 1 : 0);
