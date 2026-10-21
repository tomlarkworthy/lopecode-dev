# redesign-deploys-topic

## 2026-10-21: the deployer appends its deploy lines to the topic `deploys`

Step 5 of `plan/cloud-brain-agentic-redesign.md` §7 (§6, "The one change to the owner's four"; §3.4, "Deploys reach
the issue through a topic"). Nothing here was deployed, created or subscribed: each act below is the owner's, with
his session or his recovery key. Built in the worktree `bm-redesign-deployer`, its clone of `cloud-brain-dev` on the
branch `redesign-deployer` (`fd89a4a` base, `4211023` the change, not pushed).

### What changed

Two patches, beside this file, made with `git diff base` in that clone after `bun sync.ts` of cb4:

```
redesign-deploys-topic-deployer.patch  197 lines  sha256 b208af7f1eef…  brain-deployer e0b142be88a9 -> 8488d4d05ca5 (emit-deployer.ts)
redesign-deploys-topic-topic.patch      42 lines  sha256 37e3fd226e58…  brain-x-topic  fb29475aecab
```

- **brain-deployer.** `say` also hands the line to `toTopic`: a `deploy.*` line with a string `target` and `hash`,
  other than `deploy.topic.failed`, is sent as `topic.append { topic: config.deploysTopic ?? "deploys", key: id, body }`
  through the core (`viaCore`, as `issue.open` is). `body` is the line as logged, with `deployer`, `said` (ms) and
  `id`, 40 random hex digits, which is the key and what `issue.receive` keys its events on (it reads `line.ray`, then
  `line.id`, then the entry's key). A refused or thrown append is one line `deploy.topic.failed` with `kind`, `topic`
  and `reason`; with no core row nothing is sent. `deployerFn` and the cron's `scheduled` end after the appends
  they caused have answered (`appended`), so a line said just before an answer is not cut off.
- **brain-x-topic.** `topicRule` is `caller.kind in ["owner", "token", "did", "worker", "deployer"]`. Without it the
  core refuses every append: `callerOf` names the deployer's kind `deployer` (`cloudflare-iac.js:1650`), and the
  topic's own test asserted the deployer was not let in (`test_topic_declares_what_it_needs`). The tracker lists
  `deployer` in its rules for the same reason (`brain-issues.js:359`). A deployer still creates no topic (`owns`).

### Tests

`bun test.ts` in the clone, 2026-10-21:

```
brain-deployer  before  71 passed, 0 failed      after  73 passed, 0 failed   (3 runs)
cloudflare-iac          26 passed, 3 need a browser      26 passed, 3 need a browser
brain-x-topic   before  18 passed, 0 failed      after  18 passed, 0 failed
```

- `test_deployer_appends_each_deploy_line_to_the_topic`: a pass, a fail, a run with no verdict, a confirm and a dry
  run; every line with a Worker and a hash is appended once and no other (`deploy.reason` is not), each of
  `verified`, `failed`, `put-back`, `verify.none`, `confirmed`, `dry.tests` among them; 17 appended, 3 not; the keys
  are distinct. `waiting` and `approved` were not driven by it.
- `test_deployer_a_topic_that_fails_does_not_fail_the_deploy`: the topic answering 500 and then throwing, the apply
  is `verified` both times, one `deploy.topic.failed` for each append tried (5); `deploysTopic: "builds"` and `""`.
- Two dry-run tests now leave `topic.append` out of the list of core calls they compare.
- `test_topic_rules_decide_who_appends_and_who_reads` has the deployer appending to `deploys` with sender
  `deployer`, and refused `topic.create`.

A dead end: the key was first the SHA-256 of `[at, target, hash, said]`. The test passed once and failed on its second run with
14 keys for 17 lines: `probation` and `verify` of two deploys of one hash said in the same millisecond. A hash of
the line's fields is not one line's, so the key is random and the body carries it.

### What the owner runs, in this order

From a clone of `cloud-brain-dev` with `bun sync.ts https://cb4.endpointservices.workers.dev` just run, under the
lock `cb4`. `P=../tools/cloud-brain/records`. The calls are `brain.ts curl … --owner -X POST -H 'content-type:
application/json' -d '…'` of the main checkout, or the page.

1. The tracker's `issue.receive` (worktree `bm-redesign-tracker`, `171a0b2`; step 1 of §7) deployed. A push before
   it answers 404 and is given up at once and counted in `dropped`.
2. `bun apply.ts --patch $P/redesign-deploys-topic-topic.patch --dry`, then the same with `--reason="the deployer appends its deploy lines to a topic"`.
3. `topic.create { "topic": "deploys", "write": "caller.kind == \"deployer\"", "read": "caller.id == \"owner\"" }`
4. `delegation.create { "name": "deploys-push", "holder": { "worker": "brain-x-topic" }, "scope": ["com.lopecode.brain.issue.receive", "com.lopecode.brain.quota.get"], "note": "brain-topic pushes the deployer's lines to issue.receive" }` → `{ id }`
5. `topic.subscribe { "topic": "deploys", "name": "tracker", "target": "issue.receive", "delegation": "<id>" }`
6. `bun deploy-deployer.ts --patch $P/redesign-deploys-topic-deployer.patch --dry` (tests, the hash it would upload
   and `rebuilds`), then without `--dry`; `bun brain.ts confirm brain-deployer` if probation shows. The tool takes no
   `--reason`. Before 3, every deploy line would be a `deploy.topic.failed` (no such topic); harmless, and noisy.

The check: one deploy of any service whose issue waits with the note `deploy:<worker>@<hash12>`, then
`topic.read?topic=deploys` shows its lines, `topic.subs?topic=deploys` shows `position` moved and `dropped` 0, and
`issue.get?id=<issue>` has a comment with the ref `deployed:<worker>@<hash>` and, on `confirmed` or `put-back`,
`needs-worker`. Not run: nothing is deployed.

### Where the plan and the code differ

- §6 names `key: <ray>`. The line `say` writes has no ray: `log` adds it at the write (`cloudflare-iac.js:622`), the
  tick's lines (`confirmed`, a probation's `put-back`) have none, and one apply writes `reason`, `uploaded`,
  `deployed`, `probation`, `verify` and `verified` under one ray.
- §6, "each `deploy.*` line": only those with a `target` and a `hash` go. `issue.receive` answers 400 to a line with
  neither, and a 400 is given up and counted in `dropped`.
- §6, "under a delegation for `brain-x-topic` as `topic.subscribe` asks": the deployer needs none and declares no
  `calls` (the core does not check the deployer's calls, `brain-core.js:126`). The delegation is the subscriber's,
  step 4, made in the owner's session: a Worker cannot make one (`brain-loop.js:231`). This answers §10's second item
  for this topic; it is read from the code and the loop's panel (`brain-loop.js:1390`), not run.
- The brief's read rule "the tracker and the owner": the tracker reads nothing; the push reaches it as the owner.
- The plan names no change to `brain-x-topic`; without step 2 every append is 403.
- `config.deploysTopic` is no setting: `config.get?worker=brain-deployer` answered 404 "no Worker brain-deployer
  takes settings" (2026-10-21), and the deployer's config is `BRAIN_CONFIG`, bound at upload. Off means a deploy.
- The deployer's seed was retired at `d0508ae1` (2026-10-18); the change is a patch of what cb4 runs.
- `tools/cloud-brain/waiting-deploys.ts` does not say the deployer waits. Run in the worktree after the commit it
  compared the clone's `deploy/` with cb4 and printed
  `brain-deployer: differs. 9 differences (~deployer_service ~deployerOps ~deployerFn ~fakeCloudflare +test_deployer_appends_each_deploy_line_to_the_topic …). deploy/ is not what cb4 runs (e0b142be88a9): bun sync.ts in cloud-brain-dev`;
  run before the edit it printed `brain-deployer: same`. A sync puts `deploy/` back to what runs, and the patch is
  then in no place the tool reads. The owner's list is `cloud-brain-dev/waiting-deploys.ts` (issues labelled
  `owner-deploy`), and no issue carries this patch.
