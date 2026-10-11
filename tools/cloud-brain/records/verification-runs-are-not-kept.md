# verification-runs-are-not-kept

## Round 1, 2026-10-11: `logs.deploys`, the deployer's lines about deploys with the test runs counted

The issue (event 412) asked for each verdict of a post-deploy test run kept where a token of the
loop can count it, and one read that gives runs and fails by test over a span. A first writer
stopped (event 445): the verdicts are all in the logs, and `logs.query` answers the owner's own
session and no token. The owner, 2026-10-11 (`cloud-brain-dev/philosophy.md`, Clarifications):
"We should allow deployment log access for things that deploy and fix things because it is vital
information". Event 459 reads that as a method of `brain-x-logs` that answers the deploy lines
only, and a token that names it. This round built the method. The seed commit is dated
2026-10-11 11:28:56 +0200.

### What changed

`tools/cloud-brain/brain-logs.ojs`, and six lines of
`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` ("Why did that happen: the logs").

- `com.lopecode.brain.logs.deploys`, a query: `?from=MS&to=MS`, the last 24 hours with neither,
  7 days at most. Rule `caller.id == "owner"`.
- `deployLines`: the telemetry query with a filter of the service's own (the deployer's script,
  `at` starting `deploy.`), halved until each window is whole.
- `deployRuns`: the counts by Worker, hash and failed test.
- The first `md` cell has the answer's shape, what each count means and who can call.

No change to the deployer, the kernel or the core. No retry before a put-back.

### Three choices, and what decided each

**The rule is `caller.id == "owner"`, not the default.** A method with no `allow` gets
`caller.trusted`, which is the owner, a token or a granted account (`callerOf`,
`cloudflare-iac.ojs`). A token's call arrives as the owner with no tab: every event this loop
writes carries `"caller":"owner","via":"delegation:…","holder":"secret:…","tab":false`. So
`caller.id == "owner"` takes the owner and a token of the owner that names the method, and
refuses a member. `caller.kind == "token"` would not work: that kind is the id `token:NAME`,
which a delegation's call does not have. Held by
`test_logs_declares_one_cloudflare_permission_and_the_owners_session`: of the owner in a tab, a
token of the owner, a member, a Worker and a stranger, `logs.deploys` takes the first two and
`logs.query` the first.

**A line leaves as the deployer wrote it, with Cloudflare's time, and nothing else.** Cloudflare
answers each line with the URL and path of the call it was written in (`$workers.event.request`)
and its ids (`$metadata`). Those are left out. The filter is sent to Cloudflare and checked again
on each line of the answer, so a line of another script or with another `at` does not leave if
Cloudflare answers one. Two fields hold text somebody gave: `reason` of `deploy.reason` is the
`--reason=` of whoever deployed, and `reason` of a put-back quotes a failed test's message. Both
are about the deploy and neither is what a caller of a method sent. `run` of `deploy.verify` is
the page address the tests ran at; it holds the module and the Worker's name
(`verifyDeploy`, `brain-deployer.ojs`).

**The counts are in the method's answer, not in a local tool.** One call with a token is then
the whole read. The other way was `tools/cloud-brain/test-runs.ts` over the lines; it would be a
second place to keep in step.

### Whether a span comes back whole

Event 445 found a wide `events` query sampled: 5 `deploy.verified` lines for 2 days with
`abr_level: 10`. Measured again on 2026-10-11, between the start (event 465) and the seed commit of 11:28:56, with
the body the method sends (`logs.query?worker=brain-deployer`, `--owner`, `limit: 2000`):

```
  6 h: abr_level  1, 268 lines
 12 h: abr_level  1, 274 lines
 24 h: abr_level  1, 505 lines
 48 h: abr_level  1, 854 lines
168 h: abr_level 10, 146 lines
```

So 2 days was whole here, and 7 days was not; the 2 days of event 445 had no script filter and
were sampled. Where the line falls is Cloudflare's and is not documented in what was read, so
the method does not assume one. It asks for the span and asks again for the two halves of any
window whose answer has `abr_level` other than 1, or 2000 lines. `abr_level` is at
`result.run.statistics.abr_level` (event 445 wrote `result.statistics`). An answer with no
`abr_level` counts as not whole.

Not whole after halving to a minute, or more than 200 queries: the answer is 502 with no lines.
A short answer would give a fail rate from a sample with nothing saying so.

### What the counts are, and are not

The reading of the literature is event 445's and was not repeated: a flaky test is one seen to
pass and to fail with no change of the code under test (Parry et al., "A Survey of Flaky Tests",
TOSEM 2021; Bell et al., "DeFlaker", ICSE 2018).

- `fails / runs` of a test is a fail rate. A fail at a new hash may be the defect the run is
  there to catch.
- `runs` of a test is the runs of its Worker. `deploy.verified` holds a count of tests and no
  names, so a test added part way through a span is given runs it was not in.
- `passedOnSameHash` is the one count that is evidence of a flake. The deployer puts a failed
  version back at once, so a hash is run twice only when it is deployed again.
- `passedLater` (a fail, then a pass of the Worker at another hash) is a fix or a flake. The
  caret test of event 393 is this kind.
- Not in the lines at all: the browser, the names of the tests that passed, a message past the
  200 characters of the put-back's `reason`. Cloudflare keeps 7 days. Keeping each verdict as a
  row, with names, is a change of the deployer and of `brain-shell` (`verifyModule` returns
  `failed` and a count) and is not built.

### Tests

Written first and run against what cb4 ran (`bun test.ts brain-x-logs --with …`, the worktree's
`cloud-brain-dev/`): 2 passed, 4 failed, each for the reason expected (`logs.deploys` answered
404; `deployLines is not defined`; `deployRuns is not defined`; three rules where four were
expected). After the change: 6 passed, 0 failed, 0 needing a browser. In a QA tab on the built
notebook, each `test_*` cell forced from a module of its own: 6 of 6, no failure. Before the
change the module had 3 tests.

- `test_deploys_answers_the_deployers_lines_of_a_span_whole`: the body sent, the halving of a
  sampled span (24 h in 7 queries where 6 h is whole), each line once and oldest first, what is
  left out, the counts, the default span, five refused spans, Cloudflare's 429 as a 502.
- `test_deploy_lines_halves_a_window_until_it_is_whole`: a window at its limit is halved; a
  crowded minute and a span past the bound of queries are errors.
- `test_deploy_runs_counts_by_worker_hash_and_failed_test`: the caret case, a hash that failed
  and passed, a Worker with no verdict.

### Not tried

- No token was made. `brain.ts token loop-deploys logs.deploys` is a call with the owner's
  session, and the brief stops a writer at a new secret. Until it is run, the method answers the
  owner's session and nobody else: the deploy changes no caller's access by itself. So the read
  with a token was not run on cb4; the rule was tested with `decide` in the seed.
- That the kernel refuses `loop-deploys` the other three methods was not run (it refused
  `issues-implementer-2` `logs.query` in event 445).
- Two halves are asked at once. With the account's limit of 1200 requests in 5 minutes and a
  bound of 200 queries a call, six 7-day calls in 5 minutes could reach it. Not measured.
- The fake Cloudflare of the tests samples by the length of a window. What Cloudflare samples by
  is not known; only the five measurements above.
- The time a 7-day call takes on cb4 is in the issue's comment, read after the deploy, not here.
