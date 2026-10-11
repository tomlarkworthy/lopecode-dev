# rules-md-philosophy-push-leave

Written 2026-10-11 by the writer of the issue. `rules.md` of the issue loop
(`.claude/skills/brain-maintenance/rules.md`) now has two standing leaves the owner gave the
orchestrating session that day. Until this change the session kept both from its own notes, and
two sentences of the file said that no such act was allowed.

## What was missing

The reviewer of `ta-3-orchestrator-steps` opened the issue (event 2483): comment 2226 there had
asked that issue's edit of `rules.md` to carry the owner's word of event 2221, and it did not. The
orchestrating session's note on this issue (event 2500) added a second word in the same case, event
2395, and said that a third, event 2400, is `tx-2`'s to write.

Each of the two is one letter, answered to a comment with three choices. Read with
`issue-as.sh issues-implementer-2 "get?id=<issue>"` on 2026-10-11:

| Event | Issue | His word | The choice, in the comment named |
|---|---|---|---|
| 2221 | `seen-philosophy-quote-no-push-token` | "B" | comment 2213, B: the orchestrating session pushes his quoted words in `philosophy.md` "that way", which is A of the same comment (a write token from `git.token` with his session, the push as `cloud-brain-dev/README.md` has it, the token not printed or kept) |
| 2395 | `seen-shell-docs-behind-main` | "A" | comment 2331, A: after a change to a module of the shell has passed review the orchestrating session builds the shell at main, checks the hashes, posts it under the deploy lock with `brain.ts shell` and nothing else, runs the checks and records them on the issue |

## What changed

One commit of two files, authored 2026-10-11 22:13:16 +0200 (`git log --format=%ai`); it is the first ref of
the submit.

`rules.md`, three places:

- A new section, "Two standing leaves of the orchestrating session", before "Publishing a
  notebook". One paragraph a leave. Each has his letter with its event and issue, then the text of
  the choice from the comment, then the sentence "The rest of this paragraph is the writer's
  reading, not his words.", then the reading. The form is the one the no-tests item of Never has
  since review 1148 of `digest-pass-has-no-test-count`.
- Never, first item. It read "And one act with his session that is no tracker call" and named the
  token of an approved spec alone. It now names three acts and the new section.
- "A token an approved spec names", its last paragraph. It read "every other act with his session
  but the `approve` move" is the owner's alone. It now excepts the two acts of the new section.

`tests/tools/rules-md-philosophy-push-leave.test.ts`, new.

What in the readings is mine and not the owner's:

- The push leave is held to a commit that adds his quoted words to `philosophy.md`. The choice says
  "your quoted words" and no more; the close of the issue (event 2225, the orchestrating session)
  reads it the same way. The other side, a leave for any commit of `cloud-brain-dev`, was not
  taken: a change to `agent.sh` was left unpushed for him that evening
  (`records/agent-sh-read-whole-before-run.md`, lines 8 and 9), after his "B".
- The choice for the shell says "posts it with your session". `brain.ts shell` sends
  `authorization: "Bearer " + st.recoveryKey` (`tools/cloud-brain/brain.ts`, the command `shell`),
  so the paragraph says the recovery key, and the first item of Never says "what is his" where it
  said "his session".
- The six modules, and `operator-tab-check.ts --base cb4` as "the check at the address", are what
  comments 2331 and 2462 say. I did not count the modules in a shell.

## The test

```
bun test ./tests/tools/rules-md-philosophy-push-leave.test.ts
```

In the worktree, 2026-10-11, before the edit of `rules.md`: `2 pass`, `6 fail`, 13 expect() calls.
The two that passed are the test of the helpers and the test of commit 4af860c8, which do not read
the new text. After the edit: `8 pass`, `0 fail`, 29 expect() calls.

The whole directory, after the last edit of `rules.md` and the test, `bun test ./tests/tools` in
the worktree: `375 pass`, `1 skip`, `0 fail`, 376 tests across 41 files. A first run gave
`368 pass`, `1 fail`: `issue-lock-sql.test.ts` reads `tools/cloud-brain/.emitted/cloud-brain.html`,
which a new worktree does not have. `bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`
made it and the second run is the count above.

What the test holds: the letter, event and issue of each leave and the choice's text letter for
letter, all before the marker; five phrases of the push reading and three of the shell reading;
that the section says both are the orchestrating session's and what a writer does in their place;
that the two older sentences no longer have their old words; and that `lopecode-dev` 4af860c8 moves
the pointer of `cloud-brain-dev` to 726671a (`git show --stat`).

The choice texts in the test were typed from the output of `get?id=` and are not read from the
tracker by the test: a difference between the test's string and the comment would not fail it.

## Not tried

- Neither act. I made no write token, no push of `cloud-brain-dev` and no `brain.ts shell`; both
  are the orchestrating session's.
- Whether a new orchestrating session, reading `rules.md` alone, makes the push or the post as the
  earlier session did.
- `SKILL.md` and the briefs were not changed. `SKILL.md` line 28 says a quote is "pushed as
  `cloud-brain-dev/README.md` says" and does not say by whom; it does not name the post of the
  shell. The triage (event 2494) put the change in `rules.md`.
- Event 2400 (a reviewer may mend a one-sentence untrue line in a file the change did not touch) is
  not here: the note of event 2500 gives it to `tx-2`.
- No deploy: the change is a doc and a test file.
