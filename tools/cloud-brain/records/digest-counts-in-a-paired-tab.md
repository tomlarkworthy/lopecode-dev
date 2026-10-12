# digest-counts-in-a-paired-tab

2026-10-12. A local tool, `tools/cloud-brain/digests/count.ts`, its test file, and steps 6 and 8 of
`.claude/skills/brain-maintenance/agents/digest.md`. No seed, no build of the Brain, no deploy.

## What was wrong

Steps 6 and 8 of the digest writer's brief said to open the built file, and then the library
address, "in a QA tab" and count four numbers, and did not say how the numbers are read. The
writer of `digest-2026-10-12` read `window.__ojs_runtime` through the pairing channel in two
paired tabs (its comment, event 3792), and a paired tab of an agent sends each of its updates to
the orchestrating session (`records/writers-qa-tabs-wake-the-orchestrator.md`). The overseer filed
it (event 3912) with one thing not known: whether `tab-tests.ts` can count a digest page.

It cannot, as it stands. 2026-10-12 10:14 CEST, main checkout:

```
$ bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/digests/research-2026-10-12.html @digest/research-2026-10-12 --boot 30
tab-tests: @digest/research-2026-10-12 was not defined with a test_ cell in 30 s; it is named as in the notebook's boot list
exit 70
```

A digest has no `test_` cell, and `tab-tests.ts` takes a file and not an address.

## What changed

**`tools/cloud-brain/digests/count.ts TARGET`**, beside `build.ts`. `TARGET` is a built file or
an http(s) address. It launches a local headless Chrome (the one `tab-tests.ts` launches, through
`tools/lib/playwright-chrome.js`), opens the target with no hash added, waits for the module
`@digest/research-<day>` (from `research-<day>` in the target, or `--module`) to have the cell
`picksFound`, and prints one line. The context is new for the run, so an address is read with no
session. A target with `cc=` in it is refused, exit 64.

How each number is read, in the page:

| Number | Read as |
|---|---|
| `variables` | every variable the runtime holds for the module: those its cells define, and one for each name a cell reads that no cell defines (`md`, `Inputs`, `htl`, `location`, `Plot`, `Generators` in `research-2026-10-12`: 6 of its 53, the other 47 defined by cells). The writers and reviewers of the digests of 11 and 12 October counted so (55 and 53), and the tool gives their numbers. |
| `errors` | a named variable is imported into a module of the tool's own and observed there, as `tab-tests.ts` observes a `test_` cell: rejected is an error with its message, no value in `--timeout` (60 s) is `PENDING`. A cell with no name cannot be imported: the promise the page holds for it is read, after one pass of the runtime. |
| `items`, `sources`, `papers` | `module.value("items")` and `("papers")`: the lengths, and the distinct `source` of the items. |
| `picksFound` of `picks` | `module.value` of each; `notFound` is the ids of the picks not in `picksFound`. |

Exit 0: no error and every pick found. Exit 1: an error, a pick not found, or one of the four
lists is not a list. Exit 70: the tool did not run.

**`agents/digest.md`.** Step 6 names the command for the built file and what its line has, and
says not to open a paired tab for the count. Step 8 names the command for the library address.
The words "count the same four numbers there" and "they are the ones you report" of step 8 are
kept (`tests/tools/rules-count-for-a-task-with-no-tests.test.ts` reads the first). "Close the tab
by name" and the `chromium_args` of step 8 are gone with the tab: that flag was for the tab to
pair.

**`tools/cloud-brain/digests/README.md`** has a section "Counting a digest" with the command.

## What was run

All in the worktree `bm-digest-counts-in-a-paired-tab`, 2026-10-12. The lines quoted are of one
batch begun at 10:19:04 CEST (`date`), after the last change to the code of `count.ts`; a sentence
of its header comment was changed after it. One more run of the library address of 12 October at
10:30:19, from the pushed commit, printed the same numbers. The built file is the main checkout's
`tools/cloud-brain/digests/research-2026-10-12.html`.

```
$ bun tools/cloud-brain/digests/count.ts <root>/tools/cloud-brain/digests/research-2026-10-12.html      (3 runs)
…"variables":53,"errors":[],"items":103,"sources":9,"papers":2,"picks":17,"picksFound":17,"notFound":[],"pageErrors":[],"browser":"151.0.7922.34","ms":425}   exit 0
                                                                                                         ms 386, exit 0;  ms 403, exit 0
$ bun tools/cloud-brain/digests/count.ts https://cb4.endpointservices.workers.dev/library/research-2026-10-12      (3 runs)
…"variables":53,"errors":[],"items":103,"sources":9,"papers":2,"picks":17,"picksFound":17,"notFound":[],…"ms":620}   exit 0
                                                                                                         ms 844, exit 0;  ms 665, exit 0
$ bun tools/cloud-brain/digests/count.ts https://cb4.endpointservices.workers.dev/library/research-2026-10-11
…"variables":55,"errors":[],"items":216,"sources":11,"papers":14,"picks":28,"picksFound":28,"notFound":[],…"ms":971}   exit 0
$ bun tools/cloud-brain/digests/count.ts https://cb4.endpointservices.workers.dev/library/research-2026-10-09
count: @digest/research-2026-10-09 was not defined with a cell picksFound in 120 s; it is named as in the notebook's boot list   exit 70
```

