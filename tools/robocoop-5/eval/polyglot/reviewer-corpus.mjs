// U3 step 1 — assemble the reviewer anchor corpus from data already on disk. Zero model calls.
//
// Every attribution continuation and every gate/repair attempt is a {patch, passed} pair produced
// by our agent on our benchmark: a CRAVE analogue with no human labelling (plan/rqgm-and-robocoop-5.md
// §U3). This script collects them into {slug, source, patch, verdict} rows and splits BY SLUG —
// rows for one slug share a spec and near-identical patches, so a row-level split leaks.
//
//   node reviewer-corpus.mjs [--out results/reviewer-corpus.json]
//
// Imported (not run) it exports the pure helpers the tests pin.

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const SOL_PATH = "/src/@user/solution.js";

// Trajectory dirs read by default. `trajectories-prerecapture-backup` is deliberately excluded: it
// is a pre-regrade snapshot of `trajectories`, so its verdicts were produced by a superseded
// grader (the U2 stale-evidence case) and must not be pooled with the current ones.
export const TRAJECTORY_DIRS = [
  "results/trajectories",
  "results/trajectories-gate",
  "results/trajectories-confirm",
  "results/trajectories-warmrepair-1",
  "results/trajectories-warmrepair-2",
  "results/trajectories-warmrepair-3",
];

// ── row extraction ──────────────────────────────────────────────────────────

// A gate/repair trajectory: `candidate` is the graded solution source, `pass` the test verdict.
export function rowFromTrajectory(traj, { source, file } = {}) {
  if (!traj || typeof traj.candidate !== "string" || !traj.candidate.trim()) return null;
  if (typeof traj.pass !== "boolean") return null;
  if (!traj.slug) return null;
  return {
    slug: traj.slug,
    source: source || "trajectory",
    file: file || null,
    attempt: traj.attempt ?? null,
    patch: traj.candidate,
    verdict: traj.pass ? "pass" : "fail",
  };
}

// An attribution continuation (`attribute.mjs --save-continuations`) saves the conversation and the
// graded pass/fail but not the file snapshot, so the candidate is replayed out of the file-writing
// tool calls — the same edits the driver applied.
export function candidateFromConversation(conversation, path = SOL_PATH) {
  let text = null;
  for (const msg of conversation || []) {
    for (const tc of msg.tool_calls || []) {
      const name = tc?.function?.name;
      if (name !== "write_file" && name !== "edit_file") continue;
      let a;
      try { a = JSON.parse(tc.function.arguments); } catch { continue; }
      if (a.file_path !== path) continue;
      if (name === "write_file") {
        if (typeof a.content === "string") text = a.content;
      } else if (typeof text === "string" && typeof a.old_string === "string" && typeof a.new_string === "string") {
        const i = text.indexOf(a.old_string);
        if (i >= 0) text = text.slice(0, i) + a.new_string + text.slice(i + a.old_string.length);
      }
    }
  }
  return text;
}

export function rowFromContinuation(cont, { slug, source, file, attempt } = {}) {
  if (!cont || typeof cont.pass !== "boolean") return null;
  const patch = candidateFromConversation(cont.conversation, SOL_PATH);
  if (typeof patch !== "string" || !patch.trim()) return null;
  return {
    slug,
    source: source || "attribution",
    file: file || null,
    attempt: attempt ?? null,
    k: cont.k ?? null,
    sampleIdx: cont.sampleIdx ?? null,
    patch,
    verdict: cont.pass ? "pass" : "fail",
  };
}

// `<slug>-<attempt>-k<K>s<S>.cont.json` — the name attribute.mjs writes.
export function parseContName(name) {
  const m = /^(.+)-(\d+)-k(\d+)s(\d+)\.cont\.json$/.exec(name);
  if (!m) return null;
  return { slug: m[1], attempt: Number(m[2]), k: Number(m[3]), sampleIdx: Number(m[4]) };
}

// ── dedup + split ───────────────────────────────────────────────────────────

// Byte-identical (slug, patch) pairs collapse to one row. A pair that carries BOTH verdicts is a
// grader disagreement, not a duplicate — reported separately and dropped entirely, since a row
// whose truth is contested cannot score a reviewer.
export function dedupRows(rows) {
  const byKey = new Map();
  for (const r of rows) {
    const key = r.slug + "\u0000" + r.patch;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(r);
  }
  const kept = [], conflicts = [];
  let duplicatesDropped = 0;
  for (const group of byKey.values()) {
    const verdicts = new Set(group.map((r) => r.verdict));
    if (verdicts.size > 1) {
      conflicts.push({ slug: group[0].slug, files: group.map((r) => r.file), verdicts: [...verdicts] });
      duplicatesDropped += group.length;
      continue;
    }
    kept.push(group[0]);
    duplicatesDropped += group.length - 1;
  }
  return { rows: kept, duplicatesDropped, conflicts };
}

