# rules-md-owners-word-not-secrets

Written 2026-10-12 by the writer of the issue (token `impl-69c22e`). The section "An act of Never,
on the owner's word" of `.claude/skills/brain-maintenance/rules.md` now says which item of Never it
does not reach: a secret printed, copied or logged. Two docs and two test files. No seed, no
build, no deploy, nothing emitted.

## What it rests on

Read with `issue-as.sh impl-69c22e "get?id=rules-md-acts-on-the-owners-word"` on 2026-10-12:

```
4353 moved approve awaiting-approval -> done  2026-10-12T18:57:27.489Z
     by {"caller":"owner","via":"session","holder":"","tab":true}   reason "B"
```

It answers comment 3832 of that issue, written by the orchestrating session (`orch-d97e0e`), whose
choice reads "**B.** Send it back with the items it does not reach (say, secrets and messages stay
Never whatever is said)." and whose pick reads "**My pick.** B, with secrets left out: a word in
chat is easy to give, and nothing so far needed a secret printed." A script over the body of event
3832 printed `choice exact in 3832: True` and `pick exact in 3832: True` for those two strings.

His word is the one letter, given as the reason of an `approve` move. He did not send the section
back and named no items.

## What changed

`rules.md`:

- The section, before its marker: his "B" with its event and issue, and the text of choice B. The
  marker ("The rest of this section is the writer's reading, not his words.") is still there once,
  and "His answer is of 2026-10-12" now reads "Both answers".
- The section, a new item of the reading, "What it does not reach": the six secrets as Never lists
  them, that the item stays Never whatever is said in chat, for the session he types into as for an
  agent it spawned, and that a session asked for one says so and does not do it. It quotes the pick
  as the orchestrating session's, and says what his "B" did not decide (below).
- The section, "What the word is": the example read "a word to deploy the kernel is no word to
  print a key", which gave a printed key as an act a word could be for. It now reads "no word to
  install a policy".
- Never, the item of the secrets: one sentence, that it stays Never whatever is said in chat, with
  the section's name.
- Never, the first item: "an act of this list" is now "an act of this list, but a secret printed,
  copied or logged".

`SKILL.md`, two places: the last paragraph of "A token an approved spec names" and the first item
of "What the loop does not do". The row "at `awaiting-approval`" of step 3 also names the section,
and speaks of the `approve` move alone; it was read and left.

`tests/tools/rules-md-owners-word-not-secrets.test.ts`, new, 7 tests.
`tests/tools/rules-md-acts-on-the-owners-word.test.ts`: it counted three places of Never that name
the section, and the item of the secrets is now a fourth, so its `toBe(3)` is `toBe(4)`.

## What in the text is mine and not his

- **Secrets alone.** Choice B gives "secrets and messages" after "say", as an example. The pick
  gives secrets. The issue takes secrets alone, "the smaller reading", and so does the text. The
  other reading, both items, would narrow further and was not asked of him.
- **A message outside the two addressees is still reached by the section.** The new item says so
  in words: "Until he says, the section reaches that item as it reaches the rest". That is the
  state before this change, written down, and no new leave.
- **"For the session he is typing into as for an agent it spawned"** and **"a session asked for
  one says so and does not do it"** are not in the choice. Without the first the item could be
  read as a rule for agents only, which Never already was.
- **"Copy" and "log" are taken with "print"**, as the Never item has the three together. The choice
  says "secrets" and the pick "a secret printed".

## Tests

In the worktree, 2026-10-12.

| Command | Result |
|---|---|
| `bun test ./tests/tools/rules-md-owners-word-not-secrets.test.ts`, with `rules.md` and `SKILL.md` as `origin/main` had them | 1 pass, 6 fail |
| `bun test ./tests/tools/rules-md-owners-word-not-secrets.test.ts ./tests/tools/rules-md-acts-on-the-owners-word.test.ts`, with the edit | 15 pass, 0 fail |
| `tests/tools/suite.sh`, with the edit (`date`: 21:02:44 to 21:04:27 CEST) | 681 pass, 0 fail, 68 files; no `skipped:` line |

The one test that passes without the edit is the test of the file's helper `items()`. The suite was
not run before the edit, so there is no count of it without the change. No test reads this record.

## Not known

- Whether he meant messages too. The issue says that question is put to him with the approval of
  this task; that comment is the orchestrating session's and was not written by this writer.
- Whether he meant secrets. His letter approved a section that left no item out, with the reason
  "B", whose choice was to send it back. The reading that he wanted the items left out is the
  orchestrating session's (comment 4355 there), and this text follows it. The change only narrows
  what a session may do (`cloud-brain-dev/philosophy.md`, the reading of line 1: "A change that
  only narrows what a caller may do is taken").

## Not tried, not changed

- No session has been asked for a secret under the new item. Nothing on cb4 holds it: the item is
  a text, as the rest of the section is.
- `git grep -n -F` for the section's name, "Print, copy or log a secret", "act of its Never list"
  and "act of the Never list" over `knowledge`, `plan/cloud-brain-*.md`,
  `.claude/skills/brain-maintenance` and `tools/cloud-brain/*.md` printed 18 lines. Left, each dated
  and true when written: `oversight.md` line 680 ("lets a session with the owner present do every
  item of Never on his word") and `records/rules-md-acts-on-the-owners-word.md`, "No line of Never
  is left out". `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` line 94 ("Secrets
  never printed, never copied into files or output") agreed already.
- The reviewer's brief and the approver's brief on the Brain were not read.
- The change is `major`: until the owner approves it the text on `main` is his letter with a
  writer's reading.
