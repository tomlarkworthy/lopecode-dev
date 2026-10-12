// SKILL.md of the issue loop: one order for a free place, no number for the pool, and the reading of
// the issues past 4 hours in step 1. Issue os-2-order-and-pool, task 2 of plan/cloud-brain-loop-order-of-service.md.
//
//   bun test ./tests/tools/os-2-order-and-pool.test.ts
//   SKILL=<file> reads another copy of the procedure (the one before os-2 fails the tests of steps 1 and 2; the one before
//   bk-6-skill-watch-and-stats the two of step 3 and the one of step 1; the last reads the tool).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const skill = readFileSync(process.env.SKILL || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/SKILL.md"), "utf8");
const flat = skill.replace(/\s+/g, " ");
const step = (n: number) => {
  const from = skill.indexOf(`\n${n}. **`), to = skill.indexOf(`\n${n + 1}. **`, from + 1);
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  return skill.slice(from, to).replace(/\s+/g, " ");
};
const count = (text: string, part: string) => text.split(part).length - 1;

// Until bk-6-skill-watch-and-stats (part 6 of plan/cloud-brain-bookkeeping-in-the-tracker.md) step 3 had the order as a
// sentence ("A place goes, in this order, to: …") and a table whose rows were matched in turn. The order is the queue's
// since, and the step says so: the sentence is gone (the spec's check of R6 counts 0) and the groups are named once.
test("step 3 reads the queue, and names the service's order once, with the two levers and the hold", () => {
  expect(count(flat, "A place goes, in this order")).toBe(0);
  const three = step(3);
  expect(three).toContain('3. **Read the queue and take its entries in order.** `issue-as.sh <your token> "queue"` answers `queue`');
  expect(three).toContain("The order is the service's (`issueQueue` of `tools/cloud-brain/brain-issues.ojs`");
  expect(three).toContain("a round that was sent back (a writer's or a spec's), a review that waits, your own acts, a start; among starts the owner's, then one past 4 hours");
  expect(three).toContain("then a bug or a task before a project or a feature (a `start` before a `spec`), then the oldest.");
  expect(three).toContain("You do not order anything");
  expect(three).toContain(`link '{"key":"orch/<id>/after-<other>","id":"<id>","to":"<other>","rel":"after"}'`);
  expect(three).toContain(`hold '{"key":"orch/<id>/hold-<n>","id":"<id>","until":<ms>,"reason":"<what to read when it comes back>"}'`);
  expect(three).toContain("The record does not know which agents run: skip an entry an agent of yours is on (step 2).");
  expect(three).toContain("a comment that begins `held:` is no longer written");
  // the sentence os-2 replaced is kept only as what was, in quotes
  expect(count(flat, "Finishing comes before starting")).toBe(1);
  expect(flat).toContain('"Finishing comes before starting.');
});

test("step 3 has a row for each `do` of the queue and each `why` of `waiting`, and under them the rows they name", () => {
  const rows = skill.split("\n").filter((l) => l.startsWith("   | "));
  const at = (part: string) => {
    const found = rows.map((l, i) => (l.includes(part) ? i : -1)).filter((i) => i >= 0);
    expect([part, found.length]).toEqual([part, 1]);
    return found[0];
  };
  // The ten values of `do` and the six of `why`, as the prose "The queue" of the seed has them.
  const seed = readFileSync(resolve(import.meta.dir, "../../tools/cloud-brain/brain-issues.ojs"), "utf8");
  const prose = seed.slice(seed.indexOf("md`## The queue"), seed.indexOf("issueQueue = "));
  const named = (head: string) => { const t = prose.slice(prose.indexOf(head)); return [...new Set([...t.slice(0, t.indexOf("\n\n")).matchAll(/^\| \\`([a-z]+)\\` \|/gm)].map((m) => m[1]))].filter((n) => n !== "do" && n !== "why"); };
  const dos = named("| \\`do\\` | The issue is |"), whys = named("| \\`why\\` | The issue |");
  expect(dos.sort()).toEqual(["decompose", "finish", "look", "promote", "ready", "review", "round", "spec", "start", "triage"]);
  expect(whys.sort()).toEqual(["after", "gathering", "owner", "parts", "until", "work"]);
  const head = at("| `do` | Do |"), waiting = at("| In `waiting`, `why` | Do |"), cases = at("| Issue is | Do |");
  for (const d of dos) { const r = at(`| \`${d}\` |`); expect([d, r > head && r < waiting]).toEqual([d, true]); }
  const between = rows.slice(waiting + 1, cases).join("\n");
  for (const w of whys) expect([w, between.includes(`\`${w}\``)]).toEqual([w, true]);
  expect(cases - waiting).toBe(4);
  // The rows the two tables name stand under them, a round sent back first and the dead writer's next to it.
  const sentBack = at("sent back, no agent running");
  const dead = at("**A dead writer.**");
  expect(rows[sentBack]).toContain("When it cannot be sent one, the next row");
  expect(dead).toBe(sentBack + 1);
  for (const r of [sentBack, dead, at("**A quick win of your own, sent back.**"), at("**A spec sent back.**"), at("**A submit made for a writer.**"), at("| at `awaiting-approval`"), at("| labeled `needs-owner`")]) expect(r).toBeGreaterThan(cases);
  for (const name of ['"A dead writer"', '"A quick win of your own, sent back"', '"A spec sent back"']) expect([name, rows[at("| `round` |")].includes(name)]).toEqual([name, true]);
  for (const name of ['"A dead writer"', '"A submit made for a writer"', '"A quick win of your own, sent back"']) expect([name, rows[at("| `work`, and no agent of yours is on it |")].includes(name)]).toEqual([name, true]);
  // No row is matched by a state any more: the rows the queue's entries took the place of are gone.
  for (const gone of ["at `building`, no open part", "at `approved` |", "| `triaged`, no open children |", "| `open`, kind `task` or `bug` |", "| `in-review`, and no review since it came into that state", "labeled `digest`, at `ready`"])
    expect([gone, rows.filter((l) => l.includes(gone)).length]).toEqual([gone, 0]);
  expect(rows[at("| `decompose` |")]).toContain(`link '{"key":"orch/<task>/after-<other>","id":"<task>","to":"<other>","rel":"after"}'`);
  expect(rows[at("| `start` |")]).toContain("With the label `digest`, the digest writer");
});

