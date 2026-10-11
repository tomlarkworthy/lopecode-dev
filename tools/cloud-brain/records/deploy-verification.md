# Deploy verification: built 2026-10-10, on cb4 since 2026-10-11

Spec: `plan/specs/deploy-verification.html`, approved by Tom 2026-10-10 ("yes approved, please build it").
Built 2026-10-10, the evening to 23:56 CEST, by one Claude session while Tom slept.
Commits in lopecode-dev: `31310a3b` (page and shell), `0a0fd674` (deployer, core, CLI), and the one that adds
this file (review fixes). On 2026-10-10 nothing was deployed. On 2026-10-11 Tom said "you can fix all those things, deploy to cb4";
the section "On cb4" at the end is that morning.

## What changed

| where | change |
|---|---|
| `brain-shell.ojs` | The page joins only the modules its layout names and what they import. `verifyModule` runs one module's `test_` cells and checks the running hash. `brainVerdict` leaves the verdict at `window.__brainVerdict` when the address has `&verify=WORKER`. |
| `cloud-brain.ojs` | The page sends no `deploy.report`. Workers whose module is not loaded are listed as what runs. Keep this version names its Worker. |
| `brain-deployer.ojs` | Every Worker with a version before it goes on probation. `verifyDeploy` runs inside `apply`. A deploy or removal of a Worker on probation is refused. `infra.confirm` takes `{ worker }`; 400 without, 403 for a sign-in link's token. |
| `brain-core.ojs` | `deploy.report` is the deployer's only and puts nothing back. A priced call by the deployer is charged to the owner. |
| `brain.ts` | `confirm <worker>` (exit 1 without a name), `apply --over-unverified`, `remove --over-unverified`. |

The section "A deploy is verified by the deployer" in `brain-deployer.ojs` has the table of outcomes and log lines.

## Where the build differs from the spec

| the spec says | built | why |
|---|---|---|
| R9 is a change to `cloud-brain.ojs` | Mostly `brain-shell.ojs` | The shell in brain-static joins the modules; `@tomlarkworthy/cloud-brain` is one of the modules joined. |
| The run opens `#view=C100(S100(MODULE))` | `#view=C100(S100(MODULE,@tomlarkworthy/brain-shell))&verify=WORKER` | `brainVerdict` is a cell of brain-shell and computes only when brain-shell is in view. |
| The verdict is on `window.__verify` | `window.__brainVerdict` | One name in the page and the deployer. |
| R14: the recovery key deploys over an unverified Worker | The key and `overUnverified: true` in the body | `brain.ts apply` signs every call with the recovery key, so the key alone would make R3 refuse no agent. **Tom has not accepted this.** His answer "yes its allowed" was to the row as first written. |
| nothing on who pays | `accountOf` in the core gives the deployer the owner's account | The core answered 402 `OutOfCredits` to a priced call by the deployer (read in `priced`, brain-core). It holds for every priced method the deployer calls. Today that is `browser.extend` alone: 120 s, $0.003 a run. |
| every Worker is run | Not the kernel (it serves the page of the run), not a Worker with no module | Both stay on probation until `infra.confirm` names them, or are put back at 10 minutes. |

The "As built" cell with this table was defined in the spec page over the pairing channel on 2026-10-10. The
export timed out (the tab was hidden), so it is in the page and not in the file until the tab is brought forward
and saved.

## Measured

Deployer and core: `bun tools/lope-tests.ts lopebooks/notebooks/@tomlarkworthy_cloud-brain.html --filter test_`,
765 tests, 698 pass, 30 fail, 37 skipped. The 30 are the same names that failed before the change (752 tests,
685 pass). The browser is faked in every deployer test.

Page: `shell-check.ts` serves the built shell at cb4's address in a local Chrome with no session and stands the
built modules in for the Brain's (`BUILT='*' ONLY=verify`). Run 2026-10-10 23:43 to 23:53 CEST for every row of
`infra.getModules` but the deployer and the kernel:

```
19 Workers cb4 runs: 19 verdicts ok
  tests 3 to 34 each; load to verdict 1.4 to 2.6 s for 17, 7.0 s brain-x-bluesky, 11.8 s brain-x-browser
  heap 65 to 184 MB (brain-core 184)
18 rows of Workers that were removed (perf, perf2, perf3, the *check and ws* probes, bruser, loop, metrics, scopes, sqlprobe):
  getInfo answers 404 NotFound; 32 s each
```

Those 18 showed a defect: the page called "could not read the running hash" a failed test, which the deployer
would have treated as proof and put the deploy back. Changed: no answer from `getInfo` is `{ none }`, no verdict.
The deployer still serves the source of 18 removed Workers from `infra.getModules`; not changed.

Not measured: anything on cb4. The cluster's browser is Chrome 128; the local one is Chrome for Testing 1234.
Whether the core forwards the deployer's `browser.run` to brain-x-browser is read from source (`callerOf`,
`keeperOf`, the rule `caller.kind in ["worker", "deployer"]`), not run.

## A dead end worth knowing

Nine of the new deployer tests failed with their log lines missing, alone and together. `logged`
(cloudflare-iac) taps `console.log`. Tests in brain-core (`:1224`) and brain-kernel (`:1256`, `:1292`) replace
`console.log` and put back the value they saved; two that overlap put it back out of order, and from then on no
line reaches the tap. Marks written with `console.log` inside the test showed it: `M0` captured, `M1` after the
apply not. The new tests read the deployer's lines from a list of their rig's own (`config.said`, read by `say`).
The cause is not fixed: `logged` is in `cloudflare-iac.ojs`, which the spec lists as ask first, and the kernel is
not the loop's to deploy. This is the fault behind the stopped branch `bm/tests-replace-console-log`.

