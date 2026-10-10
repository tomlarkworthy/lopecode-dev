// brain.ts curl --as NAME: a name that is not a kept token stops before curl is started.
// Issue owner-session-file-is-present, reviews 1 and 2: `--as` alone went out unsigned, and
// `--as __proto__` / `--as toString` passed a truthiness test on a plain object.
//
//   cd tests/tools && bun test brain-cli.test.ts
//   BRAIN_TS=/path/to/another/brain.ts bun test …   # the same cases against another copy
// Not from the repo root: there `bun test` fails every spawn with "EBADF: bad file descriptor, posix_spawn"
// (2026-10-10 19:44, bun 1.4.0, a two-line test that spawns `bun --version` fails the same way). Cause not found.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const script = process.env.BRAIN_TS || resolve(import.meta.dir, "../../tools/cloud-brain/brain.ts");
// Until worktree-rebase-and-state-gaps brain.ts read the git-ignored Cloudflare token file when it started, and
// these were skipped in a checkout without it: every worktree of the loop (7 skipped there, 2026-10-10).

// A base with no state file and no token file: nothing is kept, and the address is a closed local port.
const run = (...args: string[]) => {
  const p = Bun.spawnSync(["bun", script, "curl", "http://127.0.0.1:9/x", ...args], { env: { ...process.env, BRAIN_BASE: "no-such-brain-for-tests" } });
  return { code: p.exitCode, out: p.stdout.toString() + p.stderr.toString() };
};

test("--as with no name stops", () => {
  const r = run("--as");
  expect(r.out).toContain("--as needs a name");
  expect(r.code).toBe(1);
});

for (const name of ["nobody", "__proto__", "toString", "constructor", "hasOwnProperty", "valueOf"])
  test(`--as ${name} is not a kept token and stops`, () => {
    const r = run("--as", name);
    expect(r.out).toContain(`no token "${name}" is kept`);
    expect(r.code).toBe(1);
  });

// BRAIN_STATE_DIR: the state of another directory, here a made-up one. The token's value is a test string.
test("BRAIN_STATE_DIR: --as sends the token kept in that directory, and without it the name is not kept", async () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "brain-state-")));
  writeFileSync(join(dir, "no-such-brain-for-tests-tokens.json"), JSON.stringify({ "in-state-dir": "value-for-the-test" }));
  let got: string | null = null;
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: (req) => ((got = req.headers.get("authorization")), new Response("ok")) });
  const call = async (env: Record<string, string>) => {
    const p = Bun.spawn(["bun", script, "curl", `http://127.0.0.1:${server.port}/x`, "--as", "in-state-dir"], { env: { ...process.env, BRAIN_BASE: "no-such-brain-for-tests", ...env }, stdout: "pipe", stderr: "pipe" });
    const out = (await new Response(p.stdout).text()) + (await new Response(p.stderr).text());
    return { code: await p.exited, out };
  };
  try {
    const { BRAIN_STATE_DIR: _, ...rest } = process.env as any;
    const without = Bun.spawnSync(["bun", script, "curl", `http://127.0.0.1:${server.port}/x`, "--as", "in-state-dir"], { env: { ...rest, BRAIN_BASE: "no-such-brain-for-tests" } });
    expect(without.stdout.toString()).toContain('no token "in-state-dir" is kept');
    expect(got).toBe(null);
    const r = await call({ BRAIN_STATE_DIR: dir });
    expect(r.out).toContain("ok [200]");
    expect(r.out).not.toContain("value-for-the-test");
    expect(got).toBe("Bearer value-for-the-test");
  } finally {
    server.stop(true);
  }
});

test("a command that sends no Cloudflare token starts in a directory that has none", () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "brain-state-")));
  const p = Bun.spawnSync(["bun", script, "curl", "http://127.0.0.1:9/x", "--as", "nobody"], { env: { ...process.env, BRAIN_BASE: "no-such-brain-for-tests", BRAIN_STATE_DIR: dir } });
  expect(p.stderr.toString()).not.toContain("ENOENT");
  expect(p.stdout.toString()).toContain('no token "nobody" is kept');
});
