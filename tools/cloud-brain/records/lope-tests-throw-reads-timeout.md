# lope-tests-throw-reads-timeout

The first round (`lopecode-dev@bfd9ae46`, 2026-10-10 19:25 CEST) is recorded in `spec-as-built.md`,
"`lope-tests.ts` prints a test cell that threw as failed, with its message", written before
records had a file each. This file starts at the second round.

## Round 2, 2026-10-10: a test cell defined twice

The review (event 211) found one defect, in `runTests` of `tools/lope-runtime.js`: two variables
of one module with the same `test_*` name read as one `timeout` with no message, after the whole
timer. Before `bfd9ae46` the pair read `failed`, "<name> is defined more than once".

Reproduced before the change, with the pair added to `tests/notebooks/throw-is-a-failure.test.js`
and `lope-runtime.js` as it was at `bfd9ae46`:

```
actual:   [ [ 'test_zw_dup', 'timeout', undefined ] ]
expected: [ [ 'test_zw_dup', 'failed', 'test_zw_dup is defined more than once' ] ]
```

Cause, as the reviewer read it and as the code shows: `failed` and `fulfilled` began with
`if (results.has(fullName)) return;`, and both variables have the same `fullName`. The first
rejection wrote the failure. The second returned before `clearTimeout` and `resolve`, so its timer
ran out and wrote `timeout` over the failure.

Change, 12 lines in `runTests`:

- Each variable has its own `settled` flag. `failed`, `fulfilled` and the timer set it and do
  nothing when it is already set.
- The timer writes `timeout` only when the name has no result yet.

The pair is still one entry of `tests`, as before `bfd9ae46`: `results` is keyed by
`module#name`. One entry for each variable would have changed `summary.total` for callers; the
review did not ask for it.

`tools/lope-tests.ts` is not changed. Its guard was already one for each cell.

### Tests

- `node --experimental-vm-modules --test tests/notebooks/throw-is-a-failure.test.js`: fails with
  the output above before the change, 1 of 1 after. The new assertions: the pair reads `failed`
  with the message, in under 3 s of a 4 s timer.
- `ex.runTests(10000)` on `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html` at lopebooks
  `ddb6cd94`, non-passing cells compared by name, two runs with the change and two without:

  ```
  with     665 passed, 25 failed, 9 timeout, 37 skipped, 736   (both runs)
  without  665 passed, 25 failed, 9 timeout, 37 skipped, 736
  without  666 passed, 25 failed, 8 timeout, 37 skipped, 736
  ```

  The first three lists are the same. The cell that differs in the fourth is
  `brain-deployer#test_a_change_names_the_hash_it_saw_and_one_change_to_a_worker_runs_at_a_time`,
  which timed out in one run of the unchanged file and passed in the other. A run made before
  these four, with the change, read 667 passed, 23 failed, 9 timeout; its names were not kept. So the counts of this
  notebook under the headless harness move by one or two cells between runs, with or without
  the change.
- `bun tools/lope-tests.ts` on the same file: 667 passed, 24 failed, 8 timed out, 37 skipped, 736
  total. 736 and not the 735 of round 1: `panel-for-your-attention` added a test.
- The whole suite, `node --experimental-vm-modules --test tests/notebooks/*.test.js`: the count on
  the commit that landed is in the issue's comment. In the worktree 8 fail, not 2: six stop with
  ENOENT on a file that is in the main checkout and not in git, so not in a worktree
  (`exporter.test.js`: `notebooks/@tomlarkworthy_jumpgate/modules/@tomlarkworthy/exporter-2.js`;
  `mermaid-lens.test.js`: `tools/scratch/mermaid-lens/fixtures.mjs`; four of `svg-lens.test.js`:
  `modules/@tomlarkworthy/svg-lens.js`).

### Not tried

- A duplicate pair through `tools/lope-tests.ts`. No notebook on disk has one (the reviewer
  counted 735 distinct names of 735 in cloud-brain).
- A pair where one definition is in another module: those have different `fullName`s and are not
  duplicates to the runtime.
- `tools/bulk-smoke-test.js` and the channel's `run_tests`, as in round 1.
- A browser. Nothing in a notebook changed.