## Review

One fresh agent (opus, no context), 2026-10-10: BLOCK, 7 findings and 4 minor.

| finding | done |
|---|---|
| `brain.ts apply` did not record a `verified` or `failing` deploy, so the next apply was refused as stale | Fixed. |
| The page did not reload its copy after `verified` | Fixed. |
| R14 differs from the spec and the row is unchanged | Written in the spec page's "As built" cell and above. The row is Tom's to accept. |
| A sign-in link's deploy token could confirm its own deploy | Fixed: 403, tested. `brain-kernel.ojs:46` still says such a token reaches `infra.confirm`; the kernel was not edited. |
| R15's CLI check did not exist | Added `tests/tools/brain-confirm-names-a-worker.test.ts`. |
| Services shows a put-back for failed tests as "failed its health check" | Not changed: `serviceList` is in `cloudflare-iac.ojs`, ask first. |
| Prose left false (5 places) | Fixed in the deployer, the page, the docs module and the knowledge doc. Not the kernel's line. |
| minor: refusal ran before "unchanged" | Fixed, tested. |
| minor: 10 minutes written in three places | Not changed. |
| minor: redistil with apply awaits a run a Worker | True. See the order below. |
| minor: no assertion of R3 for redistil | Not added. |

## On cb4, 2026-10-11

Tom, 07:40: "you can fix all those things, deploy to cb4". Commits `44f9e5d0`, `316af301` and the one that adds
this section. Times are CEST, from `date` around each command and from the logs (`logs.query`, `at` includes
`deploy.`).

Fixed first, from the lists above: the kernel no longer passes `infra.confirm` for a link's token; Services
words a put-back by its reason (`cloudflare-iac.ojs`); `infra.getModules` leaves out removed Workers (40 rows to
22 on cb4); one constant for the 10 minutes; the three tests that replaced `console.log` no longer put it back,
and two of the 30 failing tests pass (`test_a_version_put_back_gets_a_token_that_works`,
`test_one_log_line_a_call_with_these_keys_and_no_secret`). A second fresh review of that change: BLOCK, 2
findings and 1 beside them, all prose, all fixed (`/llms.txt` told a program to POST `{}` to `infra.confirm`).
Tests: 765 run, 28 fail, all in the list from before; `test_reflectsDelete` and `test_reflectsTitleUpdate`
failed in one run of four and `test_verifyModule…` in another (a 2 s limit, now 6 s).

Before deploying, what cb4 ran was compared with each record (`getSource`, `infra.getModules`): every line a
deploy would remove was one this change removed.

```
07:51:03  20 Workers same, lease held
07:51     shell posted; install-deployer 2b9c85734540
07:51:40  apply core   -> verified, 34 tests, 35.2 s   log: deploy.verify 05:52:03Z, deploy.verified 05:52:15Z, ms 14106, otherTestsRan 132
07:52:23  apply page   -> verified, 16 tests, 52.1 s   log: deploy.verify 05:53:06Z, deploy.verified 05:53:14Z, ms 8346, otherTestsRan 132
07:53:24  apply kernel -> probation (no run), 55.8 s; lease.get, quota.get, /, did.json answer; confirm brain
07:59     core again (llms.txt) -> verified, 38.8 s; kernel again -> probation, 12.1 s; confirm brain
```

`redistil` after the deployer changed: 20 lines `same`, so nothing else was deployed again. The estimate above
(every Worker deployed again, several minutes) was wrong: the wrapper did not change.

The live checks, with a scratch Worker `brain-x-verifycheck` made by
`tools/scratch/cloud-brain-experiments/verify-page/mk-verifycheck.ts` and removed after:

```
08:01:05  version 1, first deploy          -> verified, 1 test, 12.8 s
08:01:30  version 2, its test throws       -> put-back to 955c9f1b5370, 22.2 s
            reason: its tests failed: test_verifycheck: version 2 is broken on purpose
            a call 1 s after: {"version":2}; 8 s after: {"version":1}, getInfo 955c9f1b5370
08:02:14  version 3, over the put-back one -> verified, 20.8 s
08:02     the same kernel, forced          -> probation, 8.7 s
          the same kernel, forced again    -> refused, 1.1 s:
            brain is 9856f86908b6 and not verified yet: its tests are running, and it is put back at 06:12:43 if they have not passed. Deploy again after that.
          brain.ts confirm (no name)       -> usage line; confirm brain -> {"confirmed":["brain"]}
```

Found by the live check: removing a Worker left its `kernelstate/` row, so `state` still listed
`brain-x-verifycheck`. Fixed (the removal deletes `kernelstate/NAME` and `confirmed/NAME`, tested), deployer
`eb227bbea8bb` installed 08:05, the scratch Worker deployed and removed once more to clear the row.

Spend: `quota.get` read 0.00705 USD before the kernel and 0.01905 after the checks; each run buys 120 s
(0.003 USD). The deployer's browser stays up until its bought time ends (265 s left at 08:03, no page open).

Seen and not this change's: at 07:50:48, before the new deployer, the mechanism this replaces put
`brain-x-issues` back (`its tests failed: test_issues_panel_keeps_the_caret_in_a_row_box`), from someone's page.

Not done: no run of a Worker whose page gives no verdict on cb4 (`deploy.verify.none`); the brain's own tests
of that are with a faked browser. The 10 minute put-back of an unconfirmed Worker was not waited for. R14's row
in the spec still has its first wording; the "As built" cell beside it has the flag.

The deployer cb4 runs after this record was written is `284fffe3cfc5` (installed 08:08): the same code, with the
measurements above in its own text.
