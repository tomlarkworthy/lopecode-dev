// loop-sh-sandbox-has-no-keychain: the texts that say what loop.sh gives safehouse and what a step does at a result
// that says its process is not logged in. The behaviour is held by loop-run.test.ts (loop.sh, the driver's note)
// and loop-step.test.ts (the stop).
//
//   bun test --timeout=30000 ./tests/tools/loop-sh-sandbox-has-no-keychain.test.ts
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(import.meta.dir, "../..", p), "utf8");
const flat = (p: string) => read(p).replace(/\n\/\/ +|\n# |\s+/g, " ");

test("loop.sh: the flag stands between metadev's arguments and the command, and its header says what it is for and what it widens", () => {
  const sh = read("tools/cloud-brain/loop.sh"), head = flat("tools/cloud-brain/loop.sh");
  expect(sh.trim().split("\n").pop()).toBe('exec safehouse "${SAFEHOUSE_ARGS[@]}" --enable=all-agents bun tools/cloud-brain/loop.ts run "$@"');
  expect(head).toContain("After them safehouse is given --enable=all-agents.");
  expect(head).toContain("the profile of Claude Code, which brings the keychain where its login is kept");
  expect(head).toContain("it gives the file rules of every agent safehouse knows, where a session has those of Claude Code alone");
});

test("loop.ts: its header has the stop under what stops a start, and the driver's line of it", () => {
  const head = flat("tools/cloud-brain/loop.ts");
  expect(head).toContain("And what stops every start, a reviewer's, a round's, an overseer's and the judgment run's among them");
  expect(head).toContain("the line has `unlogged` { token, by, said }");
  expect(head).toContain("a step whose line has `unlogged` is said there too");
});

test("SKILL.md, the spec and the knowledge page name the flag, the stop and the record", () => {
  const skill = flat(".claude/skills/brain-maintenance/SKILL.md"), spec = flat("plan/cloud-brain-orchestrator-as-steps.md"), page = flat("knowledge/working-with-cloud-brain-remote-lopecode-cluster.md");
  expect(skill).toContain("inside `safehouse` with the arguments `metadev` gives it and `--enable=all-agents`");
  expect(skill).toContain("no line has `unlogged`, and stderr has no `loop.ts run: no agent is started: …`");
  expect(spec).toContain("**As built (`loop-sh-sandbox-has-no-keychain`, 2026-10-13).**");
  expect(spec).toContain("A fifth thing stops a start, and it stops every role's");
  for (const t of [skill, spec, page]) expect(t).toContain("tools/cloud-brain/records/loop-sh-sandbox-has-no-keychain.md");
});

test("the record: what changed, what the two steps left, the line of st-6 this was behind, and what was not tried", () => {
  const rec = read("tools/cloud-brain/records/loop-sh-sandbox-has-no-keychain.md");
  for (const h of ["## What changed", "## What the two steps left", "## Tests", "## Not tried"]) expect(rec).toContain("\n" + h + "\n");
  expect(rec.replace(/\s+/g, " ")).toContain("**`loop.sh` was not seen.**");
  expect(read("tools/cloud-brain/records/st-6-a-day-beside-the-session.md")).toContain("**`loop.sh` was not seen.**");
});
