// issue-ask.sh: the ask of an agent that still runs to the orchestrating session. It refuses an ask with no time
// or no word of what is billed while its agent waits. Issue wait-says-what-runs-and-until-when, an action of
// tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md.
//
//   bun test --timeout=30000 ./tests/tools/issue-ask.test.ts
//   ISSUE_ASK_SH=/path/to/another/issue-ask.sh IMPLEMENTER=<file> SKILL=<file> bun test …
// No call leaves the machine. The tool calls a stand-in for issue-as.sh (ISSUE_AS_SH) that keeps each call's
// arguments and ISSUE_AS_TIME_AHEAD, or the real issue-as.sh against a local server. ISSUE_ASK_NOW is the clock.
import { test, expect } from "bun:test";
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, chmodSync, existsSync, realpathSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(import.meta.dir, "../..");
const script = process.env.ISSUE_ASK_SH || join(root, "tools/cloud-brain/issue-ask.sh");
const NOW = "2026-10-12T22:21:06";

// `answers` are the bodies of the calls in order (the last again after that); `status` the HTTP status of each.
const fake = (answers: unknown[] = [{ id: "x", seq: 7 }, { id: "x", seq: 8 }], opts: { status?: string[]; exit?: number } = {}) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "issue-ask-")));
  answers.forEach((a, i) => writeFileSync(join(dir, `${i + 1}.json`), typeof a === "string" ? a : JSON.stringify(a)));
  (opts.status ?? []).forEach((s, i) => writeFileSync(join(dir, `${i + 1}.status`), s));
  const sh = join(dir, "issue-as.sh");
  writeFileSync(sh, `#!/bin/bash
d="${dir}"
n=$(( $(cat "$d/n" 2>/dev/null || echo 0) + 1 )); echo $n > "$d/n"
python3 -I -c 'import json,sys; print(json.dumps(sys.argv[1:]))' "$ISSUE_AS_TIME_AHEAD" "$@" >> "$d/calls.log"
${opts.exit ? `echo "issue-as.sh: no token named $1 is kept; nothing was sent" >&2; exit ${opts.exit}` : ""}
while [ $n -gt 1 ] && [ ! -f "$d/$n.json" ]; do n=$((n-1)); done
cat "$d/$n.json"
echo " [$(cat "$d/$n.status" 2>/dev/null || echo 200)]" >&2
`);
  chmodSync(sh, 0o755);
  return { sh, calls: () => existsSync(join(dir, "calls.log")) ? readFileSync(join(dir, "calls.log"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as string[]) : [] };
};
const ask = (args: string[], f = fake(), now = NOW) => {
  const p = Bun.spawnSync(["bash", script, ...args], { env: { ...process.env, ISSUE_AS_SH: f.sh, ISSUE_ASK_NOW: now, TZ: "Europe/Berlin" } });
  return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString(), calls: f.calls() };
};
const head = ["impl-bbbbbb", "fly-1", "1"];

test("an ask with no time is refused, and nothing is sent: no minutes, 0, 11, a word, a time of day", () => {
  for (const minutes of [[], ["0"], ["11"], ["soon"], ["22:31"], ["5m"], ["-5"]]) {
    const r = ask([...head, ...minutes, "--nothing-billed", "a go-ahead for the machine's pass"]);
    expect([minutes, r.code, r.calls.length, r.out]).toEqual([minutes, 64, 0, ""]);
    expect(r.err).toContain("issue-ask.sh: not sent.");
  }
  expect(ask([...head, "--nothing-billed", "a go-ahead"]).err).toContain("An ask says for how long its agent waits: 1 to 10 minutes.");
});

