# rules-md-lock-sh-lines-name-no-token

2026-10-12. A change to `.claude/skills/brain-maintenance/rules.md` with a test file, and one note in a
spec. No seed, no deploy. The issue is labeled `major`: `rules.md` is changed by such an issue, and the
`approve` after its review is the owner's.

## What was wrong

`rules.md`, Always, wrote four `lock.sh` commands with no `LOCK_TOKEN`. At `main` d272a65e:

```
$ grep -n 'lock\.sh' .claude/skills/brain-maintenance/rules.md
82:  `tools/cloud-brain/lock.sh take land <who>`, and `lock.sh release land <who>` when done. The
87:- Deploy under the lock: `lock.sh take cb4 <who>`, apply, `lock.sh release cb4 <who>`. Exit 1
```

Since `lock-sh-default-token-r4` (2026-10-12) the script has no default token. Run in the worktree at
d272a65e, 2026-10-12 about 03:41 CEST:

```
$ env -u LOCK_TOKEN bash tools/cloud-brain/lock.sh take land x
lock.sh: no LOCK_TOKEN; nothing was sent
lock.sh take land|cb4 <who> [--wait [seconds]]   take the landing lock (land) or the deploy lock (cb4) as <who>, for 600 s.
…
exit 2
```

That is one of the four, the take of `land`. The other three were run by the new test, below, and each
printed the same first line.

## What changed

`rules.md`, the two items of Always. Each of the four commands has `LOCK_TOKEN=<token> ` before it, inside
its backticks, and the first item gained one sentence that says what `<token>` is:

```
- Commit, build or push in the main checkout only while holding the landing lock:
  `LOCK_TOKEN=<token> tools/cloud-brain/lock.sh take land <who>`, and
  `LOCK_TOKEN=<token> lock.sh release land <who>` when done. `<token>` is the name of your token
  for the tracker ("Which token"); with no `LOCK_TOKEN` the script sends nothing, exit 2. The
  lock is held in the cluster; …
- Deploy under the lock: `LOCK_TOKEN=<token> lock.sh take cb4 <who>`, apply,
  `LOCK_TOKEN=<token> lock.sh release cb4 <who>`. Exit 1
  names the agent that is deploying: …
```

The form is the one `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, step 4, and
`agents/implementer.md`, step 10, already have. The issue asked for the prefix alone. The added sentence
is this writer's: without it `<token>` is a word `rules.md` uses in `issue-as.sh <token>` (Never, first
item) and does not use for the lock. The other choice, the prefix and no sentence, leaves a reader of
`rules.md` alone to take `<token>` of the lock for the one of `issue-as.sh`; it is the smaller change to a
file that is the owner's, and he may prefer it.

`plan/cloud-brain-locks-held-in-the-cluster.md`, under "What only the owner can do": the two sentences
are quoted there as proposed, without the prefix, and the owner chose them (answer A, event 1535 of
`lk-4-rules-md-two-sentences`, as `tests/tools/lock.test.ts` line 407 says; the event was not read again
for this change). The quote stays and has an "(As built, …)" note after it.

`tests/tools/rules-md-lock-sh-lines-name-token.test.ts`, new, three tests:

1. The pattern: a backtick span that holds `lock.sh`, one of `take`, `renew`, `release`, `show`, and
   `land` or `cb4`. It reads the four commands of the two lines as they were and does not read
   "`lock.sh show`" in prose.
2. Every such span of `rules.md` starts with `LOCK_TOKEN=<token> `, and the take and the release of each
   lock are among them.
3. Each such span is run: `<token>` becomes `impl-000000`, `<who>` becomes `x`, the script is the
   checkout's, the environment has no `LOCK_TOKEN`, `BRAIN_STATE_DIR` is an empty directory and
   `LOCK_BASE` is `http://127.0.0.1:9`. Stderr has `no token named impl-000000 is kept` and not
   `no LOCK_TOKEN`, exit 2. So the command as written passes the script's check for a token, and stops at
   the next one, before a call is made.

## The test

```
bun test ./tests/tools/rules-md-lock-sh-lines-name-token.test.ts
```

In the worktree, 2026-10-12. Before the edit of `rules.md`: `1 pass`, `2 fail`, 14 expect() calls; the one
that passed is the test of the pattern, which does not read the file. Test 2 printed the four commands as
the ones with no token, and test 3 failed at the first, on `lock.sh: no LOCK_TOKEN; nothing was sent`.
After the edit: `3 pass`, `0 fail`, 25 expect() calls. After the edit, with `RULES=` at a copy of the file
as d272a65e has it (`git show HEAD:.claude/skills/brain-maintenance/rules.md`): `1 pass`, `2 fail` again.

The whole directory, `bun test ./tests/tools` in the worktree after the last edit of the landing:
`477 pass`, `1 skip`, `0 fail`, 478 tests across 52 files. No line `skipped:` in its output (`grep -c`, 0).

## What else writes the commands

`git grep -n 'lock\.sh \(take\|release\|renew\|show\)' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md' | grep -v LOCK_TOKEN`
in the worktree with the two edited files as d272a65e has them (`git stash` of both, then `wc -l` and
`cut -d: -f1 | sort | uniq -c`) printed 80 lines, 2 of them the lines of `rules.md`. Of the rest, read
from that output and not each in its file: 26 are in `plan/cloud-brain-locks-held-in-the-cluster.md`
(two of them the quote, above), 10 in three other specs, 37 in nine records under
`tools/cloud-brain/records/`, and 5 are prose in `SKILL.md`, `oversight.md` and the `topics:` line of a guide. None of those is changed. Two of them
are instructions and not records, in a spec whose task is closed:
`plan/cloud-brain-brain-docs-entered-by-hand.md` line 122, "Every landing ends with
`tools/cloud-brain/lock.sh release land <id>`", and `plan/cloud-brain-locks-held-in-the-cluster.md`
lines 388 to 393, the script's usage as designed. An agent lands from its brief, not from those.

## Not tried

- The four commands of `rules.md` against cb4, as a reader of that file would run them. The landing of
  this change makes calls of the same form, from the writer's brief.
- `lock.sh renew` and `lock.sh show`: `rules.md` names neither, and the test covers them only if a later
  edit adds one.
- A command of `rules.md` written outside backticks, or broken over two lines inside them: the pattern
  reads one line's span and would not see it.
- Whether the role token named in the issue is still kept, and what cb4 answers a call made with it.
