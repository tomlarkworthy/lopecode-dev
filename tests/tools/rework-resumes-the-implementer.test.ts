// The issue loop's procedure sends a rework round to the implementer that wrote the change (SendMessage),
// and the cost event of an implementer's run carries what is needed to find it: `agent` and `session`.
// Issue rework-resumes-the-implementer. Since cm-5-the-loop-writes-the-event the run is an event the orchestrator
// writes with issue.cost and reads with issue.runs, and no comment (R7 of
// plan/cloud-brain-run-cost-is-part-of-the-issue-model.md).
//
//   bun test ./tests/tools/rework-resumes-the-implementer.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const dir = resolve(import.meta.dir, "../../.claude/skills/brain-maintenance");
const skill = readFileSync(join(dir, "SKILL.md"), "utf8");
const brief = readFileSync(join(dir, "agents/implementer.md"), "utf8");
const record = readFileSync(resolve(import.meta.dir, "../../tools/cloud-brain/records/rework-resumes-the-implementer.md"), "utf8");

// Every example call of issue.cost in SKILL.md, parsed: a line `issue-as.sh <your token> cost '{…}'`.
const costs = [...skill.matchAll(/^ *issue-as\.sh <your token> cost '(\{.*\})'$/gm)].map((m) => JSON.parse(m[1]));
// The fields issue.cost takes beside key and id (issuesLimits.cost of brain-issues.ojs), and the ones it requires.
const FIELDS = ["role", "round", "how", "outcome", "seconds", "context", "tools", "event", "of", "agent", "session", "token", "usage", "usd", "backfilled"];
const REQUIRED = ["role", "round", "how", "outcome", "seconds", "context"];
// A `## ` section, up to the next one.
const section = (text: string, heading: string) => text.match(new RegExp(`\\n## ${heading}\\n[\\s\\S]*?(?=\\n## |$)`))?.[0] ?? "";

test("an implementer's cost example carries the agent id and the session", () => {
  const impl = costs.filter((c) => c.role === "implementer");
  expect(impl.length).toBeGreaterThan(0);
  for (const c of impl) {
    expect(c.agent).toMatch(/^a[0-9a-f]+$/);
    expect(c.session).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  }
});

test("a resumed round's cost example says so, and names the round whose count it holds", () => {
  const resumed = costs.filter((c) => c.how === "resumed");
  expect(resumed.length).toBe(1);
  expect(resumed[0].round).toBeGreaterThan(1);
});

// cm-5-the-loop-writes-the-event.
test("each cost example is a call the tracker takes: its key, the required fields, and no field issue.cost does not list", async () => {
  expect(costs.length).toBe(2);
  for (const c of costs) {
    expect(c.key).toBe(`cost/${c.id}/${c.role}/${c.round}`);
    for (const k of REQUIRED) expect(c[k]).toBeDefined();
    expect(Object.keys(c).filter((k) => k !== "key" && k !== "id" && !FIELDS.includes(k))).toEqual([]);
    expect(["fresh", "resumed", "light"]).toContain(c.how);
  }
  expect(costs[0].usage).toEqual({ input: 61, cacheWrite: 141873, cacheRead: 3561349, output: 17885, requests: 29, advisor: { calls: 2, input: 254047, output: 13751 } });
  // The list above is the seed's, and issueAct of what cb4 runs takes both examples (a checkout with no deploy/ skips this half with a line).
  const seed = readFileSync(resolve(import.meta.dir, "../../tools/cloud-brain/brain-issues.ojs"), "utf8");
  expect(seed.includes(`cost: [${FIELDS.map((f) => JSON.stringify(f)).join(", ")}]`)).toBe(true);
  const built = resolve(import.meta.dir, "../../cloud-brain-dev/deploy/@tomlarkworthy/brain-issues.js");
  const { existsSync } = await import("node:fs");
  if (!existsSync(built)) return void console.log(`skipped: rework-resumes-the-implementer.test.ts: no ${built}`);
  // deploy/ is as old as the checkout's last sync.ts: a copy from before issue.cost (2026-10-12) is not asked.
  if (!readFileSync(built, "utf8").includes('cost: ["role"')) return void console.log(`skipped: rework-resumes-the-implementer.test.ts: ${built} is from before issue.cost; bun sync.ts in cloud-brain-dev reads what cb4 runs`);
  const { importNotebookModule } = await import("../../tools/notebook-import.ts");
  const m = await importNotebookModule(built, { overrides: { checkedRule: () => { throw new Error("no rule is checked here"); } } });
  const act = await m.value("issueAct");
  for (const c of costs) expect(act("cost", { ...c, id: "an-issue" })).toMatchObject({ type: "cost", role: "implementer", how: c.how });
  expect(() => act("cost", { ...costs[0], id: "an-issue", rounds: 2 })).toThrow(/rounds: not a field of issue\.cost/);
  expect(() => act("cost", { ...costs[0], id: "an-issue", tokens: 1 })).toThrow(/tokens: not a field of issue\.cost/);
});

