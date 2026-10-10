// `brain.ts confirm` with no Worker named exits 1 and says to name one (R15 of plan/specs/deploy-verification.html):
// a confirm of everything would keep every unverified Worker with no test run. No Brain is called: the check is
// before the request, and the base named here has no state file.
//
//   cd tests/tools && bun test brain-confirm-names-a-worker.test.ts
import { test, expect } from "bun:test";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");

test("brain.ts confirm with no name exits 1 and says to name the Worker", () => {
  const p = Bun.spawnSync(["bun", "tools/cloud-brain/brain.ts", "confirm"], { cwd: root, env: { ...process.env, BRAIN_BASE: "no-such-brain" } });
  expect(p.exitCode).toBe(1);
  expect(p.stderr.toString()).toContain("usage: brain.ts confirm <worker>");
  expect(p.stdout.toString()).toBe("");
});
