# A read of what runs put the Services table in place three times (`services-table-drawn-three-times-a-read`)

## Round 1, 2026-10-13

**cb4 does not run the change.** It is in `tools/cloud-brain/cloudflare-iac.ojs`, which the deployer's hash
covers, and the deployer is deployed by the owner (`rules.md`, Never). Nothing was emitted or applied, and
`seen.json` is not changed. Times are UTC, read from `date`.

The issue was filed by the writer of `page-services-refreshes-in-a-loop`, whose record has the owner's note
on the table ("This is repeatedly refreshing, making scrolling impossible") and the count that named this
function: one read of what runs, `draws 3`.

### What was wrong

`serviceList` of `cloudflare-iac.ojs`. `refresh` called `draw` three times (what the tab holds, the line
"reading what is running…", the answer). `draw` made a new `Inputs.table`, a new box for the reason and two
new buttons, and replaced every child of the control's body with them, whatever the rows were. `refresh` then
sent an `input` event with a new array as the value. `run` (the button Apply) called `draw` once more for each
Worker it applied.

The new test cell on the seed with `serviceList` as it was at `origin/main` (the test added, the function
not changed; `tab-tests.ts`, 28 of 29 passed):

```
test_a_read_of_the_same_rows_puts_no_new_services_table_in_place
  expected [0, 0, true, true]    tables added, input events, the same table node, the same value array
  received [3, 1, false, false]
```

### What changed

`tools/cloud-brain/cloudflare-iac.ojs`, the cell `serviceList` and one new test cell. 136 cells
(`grep -c '^// %%'`), 135 before.

- The body of the control is three nodes that stay: the table's place, the line of the reason, the buttons
  and the status, and the notices under them. The table is the one node that is replaced.
- `draw` keeps the text (`JSON.stringify`) of the rows the table in place was made from, the tests column
  among them, and makes a new table only when the text differs.
- With a Brain, `refresh` draws the table at the answer and not before it, so a read is one table at most.
  The first read of a control is the exception: it shows what the tab holds at once (state `unknown`) and
  the answer after, two tables.
- The line "reading what is running…" and "applying …" are written into a `span` beside the buttons. The
  two buttons are made again at each draw, since `disabled` and the count in "Apply N changes" are theirs.
- The box of the reason is one node for the life of the control. Before, each draw made a new one and gave
  it the text; the test holds that the node typed in is the node there after the reads of the test.
- The value is a new array, and the `input` event is sent, only when a row differs from the last value
  (the text of the rows). A read with the same rows leaves `viewof services.value` the same array.
- With no Brain nothing is changed but the above: one draw a read, and no event, as before.

Not taken: updating the cells of the table in place when a row differs. `Inputs.table` has no call for it,
and it would be a second way to draw a row beside the table's own.

`tools/cloud-brain/page-redraws.ts`: `DRAWS_A_READ` is 1 (was 3), so with entries the tool is exit 1 over 1
table for one entry and over 2 for more. New: `--differ`, with `--entries`. Each read after the entries are
handed over is answered with another hash for the first Worker, so its rows differ from the ones shown; a
count of 0 is then a failure, which says the tool saw no table where one had to be replaced. The tool counts
nodes added to the first child of the control, as before; in the new control the table is the only child of
it that is replaced.

`knowledge/changing-and-deploying-a-cloud-brain-worker.md`, step 4, has two lines more on the count.

### The counts

All in a local headless Chrome (151.0.7922.34), the page answered as the owner's by the tool (no session
held, no call of the owner sent to cb4). "the build" is `--shell tools/cloud-brain/.emitted/cloud-brain.html`,
the worktree's build, and each of its lines says `"module":"document","refused":1`: the build's module ran.

```
$ bun tools/cloud-brain/page-redraws.ts --owner --seconds 40 --entries N [--differ] [--shell …]

                              at          draws   computed   exit   calls of the count
the build, 1 entry            08:08:09Z   0       {}         0      infra.getState 1, service.list 1, getInfo 24
the build, 6 entries          08:09:12Z   0       {}         0
the build, 1 entry, --differ  08:11:50Z   1       {}         0      infra.getState 1, service.list 1, getInfo 24
the build, 6, --differ        08:12:54Z   2       {}         0      infra.getState 2, service.list 2, getInfo 48
cb4's page, 1 entry           08:10:16Z   3       {}         1      "the table was put in place 3 times, and 1 at most for 1 entry"
cb4's page, 1, --differ       08:13:58Z   3       {}         1      the same line
```

So on the build a read whose rows are the ones shown adds no table, and a read whose rows differ adds one;
six entries are two reads (`page-services-refreshes-in-a-loop`) and two tables. cb4's page is as it was, and
the tool now fails it with an entry until the deployer is deployed.

