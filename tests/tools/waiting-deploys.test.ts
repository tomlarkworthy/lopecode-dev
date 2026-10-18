// tools/cloud-brain/waiting-deploys.ts: whether cloud-brain-dev/deploy/ has what a Brain runs for the kernel, the core,
// the database and the deployer (no seeds in lopecode-dev since 2026-10-18), and the close of an open issue
// `deploy-waits-<worker>` of one that does. deploy/ is a directory of the test's own and the Brain is a file of modules;
// the tracker is a stand-in in this process. Nothing is sent to cb4.
import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { WORKERS, deployedOf, differ, issueOf, line, plan, readWorker, type Row } from "../../tools/cloud-brain/waiting-deploys.ts";

const root = resolve(import.meta.dir, "../..");
const tool = join(root, "tools/cloud-brain/waiting-deploys.ts");
const servers: { stop: (now?: boolean) => void }[] = [];
afterAll(() => servers.forEach((s) => s.stop(true)));

const MODULES = WORKERS.flatMap((w) => w.modules);
// A compiled module of three cells, as sync.ts writes one.
const mod = (name: string, more: [string, string][] = []) => {
  const v = name.replace(/-/g, "_") + "_value";
  const cells: [string, string | null, string[], string][] = [["_a", null, ["md"], `md\`# ${name}\``], ["_b", v, [], "1"], ["_c", "twice", [v], `${v} * 2`], ...more.map(([n, body], i) => [`_m${i}`, n, [], body] as [string, string, string[], string])];
  return cells.map(([pid, n, deps, body]) => `const ${pid} = function ${n ?? "_anon"}(${deps.join(", ")}){return(\n${body}\n)};`).join("\n")
    + `\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn);\n`
    + cells.map(([pid, n, deps]) => `  $def("${pid}", ${JSON.stringify(n)}, ${JSON.stringify(deps)}, ${pid});`).join("\n") + "\n  return main;\n}\n";
};
// A deploy/ with the five modules, and what a Brain that runs them answers: other ids and other spaces than the file.
const rig = () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-waiting-deploys-")));
  mkdirSync(join(dir, "@tomlarkworthy"), { recursive: true });
  const write = (m: string, text: string) => writeFileSync(deployedOf(m, dir), text);
  for (const m of MODULES) write(m, mod(m));
  const live = (edit: Record<string, string> = {}) => Object.fromEntries(MODULES.map((m) => [m, { hash: "h".repeat(12) + "-" + m, text: (edit[m] ?? mod(m)).replace(/"_([a-z0-9]+)"/g, '"_exported_$1"').replace(/;\n/g, ";  \n") }]));
  const read = (running: ReturnType<typeof live>) => WORKERS.map((w) => readWorker(w, running, dir));
  return { dir, write, live, read };
};
const states = (rows: Row[]) => Object.fromEntries(rows.map((r) => [r.worker, r.state]));

test("deploy/ that has what the Brain runs: each of the four is the same, though the text the Brain keeps is not the file's", () => {
  const r = rig(), running = r.live();
  expect(running["brain-core"].text).not.toBe(mod("brain-core"));
  const rows = r.read(running);
  expect(states(rows)).toEqual({ brain: "same", "brain-core": "same", "brain-db": "same", "brain-deployer": "same" });
  expect(rows.map(line)).toEqual(["brain: same", "brain-core: same", "brain-db: same", "brain-deployer: same"]);
});

test("a deploy/ file edited by hand, or older than what runs: the Worker differs, with the cells named", () => {
  const r = rig();
  const running = r.live({ "brain-core": mod("brain-core", [["three", "3"]]).replace("brain_core_value * 2", "brain_core_value * 4") });
  const rows = r.read(running), core = rows[1];
  expect(states(rows)).toEqual({ brain: "same", "brain-core": "differs", "brain-db": "same", "brain-deployer": "same" });
  expect([...core.differ].sort()).toEqual(["-three", "~twice"]);
  expect(line(core)).toBe("brain-core: differs. 2 differences (~twice -three). deploy/ is not what cb4 runs (hhhhhhhhhhhh): bun sync.ts in cloud-brain-dev");
});

