import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { usageOf, find, kindOf, STARTS } from "../../tools/cloud-brain/agent-usage.ts";

const tool = resolve(import.meta.dir, "../../tools/cloud-brain/agent-usage.ts");
const u = (i: number, cw: number, cr: number, o: number, iterations?: any[]) => ({ input_tokens: i, cache_creation_input_tokens: cw, cache_read_input_tokens: cr, output_tokens: o, ...(iterations ? { iterations } : {}) });
const asst = (id: string, usage: any) => JSON.stringify({ type: "assistant", message: { id, usage, content: [] } });
const prompt = (text: string) => JSON.stringify({ type: "user", message: { content: text } });
const result = () => JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t", content: "x" }] } });
const zero = { calls: 0, input: 0, output: 0 };

test("a request written on two lines is counted once, by its last line", () => {
  const t = [prompt("go"), asst("m1", u(2, 100, 1000, 5)), asst("m1", u(2, 100, 1000, 40)), result(), asst("m2", u(3, 10, 1100, 7))].join("\n");
  expect(usageOf(t)).toEqual({ input: 5, cacheWrite: 110, cacheRead: 2100, output: 47, requests: 2, advisor: zero });
});

test("the advisor's call is kept apart from the four sums", () => {
  const its = [{ type: "message", ...u(2, 10, 500, 30) }, { type: "advisor_message", model: "other", ...u(60000, 0, 0, 5000) }, { type: "message", ...u(1, 20, 600, 9) }];
  const t = [prompt("go"), asst("m1", u(3, 30, 1100, 39, its))].join("\n");
  expect(usageOf(t)).toEqual({ input: 3, cacheWrite: 30, cacheRead: 1100, output: 39, requests: 1, advisor: { calls: 1, input: 60000, output: 5000 } });
});

test("--last-run counts from the last prompt, and a tool result is not a prompt", () => {
  const t = [prompt("round 1"), asst("m1", u(1, 1, 1, 1)), result(), asst("m2", u(1, 1, 1, 1)),
    JSON.stringify({ type: "user", message: { content: [{ type: "text", text: "round 2" }] } }), asst("m3", u(5, 50, 500, 6)), result(), asst("m4", u(5, 0, 550, 4))].join("\n");
  expect(usageOf(t).requests).toBe(4);
  expect(usageOf(t, "last")).toEqual({ input: 10, cacheWrite: 50, cacheRead: 1050, output: 10, requests: 2, advisor: zero });
});

// Review 1454, finding 1: a Skill call writes a user row of text, which is not a prompt.
test("a row a tool wrote is not a prompt", () => {
  const skill = JSON.stringify({ type: "user", isMeta: true, sourceToolUseID: "toolu_1", message: { content: [{ type: "text", text: "Base directory for this skill: /x" }] } });
  const sent = JSON.stringify({ type: "user", isMeta: true, origin: { kind: "coordinator" }, message: { content: "The coordinator sent a message: round 2" } });
  const t = [prompt("round 1"), asst("m1", u(1, 1, 1, 1)), skill, asst("m2", u(1, 1, 1, 1)), sent, asst("m3", u(7, 7, 7, 7)), skill, asst("m4", u(1, 1, 1, 1))].join("\n");
  expect(usageOf(t, "last")!.requests).toBe(2);
  expect(usageOf(t, 1)!.requests).toBe(2);
});

// Review 1499: the row of a background task's notification split round 3 of fb-a2vp4smwzq in three.
test("a background task's notification is not a prompt", () => {
  const note = JSON.stringify({ type: "user", isMeta: true, origin: { kind: "task-notification" }, message: { content: "[SYSTEM NOTIFICATION - NOT USER INPUT]" } });
  const sent = JSON.stringify({ type: "user", isMeta: true, origin: { kind: "coordinator" }, message: { content: "round 2" } });
  const t = [prompt("round 1"), asst("m1", u(1, 1, 1, 1)), note, asst("m2", u(1, 1, 1, 1)), sent, asst("m3", u(2, 2, 2, 2)), note, asst("m4", u(2, 2, 2, 2)), note, asst("m5", u(2, 2, 2, 2))].join("\n");
  expect(usageOf(t, 1)!.requests).toBe(2);
  expect(usageOf(t, "last")).toEqual({ input: 6, cacheWrite: 6, cacheRead: 6, output: 6, requests: 3, advisor: zero });
  expect(usageOf(t, 3)).toBeNull();
});

