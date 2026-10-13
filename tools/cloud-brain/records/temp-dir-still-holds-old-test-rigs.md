# temp-dir-still-holds-old-test-rigs

2026-10-13. An act on one machine (MacBook-Pro-3, macOS, bun 1.4.0) and this record of it. No file of the
repository but this one was changed: no seed, no deploy, no tool, no test. 97,166 directories were removed from
the temporary directory, which had 103,581 entries before and 6,415 after. Times are CEST, read from `date`
before each command. `T` is the directory `$TMPDIR` names, under `/var/folders`. A count of `T` is
`ls -f T | grep -v -c -E '^\.\.?$'`.

## Which it was

The removal of `tmpdir-entries-slow-every-bun-start` was of this same directory, and the entries did not come
back. Its record has both numbers: 203,498 entries in `T` at 01:11, 107,394 of them removed, 100,322 left at
01:31:22. What it left was by its own rule: it removed a directory only when it was last changed more than 6
hours before (24 hours for `playwright-chrome-`) and its name began with one of twelve prefixes. That record
says of the rest, at 01:35:06, that 85,848 of 100,852 were younger than 6 hours, and it lists the names it did
not take (`nbblocks`, `cost-events`, `issue-ask`, `syncmod`, `nbstage`, `atpub-test`, `brain-state`).

From 100,322 at 01:31:22 to 103,581 at 02:33:20 is 3,259 more in 62 minutes. At 02:34:18,
`find T -mindepth 1 -maxdepth 1 -mmin -60 | wc -l` printed 2,819 and the same with `-mmin -30` printed 519. Of
those 519, 478 were `bm-lock*` and 18 `atpub-test`, and the minutes of the `bm-lock-` ones were 02:02 to 02:22
(`stat -f %Sm` of each): none after 02:22. The commit of `test-rigs-left-when-a-file-runs-alone`, which gives a
test file run alone a `TMPDIR` of its own, has the time 02:20:33 (`git log --format=%ci -1 -- bunfig.toml`).
Which runs made them was not read.

## What was removed, and by which names

A directory directly in `T` was removed when its name was one of 58 prefixes, a dash and six characters of
`A-Za-z0-9` (what `mkdtemp` adds) and nothing more, and it was last changed more than a set time before.
Files and links were not taken (`find … -type d`; `find T -mindepth 1 -maxdepth 1 -type l | wc -l` printed 0).
A prefix is exact: `bm-lock-??????` does not match a `bm-lock-docs-` name, which has a line of its own.

Each prefix was read from the repository. `git grep -n -E 'mkdtemp|mktemp' -- tests tools cloud-brain-dev .claude scripts ':!*.md'`
printed 190 lines; a prefix is taken when one of those lines has it in quotes with the dash after it, or, for
seven, when the line is gone or passes the prefix through a function (below).

**51 prefixes, older than 60 minutes.** Fifty are made as directories in a file of `tests/tools` and by no tool (`tools/cloud-brain/issue-watch.sh` makes a file `issue-watch.XXXXXX`, with a dot, which no pattern here matches):
`bm-worktree`, `light-agent`, `bm-lock`, `bm-lock-docs`, `bm-lock-sleep`, `bm-lock-empty`, `bm-kdocs`,
`bm-ksum`, `bm-papers`, `bm-papers-keep`, `agent-token`, `brain-seen`, `nbblocks`, `nbstage`, `issue-ask`,
`issue-ask-state`, `issue-as`, `issue-as-file`, `issue-as-status`, `issue-as-short`, `issue-wait`,
`cost-events`, `syncmod`, `verify-run`, `verify-run-chrome`, `verify-run-build`, `atpub-test`, `brain-state`,
`brain-shell`, `bm-suite`, `tab-tests-cut`, `bm-land`, `issue-stats-flow`, `issue-lock`, `topic-sql`,
`bm-issue-as`, `issue-watch`, `issue-watch-queue`, `issue-watch-loop`, `bm-pm-form`, `bm-pm-watch`,
`brain-info-apply`, `brain-info-size`, `brain-info-size-seed`, `brain-info-deployer`, `brain-info-absent`,
`needs-tab`, `fly-run-sh`, `agent-usage`, `seed-module-test`. The fifty-first is `kdocs`, which
`tools/cloud-brain/knowledge-docs.ts` makes at each start and `knowledge-docs.test.ts` makes by running it.

Four of the fifty have no line at this commit. `bm-papers` and `bm-papers-keep` were in
`tests/tools/summarize-papers.test.ts` until the commit of `summarize-papers-test-over-30s-in-suite`
(`git log -S'"bm-papers-keep-"' -- tests tools`, 2026-10-13 01:01:55), which makes them in the checkout.
`issue-lock` and `topic-sql` were in the two SQL tests until the commit of `view-isolated-from-main-notebook`
(`git log -S'"issue-lock-"'`, 2026-10-12 21:42:12); `ls` of one of each showed one file, `brain-issues.js` and
`brain-topic.js`.

