# lk-4-rules-md-two-sentences

## Round 1, 2026-10-11: the two sentences of `rules.md` on the locks

Task 4 of `plan/cloud-brain-locks-held-in-the-cluster.md` (approved at event 1453), requirement R7.
A doc and a test file: no seed, no Worker, no deploy. The change is commit `0c339a9d`,
2026-10-11 20:55:31 +0200 (`git log -1 --format='%h %ci'` in the worktree, before the rebase of the
landing).

### Whose words

`.claude/skills/brain-maintenance/rules.md` is the owner's file: a change to it is an issue labeled
`major` that he approves, or his own word (its lines 3 to 6). Comment 1467 of the issue put the two
sentences of the spec ("What only the owner can do", lines 666 to 673) before him with three
choices, A "The loop makes the edit with these words, in one commit that quotes your answer, after
lk-3", B the loop with his words, C he makes the edit. Event 1535, `caller: owner`, `via: session`,
2026-10-11 19:52:59 CEST (`date -r 1791741179`, the event's `at`), has the body `A`. Event 1536, the
same caller, took `needs-owner` off.

The words in the file are the spec's with nothing changed. Comment 1969 of the orchestrating session
asked that they be written "from what lock.sh does today, read in the script"; that was done as a
check of each clause (below) and not as a second wording, since A is an answer to those words.

### What changed

`rules.md`, under Always, two items (lines 78 to 86 after the edit; 78 to 85 before):

- The first item began "Commit, build or push in the main checkout only while holding the landing
  lock, `tools/cloud-brain/.emitted/land.lock` (`mkdir`, and `rmdir` when done)." It begins with the
  spec's first sentence, to "no directory is made or removed for it." Its three sentences on the
  worktree, on `cloud-brain-dev/` and on `deploy/` are as they were.
- The second item was "Deploy under the lock: `mkdir tools/cloud-brain/.emitted/cb4.lock`, apply,
  `rmdir`. If the directory exists, another agent is deploying. Wait and look again; do not remove
  it. A lock left by an agent that died is removed by the owner." It is the spec's second sentence,
  whole. So "removed by the owner" is gone from the rules: "ends at its time" is in its place.

`tests/tools/lock.test.ts`, the test "R3: the briefs name lock.sh for both locks, and no directory,
mkdir, rmdir or rm -r of either": `rules.md` is in the list `named`, so it must have `lock.sh take`
and `lock.sh release` and no line the filter rejects. The comment above the test says whose the
file is.

### Each clause, where it was read and what was seen

Read in `tools/cloud-brain/lock.sh` of `main` at `49fa9983`. Seen on cb4 in one command of mine from
the main checkout, 20:55:12 to 20:55:18 CEST, which took `land` and then `cb4` as
`lk-4-rules-md-two-sentences`, asked for each as `lk-4-probe`, and released both.

| Clause | In the script | Seen on cb4 |
|---|---|---|
| `lock.sh take land <who>`, `lock.sh release land <who>` | header lines 2 and 9 | `land taken by lk-4-rules-md-two-sentences at 2026-10-11 20:55:13 CEST, until 2026-10-11 21:05:13 CEST`, exit 0; `land released by lk-4-rules-md-two-sentences at 2026-10-11 20:55:15 CEST`, exit 0 |
| "The lock is held in the cluster; no directory is made or removed for it" | lines 19 and 20; `grep -c "mkdir\|rmdir" tools/cloud-brain/lock.sh` is 0 | not seen during a hold. After the release, `ls -d tools/cloud-brain/.emitted/land.lock tools/cloud-brain/.emitted/cb4.lock`: "No such file or directory" for each |
| `lock.sh take cb4 <who>`, `lock.sh release cb4 <who>` | header lines 2 and 9 | `cb4 taken by …`, exit 0; `cb4 released by …`, exit 0 |
| "Exit 1 names the agent that is deploying" | lines 128 and 129 | `take cb4 lk-4-probe`: `lock.sh: cb4 is held by lk-4-rules-md-two-sentences since 2026-10-11 20:55:13 CEST, until 2026-10-11 21:05:13 CEST. Not taken.`, exit 1 |
| "A lock is released by its holder" and "Nobody releases another's" | lines 156 to 161 | `release cb4 lk-4-probe`: `… not by lk-4-probe. Left where it is.`, exit 1, and `show cb4` after it still named the holder. The same two lines for `land` |
| "or ends at its time" | lines 20 and 21 | not seen by me: no lock was left to run out. `records/lk-3-lock-sh-over-the-cluster.md`, line 61, has it against the stand-in of the tests |

The `ls` was a later command than the one that held the locks, and its time was not noted: it
shows that neither directory was on this machine after the release. That none is made during a hold
rests on the script having no `mkdir`.

### The test, before and after

In the worktree, `bun test ./tests/tools/lock.test.ts`:

```
with rules.md in the list, before the edit   22 pass  1 fail  228 expect() calls
after the edit                               23 pass  0 fail  241 expect() calls
```

R7 of the spec says the test fails "on lines 79 and 83" with the old text. It failed one check
earlier, on `rules.md names lock.sh take` (line 387 of the test), which stops the test before the
line filter. The filter of line 390, run alone on the old `rules.md` with `bun -e`, printed `79` and
`83`.

`bun test ./tests/tools` in the worktree, after the edit: 282 pass, 1 fail of 283 in 33 files. The
one is `tests/tools/issue-lock-sql.test.ts`, which reads
`tools/cloud-brain/.emitted/cloud-brain.html` of the worktree ("Notebook not found"); this change
builds no notebook. It was not run in the main checkout.

### Not tried

- A lock that ends at its time, on cb4 (above).
- A release under the holder's name with another token.
- `lock.sh renew`. The two sentences do not name it.
- No other copy of the old text was changed. `grep -rn "removed by the owner\|land\.lock\|cb4\.lock"`
  over `.claude/skills/brain-maintenance/*.md`, `agents/`, `knowledge/`, `cloud-brain-dev/AGENTS.md`
  and `README.md` finds it only in `oversight.md` (5 lines, `grep -c`), which is a log of what was
  the case and is left.
- `seen-knowledge-renew-600-s-more` (the deploy guide's "600 s more") is not taken here: comment
  1969 offered it if the sentences touched `renew`, and they do not.
- `rules-md-names-lock-sh` is closed by a move on the tracker, not by this commit; what came of it
  is in the comment of this issue.
