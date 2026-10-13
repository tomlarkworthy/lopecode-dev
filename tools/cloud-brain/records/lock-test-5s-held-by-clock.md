# lock-test-5s-held-by-clock

2026-10-13. One line of one test cell of `tools/cloud-brain/brain-issues.ojs`, the seed of `brain-x-issues`. A
quick win of the writer of `ap-5-panel-approved-for-you` (`impl-51efe4`), landed and deployed with that change.
Times are CEST, each from `date`.

## What was wrong

`test_issues_lock_past_its_until_is_taken_over` took a lock with `seconds: 5` and expected the next call,
`locks`, to list it as held. Nothing in the test waits, but the two calls are two turns of a page that runs
every other test cell at the same time. When 5 s pass between them the lock has ended, and the first expect
fails: received `[[], [the ended lock]]` where `[["a"], []]` is expected.

Seen while testing `ap-5-panel-approved-for-you`, between 01:10 and 01:20: seven builds of that worktree, each with one
line of the panel changed and nothing of the locks, run one after another with
`bun tools/cloud-brain/tab-tests.ts <build> @tomlarkworthy/brain-issues`. The test failed in 3 of the 7 (the
first, the second and the seventh). `uptime` at 01:20 gave a load average of 9.37. The two runs of that tool
on the build with no such line changed, before them, passed it.

The deployer runs the same cell in the cluster's browser after a deploy of `brain-x-issues`, and puts the
version back when a test fails.

## What changed

The lock is taken for the default, 600 s (`issuesLimits.lockSeconds`), with a comment that says why. The next
line of the test writes the row into the past itself, as before, so the test still waits for no clock.

## The tests

After the change the test did not fail in any run the writer made. The runs of `tab-tests.ts` whose list of
failed tests was read, each on a build with the change:

| Runs | When | Load average at the end (`uptime`) | The test failed in |
|---|---|---|---|
| 8, one after another | 01:25 to 01:30 | 11.17 | 0 |
| 8, one after another | 01:32 to 01:36 | not read | 0 |
| 24, six at once | 01:37 to 01:41 | 21.90 | 0 |
| 24, six at once | 01:42 to 01:45 | 24.11 | 0 |
| 24, six at once | 01:54 to 01:57 | 25.45 | 0 |
| 9, one after another | 01:57 to 02:03 | 5.59 | 0 |

The module's count on the build of the last seed commit: `tab-tests.ts`, 65 of 65 (01:54);
`verify-run.ts brain-x-issues --shell <build> --times 60`, 60 of 60, `byChance` `[]` (01:53).

## Not tried

- The test was not made to fail on purpose with the 5 s in place (a page held busy for 5 s between the two
  calls). That the 5 s was the cause is read from the received value, which has the lock under `ended`.
- `test_issues_lock_is_taken_listed_and_released` takes a lock for 30 s and reads it in the next calls. It was
  not seen to fail and was not changed.
