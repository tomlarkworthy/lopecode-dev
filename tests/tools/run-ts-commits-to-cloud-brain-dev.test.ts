// cloud-brain-dev's second product: an issue about cloud-brain-dev itself is doable (with a git token), its patch is
// the whole diff from cloud-brain-dev's main (patch.ts devPatch), push.ts pushes it after a pass, a change to a driver
// file waits for an approve, and laptop.ts fast-forwards the checkout before each drain (patch.ts fastForward).
// Issue run-ts-commits-to-cloud-brain-dev; tools/cloud-brain/records/run-ts-commits-to-cloud-brain-dev.md.
// A bare repository stands in for cloud-brain-dev's main, a Bun.serve for the Brain.
//
//   bun test --timeout=30000 ./tests/tools/run-ts-commits-to-cloud-brain-dev.test.ts
import { test, expect, afterAll } from "bun:test";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

const dev = resolve(import.meta.dir, "../../cloud-brain-dev");
const have = existsSync(resolve(dev, "push.ts"));
if (!have) console.log("skipped: cloud-brain-dev has no push.ts here (git submodule update --init cloud-brain-dev)");
const patch = have ? await import(resolve(dev, "patch.ts")) : null;
// drain.ts reads its tokens and the Brain's address when imported, and runs nothing unless it is the main module.
const drain = have ? await (async () => { const was = { ...process.env }; Object.assign(process.env, { AGENTS_TOKEN: "p", BRAIN_TOKEN: "w", BRAIN: "http://127.0.0.1:9" }); try { return await import(resolve(dev, "drain.ts")); } finally { for (const k of ["AGENTS_TOKEN", "BRAIN_TOKEN", "BRAIN"]) if (was[k] === undefined) delete process.env[k]; else process.env[k] = was[k]; } })() : null;

const rig = mkdtempSync(resolve(tmpdir(), "dev-push-"));
afterAll(() => rmSync(rig, { recursive: true, force: true }));
const BUN = process.execPath, SYSTEM = [dirname(BUN), "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");
const git = (dir: string, ...a: string[]) => execFileSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "init.defaultBranch=main", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
let n = 0;
// An upstream (bare, main with one commit) and a fork of it (bare), as git.work makes w-ID.
const repos = () => {
  const d = resolve(rig, "r" + ++n), seed = resolve(d, "seed"), up = resolve(d, "up.git"), fork = resolve(d, "fork.git");
  mkdirSync(seed, { recursive: true });
  git(seed, "init", "-q");
  writeFileSync(resolve(seed, "README.md"), "one\n");
  writeFileSync(resolve(seed, "issue.ts"), "// a tool\n");
  git(seed, "add", "README.md", "issue.ts");
  git(seed, "commit", "-q", "-m", "seed");
  execFileSync("git", ["clone", "-q", "--bare", seed, up]);
  execFileSync("git", ["clone", "-q", "--bare", up, fork]);
  return { d, up, fork };
};
// A clone of the fork with one commit of the writer's on it, pushed to the fork.
const write = (fork: string, files: Record<string, string>) => {
  const w = resolve(dirname(fork), "w" + ++n);
  execFileSync("git", ["clone", "-q", fork, w]);
  for (const [f, text] of Object.entries(files)) { mkdirSync(dirname(resolve(w, f)), { recursive: true }); writeFileSync(resolve(w, f), text); git(w, "add", f); }
  git(w, "commit", "-q", "-m", "the change");
  git(w, "push", "-q", "origin", "HEAD:main");
  return w;
};

test.skipIf(!have)("doable: an issue about cloud-brain-dev only with dev, and `major` does not keep it out; a service's still does", () => {
  const issues = [
    { id: "svc", state: "ready", about: "brain-x-foo", labels: [], opened_at: 1 },
    { id: "devone", state: "ready", about: "cloud-brain-dev", labels: [], opened_at: 2 },
    { id: "devmajor", state: "ready", about: "cloud-brain-dev", labels: ["major"], opened_at: 3 },
    { id: "devowner", state: "ready", about: "cloud-brain-dev", labels: ["needs-owner"], opened_at: 4 },
    { id: "svcmajor", state: "ready", about: "brain-x-foo", labels: ["major"], opened_at: 5 },
    { id: "loop", state: "ready", about: "loop", labels: [], opened_at: 6 },
  ];
  expect(drain.doable(issues).map((i: any) => i.id)).toEqual(["svc"]);
  expect(drain.doable(issues, new Set(), { dev: true }).map((i: any) => i.id)).toEqual(["svc", "devone", "devmajor"]);
});

