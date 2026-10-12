// land.sh <token> <id> --reason … [--comment @file] [--test <command>]…: the landing with no deploy and its submit as
// one command. Issue landing-steps-in-one-script: "a test of the script against a rig for the success path and for a
// failing test (the lock is released, no submit is written)".
//
//   bun test --timeout=30000 ./tests/tools/land.test.ts
//   LAND_SH=/path/to/another/land.sh bun test …
// Every case is a checkout made in a new temporary directory from a bare repository that stands for origin, with a
// worktree made by worktree.sh, and a stand-in for the tracker (LOCK_BASE, ISSUE_AS_BASE) with a token file of its own
// (BRAIN_STATE_DIR). No case calls cb4 or writes a file of this checkout. The stand-in answers the shapes
// brain-x-issues answers for issue.lock (as tests/tools/lock.test.ts has them), issue.get, issue.move and
// issue.comment; it is not the service's code. lock.sh, worktree.sh and issue-as.sh are the real ones, copied.
// Before the change there was no land.sh: every case that runs it failed at the copy.
import { test, expect, afterAll } from "bun:test";
import { inFull } from "./implementer-brief";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, realpathSync, chmodSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const here = resolve(import.meta.dir, "../..");
const TOOLS = ["land.sh", "lock.sh", "worktree.sh", "issue-as.sh"];
const tool = (f: string) => (f === "land.sh" && process.env.LAND_SH) || join(here, "tools/cloud-brain", f);
const TOKENS: Record<string, string> = { "impl-aaaaaa": "secret-a", "impl-bbbbbb": "secret-b" };
const NAME = Object.fromEntries(Object.entries(TOKENS).map(([k, v]) => [v, k]));
const { BRAIN_STATE_DIR: _s, BRAIN_BASE: _b, ISSUE_AS_BASE: _i, LOCK_BASE: _l, LOCK_TOKEN: _t, LOCK_DOCS: _d, ...outer } = process.env;
const gitEnv = { ...outer, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" };
const TMP = realpathSync(tmpdir());
const git = (cwd: string, ...a: string[]) => {
  if (!cwd.startsWith(TMP)) throw new Error(`not a scratch directory: '${cwd}'`);
  const p = Bun.spawnSync(["git", ...a], { cwd, env: gitEnv });
  if (p.exitCode !== 0) throw new Error(`git ${a.join(" ")}: ${p.exitCode} ${p.stderr.toString()}`);
  return p.stdout.toString().trim();
};

type Call = { path: string; body: any; token: string };
const servers: { stop: (now?: boolean) => void }[] = [];
afterAll(() => servers.forEach((s) => s.stop(true)));

// The tracker: one lock table, one issue. `events` is what issue.get answers; `refuse` answers a write's path with a
// status in its place; `loseAtRenew` gives the lock to another writer when the renew comes, as after 600 s.
const standIn = (id: string, starter = "impl-aaaaaa") => {
  const calls: Call[] = [];
  const lock = { who: "", actor: "", taken: 0, until: 0 };
  const start = { seq: 10, type: "moved", id, move: "start", to: "in-progress", by: { holder: "secret:" + starter } };
  const state = { issue: { id, state: "in-progress" }, events: [start] as any[], refuse: {} as Record<string, number>, loseAtRenew: false, seq: 100, keys: new Set<string>() };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const holder = () => (lock.who ? { who: lock.who, taken: lock.taken, until: lock.until } : null);
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url), path = url.pathname.replace("/xrpc/com.lopecode.brain.", "");
      const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
      const body = req.method === "POST" ? await req.json() : null;
      calls.push({ path, body, token });
      if (!NAME[token]) return json({ error: "Unauthorized" }, 401);
      if (state.refuse[path]) return json({ error: "Refused", message: "the stand-in refuses " + path }, state.refuse[path]);
      const now = Date.now();
      if (path === "issue.get") return json({ issue: state.issue, children: [], events: state.events });
      if (path === "issue.lock") {
        const none = () => json({ held: false, holder: holder(), error: lock.who ? "Held" : "NotHeld", message: lock.who ? `land is held by ${lock.who}` : "land is not held" }, 409);
        if (body.renew && state.loseAtRenew) Object.assign(lock, { who: "another-writer", actor: "secret-b", taken: now, until: now + 600000 });
        if (body.release) {
          if (!lock.who) return none();
          if (lock.who !== body.who || lock.actor !== token) return json({ holder: holder(), error: "Refused", message: "left where it is" }, 403);
          const ended = { held: false, name: "land", who: lock.who, n: 1, taken: lock.taken, ended: now, how: "released" };
          Object.assign(lock, { who: "", actor: "" });
          return json(ended);
        }
        if (body.renew) {
          if (lock.who !== body.who || lock.actor !== token) return none();
          lock.until = now + 600000;
          return json({ held: true, name: "land", who: lock.who, n: 1, taken: lock.taken, until: lock.until });
        }
        if (lock.who) return none();
        Object.assign(lock, { who: body.who, actor: token, taken: now, until: now + 600000 });
        return json({ held: true, name: "land", who: lock.who, n: 1, taken: lock.taken, until: lock.until });
      }
      if (path === "issue.move" || path === "issue.comment") {
        if (state.keys.has(body.key)) return json({ id, duplicate: true });
        state.keys.add(body.key);
        return json({ id, seq: ++state.seq });
      }
      return json({ error: "NotFound" }, 404);
    },
  });
  servers.push(server);
  const writes = () => calls.filter((c) => c.path === "issue.move" || c.path === "issue.comment");
  const locks = () => calls.filter((c) => c.path === "issue.lock").map((c) => (c.body.release ? "release" : c.body.renew ? "renew" : "take"));
  return { base: `http://127.0.0.1:${server.port}`, calls, lock, state, writes, locks };
};

