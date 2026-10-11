// rules.md had no line for two standing leaves the owner gave the orchestrating session on 2026-10-11: his "B" of
// event 2221 (his quoted words in philosophy.md are pushed with a write token got with his session) and his "A" of
// event 2395 (the shell is posted after a reviewed change to one of its modules). The session worked by both from
// its own notes, and two sentences of the file said no such act was allowed. Issue rules-md-philosophy-push-leave.
//
//   bun test ./tests/tools/rules-md-philosophy-push-leave.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const rules = readFileSync(join(root, ".claude/skills/brain-maintenance/rules.md"), "utf8");

const flat = (s: string): string => s.replace(/\s+/g, " ").trim();
// A section: from its "## " heading to the next one.
const section = (text: string, heading: string): string => {
  const at = text.indexOf(`\n## ${heading}\n`);
  if (at < 0) return "";
  const next = text.indexOf("\n## ", at + 1);
  return text.slice(at + 1, next < 0 ? text.length : next);
};
// A paragraph of a section: from its bold opening to the next blank line.
const paragraph = (text: string, opens: string): string => {
  const at = text.indexOf(opens);
  if (at < 0) return "";
  const end = text.indexOf("\n\n", at);
  return flat(text.slice(at, end < 0 ? text.length : end));
};

const leaves = section(rules, "Two standing leaves of the orchestrating session");
const marker = " The rest of this paragraph is the writer's reading, not his words. ";
const push = paragraph(leaves, "**His quoted words in `philosophy.md` are pushed.**");
const shell = paragraph(leaves, "**The shell is posted after a reviewed change to one of its modules.**");

// The choices as the comments have them (issue.get of each issue, events 2213 and 2331).
const choiceB =
  '"A standing leave: whenever a task of the loop commits your quoted words to philosophy.md, the orchestrating ' +
  'session pushes them that way. It goes into rules.md with ta-3."';
const choiceAofThePush =
  '"The orchestrating session gets one write token with your session and pushes these two commits, this once: ' +
  '`brain.ts curl "/xrpc/com.lopecode.brain.git.token?name=cloud-brain-dev&scope=write" --owner -X POST`, then the ' +
  'push as cloud-brain-dev/README.md has it. The token is not printed or kept."';
const choiceAofTheShell =
  '"A standing leave: after a change to a module of the shell has passed review, the orchestrating session builds ' +
  "the shell at main in a worktree, checks that each module in it has the hash main has, posts it with your session " +
  "under the deploy lock, runs verify-run and the check at the address, and records the command and the answers on " +
  'the issue. Nothing but `brain.ts shell`, and only a build of main."';

test("section() and paragraph() read one and stop at the next", () => {
  expect(section("# t\n\n## a\nx\n\n## b\ny\n", "a")).toBe("## a\nx\n");
  expect(section("# t\n\n## a\nx\n", "z")).toBe("");
  expect(paragraph("**a.** one\ntwo\n\n**b.** three\n", "**a.**")).toBe("**a.** one two");
  expect(paragraph("**a.** one\n", "**z.**")).toBe("");
});

test("the push: his letter with its event and issue, and the choice it answered, before the marker", () => {
  expect(push.split(marker).length).toBe(2);
  const his = push.slice(0, push.indexOf(marker));
  expect(his).toContain('Tom, event 2221 of `seen-philosophy-quote-no-push-token`: "B".');
  expect(his).toContain(`Choice B of comment 2213 there: ${choiceB}`);
  expect(his).toContain(`choice A of the same comment: ${choiceAofThePush}`);
});

test("the push: the reading holds it to his quoted words in philosophy.md, and names the pointer and the first push", () => {
  const reading = push.slice(push.indexOf(marker) + marker.length);
  expect(reading).toContain("adds his quoted words to `philosophy.md`");
  expect(reading).toContain("no other file and no other change of that repository");
  expect(reading).toContain("under the landing lock");
  expect(reading).toContain("`cloud-brain-dev` 726671a");
  expect(reading).toContain("`lopecode-dev` 4af860c8");
});

test("the shell: his letter with its event and issue, and the choice it answered, before the marker", () => {
  expect(shell.split(marker).length).toBe(2);
  const his = shell.slice(0, shell.indexOf(marker));
  expect(his).toContain('Tom, event 2395 of `seen-shell-docs-behind-main`: "A".');
  expect(his).toContain(`Choice A of comment 2331 there: ${choiceAofTheShell}`);
});

test("the shell: the reading names what sends it and what the leave does not reach", () => {
  const reading = shell.slice(shell.indexOf(marker) + marker.length);
  expect(reading).toContain("the recovery key");
  expect(reading).toContain("comment 2462");
  expect(reading).toMatch(/kernel.*`brain-core`.*`brain-db`.*deployer/);
});

test("both leaves are the orchestrating session's, and a writer is told what to do in their place", () => {
  const head = flat(leaves.slice(0, leaves.indexOf("**His quoted words")));
  expect(head).toContain("Both are the orchestrating session's.");
  expect(head).toContain("A writer, a reviewer and the overseer make neither");
});

test("the two sentences that list every act with his session name the leaves", () => {
  const never = flat(section(rules, "Never"));
  expect(never).not.toContain("And one act with his session that is no tracker call");
  expect(never).toContain('("Two standing leaves of the orchestrating session")');
  const token = flat(section(rules, "A token an approved spec names"));
  expect(token).not.toContain("and every other act with his session but the `approve` move. No other agent");
  expect(token).toContain("Still the owner's alone: a token no approved spec names, a scope wider than the spec's");
  expect(token).toContain('the two acts of "Two standing leaves of the orchestrating session"');
});

// The commits the paragraph names are what it says they are.
test("lopecode-dev 4af860c8 moves the pointer of cloud-brain-dev to 726671a", async () => {
  const p = Bun.spawnSync(["git", "-C", root, "show", "--format=%s", "--stat", "4af860c8"]);
  const out = p.stdout.toString();
  expect(p.exitCode).toBe(0);
  expect(out).toContain("cloud-brain-dev at 726671a");
  expect(out).toMatch(/cloud-brain-dev \| 2 \+-/);
});