test("SKILL.md and issue-stats.ts read no comment for a cost: R7's grep counts 0 in both", () => {
  const stats = readFileSync(resolve(import.meta.dir, "../../tools/cloud-brain/issue-stats.ts"), "utf8");
  for (const text of [skill, stats]) expect(text.split("\n").filter((l) => /cost \\?\{|cost-usage/.test(l))).toEqual([]);
});

test("the row for an issue sent back reads the run and resumes with SendMessage, or spawns", () => {
  // since ta-3-orchestrator-steps the row reads the starter from the start event, and a spawn is the row after it
  const row = skill.split("\n").find((l) => l.trim().startsWith("| `in-progress`, started by a writer or a digest writer")) ?? "";
  expect(row).toContain("Send the round to the agent that started it");
  const s = section(skill, "A rework round goes to the agent that wrote the change");
  for (const word of ["SendMessage", "CLAUDE_CODE_SESSION_ID", "`session`", "`agent`", "spawn as step 4", '"runs?id=<id>&role=implementer"', "the highest `round`"]) expect(s).toContain(word);
  // A spec writer's round is read the same way.
  expect(skill).toContain('"runs?id=<id>&role=spec-writer"');
});

test("the reviewer is never resumed", () => {
  expect(section(skill, "A rework round goes to the agent that wrote the change")).toMatch(/reviewer[^.]*never resumed/);
});

test("the brief says what a resumed round does that a first round does not", () => {
  const s = section(brief, "A resumed round");
  for (const word of ["`reviewed`", "worktree.sh", "rules.md", "git -C <root> diff --stat"]) expect(s).toContain(word);
});

// Issue record-first-resumed-rework-round.
test("the record has the first resumed round: its count, the line before and the median of a new agent's", () => {
  const s = section(record, "The first resumed round, 2026-10-11");
  for (const word of ["annotations-file-feedback", "a48b041e17dc6f265", "175,404", "150,949", "24,455", "135,293", "Resuming agent a48b041", "cache_creation", "### Not tried"]) expect(s).toContain(word);
  expect(175404 - 150949).toBe(24455);
});

test("SKILL.md names the round, and does not state what was not seen or list as untried what was tried", () => {
  const s = section(skill, "A rework round goes to the agent that wrote the change");
  expect(s).not.toContain("no round has been run this way yet");
  expect(s).not.toMatch(/resumed after a restart of Claude Code keeps its id;/);
  expect(s).not.toContain("is not known");
  expect(s.match(/Not tried:[^\n]*(\n[^\n]+)*/)?.[0] ?? "").not.toContain("compacted");
  for (const word of ["annotations-file-feedback", "has not been seen", "144,096"]) expect(s).toContain(word);
});

// Review 1090.
test("the record says which token read the quoted counts, quotes the message whole, and says why ab2bb0b ended twice", () => {
  const s = section(record, "The first resumed round, 2026-10-11");
  expect(s).toContain("issues-reviewer-2");
  expect(s).toContain("\n```\nIssue: annotations-file-feedback. The `reviewed` event is 992.\n```\n");
  expect(s).not.toMatch(/why is not\s+known/);
  expect(s).toContain("14:24:47.717Z");
  expect(section(skill, "A rework round goes to the agent that wrote the change")).not.toContain("Of 3 resumes");
});

// Review 1122: a fourth agent had been resumed before the three.
test("the count of agents resumed is taken from the answers to the sends, and a216c74 is a row", () => {
  const s = section(record, "The first resumed round, 2026-10-11");
  expect(s).toMatch(/\na216c74 +10:23:50\.912Z +12:03:08\.236Z +5,958 s +114,548 \/ 6,267\n/);
  // Review 1183: an answer is matched to its SendMessage call, not found by its words.
  expect(s).toContain("select(.[0]==$r.tool_use_id)");
  expect(s).not.toContain('select(test("Resuming agent"))');
  expect(s).not.toMatch(/`a48b041` again|`a216c74` again/);
  expect(s).not.toContain("The three agents resumed that day");
  expect(s).not.toContain("for all three");
  const k = section(skill, "A rework round goes to the agent that wrote the change");
  expect(k).not.toContain("Of the 3 agents resumed");
  expect(k).not.toContain("running totals for the third");
  expect(k).toContain("114,548");
});