test.skipIf(!have)("drain.ts --list: dev issues are listed when GIT_TOKEN is set, not without", async () => {
  const issues = [{ id: "devone", state: "ready", about: "cloud-brain-dev", labels: [], title: "t", opened_at: 1 }];
  const s = Bun.serve({ port: 0, fetch(req) { const m = new URL(req.url).pathname.split(".").slice(-2).join("."); return m === "issue.list" ? Response.json({ issues }) : m === "issue.queue" ? Response.json({ queue: [{ id: "devone" }] }) : new Response("no", { status: 500 }); } });
  try {
    const run = async (extra: Record<string, string>) => { const p = Bun.spawn([BUN, resolve(dev, "drain.ts"), "--list"], { cwd: dev, env: { PATH: SYSTEM, BRAIN: "http://127.0.0.1:" + s.port, AGENTS_TOKEN: "p", ...extra }, stdout: "pipe" }); return JSON.parse((await new Response(p.stdout).text()).trim().split("\n").pop()!); };
    expect((await run({})).doable).toEqual([]);
    expect((await run({ GIT_TOKEN: "g" })).doable.map((i: any) => i.id)).toEqual(["devone"]);
  } finally { s.stop(true); }
});

test.skipIf(!have)("devPatch: the whole diff from upstream main, the same SHA-256 from two clones, the files it changes", async () => {
  const { up, fork } = repos();
  const w = write(fork, { "run.ts": "// changed\n", "records/x.md": "a record\n" });
  const a = patch.devPatch(w, up);
  const other = resolve(dirname(fork), "other"); execFileSync("git", ["clone", "-q", fork, other]);
  const b = patch.devPatch(other, up);
  expect(a.sha).toBe(b.sha);
  expect(a.files.sort()).toEqual(["records/x.md", "run.ts"]);
  expect(a.base).toBe(git(up, "rev-parse", "main"));
  expect(patch.needsApprove(a.files)).toEqual(["run.ts"]);
  expect(patch.needsApprove(["README.md", "records/x.md", "records/a/b.md", "bunfig.toml", ".env", "evil.ts", "roles/dev-writer.md", "AGENTS.md"])).toEqual(["records/a/b.md", "bunfig.toml", ".env", "evil.ts", "roles/dev-writer.md", "AGENTS.md"]);
  // the writer's path to the same SHA-256: work.ts patch --dev, run in its clone
  for (const f of ["work.ts", "patch.ts"]) writeFileSync(resolve(w, f), readFileSync(resolve(dev, f)));
  git(w, "config", "brain.work", "devx");
  const printed = JSON.parse(execFileSync(BUN, [resolve(w, "work.ts"), "patch", "--dev", "--out", resolve(dirname(fork), "w.patch")], { cwd: w, encoding: "utf8", env: { PATH: SYSTEM, DEV_UPSTREAM: up } }).trim().split("\n").pop()!);
  expect(printed.patch).toBe(a.sha);
  expect(readFileSync(resolve(dirname(fork), "w.patch"), "utf8")).toBe(a.bytes);
  rmSync(resolve(w, "work.ts")); rmSync(resolve(w, "patch.ts"));
  // upstream moving on does not change the patch: the base is where the fork left it.
  const u2 = resolve(dirname(fork), "u2"); execFileSync("git", ["clone", "-q", up, u2]);
  writeFileSync(resolve(u2, "README.md"), "two\n"); git(u2, "commit", "-q", "-am", "moved"); git(u2, "push", "-q", "origin", "HEAD:main");
  expect(patch.devPatch(w, up).sha).toBe(a.sha);
  // nothing committed past the base, and a clone with a change in no commit
  const plain = resolve(dirname(fork), "plain"); execFileSync("git", ["clone", "-q", up, plain]);
  expect(patch.devPatch(plain, up).why).toContain("nothing changed");
  writeFileSync(resolve(w, "run.ts"), "// dirty\n");
  expect(patch.devPatch(w, up).why).toContain("not as its commit is");
});

