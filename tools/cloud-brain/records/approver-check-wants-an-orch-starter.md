# approver-check-wants-an-orch-starter

`tools/cloud-brain/approver.ts check` said that approve 6513 of `st-7-switch-and-texts` does not
stand, for one reason: the `cost` event of that approver's run was written by `out-5bc2ed`, a
session the owner was in, and the check counted a `cost` event only when an `orch-` holder wrote
it. The owner chose at event 7001 that the check takes such a starter too. Written 2026-10-13 by a
writer of the issue loop (`impl-378eed`), round 1, started at event 7018. A local tool, its test, a
policy file with its test, and three lines of two docs: no seed, no deploy.

**cb4 does not run a new policy, and the approver approves nothing from this landing until the
owner installs `plan/cloud-brain-issues-policy-v7.json`** ("For the owner", below). `approver.ts`
is one of the two files the policy in force names by blob, and its blob changed.

## The fault, run before the change

The tool as `HEAD` had it (`git show HEAD:tools/cloud-brain/approver.ts`, copied beside the tool
for the one run and removed), on cb4's record, 2026-10-13 21:20:44 CEST:

```
$ bun tools/cloud-brain/impl-378eed-before.ts check --token impl-378eed
approve 6513 of st-7-switch-and-texts:
  the verdict's token appr-0051ce is the token of no cost event of role approver written by an orch- holder
13 approves by a delegation, 1 that do not stand
exit 1
```

And the new test, before the tool was changed: `bun test --timeout=30000 ./tests/tools/approver.test.ts`
gave `33 pass`, `2 fail`. One was the new test of an `out-` starter, which failed with the line
above as `failed[0].why` for the token of the test. The other was the test that had the old words
of the line, which I had changed to the new words first.

## What changed

**`check` counts a `cost` event of role `approver` whose holder begins `secret:orch-` or
`secret:out-`** (`STARTER` in `approver.ts`; `/^secret:orch-/` before). The line it prints when no
such event has the verdict's token ends `written by an orch- or an out- holder`. The header of the
tool says so under `check`. No other command of the tool reads a `cost` event: `git grep -n '"cost"' -- tools/cloud-brain/approver.ts`
prints one line, the one of `check`. So `approve`, the live tool, has no such test, which the issue
left as not looked at.

The owner's answer is "A", and A as he was shown it (comment 6577) reads "the check takes an
approver that any token but its own started, `orch-` or `out-`". That can be read two ways: every
holder but the approver's own, or those two kinds. The two kinds were taken, by line 2 of
`philosophy.md` as that file reads it ("Take the side that is smaller and easier to undo"), with
line 1: both ways widen what the check lets through, and this one lets through the case he was
asked about and no more. The wider reading is one line of the tool and a v7 file made again. They are the kinds `rules.md`, "Which
token", gives to what starts an approver (the driver, a judgment run and an orchestrating session
are `orch-`; a session outside the loop is `out-`), and the two `loop.ts` has as `SESSION` (line
1249). The cost: a `cost` event that a writer's, a reviewer's or another approver's token wrote is
still not counted, and a starter with a third kind of name would be named by the check as 6513 was.
`STARTER` is written in `approver.ts` and not imported from `loop.ts`: the policy names the tool by
its blob, and a list read from another file could change what `check` takes with no new policy.

What the check holds is as `plan/cloud-brain-approver-persona.md` has it at "the second way": an
agent that writes the event under a name it made itself is not seen. That was so of `orch-` and is
so of `out-`.

**`plan/cloud-brain-issues-policy-v7.json`**, new: the v6 file with the tool's blob of now, one
sentence before the blobs, and the key `policy-2026-10-13-approver-check-starter-v7`. Made by
`policy-pins.ts remake plan/cloud-brain-issues-policy-v6.json plan/cloud-brain-issues-policy-v7.json --key … --note …`,
which printed `the brief fe5c1e7d…, the tool 887dfff0…, a reason of 1634 characters` (the hashes
cut here). The brief is not changed, so its blob is v6's. cb4 has the v6 file in force:
`issue-as.sh impl-378eed policy` at 21:25:20 CEST answered `policy.seq` 6510 with a reason equal to
the v6 file's, compared in the same command.

