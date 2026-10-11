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

`tools/cloud-brain/brain-logs.ojs`, and five lines (round 1 wrote six; `git show 98ea3738 --stat -- knowledge/` reads 5 insertions) of
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

### What the first deploy showed, and the second

`brain-x-logs` `c24253ddb4cc` was applied at 11:31 CEST (`deploy.verified`, 6 tests, the apply
21 s). Read with `--owner`, `logs.deploys` over 05:45 to 09:12 UTC of 2026-10-11, one query:

```
deploy.verify 42, deploy.verified 35, deploy.failed 7, deploy.put-back 8,
deploy.probation 43, deploy.uploaded 47, deploy.confirmed 36          (262 lines of 13 kinds)
```

These seven are the counts event 445 took from Cloudflare's own grouped calculation over the
same span. **Held** for that span: the method answers it whole. Seven days to 09:12 UTC: 1307
lines in 5 queries, 13 s; the default day: 2 s.

The same answer showed a gap. The issue's own case, the caret test of event 393, had no line in
`tests`: brain-x-issues read `runs 3, failed 0, putBack 1`.

```
05:50:48 deploy.put-back brain-x-issues 62d63c57 its tests failed: test_issues_panel_keeps_the_caret_in_a_row_box: expect(received)…
```

No `deploy.failed` and no `deploy.verify` of that hash is before it. That put-back was made on a
verdict a page sent, three minutes before the deployer's own run was on cb4 (07:51 CEST,
`brain-deployer.ojs`). The other seven put-backs on a test each follow a `deploy.failed` line.

So `deployRuns` was changed, and `brain-x-logs` deployed a second time: a put-back whose reason
starts `its tests failed:` and that has no `deploy.failed` line of its Worker and hash before
it is a failed run, with the first test the reason names. A reason is cut at 200 characters and
a message can hold `; `, so a second name is not read from it. A failed line and its put-back
are one run: three fails of brain-x-container at one hash with three put-backs are three runs.
Whether the deployer of today can still put back on a page's verdict was not read; the lines of
05:50 are in Cloudflare until 2026-10-18 either way.

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
- `test_deploy_runs_counts_by_worker_hash_and_failed_test`: the caret case as cb4 has it (a
  put-back with no failed line), a hash that failed and passed, a failed line with its put-back
  twice at one hash, a Worker with no verdict.

The counts above are of the first build. The second build, with the put-back rule: 6 passed, 0
failed in `test.ts`; 6 of 6 in a QA tab. The changed test was not run against the first build;
what it guards was seen on cb4, above.

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

## Round 2, 2026-10-11: a member's DID and text do not leave, and `runs` says from when it is whole

The review (event 534, verdict changes) found three things. The tests and the deploy of round 1
stood: 6 of 6, and what ran was what was committed. The seed commit of this round is dated
2026-10-11 11:54:06 +0200.

### Three sentences of round 1 that were false

- This file, "Three choices": "Both are about the deploy and neither is what a caller of a method
  sent." `reason` of `deploy.reason` is the `reason` a caller sent to `infra.apply`,
  `member.deploy` or `member.remove`, and `by` is who sent it.
- `brain-logs.ojs`, "Who can call": "The deploy lines hold what the deployer wrote about a Worker
  and nothing a caller of a method sent". The same sentence was the comment on the method's rule.
- `brain-logs.ojs`, the table of lines: "`reason` and `last` can hold Cloudflare's text or a
  health check's answer about the code deployed, not what a caller of a method sent".

What the deployer writes, read this round (`tools/cloud-brain/brain-deployer.ojs`):

```
580   const because = (reason, by, targets) => say({ at: "deploy.reason", reason, by, targets: … });
1087  because(reasonOf(request.reason), author, [String(request.module || request.name || "?")]);     member.deploy
1181  because(reasonOf(request.reason), author, ["remove " + logical]);                               member.remove
1171  say({ at: "deploy.put-back", target: logical, hash, previous: …, reason });                     member.deploy, reason = the error's message
170   say({ at: "deploy.unhealthy", target: logical, hash, version: …, last: lastHealth });
```

`author` is the member's DID (`memberDeploy` refuses one that does not start `did:`). Event 517
of round 1 has "whether a member deploy writes the member DID in `by` was not read". It was in
the file the lines come from.

The two sentences of the seed are rewritten. "Who can call" keeps a line saying what its first
text claimed and that it was false. The sentence of this file stands above as written, with this
section against it.

### Finding 1: what leaves of a member's line

The review left a choice: say that a token reads a member's DID and reason, or leave them out.
Event 540 chose the second by line 1 of `philosophy.md`, the side that narrows, and named `by`
and `reason`. Built in a cell of its own, `deployLine`, which `deployLines` calls on each line
before it is kept, so `lines`, `workers` and `tests` are all made from what leaves.

| Line | Kept |
|---|---|
| `deploy.reason` whose `by` is not `owner`, `recovery key` or `token:NAME` | `at`, `by: "member"`, the `targets` of the shape `remove brain-m-ID-NAME`, `t` |
| a line whose `target` starts `brain-m-` | `at target hash version previous first t` |

Both keep `deployer worker ray`, which the `log` cell adds to every line.

Three things here go past the two fields event 540 named. Each is the narrowing side of line 1,
and each is this writer's choice:

- **`targets` of a member's deploy is left out.** It is `request.module || request.name`: text
  the member sent, 80 characters of it. The target of a removal is `"remove " + logical`, a name
  the deployer made after finding the Worker's row, and stays. The other way was to keep
  `targets` whole, since event 540 says "the Worker stays"; the Worker is still named, by the
  `deploy.deployed` line that follows.
