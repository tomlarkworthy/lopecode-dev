# core-getinfo-line-says-access

2026-10-13. One line of the text the core answers at `/llms.txt`, and one new test cell, both in
`tools/cloud-brain/brain-core.ojs`. **cb4 does not run the change.** The core is deployed by the owner
(`rules.md`, Never); nothing was emitted or applied, and `seen.json` is not changed. The start in this seed
is on the owner's word, quoted by his session in comment 6007 of the issue: "1 B 2 yes 4 do it", this issue
being number 2. Times are CEST, read from `date`.

## What was wrong

The line of `getInfo` under "Finding your way" said a Worker's answer has "who may call each method
(`access`)". Read on cb4 with no account:

| At | Call | Answer |
|---|---|---|
| 07:28:52 | `getInfo?worker=brain-x-issues` (`deployedAt` 2026-10-13T05:10:16Z) | `calls`, `cloudflare`, `deployedAt`, `hash`, `module`, `name`, `paths`, `resources`, `role`, `secrets`: no `access`, no `methods` |
| 07:31:18 | `getInfo?worker=brain-x-static` (`deployedAt` 2026-10-12T17:32:45Z) | has `access`, an object whose first entry is a method's name with `type` and `who`, and `methods`, a list of names |
| 07:31:18 | `getInfo?worker=brain-db` (2026-10-12T17:27:33Z) | has both, as `brain-x-static` |
| 07:31:18 | `getInfo?worker=brain` (2026-10-12T18:18:02Z) | `access` is `{}`, `methods` is `[]` |
| 07:28:58 | `getInfo?worker=brain-core` (2026-10-12T17:36:52Z) | `access` is `{}`, `methods` is `[]` |
| 07:28:58 | `service.list`, the entry of `brain-x-issues` | `methods` is an object of 29 names; the first three each have `type`, `who` and `allow` |

So the issue's title holds for the one Worker read that was deployed on 2026-10-13, and not for the two
recipes read that were deployed the day before: those still answer `access`. No other Worker's `getInfo`
was read. The new line is written to hold for both.

## What changed

| Where in `brain-core.ojs` | Change |
|---|---|
| the line of `getInfo` in the text of `/llms.txt` | "who may call each method (`access`), " is taken out. Two sentences are added at its end: "Who may call each of its methods is in `service.list`, under `methods`: `who`, and `allow` when an expression decides. Not every Worker answers that here." |
| a new cell, `test_llms_txt_says_where_the_rule_of_a_method_is` | the text has one line of `getInfo`; it has no `` `access` `` and has the two sentences; `service.list`, asked with no account in `coreRig`, answers `who` and `allow` for a method registered with a rule and `who` with no `allow` for one registered without |

The issue says the line is "also a line of `/llms.txt`". `grep -n "getInfo" tools/cloud-brain/brain-core.ojs`
has the claim in that one place; the seed's first `md` cell, its method reference, names `getInfo` once, of
`calls`, and that sentence is not changed.

"`allow` when an expression decides" is the seed's own reading: the line of a method under "Deployed" is
`by its rule` when its row has `allow`, and `who` otherwise (the function `line` of the same handler).

## Tests

Each run in the worktree. The build is `bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`,
the module `bun tools/lope-reader.ts <the build> --get-module @tomlarkworthy/brain-core`.

| Run | Result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-core`, what cb4 runs | `470753465969: 37 passed, 0 failed, 0 need a browser` |
| `bun test.ts brain-core --with <the module>`, the new cell as committed and the line as it was | `37 passed, 1 failed`: `test_llms_txt_says_where_the_rule_of_a_method_is`, `expect(string).not.toContain` of `` `access` `` |
| the same, the seed as committed | `38 passed, 0 failed, 0 need a browser` |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-core` | `"tests":38,"passed":38,"failed":[]` |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-core --shell <the build> --times 20`, from the main checkout, 07:32:29 | `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]` |
| `tests/tools/suite.sh`, 07:35:06 | `1095 pass`, `0 fail`, `Ran 1095 tests across 112 files` |

The run of the second row was made on the line put back in the working copy by a script, which
`git checkout -- tools/cloud-brain/brain-core.ojs` then restored; `git diff --stat HEAD` of the seed printed
nothing after it, and the build was made again. The last three rows are of the seed as committed. No file
under `tests/` is changed, and the suite's run was made after the last edit of the seed and before this
file was written.

`diff` of the built module with `cloud-brain-dev/deploy/@tomlarkworthy/brain-core.js` (hash `470753465969`,
what cb4 ran when the worktree was made), with the lines of `$def` and `main.variable` and the empty lines
taken out of both: 71 lines differ, and each was read. One is the line as it was, 16 are the new line and the
new test, and 54 are the 27 `main.define` lines of the module's imports, which the two files write in two
forms (a `[]` argument and no space after a comma in the build). The `$def` and `main.variable` lines are
the list of definitions at the end, written in two forms too, and were not compared line by line.

## For the owner: the deploy

Not run here, and not run by any agent of the loop. The commands are written after the knowledge doc
`changing-and-deploying-a-cloud-brain-worker.md` and the record `token-revoke-no-name-ends-links.md`; the
`--emit` of the core's cell `core_service` was not tried in this task. From the main checkout, on `main`
with this change, with a token of the session's own for the lock:

```
bun tools/cloud-brain/build.ts
bun tools/cloud-brain/tab-tests.ts <the notebook build.ts wrote> @tomlarkworthy/brain-core --emit core_service=tools/cloud-brain/.emitted/core-getinfo-line-says-access-brain-core.json
LOCK_TOKEN=<token> tools/cloud-brain/lock.sh take cb4 core-getinfo-line-says-access
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts apply core-getinfo-line-says-access-brain-core.json --reason="core-getinfo-line-says-access: the line of getInfo in /llms.txt says service.list has each method's rule"
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts saw brain-core
LOCK_TOKEN=<token> tools/cloud-brain/lock.sh release cb4 core-getinfo-line-says-access
```

No `confirm` is in the list: the text of `/llms.txt` in this seed says a Worker deployed over an earlier version is on probation, the deployer runs its tests in the same call, and "The kernel is not run this way". That is read in the seed and not seen in an apply of the core. `seen.json` is then committed. The check on cb4, with no account:
`curl -s https://cb4.endpointservices.workers.dev/llms.txt | grep 'getInfo?worker=<worker>`: '` prints one
line, with "is in `service.list`" and without "(`access`)".

When another change to `brain-core.ojs` lands before the deploy, the deploy carries that change too.

## Not tried

- The deploy, the emit, and the text of `/llms.txt` on cb4 after it.
- The owner's page, where the tests of every module run together. The 20 runs of `verify-run.ts` have the
  build's module (`from` is `["document"]`); the first line's `mains` was read only as far as
  `@tomlarkworthy/brain-shell`.
- `getInfo` of a Worker in a test. `coreRig` answers a Worker's `getInfo` with a fixed object of three
  fields, so the new test holds what the line says of `service.list` and holds nothing of what `getInfo`
  answers. The table of "What was wrong" is the reading of cb4.
- `getInfo` of the Workers not named in that table.
- Whether the sentence "Not every Worker answers that here" stays true once every Worker is deployed again:
  then none does, and the sentence says less than could be said.
- A member's Worker: the core answers 404 to `getInfo` of one, read in the seed and not called.