The six runs of 12 October are the writer's and the reviewer's four numbers (events 3792 and
3797: 53, 0, 103 items of 9 sources and 2 papers, 17 of 17). The run of 11 October is the four of
that day's submit (55, 0, 216 and 14, 28 of 28; the brief had them until this change). No tab was
paired: the tool passes no `cc=` and its browser is not the channel server's. None of the runs had
`--disable-features=LocalNetworkAccessChecks`.

**A digest with defects, to see the tool name them.** Two seeds made from `2026-10-12.ojs` in the
worktree, built with `build.ts` under the days 2099-01-01 and 2099-01-02, counted, and removed:

```
2099-01-01: after `day`, a cell with no name that throws, an md cell that reads a name nothing defines,
            `bad = nope + 1`, `hang = new Promise(() => {})`; and a pick with the id zzz-not-there.
$ bun count.ts research-2099-01-01.html --timeout 5
…"variables":57,"errors":["bad nope is not defined","cell 23 boom in a cell with no name","cell 24 nope_missing is not defined","hang PENDING"],"items":103,"sources":9,"papers":2,"picks":18,"picksFound":17,"notFound":["zzz-not-there"],…"ms":5270}   exit 1

2099-01-02: as the seed, and a last cell with no name that throws.
$ bun count.ts research-2099-01-02.html      (3 runs)
…"variables":54,"errors":["cell 53 boom in the last cell"],"items":103,…   exit 1, 3 of 3
```

**Tests.** `tests/tools/digest-count.test.ts`, 10 tests: the in-page functions against a real
`@observablehq/runtime` with no browser (the four numbers; a throw, a missing input, a hang and a
throwing cell with no name each named; a pick in neither list; a list that is not a list), the
exit, the address, the arguments with `cc=` refused, the tool's exits 64 and 70, and steps 6 and
8 of the brief. Before the brief was edited the last of them failed, on the built-file command
that step 6 did not have.

```
$ bun test ./tests/tools/digest-count.test.ts
 10 pass  0 fail  45 expect() calls
$ bun test ./tests/tools
 574 pass  0 fail   Ran 574 tests across 59 files. [195.63s]
```

Both from 10:26 to 10:29 CEST (`date`), after the last change to the tool, its test, the brief and
the README, with the worktree at `f4428237` of `origin/main` under its commits. Without `count.ts`
in its place the test file gave `0 pass 1 fail 1 error`.

## Not tried, and what the tool does not see

- **A cell with no name that the page has not yet observed.** The promise read for it is then the
  one it was made with, which is resolved, so an error it would have is not counted. The tool
  waits for one pass of the runtime before it reads, and in the two defect builds above the
  throwing cells with no name were named in 4 of 4 runs, the last cell of the page among them.
  A page that draws a cell later than that pass was not made.
- `research-2026-10-09`, written before `picksFound` was a cell: exit 70 after 120 s, as above.
  Its seed was not changed.
- An address with no digest, `…/library/research-2026-10-13 --boot 5` at 10:32 CEST: exit 70,
  "was not defined with a cell picksFound in 5 s". The tool does not say that the address answered
  no notebook; it waits its `--boot` and says the module was not defined.
- A digest that covers two days, and a pick that is a paper, on a build of this session: the
  published digest of 11 October has both and gave its submit's numbers; none was built here.
- A page whose snapshot does not load (the Brain not reached). The digest then has 0 items and
  its picks are not found, which is exit 1; not run.
- An address that redirects, one behind a sign-in, and `--module` on a notebook that is not a
  digest.
- The number `sources` is beside `items` because the two comments so far gave it; no step of the
  brief asks for it.
- The tool reads `_variables`, `_module`, `_name`, `_promise` and `_compute` of the page's
  runtime, as `tab-tests.ts` reads the first three. A runtime that renames one breaks it.
- A digest writer has not yet run from the changed brief.

## For the overseer

The reviewer's brief is the Brain's (`roles/reviewer.md`), and "A digest" step 1 there still opens
a paired QA tab (read 2026-10-12 with `cloud-brain-dev/put.sh --get roles/reviewer.md`, lines 343
to 347). A step 1 that counts as the writer now does:

```
1. Count the four numbers at the `url` ref with no session, from the main checkout:
   `bun tools/cloud-brain/digests/count.ts <the url ref>`. It opens the address in a local headless
   Chrome of its own and prints one line: `variables`, `errors` (a list), `items` with `sources`,
   `papers`, and `picksFound` of `picks`. Compare with the writer's four. Do not open a paired tab
   for the count: its updates are sent to the orchestrating session. How each number is read is in
   the header of the tool and in `tools/cloud-brain/records/digest-counts-in-a-paired-tab.md`.
```

Step 3 of that section (the layout) is a look at the page and may still need a tab; it was not
read for this change beyond its first line.
