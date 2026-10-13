# The Services table is drawn again and again (`page-services-refreshes-in-a-loop`)

## Round 1, 2026-10-13

The owner's note on his page, at the heading "Services" of `@tomlarkworthy/cloud-brain` (`fb-a2k9vvmfvv`,
event 6114, 2026-10-13 06:52:29 UTC):

> This is repeatedly refreshing, making scrolling impossible, I guess driven by some kind of refresh loop.

Nothing here was seen in the owner's tab. Every count is from a local headless Chrome (151.0.7922.34) at
cb4's address, on a page the tool answered as the owner's: `/auth/session`, `infra.getState`, `inbox.poll`,
`lease.take`, `inbox.done` and `metric.query` were answered by the tool, and every other POST with 401. No
session was held and no call of the owner reached cb4.

### What was found

No loop. A page at rest computes nothing and draws nothing. What draws the section again is an entry of the
deployer in the inbox. The deployer writes one for a deploy, and 22 Workers were verified, which it does
after a deploy, in the 8 minutes that ended 3 minutes before the note.

At rest, on what cb4 served (`brain-x-page` 3e05ace86c0e), the shell's own layout, 90 s counted:

```
$ bun tools/cloud-brain/page-redraws.ts --owner --seconds 90        2026-10-13T06:59:11Z
computed {}   draws 0   tables 0   calls: issue.list 3, inbox.poll 3, bluesky.poll 1
```

The same with five modules in the left pane (`--view 'C100(S50(cloud-brain, brain-dashboard, brain-issues,
brain-inbox, brain-static),S50(brain-operator))'`, 60 s, 07:06:24Z): `computed {}`, `draws 0`.

Six entries of the deployer handed to the page in one `inbox.poll`, on what cb4 served:

```
$ bun tools/cloud-brain/page-redraws.ts --owner --seconds 40 --entries 6        2026-10-13T07:22:35Z, exit 1
computed  panelDrawing 6, panel 6, workerLink 6, dynamic bridge workerLink 6
draws 18  tables 0
calls     service.list 6, infra.getState 6, getInfo 144, inbox.done 6, inbox.poll 2, issue.list 2, bluesky.poll 1
```

So one entry was one read of what runs (`viewof services.refresh()`): `infra.getState`, `service.list`, a
`getInfo` for each of 24 Workers, the table put in place 3 times, and the cells `workerLink`, `panelDrawing`
and `panel` computed once, which draws each panel of Health again.

The two causes, read in `cloud-brain.ojs` and `cloudflare-iac.ojs` after the count named the cells:

- `deployerInbox` handed each entry to `viewof services.refresh()` and the pump waited for it, so the entries
  of one poll were that many reads, one after another.
- `refresh` of `serviceList` ends with an `input` event, the value of `services` is a new array at each, and
  `workerLink` named `services`. `panelDrawing` names `workerLink`, and `panel` names `panelDrawing`.
- `refresh` calls `draw` three times (what the tab holds, "reading what is running…", the answer), and `draw`
  makes a new `Inputs.table` each time. That is in `cloudflare-iac.ojs` and is not changed here (below).

What ran on cb4 before the note, from `service.list` (public) read at 06:55:28 UTC: 22 of the 24 Workers have
a `verified.at` between 06:41:53 and 06:49:30 UTC, the earliest `brain-x-dashboard` and the latest
`brain-x-page`. The deployer writes one entry for a deploy (`brain-deployer.ojs`, `note("deploy/…")`); the
entries of that morning were not counted, since `inbox.list` is the owner's.

**Not reproduced: "making scrolling impossible".** The tool reads the table's place on the screen and the
pane's scroll height at every frame of the count. Both stayed as they were through the 18 draws, with the
table in the middle of the pane and with the pane scrolled to its end (`--at end`, 07:08:38Z): `moves 0`,
`far 0`, `heights 0`. A wheel or a trackpad was not driven. So this change is held to what was counted, the
draws, and whether his scrolling is mended by it is his to say.

### What changed

`tools/cloud-brain/cloud-brain.ojs`, and no other seed. 178 cells (`grep -c '^// %%'`), 175 before.