test("each of the four is read by its own module, and the deployer by cloudflare-iac as well", () => {
  for (const [module, worker] of [["brain-kernel", "brain"], ["brain-db", "brain-db"], ["brain-deployer", "brain-deployer"], ["cloudflare-iac", "brain-deployer"]]) {
    const r = rig();
    r.write(module, mod(module).replace("return(\n1\n)", "return(\n2\n)"));
    expect(r.read(r.live()).filter((x) => x.state !== "same").map((x) => [x.worker, x.differ])).toEqual([[worker, [`~${module.replace(/-/g, "_")}_value`]]]);
  }
});

test("a deploy/ with no file of a module: not synced, named, and no difference is read for it", () => {
  const r = rig();
  rmSync(deployedOf("cloudflare-iac", r.dir));
  const rows = r.read(r.live());
  expect(states(rows)).toEqual({ brain: "same", "brain-core": "same", "brain-db": "same", "brain-deployer": "not synced" });
  expect(line(rows[3])).toBe("brain-deployer: not synced. No deploy/@tomlarkworthy/cloudflare-iac.js: bun sync.ts in cloud-brain-dev");
});

test("differ: a cell main alone has, one the Brain alone has, and a module against itself", () => {
  const a = `const _1 = function _x(){return(\n1\n)};\nconst _2 = function _y(x){return(\nx + 1\n)};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn);\n  $def("_1", "x", [], _1);\n  $def("_2", "y", ["x"], _2);\n  return main;\n}`;
  const noY = a.replace(`$def("_2", "y", ["x"], _2);`, "").replace("const _2 = function _y(x){return(\nx + 1\n)};\n", "");
  expect(differ(a, a)).toEqual([]);
  expect(differ(a, noY)).toEqual(["+y"]);
  expect(differ(noY, a)).toEqual(["-y"]);
  expect(differ(a, a.replace("x + 1", "x + 2"))).toEqual(["~y"]);
});

const same: Row = { worker: "brain-core", what: "the core", state: "same", runs: "aaaaaaaaaaaaaaaa", differ: [], missing: [] };
const got = (issue: Record<string, unknown>) => ({ issue: { id: "deploy-waits-brain-core", seq: 7, state: "open", labels: ["needs-owner"], closed: false, ...issue }, events: [] });

