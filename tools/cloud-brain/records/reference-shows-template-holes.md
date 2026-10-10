# reference-shows-template-holes

Issue opened by the orchestrator (event 343, 2026-10-10 23:30 CEST). The tracker's reference,
`getSource?worker=brain-x-issues&part=reference`, which `/llms.txt` sends an agent to, printed a
template hole wherever a prose cell of `brain-issues.ojs` interpolated a value:

```
`kind` is one the policy names (${Object.keys(issuesDefaultPolicy.kinds).map((k) => "`" + k + "`").join(", ")} in the default)
`verdict`: ${issuesLimits.verdicts.map((k) => "`" + k + "`").join(", ")}.
```

Cause: `referenceOf` (`cloudflare-iac.ojs`) takes the text of each `md` template from the module's
source and undoes the escapes. It has the source only and evaluates nothing.

## What changed (round 1, 2026-10-10)

In `brain-issues.ojs` only. Each of the 9 holes is replaced by the value it printed on the page:

| was | now |
|---|---|
| `${issuesStore("ADDRESS").name}` | `brain_issues ADDRESS` |
| the kinds of `issuesDefaultPolicy` | `bug`, `task`, `feedback`, `security` |
| `issuesLimits.verdicts` | `pass`, `changes`, `block` |
| `issuesLimits.reason` | 2000 |
| `issuesLimits.syncPage` | 200 |
| `issuesLimits.syncMs` | 5000 |
| `issuesLimits.rebuildRounds + 1` | 6 |
| `${issuesExampleText}` | the 26 lines it makes, with each `\` written `\\` |
| the states of the `task` workflow | open → triaged → … → reverted, 9 states |

The values were read from the built module's cells with `tools/notebook-import.ts`, not typed.

`issuesStore` now takes its key from a new cell, `issuesStoreName(brain)`. The compiled
`issuesStore` has `localStorage` as an input, so a test that reads it is counted `needsBrowser`
by `test.ts` (`skip … (localStorage is not defined)`, seen on the first run of the new test).

The other way was to fill the holes in `referenceOf`. Triage (event 346) did not take it: it
cannot evaluate a cell, and `cloudflare-iac` is under the deployer's hash, which the loop does not
deploy. The cost of the way taken is prose that repeats a value. The test below holds it.

## Test

`test_issues_reference_states_each_value_and_has_no_hole`, new, in the same module. It asks a
simulated Worker for `getSource?part=reference`, counts `${` in the answer, and expects the answer
to contain each of the 9 values as made from the cells (`issuesLimits`, `issuesDefaultPolicy`,
`issuesExampleText`, `issuesStoreName`). A limit changed without its sentence fails it.

`bun test.ts brain-x-issues` in the worktree's `cloud-brain-dev/`:

```
deployed (15d722ba45e4)             passed 11  failed 0  needsBrowser 8
the test alone, prose unchanged     passed 11  failed 1  needsBrowser 8   Expected: 0  Received: 9
with the prose changed              passed 12  failed 0  needsBrowser 8
```

In a headless QA tab on the worktree's built notebook, the 20 `test_*` cells of the module
together, with the brief's snippet: `[20,[]]`.

## Not tried

- `brain-x-git` has 5 holes (the issue's first comment). Triage keeps that for an issue of its own,
  `git-reference-shows-template-holes`. The other Workers were not counted.
- No check, in `cloudflare-iac` or in `build.ts`, that refuses a hole in a prose cell of any seed.
  A new hole in another seed is printed as before.
- The rendered page was not compared before and after by eye. The test reads the reference text;
  that the markdown of the example policy draws as it did rests on `\\"` in a template being `\"`.
- The owner's page (`verifyService`) was not opened: `rules.md` forbids the cluster's browser.
