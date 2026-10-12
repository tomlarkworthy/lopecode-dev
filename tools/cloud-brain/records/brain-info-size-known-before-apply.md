# brain-info-size-known-before-apply

2026-10-13. Two local tools changed and one added, with a test file. No seed, no deploy.

## What was wrong

The deployer binds one JSON variable to each Worker it deploys, `BRAIN_INFO`
(`tools/cloud-brain/brain-deployer.ojs`, the last binding of `bindingsOf`): the Worker's name, hash, the list
of its methods and the rule of each. Cloudflare refuses a version whose variable is too large. The feedback
issue `seen-brain-info-binding-at-its-limit` (event 5300) has the refusal the writer of
`tr-1-wait-in-the-record` met at 2026-10-13 00:03:05 CEST, under both locks:

```
"state":"put-back" … 400 [{"code":10054,"message":"Text binding 'BRAIN_INFO' is too large, its size of 5.3 kB exceeds the limit of 5.1 kB. Please use a smaller value and try again."}]
```

That apply was not seen by this writer; the line is read from that writer's record in its worktree
(`bm-tracker-trigger-rules`, not on `origin/main` when this was written). Nothing computed the size before
the apply: not `build.ts`, not the emit, not `brain.ts apply`.

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/brain-info-size.ts` (new) | `boundInfo(record)`: the object the deployer binds, from a record's `meta` and `hash`. `infoSize`: its bytes as JSON. `infoRefusal`: the sentence a record over `LIMIT` (5100) is refused with, or null. As a command: `FILE…` prints a line a record, `--live` a line for each Worker a Brain runs. Exit 1 when one is over |
| `tools/cloud-brain/tab-tests.ts` | `--emit` writes no file for a record `infoRefusal` names. The sentence goes in `notEmitted`, whole, and the run is exit 2 as for any emit not written. The loop over the `--emit` arguments is now a function, `emitAll`, so that a test enters it |
| `tools/cloud-brain/brain.ts` | `apply` does not send such a record: `FILE not sent: …`, exit 1. The check is made for every file before `infra.getState` is asked, and with only such files nothing is asked of the deployer. `--force` and `--over-unverified` do not pass it. `brain-info-size.ts` is imported inside `apply`, so the other commands still run from `brain.ts` alone |
| `tests/tools/brain-info-size.test.ts` (new) | 7 tests, below |
| `tests/tools/brain-seen.test.ts` | its rig copies `brain-info-size.ts` beside the copy of `brain.ts` it runs |
| `knowledge/changing-and-deploying-a-cloud-brain-worker.md` | the line of `tab-tests.ts --emit` and the row of `apply` say the refusal |

The emit is the refusal before the locks: step 9 of the implementer's brief emits with no lock held, and step
10 applies under both. `build.ts` cannot refuse: it writes the notebook from the seeds' text, and a
service's `meta` is made when its cell runs in a page (`emit` in `cloudflare-iac.ojs`).

The sentence, from the command a writer runs. The state directory held this one file and no key, so that
nothing could be sent had the check not fired; the record is the tracker's of 2026-10-13 00:09 with two
methods added by a script:

```
$ BRAIN_STATE_DIR=<scratch> BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts apply over.json --reason="…"
over.json not sent: BRAIN_INFO of brain-x-issues would be 5288 bytes, 188 over the limit of 5100 (31 methods): Cloudflare refuses a variable over 5 KB and the apply would answer put-back. Shorten what the service declares (a method's rule, a path) and emit again; tools/cloud-brain/brain-info-size.ts FILE prints the size
exit=1
```

`tab-tests.ts --emit` was not run in a browser on a record over the limit: no seed builds one. The test
calls `emitAll` with the text of one.

## The measure

`boundInfo` repeats the deployer's expression. The first test reads that expression from
`brain-deployer.ojs`, runs it on two records and compares the JSON, so a change to what the deployer binds
fails the test until the tool follows.

One Worker was compared with what is bound. The record the writer of `tr-1` emitted, and what cb4 answers
at `getInfo`, which is the variable as the Worker has it:

```
$ bun tools/cloud-brain/brain-info-size.ts <root>/tools/cloud-brain/.emitted/tr-1-wait-in-the-record-brain-x-issues.json
brain-x-issues 4966 of 5100, 29 methods, 134 bytes left, …
$ bun tools/cloud-brain/brain-info-size.ts --live     # 2026-10-13 00:21:34 CEST
brain-x-issues 4966 of 5100, 29 methods, 134 bytes left
```

**The limit.** Cloudflare's page of limits has "Environment variable size: 5 KB"
(`developers.cloudflare.com/workers/platform/limits/index.md`, read 2026-10-13 00:20 CEST), and the
refusal says 5.1 kB. 5120 bytes fits both texts. It was not tried: on cb4 4966 bytes were taken and 5274
refused, by the feedback issue. `LIMIT` is 5100, 20 under 5120, the number the test of `tr-1` uses.

## Each Worker's size

`bun tools/cloud-brain/brain-info-size.ts --live`, 2026-10-13 00:21:34 CEST. It reads `service.list` and
`getInfo?worker=` of each, with no session:

```
brain 326 of 5100, 0 methods, 4774 bytes left
brain-core 293 of 5100, 0 methods, 4807 bytes left
brain-db 2096 of 5100, 16 methods, 3004 bytes left
brain-x-ai 1267 of 5100, 7 methods, 3833 bytes left
brain-x-blob 876 of 5100, 6 methods, 4224 bytes left
brain-x-bluesky 1887 of 5100, 11 methods, 3213 bytes left
brain-x-browser 2339 of 5100, 16 methods, 2761 bytes left
brain-x-container 1696 of 5100, 9 methods, 3404 bytes left
brain-x-dashboard 1697 of 5100, 8 methods, 3403 bytes left
brain-x-feed 1469 of 5100, 11 methods, 3631 bytes left
brain-x-git 833 of 5100, 5 methods, 4267 bytes left
brain-x-inbox 1077 of 5100, 7 methods, 4023 bytes left
brain-x-issues 4966 of 5100, 29 methods, 134 bytes left
brain-x-knowledge 1248 of 5100, 7 methods, 3852 bytes left
brain-x-library 1151 of 5100, 6 methods, 3949 bytes left
brain-x-logs 811 of 5100, 4 methods, 4289 bytes left
brain-x-page 346 of 5100, 0 methods, 4754 bytes left
brain-x-proxy 422 of 5100, 1 methods, 4678 bytes left
brain-x-snapshot 811 of 5100, 3 methods, 4289 bytes left
brain-x-static 950 of 5100, 6 methods, 4150 bytes left
brain-x-topic 2171 of 5100, 11 methods, 2929 bytes left
brain-x-whatsapp 1079 of 5100, 4 methods, 4021 bytes left
```

22 Workers. The tracker is the one near the limit; the next largest is `brain-x-browser` at 2339.
`brain-deployer` is not in `service.list` and its `getInfo` answered 404: `brain.ts install-deployer` binds
its variable, of another shape (`brain.ts`, the bindings of `install-deployer`). A member's Worker
(`brain-m-…`) was not looked for.

## What the tracker's next method needs

The variable of `brain-x-issues` as cb4 had it at 2026-10-13 00:24:44 CEST (hash `eb54ffed1bc1`), by field,
from `getInfo` saved to a file and counted by a script of this writing (`json.dumps` with no spaces):

```
total 4966   access 3690   methods 962   hash 66   module 29   deployedAt 26   secrets 22   name 16   resources 15   role 8   calls 2   cloudflare 2   paths 2
```

28 of its 29 rules are `caller.kind in ['owner','token','worker','deployer']`, the form `tr-1` shortened.
One more method written that way costs 158 bytes (`issue.next`, a query) or 168 (`issue.archive`, a
procedure). 134 are left, so no method fits.

Four ways, with the count of further methods that then fit (the same script, each method a procedure
named `issue.m00`, `m01`, …, 164 bytes as is):

| | Change | Whose | Size after | Further methods |
|---|---|---|---|---|
| A | nothing | | 4966 | 0 |
| B | the seed: `who: "workers"` and no `allow` on the 28 | the loop's deploy, and `major` | 3258 | 18 |
| C | the deployer leaves `methods` out of the variable | the owner's deploy | 3993 | 8 |
| D | the deployer leaves `methods` and `access` out | the owner's deploy | 1266 | 122 |

**B changes who may call.** `who: "workers"` is `caller.trusted || caller.kind in ["worker", "deployer"]`
(`ruleExpression`, `cloudflare-iac.ojs`), and `trusted` is the owner, a token, or a `did` (`callerOf`
there: "a granted account the kernel has checked against this method"). The tracker's rule today refuses
a `did` (`test_issues_declares_what_it_needs`: `did:plc:other` is false). So B lets in an account the
owner granted an `issue.*` method to. That is his to approve, not a shorter spelling.

**A shorter rule with the same meaning was looked for and not found.** `caller.did==''&&caller.kind!='anonymous'`
is 12 characters shorter, 336 bytes over 28 rules, two methods. It names who is refused where the rule
today names who is let in, so a caller of a kind neither lists is let in by it and refused today. Not taken.

**C and D are one line of `brain-deployer.ojs`**, which the loop does not deploy (`rules.md`, Never). D:

```diff
       name: "BRAIN_INFO",
-      json: { name: m.worker, hash: w.hash, role: m.role, module: m.module || null, methods: m.methods, access: m.access || {}, calls: m.calls || [], paths: m.paths, secrets: m.secrets, resources: m.resources, cloudflare: m.cloudflare || [], deployedAt: new Date().toISOString() }
+      json: { name: m.worker, hash: w.hash, role: m.role, module: m.module || null, calls: m.calls || [], paths: m.paths, secrets: m.secrets, resources: m.resources, cloudflare: m.cloudflare || [], deployedAt: new Date().toISOString() }
```

C keeps `access: m.access || {},` in that line. Neither was built or run. What was read for them:

- The rules the core judges by do not come from the variable. The deployer sends them with
  `service.register` (`register` in `brain-deployer.ojs`: `methods: access || {}`), and `service.list`
  answered 29 methods for `brain-x-issues` with the rule of each (read 2026-10-13, no session).
- In a Worker the wrapper reads `name`, `hash`, `role`, `secrets` and `cloudflare` of the variable
  (`info()` in `cloudflare-iac.ojs`). The core reads `calls` and `hash` from a Worker's `getInfo`
  (`callsOf`, `brain-core.ojs`). The page reads `name` and `hash` (`cloudflare-iac.ojs`, the Services
  list; `brain-shell.ojs`; `brain-issues.ojs`). `grep` of `tools/cloud-brain/*.ojs` and
  `cloud-brain-dev/*.ts` for a read of `access`, `methods` or `paths` of the variable printed nothing.
- `getInfo?worker=` is public and answers the variable whole, and the core's reference says it answers
  "who may call each method (`access`)" (`brain-core.ojs`, the line of `getInfo`). After D it answers
  neither field for a Worker deployed since, and that line is changed with it, in the core's seed, which
  is also the owner's deploy. A caller outside this repository that reads them there was not looked for.
- With either, `boundInfo` in `brain-info-size.ts` is changed to match, or its first test fails.

## Tests

| Command | Result |
|---|---|
| `bun test --timeout=30000 ./tests/tools/brain-info-size.test.ts` | 7 pass, 0 fail, 44 expect() calls |
| the same with the line of the refusal taken out of `tab-tests.ts` and out of `brain.ts apply` | 4 pass, 3 fail: the emit's test and the two of `brain.ts apply` |
| `bun test --timeout=30000 ./tests/tools/brain-seen.test.ts` | 16 pass, 0 fail |
| `bun test --timeout=30000 ./tests/tools/tab-tests.test.ts` | 13 pass, 0 fail |
| `tests/tools/suite.sh` (00:26 CEST, `uptime` 10.91) | 888 pass, 1 fail, 889 tests across 92 files, 366 s. The fail is a test of `knowledge-docs.test.ts` at the 30 s timeout, a file this change does not touch |
| `bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts` (00:32 CEST, `uptime` 9.53) | 29 pass, 0 fail, 207 s |

The 7: the deployer's own expression gives the same JSON as `boundInfo`; a record at 5100 fits and one at
5101 is refused with the size, the limit and the Worker; the size is bytes and grows by a method's name
twice and its rule; what is no Worker's record is not measured; the emit writes no file over the limit
and is exit 2; `brain.ts apply` sends nothing for such a record, with `--force` and `--over-unverified`
too, and is exit 1; of two records it sends the one that fits.

## Not tried

- An apply of a record between 5101 and 5120 bytes on cb4, which would say whether Cloudflare's limit is 5120.
- `tab-tests.ts --emit` in a browser on a record over the limit.
- `redistil --apply`: the deployer distils the source it keeps, no emitted record is sent, and nothing
  measures it here. `install-deployer` and a member's deploy (`member.deploy`) bind a variable of another
  shape and are not measured. `brain-info-size.ts FILE` on the deployer's own record prints the size of
  the deployer's shape, which is not what `install-deployer` binds.
- Options B, C and D: none was built, and no test of the deployer was run with the diff.
- A record whose `meta` the deployer would distil otherwise than the page emitted it. `brain.ts apply`
  prints a line when the two hashes differ; the size is then of the emitted one.
