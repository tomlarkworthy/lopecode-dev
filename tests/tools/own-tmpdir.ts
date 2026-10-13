// The preload of `bun test` at the root of this checkout (bunfig.toml): a run has a TMPDIR of its own.
// A new directory `bm-test-run.XXXXXX` of /tmp (SUITE_TMP_BASE names another place) is TMPDIR for the test file, so
// what it makes with mkdtemp(tmpdir()) is made there, and the directory is removed after the file's last test.
// A run that is killed runs no hook: a `sh` started here waits for this process to end and removes the directory then.
// Nothing is done when BM_TEST_TMPDIR is set: tests/tools/suite.sh sets it, with the TMPDIR it made for its whole run.
// KEEP_TEST_TMP=1 leaves the directory and names it on stderr, for a rig to be looked at after a failure.
// What it does not reach: a process started with no `env` (Bun.spawn's own default) has the TMPDIR bun was started
// with; `env: { ...process.env }` and node:child_process pass this one.
// Issue test-rigs-left-when-a-file-runs-alone; tools/cloud-brain/records/test-rigs-left-when-a-file-runs-alone.md has the runs.
import { afterAll } from "bun:test";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { join } from "node:path";

if (!process.env.BM_TEST_TMPDIR) {
  const dir = mkdtempSync(join(realpathSync(process.env.SUITE_TMP_BASE || "/tmp"), "bm-test-run."));
  process.env.BM_TEST_TMPDIR = process.env.TMPDIR = dir;
  if (process.env.KEEP_TEST_TMP === "1") console.error(`+ TMPDIR=${dir}, kept (KEEP_TEST_TMP=1)`);
  else {
    const watch = Bun.spawn(["/bin/sh", "-c", 'while kill -0 "$1" 2>/dev/null; do sleep 1; done; rm -rf "$2"', "sh", String(process.pid), dir], { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
    watch.unref();
    afterAll(() => { rmSync(dir, { recursive: true, force: true }); watch.kill(); });
  }
}