test("plan: an open deploy-waits issue of a Worker that is the same is closed; nothing is written otherwise", () => {
  expect(plan(same, got({}))).toEqual([{ call: "move", body: { key: "deploys/brain-core/close-7", id: "deploy-waits-brain-core", to: "closed", reason: expect.stringContaining("cb4 runs what cloud-brain-dev/deploy has for the core (brain-core, aaaaaaaaaaaa)") } }]);
  expect(plan(same, null)).toEqual([]);
  for (const state of ["closed", "rejected", "done", "reverted"]) expect([state, plan(same, got({ state, closed: state === "closed" }))]).toEqual([state, []]);
  // A difference opens nothing: it is a deploy/ that is behind or edited, not a deploy that waits for the owner.
  expect(plan({ ...same, state: "differs", differ: ["~x"] }, null)).toEqual([]);
  expect(plan({ ...same, state: "differs", differ: ["~x"] }, got({}))).toEqual([]);
  expect(plan({ ...same, state: "not synced", missing: ["brain-core"] }, got({}))).toEqual([]);
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

test("--file closes the open issue of a Worker that is the same, writes nothing for one that differs, and says a refusal", async () => {
  const r = rig(), svc = tracker();
  svc.issues.set(issueOf("brain-core"), { issue: { id: issueOf("brain-core"), seq: 5, labels: ["needs-owner"], state: "open", closed: false }, events: [] });
  svc.issues.set(issueOf("brain-db"), { issue: { id: issueOf("brain-db"), seq: 6, labels: ["needs-owner"], state: "open", closed: false }, events: [] });
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-waiting-deploys-state-")));
  writeFileSync(join(dir, "cb4-agent-tokens.json"), JSON.stringify({ "impl-aaaaaa": "secret-agent" }));
  const modules = join(dir, "modules.json");
  const runs = (edit: Record<string, string> = {}) => writeFileSync(modules, JSON.stringify({ modules: Object.entries(r.live(edit)).map(([m, v]) => ({ module: "@tomlarkworthy/" + m, worker: "x", ...v })) }));
  const run = async (...args: string[]) => {
    const { BRAIN_BASE: _b, ...outer } = process.env;
    const p = Bun.spawn(["bun", tool, ...args], { env: { ...outer, WAITING_DEPLOYS_DEPLOY: r.dir, WAITING_DEPLOYS_MODULES: modules, BRAIN_STATE_DIR: dir, ISSUE_AS_BASE: svc.base }, stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { code, lines: out.trim().split("\n"), err };
  };
  runs({ "brain-db": mod("brain-db", [["more", "1"]]) });
  // The read alone writes nothing.
  let a = await run("--json");
  expect(a.code).toBe(0);
  expect(JSON.parse(a.lines[0])[2]).toMatchObject({ worker: "brain-db", state: "differs", differ: ["-more"] });
  expect(svc.calls).toEqual([]);
  a = await run("--file", "impl-aaaaaa");
  expect(a.code).toBe(0);
  expect(a.lines).toEqual(["brain: same", "brain-core: same", "brain-db: differs. 1 difference (-more). deploy/ is not what cb4 runs (hhhhhhhhhhhh): bun sync.ts in cloud-brain-dev", "brain-deployer: same", "deploys (cb4): brain-db differs (deploy/ against what runs; a deploy for the owner is labelled owner-deploy); deploy-waits-brain-core closed"]);
  expect(svc.issues.get(issueOf("brain-core"))!.issue.state).toBe("closed");
  expect(svc.issues.get(issueOf("brain-db"))!.issue.state).toBe("open");
  expect(svc.calls.map((c) => [c.path, c.body.id])).toEqual([["move", issueOf("brain-core")]]);
  // Once the sync has what runs: the other is closed, and the next run writes nothing.
  runs();
  a = await run("--file", "impl-aaaaaa");
  expect(a.lines.at(-1)).toBe("deploys (cb4): deploy/ has what the four run; deploy-waits-brain-db closed");
  const n = svc.calls.length;
  a = await run("--file", "impl-aaaaaa");
  expect(a.lines.at(-1)).toBe("deploys (cb4): deploy/ has what the four run; nothing written");
  expect(svc.calls.length).toBe(n);
  // A missing file is said in the line and is exit 0.
  rmSync(deployedOf("brain-kernel", r.dir));
  a = await run("--file", "impl-aaaaaa");
  expect(a.code).toBe(0);
  expect(a.lines[0]).toBe("brain: not synced. No deploy/@tomlarkworthy/brain-kernel.js: bun sync.ts in cloud-brain-dev");
  expect(a.lines.at(-1)).toBe("deploys (cb4): brain not synced (deploy/ against what runs; a deploy for the owner is labelled owner-deploy); nothing written");
  // A close the tracker refuses is said, and is exit 1. A token that is not kept writes nothing.
  r.write("brain-kernel", mod("brain-kernel"));
  svc.issues.set(issueOf("brain"), { issue: { id: issueOf("brain"), seq: 9, labels: [], state: "open", closed: false }, events: [] });
  svc.state.refuse = "move";
  a = await run("--file", "impl-aaaaaa");
  expect(a.code).toBe(1);
  expect(a.lines.at(-1)).toContain("deploy-waits-brain not closed [403]");
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
  for (const args of [["--files"], ["--file"], ["--depth", "40"], ["x"]]) {
    const r = await run(args, { WAITING_DEPLOYS_MODULES: "/nonexistent" });
    expect([args, r.code, r.out]).toEqual([args, 2, ""]);
    expect(r.err).toContain("waiting-deploys.ts [--json] | waiting-deploys.ts --file <token>");
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