- **A line of a member's Worker keeps a list of fields, not everything but two.** The put-back
  of a member's deploy has the error's message as `reason`, and `deploy.unhealthy` has the
  health check's answer as `last` ("threw …", 120 characters): both can quote the member's code.
  A list also holds for a field the deployer adds later. Cost: a fixer of a member's service
  reads that it was put back and not why. Event 540 keeps "failed test names" of a member's
  service; a member's deploy runs no tests (`memberDeploy` does not call `verifyDeploy`), so
  there are none to keep or drop today, and `failed` is not in the list.
- **A `deploy.reason` is a member's unless `by` is one of three.** The other way was `by`
  starting `did:`. With the list, a fourth kind of `by` added to the deployer leaves as
  `"member"` until this cell is changed, which is wrong in name and leaks nothing.

`by` of the owner's deploys stays as round 1 left it: `recovery key`, `owner`, or `token:NAME`,
a token's name and not its value.

### Finding 2: from when `runs` is whole

Read on 2026-10-11 at 11:51:36 CEST with the token (`brain.ts curl
"/xrpc/com.lopecode.brain.logs.deploys?from=…&to=…" --as loop-deploys`), the 7 days before:

```
1325 lines, 3 queries
deploy.verify    45   first 10-11 05:52:03 UTC  brain-core     (t = 1791697923049)
deploy.verified  38   first 10-11 05:52:15 UTC  brain-core
deploy.failed     7   first 10-11 06:01:50 UTC  brain-x-verifycheck
put-backs "its tests failed: …" before the first deploy.verify: 9
  brain-x-browser 10-09 07:46:12, 08:16:01, 08:32:00, 09:01:40; 10-10 08:50:41, 10:24:12
  brain 10-10 08:41:56;  brain-x-issues 10-10 17:32:38, 10-11 05:50:48
deploy.confirmed before it: 111
brain            runs 1, verified 0, failed 1
brain-x-browser  runs 7, verified 1, failed 6
```

Before 05:52:03 UTC a page ran the tests. Its failed verdict is a put-back in the lines, which
round 1's rule counts as a failed run; its pass wrote no line. So the passes of that time are
missing from `runs`. The review wrote 05:51 UTC and the knowledge doc has "07:51 CEST"; the cell has the time of
the first line.

The cell now says this under "What is counted", with the time, the two rows above, the dates
until which the default day (2026-10-12 05:52 UTC) and a 7-day span (2026-10-18) reach before
it, and the `from` to give. The knowledge doc has one clause.

Not built: the review's other way, a field of its own for a page's put-backs, outside `runs`.
Event 540 chose the sentence. The answer therefore does not mark a span that reaches before the
time, and a caller who gives no `from` before 2026-10-12 05:52 UTC gets the high rate with
nothing in the answer saying so.

### Finding 3

- The `fails` row of the table now names the put-back with no failed line.
- "six lines" of the knowledge doc was five; corrected above, in place.
- "No token was made" and "the read with a token was not run on cb4" (round 1, "Not tried")
  were so when written, at the seed commit of 11:28:56. The token `loop-deploys` was made at
  11:41:29 CEST by the orchestrating session with the owner's session, on his word (event 518).
  Neither writer made it. The read with it was run by that session (event 518), by the reviewer
  (event 534) and for the table above. That the kernel refuses `loop-deploys` the other methods
  was run by the reviewer: `logs.query`, `logs.keys` and `quota.get` each 403.

### Tests

One test added, `test_deploys_leaves_out_who_a_member_is_and_what_they_sent`; 7 in the module.

Before the fix, with the test in the seed and `deployLine` as round 1 behaved (`{ ...s, t }`),
`bun test.ts brain-x-logs --with …` in the worktree's `cloud-brain-dev/`: 6 passed, 1 failed.

```
FAIL test_deploys_leaves_out_who_a_member_is_and_what_they_sent
     Expected value not to match: /did:|alice|clinic|password|closed|does not write/
     Received: "{…\"lines\":[{\"at\":\"deploy.reason\",\"reason\":\"the list of my clinic\",\"by\":\"did:plc:alicemember\",\"targets\":[\"@alice/clinic-todo\"],…
```

A first run of it failed on `deployLine is not defined`, which is not the reviewed reason; the
stand-in was added to see this one.

After: `test.ts` 7 passed, 0 failed, 0 needing a browser. In a QA tab (session `impl-vrnk-2`) on
the notebook built in the worktree, each `test_*` cell forced from a module of its own: 7 of 7,
no failure. The rebase of 11:54 brought in `oversight.md` and `seen.json` and no seed, so
neither run was made again.

The fixture: a member's `deploy.reason` three times (two deploys, one removal), and three lines
of the member's Worker: `deploy.deployed`, a put-back whose reason starts `its tests failed:`
and quotes code, and `deploy.unhealthy` with a `last` and a field the deployer does not write.
With round 1's code that put-back was counted a failed run of the member's Worker, and the test
name in its reason was a line of `tests`. Four lines of the owner's (`recovery key`,
`token:NAME`, `owner`, a put-back on a test) come through as written.

### Not tried

- No member has deployed on cb4: in the 1325 lines no `by` starts `did:` and no `target` starts
  `brain-m-`. The redaction is shown by the fixture and by no line of cb4. No member deploy was
  made to see one.
- That `by` of a member's line is always a DID was read from `memberDeploy`, not from a line.
- The lines of `token.…` (`token.mint`, `token.roll`) are not in the answer and were not read
  for what they hold.
- `ray` of a member's line stays. It is the id of the member's call; with `logs.query`, which
  this token is refused, it finds the core's line of that call.
- A field for a page's put-backs (above).