// A main checkout with the four tools committed, its origin, another machine's clone, and a worktree bm-topic-a with
// two commits of a writer.
const rig = (id = "task-1", starter?: string) => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "bm-land-")));
  const root = join(base, "root"), origin = join(base, "origin.git"), other = join(base, "other"), dir = join(base, "state");
  mkdirSync(join(root, "tools/cloud-brain"), { recursive: true });
  mkdirSync(dir);
  writeFileSync(join(dir, "cb4-agent-tokens.json"), JSON.stringify(TOKENS));
  git(base, "init", "-q", "--bare", "-b", "main", origin);
  git(root, "init", "-q", "-b", "main", ".");
  for (const f of TOOLS) { copyFileSync(tool(f), join(root, "tools/cloud-brain", f)); chmodSync(join(root, "tools/cloud-brain", f), 0o755); }
  writeFileSync(join(root, "tools/cloud-brain/.gitignore"), ".emitted/\n");
  writeFileSync(join(root, "doc.md"), "base\n");
  writeFileSync(join(root, "other.txt"), "base\n");
  git(root, "add", "doc.md", "other.txt", "tools/cloud-brain");
  git(root, "commit", "-q", "-m", "base");
  git(root, "remote", "add", "origin", origin);
  git(root, "push", "-q", "-u", "origin", "main");
  git(base, "clone", "-q", origin, other);
  const svc = standIn(id, starter);
  const env = { ...gitEnv, TZ: "UTC", BRAIN_STATE_DIR: dir, LOCK_BASE: svc.base, ISSUE_AS_BASE: svc.base, LOCK_DOCS: "0", LAND_EVERY: "0.2", OTHER: other, ISSUE_AS_NOW: "2026-01-01T10:00:00" };
  // The stand-in is in this process, so a command is awaited, never run with spawnSync.
  const sh = async (cwd: string, cmd: string[]) => {
    const p = Bun.spawn(cmd, { cwd, env, stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { code, out: out.trim(), err: err.trim() };
  };
  const made = Bun.spawnSync(["bash", join(root, "tools/cloud-brain/worktree.sh"), "topic-a"], { cwd: root, env });
  const w = made.stdout.toString().trim();
  if (made.exitCode !== 0 || !w.startsWith(TMP)) throw new Error(`no worktree: ${made.exitCode} ${made.stderr.toString()}`);
  const commit = (file: string, text: string, m: string) => { writeFileSync(join(w, file), text); git(w, "add", file); git(w, "commit", "-q", "-m", m); };
  commit("doc.md", "mine\n", "mine 1");
  commit("test.txt", "a test\n", "mine 2");
  // What a landing on another machine does.
  const theirs = (file = "other.txt", text = "theirs\n") => { git(other, "pull", "-q", "--ff-only"); writeFileSync(join(other, file), text); git(other, "add", file); git(other, "commit", "-q", "-m", "landed " + file); git(other, "push", "-q", "origin", "main"); };
  const land = (...a: string[]) => sh(w, ["bash", join(w, "tools/cloud-brain/land.sh"), ...a]);
  const originMain = () => git(origin, "rev-parse", "main");
  const mine = () => git(w, "rev-list", "--reverse", "origin/main..HEAD").split("\n").filter(Boolean);
  return { base, root, origin, other, w, svc, sh, land, theirs, commit, originMain, mine, id };
};
const refs = (shas: string[]) => shas.map((s) => ({ kind: "commit", value: "lopecode-dev@" + s }));

test("the success path: the lock, the rebase on another's landing, the test, the push, the submit with a ref for each pushed commit, the release", async () => {
  const { w, svc, land, theirs, originMain, root } = rig();
  theirs();
  const before = originMain(), rootMain = git(root, "rev-parse", "main");
  const r = await land("impl-aaaaaa", "task-1", "--reason", "one tool; 3 pass, 0 fail", "--test", "grep -q theirs other.txt && grep -q mine doc.md && echo ran");
  expect([r.code, r.err]).toEqual([0, ""]);
  // What is on origin is the worktree's HEAD: the two commits, on top of the other machine's.
  expect(originMain()).toBe(git(w, "rev-parse", "HEAD"));
  const pushed = git(w, "rev-list", "--reverse", `${before}..HEAD`).split("\n");
  expect(pushed.length).toBe(2);
  expect(git(w, "show", "HEAD:other.txt")).toBe("theirs");
  expect(svc.calls.map((c) => c.path)).toEqual(["issue.get", "issue.lock", "issue.lock", "issue.move", "issue.lock"]);
  expect(svc.locks()).toEqual(["take", "renew", "release"]);
  expect(svc.calls.every((c) => c.token === "secret-a")).toBe(true);
  expect(svc.writes().map((c) => c.body)).toEqual([{ key: "impl/task-1/submit-1", id: "task-1", to: "in-review", reason: "one tool; 3 pass, 0 fail", refs: refs(pushed) }]);
  expect(svc.lock.who).toBe("");
  const lines = r.out.split("\n");
  expect(lines.length).toBe(4);
  expect(lines[0]).toMatch(/^land taken by task-1 at /);
  expect(lines[1]).toBe(`pushed ${pushed.join(" ")} to origin/main; 1 file(s) came in at the rebase; 1 test command(s) passed`);
  expect(lines[2]).toBe("submitted impl/task-1/submit-1 seq=101");
  expect(lines[3]).toMatch(/^land released by task-1 at /);
  // The main checkout was not written.
  expect(git(root, "rev-parse", "main")).toBe(rootMain);
  expect(git(root, "status", "--porcelain", "--untracked-files=no")).toBe("");
});

test("a failing test: nothing is pushed, no submit is written, the lock is released, and stdout is that command's output alone", async () => {
  const { svc, land, originMain } = rig();
  const before = originMain();
  const r = await land("impl-aaaaaa", "task-1", "--reason", "r", "--test", "echo first-ok", "--test", "echo 2 fail; echo to-stderr >&2; exit 3", "--test", "echo never");
  expect(r.code).toBe(1);
  expect(r.out).toBe("2 fail\nto-stderr");
  expect(r.err).toBe("land.sh: stopped at test `echo 2 fail; echo to-stderr >&2; exit 3` (exit 3). Nothing was pushed and nothing was written to the issue. The landing lock is released.");
  expect(originMain()).toBe(before);
  expect(svc.writes()).toEqual([]);
  expect(svc.locks()).toEqual(["take", "release"]);
  expect(svc.lock.who).toBe("");
});

test("the lock held by another writer: asked again for --wait seconds, then exit 1 with nothing pushed, nothing written and no release sent", async () => {
  const { svc, land, originMain } = rig();
  Object.assign(svc.lock, { who: "another-writer", actor: "secret-b", taken: Date.now(), until: Date.now() + 600000 });
  const before = originMain();
  const r = await land("impl-aaaaaa", "task-1", "--reason", "r", "--wait", "3");
  expect(r.code).toBe(1);
  expect(r.out).toContain("land is held by another-writer");
  expect(r.err).toContain("stopped at take (exit 1). The lock was not taken in 3 s.");
  expect(originMain()).toBe(before);
  expect(svc.locks().length).toBeGreaterThan(1);
  expect(new Set(svc.locks())).toEqual(new Set(["take"]));
  expect(svc.writes()).toEqual([]);
  expect(svc.lock.who).toBe("another-writer");
});

test("the lock let go while this run asked: the take is made and the landing goes on", async () => {
  const { svc, land, originMain, w } = rig();
  Object.assign(svc.lock, { who: "another-writer", actor: "secret-b", taken: Date.now(), until: Date.now() + 600000 });
  setTimeout(() => Object.assign(svc.lock, { who: "", actor: "" }), 500);
  const r = await land("impl-aaaaaa", "task-1", "--reason", "r", "--wait", "20");
  expect([r.code, r.err]).toEqual([0, ""]);
  expect(originMain()).toBe(git(w, "rev-parse", "HEAD"));
  expect(svc.locks().slice(-3)).toEqual(["take", "renew", "release"]);
});

test("a second round with a comment: the keys carry the round, the comment's body is the file's bytes, and it is written before the submit", async () => {
  const { base, svc, land } = rig();
  svc.state.events.push({ seq: 20, type: "moved", move: "submit", by: { holder: "secret:impl-aaaaaa" } }, { seq: 21, type: "reviewed", verdict: "changes" }, { seq: 22, type: "moved", move: "rework", to: "in-progress", by: { holder: "secret:impl-bbbbbb" } });
  const body = "Round 2. It's a body with an apostrophe, a \"quote\" and\ntwo lines.\n";
  writeFileSync(join(base, "comment.md"), body);
  writeFileSync(join(base, "reason.txt"), "the reviewer's two findings, mended");
  const r = await land("impl-aaaaaa", "task-1", "--reason", "@" + join(base, "reason.txt"), "--comment", "@" + join(base, "comment.md"));
  expect([r.code, r.err]).toEqual([0, ""]);
  const [c, m] = svc.writes();
  expect([c.path, c.body]).toEqual(["issue.comment", { key: "impl/task-1/comment-2", id: "task-1", body }]);
  expect([m.path, m.body.key, m.body.reason, m.body.refs.length]).toEqual(["issue.move", "impl/task-1/submit-2", "the reviewer's two findings, mended", 2]);
  expect(svc.calls.map((x) => x.path).slice(-3)).toEqual(["issue.comment", "issue.move", "issue.lock"]);
  expect(r.out).toContain("submitted impl/task-1/submit-2, after the comment impl/task-1/comment-2 seq=102");
});

test("an issue another token started, or one that is not in-progress: exit 64 before any lock, since its submit would be refused after the push", async () => {
  const a = rig("task-1", "impl-bbbbbb");
  const before = a.originMain();
  const r = await a.land("impl-aaaaaa", "task-1", "--reason", "r");
  expect(r.code).toBe(64);
  expect(r.err).toContain("the last start of the issue is secret:impl-bbbbbb's, and only that token submits it. No lock was taken.");
  expect(a.svc.calls.map((c) => c.path)).toEqual(["issue.get"]);
  expect(a.originMain()).toBe(before);
  // --no-submit writes nothing to the issue, so whose start it is does not bear on it.
  const n = await a.land("impl-aaaaaa", "task-1", "--no-submit");
  expect([n.code, n.err]).toEqual([0, ""]);
  expect(a.svc.writes()).toEqual([]);

  const b = rig();
  b.svc.state.issue.state = "in-review";
  const s = await b.land("impl-aaaaaa", "task-1", "--reason", "r");
  expect(s.code).toBe(64);
  expect(s.err).toContain("the issue is in-review, not in-progress");
  expect(b.svc.locks()).toEqual([]);
});

test("--no-submit: the landing alone, with the pushed commits printed and no write to the issue", async () => {
  const { w, svc, land, originMain, mine } = rig();
  const shas = mine();
  const r = await land("impl-aaaaaa", "task-1", "--no-submit");
  expect([r.code, r.err]).toEqual([0, ""]);
  expect(originMain()).toBe(git(w, "rev-parse", "HEAD"));
  expect(r.out.split("\n")[1]).toBe(`pushed ${shas.join(" ")} to origin/main; 0 file(s) came in at the rebase; 0 test command(s) passed`);
  expect(r.out).not.toContain("submitted");
  expect(svc.writes()).toEqual([]);
  expect(svc.locks()).toEqual(["take", "renew", "release"]);
  const bad = await land("impl-aaaaaa", "task-1", "--no-submit", "--reason", "r");
  expect(bad.code).toBe(64);
});

test("the submit refused after the push: exit 5, the commits are on origin, the lock is released, and stderr has the call to make by hand", async () => {
  const { w, svc, land, originMain, mine } = rig();
  const shas = mine();
  svc.state.refuse["issue.move"] = 403;
  const r = await land("impl-aaaaaa", "task-1", "--reason", "r");
  expect(r.code).toBe(5);
  expect(originMain()).toBe(git(w, "rev-parse", "HEAD"));
  expect(r.out).toContain("[403]");
  expect(r.out).toContain("the stand-in refuses issue.move");
  expect(r.err).toContain("stopped at submit (exit 1).");
  expect(r.err).toContain(`By hand: issue-as.sh impl-aaaaaa move with the key impl/task-1/submit-1, to in-review, and the refs lopecode-dev@${shas[0]} lopecode-dev@${shas[1]}.`);
  expect(r.err).toContain("The landing lock is released.");
  expect(svc.lock.who).toBe("");
});

test("a reason that names a time ahead of the clock: issue-as.sh sends no submit (its exit 3), after the push: exit 5", async () => {
  const { w, svc, land, originMain } = rig();
  const r = await land("impl-aaaaaa", "task-1", "--reason", "the lease ends 2026-01-01 10:30:00");
  expect(r.code).toBe(5);
  expect(r.err).toContain("stopped at submit (exit 3).");
  expect(r.out).toContain("issue-as.sh: not sent. The reason names 10:30:00, 30 min ahead of the clock");
  expect(originMain()).toBe(git(w, "rev-parse", "HEAD"));
  expect(svc.writes()).toEqual([]);
  expect(svc.lock.who).toBe("");
});

test("a submit key that was used before answers duplicate and moves nothing: exit 5, said as such", async () => {
  const { svc, land } = rig();
  svc.state.keys.add("impl/task-1/submit-1");
  const r = await land("impl-aaaaaa", "task-1", "--reason", "r");
  expect(r.code).toBe(5);
  expect(r.err).toContain("stopped at submit (exit 9).");
  expect(r.out).toContain('"duplicate":true');
});

test("a push of main with no lock between the rebase and the push: the push is refused, and a second rebase, test and push land the commits on top", async () => {
  const { base, w, svc, land, originMain } = rig();
  // The test command stands for that other push, once.
  writeFileSync(join(base, "push-once.sh"), `[ -e "${base}/done" ] && exit 0; touch "${base}/done"; cd "$OTHER" && git pull -q --ff-only && echo late > other.txt && git commit -q -a -m late && git push -q origin main\n`);
  const r = await land("impl-aaaaaa", "task-1", "--reason", "r", "--test", `bash ${join(base, "push-once.sh")}`);
  expect([r.code, r.err]).toEqual([0, ""]);
  expect(originMain()).toBe(git(w, "rev-parse", "HEAD"));
  expect(git(w, "show", "HEAD:other.txt")).toBe("late");
  expect(svc.locks()).toEqual(["take", "renew", "renew", "release"]);
  // The refs are the commits as they are on origin, after the second rebase.
  const pushed = git(w, "rev-list", "--reverse", "HEAD~2..HEAD").split("\n");
  expect(svc.writes()[0].body.refs).toEqual(refs(pushed));
  expect(git(w, "log", "-1", "--format=%s", "HEAD~2")).toBe("late");
});

test("the lock lost before the renew (its 600 s ended and another writer has it): no push, no write, and no release of the other's lock", async () => {
  const { svc, land, originMain } = rig();
  const before = originMain();
  svc.state.loseAtRenew = true;
  const r = await land("impl-aaaaaa", "task-1", "--reason", "r");
  expect(r.code).toBe(1);
  expect(r.err).toContain("stopped at renew (exit 1). Nothing was pushed and nothing was written to the issue.");
  expect(r.err).not.toContain("released");
  expect(originMain()).toBe(before);
  expect(svc.locks()).toEqual(["take", "renew"]);
  expect(svc.lock.who).toBe("another-writer");
  expect(svc.writes()).toEqual([]);
});

test("a rebase that stops on a conflict: exit 1 with the unmerged file named, the lock released, nothing pushed", async () => {
  const { svc, land, theirs, originMain } = rig();
  theirs("doc.md", "theirs\n");
  const before = originMain();
  const r = await land("impl-aaaaaa", "task-1", "--reason", "r");
  expect(r.code).toBe(1);
  expect(r.out).toContain("the rebase stopped. Unmerged: doc.md");
  expect(r.err).toContain("stopped at rebase (exit 1).");
  expect(originMain()).toBe(before);
  expect(svc.locks()).toEqual(["take", "release"]);
  expect(svc.writes()).toEqual([]);
});

test("what is refused with nothing sent: a change that is not committed, nothing ahead, a seed, a token that is not kept, a copy outside a worktree", async () => {
  const { base, root, w, svc, land, commit, sh } = rig();
  writeFileSync(join(w, "doc.md"), "edited\n");
  const dirty = await land("impl-aaaaaa", "task-1", "--reason", "r");
  expect(dirty.code).toBe(64);
  expect(dirty.err).toContain("not committed in " + w + ": doc.md");
  git(w, "checkout", "--", "doc.md");

  commit("tools/cloud-brain/brain-x.ojs", "a seed\n", "a seed");
  const seed = await land("impl-aaaaaa", "task-1", "--reason", "r");
  expect(seed.code).toBe(64);
  expect(seed.err).toContain("the commits change a seed (tools/cloud-brain/brain-x.ojs )");
  expect(svc.calls).toEqual([]);

  const none = await land("impl-cccccc", "task-1", "--reason", "r", "--seed-lands-undeployed");
  expect(none.code).toBe(64);
  expect(none.out).toContain("no token named impl-cccccc is kept");
  expect(svc.calls).toEqual([]);

  const outside = await sh(root, ["bash", join(root, "tools/cloud-brain/land.sh"), "impl-aaaaaa", "task-1", "--reason", "r"]);
  expect(outside.code).toBe(64);
  expect(outside.err).toContain("run the worktree's own copy");

  for (const a of [[], ["impl-aaaaaa"], ["impl-aaaaaa", "task-1"], ["impl-aaaaaa", "task-1", "--reason", ""], ["impl-aaaaaa", "task-1", "--reason", "r", "--comment", "not a file"], ["impl-aaaaaa", "task-1", "--reason", "@" + join(base, "absent")], ["impl-aaaaaa", "task-1", "--reason", "r", "--wait", "soon"], ["impl-aaaaaa", "task-1", "--reason", "r", "--tests", "x"]]) {
    const x = await land(...a);
    expect([a, x.code]).toEqual([a, 64]);
  }
  expect(svc.calls).toEqual([]);

  // The seed whose deploy is the owner's lands with the flag.
  const ok = await land("impl-aaaaaa", "task-1", "--reason", "cb4 does not run the change: the deploy is the owner's", "--seed-lands-undeployed");
  expect([ok.code, ok.err]).toEqual([0, ""]);
  expect(ok.out).toContain("pushed ");
  expect(svc.writes()[0].body.refs.length).toBe(3);
});

test("nothing ahead of origin/main: exit 64, nothing sent", async () => {
  const { w, svc, land } = rig();
  git(w, "reset", "-q", "--hard", "origin/main");
  const r = await land("impl-aaaaaa", "task-1", "--reason", "r");
  expect(r.code).toBe(64);
  expect(r.err).toContain("nothing to land");
  expect(svc.calls).toEqual([]);
});

// ---- the brief names the command ----

const brief = inFull();
const flat = (t: string) => t.replace(/\s+/g, " ");
const fenced = (t: string) => [...t.matchAll(/^[ \t]*```[^\n]*\n([\s\S]*?)^[ \t]*```/gm)].map((m) => m[1]);

test("implementer.md, step 10: a landing with no deploy is the one command, with the flags the tool takes and a timeout the wait fits in", () => {
  const a = brief.indexOf("\n10. **"), b = brief.indexOf("\n11. **");
  const ten = brief.slice(a, b);
  const blocks = fenced(ten).filter((x) => x.includes("land.sh"));
  expect(blocks.length).toBe(1);
  const line = flat(blocks[0]).trim();
  expect(line.startsWith("$W/tools/cloud-brain/land.sh <token> <id> ")).toBe(true);
  const usage = readFileSync(tool("land.sh"), "utf8").split("\n").slice(1, 3).join(" ");
  // The flags of land.sh itself: what is inside the quotes is the test command's.
  for (const flag of line.replace(/"[^"]*"/g, "").match(/--[a-z-]+/g)!) expect(usage).toContain(flag);
  for (const flag of ["--reason", "--comment", "--test"]) expect(line).toContain(flag);
  const t = flat(ten);
  for (const word of ["`timeout` at 600000", "Exit 5", "Exit 1", "--no-submit", "`seq=`", "A landing with a deploy is not this command"]) expect(t).toContain(word);
  // The five lines stay, as what the command runs: tests/tools/worktree.test.ts runs them as written.
  expect(fenced(ten).filter((x) => x.includes("push origin HEAD:main") && !x.includes("update-index")).length).toBe(1);
  // Steps 12 and 13 say where the submit and its seq now come from.
  const twelve = flat(brief.slice(brief.indexOf("\n12. **"), brief.indexOf("\n13. **")));
  expect(twelve).toContain("`land.sh`");
});