Tests, each after the last edit of the seed:

```
$ cd cloud-brain-dev && bun test.ts @tomlarkworthy/cloudflare-iac --with …/.emitted/services-table.js
brain-deployer @tomlarkworthy/cloudflare-iac no hash (--with): 26 passed, 0 failed, 3 need a browser
$ bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloudflare-iac     three runs
"tests":29,"passed":29,"failed":[]        each of the three
$ bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloud-brain
"tests":35,"passed":35,"failed":[]
$ bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-deployer
"tests":59,"passed":59,"failed":[]
$ bun test --timeout=30000 ./tests/tools/page-redraws.test.ts
6 pass, 0 fail
$ tests/tools/suite.sh
1154 pass, 0 fail, 118 files
```

`verify-run.ts` was not run: the brief has it that `brain-deployer` gives it no verdict ("the Worker did not
say what it runs"), and three runs of `tab-tests.ts` stand in its place.

The new test is one of the 3 that need a browser. It names `MutationObserver` as
`document.defaultView.MutationObserver`: a cell that names `MutationObserver` itself is failed by `test.ts`
with "MutationObserver is not defined" (seen, 1 failed), where one that names `document` is counted as
needing a browser.

### What the issue said that is not so

The issue's last sentence: "The function runs in the page from the shell's copy of the module, so the
change reaches the page when the shell is posted." The shell has no copy. In the worktree's build,
`grep -c shownTable` (a name the new function has) gives 4 for `cloud-brain.html` and 0 for `shell.html` and
`verify.html`; the document cb4 serves at `/` has 0 lines with "reading what is running" (08:15:44Z), and
`cloud-brain-dev/deploy/@tomlarkworthy/cloudflare-iac.js`, which `sync.ts` read from cb4 as the module of the
Worker `brain-deployer` (`deploy/services.json`), has 1.

Where the page takes it from: `brainModules` of `brain-shell.ojs` is the answer of the deployer's
`infra.getModules`, a public read. Read at 08:22:44Z from `https://cb4-deployer.endpointservices.workers.dev`:
26 modules, and of `@tomlarkworthy/cloudflare-iac`

```
worker brain-deployer   hash 14f0fb7dd89d   text 175798 characters   "reading what is running": yes   "shownTable": no
```

So the page runs the copy the deployer keeps, under the deployer's hash, and the change reaches the page with a
deploy of the deployer. A post of the shell does not bring it. (`getSource?worker=brain-deployer` at the
kernel answers `{"error":"NotFound","message":"brain-deployer"}`: the kernel's `getSource` does not have the
deployer, so that read says nothing of this.)

### For the owner: the deploy

Not run here, and by no agent of the loop. The deployer is installed with
`BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts install-deployer` from a build of `main`
(`tools/cloud-brain/running-a-cloud-brain.md`, line 83; `knowledge/changing-and-deploying-a-cloud-brain-worker.md`,
step 4, names it as how a change to the wrapper in `cloudflare-iac.ojs` reaches the Workers). What else that
command changes on cb4, and what the owner runs after it, was not read for this task. After it, on a page opened anew:
`bun tools/cloud-brain/page-redraws.ts --owner --seconds 40 --entries 1` is expected to print `draws 0` and
exit 0, and with `--differ` `draws 1`.

### Not tried, not done

- The owner's tab, his layout and his session; a wheel or a trackpad over the table. Whether his scrolling
  is mended is his to say, as in the record before this one.
- A press of Apply. `run` now draws under the table only (`draw(false)`) and the table follows at the answer
  of the read that ends it. The new test presses no button.
- The notices ("Waiting for approval", "Refused", "was put back") are made as before and in a node of their
  own. No test has a result that shows one.
- The link of a Worker's name (`moduleLink`) is made when a table is made. It was made again at every read,
  and is now made again when a cell differs. If the address it holds depends on the layout at that time, it
  is older for longer. Not looked at.
- Two reads at once are in the test with the rows shown (no table). Two at once whose answers differ from
  each other were not tried: each ends with a draw of what was read last.
- A table of more than 40 rows, where `Inputs.table` adds rows as it is scrolled: the tool's count is of
  the first child of the control and would not count those. cb4 has 24 rows.
- `tools/cloud-brain/cloud-brain.ojs`, the comment over `deployerEntries`, still says "a read puts the table
  in place three times". It is the page's seed, a change of it moves `brain-x-page`, and it is left for the
  next change there.
- `--differ` was run with 1 and 6 entries on the build and with 1 on cb4, once each.
