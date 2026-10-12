// What a test of this directory reads from the checkout, for a checkout that lacks it.
// Issue tests-tools-fail-in-a-fresh-worktree; tools/cloud-brain/records/tests-tools-fail-in-a-fresh-worktree.md.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "bun:test";

export const BUILT = "tools/cloud-brain/.emitted/cloud-brain.html";
export const COMMITTED = "lopebooks/notebooks/@tomlarkworthy_cloud-brain.html";

// The notebook a test reads statements from: the one named, else a worktree's own build when it has one, else the committed one.
export const notebookOf = ({ named, worktree, built }: { named?: string; worktree: boolean; built: boolean }) =>
  named || (worktree && built ? BUILT : COMMITTED);

// How a checkout that is not from worktree.sh gets what a submodule holds.
export const SUBMODULES = "git submodule update --init cloud-brain-dev lopebooks lopecode";

// `test` when every path is there. Otherwise test.skip, and one line that names the file, what it lacks and `how` to get it.
export const testNeeding = (file: string, paths: string[], how = SUBMODULES) => {
  const lacks = paths.filter((p) => !existsSync(p));
  if (!lacks.length) return test;
  console.log(`skipped: ${file}: no ${lacks.join(", ")}. tools/cloud-brain/worktree.sh makes a worktree that has it; in another checkout, ${how}`);
  return test.skip;
};

// A module of the Brain compiled from its seed in this checkout, as build.ts compiles one, in a file of the temp directory: its path.
// For a test that asks a module something: cloud-brain-dev/deploy/ is git-ignored and as old as the checkout's last
// sync.ts, and a copy from before a method fails the test of it (issue cost-events-test-reads-stale-deploy).
const ROOT = resolve(import.meta.dir, "../..");
const built = new Map<string, Promise<string>>();
// One compiler a process, and one seed at a time. A second compiler() after the first was disposed threw
// "RequireError: invalid module" between tests, and the file that asked for a second seed registered no test
// (cost-events.test.ts with rows-add-within-sql.test.ts, 2026-10-12).
let compiling: Promise<any> | null = null, last: Promise<any> = Promise.resolve();
// Where a checkout's modules are written: one directory a checkout, written over by each run, so a run leaves nothing new behind it.
export const SEEDS = join(tmpdir(), "seed-module-" + createHash("sha1").update(ROOT).digest("hex").slice(0, 12));
export const seedModule = (seed: string, into = SEEDS): Promise<string> => {
  const key = `${into}\n${seed}`;
  if (!built.has(key)) built.set(key, (last = last.catch(() => {}).then(async () => {
    const { compiler, moduleSource, splitSeed } = await import(resolve(ROOT, "tools/spec-notebook.ts"));
    const { compile } = await (compiling ??= compiler());
    // A directory of its own for each seed. bun 1.4.0 does not find, by import(), a file written into a directory after
    // it imported another file of that directory (issue rows-add-within-sql-fails-once-in-suite).
    const name = seed.replace(/\.ojs$/, ""), dir = join(into, name), file = join(dir, name + ".js");
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${file}.${process.pid}`, moduleSource(splitSeed(readFileSync(resolve(ROOT, "tools/cloud-brain", seed), "utf8")), compile));
    renameSync(`${file}.${process.pid}`, file);
    return file;
  })));
  return built.get(key)!;
};

// `test` and the built module's path. With no toolchain notebook to compile with: test.skip and a line. Any other failure is thrown.
export const testNeedingSeed = async (file: string, seed: string, build = seedModule) => {
  try {
    return { test, module: await build(seed) };
  } catch (e: any) {
    if (!/^no @tomlarkworthy_observablejs-toolchain\.html/.test(e?.message ?? "")) throw e;
    console.log(`skipped: ${file}: ${seed} was not compiled: ${e.message}. tools/cloud-brain/worktree.sh makes a worktree that has it; in another checkout, ${SUBMODULES}`);
    return { test: test.skip, module: "" };
  }
};
