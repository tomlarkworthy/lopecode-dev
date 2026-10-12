# dv-5-read-first-20-runs

Task 5 of `plan/cloud-brain-deploy-verdict-from-a-shared-page.md`: read the deployer's log of the first 20
deploy runs made on `shell/verify.html` and set them beside the 45 the spec counted on `/`. The file was put
on cb4 at 16:41:51 CEST on 2026-10-11 (`records/dv-4-owner-install-and-shell.md`).

The first 20 are 20 verified, with no failure and no run without a verdict. The file stays: no
`static.delete` is asked of the owner. Three runs later than the 20 gave no verdict, for a reason that is
not the page (below).

The spec names `records/deploy-verdict-from-a-shared-page.md` for this. It is here, under the issue's id, as
the records of tasks 1 to 4 and 6 are.

## The read

One call, 2026-10-12 23:34:07 CEST (`date` before it), from the worktree, answered 200 with 794 lines in 1 query:

```
BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl \
  "/xrpc/com.lopecode.brain.logs.deploys?from=1791697923049&to=1791840847543" --as loop-deploys
```

`from` is the first `deploy.verify` line on cb4 (`brain-logs.ojs`, "The deploys of a span"). Cloudflare keeps
7 days, so the call answers fewer lines from 2026-10-18. The 398 lines the counts are made from
(`deploy.verify`, `verified`, `failed`, `verify.none`, `put-back`, `confirmed`; the fields `at target hash run
tests otherTestsRan ms failed reason previous deployer t`) are kept in
`tests/tools/fixtures/dv-5-deploy-lines.json`. Every count below is printed by `bun tests/tools/dv-5-runs.ts`
from that file, run 2026-10-12 23:37 CEST. Times in its output are UTC.

A run is a `deploy.verified`, `deploy.failed` or `deploy.verify.none` line. Its page is read from the `run` of
the `deploy.verify` line of that Worker and hash before it: 129 such lines, 52 with `/#view=` and 77 with
`/static/shell/verify.html#view=`, each followed by its verdict. The first run of the span (05:52:15 UTC) has
no `deploy.verify` line in it and is counted before the file, on its time. A `verify.none` has none either:
the deployer wrote no address for it.

## The counts

```
the spec's 45, on /          runs 45  {"verified":38,"failed":7} ms min 5041 median 8723 p90 19053 max 23956 otherTestsRan {"110":1,"112":2,"113":3,"132":39}
every run before the file    runs 53  {"verified":46,"failed":7} ms min 5041 median 9040 p90 20714 max 23956 otherTestsRan {"110":1,"112":2,"113":3,"132":46,"140":1}
the first 20 on the file     runs 20  {"verified":20} ms min 3612 median 6655 p90 12406 max 29993 otherTestsRan {"9":20}
every run since the file     runs 80  {"verified":77,"verify.none":3} ms min 3345 median 6074 p90 14015 max 32556 otherTestsRan {"9":21,"10":56}
```

The first line is the spec's own table again, to the number: the runs to 09:35:42 UTC of 2026-10-11. The
second has the 8 runs made on `/` after the spec was written. The first run on the file is `brain-x-page` at
14:49:57 UTC of 2026-10-11, the twentieth `brain-x-dashboard` at 19:28:04 UTC the same day, and the last
read `brain-x-issues` at 21:16:52 UTC of 2026-10-12. The 20 are of 4 Workers (`brain-x-dashboard` 8,
`brain-x-page` 7, `brain-x-issues` 3, `brain-x-knowledge` 2); the script prints each.

Against the spec's requirements:

- **R1, `otherTestsRan`.** 9 in each of the first 20, where it was 132 for a Worker of the Brain. The spec
  expected "the count of brain-shell's own tests (9 today)". From run 22 it is 10:

  ```
  otherTestsRan 9 last at 10-11 19:40:05 and 10 first at 10-11 19:51:22 ; deployers since 4a25dc92cc07 753641455e0b ; hashes run twice since 0
  ```

  `brain-shell.ojs` went from 9 `test_` cells to 10 at `78122d58` (2026-10-11 21:32:17 +0200, 19:32:17 UTC),
  which adds `test_wantedOf_adds_the_module_a_link_asks_for`. When the shell built from it was posted was not
  read; the count changed between the two times above.