- `workerLink` reads the rows from the control when a link is asked for (`viewof services.value`) and does
  not name `services`. No cell of the module names it now.
- `deployerEntries(services)` is new: what the pump hands the deployer's entries to. An entry does not wait
  for the read it asks for, and the entries that come while a read is going are one read more when it ends. A
  read that fails holds nothing back. `deployerInbox` announces it.
- Two tests are new: `test_deployer_entries_of_one_poll_are_two_reads_of_services` and
  `test_no_cell_names_the_value_of_services`.

`tools/cloud-brain/page-redraws.ts` is new, with `tests/tools/page-redraws.test.ts`, and
`knowledge/changing-and-deploying-a-cloud-brain-worker.md` names it in step 4.

The alternative not taken: wait some hundreds of milliseconds after an entry and read once. It is one read
for a burst and not two, and it makes one deploy show later by the wait; the entries of a poll are handed
over with a call to `inbox.done` between them, so the wait would have to be longer than that call takes,
which was not measured.

### The counts after the change

Six entries, the worktree's build as the document (`module: "document"`, `refused 1`: the page's one
`getSource` was aborted, so the build's module ran):

```
$ bun tools/cloud-brain/page-redraws.ts --owner --seconds 40 --entries 6 --shell tools/cloud-brain/.emitted/cloud-brain.html
2026-10-13T07:20:26Z, exit 0
computed {}   draws 6   tables 0
calls     service.list 2, infra.getState 2, getInfo 48, inbox.done 6, inbox.poll 2, bluesky.poll 1

          table put in place   cells computed again        getInfo
before    18                   panel, panelDrawing 6 each   144
after      6                   none                          48
```

The "before" row is cb4's own page in the shell's layout and the "after" row a layout of the page's module
and brain-shell. A build of the seed without the two changes, in the after row's layout, gave the before
row's numbers (07:12:10Z; it also counted the new test cell that calls `workerLink`, 6).

One entry: `draws 3`, `getInfo 24` (07:16:01Z, before the rebase). No entry, 40 s: `computed {}`, `draws 0`
(07:21:31Z).

Tests, each run after the rebase onto `origin/main` at 5130491d, which brought in `brain-static.ojs`:

```
$ cd cloud-brain-dev && bun test.ts brain-x-page --with …/.emitted/page-loop.js
brain-x-page @tomlarkworthy/cloud-brain no hash (--with): 16 passed, 0 failed, 19 need a browser
$ bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloud-brain --emit page_service=…
"tests":35,"passed":35,"failed":[]        emitted hash ac2e21b2ec54
$ BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell …/.emitted/cloud-brain.html --times 20
"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]
$ tests/tools/suite.sh
1116 pass, 0 fail, 114 files
$ bun test --timeout=30000 ./tests/tools/page-redraws.test.ts
6 pass, 0 fail
```

Without the two changes and with the two tests (the seed edited back, built, `tab-tests.ts`): 33 of 35, and
the two that failed were the new ones, `Expected: 1 Received: 6` and `Expected [] Received ["workerLink"]`.

### Not tried, not done

- The owner's tab, his layout, his session, and whether his tab held the lease. Whether a loop ran there
  that the tool's page does not have is not known; none was found in two layouts.
- A wheel or a trackpad over the table while it is put in place.
- `refresh` of `serviceList` still puts the table in place three times a read, and does so when no row
  changed. The fix is in `cloudflare-iac.ojs`, whose deploy is the owner's (the deployer's hash covers it),
  and the function reaches the page with the shell. Filed as `services-table-drawn-three-times-a-read`.
- A read that fails was shown in the table before (`busy`), and still is: `refresh` catches it. A `refresh`
  that throws outside that was an error of the pump's status before and is dropped now. Tested with a fake
  only.
- The second read of a burst starts when the first ends, so an entry that comes during the second read's
  last draw is a third read. Not counted in a browser; the test holds it with a fake.
- `page-redraws.ts` without `--owner` was run once, before the change (06:57:14Z, `computed {}`), and
  `--at end` once, before the change.