// Deterministic: sort the slugs, even index → train, odd index → heldout.
export function splitBySlug(slugs) {
  const sorted = [...new Set(slugs)].sort();
  const train = [], heldout = [];
  sorted.forEach((s, i) => (i % 2 === 0 ? train : heldout).push(s));
  return { train, heldout };
}

export function countRows(rows) {
  const bySource = {};
  const slugs = new Set();
  let pass = 0;
  for (const r of rows) {
    bySource[r.source] ||= { total: 0, pass: 0, fail: 0 };
    bySource[r.source].total++;
    bySource[r.source][r.verdict]++;
    slugs.add(r.slug);
    if (r.verdict === "pass") pass++;
  }
  return { total: rows.length, pass, fail: rows.length - pass, bySource, slugs: [...slugs].sort() };
}

// ── disk collection ─────────────────────────────────────────────────────────

export function collectRows(root = here, { trajectoryDirs = TRAJECTORY_DIRS, attributionDir = "results/attribution" } = {}) {
  const rows = [];
  const attrDir = join(root, attributionDir);
  if (existsSync(attrDir)) {
    for (const f of readdirSync(attrDir).sort()) {
      const meta = parseContName(f);
      if (!meta) continue;
      const cont = JSON.parse(readFileSync(join(attrDir, f), "utf8"));
      const row = rowFromContinuation(cont, { ...meta, source: "attribution", file: join(attributionDir, f) });
      if (row) rows.push(row);
    }
  }
  for (const d of trajectoryDirs) {
    const dir = join(root, d);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) {
      if (!f.endsWith(".json")) continue;
      const traj = JSON.parse(readFileSync(join(dir, f), "utf8"));
      const row = rowFromTrajectory(traj, { source: basename(d), file: join(d, f) });
      if (row) rows.push(row);
    }
  }
  return rows;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
  const out = flag("--out", join(here, "results", "reviewer-corpus.json"));

  const raw = collectRows(here);
  const { rows, duplicatesDropped, conflicts } = dedupRows(raw);
  const counts = countRows(rows);
  const split = splitBySlug(counts.slugs);

  // Slugs with no spec in problems.json cannot be scored — surface rather than silently carry them.
  const problems = JSON.parse(readFileSync(join(here, "problems.json"), "utf8"));
  const known = new Set(problems.map((p) => p.slug));
  const unknown = counts.slugs.filter((s) => !known.has(s));

  const perSide = (side) => {
    const set = new Set(side);
    const rs = rows.filter((r) => set.has(r.slug));
    return { rows: rs.length, pass: rs.filter((r) => r.verdict === "pass").length, fail: rs.filter((r) => r.verdict === "fail").length, slugs: side.length };
  };

  const doc = {
    generatedAt: new Date().toISOString(),
    sources: { attributionDir: "results/attribution", trajectoryDirs: TRAJECTORY_DIRS },
    counts: { ...counts, duplicatesDropped, rawRows: raw.length, conflicts: conflicts.length, unknownSlugs: unknown },
    conflicts,
    split: { train: split.train, heldout: split.heldout, trainStats: perSide(split.train), heldoutStats: perSide(split.heldout) },
    rows,
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(doc, null, 1));

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`raw rows ${raw.length} → ${rows.length} after dedup (${duplicatesDropped} dropped, ${conflicts.length} verdict conflicts)`);
  console.log(`\n${pad("source", 34)} ${pad("rows", 6)} ${pad("pass", 6)} ${pad("fail", 6)}`);
  for (const [s, c] of Object.entries(counts.bySource).sort()) {
    console.log(`${pad(s, 34)} ${pad(c.total, 6)} ${pad(c.pass || 0, 6)} ${pad(c.fail || 0, 6)}`);
  }
  console.log(`${pad("TOTAL", 34)} ${pad(counts.total, 6)} ${pad(counts.pass, 6)} ${pad(counts.fail, 6)}`);
  console.log(`\ndistinct slugs ${counts.slugs.length}   base rate (pass) ${(counts.pass / counts.total).toFixed(3)}`);
  if (unknown.length) console.log(`slugs missing from problems.json: ${unknown.join(", ")}`);
  for (const c of conflicts) console.log(`conflict: ${c.slug} ${c.verdicts.join("/")} ${c.files.join(" ")}`);
  const t = doc.split.trainStats, h = doc.split.heldoutStats;
  console.log(`\nsplit by slug (sorted, even→train, odd→heldout)`);
  console.log(`  train   ${t.slugs} slugs  ${t.rows} rows  ${t.pass} pass / ${t.fail} fail`);
  console.log(`  heldout ${h.slugs} slugs  ${h.rows} rows  ${h.pass} pass / ${h.fail} fail`);
  console.log(`\nwrote ${out}`);
}
