# texts-of-brain-info-after-binds-change

2026-10-13. One test cell and one comment of the tracker's seed, `tools/cloud-brain/brain-issues.ojs`, and one
sentence of a knowledge doc. A changed test cell moves the hash of `brain-x-issues`, so the change is a deploy
of that Worker: its hash and verdict are the refs and the comment of the issue's submit, not in this file.
Times are CEST, read from `date`.

Part 1 of the issue alone. Part 2, the line of `getInfo` in the reference of `brain-core.ojs`, is **not
changed**: the core is the owner's deploy (`rules.md`, Never), and the orchestrating session's comment 5844
keeps it out of this task and puts the line to the owner.

## What was wrong

`test_issues_declares_what_it_needs` built the object the deployer bound as `BRAIN_INFO` until
`deployer-binds-no-method-list`, with `methods` and `access`, and held it at 5100 bytes or under. The
deployer's seed binds neither since that change, and cb4 ran such a deployer when this was written:

```
$ bun tools/cloud-brain/brain-info-size.ts --deployer        (06:21:10)
brain-deployer e4b02e4f4481 binds name, hash, role, module, calls, paths, secrets, resources, cloudflare, deployedAt (neither the methods nor their rules: a method adds nothing to the variable)
$ bun tools/cloud-brain/brain-info-size.ts --live | grep issues
brain-x-issues 293 of 5100, 29 methods, 4807 bytes left
```

So the test measured 4966 bytes of a variable that had 293, and failed on a 30th method that Cloudflare
would take.

Reproduced before the fix, in the worktree, with a 30th method `zprobe` added to `issues_service` and to the
test's list of names, and nothing else changed (`build.ts --out`, `lope-reader.ts --get-module`, then
`cd cloud-brain-dev && bun test.ts brain-x-issues --with <the module>`):

```
FAIL test_issues_declares_what_it_needs: expect(received).toEqual(expected) … Array [ "string", - true, + false, ]
brain-x-issues @tomlarkworthy/brain-issues no hash (--with): 48 passed, 1 failed, 17 need a browser
```

## What changed

| File | Change |
|---|---|
| `tools/cloud-brain/brain-issues.ojs`, `test_issues_declares_what_it_needs` | `bound` is a function of a `meta` that gives the bytes of the object with no `methods` and no `access`, the fields `bindingsFor` of `brain-deployer.ojs` has. The test holds it at 5100 or under, and holds that a `meta` with thirty methods and thirty rules more gives the same number of bytes |
| the same seed, the comment in `issues_service` over the methods' rule | it said the deployer binds every method's rule; it now says that it did until 2026-10-13 |
| `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, the row of `apply` | one sentence: what `--deployer` and `--live` printed at 06:21 |

The object in the test is a copy of the deployer's expression, written again in the tracker's seed, as it was
before. The tracker's module does not import the deployer's. A change of `bindingsFor` is not seen by this
test. `brain-info-size.ts` computes with the expression of the deployer that runs (its second line, under
"Tests"); the row of `apply` in the knowledge doc says `apply` and `tab-tests.ts --emit` refuse a record by it,
which was not tried here.

The rules of the tracker's methods stay written with single quotes and no spaces. The core still has
them: at 06:25:58 `service.list` on cb4 answered 29 methods for `brain-x-issues`, the first of them with its
rule, `caller.kind in ['owner','token','worker','deployer']`. No limit on a rule there was looked for.

## Tests

Each run in the worktree on the seed as committed, after the last edit of it.

| Run | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues --with <the fixed module>` | `49 passed, 0 failed, 17 need a browser` |
| the same, with the 30th method `zprobe` added to the fixed seed | `49 passed, 0 failed, 17 need a browser` |
| the same, with `methods: m.methods, access: m.access \|\| {}` put back in the new `bound` | `48 passed, 1 failed`: `test_issues_declares_what_it_needs`, expected `0`, received `4960` |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues` | `"tests":66,"passed":66,"failed":[]`, and the same from the run that emitted |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20`, from the main checkout | `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`, `mains` brain-shell and brain-issues |
| `bun tools/cloud-brain/brain-info-size.ts <the emitted record>` | `brain-x-issues 293 of 5100, 29 methods, 4807 bytes left` |
| the same with `BRAIN_DEPLOYER_JS=/nonexistent`, which computes with the methods and their rules | `brain-x-issues 4966 of 5100, 29 methods, 134 bytes left` |

The two runs with a seed changed for the run (the second and third rows) were made on edits put back
afterwards. The seed was then committed and built again for the runs of the rows after them, and
`git diff HEAD --stat -- tools/cloud-brain/brain-issues.ojs` printed nothing after the emit.

`tests/tools/suite.sh` was not run: no file under `tests/` or `tools/*.ts` is changed, and no test of
`tests/tools` reads the sentence added to the knowledge doc.

## Not tried

- A 30th method deployed to cb4. The size of the variable with one is the test's and the tool's arithmetic,
  not a deploy.
- A member's Worker (`member.deploy`), which is still bound `methods` and `access`. Not of this issue.
- The page of the owner, where the tests of every module run together. The 20 runs of `verify-run.ts` have
  brain-shell and brain-issues only.
- Whether the core or `service.register` has a limit of its own on a method's rule.
- The sentence added to the knowledge doc has no test.

## For the overseer

- `brain-core.ojs`, the reference line of `getInfo` (also a line of `/llms.txt`): "who may call each method
  (`access`)". At 06:26:03 `getInfo?worker=brain-x-issues` on cb4 answered `calls`, `cloudflare`, `deployedAt`,
  `hash`, `module`, `name`, `paths`, `resources`, `role` and `secrets`: no `access` and no `methods`. The
  mend the issue gives: say that `service.list` has each method's rule. The core is the owner's deploy.
- `cloudflare-iac.ojs`, `simulate`: a service under test is given the emitted `info` whole, with `methods`
  and `access`, which a deployed Worker no longer has (`deployer-binds-no-method-list`, "Not changed"). Read
  there, not looked at again here.
