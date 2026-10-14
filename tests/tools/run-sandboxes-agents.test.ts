// cloud-brain-dev run.ts starts each agent in safehouse and checks that sandbox before any token is made; with no
// safehouse and a key file in reach it starts nothing; drain.ts ends at that stop (issue
// run-sandboxes-its-agents-not-the-loop; tools/cloud-brain/records/run-sandboxes-its-agents-not-the-loop.md).
// safehouse here is a stub on the PATH: it passes only the --env-pass names, as safehouse does, and no file rule.
//
//   bun test --timeout=30000 ./tests/tools/run-sandboxes-agents.test.ts
import { test, expect, beforeAll, afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

const dev = resolve(import.meta.dir, "../../cloud-brain-dev");
const have = existsSync(resolve(dev, "sandbox.ts"));
if (!have) console.log("skipped: cloud-brain-dev has no sandbox.ts here (git submodule update --init cloud-brain-dev)");
const box = have ? await import(resolve(dev, "sandbox.ts")) : null;

const rig = mkdtempSync(resolve(tmpdir(), "run-sandbox-"));
const stubs = resolve(rig, "bin"), log = resolve(rig, "safehouse.log");
// The stub: each argument a line of the log, then each variable it lets in, then the command after `--` with only the --env-pass names and PATH.
const STUB = `#!/bin/bash
printf '%s\\n' "$@" >> "${log}"; echo --- >> "${log}"
names=PATH
while [ $# -gt 0 ] && [ "$1" != "--" ]; do case "$1" in --env-pass=*) names="$names,\${1#--env-pass=}";; esac; shift; done
shift
keep=(); IFS=, read -ra N <<< "$names"; for n in "\${N[@]}"; do [ -n "\${!n+x}" ] && keep+=("$n=\${!n}"); done
printf 'env %s\\n' "\${keep[@]}" >> "${log}"
exec env -i "\${keep[@]}" "$@"
`;
const BUN = process.execPath;
// drain.ts starts run.ts as `bun`: bun's own directory, and no other of the caller's PATH (safehouse is in one).
const SYSTEM = [dirname(BUN), "/usr/bin", "/bin", "/usr/sbin", "/sbin"];
const fakeDev = (name: string, metadev = 'export CLAUDE_CONFIG_DIR=/x\nENV_PASS="CLAUDE_CONFIG_DIR"\nSAFEHOUSE_ARGS=(\n  --env-pass="$ENV_PASS"\n  --add-dirs-ro=/opt/one\n)\n') => {
  const d = resolve(rig, name);
  mkdirSync(resolve(d, "tools/cloud-brain/.emitted"), { recursive: true });
  writeFileSync(resolve(d, "metadev"), metadev);
  return d;
};

beforeAll(() => {
  mkdirSync(stubs, { recursive: true });
  writeFileSync(resolve(stubs, "safehouse"), STUB);
  chmodSync(resolve(stubs, "safehouse"), 0o755);
});
afterAll(() => rmSync(rig, { recursive: true, force: true }));

const withPath = <T>(path: string, f: () => T): T => { const was = process.env.PATH; process.env.PATH = path; try { return f(); } finally { process.env.PATH = was; } };

test.skipIf(!have)("the key files are <base>.json and <base>-*.json of the state directories, and KEY_FILE", () => {
  const d = fakeDev("keys"), here = resolve(d, "cloud-brain-dev");
  mkdirSync(here);
  for (const f of ["cb4.json", "cb4-tokens.json", "cb4-issues-tokens.json", "other.json", "cb4.txt"]) writeFileSync(resolve(d, "tools/cloud-brain/.emitted", f), "{}");
  const extra = resolve(rig, "key.json"); writeFileSync(extra, "{}");
  const got = box.keyFiles(here, "https://cb4.endpointservices.workers.dev", { KEY_FILE: extra });
  expect(got.map((f: string) => f.split("/").pop()).sort()).toEqual(["cb4-issues-tokens.json", "cb4-tokens.json", "cb4.json", "key.json"]);
  // The base is the Brain's: another Brain's state file is other.json.
  expect(box.keyFiles(here, "https://other.example.workers.dev", {}).map((f: string) => f.split("/").pop())).toEqual(["other.json"]);
});

test.skipIf(!have)("no safehouse: refused with a key file in reach, none without", () => {
  const d = fakeDev("nosafehouse"), here = resolve(d, "cloud-brain-dev");
  mkdirSync(here);
  withPath(SYSTEM.join(":"), () => {
    expect(box.sandbox(here, "https://cb4.x.workers.dev", {}).how).toBe("none");
    writeFileSync(resolve(d, "tools/cloud-brain/.emitted/cb4.json"), "{}");
    const s = box.sandbox(here, "https://cb4.x.workers.dev", {});
    expect(s.how).toBe("refused");
    expect(s.why).toContain("no safehouse on the PATH");
  });
});

test.skipIf(!have)("with safehouse: the agent's argv has metadev's arguments, the pass list, its directory and all-agents", () => {
  const d = fakeDev("wrap"), here = resolve(d, "cloud-brain-dev");
  mkdirSync(here);
  const s = withPath([stubs, ...SYSTEM].join(":"), () => box.sandbox(here, "https://cb4.x.workers.dev", { LOPECODE_DEV: d }));
  expect(s.how).toBe("safehouse");
  const argv = s.wrap("/w/writer", ["/c/dev", "/w/change-1.patch"], ["/c/dev/agent.sh", "service-writer", "the prompt"]);
  expect(argv).toEqual(["safehouse", "--env-pass=CLAUDE_CONFIG_DIR", "--add-dirs-ro=/opt/one", "--env-pass=WORK,BRAIN,BRAIN_TOKEN,ISSUE_TOKEN,MODEL", "--workdir=/w/writer", "--add-dirs-ro=/c/dev:/w/change-1.patch", "--enable=all-agents", "--", "/c/dev/agent.sh", "service-writer", "the prompt"]);
  expect(argv.join(" ")).not.toContain("AGENTS_TOKEN");
  // metadev's export lines are run with its arguments: what they set goes in the agent's environment.
  expect(s.env).toEqual({ CLAUDE_CONFIG_DIR: "/x" });
});

test.skipIf(!have)("a metadev with no SAFEHOUSE_ARGS, or none at all, is refused", () => {
  const d = fakeDev("badmetadev", 'ENV_PASS="X"\necho hi\n'), here = resolve(d, "cloud-brain-dev");
  mkdirSync(here);
  withPath([stubs, ...SYSTEM].join(":"), () => {
    const s = box.sandbox(here, "https://cb4.x.workers.dev", { LOPECODE_DEV: d });
    expect(s.how).toBe("refused");
    expect(s.why).toContain("has no SAFEHOUSE_ARGS");
    expect(box.sandbox(here, "https://cb4.x.workers.dev", { LOPECODE_DEV: resolve(rig, "nowhere") }).how).toBe("refused");
  });
});

test.skipIf(!have)("the check fails on a readable key file or a missing token, and holds when neither", () => {
  const d = fakeDev("check"), here = resolve(d, "cloud-brain-dev");
  mkdirSync(here);
  const key = resolve(d, "tools/cloud-brain/.emitted/cb4.json"); writeFileSync(key, "{}");
  const work = resolve(rig, "check-work"); mkdirSync(work);
  const env = { PATH: [stubs, ...SYSTEM].join(":"), ISSUE_TOKEN: "t", BRAIN_TOKEN: "b", AGENTS_TOKEN: "parent" };
  withPath(env.PATH, () => {
    const s = box.sandbox(here, "https://cb4.x.workers.dev", { LOPECODE_DEV: d });
    let c = box.check(s, work, env);
    expect(c.ok).toBe(false);
    expect(c.lines.join("\n")).toContain("READS " + key);
    // AGENTS_TOKEN is in the caller's environment and not in the pass list: it does not come in.
    expect(c.lines).toContain("has no AGENTS_TOKEN");
    chmodSync(key, 0o000);
    writeFileSync(log, "");
    c = box.check(s, work, env);
    // CLAUDE_CONFIG_DIR is not in the caller's environment: metadev's export sets it, and its ENV_PASS lets it in.
    expect(readFileSync(log, "utf8")).toContain("env CLAUDE_CONFIG_DIR=/x\n");
    expect(c).toEqual({ ok: true, lines: ["reads and writes its directory", "has its token and BRAIN_TOKEN", "has no AGENTS_TOKEN", "reads none of 1 key files of 1"] });
    c = box.check(s, work, { ...env, ISSUE_TOKEN: "" });
    expect(c.ok).toBe(false);
    expect(c.lines).toContain("lacks ISSUE_TOKEN or BRAIN_TOKEN");
    chmodSync(key, 0o600);
  });
});

// A Brain that answers what run.ts and drain.ts ask before an agent, and counts what else is called.
const brain = (issues: any[]) => {
  const calls: string[] = [];
  const server = Bun.serve({ port: 0, async fetch(req) {
    const u = new URL(req.url), m = u.pathname.replace("/xrpc/com.lopecode.brain.", "");
    calls.push(m);
    const j = (o: unknown) => Response.json(o);
    if (m === "issue.get") { const i = issues.find((x) => x.id === u.searchParams.get("id")); return i ? j({ issue: i, events: [] }) : new Response("no", { status: 404 }); }
    if (m === "issue.list") return j({ issues });
    if (m === "issue.queue") return j({ queue: issues.map((i) => ({ id: i.id })), waiting: [] });
    if (m === "issue.lock") return j({ ok: true });
    return new Response("not in the rig", { status: 500 });
  } });
  return { url: "http://127.0.0.1:" + server.port, calls, stop: () => server.stop(true) };
};
const issue = (id: string, t: number) => ({ id, state: "ready", about: "brain-x-foo", labels: [], title: id, opened_at: t });
const tool = async (file: string, a: string[], env: Record<string, string>) => {
  const p = Bun.spawn([BUN, resolve(dev, file), ...a], { cwd: dev, env, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  return { code, out, err, last: JSON.parse(out.trim().split("\n").pop() || "null") };
};

test.skipIf(!have)("run.ts: a sandbox check that fails stops it at sandbox-check, exit 2, before any token is made", async () => {
  const b = brain([issue("one-issue", 1)]);
  const d = fakeDev("run-check"), key = resolve(rig, "run-key.json"); writeFileSync(key, "{}");
  try {
    const r = await tool("run.ts", ["one-issue"], { PATH: [stubs, ...SYSTEM].join(":"), HOME: process.env.HOME || "", BRAIN: b.url, AGENTS_TOKEN: "parent", BRAIN_TOKEN: "work", KEY_FILE: key, LOPECODE_DEV: d });
    expect(r.code).toBe(2);
    expect(r.last.outcome).toBe("sandbox-check");
    expect(r.last.sandbox).toBe("safehouse");
    expect(r.last.check).toContain("READS " + key);
    expect(b.calls).toEqual(["issue.get"]);
    expect(readFileSync(log, "utf8")).toContain("--enable=all-agents");
  } finally { b.stop(); }
});

test.skipIf(!have)("run.ts: no safehouse and a key file in reach starts nothing", async () => {
  const b = brain([issue("one-issue", 1)]);
  const key = resolve(rig, "run-key-2.json"); writeFileSync(key, "{}");
  try {
    const r = await tool("run.ts", ["one-issue"], { PATH: SYSTEM.join(":"), HOME: process.env.HOME || "", BRAIN: b.url, AGENTS_TOKEN: "parent", BRAIN_TOKEN: "work", KEY_FILE: key });
    expect(r.code).toBe(2);
    expect(r.last).toMatchObject({ outcome: "sandbox-check", sandbox: "refused", runs: [], usd: 0 });
    expect(r.last.why).toContain("no safehouse on the PATH");
    expect(b.calls).toEqual(["issue.get"]);
  } finally { b.stop(); }
});

test.skipIf(!have)("drain.ts: a run that stops at sandbox-check ends the drain, and the next issue is not run", async () => {
  const b = brain([issue("first-issue", 1), issue("second-issue", 2)]);
  const key = resolve(rig, "drain-key.json"); writeFileSync(key, "{}");
  try {
    const r = await tool("drain.ts", ["--laptop"], { PATH: SYSTEM.join(":"), HOME: process.env.HOME || "", BRAIN: b.url, AGENTS_TOKEN: "parent", BRAIN_TOKEN: "work", KEY_FILE: key });
    expect(r.code).toBe(1);
    expect(r.last).toMatchObject({ outcome: "sandbox-check", runs: 1 });
    expect(b.calls.filter((c) => c === "issue.get")).toEqual(["issue.get"]);
  } finally { b.stop(); }
});