test("an ask that does not say what is billed while its agent waits is refused, and nothing is sent", () => {
  const r = ask([...head, "10", "a go-ahead for the machine's pass"]);
  expect([r.code, r.calls.length]).toEqual([64, 0]);
  expect(r.err).toContain("An ask says what its agent started that is billed while it waits");
  const not: string[][] = [
    ["--runs", "a Fly machine"], // since when, and when it is stopped
    ["--runs", "a Fly machine", "--since", "21:36"], // when it is stopped
    ["--runs", "a Fly machine", "--stop-in", "5"], // since when
    ["--runs", "a Fly machine", "--since", "21:36", "--stop-in", "11"], // past the wait
    ["--runs", "a Fly machine", "--since", "21:36", "--stop-in", "soon"],
    ["--runs", "a Fly machine", "--since", "25:00", "--stop-in", "5"],
    ["--runs", "a Fly machine", "--since", "an hour ago", "--stop-in", "5"],
    ["--runs", "", "--since", "21:36", "--stop-in", "5"],
    ["--runs", "  ", "--since", "21:36", "--stop-in", "5"],
    ["--since", "21:36", "--stop-in", "5"],
    ["--nothing-billed", "--runs", "a Fly machine", "--since", "21:36", "--stop-in", "5"],
    ["--nothing-billed", "--stop-in", "5"],
    ["--runs"],
  ];
  for (const flags of not) {
    const r = ask([...head, "10", ...flags, "a go-ahead"]);
    expect([flags, r.code, r.calls.length]).toEqual([flags, 64, 0]);
  }
  // The stop is the wait's at most: 5 of 5 is written, 6 of 5 is not.
  expect(ask([...head, "5", "--runs", "a Fly machine", "--since", "21:36", "--stop-in", "5", "a go-ahead"]).code).toBe(0);
  expect(ask([...head, "5", "--runs", "a Fly machine", "--since", "21:36", "--stop-in", "6", "a go-ahead"]).code).toBe(64);
});

test("an ask with no words, a wrong token, id or number is refused, and nothing is sent", () => {
  const not = [[...head, "10", "--nothing-billed"], [...head, "10", "--nothing-billed", "  "], ["impl", "fly-1", "1", "10", "--nothing-billed", "x"],
    ["", "fly-1", "1", "10", "--nothing-billed", "x"], ["impl-bbbbbb", "Fly 1", "1", "10", "--nothing-billed", "x"],
    ["impl-bbbbbb", "fly-1", "0", "10", "--nothing-billed", "x"], ["impl-bbbbbb", "fly-1", "one", "10", "--nothing-billed", "x"], []];
  for (const a of not) {
    const r = ask(a);
    expect([a, r.code, r.calls.length]).toEqual([a, 64, 0]);
  }
});

test("with nothing billed: the comment, then the label, each with its key, and the wait's end written from the clock", () => {
  const r = ask([...head, "10", "--nothing-billed", "a go-ahead for the machine's pass"]);
  expect(r.code).toBe(0);
  expect(r.calls.map((c) => c.slice(0, 3))).toEqual([["1", "impl-bbbbbb", "comment"], ["1", "impl-bbbbbb", "label"]]);
  expect(JSON.parse(r.calls[0][3])).toEqual({ key: "impl/fly-1/ask-1", id: "fly-1", body:
    "a go-ahead for the machine's pass\n" +
    "Waits until 2026-10-12 22:31:06 CEST (10 min from this write); then it takes the label off and ends the run with a report.\n" +
    "Billed while it waits: nothing this agent started." });
  expect(JSON.parse(r.calls[1][3])).toEqual({ key: "impl/fly-1/asks-1", id: "fly-1", add: ["asks-orchestrator"] });
  expect(JSON.parse(r.out)).toEqual({ comment: 7, label: 8, until: "2026-10-12 22:31:06 CEST", untilEpoch: 1791837066, stop: null });
});

test("with something billed: what runs, since when, and the time its agent stops it, in the comment and the answer", () => {
  const r = ask(["spec-cccccc", "fly-1", "2", "10", "--runs", "a Fly machine, performance-2x", "--since", "21:36", "--stop-in", "4", "one orch token", "and a go-ahead"]);
  expect(r.code).toBe(0);
  const sent = JSON.parse(r.calls[0][3]);
  expect(sent.key).toBe("spec/fly-1/ask-2");
  expect(sent.body.split("\n")).toEqual(["one orch token and a go-ahead",
    "Waits until 2026-10-12 22:31:06 CEST (10 min from this write); then it takes the label off and ends the run with a report.",
    "Billed while it waits: a Fly machine, performance-2x, running since 2026-10-12 21:36:00 CEST. This agent stops it by 2026-10-12 22:25:06 CEST (4 min from this write), answered or not."]);
  expect(JSON.parse(r.calls[1][3]).key).toBe("spec/fly-1/asks-2");
  expect(JSON.parse(r.out).stop).toBe("2026-10-12 22:25:06 CEST");
  // --stop-in 0 is now; a --since later than the clock is the day before's.
  const z = ask([...head, "1", "--runs", "a browser", "--since", "23:50:10", "--stop-in", "0", "x"], fake(), "2026-10-13T00:05:00");
  expect(JSON.parse(z.calls[0][3]).body.split("\n")[2]).toBe(
    "Billed while it waits: a browser, running since 2026-10-12 23:50:10 CEST. This agent stops it by 2026-10-13 00:05:00 CEST (0 min from this write), answered or not.");
});

