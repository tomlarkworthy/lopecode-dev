# dv-6-brief-step-8-runs-verify-run

Task 6 of `plan/cloud-brain-deploy-verdict-from-a-shared-page.md`: step 8 of
`.claude/skills/brain-maintenance/agents/implementer.md` has a writer who added or changed a
test run `verify-run.ts <worker> --shell <its build> --times 20`.

## Round 1

Written by the overseer of events 616 to 846 as `852dfaed`; its runs are in the entry
"2026-10-11 15:40 CEST" of `oversight.md` (5 failed of 10 on `lopebooks@07cc2ef2`, 2 of 2 on HEAD).
Submitted for it by the orchestrator (the overseer may not move an issue).

Review 869, changes. The line gave the result as "`failed` is 0 and `byChance` is `[]`". Both
hold when no run gave a verdict: the reviewer's `verify-run.ts brain-deployer --times 1`
answered `runs 1, passed 0, failed 0, none 1, byChance []`, exit 2, and a timed-out run is
counted `none` too. Step 7 names `brain-deployer` as a Worker a writer tests.

## Round 2

Written by the orchestrator at 2026-10-11 16:01:01 CEST, as a quick win: one sentence of a brief.

The result is now `passed` equals `runs` and `byChance` is `[]`. A `none` is not a pass: a
timeout is run again; for a Worker that never gives a verdict (`brain-deployer`) the command
does not apply and the writer runs the snippet in three fresh tabs and says so. Three is what
the writer of `dv-3-deployer-opens-verify-html` did before its last rebase (its report: `[56,[]]`
in 3 tabs), not a measured number.

No command was run by the orchestrator for this round. The counts it rests on are the
reviewer's, in event 869.

## Not tried

- The line followed by a writer: none has started since.
- A worktree's own build as the document (the overseer and the reviewer both used a `lopebooks` commit).
- The cluster's Chrome 128.
