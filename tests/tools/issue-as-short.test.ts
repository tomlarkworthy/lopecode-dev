// issue-as.sh NAME "get?id=ID" --short: what a writer of the issue loop reads of its issue, cut by the tool.
// Issue writer-brief-and-tool-output-smaller: a writer read `get` 5.1 times a run at 5,486 characters, and each event
// of the whole answer has prev, hash, sig, ray, origin and workflow, which no step of the brief reads.
// The answer served here is one cb4 gave: fixtures/issue-get-ds-1-rows-add-within.json is `issue.get` of
// ds-1-rows-add-within as read 2026-10-13 with a writer's token, 15 events, two reviews, one rework, three cost
// events. One thing of it was changed before it was kept: the `session` of each cost event and run reads "kept-out".
// The script is run with the real curl against a local server (the rig of issue-as-body-file.test.ts).
//
//   bun test --timeout=30000 ./tests/tools/issue-as-short.test.ts
//   ISSUE_AS_SH=/path/to/another/issue-as.sh bun test …
import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, chmodSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const script = process.env.ISSUE_AS_SH || join(root, "tools/cloud-brain/issue-as.sh");
const kept = readFileSync(join(import.meta.dir, "fixtures/issue-get-ds-1-rows-add-within.json"), "utf8");
const whole = JSON.parse(kept);
const by = (holder?: string, tab = false) => ({ caller: "owner", via: "delegation:0", ...(holder ? { holder } : {}), tab });
// Shapes the kept answer does not have: a session's write, a holder that is no secret, an event with no time, a
// thing in `events` that is no object, an opened event whose title is not the issue's.
const edge = { issue: { id: "e", title: "now", body: "the body", workflow: "w", runs: [1], last: { move: "ready", at: 0 }, opened_at: 1791787936406 }, children: [{ id: "c" }], more: true,
  events: [{ seq: 1, type: "opened", id: "e", title: "then", body: "the body", by: by(undefined, true), at: 1791787936406 },
    { seq: 2, type: "commented", id: "e", body: "b", by: by("did:plc:abc"), at: "not a number" },
    { seq: 3, type: "labelled", id: "e", add: ["x"], remove: [], by: by(), prev: "p" },
    "a string", { seq: 5, type: "moved", id: "e", by: "already a name", at: true }],
  cost: { runs: 1 } };
const answers: Record<string, [number, string]> = {
  "ds-1-rows-add-within": [200, kept],
  edge: [200, JSON.stringify(edge)],
  none: [404, `{"error":"NotFound","message":"no such issue"}`],
  text: [502, "<html>bad gateway</html>"],
  list: [200, `{"issues":[],"total":0,"more":false}`],
};
let server: ReturnType<typeof Bun.serve>;
let got: { method: string; path: string }[] = [];
beforeAll(() => {
  server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: (req) => {
    const u = new URL(req.url);
    got.push({ method: req.method, path: u.pathname + u.search });
    const [status, body] = answers[u.searchParams.get("id") ?? ""] ?? [200, `{"ok":true}`];
    return new Response(body, { status });
  } });
});
afterAll(() => server.stop(true));

