// tools/cloud-brain/fly/run.sh, the first process of the worker machine on Fly.io, and the files beside it.
// Issue fly-2-image-and-run-sh; record tools/cloud-brain/records/fly-2-image-and-run-sh.md.
// run.sh is run as it is, with a `claude` of the test first on PATH, a Brain of the test at FLY_RUN_BASE and a
// checkout of the test (a git repository with this checkout's brain.ts and run.sh). git, bun and jq are the machine's own.
//
//   bun test --timeout=30000 ./tests/tools/fly-run-sh.test.ts
import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, chmodSync, statSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const FLY = join(root, "tools/cloud-brain/fly");
const RUN = join(FLY, "run.sh");
const VALUE = "a-token-of-the-test";

// What the Brain of the test answers next, and what it was asked.
let answer: { status: number; body: string } = { status: 200, body: '{"work":[]}' };
let asked: { path: string; auth: string | null }[] = [];
let server: ReturnType<typeof Bun.serve>;
beforeAll(() => {
  server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch(req) {
    asked.push({ path: new URL(req.url).pathname, auth: req.headers.get("authorization") });
    return new Response(answer.body, { status: answer.status, headers: { "content-type": "application/json" } });
  } });
});
afterAll(() => server.stop(true));

const git = (dir: string, ...args: string[]) => {
  const r = Bun.spawnSync(["git", "-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...args], { stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  return r.stdout.toString().trim();
};

// A directory with: bin/claude, which writes its arguments and three variables to claude.ran and exits with
// the number in claude.exit; a checkout; and the token file as the machine's `files` would write it.
function rig({ token = true } = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "fly-run-sh-")));
  mkdirSync(join(dir, "bin"));
  writeFileSync(join(dir, "bin/claude"), `#!/bin/bash
{ printf '%s\\n' "$@"; echo "IS_SANDBOX=$IS_SANDBOX"; echo "METADEV=$METADEV"; echo "CLAUDE_CONFIG_DIR=$CLAUDE_CONFIG_DIR"; echo "PWD=$PWD"; } > "${dir}/claude.ran"
exit $(cat "${dir}/claude.exit" 2>/dev/null || echo 0)
`);
  chmodSync(join(dir, "bin/claude"), 0o755);
  const checkout = join(dir, "data/lopecode-dev");
  mkdirSync(join(checkout, "tools/cloud-brain/fly"), { recursive: true });
  copyFileSync(join(root, "tools/cloud-brain/brain.ts"), join(checkout, "tools/cloud-brain/brain.ts"));
  copyFileSync(RUN, join(checkout, "tools/cloud-brain/fly/run.sh"));
  writeFileSync(join(checkout, "package.json"), "{}");
  writeFileSync(join(checkout, "tools/package.json"), "{}");
  writeFileSync(join(checkout, ".gitignore"), "tools/cloud-brain/.emitted\nbun.lock\nnode_modules\n");
  git(checkout, "init", "-q", "-b", "main");
  git(checkout, "add", ".");
  git(checkout, "commit", "-q", "-m", "a checkout");
  if (token) writeFileSync(join(dir, "tokens.json"), JSON.stringify({ "fly-status": VALUE }), { mode: 0o644 });
  return { dir, checkout, ran: () => (existsSync(join(dir, "claude.ran")) ? readFileSync(join(dir, "claude.ran"), "utf8").trim().split("\n") : null) };
}