test.skipIf(!have)("fastForward: deploy/ put back and the checkout brought to main; another file in no commit, or a checkout ahead, is a stop", () => {
  const { up } = repos();
  const here = resolve(dirname(up), "here"); execFileSync("git", ["clone", "-q", up, here]);
  // A submodule's checkout is a detached head, as the laptop's is.
  git(here, "checkout", "-q", "--detach");
  mkdirSync(resolve(here, "deploy"));
  writeFileSync(resolve(here, "deploy/shared.json"), "{}\n"); git(here, "add", "deploy/shared.json"); git(here, "commit", "-q", "-m", "shared"); git(here, "push", "-q", "origin", "HEAD:main");
  expect(patch.fastForward(here)).toMatchObject({ from: git(here, "rev-parse", "HEAD"), to: git(here, "rev-parse", "HEAD") });
  // a push to main from elsewhere that touches the same deploy file sync.ts changed here
  const there = resolve(dirname(up), "there"); execFileSync("git", ["clone", "-q", up, there]);
  writeFileSync(resolve(there, "deploy/shared.json"), '{"a":1}\n'); writeFileSync(resolve(there, "run.ts"), "// new\n"); git(there, "add", "run.ts", "deploy/shared.json"); git(there, "commit", "-q", "-m", "new tools"); git(there, "push", "-q", "origin", "HEAD:main");
  writeFileSync(resolve(here, "deploy/shared.json"), '{"synced":true}\n');
  const ff = patch.fastForward(here);
  expect(ff.to).toBe(git(there, "rev-parse", "HEAD"));
  expect(readFileSync(resolve(here, "run.ts"), "utf8")).toBe("// new\n");
  writeFileSync(resolve(here, "README.md"), "edited\n");
  expect(patch.fastForward(here).why).toContain("README.md");
  git(here, "checkout", "--", "README.md");
  // ahead of main alone, then ahead and behind
  writeFileSync(resolve(here, "local.ts"), "x\n"); git(here, "add", "local.ts"); git(here, "commit", "-q", "-m", "local");
  const ahead = git(here, "rev-parse", "HEAD");
  expect(patch.fastForward(here).why).toContain("commits origin's main has not");
  expect(git(here, "rev-parse", "HEAD")).toBe(ahead);
  writeFileSync(resolve(there, "README.md"), "three\n"); git(there, "commit", "-q", "-am", "three"); git(there, "push", "-q", "origin", "HEAD:main");
  expect(patch.fastForward(here).why).toContain("commits origin's main has not");
});

