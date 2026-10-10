// brain.ts curl --as NAME: a name that is not a kept token stops before curl is started.
// Issue owner-session-file-is-present, reviews 1 and 2: `--as` alone went out unsigned, and
// `--as __proto__` / `--as toString` passed a truthiness test on a plain object.
//
//   cd tests/tools && bun test brain-cli.test.ts
//   BRAIN_TS=/path/to/another/brain.ts bun test …   # the same cases against another copy
// Not from the repo root: there `bun test` fails every spawn with "EBADF: bad file descriptor, posix_spawn"
// (2026-10-10 19:44, bun 1.4.0, a two-line test that spawns `bun --version` fails the same way). Cause not found.
import { test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const script = process.env.BRAIN_TS || resolve(import.meta.dir, "../../tools/cloud-brain/brain.ts");
// brain.ts reads the git-ignored Cloudflare token file when it starts; a checkout without it cannot run it.
const runnable = existsSync(resolve(script, "../../scratch/cloud-brain-experiments/.cf-token"));

// A base with no state file and no token file: nothing is kept, and the address is a closed local port.
const run = (...args: string[]) => {
  const p = Bun.spawnSync(["bun", script, "curl", "http://127.0.0.1:9/x", ...args], { env: { ...process.env, BRAIN_BASE: "no-such-brain-for-tests" } });
  return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
};

test.skipIf(!runnable)("--as with no name stops", () => {
  const r = run("--as");
  expect(r.out).toContain("--as needs a name");
  expect(r.code).toBe(1);
});

for (const name of ["nobody", "__proto__", "toString", "constructor", "hasOwnProperty", "valueOf"])
  test.skipIf(!runnable)(`--as ${name} is not a kept token and stops`, () => {
    const r = run("--as", name);
    expect(r.out).toContain(`no token "${name}" is kept`);
    expect(r.code).toBe(1);
  });
