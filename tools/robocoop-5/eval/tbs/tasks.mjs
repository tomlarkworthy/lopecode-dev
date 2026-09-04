// Task manifest for the TB-Science port. Reads tasks.json + each task's official task.toml /
// instruction.md, and produces the notebook seed set by copying the env image's data out (so
// tasks whose data is generated at image build are covered too).

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sh, ensureImage, copyOut, walkText, tempDir } from "./docker.mjs";

export const here = dirname(fileURLToPath(import.meta.url));
export const TBS_ROOT = process.env.TBS_ROOT || join(here, "..", "tbs-src");
const CACHE = join(here, "cache");

function readToml(path) {
  const r = sh("python3", ["-c", "import sys,json,tomllib;print(json.dumps(tomllib.load(open(sys.argv[1],'rb'))))", path]);
  if (r.status !== 0) throw new Error("task.toml parse failed: " + r.stderr);
  return JSON.parse(r.stdout);
}

export function loadTasks({ slugs = null } = {}) {
  const manifest = JSON.parse(readFileSync(join(here, "tasks.json"), "utf8")).tasks;
  const wanted = slugs ? manifest.filter((t) => slugs.includes(t.slug)) : manifest;
  return wanted.map((t) => {
    const dir = join(TBS_ROOT, t.dir);
    if (!existsSync(dir)) throw new Error(`task dir missing: ${dir} (set TBS_ROOT or clone harbor-framework/terminal-bench-science to tools/robocoop-5/eval/tbs-src)`);
    const toml = readToml(join(dir, "task.toml"));
    return {
      slug: t.slug,
      dir,
      seedRoots: t.seedRoots,
      artifacts: toml.artifacts || [],
      instruction: readFileSync(join(dir, "instruction.md"), "utf8"),
      verifierTimeoutSec: toml.verifier?.timeout_sec ?? 600,
      agentTimeoutSec: toml.agent?.timeout_sec ?? 28800,
      cpus: toml.environment?.cpus,
      memoryMb: toml.environment?.memory_mb,
      envTag: `tbs-env-${t.slug}`,
      testsTag: `tbs-tests-${t.slug}`,
    };
  });
}

export function ensureImages(task, opts) {
  ensureImage(join(task.dir, "environment"), task.envTag, opts);
  ensureImage(join(task.dir, "tests"), task.testsTag, opts);
}

// {absPath: text} to seed into the notebook. Cached per slug; --reseed rebuilds.
export function getSeeds(task, { rebuild = false } = {}) {
  mkdirSync(CACHE, { recursive: true });
  const cachePath = join(CACHE, `${task.slug}.seeds.json`);
  if (!rebuild && existsSync(cachePath)) return JSON.parse(readFileSync(cachePath, "utf8"));
  ensureImage(join(task.dir, "environment"), task.envTag);
  const name = `tbs-seed-${Date.now()}`;
  const c = sh("docker", ["create", "--name", name, task.envTag]);
  if (c.status !== 0) throw new Error("docker create failed: " + c.stderr);
  const host = tempDir("tbs-seed-");
  const missing = copyOut(name, task.seedRoots, host);
  sh("docker", ["rm", "-f", name]);
  const { files, binary } = walkText(host);
  const seeds = { files, binary, missing, bytes: Object.values(files).reduce((n, t) => n + t.length, 0) };
  writeFileSync(cachePath, JSON.stringify(seeds));
  return seeds;
}

// Lay the task's inputs out on the host as the scientist's working directory, for mounting at
// /local-disk: every seedRoot copied out of the env image (binary files included, unlike getSeeds),
// plus the parent directory of every artifact so a write lands where the verifier looks. Returns
// {missing: container paths docker cp could not find, paths: every file now under hostRoot, as the
// absolute container path it came from}.
export function materializeSeeds(task, hostRoot) {
  ensureImage(join(task.dir, "environment"), task.envTag);
  mkdirSync(hostRoot, { recursive: true });
  const name = `tbs-seed-${Date.now()}`;
  const c = sh("docker", ["create", "--name", name, task.envTag]);
  if (c.status !== 0) throw new Error("docker create failed: " + c.stderr);
  let missing;
  try { missing = copyOut(name, task.seedRoots, hostRoot); } finally { sh("docker", ["rm", "-f", name]); }
  for (const a of task.artifacts) mkdirSync(join(hostRoot, a.endsWith("/") ? a : dirname(a)), { recursive: true });
  return { missing, paths: listFiles(hostRoot) };
}

// Every file under hostRoot as "/<relative path>" — the container-absolute path the agent sees
// under /local-disk.
export function listFiles(hostRoot, rel = "") {
  const out = [];
  for (const e of readdirSync(join(hostRoot, rel)).sort()) {
    const r = rel + "/" + e;
    if (statSync(join(hostRoot, r)).isDirectory()) out.push(...listFiles(hostRoot, r)); else out.push(r);
  }
  return out;
}