// i1519: the row a compaction writes is plain by every other mark, and nobody sent it.
test("a compaction's summary row is not a prompt", () => {
  const summary = JSON.stringify({ type: "user", isCompactSummary: true, isVisibleInTranscriptOnly: true, message: { content: "This session is being continued from a previous conversation that ran out of context." } });
  const sent = JSON.stringify({ type: "user", isMeta: true, origin: { kind: "coordinator" }, message: { content: "round 2" } });
  const t = [prompt("round 1"), asst("m1", u(1, 1, 1, 1)), sent, asst("m2", u(2, 2, 2, 2)), summary, asst("m3", u(3, 3, 3, 3)), result(), asst("m4", u(3, 3, 3, 3))].join("\n");
  expect(usageOf(t, "last")).toEqual({ input: 8, cacheWrite: 8, cacheRead: 8, output: 8, requests: 3, advisor: zero });
  expect(usageOf(t, 2)).toEqual(usageOf(t, "last"));
  expect(usageOf(t, 3)).toBeNull();
  const one = [prompt("round 1"), asst("m1", u(1, 1, 1, 1)), summary, asst("m2", u(2, 2, 2, 2))].join("\n");
  expect(usageOf(one, "last")!.requests).toBe(2);
  expect(usageOf(one, 2)).toBeNull();
});

// i1559: a main session's typed message has origin.kind "human" and is not isMeta. One sent while a
// turn runs is isMeta ("The user sent a new message while you were working") and the run goes on.
test("a message a person typed is a prompt, and one typed while a turn runs is not", () => {
  const typed = (text: string) => JSON.stringify({ type: "user", origin: { kind: "human" }, promptSource: "typed", turnOrigin: "human", message: { content: text } });
  const blocks = JSON.stringify({ type: "user", origin: { kind: "human" }, message: { content: [{ type: "text", text: "3" }] } });
  const mid = JSON.stringify({ type: "user", isMeta: true, origin: { kind: "human" }, message: { content: "The user sent a new message while you were working:\nwhy so slow?" } });
  const note = JSON.stringify({ type: "user", origin: { kind: "task-notification" }, message: { content: "<task-notification>" } });
  const t = [typed("1"), asst("m1", u(1, 1, 1, 1)), result(), asst("m2", u(1, 1, 1, 1)), typed("2"), asst("m3", u(2, 2, 2, 2)), mid, asst("m4", u(2, 2, 2, 2)), note, asst("m5", u(2, 2, 2, 2)),
    blocks, asst("m6", u(4, 4, 4, 4))].join("\n");
  expect(usageOf(t)!.requests).toBe(6);
  expect(usageOf(t, 1)).toEqual({ input: 2, cacheWrite: 2, cacheRead: 2, output: 2, requests: 2, advisor: zero });
  expect(usageOf(t, 2)).toEqual({ input: 6, cacheWrite: 6, cacheRead: 6, output: 6, requests: 3, advisor: zero });
  expect(usageOf(t, 3)).toEqual({ input: 4, cacheWrite: 4, cacheRead: 4, output: 4, requests: 1, advisor: zero });
  expect(usageOf(t, "last")).toEqual(usageOf(t, 3));
  expect(usageOf(t, 4)).toBeNull();
});