**7 prefixes, older than 24 hours.** `playwright-chrome` (a test's, the rule the earlier removal had for it),
and six that a tool makes and that a run of some hours could still hold: `papers`, `papers-canary`,
`papers-read` and `docs-read` (`tools/cloud-brain/summarize-papers.ts`, the last three through its `outside()`),
`keep` (`tools/cloud-brain/digests/keep.ts`) and `atpub` (`tools/atproto-publish.ts`, which is not a tool of
the loop; `atproto-publish.test.ts` runs it).

The list was made by one `find` for each group at 02:35:56, 95,769 paths, each of them `T`, a slash and a name
of the shape above (`grep -v -c -E "^$T/[a-z][a-z-]*-[A-Za-z0-9]{6}$"`: 0), and given to
`xargs -0 -n 200 -P 4 rm -rf --` from 02:36:04 to 02:43:28, exit 0. By then 1,397 more had passed 60 minutes;
the same two `find` at 02:44:00 printed them (the same `grep`: 0), and the same `xargs` ended at 02:44:05,
exit 0. 95,769 and 1,397 are 97,166. The largest of the first list: `kdocs` 18,500, `bm-worktree` 10,125,
`light-agent` 8,878, `bm-lock` 6,400, `bm-kdocs` 6,239, `bm-papers` 4,479, `agent-token` 3,980, `brain-seen`
3,232, `nbblocks` 2,940, `issue-as` 2,772, `issue-ask` 2,759, `issue-wait` 2,568, `cost-events` 2,337,
`syncmod` 2,211, `nbstage` 2,205.

## What it measured

| | Before | After the first list | After the second |
|---|---|---|---|
| Entries of `T` | 103,581 (02:33:20), 103,583 (02:35:08) | 7,812 (02:43:41) | 6,415 (02:44:05) |
| Names of the lists still in `T` (`comm -12`) | | 0 of 95,769 | 0 of 97,166 |
| `bun -e 1` in `T`, seven runs, ms | 81 76 73 74 71 77 70 (02:35:08, load 3.29 4.88 7.06) | 29 21 24 23 23 24 21 (02:43:41, load 7.85 8.23 7.89) | 32 30 28 33 30 31 30 (02:44:05, load 6.65 7.90 7.79) |
| `bun -e 1` in `/private/tmp`, seven runs, ms | 23 25 25 28 27 27 26 | 19 19 19 20 21 19 22 | not run |

Each time is the difference of two clock reads of `perl -MTime::HiRes` around the command, which has the start
of `perl` in it. The median in `T` went from 74 ms to 23 ms and then read 30 ms with 1,397 fewer entries: the
runs differ by more than the second removal can account for, and the load was not the same.

**Whether it grows again.** Between 02:35:56, when the first list was made, and 02:43:42,
`find T -mindepth 1 -maxdepth 1 -newer <the list>` printed 5 entries, none of a prefix above
(`TemporaryItems`, `lopecode-channel.port`, one `issue-watch.XXXXXX` file, `hsperfdata_…`, one
`claude-learnings-…`). That is eight minutes with other agents of the loop at work, and no job was written.

## What is left in `T`

6,415 entries at 02:44:05. Of the 58 prefixes: 1,040 directories of the 51 that were younger than 60 minutes,
and 3,477 of the seven that were younger than 24 hours (`find` with `-mmin +0` in place of the age), which at
02:43:41 were mostly `playwright-chrome` 2,065, `papers` 542, `papers-canary` 448 and `atpub` 414. They are
this night's and a later run of the same two `find` takes them.

Not removed, whatever their age, because no line of the repository makes the name or because it is in use:
about 830 names of `tmp` and six to eight characters (Python's `tempfile`; which program was not read),
`playwright-artifacts-` 124 and `playwright_chromiumdev_profile-` 90 (Playwright's own), `seed-module-` and
twelve hex digits (`tests/tools/needs.ts`, a store of built seeds that a checkout reads again),
`agent-sandbox-policy` 28, `cloud-brain-agent` 22, `brain-probe` 12, `probe-seen` 10, the `issue-watch.XXXXXX`
files of `issue-watch.sh` (one was written within five minutes of 02:34), and what macOS and other programs
keep there.

## Not done, not tried

- **No tool and no test were written.** The two prefix lists and the `find` were files of the scratchpad and
  are not in the repository; this record has the prefixes and the rule. The check of the act is the row
  "Names of the lists still in `T`" above.
- **Whether a process still used a directory that was removed.** `ps` is refused in the sandbox this ran in, so
  no process was looked for. The age is the only guard: 60 minutes, or 24 hours for a tool's.
- **A removal on a schedule**: not asked, and the eight minutes above saw no growth. A longer watch was not made.
- **Why `bun` starts slower in a directory of many entries** was not looked for, as before.
- `/tmp` and the scratchpad were not touched.
