// Compares the tool outputs of two oracle runs (run.mjs --oracle --json), eval by eval.
//   node tools/robocoop-5/transcript-diff.mjs <baseline.json> <candidate.json> [--unstable ids.json] [--show N]
//   node tools/robocoop-5/transcript-diff.mjs --digest <run.json>     # {id: {score, sha}} for a fixture
// An oracle run has no fixed clock or seeded ids, so generated pids, durations and the page path are
// replaced before comparing. Evals listed in --unstable differ between two runs of the same code and are
// compared on score only.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
export const normalise = (s) => String(s)
  .replace(/file:\/\/\/[^\s"'`)\\]*?\.html/g, "<PAGE>")
  .replace(/\b_[a-z0-9]{6,8}\b(?![A-Za-z0-9_(])/g, (m) => (/\d/.test(m) ? "<PID>" : m))
  .replace(/\b\d+(\.\d+)?\s?(ms|s)\b/g, "<T>")
  // how many cells a re-applied module counts as changed varies between runs of the same code (5 evals over 3 runs)
  .replace(/applied live \(\d+ cells? changed\)/g, "applied live (<N> changed)")
  .replace(/the \d+ cells? kept \(matched by pid\)/g, "the <N> kept (matched by pid)")
  .replace(/(\d+) of \d+ kept cells? \(matched by pid\)/g, "$1 of <N> kept (matched by pid)")
  .replace(/\b20\d\d-\d\d-\d\d[T ]\d\d:\d\d(:\d\d)?(\.\d+)?Z?/g, "<DATE>")
  .replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun) [A-Z][A-Za-z_\/+-]* \(UTC[+-][\d:.]+\)/g, "<ZONE>");

export function digest(run) {
  const out = {};
  for (const e of run.evals ?? []) {
    const tools = (e.transcript?.conversation ?? []).filter((m) => m.role === "tool").map((m) => normalise(m.content));
    out[e.id] = { score: Math.round((e.aggregate ?? 0) * 1000) / 1000, steps: tools.length, sha: sha(JSON.stringify(tools)), tools };
  }
  return out;
}

export function compare(base, cand, unstable = new Set()) {
  const rows = [];
  for (const id of new Set([...Object.keys(base), ...Object.keys(cand)])) {
    const a = base[id], b = cand[id];
    if (!a || !b) { rows.push({ id, kind: a ? "missing in candidate" : "new in candidate" }); continue; }
    if (a.score !== b.score) { rows.push({ id, kind: "score " + a.score + " -> " + b.score }); continue; }
    if (unstable.has(id) || a.sha === b.sha) continue;
    const i = a.tools.findIndex((t, k) => t !== b.tools?.[k]);
    const x = a.tools[i] ?? "", y = b.tools?.[i] ?? "";
    let k = 0; while (k < x.length && x[k] === y[k]) k++;
    rows.push({ id, kind: "tool output " + i + " differs at char " + k, was: x.slice(Math.max(0, k - 60), k + 140), now: y.slice(Math.max(0, k - 60), k + 140) });
  }
  return rows;
}

if (process.argv[1]?.endsWith("transcript-diff.mjs")) {
  const args = process.argv.slice(2);
  const load = (f) => { const j = JSON.parse(readFileSync(f, "utf8")); return j.evals ? digest(j) : j; };
  if (args[0] === "--digest") { console.log(JSON.stringify(load(args[1]))); process.exit(0); }
  const files = args.filter((a) => a.endsWith(".json") && args[args.indexOf(a) - 1] !== "--unstable");
  const u = args.includes("--unstable") ? new Set(JSON.parse(readFileSync(args[args.indexOf("--unstable") + 1], "utf8"))) : new Set();
  const [a, b] = files.map(load);
  const rows = compare(a, b, u);
  const show = args.includes("--show") ? +args[args.indexOf("--show") + 1] : 8;
  for (const r of rows.slice(0, show)) console.log(r.id + ": " + r.kind + (r.was != null ? "\n  was …" + JSON.stringify(r.was) + "\n  now …" + JSON.stringify(r.now) : ""));
  console.log("oracle transcripts: " + Object.keys(a).length + " baseline, " + Object.keys(b).length + " candidate, " + rows.length + " differ" + (u.size ? " (" + u.size + " compared on score only)" : ""));
  process.exit(rows.length ? 1 : 0);
}
