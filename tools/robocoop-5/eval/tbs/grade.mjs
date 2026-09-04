// Grade a robocoop-5 WorldSnapshot with the task's OFFICIAL verifier: pick the artifact files out of
// the snapshot's file map (scratch paths are the same absolute paths the task names), lay them out
// on the host, and run tests/test.sh in the official tests image. Binary pass/fail, as upstream.

import { runVerifier, writeFiles, tempDir } from "./docker.mjs";
import { rmSync, existsSync, statSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function artifactFilesFromSnapshot(task, files) {
  const out = {};
  for (const [path, text] of Object.entries(files || {})) {
    if (typeof text !== "string") continue;
    if (task.artifacts.some((a) => path === a || path.startsWith(a.replace(/\/$/, "") + "/"))) out[path] = text;
  }
  return out;
}

export function missingArtifacts(task, files) {
  const have = Object.keys(artifactFilesFromSnapshot(task, files));
  return task.artifacts.filter((a) => !have.some((p) => p === a || p.startsWith(a.replace(/\/$/, "") + "/")));
}

export function gradeFiles(task, files) {
  const host = tempDir("tbs-art-");
  try {
    writeFiles(host, files);
    const v = runVerifier(task.testsTag, host, task.artifacts, { timeoutSec: task.verifierTimeoutSec });
    return { pass: v.pass, reward: v.reward, timedOut: v.timedOut, output: v.output, ctrf: v.ctrf };
  } finally { rmSync(host, { recursive: true, force: true }); }
}

export function gradeFromSnapshot(task, snap) {
  try {
    const files = artifactFilesFromSnapshot(task, snap.files);
    const missing = missingArtifacts(task, snap.files);
    if (!Object.keys(files).length) return { pass: false, reward: 0, output: "no artifacts written: " + (snap.error || missing.join(", ")), missing, artifacts: {} };
    return { ...gradeFiles(task, files), missing, artifacts: files };
  } catch (e) {
    return { pass: false, reward: 0, output: "GRADER ERROR: " + (e?.message ?? e), missing: task.artifacts, artifacts: {} };
  }
}

// --- Disk mode: the agent wrote into the mounted /local-disk, i.e. the host directory `root`. ---

// Artifacts the task names that are absent from the host root (a directory artifact counts as
// present when it exists and is non-empty).
export function missingArtifactsOnDisk(task, root) {
  return task.artifacts.filter((a) => {
    const p = join(root, a);
    if (!existsSync(p)) return true;
    return statSync(p).isDirectory() && readdirSync(p).length === 0;
  });
}

// {absolute container path: text} for every artifact file on disk, capped per file — for the
// trajectory record, not for grading (the verifier reads the bytes itself).
export function readArtifactsOnDisk(task, root, { maxChars = 200000 } = {}) {
  const out = {};
  const take = (abs) => {
    const p = join(root, abs);
    if (!existsSync(p)) return;
    if (statSync(p).isDirectory()) { for (const e of readdirSync(p)) take(abs.replace(/\/$/, "") + "/" + e); return; }
    const buf = readFileSync(p);
    out[abs] = buf.subarray(0, Math.min(buf.length, 8192)).includes(0) ? `<binary ${buf.length} bytes>` : buf.toString("utf8").slice(0, maxChars);
  };
  for (const a of task.artifacts) take(a);
  return out;
}

// Run the official verifier against the host root directly: runVerifier bind-mounts
// <root><artifact> read-only for each artifact that exists.
export function gradeFromDisk(task, root, { error = null } = {}) {
  try {
    const missing = missingArtifactsOnDisk(task, root);
    const artifacts = readArtifactsOnDisk(task, root);
    if (missing.length === task.artifacts.length) return { pass: false, reward: 0, output: "no artifacts written: " + (error || missing.join(", ")), missing, artifacts };
    const v = runVerifier(task.testsTag, root, task.artifacts, { timeoutSec: task.verifierTimeoutSec });
    return { pass: v.pass, reward: v.reward, timedOut: v.timedOut, output: v.output, ctrf: v.ctrf, missing, artifacts };
  } catch (e) {
    return { pass: false, reward: 0, output: "GRADER ERROR: " + (e?.message ?? e), missing: task.artifacts, artifacts: {} };
  }
}
