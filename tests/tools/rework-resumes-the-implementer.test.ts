// The issue loop's procedure sends a rework round to the implementer that wrote the change (SendMessage),
// and the cost comment of an implementer's run carries what is needed to find it: `agent` and `session`.
// Issue rework-resumes-the-implementer.
//
//   bun test ./tests/tools/rework-resumes-the-implementer.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const dir = resolve(import.meta.dir, "../../.claude/skills/brain-maintenance");
const skill = readFileSync(join(dir, "SKILL.md"), "utf8");
const brief = readFileSync(join(dir, "agents/implementer.md"), "utf8");
const record = readFileSync(resolve(import.meta.dir, "../../tools/cloud-brain/records/rework-resumes-the-implementer.md"), "utf8");

// Every `cost {…}` example of SKILL.md, parsed.
const costs = [...skill.matchAll(/`cost (\{[^`]*\})`/g)].map((m) => JSON.parse(m[1]));
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
  const resumed = costs.filter((c) => c.resumed === true);
  expect(resumed.length).toBe(1);
  expect(resumed[0].round).toBeGreaterThan(1);
});

test("the row for an issue sent back reads the cost comment and resumes with SendMessage, or spawns", () => {
  const row = skill.split("\n").find((l) => l.trim().startsWith("| `in-progress`, started by the implementer token")) ?? "";
  expect(row).toContain("Resume or spawn the implementer");
  const s = section(skill, "A rework round goes to the agent that wrote the change");
  for (const word of ["SendMessage", "CLAUDE_CODE_SESSION_ID", "`session`", "`agent`", "spawn as step 4"]) expect(s).toContain(word);
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