// Review 1454, finding 2: the last run is not round N once a later round has been sent.
test("--run N counts the Nth prompt's run, and there is none past the last", () => {
  const t = [prompt("1"), asst("m1", u(1, 10, 100, 1)), result(), asst("m2", u(1, 0, 110, 1)), prompt("2"), asst("m3", u(2, 20, 200, 2)), prompt("3"), asst("m4", u(3, 30, 300, 3))].join("\n");
  expect(usageOf(t, 1)).toEqual({ input: 2, cacheWrite: 10, cacheRead: 210, output: 2, requests: 2, advisor: zero });
  expect(usageOf(t, 2)).toEqual({ input: 2, cacheWrite: 20, cacheRead: 200, output: 2, requests: 1, advisor: zero });
  expect(usageOf(t, 3)).toEqual(usageOf(t, "last"));
  for (const bad of [0, 4, 1.5, NaN]) expect(usageOf(t, bad)).toBeNull();
});

test("a line that is not JSON and a file with no request", () => {
  expect(usageOf("not json\n" + asst("m1", u(1, 2, 3, 4)) + "\n{half").requests).toBe(1);
  expect(usageOf(prompt("go")).requests).toBe(0);
  expect(usageOf("").requests).toBe(0);
});

test("the transcript of a session and of a subagent are found; the command prints one line, or exits 1", () => {
  const home = mkdtempSync(join(tmpdir(), "agent-usage-"));
  const p = join(home, ".claude-x", "projects", "-some-project");
  mkdirSync(join(p, "S1", "subagents"), { recursive: true });
  writeFileSync(join(p, "S1.jsonl"), prompt("go") + "\n" + asst("m1", u(1, 2, 3, 4)));
  writeFileSync(join(p, "S1", "subagents", "agent-A1.jsonl"), prompt("go") + "\n" + asst("m1", u(9, 8, 7, 6)));
  writeFileSync(join(p, "S2.jsonl"), prompt("go"));
  expect(find("S1", undefined, home)).toBe(join(p, "S1.jsonl"));
  expect(find("S1", "A1", home)).toBe(join(p, "S1", "subagents", "agent-A1.jsonl"));
  expect(find("S1", "A2", home)).toBeUndefined();
  const run = (...a: string[]) => { const r = Bun.spawnSync(["bun", tool, ...a], { env: { ...process.env, HOME: home } }); return { code: r.exitCode, out: r.stdout.toString().trim() }; };
  expect(run("--session", "S1", "--agent", "A1")).toEqual({ code: 0, out: JSON.stringify({ input: 9, cacheWrite: 8, cacheRead: 7, output: 6, requests: 1, advisor: zero }) });
  expect(run(join(p, "S1.jsonl"), "--last-run").out).toBe(JSON.stringify({ input: 1, cacheWrite: 2, cacheRead: 3, output: 4, requests: 1, advisor: zero }));
  expect(run("--session", "S9").code).toBe(1);
  expect(run("--session", "S2").code).toBe(1);
  expect(run().code).toBe(1);
  expect(run(join(p, "S1.jsonl"), "--run", "1").code).toBe(0);
  for (const bad of ["2", "0", "x", "-1"]) expect(run(join(p, "S1.jsonl"), "--run", bad).code).toBe(1);
  expect(run(join(p, "S1.jsonl"), "--run").code).toBe(1);
  const dir = Bun.spawnSync(["bun", tool, home]);
  expect(dir.exitCode).toBe(1);
  expect(dir.stderr.toString()).toContain("no transcript");
  expect(dir.stderr.toString()).not.toContain("EISDIR");
  rmSync(home, { recursive: true, force: true });
});

