// A post mortem in the two texts the loop follows: the section "A post mortem" of agents/implementer.md, and in
// SKILL.md the two rows of step 3, the section "A post mortem", the sentence of Triage and the lines of step 7.
// Issue pm-2-brief-and-procedure, task 2 of plan/cloud-brain-post-mortems-declared-and-kept.md (parts 1, 2, 3, 5, 6, 7).
//
//   bun test ./tests/tools/pm-2-brief-and-procedure.test.ts
//   SKILL=<file> BRIEF=<file> reads other copies of the two (with those of the commit before the change, all seven fail).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const dir = resolve(root, ".claude/skills/brain-maintenance");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const skill = readFileSync(process.env.SKILL || resolve(dir, "SKILL.md"), "utf8");
const brief = readFileSync(process.env.BRIEF || resolve(dir, "agents/implementer.md"), "utf8");
const spec = read("plan/cloud-brain-post-mortems-declared-and-kept.md");
const flat = (s: string) => s.replace(/\s+/g, " ");
const count = (text: string, part: string) => text.split(part).length - 1;
// A `## ` section, up to the next one, as one line.
const section = (text: string, heading: string) => flat(text.match(new RegExp(`\\n## ${heading}\\n[\\s\\S]*?(?=\\n## |$)`))?.[0] ?? "");
const step = (text: string, n: number) => {
  const from = text.indexOf(`\n${n}. **`), to = text.indexOf(`\n${n + 1}. **`, from + 1);
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  return flat(text.slice(from, to));
};
const has = (text: string, parts: string[]) => expect(parts.filter((p) => !text.includes(p))).toEqual([]);

const writer = section(brief, "A post mortem"), session = section(skill, "A post mortem");

test("the brief: step 1 sends a writer of a labeled issue to the section, which says what each step is for it", () => {
  expect(step(brief, 1)).toContain('An issue whose `labels` have `post-mortem` is not a fix: read "A post mortem" below before step 2.');
  expect(count(brief, "\n## A post mortem\n")).toBe(1);
  // after the steps and "A resumed round", which other tests cut at the next `## `
  expect(brief.indexOf("\n## A post mortem\n")).toBeGreaterThan(brief.indexOf("\n## A resumed round\n"));
  expect(brief.indexOf("\n## A post mortem\n")).toBeLessThan(brief.indexOf("\n## A quick win\n"));
  has(writer, [
    "| 1, 4 | As written. |",
    "| 2 | The reading is the trace's sources, below. The search of the Brain is made in the words of the decision",
    "| 3 | As written. A post mortem that would need an act of the Never list is stopped there. |",
    "| 5 to 8 | Replaced by the trace. Nothing is reproduced, built or run in a browser. |",
    "| 9 | The rebase alone. No file is written under `tools/cloud-brain/records/`: the post mortem's file is its record",
    "| 10 | A landing with no deploy",
    "| 11 | Nothing is checked on cb4.",
    "| 12 | As written, with the file attached before the submit",
    "| 13 | As written. After a `pass` the next actions are filed, and then you report. |",
    "**The writer is no agent of a run in the trace.**",
    'ia "runs?id=<the issue it is of>"',
    "gives no cause",
  ]);
});

test("the brief: the trace is the spec's, item for item, and names the Never line on secrets", () => {
  // The spec's items, "in the section's words to be" (part 2): each sentence here is one of them.
  const items = [
    "Start at the outcome and go backwards, one step at a time: the owner's words, the comment that put the choice to him, the review, the submit, the run that wrote it, the brief and the prompt that run was given (the prompt is in the transcript alone), the issue as opened, and what it was opened from.",
    "For each step: what was decided or passed on, what the agent had in front of it then (the brief at that commit, the issue's body, what its searches answered), and what it did not have.",
    "Each is read from an event by its seq, a commit, a file and line, a journal file, or the transcript of the run",
    "A transcript is read for what the agent was given, searched and was answered, in order.",
    'A step that could not be read is written under "What is not known" with why',
    "**The cause is something a change can be made to:** a line of a brief, a prompt, a tool's answer, a check nobody makes, a question the review does not ask.",
    '"The spec writer did not think of it" is not one: the next spec writer is a new agent with the same brief.',
    "One cause is written as the root, with the others that were weighed and what in the trace rules each out.",
    "Before the cause is written, `knowledge.search` for earlier post mortems in the words of the cause.",
  ];
  has(flat(spec), items);
  has(writer, items);
  has(writer, [
    "Nothing of a tool result in it that holds a token or a session is quoted",
    '(Never: "Print, copy or log a secret")',
    "`<root>/tools/cloud-brain/.emitted/issue-loop/<issue>.md`",
    "subagents/agent-<agent>.jsonl",
  ]);
  expect(read(".claude/skills/brain-maintenance/rules.md")).toContain("- Print, copy or log a secret:");
});

test("the brief: the file's headings are those the test of the form holds, in its order; the count and the attachment", () => {
  const parts = JSON.parse(read("tests/tools/post-mortems.test.ts").match(/const PARTS = (\[[^\]]*\]);/)![1]) as string[];
  expect(parts.length).toBe(7);
  const rows = brief.split("\n").filter((l) => /^\| `## /.test(l)).map((l) => l.match(/^\| `## ([^`]*)`/)![1]);
  expect(rows).toEqual(parts);
  has(writer, [
    "`tools/cloud-brain/post-mortems/<id>.md`",
    "`# Post mortem: <one line>`",
    "16,000 characters at most",
    "bun test --timeout=30000 ./tests/tools/post-mortems.test.ts",
    "**Attach the file to the issue after the landing and before the submit**",
    '"impl/<id>/attach-<round>" "<id>" "<id>-r<round>.md" "$W/tools/cloud-brain/post-mortems/<id>.md"',
    "ia attach @<scratchpad>/<token>-attach.json",
  ]);
});

