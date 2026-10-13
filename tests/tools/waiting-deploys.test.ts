// tools/cloud-brain/waiting-deploys.ts: whether a Brain runs the seed of main for the kernel, the core, the database
// and the deployer, the issues of the commits between, and the issue it keeps on the owner's page for each that waits.
// Issue undeployed-seeds-not-shown-to-owner. The seeds here are small ones in a repository of the test's own, compiled
// by the compiler the tool uses; the tracker is a stand-in in this process. Nothing is sent to cb4.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { compiler, moduleSource, splitSeed } from "../../tools/spec-notebook.ts";
import { WORKERS, ask, differ, issueOf, issuesOf, line, opening, plan, readWorker, seedOf, type Row } from "../../tools/cloud-brain/waiting-deploys.ts";

const root = resolve(import.meta.dir, "../..");
const tool = join(root, "tools/cloud-brain/waiting-deploys.ts");
const TOOLCHAIN = ["lopecode/notebooks/@tomlarkworthy_observablejs-toolchain.html", "lopebooks/notebooks/@tomlarkworthy_observablejs-toolchain.html"];
const can = TOOLCHAIN.some((p) => existsSync(join(root, p)));
if (!can) console.log(`skipped: waiting-deploys.test.ts: no ${TOOLCHAIN[0]}`);
const it = can ? test : test.skip;

let compile: Parameters<typeof moduleSource>[1], dispose = () => {};
beforeAll(async () => { if (can) ({ compile, dispose } = await compiler()); });
const servers: { stop: (now?: boolean) => void }[] = [];
afterAll(() => { dispose(); servers.forEach((s) => s.stop(true)); });

const MODULES = WORKERS.flatMap((w) => w.modules);
const seed = (name: string, more = "") => `md\`# ${name}\n\nWhat ${name} is.\`\n// %%\n${name.replace(/-/g, "_")}_value = 1\n// %%\ntwice = ${name.replace(/-/g, "_")}_value * 2\n${more}`;
const env = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" };
// A repository with the five seeds at one commit, `deployed`, and what a Brain that runs that commit answers.
const rig = () => {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "bm-waiting-deploys-")));
  const git = (...a: string[]) => {
    const r = spawnSync("git", ["-C", repo, ...a], { encoding: "utf8", env: { ...process.env, ...env } });
    if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
  };
  git("init", "-q", "-b", "main");
  mkdirSync(join(repo, "tools/cloud-brain"), { recursive: true });
  const commit = (subject: string, files: Record<string, string>) => {
    for (const [m, text] of Object.entries(files)) writeFileSync(join(repo, seedOf(m)), text);
    git("add", ".");
    git("commit", "-q", "-m", subject);
    return git("rev-parse", "HEAD");
  };
  const deployed = commit("first: the five seeds", Object.fromEntries(MODULES.map((m) => [m, seed(m)])));
  // What runs at a commit, as the Brain keeps it: the page's export has other ids than the build and a space at a line's end.
  const live = (sha = "HEAD") => Object.fromEntries(MODULES.map((m) => {
    const built = moduleSource(splitSeed(git("show", `${sha}:${seedOf(m)}`)), compile);
    return [m, { hash: git("rev-parse", sha).slice(0, 12) + "-" + m, text: built.replace(/_spec_(\d+)_(\d+)/g, "_exported_$2_$1").replace(/;\n/g, ";  \n") }];
  }));
  const read = (running: ReturnType<typeof live>, depth = 40) => WORKERS.map((w) => readWorker(w, running, { repo, ref: "main", depth, compile }));
  return { repo, git, commit, deployed, live, read };
};
const states = (rows: Row[]) => Object.fromEntries(rows.map((r) => [r.worker, r.state]));

it("a Brain that runs the seeds of main: each of the four is the same, though the text it keeps is not the build's", () => {
  const r = rig(), running = r.live();
  expect(running["brain-core"].text).not.toBe(moduleSource(splitSeed(seed("brain-core")), compile));
  const rows = r.read(running);
  expect(states(rows)).toEqual({ brain: "same", "brain-core": "same", "brain-db": "same", "brain-deployer": "same" });
  expect(rows.map(line)).toEqual(["brain: same", "brain-core: same", "brain-db: same", "brain-deployer: same"]);
});