// usage-local-command-starts-a-run: the rows a local command, a `!` command and an interruption write
// have no origin and are not isMeta. Runs are numbered as a person counts what they sent.
const row = (o: any, content: any) => JSON.stringify({ type: "user", ...o, message: { content } });
const typed = (text: any) => row({ origin: { kind: "human" } }, text);
const caveat = row({ isMeta: true }, "<local-command-caveat>Caveat: The messages below were generated by the user while running local commands.</local-command-caveat>");
const command = row({}, "<command-name>/exit</command-name>\n<command-message>exit</command-message>\n<command-args></command-args>");
const stdout = row({}, "<local-command-stdout>Catch you later!</local-command-stdout>");
const interrupted = row({}, [{ type: "text", text: "[Request interrupted by user]" }]);
const shellIn = row({}, "<bash-input>ls</bash-input>");
const shellOut = row({}, "<bash-stdout>a.txt</bash-stdout><bash-stderr></bash-stderr>");
const slash = row({}, "<command-message>restart</command-message>\n<command-name>/restart</command-name>");
const expansion = row({ isMeta: true }, [{ type: "text", text: "Request a metadev restart." }]);

test("a local command and an interruption start no run; a `!` command and a slash command start one each", () => {
  const t = [caveat, command, stdout, typed("1"), asst("m1", u(1, 1, 1, 1)), caveat, command, stdout, typed("2"), asst("m2", u(2, 2, 2, 2)), interrupted,
    typed("3"), asst("m3", u(3, 3, 3, 3)), shellIn, shellOut, asst("m4", u(4, 4, 4, 4)), slash, expansion, asst("m5", u(5, 5, 5, 5)), result(), asst("m6", u(5, 5, 5, 5)), interrupted].join("\n");
  expect([1, 2, 3, 4, 5].map((n) => usageOf(t, n)!.requests)).toEqual([1, 1, 1, 1, 2]);
  expect(usageOf(t, 4)!.input).toBe(4);
  expect(usageOf(t, 6)).toBeNull();
  expect(usageOf(t, "last")).toEqual(usageOf(t, 5));
});

// One case a kind, in the order of the table in the tool's head comment. The flags that say who wrote a row
// are read before its origin (review 1627: a human row with isCompactSummary or sourceToolUseID).
test("every kind of row has one name, and four kinds start a run", () => {
  const k = (o: any, content: any) => kindOf({ type: "user", ...o, message: { content } });
  const human = { origin: { kind: "human" } }, coord = { origin: { kind: "coordinator" } };
  const cases: [string, string | null][] = [
    [k({}, [{ type: "tool_result", tool_use_id: "t", content: "x" }]), "tool-result"],
    [k(human, [{ type: "text", text: "and" }, { type: "tool_result", tool_use_id: "t", content: "x" }]), "tool-result"],
    [k({ isCompactSummary: true }, "This session is being continued"), "compact-summary"],
    [k({ isCompactSummary: true, ...human }, "This session is being continued"), "compact-summary"],
    [k({ isMeta: true, sourceToolUseID: "toolu_1" }, [{ type: "text", text: "Base directory for this skill: /x" }]), "tool-written"],
    [k({ sourceToolUseID: "toolu_1", ...human }, "x"), "tool-written"],
    [k({ sourceToolUseID: "toolu_1", ...coord }, "x"), "tool-written"],
    [k({ isMeta: true, ...coord }, "round 2"), "coordinator"],
    [k(coord, "round 2"), "coordinator"],
    [k({ isMeta: true, ...human }, "The user sent a new message while you were working:"), "human-mid-turn"],
    [k(human, "fix it"), "human"],
    [k(human, [{ type: "text", text: "[Image #1] this one" }]), "human"],
    [k(human, "<command-message>restart</command-message>\n<command-name>/restart</command-name>"), "human"],
    [k({ isMeta: true, origin: { kind: "channel" } }, "a cell changed"), "channel"],
    [k({ isMeta: true, origin: { kind: "peer" } }, "from another agent"), "peer"],
    [k({ origin: { kind: "task-notification" } }, "<task-notification>"), "task-notification"],
    [k({ isMeta: true, origin: { kind: "task-notification" } }, "[SYSTEM NOTIFICATION - NOT USER INPUT]"), "task-notification"],
    [k({ origin: { kind: "plain" } }, "a kind not seen"), "origin-other"],
    [k({ isMeta: true }, "<local-command-caveat>Caveat: The messages below</local-command-caveat>"), "meta"],
    [k({ isMeta: true, scheduledTaskId: "s1" }, "Check the release run"), "meta"],
    [k({ isMeta: true }, [{ type: "text", text: "[Image: original 2280x450, displayed at 2000x395.]" }]), "meta"],
    [k({ isMeta: true }, "<bash-input>ls</bash-input>"), "meta"],
    [k({}, [{ type: "text", text: "[Request interrupted by user]" }]), "interrupted"],
    [k({}, [{ type: "text", text: "[Request interrupted by user for tool use]" }]), "interrupted"],
    [k({}, "<bash-input>ls</bash-input>"), "shell-command"],
    [k({}, "<bash-stdout>a.txt</bash-stdout><bash-stderr></bash-stderr>"), "local-command"],
    [k({}, "<bash-stderr>no such file</bash-stderr>"), "local-command"],
    [k({}, "<command-name>/model</command-name>\n<command-message>model</command-message>"), "local-command"],
    [k({}, "<local-command-stdout>Set model to opus</local-command-stdout>"), "local-command"],
    [k({}, "<local-command-stderr>Error: no such command</local-command-stderr>"), "local-command"],
    [k({}, "<command-message>restart</command-message>\n<command-name>/restart</command-name>"), "plain"],
    [k({}, "Read the brief and follow it."), "plain"],
    [k({}, [{ type: "text", text: "round 2" }]), "plain"],
    [k({}, "  why does <bash-input> start a run?"), "plain"],
    [kindOf({ type: "assistant", message: { content: [] } }), null],
    [kindOf({ type: "user" }), null],
    [kindOf({ type: "system", content: "x" }), null],
  ];
  for (const [got, want] of cases) expect(got).toBe(want);
  expect([...new Set(cases.map((c) => c[1]).filter((n) => n && STARTS.has(n)))].sort()).toEqual(["coordinator", "human", "plain", "shell-command"]);
  expect([...STARTS].sort()).toEqual(["coordinator", "human", "plain", "shell-command"]);
});

