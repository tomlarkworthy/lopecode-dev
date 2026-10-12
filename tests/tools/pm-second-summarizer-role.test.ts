// The post mortem of pm-second-summarizer-role quotes the spec it is of and counts its "Not chosen". Each quote and
// the count are read from the spec as commit 619354c2 has it, never from the file as it is: round 2 rewrites it.
//
//   bun test ./tests/tools/pm-second-summarizer-role.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const show = (commit: string, path: string) => {
  const p = Bun.spawnSync(["git", "show", `${commit}:${path}`], { cwd: root });
  if (p.exitCode !== 0) throw new Error(`git show ${commit}:${path}: ${p.stderr.toString().trim()}`);
  return p.stdout.toString();
};
const flat = (s: string) => s.replace(/^> ?/gm, "").replace(/\s+/g, " ");
const pm = readFileSync(resolve(root, "tools/cloud-brain/post-mortems/pm-second-summarizer-role.md"), "utf8");
const spec = show("619354c2", "plan/cloud-brain-docs-summarised-for-search.md");

test("the post mortem has a trace, a root cause, what is not known and the next actions", () => {
  for (const h of ["## What happened", "## The trace", "## The root cause", "## What is not known", "## Next actions, filed"])
    expect(pm).toContain(`\n${h}\n`);
  expect(pm).toContain("don;t we have a summarizer persona, it should reuse that");
  expect(pm).toContain("we just make the summarizer more general as it has the same basic job for the same purpose");
  for (const id of ["spec-names-what-exists-of-the-job", "decision-comment-names-what-is-added", "philosophy-one-role-for-one-job"])
    expect(pm).toContain("`" + id + "`");
});

test("each sentence it quotes of the spec is in the spec at 619354c2", () => {
  for (const q of [
    "He gave no words on who writes a doc's summary. This spec reads the two together: the loop's subagents, one a doc, with a brief of their own. That is the writer's reading and not his words; his approval of this spec is where he says otherwise.",
    "the first two, read whole in the checkout; this design is the first's on another kind",
    "It is `summarize-papers.ts`'s `run` with another source of text.",
    "exported functions that take the role",
    "so that one rule judges both",
    "One light agent a doc, the role `doc-summarizer`, started by a tool as `paper-summarizer` is",
    "found the other citations and the arithmetic to hold",
  ]) {
    expect(flat(spec)).toContain(q);
    expect(flat(pm)).toContain(q);
  }
});

test("the spec's Not chosen at 619354c2 has twelve ways and none is one role for both kinds", () => {
  const lines = spec.split("\n");
  const from = lines.indexOf("## Not chosen");
  const to = lines.findIndex((l, i) => i > from && l.startsWith("## "));
  const part = lines.slice(from + 1, to);
  expect(part.filter((l) => l.startsWith("- **")).length).toBe(12);
  expect(part.filter((l) => /paper-summarizer|role|brief/i.test(l))).toEqual(["- **The summarizer started by `lock.sh` itself, detached.** No brief changes. It would spend with"]);
  expect(pm).toContain('"## Not chosen" has twelve items. None is one role for both kinds');
});

test("the two brief lines it quotes are the briefs' at 619354c2", () => {
  const brief = show("619354c2", ".claude/skills/brain-maintenance/agents/spec.md").split("\n");
  expect(brief[52]).toContain("the smallest design that meets the requirements, and what was not chosen and why");
  expect(brief[74]).toContain("approval that the spec names a token, and which");
  expect(show("619354c2", "tests/tools/fixtures/reviewer-brief.md").split("\n")[369]).toContain("Is the smallest version that meets them the one proposed, and what was not chosen?");
  expect(/reuse/i.test(brief.join("\n"))).toBe(false);
});