it("a seed of the core on main and not on the Brain: the read names the Worker, the cells and the issue; after the deploy it names none", () => {
  const r = rig(), running = r.live();
  const sha = r.commit("core-fix-a: the core answers three", { "brain-core": seed("brain-core", "// %%\nthree = 3\n").replace("* 2", "* 4") });
  const rows = r.read(running), core = rows[1];
  expect(states(rows)).toEqual({ brain: "same", "brain-core": "waits", "brain-db": "same", "brain-deployer": "same" });
  expect(core.differ.sort()).toEqual(["+three", "~twice"]);
  expect(core.commits).toEqual([{ sha, day: expect.stringMatching(/^\d{4}-\d\d-\d\d$/), id: "core-fix-a", subject: "the core answers three" }]);
  expect(core.base).toBe(r.deployed);
  expect(line(core)).toContain(`brain-core: waits. 2 differences (`);
  expect(line(core)).toContain(`1 commit: core-fix-a ${sha.slice(0, 8)} `);
  // His deploy: the Brain runs the seed of main.
  expect(states(r.read(r.live()))).toEqual({ brain: "same", "brain-core": "same", "brain-db": "same", "brain-deployer": "same" });
});

it("each of the four is read by its own seed, and the deployer by cloudflare-iac as well", () => {
  for (const [module, worker] of [["brain-kernel", "brain"], ["brain-db", "brain-db"], ["brain-deployer", "brain-deployer"], ["cloudflare-iac", "brain-deployer"]]) {
    const r = rig(), running = r.live();
    r.commit(`one-${module}: a change`, { [module]: seed(module).replace("= 1", "= 2") });
    const waits = r.read(running).filter((x) => x.state === "waits");
    expect(waits.map((x) => x.worker)).toEqual([worker]);
    expect(issuesOf(waits[0]).map((x) => x.id)).toEqual([`one-${module}`]);
  }
});

it("a change to a cell with no name is a difference; a commit that changes no cell is not", () => {
  const r = rig(), running = r.live();
  r.commit("prose: the first cell says more", { "brain-db": seed("brain-db").replace("What brain-db is.", "What brain-db is, and more.") });
  expect(r.read(running)[2].differ).toEqual(["a cell with no name"]);
  const t = rig(), before = t.live();
  t.commit("layout: a blank line between two cells", { "brain-db": seed("brain-db").replace("// %%\ntwice", "\n\n// %%\ntwice") });
  expect(states(t.read(before))["brain-db"]).toBe("same");
});