const dir = realpathSync(mkdtempSync(join(tmpdir(), "issue-as-short-")));
mkdirSync(join(dir, ".emitted"));
mkdirSync(join(dir, "bin"));
copyFileSync(script, join(dir, "issue-as.sh"));
chmodSync(join(dir, "issue-as.sh"), 0o755);
writeFileSync(join(dir, ".emitted/cb4-issues-tokens.json"), JSON.stringify({ t: "not-a-token" }));
const call = async (args: string[], name = "t") => {
  writeFileSync(join(dir, "bin/curl"), `#!/bin/bash\nargs=("$@"); n=$((\${#args[@]}-1))\nargs[$n]="http://127.0.0.1:${server.port}/\${args[$n]##*.issue.}"\nexec ${Bun.which("curl")} "\${args[@]}"\n`);
  chmodSync(join(dir, "bin/curl"), 0o755);
  got = [];
  const p = Bun.spawn([join(dir, "issue-as.sh"), name, ...args], { cwd: dir, stdout: "pipe", stderr: "pipe", env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}` } });
  const out = await new Response(p.stdout).text(), err = await new Response(p.stderr).text();
  return { code: await p.exited, out, err, got };
};
const LEFT = ["prev", "hash", "sig", "ray", "origin", "workflow", "id"];
const utc = (ms: number) => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");

test("with no --short the answer is printed as the service gave it, byte for byte", async () => {
  const r = await call(["get?id=ds-1-rows-add-within"]);
  expect(r.code).toBe(0);
  expect(r.out).toBe(kept);
  expect(r.err).toBe(" [200]\n");
  expect(r.got).toEqual([{ method: "GET", path: "/get?id=ds-1-rows-add-within" }]);
});

test("--short: one read of the same address, one JSON value, the status on stderr, and under three quarters of the size", async () => {
  const r = await call(["get?id=ds-1-rows-add-within", "--short"]);
  expect(r.code).toBe(0);
  expect(r.err).toBe(" [200]\n");
  expect(r.got).toEqual([{ method: "GET", path: "/get?id=ds-1-rows-add-within" }]);
  const short = JSON.parse(r.out);
  expect(Object.keys(short)).toEqual(["short", "issue", "children", "events"]);
  // an answer that was cut says so, what was left out, and how the whole is read
  expect(short.short).toMatch(/^cut by issue-as\.sh --short: of each event prev, hash, sig, ray, origin, workflow and id; .* The same call with no --short prints the whole answer\.$/);
  expect("short" in whole).toBe(false);
  expect(short.children).toEqual(whole.children);
  expect(r.out.length).toBeLessThan(kept.length * 0.75);
  expect([kept.length, r.out.length]).toEqual([37804, 26928]);
});

test("--short: every event is there, one a line, with what the brief reads and none of the six fields", async () => {
  const r = await call(["get?id=ds-1-rows-add-within", "--short"]);
  const short = JSON.parse(r.out);
  expect(short.events.length).toBe(15);
  expect(short.events.map((e: any) => e.seq)).toEqual(whole.events.map((e: any) => e.seq));
  // one event a line: the lines between `"events":[` and `]}`
  const lines = r.out.split("\n");
  const from = lines.indexOf('"events":[');
  expect(from).toBeGreaterThan(0);
  expect(lines.slice(from + 1, from + 16).map((l) => JSON.parse(l.replace(/,$/, "")).seq)).toEqual(short.events.map((e: any) => e.seq));
  expect(lines.slice(from + 16)).toEqual(["]}", ""]);
  for (const [i, e] of short.events.entries()) {
    const w = whole.events[i];
    for (const k of LEFT) expect([e.seq, k, k in e]).toEqual([e.seq, k, false]);
    expect(e.by).toBe(w.by.holder.replace(/^secret:/, ""));
    expect(e.at).toBe(utc(w.at));
    for (const k of ["key", "type", "move", "from", "to", "reason", "verdict", "refs"]) expect([e.seq, k, e[k]]).toEqual([e.seq, k, w[k]]);
    if (w.type !== "opened") expect([e.seq, e.body]).toEqual([e.seq, w.body]);
  }
});

test("--short: what steps 1 and 4 of the brief read is read from it: the findings, the last start's token, the rework moves", async () => {
  const short = JSON.parse((await call(["get?id=ds-1-rows-add-within", "--short"])).out);
  const reviews = short.events.filter((e: any) => e.type === "reviewed");
  expect(reviews.map((e: any) => [e.seq, e.verdict, e.by])).toEqual([[3837, "changes", "rev-2de9b4"], [3863, "pass", "rev-980b38"]]);
  expect(reviews[0].body).toBe(whole.events.find((e: any) => e.seq === 3837).body);
  expect(reviews[0].body.length).toBeGreaterThan(500);
  const starts = short.events.filter((e: any) => e.move === "start");
  expect(starts.at(-1).by).toBe("impl-d8ca13");
  expect(short.events.filter((e: any) => e.move === "rework").length).toBe(1);
  expect(short.events.filter((e: any) => e.move === "submit").map((e: any) => e.refs.length > 0)).toEqual([true, true]);
});

test("--short: the issue keeps its title, body, state, labels and links; the opened event does not say them twice", async () => {
  const short = JSON.parse((await call(["get?id=ds-1-rows-add-within", "--short"])).out);
  const { workflow, runs, opened_at, updated_at, ...rest } = whole.issue;
  expect(workflow.length).toBe(64);
  expect(runs.length).toBe(3);
  expect(short.issue).toEqual({ ...rest, opened_at: utc(opened_at), updated_at: utc(updated_at) });
  expect(short.issue.body).toBe(whole.issue.body);
  const opened = short.events[0];
  expect(opened.type).toBe("opened");
  expect("title" in opened || "body" in opened).toBe(false);
  expect(whole.events[0].body).toBe(whole.issue.body);
  expect([opened.kind, opened.state]).toEqual([whole.events[0].kind, "open"]);
});

test("--short: a cost event keeps who ran and how it ended, not its usage; the answer's cost is left out", async () => {
  const short = JSON.parse((await call(["get?id=ds-1-rows-add-within", "--short"])).out);
  const costs = short.events.filter((e: any) => e.type === "cost");
  expect(costs.length).toBe(3);
  expect(Object.keys(costs[0])).toEqual(["seq", "key", "type", "role", "round", "how", "outcome", "event", "token", "by", "at"]);
  expect(costs.map((c: any) => [c.role, c.round, c.outcome])).toEqual(whole.events.filter((e: any) => e.type === "cost").map((c: any) => [c.role, c.round, c.outcome]));
  expect("cost" in whole && !("cost" in short)).toBe(true);
});

test("--short: a session's write is named by its caller, another holder as it is, and what is no time or no object is left", async () => {
  const r = await call(["get?id=edge", "--short"]);
  const short = JSON.parse(r.out);
  expect(Object.keys(short)).toEqual(["short", "issue", "children", "more", "events"]);
  expect(short.more).toBe(true);
  expect(short.issue).toEqual({ id: "e", title: "now", body: "the body", last: { move: "ready", at: "1970-01-01T00:00:00Z" }, opened_at: "2026-10-12T06:52:16Z" });
  expect(short.events).toEqual([
    { seq: 1, type: "opened", title: "then", by: "owner (tab)", at: "2026-10-12T06:52:16Z" },
    { seq: 2, type: "commented", body: "b", by: "did:plc:abc", at: "not a number" },
    { seq: 3, type: "labelled", add: ["x"], remove: [], by: "owner" },
    "a string",
    { seq: 5, type: "moved", by: "already a name", at: true },
  ]);
});

test("--short: an answer with no events is printed as it came: a refusal, a body that is no JSON, another method", async () => {
  for (const [id, status] of [["none", 404], ["text", 502], ["list", 200]] as const) {
    const r = await call([`get?id=${id}`, "--short"]);
    expect([id, r.code, r.out, r.err]).toEqual([id, 0, answers[id][1], ` [${status}]\n`]);
  }
});

test("--short: a name the tool does not keep is exit 2 and nothing is sent", async () => {
  const r = await call(["get?id=ds-1-rows-add-within", "--short"], "nobody");
  expect([r.code, r.out, r.got]).toEqual([2, "", []]);
  expect(r.err).toContain("no token named nobody is kept");
});

test("the script's header says what --short leaves out, and the brief has the call in step 1", () => {
  const head = readFileSync(script, "utf8").split("\n").filter((l) => l.startsWith("#")).map((l) => l.replace(/^# ?/, "")).join(" ");
  for (const k of ["`--short`", "`prev`", "`hash`", "`sig`", "`ray`", "`origin`", "`workflow`", "times in UTC", "One event a line", "whose first key, `short`, says that it was cut"]) expect(head).toContain(k);
  const brief = readFileSync(join(root, ".claude/skills/brain-maintenance/agents/implementer.md"), "utf8").replace(/\s+/g, " ");
  expect(brief).toContain('`ia "get?id=<id>" --short`');
  expect(brief).toContain("1. **Read the issue**, in its short form");
});