**`tests/tools/issues-policy-v7.test.ts`**, new, 6 tests. Two read the file: it is the v6 file but
for its key and the end of its reason, byte for byte what `remake` makes; its blobs are those of
the brief and the tool at the commit the file is of. Four run the tracker's rig with the cell
`tests/tools/fixtures/v6-install-rig.ojs`, given the v6 file where the v6 test gives v5 and the v7
file where it gives v6: the v7 body under v6's key writes nothing (`duplicate: true`), the v7 file
writes one event with `moved: []` and its reason in force, and each file sent again is the install
it was.

**`tests/tools/approver.test.ts`**: one new test and nine new cases in the test beside it. A
`cost` event written by an `orch-` holder and by `out-5bc2ed`: the approve stands. Written by
another approver's token, a writer's, a reviewer's, `xorch-111111`, `out` with no hyphen, an empty
holder, the owner's session, or with no `by`: the line. Written by `out-5bc2ed` with another run's
`token`: the line.

**Two docs said the old rule** and are mended: `SKILL.md`, step 5 of "Run it" (the line on the
`token` of an approver's `cost` event), and `plan/cloud-brain-approver-persona.md` at two places,
each with an "As built" note. The search was
``git grep -n -e 'orch- holder' -e '`orch-` holder' <commit> -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'``,
with `<commit>` the one before the change's: 11 lines, 8 of them in `oversight.md`, which are entries
of past oversights and quote the tool's line as it was printed then. They are left. The other 3
are the mended ones.

## The runs, after the commit of the change

2026-10-13, from the worktree.

| Command | Result |
|---|---|
| `bun tools/cloud-brain/approver.ts check --token impl-378eed` | `13 approves by a delegation, 0 that do not stand`, exit 0 |
| `bun tools/cloud-brain/policy-pins.ts check` | `plan/cloud-brain-issues-policy-v7.json names the brief fe5c1e7d… and the tool 887dfff0…, as the checkout has them`, exit 0 |
| `bun test --timeout=120000 ./tests/tools/approver.test.ts ./tests/tools/issues-policy-v7.test.ts ./tests/tools/issues-policy-v6.test.ts ./tests/tools/issues-policy-v5.test.ts ./tests/tools/policy-pins-remake-key.test.ts` | 59 pass, 0 fail, 877 `expect()` calls, 5 files |
| `tests/tools/suite.sh`, 21:26 to 21:31 CEST | 1300 pass, 0 fail, 10738 `expect()` calls, 136 files |

Before the v7 file was made the suite had 4 fails, all of `tests/tools/issues-policy-v5.test.ts`:
the newest policy file named the tool's blob of before. That is the test that says a change to the
tool is one more policy file.

## Not tried

- **The install of the v7 file on cb4**: the owner's. The rig has it on a record of the v3 and the
  v6 file and two issues, not on cb4's record.
- **Whether cb4's record keeps an event under the key `policy-2026-10-13-approver-check-starter-v7`.**
  No file of `plan/` has it (a case of the v7 test); a key installed from no file is not seen there.
- **An approver's run with this tool.** None can approve until the install, and none was started.
- **`check` run by an overseer.** It was run with a writer's token from this worktree; both read
  the whole record with `issue.sync`.
- **Of the suite's output the last 8 lines were read**, which have the counts. A line
  `skipped: <file>: no <path>` above them would not have been seen. The rig tests of the v6 and the
  v7 file are among the 59 that passed in the run of the five files, so they were not skipped there.
- **A session that starts an approver with a token of a third kind.** None is in the record read:
  the check named 6513 alone before the change and nothing after it.

## For the owner

Not run on cb4: needs the owner present. From the main checkout, once it has the file (`git pull`):

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.issue.install --owner \
  -X POST -H 'content-type: application/json' -d @plan/cloud-brain-issues-policy-v7.json
```

Read first, by anyone: `tools/cloud-brain/issue-as.sh <token> policy` answers `policy.seq` 6510 (it
did at 21:25 CEST). If another policy was installed since, the file is made again from that one.
And `bun tools/cloud-brain/policy-pins.ts check` in that checkout is exit 0. The answer of the
install has a new `seq`, `moved: []` and no `duplicate`; `duplicate: true` means the key was kept
already and nothing was written. The policy and the migrate of the file are v6's, so no guard
changes: the reason alone does.
