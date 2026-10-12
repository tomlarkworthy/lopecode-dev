# deployer-binds-no-method-list

2026-10-13. One line of the deployer's seed, a test cell beside it, one local tool and its tests.
**cb4 does not run the change.** The deployer is deployed by the owner (`rules.md`, Never), and until
he does, cb4's deployer binds what it bound before. Times are CEST, read from `date`.

## What was wrong

`brain-x-issues` had 134 bytes left of the 5100 its variable `BRAIN_INFO` may have, and a method written as
its others are costs 158 to 168 (`tools/cloud-brain/records/brain-info-size-known-before-apply.md`, "What the
tracker's next method needs"). That record weighs five ways out and picks D: the deployer binds neither the
methods nor their rules. This is D.

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/brain-deployer.ojs` | the json of `BRAIN_INFO` in `bindingsFor` has no `methods` and no `access`. A new cell, `test_a_workers_variable_does_not_grow_with_its_methods` |
| `tools/cloud-brain/brain-info-size.ts` | the size is computed with the expression of the deployer that runs, not with a copy of the seed's. `--deployer` prints what cb4's deployer binds. `--live` counts a Worker's methods from `service.list` |
| `tests/tools/brain-info-size.test.ts` | 11 tests, where there were 7 |
| `knowledge/changing-and-deploying-a-cloud-brain-worker.md` | the row of `apply` says which deployer the size is computed by |

The line, as the record of `brain-info-size-known-before-apply` had it:

```diff
-      json: { name: m.worker, hash: w.hash, role: m.role, module: m.module || null, methods: m.methods, access: m.access || {}, calls: m.calls || [], paths: m.paths, secrets: m.secrets, resources: m.resources, cloudflare: m.cloudflare || [], deployedAt: new Date().toISOString() }
+      json: { name: m.worker, hash: w.hash, role: m.role, module: m.module || null, calls: m.calls || [], paths: m.paths, secrets: m.secrets, resources: m.resources, cloudflare: m.cloudflare || [], deployedAt: new Date().toISOString() }
```

Not changed, each read and left:

- **A member's Worker** (`member.deploy`, the one-line binding further down the seed) still gets `methods` and
  `access`. The issue and the diff it names are of `bindingsFor`. A member's variable has the same limit and
  no member's Worker was measured.
- **The deployer's own variable** is bound by `brain.ts install-deployer` from the emitted record's `info`,
  whole. Not looked at further.
- **`simulate`** in `cloudflare-iac.ojs` gives a service under test the emitted `info` whole, so a test still
  sees `methods` and `access` in `BRAIN_INFO` that a Worker deployed by the new deployer will not have. No
  service reads them (below). `cloudflare-iac.ojs` is in the hash of the kernel, the core, the database and
  the deployer, and was not touched.

## Who reads `methods` or `access` of the variable

None found. The issue asked for the search before the diff, and for a stop if a reader exists.

The variable reaches code three ways: the wrapper's `info()` (`ENV.BRAIN_INFO`, `cloudflare-iac.ojs`); the
service's own handler, which is passed it as `info` or as `env.BRAIN_INFO` (the two lines after
`const out = await during(` there); and `getInfo`, which answers it whole to anyone.

| Search, over the 33 seeds `tools/cloud-brain/*.ojs` | Lines | What they read |
|---|---|---|
| `grep -cE 'BRAIN_INFO'` | 19 in 4 seeds | `cloudflare-iac`: `info()`, the blob key (`role`, `name`), `simulate`. `brain-deployer`: the two bindings, and the test fake, which reads `hash` and `name`. `brain-issues`: two comments and the test below. `cloud-brain`: the Clone form's binding of the deployer |
| `grep -cE 'info\(\)'` in `cloudflare-iac.ojs` | 15 | `name`, `hash`, `role`, `secrets`, `cloudflare`, and the whole object passed on at `getInfo` and to the handler |
| `grep -nE '\binfo\b'` in the other seeds | read line by line | `brain-core`, `callsOf`: `info.calls`, `info.hash` of a Worker's `getInfo`. `brain-deployer`: `context.info.hash`. The rest are other things named info (`blob.info`, `info/refs`, a WhatsApp media answer) |
| `grep -cE 'getInfo'` | 44 in 8 seeds | the callers keep `hash` or `name`: `brain-shell` (`i.hash`), `brain-issues` (`r.hash`), the Services list of `cloudflare-iac` (`[i.name, i.hash]`), `callsOf` |
| `grep -nE '(info(\(\))?\|INFO\|json)\??\.(methods\|access)\b'` in the seeds, `tools/cloud-brain/*.ts`, `cloud-brain-dev/*.ts` | 0 | |
| `grep -nE '\.(methods\|access)\b'` in `cloudflare-iac`, `brain-deployer`, `brain-core`, `brain-kernel`, `cloud-brain` | read line by line | each is of a record's `meta`, a row of the deployer (`worker/`, `pending/`), a row `route/` of the core, a token or a grant. None is of the variable or of a `getInfo` answer |

In the tools (`tools/cloud-brain/*.ts`, `*.sh`, `cloud-brain-dev/*.ts`): one reader, `brain-info-size.ts --live`,
which counted the methods of a `getInfo` answer for its line. It now counts them from `service.list`.

Two readers by copy, neither changed, both for the overseer:

- `test_issues_declares_what_it_needs` in `brain-issues.ojs` builds the old object, with `methods` and
  `access`, and holds it under 5100 bytes. After the owner's deploy that test refuses a method the deployer
  would bind without growth. It is a test cell of the tracker: changing it is a deploy of `brain-x-issues`,
  and a second task once the deployer runs.
- The reference of the core (`brain-core.ojs`, the line of `getInfo` under "Finding your way", which is also a
  line of `/llms.txt`) says `getInfo` answers "who may call each method (`access`)". For a Worker deployed by
  the new deployer it will not. The core is the owner's deploy too.

Not searched: a caller outside this repository. The owner's assistant may call `getInfo` as a tool
(`cloud-brain.ojs`), and what a model reads of the answer is not known.

## What answers a Worker's methods and rules after the change

Read on cb4 at 01:21:47, no session:

```
service.list, the entry of brain-x-issues: 29 methods, each with its rule
  com.lopecode.brain.issue.open  {"type":"procedure","who":"owner","allow":"caller.kind in ['owner','token','worker','deployer']"}
getSource?worker=brain-x-issues&part=reference: the method tables, as text
/llms.txt, line 31: "service.list: every Worker. For each: worker, the notebook module it is made from, role, methods, paths, and the hash"
```

`service.list` is the core's rows `route/`, which the deployer writes with `service.register`
(`register` in the seed: `methods: access || {}`). The new test reads that call: with 60 methods bound to no
variable, the body of `service.register` has the 60 rules. The core judges a call by those rows, not by the
variable.

## How the tool knows which deployer runs

The refusal before the locks (`tab-tests.ts --emit`, `brain.ts apply`) has to compute the old size until cb4's
deployer is the new one, and the new size from then. The seed cannot say which runs. What can is the
deployer's own text as cb4 runs it, which `sync.ts` writes to
`cloud-brain-dev/deploy/@tomlarkworthy/brain-deployer.js` (`worktree.sh` runs it at a worktree's making and
at each `--rebase`, so under the landing lock before an apply).

`bindsOf(text)` takes the json of the binding out of that text and runs it on a record's `meta`, as the first
test of the tool did with the seed's. `deployerFrom(file)` reads the file; `BRAIN_DEPLOYER_JS` names another.
No field name is written in the tool but in the fallback.

```
$ bun tools/cloud-brain/brain-info-size.ts <root>/tools/cloud-brain/.emitted/tr-1-wait-in-the-record-brain-x-issues.json
brain-x-issues 4966 of 5100, 29 methods, 134 bytes left, …
computed as the deployer of …/cloud-brain-dev/deploy/@tomlarkworthy/brain-deployer.js binds it
$ BRAIN_DEPLOYER_JS=tools/cloud-brain/brain-deployer.ojs bun tools/cloud-brain/brain-info-size.ts <the same file>
brain-x-issues 293 of 5100, 29 methods, 4807 bytes left, …
computed as the deployer of …/tools/cloud-brain/brain-deployer.ojs binds it
$ BRAIN_DEPLOYER_JS=/nonexistent bun tools/cloud-brain/brain-info-size.ts <the same file>
brain-x-issues 4966 of 5100, 29 methods, 134 bytes left, …
computed with the methods and their rules, as a deployer before 2026-10-13 binds it: /nonexistent was not read
```

4966 is what cb4 has bound; 293 is the number row D of the earlier record gave.

**Which way it fails.** A file that is absent, has no such line, or whose line does not run on a meta gives
the old size, the larger. So does a copy that is behind cb4 after the owner's deploy: the main checkout's
`cloud-brain-dev/deploy` is as old as its last `sync.ts`. Either refuses a record that would fit, and the
refusal says which file it computed by and, for a file not read, `bun sync.ts in cloud-brain-dev reads what
the Brain runs`. Neither passes a record that would not fit. The one way to pass such a record is a copy that
is ahead of cb4: the deployer put back to an older version after the sync. Not guarded.

`--deployer` asks cb4 and compares. At 01:20:55:

```
$ bun tools/cloud-brain/brain-info-size.ts --deployer
brain-deployer 753641455e0b binds name, hash, role, module, methods, access, calls, paths, secrets, resources, cloudflare, deployedAt (with the methods or their rules: a method adds to the variable)
this checkout computes the size by the same fields, as the deployer of …/cloud-brain-dev/deploy/@tomlarkworthy/brain-deployer.js binds it
```

It reads `getSource?worker=brain-deployer` at the deployer's own address (`cb4-deployer.…`), as `sync.ts`
does. The kernel's address answers that question 404.

## The owner's deploy

A record of the deployer was emitted from the build of this change, rebased on `origin/main`, at 01:30, by
`tab-tests.ts … @tomlarkworthy/brain-deployer --emit deployer_service=…` (57 of 57 tests in that run):

```
<root>/tools/cloud-brain/.emitted/deployer-binds-no-method-list-deployer.json   hash fc8063a52d65   2,854,735 bytes
<root>/tools/cloud-brain/.emitted/deployer.json                                  hash 753641455e0b   (what cb4 runs; not touched)
```

`install-deployer` uploads `.emitted/deployer.json`. So, in the main checkout, under the deploy lock:

```
cp tools/cloud-brain/.emitted/deployer.json tools/cloud-brain/.emitted/deployer.before-binds.json
cp tools/cloud-brain/.emitted/deployer-binds-no-method-list-deployer.json tools/cloud-brain/.emitted/deployer.json
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts install-deployer
```

The one command is the last. None of the three was run. What he reads after it:

```
bun tools/cloud-brain/brain-info-size.ts --deployer
```

Its first line then ends `neither the methods nor their rules: a method adds nothing to the variable`. The
hash it names is expected to be `fc8063a52d65`, the emitted record's; that was not seen. Its second line says `other fields` until `bun sync.ts
https://cb4.endpointservices.workers.dev` is run in that checkout's `cloud-brain-dev`.

The emitted file is of the seeds at that time. A later commit to `brain-deployer.ojs` or `cloudflare-iac*.ojs`
makes another hash: build `main` and emit again with the command above.

**What does not change at his deploy.** A Worker's variable is bound when that Worker is deployed. The
tracker keeps its 4966 bytes, and `--live` its line, until the next apply of `brain-x-issues`. Whether
`redistil --apply` binds again was not read. `getInfo` of a Worker deployed after it has no `methods` and no
`access`.

**The way back**: `cp deployer.before-binds.json deployer.json`, `install-deployer`. Not run.

## What his one deploy carries

The issue asks for one deploy that is three changes: this one, `cu-1` and
`ds-ingestion-tail-to-analytics-engine`. **The build of `main` has this one and neither of the other two.**
Neither was written:

- `cu-1-deployer-gains-billing-read` is `triaged`, `needs-owner`. Its triage (event 3485): "The owner's task
  by the spec he approved: no writer of the loop builds it." Comment 3788: "the deployer's seed on
  `origin/main` has no commit for it". `git grep -n "Billing Read" origin/main -- tools/cloud-brain/*.ojs
  tools/cloud-brain/brain.ts` prints nothing.
- `ds-ingestion-tail-to-analytics-engine` is `triaged`, `needs-owner`. Its body: "Built by no writer of the
  loop." `git grep -n "Analytics Engine" origin/main -- tools/cloud-brain/brain-deployer.ojs` prints nothing.

Neither was written here: the first is a new permission of the deployer's token and the second waits for his
answer on its design. If he makes either edit before the deploy, the emit above is made again.

What the deploy does carry, from a diff of what cb4 runs (`cloud-brain-dev/deploy/@tomlarkworthy/`, read at
the rebase) against the modules of this build, with the lines of `$def(` and the import lines, which the two
forms write differently, left out:

| Module | Differs in |
|---|---|
| `brain-deployer` | the line of `BRAIN_INFO`, its comment, and the new test cell |
| `cloudflare-iac` | the test cell of `iac-origin-test-secret-held-by-clock` (on `main` since 2026-10-12, commit `c55a8d0d`) |

That second change is also in the hash of the kernel, the core and the database, which this record says
nothing more of.

## Tests

| Command | Result |
|---|---|
| `bun test.ts @tomlarkworthy/brain-deployer --with <the built module>` in `cloud-brain-dev`, after the rebase | passed 57, failed 0, needsBrowser 0 |
| the same with the line of `BRAIN_INFO` as it was | passed 56, failed 1: the new test, `+ "methods", + "access"` in the keys |
| `bun tools/cloud-brain/tab-tests.ts <build> @tomlarkworthy/brain-deployer`, three runs before the rebase and one with the emit after it | 57 of 57, four times. `verify-run.ts` does not apply to the deployer |
| `bun test --timeout=30000 ./tests/tools/brain-info-size.test.ts` | 11 pass, 0 fail, 84 expect() calls |
| the 7 tests of before, on the changed seed with the tool of before | 6 pass, 1 fail: "the fields are the ones the deployer binds" |
| `bun test --timeout=30000 ./tests/tools/brain-info-size.test.ts ./tests/tools/brain-seen.test.ts ./tests/tools/tab-tests.test.ts ./tests/tools/brain-cli.test.ts`, after the rebase | 49 pass, 0 fail, 4 files |
| `tests/tools/suite.sh`, 01:21 to 01:27, `uptime` 8.29, before the rebase | 925 pass, 1 fail, 926 tests across 95 files, 358 s. The fail is a test of `knowledge-docs.test.ts` at the 30 s timeout, a file this change does not touch |
| `bun test --timeout=30000 ./tests/tools/knowledge-docs.test.ts`, alone, `uptime` 11.63 | 29 pass, 0 fail, 168 s |

The rebase brought in briefs, a spec, two test files and two records, none of them a seed or the tool.

The new cell deploys two Workers through `infra.apply` of the rig, one with 1 method and one with 60, whose
names are as long as each other. It holds the keys of the bound object, that the two are the same size (239
bytes on the rig), that `name`, `role`, `calls` and `hash` are there, and that `service.register` carried
the 60 rules.

The 11 of the tool: a deployer of before (the seed at `938b1b59`, by `git show`) binds 12 fields and its
expression gives the JSON `boundInfo` gives; the seed of the checkout binds 10, a record of 200 methods is
the size of one of none, and what it refuses names a path or a secret; a file that is absent, empty, throws
or binds no name is taken for a deployer of before, and the refusal says so; `BRAIN_DEPLOYER_JS` and the
default path; the five of before on sizes, the emit and `brain.ts apply`; and one record that the emit writes
and `apply` sends under the seed's deployer and does not under the one of before. The tests name their
deployer file, set as `BRAIN_DEPLOYER_JS` for this file's tests and put back after the last. One calls
`deployerFrom()` with no file named and holds that its sentence names the default path, whether the file is
there or not; no size of a test comes from `cloud-brain-dev/deploy`.

## Not tried

- `install-deployer` with this record, and so everything on cb4: a Worker deployed by the new deployer, its
  `getInfo`, the core's `callsOf` on it, a deploy's test run of it in the cluster's browser.
- An apply of the tracker with a 30th method after the deploy.
- `redistil` against the new deployer.
- The other seeds' tests on this build: only the deployer's module changed, and only its tests were run.
- No run of the whole suite with 0 fail: one test at the timeout, which passed alone.
- `--deployer` against a deployer that binds neither: its second form of the line is from the code and from
  the test of `deployerFrom` on the seed, not from cb4.
- A copy of the deployed text that is ahead of cb4.