// push.ts in a copy of cloud-brain-dev: work.ts a stub that clones the fork, the Brain a Bun.serve with the record given.
const pushRig = (fork: string, issue: any, events: any[]) => {
  const copy = resolve(dirname(fork), "copy" + ++n);
  mkdirSync(copy);
  for (const f of ["push.ts", "patch.ts"]) writeFileSync(resolve(copy, f), readFileSync(resolve(dev, f)));
  writeFileSync(resolve(copy, "work.ts"), `const a = process.argv; require("node:child_process").execFileSync("git", ["clone", "-q", ${JSON.stringify(fork)}, a[a.indexOf("--dir") + 1]]);\n`);
  const calls: { m: string; body: any }[] = [];
  const server = Bun.serve({ port: 0, async fetch(req) {
    const m = new URL(req.url).pathname.replace("/xrpc/com.lopecode.brain.", "");
    const body = req.method === "POST" ? await req.json().catch(() => null) : null;
    calls.push({ m, body });
    if (m === "issue.get") return Response.json({ issue, events });
    if (m === "git.token") return req.headers.get("authorization") === "Bearer gitparent" ? Response.json({ result: { plaintext: "t60" } }) : new Response("no", { status: 401 });
    if (m === "issue.move" || m === "issue.comment") return Response.json({ seq: 99 });
    return new Response("not in the rig", { status: 500 });
  } });
  const run = async (...a: string[]) => {
    const p = Bun.spawn([BUN, resolve(copy, "push.ts"), ...a], { cwd: copy, env: { PATH: SYSTEM, HOME: process.env.HOME || "", BRAIN: "http://127.0.0.1:" + server.port, ISSUE_TOKEN: "pusher", BRAIN_TOKEN: "w", GIT_TOKEN: "gitparent", ...extra }, stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { code, err, last: JSON.parse(out.trim().split("\n").pop() || "null") };
  };
  let extra: Record<string, string> = {};
  return { calls, run, set: (e: Record<string, string>) => (extra = e), stop: () => server.stop(true) };
};
const record = (sha: string, more: any[] = []) => [
  { seq: 1, type: "moved", move: "start", to: "in-progress", by: { via: "writer" } },
  { seq: 2, type: "moved", move: "submit", to: "in-review", refs: [{ kind: "patch", value: sha }], by: { via: "writer" } },
  { seq: 3, type: "reviewed", verdict: "pass", refs: [{ kind: "patch", value: sha }], by: { via: "reader" } },
  ...more,
];

test.skipIf(!have)("push.ts: a passed change goes on main as a fast-forward, the issue moved done with the commit", async () => {
  const { up, fork } = repos();
  const w = write(fork, { "records/x.md": "rec\n", "README.md": "better\n" });
  const sha = patch.devPatch(w, up).sha;
  const r = pushRig(fork, { id: "devx", about: "cloud-brain-dev", state: "in-review", labels: [] }, record(sha));
  r.set({ GIT_PUSH_URL: up, DEV_UPSTREAM: up });
  try {
    const dry = await r.run("devx", "--dry");
    expect(dry.last).toMatchObject({ ready: true, patch: sha });
    expect(git(up, "rev-parse", "main")).not.toBe(git(w, "rev-parse", "HEAD"));
    const got = await r.run("devx");
    expect(got.code).toBe(0);
    expect(got.last).toMatchObject({ pushed: true, moved: "done", head: git(w, "rev-parse", "HEAD") });
    expect(git(up, "rev-parse", "main")).toBe(git(w, "rev-parse", "HEAD"));
    const move = r.calls.find((c) => c.m === "issue.move")!.body;
    expect(move).toMatchObject({ id: "devx", to: "done", refs: [{ kind: "patch", value: sha }, { kind: "commit", value: git(w, "rev-parse", "HEAD") }] });
    expect(JSON.stringify(r.calls)).not.toContain("t60");
  } finally { r.stop(); }
});

test.skipIf(!have)("push.ts: main moved since the base is refused, said on the issue, nothing moved", async () => {
  const { up, fork } = repos();
  const w = write(fork, { "README.md": "better\n" });
  const sha = patch.devPatch(w, up).sha;
  const u2 = resolve(dirname(fork), "u2"); execFileSync("git", ["clone", "-q", up, u2]);
  writeFileSync(resolve(u2, "README.md"), "two\n"); git(u2, "commit", "-q", "-am", "moved"); git(u2, "push", "-q", "origin", "HEAD:main");
  const was = git(up, "rev-parse", "main");
  const r = pushRig(fork, { id: "devy", about: "cloud-brain-dev", state: "in-review", labels: [] }, record(sha));
  r.set({ GIT_PUSH_URL: up, DEV_UPSTREAM: up });
  try {
    const got = await r.run("devy");
    expect(got.code).toBe(1);
    expect(got.last.why).toContain("refused");
    expect(git(up, "rev-parse", "main")).toBe(was);
    expect(r.calls.map((c) => c.m)).toContain("issue.comment");
    expect(r.calls.map((c) => c.m)).not.toContain("issue.move");
  } finally { r.stop(); }
});

test.skipIf(!have)("push.ts: a patch other than the one read, a driver file with no approve, and the label major are stops", async () => {
  const { up, fork } = repos();
  const w = write(fork, { "run.ts": "// driver\n" });
  const sha = patch.devPatch(w, up).sha;
  const was = git(up, "rev-parse", "main");
  let r = pushRig(fork, { id: "devz", about: "cloud-brain-dev", state: "in-review", labels: [] }, record("0".repeat(64)));
  r.set({ GIT_PUSH_URL: up, DEV_UPSTREAM: up });
  try { expect((await r.run("devz")).last.why).toContain("changed after the review"); } finally { r.stop(); }
  r = pushRig(fork, { id: "devz", about: "cloud-brain-dev", state: "in-review", labels: [] }, record(sha));
  r.set({ GIT_PUSH_URL: up, DEV_UPSTREAM: up });
  try { const g = await r.run("devz"); expect(g.code).toBe(1); expect(g.last.why).toContain("run.ts"); } finally { r.stop(); }
  r = pushRig(fork, { id: "devz", about: "cloud-brain-dev", state: "in-review", labels: ["major"] }, record(sha));
  r.set({ GIT_PUSH_URL: up, DEV_UPSTREAM: up });
  try { expect((await r.run("devz")).last.why).toContain("label major"); } finally { r.stop(); }
  r = pushRig(fork, { id: "devz", about: "brain-x-foo", state: "in-review", labels: [] }, record(sha));
  try { expect((await r.run("devz")).last.why).toContain("not cloud-brain-dev"); } finally { r.stop(); }
  expect(git(up, "rev-parse", "main")).toBe(was);
});

test.skipIf(!have)("push.ts: after to-approval and approve the driver change is pushed and commented, once", async () => {
  const { up, fork } = repos();
  const w = write(fork, { "run.ts": "// driver\n" });
  const sha = patch.devPatch(w, up).sha;
  const approved = record(sha, [{ seq: 4, type: "moved", move: "to-approval", to: "awaiting-approval", by: { via: "run" } }, { seq: 5, type: "moved", move: "approve", to: "done", by: { via: "delegation:eb3db9d0c6a5" } }]);
  let r = pushRig(fork, { id: "deva", about: "cloud-brain-dev", state: "done", labels: ["major"] }, approved);
  r.set({ GIT_PUSH_URL: up, DEV_UPSTREAM: up });
  try {
    const got = await r.run("deva");
    expect(got.last).toMatchObject({ pushed: true, commented: "yes" });
    expect(git(up, "rev-parse", "main")).toBe(git(w, "rev-parse", "HEAD"));
    expect(r.calls.find((c) => c.m === "issue.comment")!.body.key).toBe("push-deva/pushed-2");
  } finally { r.stop(); }
  r = pushRig(fork, { id: "deva", about: "cloud-brain-dev", state: "done", labels: ["major"] }, [...approved, { seq: 6, type: "commented", key: "push-deva/pushed-2" }]);
  r.set({ GIT_PUSH_URL: up, DEV_UPSTREAM: up });
  try { expect((await r.run("deva")).last.why).toContain("already"); } finally { r.stop(); }
  // done by `pass`, with no approve, is not pushed again
  r = pushRig(fork, { id: "deva", about: "cloud-brain-dev", state: "done", labels: [] }, record(sha));
  try { expect((await r.run("deva")).last.why).toContain("is done"); } finally { r.stop(); }
});

// run.ts on a dev issue: `major` does not stop it, the writer is told to read roles/dev-writer.md of the checkout, and
// GIT_TOKEN is not in the agent's environment. The agent submits nothing, so the run stops at writer-not-submitted.
test.skipIf(!have)("run.ts: a dev issue labelled major is run, on the dev-writer brief, with no GIT_TOKEN in the agent", async () => {
  const copy = resolve(rig, "run-copy");
  mkdirSync(copy);
  for (const f of ["run.ts", "sandbox.ts", "patch.ts"]) writeFileSync(resolve(copy, f), readFileSync(resolve(dev, f)));
  writeFileSync(resolve(copy, "work.ts"), `const d = process.argv[process.argv.indexOf("--dir") + 1]; require("node:fs").mkdirSync(d, { recursive: true });\n`);
  const seen = resolve(rig, "agent-saw");
  writeFileSync(resolve(copy, "agent.sh"), `#!/bin/sh\nprintf '%s\\n' "$@" > "${seen}"; env | grep -c '^GIT_TOKEN' >> "${seen}"\necho '{"usd":0.01,"session":"s1","turns":1}'\n`);
  chmodSync(resolve(copy, "agent.sh"), 0o755);
  let k = 0;
  const server = Bun.serve({ port: 0, async fetch(req) {
    const m = new URL(req.url).pathname.replace("/xrpc/com.lopecode.brain.", "");
    if (m === "issue.get") return Response.json({ issue: { id: "dev-one", state: "ready", about: "cloud-brain-dev", labels: ["major"] }, events: [] });
    if (m === "delegation.create") return Response.json({ id: "d" + ++k, secret: "s" + k });
    if (["issue.cost", "issue.comment", "issue.label", "issue.move"].includes(m)) return Response.json({ seq: 1 });
    if (m === "delegation.revoke") return Response.json({ revoked: true });
    return new Response("not in the rig", { status: 500 });
  } });
  try {
    const p = Bun.spawn([BUN, resolve(copy, "run.ts"), "dev-one"], { cwd: copy, env: { PATH: SYSTEM, HOME: process.env.HOME || "", BRAIN: "http://127.0.0.1:" + server.port, AGENTS_TOKEN: "parent", BRAIN_TOKEN: "work", GIT_TOKEN: "gitparent" }, stdout: "pipe", stderr: "pipe" });
    const [out, , code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    expect(code).toBe(1);
    expect(JSON.parse(out.trim().split("\n").pop()!)).toMatchObject({ outcome: "writer-not-submitted" });
    const saw = readFileSync(seen, "utf8");
    expect(saw).toContain("dev-writer\n");
    expect(saw).toContain(resolve(copy, "roles", "dev-writer.md"));
    expect(saw.trim().split("\n").pop()).toBe("0");
  } finally { server.stop(true); }
});

// run.ts to the end of a dev issue: a writer stub that submits the patch, a reader stub that passes it, through a Brain
// that keeps the record. A driver file: labelled major and moved to awaiting-approval, nothing pushed. Another file:
// push.ts run, main moved to the writer's head, the issue done.
const fullRun = async (files: Record<string, string>) => {
  const { up, fork } = repos();
  const w = write(fork, files), sha = patch.devPatch(w, up).sha;
  const copy = resolve(dirname(fork), "full" + ++n);
  mkdirSync(copy);
  for (const f of ["run.ts", "sandbox.ts", "patch.ts", "push.ts"]) writeFileSync(resolve(copy, f), readFileSync(resolve(dev, f)));
  writeFileSync(resolve(copy, "issue.ts"), "// the driver's issue.ts\n");
  writeFileSync(resolve(copy, "work.ts"), `const a = process.argv; require("node:child_process").execFileSync("git", ["clone", "-q", ${JSON.stringify(fork)}, a[a.indexOf("--dir") + 1]]); console.log("{}");\n`);
  const readerSaw = resolve(copy, "reader-saw");
  const post = (m: string, body: string) => `curl -s -X POST -H "authorization: Bearer $ISSUE_TOKEN" -H 'content-type: application/json' "$BRAIN/xrpc/com.lopecode.brain.${m}" -d '${body}' >/dev/null`;
  writeFileSync(resolve(copy, "agent.sh"), `#!/bin/sh\ncase "$1" in\n  dev-writer) ${post("issue.move", `{"id":"dev-full","to":"in-review","refs":[{"kind":"patch","value":"${sha}"}]}`)};;\n  dev-reviewer) cat issue.ts > "${readerSaw}"; ls -a >> "${readerSaw}"; ${post("issue.review", `{"id":"dev-full","verdict":"pass","refs":[{"kind":"patch","value":"${sha}"}]}`)};;\nesac\necho '{"usd":0.01,"session":"s1","turns":1}'\n`);
  chmodSync(resolve(copy, "agent.sh"), 0o755);
  const issue: any = { id: "dev-full", state: "ready", about: "cloud-brain-dev", labels: [] }, events: any[] = [], names: Record<string, string> = {}, calls: { m: string; body: any }[] = [];
  let k = 0, seq = 0;
  const server = Bun.serve({ port: 0, async fetch(req) {
    const m = new URL(req.url).pathname.replace("/xrpc/com.lopecode.brain.", ""), body = req.method === "POST" ? await req.json().catch(() => null) : null;
    const who = names[(req.headers.get("authorization") || "").slice(7)] || "parent", by = { holder: "secret:" + who, via: "delegation:" + who };
    calls.push({ m, body });
    if (m === "issue.get") return Response.json({ issue, events });
    if (m === "delegation.create") { names["s" + ++k] = body.name; return Response.json({ id: "d" + k, secret: "s" + k }); }
    if (m === "delegation.revoke") return Response.json({ revoked: true });
    if (m === "issue.move") { const move = body.to === "in-review" ? "submit" : body.to === "awaiting-approval" ? "to-approval" : body.to === "done" ? "pass" : "x"; events.push({ seq: ++seq, type: "moved", move, to: body.to, refs: body.refs, by }); issue.state = body.to; return Response.json({ seq }); }
    if (m === "issue.review") { events.push({ seq: ++seq, type: "reviewed", verdict: body.verdict, refs: body.refs, by }); return Response.json({ seq }); }
    if (m === "issue.label") { issue.labels.push(...body.add); return Response.json({ seq: ++seq }); }
    if (m === "git.token") return Response.json({ result: { plaintext: "t60" } });
    if (["issue.cost", "issue.comment"].includes(m)) return Response.json({ seq: ++seq });
    return new Response("not in the rig", { status: 500 });
  } });
  try {
    const p = Bun.spawn([BUN, resolve(copy, "run.ts"), "dev-full"], { cwd: copy, env: { PATH: SYSTEM, HOME: process.env.HOME || "", BRAIN: "http://127.0.0.1:" + server.port, AGENTS_TOKEN: "parent", BRAIN_TOKEN: "work", GIT_TOKEN: "gitparent", GIT_PUSH_URL: up, DEV_UPSTREAM: up }, stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { code, err, last: JSON.parse(out.trim().split("\n").pop()!), issue, calls, up, readerSaw: existsSync(readerSaw) ? readFileSync(readerSaw, "utf8") : "", head: git(w, "rev-parse", "HEAD"), base: git(fork, "rev-parse", "main~1") };
  } finally { server.stop(true); }
};

test.skipIf(!have)("run.ts: a passed dev change to a driver file is labelled major and moved to awaiting-approval, not pushed", async () => {
  const r = await fullRun({ "drain.ts": "// driver\n" });
  expect(r.code).toBe(0);
  expect(r.last).toMatchObject({ outcome: "awaiting-approval", revoked: "3 of 3" });
  expect(r.issue).toMatchObject({ state: "awaiting-approval", labels: ["major"] });
  expect(git(r.up, "rev-parse", "main")).toBe(r.base);
  expect(r.calls.map((c) => c.m)).not.toContain("git.token");
});

test.skipIf(!have)("run.ts: a passed dev change to another file is pushed by push.ts and the issue is done", async () => {
  const r = await fullRun({ "README.md": "better\n" });
  expect(r.code).toBe(0);
  expect(r.last).toMatchObject({ outcome: "pushed", push: { pushed: true, moved: "done", head: r.head } });
  expect(r.issue.state).toBe("done");
  expect(git(r.up, "rev-parse", "main")).toBe(r.head);
});

test.skipIf(!have)("run.ts: the reader's clone has the driver's issue.ts, and no bunfig.toml or .env of the writer's; both need an approve", async () => {
  const r = await fullRun({ "bunfig.toml": 'preload = ["./evil.ts"]\n', ".env": "BRAIN=https://elsewhere.example\n", "issue.ts": "// the writer's issue.ts\n" });
  expect(r.last).toMatchObject({ outcome: "awaiting-approval" });
  expect(r.issue.labels).toEqual(["major"]);
  expect(r.readerSaw).toContain("// the driver's issue.ts");
  expect(r.readerSaw).not.toContain("the writer's issue.ts");
  expect(r.readerSaw.split("\n")).not.toContain("bunfig.toml");
  expect(r.readerSaw.split("\n")).not.toContain(".env");
});
