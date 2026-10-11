import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { usageOf, find } from "../../tools/cloud-brain/agent-usage.ts";

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