test("the brief: the actions are in the file, filed after the pass, 3 at most, each the post mortem's `cause`; the four questions are the spec's", () => {
  has(writer, [
    "**filed after the review passes**",
    "At most 3 issues a post mortem, over all its rounds",
    '"so a bad round cannot compound"',
    "is not opened with `parent`",
    `ia link '{"key":"impl/<id>/action-<n>-cause","id":"<short>","to":"<id>","rel":"cause"}'`,
    '`"labels":["major"]`',
    "You make none of them yourself, as a quick win or otherwise",
    '"None" is an answer',
    'Step 13\'s wait answers `"verdict":"pass"`: open and link each action then',
    "the orchestrating session opens them from the file",
  ]);
  expect(read(".claude/skills/brain-maintenance/agents/overseer.md")).toContain("so a bad round cannot compound");
  const questions = spec.slice(spec.indexOf("### 6. Reviewed"), spec.indexOf("### 7. Known later")).split("\n").filter((l) => /^\d\. /.test(l));
  expect(questions.length).toBe(4);
  has(writer, questions.map(flat));
});

test("SKILL.md step 3: a row for a post mortem at `open` and one at `ready`, above the rows any task is taken by", () => {
  const rows = skill.split("\n").filter((l) => l.startsWith("   | "));
  const at = (part: string) => {
    const found = rows.map((l, i) => (l.includes(part) ? i : -1)).filter((i) => i >= 0);
    expect([part, found.length]).toEqual([part, 1]);
    return found[0];
  };
  const open = at("| labeled `post-mortem`, at `open` |"), ready = at("| labeled `post-mortem`, at `ready` |");
  expect(ready).toBe(open + 1);
  // Since bk-6-skill-watch-and-stats a task is taken by the queue's rows `triage` and `start`, and each sends a post mortem to its own row.
  expect(rows[at("| `triage` |")]).toContain("With the label `digest` or `post-mortem`: its row below.");
  expect(rows[at("| `start` |")]).toContain("With the label `post-mortem`: its row below.");
  expect(open).toBeGreaterThan(at("| `start` |"));
  has(rows[open], ['"list?label=post-mortem&limit=100"', "as `duplicate` and `close` it", "Else `triage`, then `ready`", "Never a quick win of yours"]);
  has(rows[ready], ["Spawn the implementer, with the prompt of step 4 and nothing added", 'It follows "A post mortem" in `agents/implementer.md`', "see that its actions are filed"]);
});

test("SKILL.md, \"A post mortem\": what one is, the two who declare, and the one case the session declares for", () => {
  expect(count(skill, "\n## A post mortem\n")).toBe(1);
  expect(skill.indexOf("\n## A post mortem\n")).toBeGreaterThan(skill.indexOf("\n## The daily digest\n"));
  expect(skill.indexOf("\n## A post mortem\n")).toBeLessThan(skill.indexOf("\n## Triage\n"));
  has(session, [
    "An issue of kind `task`, id `pm-<short>`, labeled `post-mortem`, with one link `{id: pm-<short>, to: <the issue it is of>, rel: \"cause\"}`",
    "It names no cause",
    "**Who declares one.** Two, and nobody else.",
    "**The owner**, through any session on his word.",
    "**You, with no word of his, in one case: he undid work that had passed a review.**",
    "his `send-back` of a spec; his `owner-reject` of an issue that has a `reviewed` event with the verdict `pass`; his `revert`",
    "You open it in the pass that reads the event, with your own token and without the label `owner`",
    '"labels":["post-mortem"]',
    `link '{"key":"orch/pm-<short>/cause","id":"pm-<short>","to":"<the issue it is of>","rel":"cause"}'`,
    "Not a case: a reviewer's `changes`",
    "a put-back by the deployer",
    "the four lines, and nothing of what you think went wrong",
    "Never you, as a quick win or otherwise",
  ]);
  // the three moves are moves of the tracker's default policy
  const seed = read("tools/cloud-brain/brain-issues.ojs");
  for (const move of ["send-back", "owner-reject", "revert"]) expect(seed).toContain(`"${move}"`);
});

test("SKILL.md: the triage of one, the actions filed at `done`, the read after three, and what step 7 tells the owner", () => {
  has(session, [
    '**Triage of one** asks one question in place of the three of "Triage": does a post mortem of the same thing exist',
    '"rel":"duplicate"',
    "**The actions are filed at `done`.**",
    "linked `{id: <action>, to: pm-<short>, rel: \"cause\"}`",
    "has as many `cause` links to it",
    "as its file has actions, before step 7 tells the owner of it",
    "you open the ones that lack from the file, as written there",
    "You do not choose between them and you add none.",
    "`named again by`, each later post mortem with a `related` link to it",
    "**The read after three.** When three post mortems are at `done`",
    "no issue `pm-read-after-three` exists, open it: a `task`, linked `related` to `post-mortems-declared-and-kept`, no part of that project",
    "A read, no build.",
    "did the overseer act on the block",
    "`major` when the brief is the overseer's",
  ]);
  expect(section(skill, "Triage")).toContain(
    'An issue labeled `post-mortem` is asked one question in place of the three: whether a post mortem of the same thing exists ("A post mortem", above).',
  );
  has(step(skill, 7), [
    'Then the post mortems ("A post mortem", below), each said once, in the pass that first reads it so',
    "one that has reached `done`, with its cause in the sentence its file has under `## The root cause` and its actions by id",
    "one that a later post mortem names again",
    "one with an action at `rejected`",
    "when you have declared more post mortems than the record has events of the one case you declare for, that, with both numbers",
  ]);
});