test("a comment that is refused sends no label; a label that is refused says the session was told nothing", () => {
  const c = ask([...head, "10", "--nothing-billed", "x"], fake([{ error: "forbidden" }], { status: ["403"] }));
  expect([c.code, c.calls.length, c.out]).toEqual([1, 1, ""]);
  expect(c.err).toContain("the comment was not written, and no label was sent");
  const l = ask([...head, "10", "--nothing-billed", "x"], fake([{ seq: 7 }, { error: "forbidden" }], { status: ["200", "403"] }));
  expect([l.code, l.calls.length, l.out]).toEqual([1, 2, ""]);
  expect(l.err).toContain("the comment is written and the label is not, so nothing is printed at the session");
  const none = ask([...head, "10", "--nothing-billed", "x"], fake(["", ""]));
  expect([none.code, none.calls.length]).toEqual([1, 1]);
});

test("the same call again after a label that failed writes the label; both keys used before is exit 1", () => {
  const again = ask([...head, "10", "--nothing-billed", "x"], fake([{ seq: 7, duplicate: true }, { seq: 9 }]));
  expect([again.code, JSON.parse(again.out).label]).toEqual([0, 9]);
  const used = ask([...head, "10", "--nothing-billed", "x"], fake([{ seq: 7, duplicate: true }, { seq: 8, duplicate: true }]));
  expect([used.code, used.out]).toEqual([1, ""]);
  expect(used.err).toContain("both keys of ask 1 were used before; nothing was written. Take the next <n>.");
});

test("a token issue-as.sh does not keep is exit 2, with its line", () => {
  const r = ask([...head, "10", "--nothing-billed", "x"], fake([], { exit: 2 }));
  expect([r.code, r.calls.length, r.out]).toEqual([2, 1, ""]);
  expect(r.err).toContain("no token named impl-bbbbbb is kept");
});

// The real issue-as.sh, with both clocks at NOW (ISSUE_AS_NOW is its own): it refuses the comment the brief had a
// writer send with `ia` (a body that names the wait's end), and sends the tool's. The clocks are set because the
// refusal reads a time beside its date: in the last 10 minutes of a day the wait's end is the next day's, and
// issue-as.sh does not compare it (this test failed so at 23:50 CEST on 2026-10-12, run with the machine's clock).
test("through the real issue-as.sh the tool's comment arrives, and the same body sent with issue-as.sh alone is exit 3", async () => {
  const got: { path: string; body: any }[] = [];
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: async (req) => {
    got.push({ path: new URL(req.url).pathname, body: await req.json() });
    return Response.json({ id: "fly-1", seq: 100 + got.length });
  } });
  try {
    const state = realpathSync(mkdtempSync(join(tmpdir(), "issue-ask-state-")));
    mkdirSync(join(state, ".emitted"));
    writeFileSync(join(state, ".emitted", "cb4-agent-tokens.json"), JSON.stringify({ "impl-bbbbbb": "not-a-token" }));
    const env = { ...process.env, BRAIN_STATE_DIR: join(state, ".emitted"), ISSUE_AS_BASE: `http://127.0.0.1:${server.port}`, ISSUE_AS_SH: "", ISSUE_ASK_NOW: NOW, ISSUE_AS_NOW: NOW, ISSUE_AS_TIME_AHEAD: "", TZ: "Europe/Berlin" };
    const run = async (cmd: string[]) => {
      const p = Bun.spawn(cmd, { env, stdout: "pipe", stderr: "pipe" });
      const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
      return { code: await p.exited, out, err };
    };
    const r = await run(["bash", script, ...head, "10", "--runs", "a Fly machine", "--since", "21:36", "--stop-in", "10", "a go-ahead"]);
    expect([r.code, r.err]).toEqual([0, ""]);
    expect(got.map((g) => g.path)).toEqual(["/xrpc/com.lopecode.brain.issue.comment", "/xrpc/com.lopecode.brain.issue.label"]);
    expect(JSON.parse(r.out)).toMatchObject({ comment: 101, label: 102, until: "2026-10-12 22:31:06 CEST" });
    expect(got[0].body.body).toContain("Waits until 2026-10-12 22:31:06 CEST");
    const plain = await run(["bash", join(root, "tools/cloud-brain/issue-as.sh"), "impl-bbbbbb", "comment", JSON.stringify(got[0].body)]);
    expect(plain.code).toBe(3);
    expect(plain.err).toContain("ahead of the clock");
    expect(got.length).toBe(2);
  } finally { server.stop(true); }
});