it("the commits between are those after the one that runs: two issues, a commit that names none, and one that was deployed", () => {
  const r = rig();
  const a = r.commit("issue-a: one", { "brain-core": seed("brain-core", "// %%\na = 1\n") });
  const running = r.live();
  const b1 = r.commit("issue-b: two", { "brain-core": seed("brain-core", "// %%\na = 1\n// %%\nb = 1\n") });
  const none = r.commit("Merge of something", { "brain-core": seed("brain-core", "// %%\na = 1\n// %%\nb = 1\n// %%\nc = 1\n") });
  const b2 = r.commit("issue-b: two again", { "brain-core": seed("brain-core", "// %%\na = 1\n// %%\nb = 2\n// %%\nc = 1\n") });
  r.commit("issue-z: the kernel, not the core", { "brain-kernel": seed("brain-kernel", "// %%\nz = 1\n") });
  const core = r.read(running)[1];
  expect(core.base).toBe(a);
  expect(core.commits.map((c) => c.sha)).toEqual([b2, none, b1]);
  expect(issuesOf(core).map((x) => [x.id, x.commits.length])).toEqual([["issue-b", 2], [null, 1]]);
  expect(line(core)).toContain(`3 commits: issue-b ${b1.slice(0, 8)} ${b2.slice(0, 8)} `);
  expect(line(core)).toContain(`; no issue named ${none.slice(0, 8)} `);
  const text = ask(core, { "issue-b": { title: "Two", state: "done" } });
  expect(text).toContain("The core (`brain-core`) on cb4 is behind `main`: 2 changes to its seed");
  expect(text).toContain("- `issue-b` (done): Two");
  expect(text).toContain('What to run is in the record of an issue that was landed for your deploy, under "For the owner: the deploy".');
  expect(ask({ ...core, worker: "brain-deployer", what: "the deployer" }, {})).toContain("The deployer (`brain-deployer`) on cb4 is behind `main`: 2 changes to its seeds landed");
  expect(text).toContain("- a commit of ");
  expect(text).toContain("that names no issue of the tracker: Merge of something");
  // An id the tracker does not have is a commit's subject, not an issue.
  expect(ask(core, { "issue-b": null })).toContain("that names no issue of the tracker: issue-b: two");
  // Written for him: no hash and no path stands in it (rules.md, "What the owner is asked to decide").
  expect(text).not.toMatch(/[0-9a-f]{8}|tools\//);
});

it("a Brain that runs what no commit of the depth has: the line and the ask say so", () => {
  const r = rig(), running = r.live();
  running["brain-db"] = { hash: "elsewhere", text: moduleSource(splitSeed(seed("brain-db", "// %%\nfrom_elsewhere = 1\n")), compile) };
  r.commit("db-a: a change", { "brain-db": seed("brain-db").replace("= 1", "= 2") });
  const db = r.read(running, 5)[2];
  expect(db.base).toBe(null);
  expect(db.commits.length).toBe(2);
  expect(line(db)).toContain("No commit of the last 5 to its seed is what runs (elsewhere)");
  expect(ask(db, {})).toContain("so the list may hold more than waits");
});

test("differ: a cell main alone has, one the Brain alone has, and a module against itself", () => {
  const a = `const _1 = function _x(){return(\n1\n)};\nconst _2 = function _y(x){return(\nx + 1\n)};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn);\n  $def("_1", "x", [], _1);\n  $def("_2", "y", ["x"], _2);\n  return main;\n}`;
  expect(differ(a, a)).toEqual([]);
  expect(differ(a, a.replace(`$def("_2", "y", ["x"], _2);`, "").replace(/const _2[^;]*;\n/, ""))).toEqual(["+y"]);
  expect(differ(a.replace(`$def("_2", "y", ["x"], _2);`, "").replace(/const _2[^;]*;\n/, ""), a)).toEqual(["-y"]);
  expect(differ(a, a.replace("x + 1", "x + 2"))).toEqual(["~y"]);
});

const waits: Row = { worker: "brain-core", what: "the core", state: "waits", runs: "aaaaaaaaaaaaaaaa", differ: ["~x"], base: "b", depth: 40, commits: [{ sha: "c".repeat(40), day: "2026-01-02", id: "issue-a", subject: "one" }] };
const same: Row = { ...waits, state: "same", differ: [], commits: [], base: null };
const got = (issue: Record<string, unknown>, events: unknown[] = []) => ({ issue: { id: "deploy-waits-brain-core", seq: 7, state: "open", labels: ["needs-owner"], body: "the list", closed: false, ...issue }, events });

test("plan: a Worker that waits is opened once with needs-owner, its list a comment from the first; said again only when the list is another", () => {
  // The body has no list: it is never written again. It says where the list is.
  const first = plan(waits, null, "the list");
  expect(first).toEqual([
    { call: "open", body: { key: "deploys/brain-core/open-0", id: "deploy-waits-brain-core", kind: "task", about: "issue-loop", labels: ["needs-owner"], title: "A deploy waits for you: the core (brain-core) on cb4 is behind main", body: opening(waits) } },
    { call: "comment", body: { key: "deploys/brain-core/list-0", id: "deploy-waits-brain-core", body: "the list" }, what: "list said" },
  ]);
  expect(opening(waits)).toContain("A deploy of the core (`brain-core`) waits for you");
  expect(opening(waits)).toContain("in the last comment of this issue (its key begins `deploys/brain-core/list-`)");
  expect(opening(waits)).not.toMatch(/[0-9a-f]{8}|tools\/|issue-a/);
  expect(opening({ ...waits, commits: [], differ: ["~y", "+z"] })).toBe(opening(waits));
  // Opened that way: the list is the tool's one comment, and nothing is written at the next read.
  const opened = (more: unknown[] = []) => [{ type: "opened", key: "deploys/brain-core/open-0" }, { type: "commented", key: "deploys/brain-core/list-0", body: "the list" }, ...more];
  expect(plan(waits, got({ body: opening(waits) }, opened()), "the list")).toEqual([]);
  expect(plan(waits, got({ body: opening(waits) }, opened()), "a longer list")).toEqual([{ call: "comment", body: { key: "deploys/brain-core/list-7", id: "deploy-waits-brain-core", body: "a longer list" }, what: "list changed" }]);
  // The open was written and its comment was not (refused, or the run ended between): the next read says the list.
  expect(plan(waits, got({ body: opening(waits) }, [{ type: "opened", key: "deploys/brain-core/open-0" }]), "the list").map((w) => [w.call, w.body.key, w.what])).toEqual([["comment", "deploys/brain-core/list-7", "list changed"]]);
  // An issue opened before the list was a comment has its first list as its body.
  expect(plan(waits, got({}), "the list")).toEqual([]);
  expect(plan(waits, got({}), "a longer list").map((w) => [w.body.key, w.what])).toEqual([["deploys/brain-core/list-7", "list changed"]]);
  // A label he took off is not put back while the issue stays open.
  expect(plan(waits, got({ labels: [] }), "the list")).toEqual([]);
});

test("plan: the last comment of the issue is the list: after a comment that is not the tool's, the same list is said again, once", () => {
  const events = [{ type: "commented", key: "deploys/brain-core/list-7", body: "a longer list" }, { type: "commented", key: "owner/x", body: "tomorrow" }];
  // The list said last is the tool's last comment, not the owner's and not the body.
  expect(plan(waits, got({ seq: 9 }, events), "a longer list")).toEqual([{ call: "comment", body: { key: "deploys/brain-core/list-9", id: "deploy-waits-brain-core", body: "a longer list" }, what: "list said again" }]);
  expect(plan(waits, got({ seq: 9 }, events), "the list").map((w) => [w.body.key, w.what])).toEqual([["deploys/brain-core/list-9", "list changed"]]);
  // Once it is said the tool's comment is the last, and nothing more is written.
  const after = [...events, { type: "commented", key: "deploys/brain-core/list-9", body: "a longer list" }];
  expect(plan(waits, got({ seq: 10 }, after), "a longer list")).toEqual([]);
  // An event that is no comment (a label, a move) after the list does not have it said again.
  expect(plan(waits, got({ seq: 11 }, [...after, { type: "labelled", key: "owner/y" }, { type: "moved", key: "orch/z", to: "open" }]), "a longer list")).toEqual([]);
  // The body alone is the list (an issue of before) and another's comment stands under it: said again.
  expect(plan(waits, got({ seq: 8 }, [{ type: "commented", key: "owner/x", body: "tomorrow" }]), "the list").map((w) => [w.body.key, w.what])).toEqual([["deploys/brain-core/list-8", "list said again"]]);
  // A comment of the tool's for another Worker's issue is not this one's.
  expect(plan(waits, got({ seq: 8 }, [{ type: "commented", key: "deploys/brain-core/list-7", body: "the list" }, { type: "commented", key: "deploys/brain-db/list-3", body: "the list" }]), "the list").map((w) => w.what)).toEqual(["list said again"]);
});

test("plan: a Worker that runs main's seed has its open issue closed, and one that waits again has it opened again with the label", () => {
  expect(plan(same, null, "")).toEqual([]);
  expect(plan(same, got({ state: "closed", closed: true }), "")).toEqual([]);
  const close = plan(same, got({}), "");
  expect(close).toEqual([{ call: "move", body: { key: "deploys/brain-core/close-7", id: "deploy-waits-brain-core", to: "closed", reason: expect.stringContaining("cb4 runs the seed of main for the core (brain-core, aaaaaaaaaaaa)") } }]);
  const again = plan(waits, got({ state: "closed", closed: true, labels: [], seq: 12 }), "another list");
  expect(again.map((w) => [w.call, w.body.key])).toEqual([["move", "deploys/brain-core/reopen-12"], ["label", "deploys/brain-core/label-12"], ["comment", "deploys/brain-core/list-12"]]);
  expect(again[0].body.to).toBe("open");
  expect(again[1].body.add).toEqual(["needs-owner"]);
  expect(plan(waits, got({ state: "closed", closed: true, seq: 12 }), "the list").map((w) => w.call)).toEqual(["move"]);
  // One he rejected is not opened again, and not written to.
  expect(plan(waits, got({ state: "rejected", closed: true }), "another list")).toEqual([]);
  expect(plan(same, got({ state: "rejected", closed: true }), "")).toEqual([]);
});

test("plan: an issue at done or at reverted is left as one he rejected is: no move to open, which the task workflow has from closed and rejected alone", () => {
  for (const state of ["done", "reverted", "rejected"]) {
    // Whatever the tracker answers of `closed` for it, and whatever its last comment is.
    for (const closed of [true, false]) {
      expect([state, closed, plan(waits, got({ state, closed }), "another list")]).toEqual([state, closed, []]);
      expect([state, closed, plan(waits, got({ state, closed, labels: [] }, [{ type: "commented", key: "owner/x", body: "no" }]), "the list")]).toEqual([state, closed, []]);
      expect([state, closed, plan(same, got({ state, closed }), "")]).toEqual([state, closed, []]);
    }
  }
  // The states beside them are written to as before.
  expect(plan(waits, got({ state: "closed", closed: true, seq: 12 }), "the list").map((w) => w.body.to)).toEqual(["open"]);
  expect(plan(waits, got({ state: "triaged" }), "another list").map((w) => w.call)).toEqual(["comment"]);
});

// The tracker, as far as the tool calls it: get, open, comment, label, move. A key sent before writes nothing.
const tracker = (has: Record<string, { title: string; state: string }> = {}) => {
  const issues = new Map<string, any>(Object.entries(has).map(([id, i]) => [id, { issue: { id, seq: 1, labels: [], closed: false, ...i }, events: [] }]));
  const calls: { path: string; body: any }[] = [], keys = new Set<string>(), state = { seq: 100, refuse: "" };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url), path = url.pathname.replace("/xrpc/com.lopecode.brain.issue.", "");
      if (req.headers.get("authorization") !== "Bearer secret-agent") return json({ error: "Unauthorized" }, 401);
      if (path === "get") { const i = issues.get(url.searchParams.get("id")!); return i ? json(i) : json({ error: "NotFound", message: "no such issue" }, 404); }
      const b = await req.json();
      calls.push({ path, body: b });
      if (path === state.refuse) return json({ error: "Refused", message: "the guard refused" }, 403);
      if (keys.has(b.key)) return json({ duplicate: true });
      keys.add(b.key);
      const seq = ++state.seq;
      if (path === "open") issues.set(b.id, { issue: { id: b.id, seq, title: b.title, body: b.body, state: "open", labels: b.labels || [], closed: false }, events: [{ seq, type: "opened", key: b.key }] });
      const i = issues.get(b.id);
      if (!i) return json({ error: "NotFound" }, 404);
      i.issue.seq = seq;
      if (path === "comment") i.events.push({ seq, type: "commented", key: b.key, body: b.body });
      if (path === "label") i.issue.labels = [...new Set([...i.issue.labels, ...(b.add || [])])].filter((l) => !(b.remove || []).includes(l));
      if (path === "move") { i.issue.state = b.to; i.issue.closed = b.to === "closed"; i.events.push({ seq, type: "moved", key: b.key, to: b.to, reason: b.reason }); }
      return json({ id: b.id, seq });
    },
  });
  servers.push(server);
  return { base: `http://127.0.0.1:${server.port}`, issues, calls, state };
};