// A fork's transcript begins with the model's rows and a skill run as a subagent with an isMeta row: the
// first round of each has no prompt. A main session may begin with a local command, which is no round.
test("requests before the first prompt are run 1, and the runs add up to the whole file", () => {
  const sent = row({ isMeta: true, origin: { kind: "coordinator" } }, "The coordinator sent a message while you were working: round 2");
  const none = [expansion, asst("m1", u(1, 1, 1, 1)), result(), asst("m2", u(1, 1, 1, 1)), interrupted].join("\n");
  expect(usageOf(none, 1)).toEqual(usageOf(none));
  expect(usageOf(none, "last")).toEqual(usageOf(none));
  expect(usageOf(none, 2)).toBeNull();
  const fork = [JSON.stringify({ type: "fork-context-ref" }), asst("m1", u(1, 1, 1, 1)), result(), asst("m2", u(1, 1, 1, 1)), sent, asst("m3", u(4, 4, 4, 4))].join("\n");
  expect(usageOf(fork, 1)!.input).toBe(2);
  expect(usageOf(fork, 2)!.input).toBe(4);
  expect(usageOf(fork, "last")).toEqual(usageOf(fork, 2));
  expect(usageOf(fork, 3)).toBeNull();
  expect(usageOf(fork, 1)!.requests + usageOf(fork, 2)!.requests).toBe(usageOf(fork)!.requests);
  const local = [caveat, command, stdout, typed("1"), asst("m1", u(2, 2, 2, 2)), typed("2"), asst("m2", u(4, 4, 4, 4))].join("\n");
  expect(usageOf(local, 1)!.input).toBe(2);
  expect(usageOf(local, 2)!.input).toBe(4);
  expect(usageOf(local, 3)).toBeNull();
  expect(usageOf("", 1)).toBeNull();
  expect(usageOf(caveat, 1)).toBeNull();
});