- **R2, no `deploy.verify.none` in the first 20.** None. No `deploy.failed` in the 80 either, and no
  `deploy.verify.stale` in the span.
- **R2, `ms` beside the 45.** The median of the first 20 is 6655 ms against 8723, and of the 77 runs since
  that gave a time 6074. The two sets are not of the same Workers, so by Worker: 19 of the 19 Workers run
  both ways have a lower median since (the script's last lines; 13 of them have one run on a side, and
  `brain-x-container`'s 4 before include the 3 that failed at 22.7 s). The slowest runs are not quicker: one
  of the first 20 took 29993 ms (`brain-x-dashboard`, run 10, 4 tests) and one later 32556 ms, both above the
  23956 ms that is the most before the file. Why those two were slow was not looked at.

The spec said of the time: "It is measured by R2's second line and may be nothing." It is 2.1 s of 8.7 s at
the median of the first 20. What part of that is the page and what part the mix of Workers, the lines do not
say beyond the count by Worker.

## The three runs with no verdict

```
none: run 29 10-11 20:32:12 brain-x-issues e3b34e862cd1 confirmed true | browser.extend answered 402 owner has made 2000 priced calls today, which is the most for one day. The count is new at 00:00 UTC
none: run 30 10-11 20:36:51 brain-x-page d7139dacd483 confirmed true | browser.extend answered 402 owner has made 2000 priced calls today, which is the most for one day. The count is new at 00:00 UTC
none: run 31 10-11 21:03:17 brain-x-page 8028f6d28439 confirmed true | browser.extend answered 402 owner has made 2000 priced calls today, which is the most for one day. The count is new at 00:00 UTC
```

The deployer was refused a browser, on the owner's count of priced calls for the day. No page was opened, the
short one or `/`, so these say nothing of the file. Each of the three hashes has a `deploy.confirmed` line
after it (`confirmed true`). The next run after them, at 00:15:52 UTC of 2026-10-12, was verified.

The task's rule is "A `none` or a new failure: the file is deleted". Read as the spec's R2 has it, of the
first 20 runs and of a `none` the page could have caused, it does not fire. The other reading, any `none`
after the file, would delete a file that was not opened in any of the three. The first is taken
(`philosophy.md`, line 2: the side that is smaller and easier to undo; the delete is still one call of the
owner's).

Two put-backs since the file, neither on a test: `brain-x-blob` at 20:08:08 UTC of 2026-10-11 and
`brain-x-ai` at 02:26:09 UTC of 2026-10-12, both "health check failed after go-live".

## What the spec did not know, as it stands now

- "Whether Chrome 128 gives the same verdicts with the short boot list." 77 runs on the file by the
  deployer, 77 verified, over 21 Workers. The lines do not name the browser, so that these ran in Chrome 128
  is from the spec and not from this read. No hash was run both ways, and none was run twice since the file,
  so no verdict on the file was set against a verdict on `/` for the same code.
- "Whether `static.delete` takes a path under `shell/` from the owner's session." Still not run: nothing
  called for it.

## Tests

`tests/tools/dv-5-record.test.ts` makes the counts from the fixture and looks for each line above in this
file, and for the spec's note of where this record is. Before this file and the spec's note were written:
2 pass, 5 fail (`bun test --timeout=30000 ./tests/tools/dv-5-record.test.ts`, 23:38:23 CEST). The counts
after are in the issue's comment.

## Not tried

- The page in the cluster's browser. Nothing was opened there; all of this is the deployer's lines.
- The lines the answer left out. `logs.deploys` asks Cloudflare again for a window it sampled and answers 502
  when it cannot be whole; that the 794 are every line was not checked another way.
- A run by run pairing of one Worker at one size of test set. A Worker's tests grew over the two days
  (`brain-x-page` 17 to 30 in the first 23 runs), and `ms` holds the tests' own time.
- Why `otherTestsRan` was 140 in one run on `/` (`brain-x-issues`, 14:23:51 UTC of 2026-10-11).