it("--file keeps the issue of a Worker that waits: opened, left alone at the next run, said again when the list changes, closed after the deploy, opened again at the next change", async () => {
  const r = rig(), svc = tracker({ "core-fix-a": { title: "The core answers three", state: "done" }, "core-fix-b": { title: "The core answers four", state: "in-review" } });
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-waiting-deploys-state-")));
  writeFileSync(join(dir, "cb4-agent-tokens.json"), JSON.stringify({ "impl-aaaaaa": "secret-agent" }));
  const modules = join(dir, "modules.json");
  const runs = (sha: string) => writeFileSync(modules, JSON.stringify({ modules: Object.entries(r.live(sha)).map(([m, v]) => ({ module: "@tomlarkworthy/" + m, worker: "x", ...v })) }));
  const run = async (...args: string[]) => {
    const { BRAIN_BASE: _b, ...outer } = process.env;
    const p = Bun.spawn(["bun", tool, ...args], { env: { ...outer, WAITING_DEPLOYS_REPO: r.repo, WAITING_DEPLOYS_REF: "main", WAITING_DEPLOYS_MODULES: modules, BRAIN_STATE_DIR: dir, ISSUE_AS_BASE: svc.base }, stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { code, lines: out.trim().split("\n"), err };
  };
  runs(r.deployed);
  let a = await run("--file", "impl-aaaaaa");
  expect(a.code).toBe(0);
  expect(a.lines).toEqual(["brain: same", "brain-core: same", "brain-db: same", "brain-deployer: same", "deploys (cb4): the four run the seed of main; nothing written"]);
  expect(svc.calls).toEqual([]);

  r.commit("core-fix-a: the core answers three", { "brain-core": seed("brain-core", "// %%\nthree = 3\n") });
  // The read alone writes nothing, and --json names the issue.
  a = await run("--json");
  expect(JSON.parse(a.lines[0])[1]).toMatchObject({ worker: "brain-core", state: "waits", issues: ["core-fix-a"] });
  expect(svc.calls).toEqual([]);
  a = await run("--file", "impl-aaaaaa");
  expect(a.code).toBe(0);
  expect(a.lines.at(-1)).toBe("deploys (cb4): brain-core behind main, the deploy is the owner's; deploy-waits-brain-core opened, deploy-waits-brain-core list said");
  const kept = svc.issues.get(issueOf("brain-core"))!.issue;
  expect(kept).toMatchObject({ state: "open", labels: ["needs-owner"], title: "A deploy waits for you: the core (brain-core) on cb4 is behind main" });
  // The body says where the list is and has none; the list is the issue's last comment.
  expect(kept.body).toContain("its key begins `deploys/brain-core/list-`");
  expect(kept.body).not.toContain("core-fix-a");
  expect(svc.issues.get(issueOf("brain-core"))!.events.map((e: any) => e.type)).toEqual(["opened", "commented"]);
  expect(svc.issues.get(issueOf("brain-core"))!.events.at(-1).body).toContain("- `core-fix-a` (done): The core answers three");
  expect(svc.issues.has(issueOf("brain"))).toBe(false);

  const n = svc.calls.length;
  a = await run("--file", "impl-aaaaaa");
  expect(a.lines.at(-1)).toBe("deploys (cb4): brain-core behind main, the deploy is the owner's; nothing written");
  expect(svc.calls.length).toBe(n);

  r.commit("core-fix-b: the core answers four", { "brain-core": seed("brain-core", "// %%\nthree = 3\n// %%\nfour = 4\n") });
  a = await run("--file", "impl-aaaaaa");
  expect(a.lines.at(-1)).toContain("deploy-waits-brain-core list changed");
  expect(svc.issues.get(issueOf("brain-core"))!.events.at(-1).body).toContain("- `core-fix-b` (in-review): The core answers four");

  // He comments under the list: the next run says the same list again, so that it is the last comment; the run after writes nothing.
  const core = svc.issues.get(issueOf("brain-core"))!, list = core.events.at(-1).body;
  core.events.push({ seq: ++svc.state.seq, type: "commented", key: "owner/1", body: "tomorrow" });
  core.issue.seq = svc.state.seq;
  a = await run("--file", "impl-aaaaaa");
  expect(a.lines.at(-1)).toBe("deploys (cb4): brain-core behind main, the deploy is the owner's; deploy-waits-brain-core list said again");
  expect([core.events.at(-1).key.startsWith("deploys/brain-core/list-"), core.events.at(-1).body === list]).toEqual([true, true]);
  const quiet = svc.calls.length;
  a = await run("--file", "impl-aaaaaa");
  expect(a.lines.at(-1)).toBe("deploys (cb4): brain-core behind main, the deploy is the owner's; nothing written");
  expect(svc.calls.length).toBe(quiet);

  runs("HEAD");
  a = await run("--file", "impl-aaaaaa");
  expect(a.lines.slice(0, 4)).toEqual(["brain: same", "brain-core: same", "brain-db: same", "brain-deployer: same"]);
  expect(a.lines.at(-1)).toBe("deploys (cb4): the four run the seed of main; deploy-waits-brain-core closed");
  expect(svc.issues.get(issueOf("brain-core"))!.issue).toMatchObject({ state: "closed", labels: ["needs-owner"] });

  r.commit("core-fix-a: the core answers five", { "brain-core": seed("brain-core", "// %%\nthree = 3\n// %%\nfour = 5\n") });
  a = await run("--file", "impl-aaaaaa");
  expect(a.lines.at(-1)).toBe("deploys (cb4): brain-core behind main, the deploy is the owner's; deploy-waits-brain-core opened again, deploy-waits-brain-core list changed");
  expect(svc.issues.get(issueOf("brain-core"))!.issue.state).toBe("open");

  // An issue at done is left: no call is sent for it, and the last line names it with its state.
  core.issue.state = "done";
  const sent = svc.calls.length;
  a = await run("--file", "impl-aaaaaa");
  expect(a.code).toBe(0);
  expect(a.lines.at(-1)).toBe("deploys (cb4): brain-core behind main, the deploy is the owner's; nothing written; deploy-waits-brain-core left as it is (done)");
  expect(svc.calls.length).toBe(sent);
  core.issue.state = "open";

  // A write the tracker refuses is said, and is exit 1. A token that is not kept writes nothing.
  r.commit("db-a: the database", { "brain-db": seed("brain-db").replace("= 1", "= 2") });
  svc.state.refuse = "open";
  a = await run("--file", "impl-aaaaaa");
  expect(a.code).toBe(1);
  expect(a.lines.at(-1)).toContain("deploy-waits-brain-db not opened [403]");
  const m = svc.calls.length;
  a = await run("--file", "impl-bbbbbb");
  expect(a.code).toBe(1);
  expect(a.lines.at(-1)).toContain("deploy-waits-brain not read");
  expect(svc.calls.length).toBe(m);
}, 60000);

test("arguments that are not understood, and a Brain that is not read, are exit 2 with nothing said of a Worker", async () => {
  const run = async (args: string[], env: Record<string, string>) => {
    const p = Bun.spawn(["bun", tool, ...args], { env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { code, out, err };
  };
  for (const args of [["--files"], ["--file"], ["--depth", "0"], ["x"]]) {
    const r = await run(args, { WAITING_DEPLOYS_MODULES: "/nonexistent" });
    expect([args, r.code, r.out]).toEqual([args, 2, ""]);
    expect(r.err).toContain("waiting-deploys.ts [--json] [--depth N] | waiting-deploys.ts --file <token>");
  }
  // An address nothing answers at.
  const r = await run([], { WAITING_DEPLOYS_BASE: "http://127.0.0.1:9" });
  expect([r.code, r.out]).toEqual([2, ""]);
  expect(r.err).toMatch(/^error: .+\n$/);
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-waiting-deploys-none-")));
  writeFileSync(join(dir, "m.json"), JSON.stringify({ modules: [] }));
  const none = await run([], { WAITING_DEPLOYS_MODULES: join(dir, "m.json") });
  expect([none.code, none.out]).toEqual([2, ""]);
  expect(none.err).toContain("error: the Brain did not answer the module brain-kernel of brain");
}, 60000);

test("the docs say where the read is and what keeps the owner's issue", async () => {
  const text = (p: string) => Bun.file(join(root, p)).text();
  const page = await text("knowledge/changing-and-deploying-a-cloud-brain-worker.md");
  const section = page.slice(page.indexOf("## The deploys that wait for the owner"), page.indexOf("## A Playwright script"));
  for (const phrase of ["bun tools/cloud-brain/waiting-deploys.ts", "`--file <token>`", "`deploy-waits-<worker>`", "`needs-owner`", "`lock.sh release land`", "`LOCK_DEPLOYS=0`", "Not compared"]) expect(section.includes(phrase), phrase).toBe(true);
  const skill = await text(".claude/skills/brain-maintenance/SKILL.md");
  const step7 = skill.slice(skill.indexOf("\n7. **Tell the user**"), skill.indexOf("\n8. **Watch, then schedule**"));
  for (const phrase of ["bun tools/cloud-brain/waiting-deploys.ts", "`deploy-waits-<worker>`", "not triaged, started or closed by you"]) expect(step7.includes(phrase), phrase).toBe(true);
  const row = skill.split("\n").find((l) => l.includes("| labeled `needs-owner` |"))!;
  expect(row).toContain("An issue `deploy-waits-<worker>` is not read this way");
  expect(await text(".claude/skills/brain-maintenance/agents/implementer/start.md")).toContain("deploy-waits-<worker> opened");
  const lock = await text("tools/cloud-brain/lock.sh");
  expect(lock).toContain("LOCK_DEPLOYS=0 leaves the step out");
  // The usage of lock.sh is its header to the line of LOCK_TOKEN, as before the line of this step was put in it.
  const usage = spawnSync("bash", [join(root, "tools/cloud-brain/lock.sh")], { encoding: "utf8" });
  expect(usage.status).toBe(2);
  expect(usage.stderr).toContain("Then `waiting-deploys.ts --file <token>`");
  expect(usage.stderr.trim().split("\n").at(-1)).toContain("LOCK_TOKEN=<name> before the command is the token the call is made as");
});