test("no number of writers or reviewers is stated as a limit, in the procedure or in the description", () => {
  expect(skill).not.toMatch(/up to (\d+|two|four|eight) implementers|More than \d+ writers|\d+ implementers of step 2/i);
  const description = skill.split("\n").find((l) => l.startsWith("description:")) ?? "";
  expect(description).not.toMatch(/\b(\d+|two|four|eight) (implementers|reviewers|writers)\b/);
  expect(description).toContain("with no fixed number of either");
  const not = skill.slice(skill.indexOf("## What the loop does not do"), skill.indexOf("## Why the overseer may edit briefs"));
  expect(not).toContain("- Two agents on one issue.");
  expect(not).not.toMatch(/\d+ (writers|reviewers)/);
});

test("step 2 has the rule of the pool as the spec words it, and the owner's numbers as what it replaces", () => {
  const two = step(2);
  for (const part of [
    "No number is set.",
    "Every review that waits gets a reviewer, and every round sent back goes to its writer, in the pass that sees it.",
    "A new writer is started only when, after that, no review waits without a reviewer and no sent-back round waits without a writer.",
    "Start nothing new in a pass in which an agent's report or your own session names a rate limit or a usage limit, or in which `lock.sh show land` has named the same holder for two passes.",
    "One agent on an issue, as before.",
    "none in force since `os-2-order-and-pool`",
    '"try to have 1-2 writers and 1-2 reviewers active at all times"',
    '"maybe we do another 2 in parrallel"',
    '"can we increase the parrallism twofold?"',
    '"Maybe we let it manage its own pool size and not worry about optimality"',
  ]) expect(two).toContain(part);
});

test("step 1 reads the line of issue-stats.ts for the issues past 4 hours, and says what is done with a row", () => {
  const one = step(1);
  for (const part of [
    "bun tools/cloud-brain/issue-stats.ts --token=<your token>",
    "`past 4 h, not started, no reason: <n>`",
    "a row is an entry of `queue` that is `late`",
    "whose `do` is `start`, `spec`, `triage` or `ready`",
    "a link `after` when it waits for an issue, a hold when it waits for a time or a count, `needs-owner` with its comment when it waits for him",
    "`(<m> more are held)` with the entries whose `why` is `after` or `until`",
    "A comment whose body begins `held:` is no longer written for this",
    "tools/cloud-brain/records/os-3-stats-past-four-hours.md",
  ]) expect(one).toContain(part);
  // no call of the comment that was the reason until bk-6
  expect(skill).not.toContain('"key":"orch/<id>/held-1"');
  // the order of step 3 names the place the list is read
  expect(step(3)).toContain('(`late`; step 1, "Past 4 hours")');
});

test("the line step 1 names is the one issue-stats.ts prints", () => {
  const tool = readFileSync(resolve(import.meta.dir, "../../tools/cloud-brain/issue-stats.ts"), "utf8");
  expect(tool).toContain("not started, no reason: ");
  expect(tool).toContain("more are held)");
});