async function run(r: { dir: string; checkout: string }, env: Record<string, string> = {}, script = RUN) {
  asked = [];
  const p = Bun.spawn(["bash", script], {
    env: { PATH: `${join(r.dir, "bin")}:${process.env.PATH}`, HOME: join(r.dir, "home"), DATA: join(r.dir, "data"), FLY_TOKENS: join(r.dir, "tokens.json"),
      FLY_RUN_BASE: `http://127.0.0.1:${server.port}`, RUN_SH_PULLED: "1", ...env },
    stdout: "pipe", stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  return { out, err, code };
}

test("fly.work empty: exit 0, and claude is not started", async () => {
  const r = rig();
  answer = { status: 200, body: '{"work":[]}' };
  const got = await run(r);
  expect(got.out).toContain("fly.work is empty; no loop is started");
  expect(got.code).toBe(0);
  expect(r.ran()).toBeNull();
  // The one call was fly.work, with the token of the file the machine was given, kept in the checkout with mode 600.
  expect(asked).toEqual([{ path: "/xrpc/com.lopecode.brain.fly.work", auth: "Bearer " + VALUE }]);
  const kept = join(r.checkout, "tools/cloud-brain/.emitted/cb4-tokens.json");
  expect(JSON.parse(readFileSync(kept, "utf8"))).toEqual({ "fly-status": VALUE });
  expect(statSync(kept).mode & 0o777).toBe(0o600);
  expect(got.out + got.err).not.toContain(VALUE);
  rmSync(r.dir, { recursive: true, force: true });
});

test("fly.work with an issue: claude is started in the checkout with the loop's prompt, and its exit is the script's", async () => {
  const r = rig();
  answer = { status: 200, body: '{"work":["an-issue","another"]}' };
  writeFileSync(join(r.dir, "claude.exit"), "7");
  const got = await run(r);
  expect(got.out).toContain("fly.work has 2");
  expect(r.ran()).toEqual(["-p", "/loop /brain-maintenance", "--model", "opus", "--permission-mode", "bypassPermissions",
    "IS_SANDBOX=1", "METADEV=1", `CLAUDE_CONFIG_DIR=${join(r.dir, "data/claude")}`, `PWD=${r.checkout}`]);
  expect(existsSync(join(r.dir, "data/claude"))).toBe(true);
  expect(got.out).toContain("claude ended with 7");
  expect(got.code).toBe(7);
  rmSync(r.dir, { recursive: true, force: true });
});

test("the prompt and the model are the environment's when it names them", async () => {
  const r = rig();
  answer = { status: 200, body: '{"work":["an-issue"]}' };
  const got = await run(r, { FLY_RUN_PROMPT: "/brain-maintenance\nYour token is orch-000000.", MODEL: "sonnet" });
  expect(got.code).toBe(0);
  expect(r.ran()!.slice(0, 5)).toEqual(["-p", "/brain-maintenance", "Your token is orch-000000.", "--model", "sonnet"]);
  rmSync(r.dir, { recursive: true, force: true });
});

for (const [name, a] of [
  ["a refusal (403)", { status: 403, body: '{"error":"Forbidden","message":"this token does not name com.lopecode.brain.fly.work"}' }],
  ["no such method (404)", { status: 404, body: "not found" }],
  ["200 with no list", { status: 200, body: '{"work":3}' }],
  ["200 with no JSON", { status: 200, body: "" }],
  ["a list beside a 500", { status: 500, body: '{"work":[]}' }],
] as const) {
  test(`fly.work not answered, ${name}: exit 1, and claude is not started`, async () => {
    const r = rig();
    answer = a;
    const got = await run(r);
    expect(got.out).toContain(`fly.work was not answered (status ${a.status})`);
    expect(got.out).toContain("no loop is started");
    expect(got.code).toBe(1);
    expect(r.ran()).toBeNull();
    rmSync(r.dir, { recursive: true, force: true });
  });
}

test("the Brain is not reached: exit 1, and claude is not started", async () => {
  const r = rig();
  const got = await run(r, { FLY_RUN_BASE: "http://127.0.0.1:1" });
  expect(got.out).toContain("fly.work was not answered (status 000)");
  expect(got.code).toBe(1);
  expect(r.ran()).toBeNull();
  rmSync(r.dir, { recursive: true, force: true });
});

test("no token fly-status on the machine: exit 1, no call, and claude is not started", async () => {
  const r = rig({ token: false });
  answer = { status: 200, body: '{"work":["an-issue"]}' };
  const got = await run(r);
  expect(got.out).toContain("fly.work was not answered (status none)");
  expect(got.out).toContain('no token "fly-status" is kept');
  expect(got.code).toBe(1);
  expect(asked).toEqual([]);
  expect(r.ran()).toBeNull();
  rmSync(r.dir, { recursive: true, force: true });
});

// The first half: the copy the machine starts (the image's) against an origin of the test.
test("the first half: keys made 600, the checkout cloned, main pulled, and the checkout's own copy run in its place", async () => {
  const r = rig();
  // The origin's run.sh says which commit it is of, so the copy that ran is read from the output.
  const origin = join(r.dir, "origin");
  mkdirSync(join(origin, "tools/cloud-brain/fly"), { recursive: true });
  const mark = (n: number) => {
    writeFileSync(join(origin, "tools/cloud-brain/fly/run.sh"), `#!/bin/bash\necho "the checkout's copy ${n}, RUN_SH_PULLED=$RUN_SH_PULLED"\nexit 5\n`);
    git(origin, "add", "."); git(origin, "commit", "-q", "-m", "copy " + n);
  };
  git(origin, "init", "-q", "-b", "main");
  mark(1);
  mkdirSync(join(r.dir, "home/.ssh"), { recursive: true });
  writeFileSync(join(r.dir, "home/.ssh/lopecode-dev.key"), "not a key", { mode: 0o755 });
  const fresh = join(r.dir, "volume/lopecode-dev");
  const env = { RUN_SH_PULLED: "", CHECKOUT: fresh, FLY_RUN_ORIGIN: origin };

  const first = await run(r, env);
  expect(first.out).toContain(`no checkout at ${fresh}: cloning`);
  expect(first.out).toContain("the checkout's copy 1, RUN_SH_PULLED=1");
  expect(first.code).toBe(5);
  expect(statSync(join(r.dir, "home/.ssh/lopecode-dev.key")).mode & 0o777).toBe(0o600);

  // A second start, after main moved: no clone, and the copy that runs is the one the pull brought.
  mark(2);
  const second = await run(r, env);
  expect(second.out).not.toContain("cloning");
  expect(second.out).toContain("the checkout's copy 2, RUN_SH_PULLED=1");
  expect(second.code).toBe(5);

  // main cannot be pulled (the origin is gone): exit 1, and no copy is run.
  rmSync(origin, { recursive: true, force: true });
  const third = await run(r, env);
  expect(third.out).toContain("main was not pulled; nothing is started");
  expect(third.out).not.toContain("the checkout's copy");
  expect(third.code).toBe(1);
  expect(r.ran()).toBeNull();
  rmSync(r.dir, { recursive: true, force: true });
});

test("no origin to clone from: exit 1, and nothing is started; the line for HOME=/ is in the file", async () => {
  const r = rig();
  const got = await run(r, { HOME: "/", RUN_SH_PULLED: "", CHECKOUT: join(r.dir, "none"), FLY_RUN_ORIGIN: join(r.dir, "no-origin") });
  expect(got.out).toContain("the clone failed; nothing is started");
  expect(got.code).toBe(1);
  expect(r.ran()).toBeNull();
  // What HOME=/ becomes (`fly machine exec` gives it) is not run here: /root is not the test's to write. The line is held as text.
  expect(readFileSync(RUN, "utf8")).toContain('[ "$HOME" = / ] && export HOME=/root');
  rmSync(r.dir, { recursive: true, force: true });
});

test("the files beside it: the image starts run.sh, the machine's keys are the ones ssh is told of, and the build deploys nothing", () => {
  const docker = readFileSync(join(FLY, "Dockerfile"), "utf8");
  expect(docker).toContain("COPY run.sh /usr/local/bin/fly-run.sh");
  expect(docker).toContain('CMD ["/usr/local/bin/fly-run.sh"]');
  expect(docker).toContain("COPY ssh_config /etc/ssh/ssh_config.d/github.conf");

  const machine = JSON.parse(readFileSync(join(FLY, "machine.json"), "utf8"));
  expect(machine.config.restart).toEqual({ policy: "no" });
  expect(machine.config.init).toBeUndefined();
  expect(machine.config.mounts.map((m: any) => m.path)).toEqual(["/data"]);
  const keys = machine.config.files.map((f: any) => f.guest_path).filter((p: string) => p.endsWith(".key")).sort();
  const ssh = readFileSync(join(FLY, "ssh_config"), "utf8");
  const named = [...ssh.matchAll(/^\s*IdentityFile (\S+)$/gm)].map((m) => m[1]).sort();
  expect(keys).toEqual(named);
  expect(keys.length).toBe(3);
  // The remotes run.sh sets are aliases of that file.
  const hosts = [...ssh.matchAll(/^Host (\S+)$/gm)].map((m) => m[1]);
  const run = readFileSync(RUN, "utf8");
  for (const used of [...run.matchAll(/git@(github-[a-z-]+):/g)].map((m) => m[1])) expect(hosts).toContain(used);
  // The tokens' file is where run.sh looks for it.
  expect(machine.config.files.map((f: any) => f.guest_path)).toContain("/root/cb4-tokens.json");
  expect(run).toContain('TOKENS="${FLY_TOKENS:-/root/cb4-tokens.json}"');

  const dry = Bun.spawnSync(["bash", join(FLY, "build.sh"), "a-label"], { env: { ...process.env, DRY: "1" }, stdout: "pipe" });
  const cmd = dry.stdout.toString().trim().split("\n");
  expect(cmd.slice(0, 5)).toEqual(["fly", "deploy", "--build-only", "--push", "--remote-only"]);
  expect(cmd.slice(-2)).toEqual(["--image-label", "a-label"]);
});
