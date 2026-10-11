# snapshot-digest-test-fails-by-chance

## Round 1, 2026-10-11

`test_a_run_that_kept_items_opens_one_task_for_the_days_digest` (`brain-snapshot.ojs`) failed 10 of
32 runs of the deployer's run address on one hash (the issue's body, 12:00 to 12:09 CEST). The
deployer puts a Worker back when a test fails after a deploy, so a deploy of `brain-x-snapshot`
with nothing wrong in it was put back about 3 times in 10.

Only `tools/cloud-brain/brain-snapshot.ojs` changed, in that one test cell. One Worker moves:
`brain-x-snapshot`. `cloudflare-iac.ojs` is not changed.

### The cause

`logged(fn)` (`cloudflare-iac.ojs` 1221) answers every object given to `console.log` while `fn`
runs. Its comment says so: "Lines of other tests running at the same time are in the list too, so a
test filters by a name of its own." The test filtered by `at === "snapshot.run"` and expected the
list of `issue` fields to equal `["issue.open 404"]`. Four test cells of the module make a run (`call("run")` or `scheduled`), and
a page computes them at the same time, so a run of another cell that ended inside the window put a
second `snapshot.run` line in the list, with no `issue` field.

### What changed

- The rig with no tracker (`none`) has a first source named `untracked-` and 8 random characters.
  The Worker's log line has `sources: "<name>:<status>:<count> …"`, and of the line's fields
  (`at day items papers sources error issue worker ray`) that is the one a rig sets: `worker` and
  `ray` are the same for every rig.
- The test keeps the `snapshot.run` lines whose `sources` starts with that name and expects their
  `issue` fields to equal `["issue.open 404"]`, as before. It is not `toContain`: the triage
  (event 581) asked that the test read its own line and not be made tolerant of a second.
- Inside the same `logged` window the test's first rig makes a run too, and the test expects a
  `snapshot.run` line that is not its own to be in the list. So the company that failed it by
  chance is there on every run.

Not taken: a fixed name in place of the random one. Two computations of the same cell at once (a
cell computed again while its first run is still going) would then read each other's line.

### Reproduced first

With no browser the defect does not show: `test.ts` runs a module's tests one at a time, and the
deployed module passes there. With the second rig's run added to the window and the assertion as
it was, built in the worktree, `bun test.ts brain-x-snapshot --with <built module>` in
`cloud-brain-dev`, 2026-10-11 12:21 CEST: 8 passed, 1 failed, 1 needs a browser.

```
FAIL test_a_run_that_kept_items_opens_one_task_for_the_days_digest
     - Expected
     + Received
       Array [
     +   undefined,
         "issue.open 404",
       ]
```

That is the message of the issue.

### The rate, before and after

The instrument is the deployer's run address on cb4,
`/#view=C100(S100(@tomlarkworthy/brain-snapshot,@tomlarkworthy/brain-shell))&verify=brain-x-snapshot`,
opened in a new context of a local HeadlessChrome 151.0.7922.34 for each run, reading
`window.__brainVerdict`. Runs are one after another.

| Hash on cb4 | When (CEST) | Runs | Failed | The test named |
|---|---|---|---|---|
| `a20b957dc536`, before | 14:03:45 to 14:05:08 | 40 | 14 | this one, 14 of 14, the message above |
| `45a1464a3573`, after | 14:07:04 to 14:08:25 | 40 | 0 | none |

The deployer's own run at the apply (14:06 CEST, the cluster's browser): `"state":"verified","tests":10`.
With a rate of 14 in 40 unchanged, 40 runs with no failure have a chance of about 3 in 100 million (0.65^40).

### Counts after the change

| Run | Result |
|---|---|
| `bun test.ts brain-x-snapshot --with <built module>`, no browser | 9 passed, 0 failed, 1 needs a browser (`test_the_panel_lists_the_days_and_the_sources_of_one`, `document`) |
| QA tab, Chrome 151 headless, the built notebook of the worktree, each `test_*` cell of the module observed from a side module | 10 of 10, no failure |

### A dead end

A probe of the built notebook as a local file (`#view=C100(S100(@tomlarkworthy/brain-snapshot))`,
the ten test cells observed from a side module, a new page a run) gave no failure in the 6 runs of
the unchanged build that are known to be that build's (2 and 4, 12:21 to 12:23 CEST). It was
stopped: about 15 s a run, the machine slept during it, and two processes had written one log. So
a local file was not shown to reproduce the defect, and the two arms above are two hashes on cb4
and not two files of one checkout. `verifyModule` (`brain-shell.ojs`) needs a page served by a
Brain, so the run address cannot be opened on a file.

### Not tried

- The cluster's browser, Chrome 128, other than through the deployer's own run at the apply.
- The other reads of `logged` in the module. `test_a_run_keeps_one_public_file_…` reads two
  windows with `toContainEqual` and `toContain`, which a second line does not fail; a line of
  another rig that equals the expected one would pass it wrongly. Its rigs were not given names
  of their own.
- The test now makes one more run than before, and so gives the other tests' windows one more
  `snapshot.run` line. No test of the module counts those lines; nothing checks that on a build.
- `Math.random` for the name: 36^8 values, and no check that two rigs differ.
