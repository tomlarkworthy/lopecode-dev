// Plain-docker plumbing for the Terminal-Bench-Science port: build the task's official env and
// verifier images, run the official solution, copy artifacts out, and run the official test.sh
// against a host directory of artifacts. No harbor — the verifier contract is just "these files at
// these absolute paths, then bash /tests/test.sh writes /logs/verifier/reward.txt".

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

export function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
}

export function imageExists(tag) { return sh("docker", ["image", "inspect", tag], { stdio: ["ignore", "ignore", "ignore"] }).status === 0; }

export function buildImage(dir, tag) {
  const r = sh("docker", ["build", "-q", "-t", tag, dir]);
  if (r.status !== 0) throw new Error(`docker build ${tag} (${dir}) failed:\n${(r.stderr || "").slice(-3000)}`);
  return tag;
}

export function ensureImage(dir, tag, { rebuild = false } = {}) {
  if (rebuild || !imageExists(tag)) buildImage(dir, tag);
  return tag;
}

// Copy container paths (files or dirs) into hostDir, preserving the absolute layout:
// container:/root/data/x.csv -> hostDir/root/data/x.csv
export function copyOut(container, paths, hostDir) {
  const missing = [];
  for (const p of paths) {
    const dest = join(hostDir, dirname(p));
    mkdirSync(dest, { recursive: true });
    const r = sh("docker", ["cp", `${container}:${p}`, dest]);
    if (r.status !== 0) missing.push(p);
  }
  return missing;
}

// {absoluteContainerPath: text} for every text file under hostDir; binary files (NUL byte in the
// first 8 KiB) are reported, not seeded — this port is text-only.
export function walkText(hostDir) {
  const files = {}, binary = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) { walk(full); continue; }
      const buf = readFileSync(full);
      const abs = full.slice(hostDir.length);
      if (buf.subarray(0, 8192).includes(0)) { binary.push(abs); continue; }
      files[abs] = buf.toString("utf8");
    }
  };
  if (existsSync(hostDir)) walk(hostDir);
  return { files, binary };
}

export function tempDir(prefix) { return mkdtempSync(join(tmpdir(), prefix)); }

// Run the official solution (solution/solve.sh) in the env image and copy its artifacts out.
export function runSolution(envTag, solutionDir, artifacts, { timeoutSec = 3600, cpus, memoryMb } = {}) {
  const hostDir = tempDir("tbs-sol-");
  const name = `tbs-sol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const res = [];
  if (cpus) res.push("--cpus", String(cpus));
  if (memoryMb) res.push("--memory", `${memoryMb}m`);
  const started = Date.now();
  const r = sh("docker", ["run", "--name", name, ...res, "-v", `${solutionDir}:/solution:ro`, envTag, "bash", "/solution/solve.sh"], { timeout: timeoutSec * 1000 });
  const seconds = (Date.now() - started) / 1000;
  const timedOut = r.error && r.error.code === "ETIMEDOUT";
  if (timedOut) sh("docker", ["kill", name]);
  const missing = copyOut(name, artifacts, hostDir);
  sh("docker", ["rm", "-f", name]);
  return { ok: r.status === 0 && !timedOut, timedOut, seconds, output: ((r.stdout || "") + (r.stderr || "")).slice(-4000), hostDir, missing };
}

// Run the official verifier against artifacts laid out under hostArtDir (absolute layout, as
// copyOut produces). Missing artifact paths are simply not mounted, so the tests fail on them the
// same way they would under harbor.
export function runVerifier(testsTag, hostArtDir, artifacts, { timeoutSec = 600 } = {}) {
  const logs = tempDir("tbs-logs-");
  const mounts = [];
  for (const a of artifacts) {
    const host = join(hostArtDir, a);
    if (existsSync(host)) mounts.push("-v", `${host}:${a}:ro`);
  }
  const name = `tbs-ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const r = sh("docker", ["run", "--name", name, "--network", "none", ...mounts, "-v", `${logs}:/logs`, testsTag, "bash", "/tests/test.sh"], { timeout: timeoutSec * 1000 });
  const timedOut = r.error && r.error.code === "ETIMEDOUT";
  if (timedOut) sh("docker", ["kill", name]);
  sh("docker", ["rm", "-f", name]);
  const rewardPath = join(logs, "verifier", "reward.txt");
  const reward = existsSync(rewardPath) ? Number(readFileSync(rewardPath, "utf8").trim()) : 0;
  let ctrf = null;
  const ctrfPath = join(logs, "verifier", "ctrf.json");
  if (existsSync(ctrfPath)) { try { ctrf = JSON.parse(readFileSync(ctrfPath, "utf8")); } catch {} }
  const out = (r.stdout || "") + (r.stderr || "");
  rmSync(logs, { recursive: true, force: true });
  return { reward, pass: reward >= 1, timedOut, output: out.slice(-6000), ctrf: summarizeCtrf(ctrf) };
}

function summarizeCtrf(ctrf) {
  const tests = ctrf?.results?.tests;
  if (!Array.isArray(tests)) return null;
  return tests.map((t) => ({ name: t.name, status: t.status }));
}

export function writeFiles(hostDir, files) {
  for (const [abs, text] of Object.entries(files)) {
    const full = join(hostDir, abs);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
}
