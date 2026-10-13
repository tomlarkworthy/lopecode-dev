// fb-batch-loop-tools (2026-10-13): what the briefs and the headers of two tools say of three mends of that batch.
// The behaviour is held in loop-step.test.ts (no approver for the approver's own files), loop.test.ts and
// worktree.test.ts (the occupant of a writer put in a worktree at exit 3), and summarize-papers.test.ts (`kept`).
//
//   bun test --timeout=30000 ./tests/tools/fb-batch-loop-tools.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const flat = (path: string) => readFileSync(resolve(root, path), "utf8").replace(/\s+/g, " ");
const SKILL = flat(".claude/skills/brain-maintenance/SKILL.md");
const line = (first: string) => readFileSync(resolve(root, ".claude/skills/brain-maintenance/SKILL.md"), "utf8").split("\n").find((l) => l.trimStart().startsWith(`| ${first} |`)) || "";

test("SKILL.md, the row `ready`: the read of a `held:` comment is a pass by hand's alone, and a step of the driver reads none", () => {
  const r = line("`ready`");
  expect(r).toContain("Read first a comment of it that begins `held:`");
  expect(r).toContain("That read is made in a pass by hand alone: a step of the driver makes the move from the queue's entry and reads no comment");
  expect(r).toContain("is a hold or `needs-owner` before its last link ends");
});

test("SKILL.md, the row at `awaiting-approval`: no approver for a file `facts` marks `[approver]` or `[policy]`, the two keys, and a spec with letters still gets one", () => {
  const r = line("at `awaiting-approval`");
  expect(r).toContain("when all three hold");
  expect(r).toContain("**None for the approver's own files.** When those three hold and `facts` marks a file of a commit of the issue `[approver]` or `[policy]`, of any of its submits, start none");
  expect(r).toContain("keyed `orch/<id>/no-approver-<n>`, and then `needs-owner`, keyed `orch/<id>/needs-owner-<n>`");
  expect(r).toContain("A spec that puts letters to him is not such a case: it still gets its approver.");
});

test("SKILL.md step 4, exit 3, and the writer's page `start`: the writer put in a worktree as it stands is written as its occupant with --occupy", () => {
  expect(SKILL).toContain("Exit 3 wrote no occupant, so write the writer's token as one before the spawn, `tools/cloud-brain/worktree.sh --occupy <topic> <the agent's token>`");
  const start = flat(".claude/skills/brain-maintenance/agents/implementer/start.md");
  expect(start).toContain("or put you in it as it stood when it holds unlanded work of your issue");
  expect(start).toContain("and in either case wrote your token in it as its occupant");
  expect(start).not.toContain("the orchestrator made it at `origin/main` and wrote your token in it as its occupant");
});

test("the headers of worktree.sh and loop.ts name the two: --occupy with its exit 4, and the row that starts no approver", () => {
  const sh = readFileSync(resolve(root, "tools/cloud-brain/worktree.sh"), "utf8"), usage = sh.split("\n").slice(1, 39).join("\n");
  expect(usage).toContain("# worktree.sh --occupy <name> <token>");
  expect(usage).toContain("exit 4 when another token is in it");
  expect(usage.split("\n").at(-1)).toContain("<name> is an issue's or a topic's id");
  expect(sh).toContain("usage() { sed -n '2,39p'");
  const head = flat("tools/cloud-brain/loop.ts").replace(/ \/\/ /g, " ");
  expect(head).toContain("none when a commit of its submits changes a file `approver.ts facts` marks `approver` or `policy`");
  expect(head).toContain("keyed `orch/<id>/no-approver-<n>`, then the label `needs-owner`");
});