// IMPLEMENTER=<file> and SKILL=<file> read another copy (the files before the change).
const section = (text: string, title: string) => {
  const from = text.indexOf(`\n## ${title}\n`);
  if (from < 0) return "";
  const to = text.indexOf("\n## ", from + 1);
  return text.slice(from + 1, to < 0 ? undefined : to);
};

test("the implementer's brief: before a wait a writer stops what is billed or says what runs, since when and until when", () => {
  const brief = readFileSync(process.env.IMPLEMENTER || join(root, ".claude/skills/brain-maintenance/agents/implementer.md"), "utf8");
  const part = section(brief, "Before a wait").replace(/\s+/g, " ");
  expect(part).toMatch(/Before you wait for anyone \(the owner, the orchestrating session, your review, a lock another holds\), stop what you started that is billed by the minute: a Fly machine, a browser or a container of the cluster\./);
  expect(part).toContain("is said in the request: what runs, since when, and the time at which you stop it yourself, answered or not.");
  expect(part).toContain("`issue-ask.sh` refuses the ask without `--nothing-billed` or `--runs … --since … --stop-in …`");
  // Step 13, the wait for a review, names it before the command.
  const flat = brief.replace(/\s+/g, " ");
  const stop = flat.indexOf(`First stop what you started that is billed ("Before a wait", below)`);
  expect(stop).toBeGreaterThan(-1);
  expect(flat.indexOf("issue-wait.sh <token> <id> <seq of your submit>")).toBeGreaterThan(stop);
  // The ask is the tool's call, and the two calls of issue-as.sh it took the place of are gone.
  const need = section(brief, "When you need the orchestrating session");
  expect(need).toContain("$W/tools/cloud-brain/issue-ask.sh <token> <id> <n> <minutes> --nothing-billed <the ask>");
  expect(need).toContain(`$W/tools/cloud-brain/issue-ask.sh <token> <id> <n> <minutes> --runs "<what is billed>" --since <HH:MM> --stop-in <minutes> <the ask>`);
  expect(need).not.toContain(`ia comment '{"key":"impl/<id>/ask-<n>"`);
  expect(need).not.toContain("not written when this was");
});

test("SKILL.md: a message that asks an agent to wait names a time, not a condition of the pool", () => {
  const skill = readFileSync(process.env.SKILL || join(root, ".claude/skills/brain-maintenance/SKILL.md"), "utf8");
  const part = section(skill, "A message that asks an agent to wait").replace(/\s+/g, " ");
  expect(part).toContain("A prompt or a message of yours that tells an agent to wait for you names a time, not a condition:");
  expect(part).toMatch(/\*\*The time by which you answer\*\*, read from `date` and written as a time of day, 10 minutes at most/);
  expect(part).toContain(`Never a condition of the pool ("when no other agent runs"`);
  expect(part).toContain("When you cannot name a time, do not ask the agent to wait: have it stop what is billed and report.");
  expect(part).toContain("`tools/cloud-brain/issue-ask.sh`");
  // The section stands before the one that has the message of a resumed round.
  expect(skill.indexOf("\n## A message that asks an agent to wait\n")).toBeLessThan(skill.indexOf("\n## A rework round goes to the agent that wrote the change\n"));
});
