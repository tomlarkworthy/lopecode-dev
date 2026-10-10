# stale-panel-after-deploy

The issue (opened 2026-10-10 19:49:36 CEST by the reviewer of `page-not-redeployed`, started
19:53) says: `brainBoot` asks the deployer for the modules once, when the page opens, and
`joinModules` leaves a module the page already has alone, so a tab opened before a deploy of
`brain-x-issues` shows the panel of that time until it is loaded again, and nothing on the page
says so. The issue itself says this was "read from the code only", not seen in a tab.

Triage (event 230, 19:50:17) chose between two sides: the issues panel says it for its own
Worker, or `brain-shell` says it for every module. It took the first. The second changes what
the kernel serves, which is the owner's.

## What changed, 2026-10-10

One seed, `tools/cloud-brain/brain-issues.ojs`, 99 lines added and 6 removed against `main`. No
change to the Worker's handlers, its SQL or the policy.

- `issuesPanel` takes `joined`, `worker` (default `brain-x-issues`) and `reload`. With a `joined`
  hash it asks the kernel `getInfo?worker=brain-x-issues` and compares the `hash` of the answer
  with `joined`. When they differ it draws one line under Refresh, with a **Reload** button:

  ```
  A newer panel is deployed: brain-x-issues is bbbbbbbbbbbb, this page has aaaaaaaaaaaa. [Reload]
  ```

- It asks when the panel is made, on **Refresh**, on `visibilitychange` when the tab is visible,
  and on `focus` of the window. Not on the 5 s poll.
- A call that fails leaves the line as it was. Equal hashes remove it (a Worker put back to the
  version the page has).
- A new cell, `issuesJoinedAt(listed, worker)`, reads the hash from what the deployer listed as
  the page opened. `viewof issuesView` passes `issuesJoinedAt(brainModules)`.
- A new import, `brainModules` from `@tomlarkworthy/brain-shell`. `@tomlarkworthy/cloud-brain`,
  which this module already imports, has imported the same cell since before this change
  (`cloud-brain.ojs`, the import of `brain-shell`).
- The first `md` cell has a bullet for the line and the three new options.
- A test, `test_issues_panel_says_when_a_newer_one_is_deployed`.

## Why getInfo and not the deployer's list

The hash the page joined at is already on the page: `brainModules` is the answer `brainBoot`
used. For the hash that runs now there were two public calls. Both read on cb4 with
`curl` and no session, before the issue was started at 19:53 (the time of each call was not noted):

```
<deployer>/xrpc/com.lopecode.brain.infra.getModules      3,414,453 characters, 39 modules with their text
<kernel>/xrpc/com.lopecode.brain.getInfo?worker=brain-x-issues   2,952 characters
both answered hash 07fd61782e5b… for brain-x-issues
```

`getModules` is what the issue names. Asked on every focus it would be 3.4 MB each time, so the
panel asks `getInfo`.

## Tests

Before the fix, with the test added and nothing else, `bun tools/lope-tests.ts … --filter test_issues`:

```
✗ test_issues_panel_says_when_a_newer_one_is_deployed
    issuesJoinedAt is not defined
Tests: 14 passed, 1 failed, 0 timed out, 0 skipped, 15 total
```

The cell names `issuesJoinedAt`, which did not exist, so the runtime failed it before its body
ran: this run does not show the assertions on the line failing. A panel from before the fix has no
`newer` to read, so they would have. The defect itself (a real tab held across a
real deploy) was not reproduced: see Not tried.

After the fix: 15 of 15 `test_issues_*` cells in a headless QA tab on the worktree's build, by the
snippet of the implementer brief; the tab's clock read 19:55:48 CEST. The same 15 with
`lope-tests.ts` in 14.66 s. It was 14 before, and the 14 pass unchanged.

What the new test reads, with a fake `getInfo` that answers a hash the test sets:

```
joined A, running A, panel made     getInfo asked once for brain-x-issues, no line, no button
running set to B, nothing asked     no line
Refresh pressed                     asked twice; the line with bbbbbbbbbbbb and aaaaaaaaaaaa; Reload calls reload once
getInfo fails                       the line stays
running back to A                   the line goes
visibilitychange, then focus        one more call each; the line is back
after invalidation                  the two events ask nothing
no joined hash                      Refresh and check() ask nothing
issuesJoinedAt                      the hash of the row whose worker is brain-x-issues; null for null and for an answer with an error
```

The line was also drawn in that tab from a rig with one issue and looked at in a screenshot: it
is between the Refresh row and the policy line, the button to its right.

## Not tried

- Not seen on the cb4 page. The panel is drawn for the owner signed in, and an agent does not
  open the Brain's page in a browser of the cluster (the rules, commit `f92e5f2f`, 19:54:01). So no
  tab was held across a real deploy, and `brainModules` was not read on a page served by a Brain:
  that the row for `brain-x-issues` there has `worker: "brain-x-issues"` and the same `hash` that
  `getInfo` answers was read with `curl` only.
- A page whose file already holds `@tomlarkworthy/brain-issues` ("in this file" in the boot
  table). There `brainModules` still lists the deployer's hash, which is not what the page runs,
  and the line would be silent when it should not be. The shell a Brain serves holds no service
  module, so this is a copy saved from a Brain and served by one.
- `getInfo` answering 404 because the Worker was removed. It is treated as a failed call.
- The line says "panel", and the hash is the Worker's. A deploy that changed only the handlers
  draws the line too; the panel after Reload is then the same.
- Whether Reload loses a draft: it does (`location.reload()`), and the `md` cell says so. No
  draft is kept anywhere.
- The other modules of the page. A tab held across a deploy of any other Worker still says
  nothing. That is the side triage left for the owner.

## Round 2, 2026-10-10: review 1

Review 1 (event 253, 20:09:01 CEST) asked for changes, two findings. Both are in
`tools/cloud-brain/brain-issues.ojs`; seed commit `bb7259ed`, 20:19:50.

**1. The line was false after the page itself deployed `brain-x-issues`.** `joined` was
`issuesJoinedAt(brainModules)`, a value from when the page opened. The page loads a Worker's
module again after it deploys one (`loadService`, `cloud-brain.ojs` 766-786) and writes the hash
in `fromBrain[module]` (line 785). The panel then said "this page has OLD" of a page that had NEW.

- `issuesJoinedAt(listed, loaded = {}, worker)` reads the row of `loaded` whose `worker` is
  `brain-x-issues` first, and the deployer's list when there is none. The second argument was
  `worker` in round 1; nothing but `viewof issuesView` and the test called it.
- `viewof issuesView` passes `joined: () => issuesJoinedAt(brainModules, fromBrain)`. `fromBrain`
  is a new import from `@tomlarkworthy/cloud-brain`, beside `client` and `session`.
- `issuesPanel` takes `joined` as a hash or a function. `check()` calls it before asking (none:
  nothing is asked) and again when the answer lands, and the line is drawn from the second.

**2. Of two answers out of order, the last to land drew the line.** `check()` now numbers its
calls. An answer to a call that is not the last one made draws nothing. A tab shown again still
makes two `getInfo` calls (`visibilitychange` and `focus`), not one as comment 1 said; they are
not joined into one.

One more option, `listen` (default true). `listen: false` makes a panel that adds no listener
and does not ask when made. The new assertions use it: a listening panel hears every
`visibilitychange` and `focus` of the page, and the first form of these assertions, in a cell of
its own with a listening panel, failed under `lope-tests.ts` (`Expected: true, Received: false`)
because the events of `test_issues_panel_says_when_a_newer_one_is_deployed`, which runs beside
it, made a later call on its panel. They are now in that cell, after its events, with a panel
that does not listen. Round 1's half of the cell still counts calls on a listening panel.

### Tests

The count is 17 `test_issues_*`: 15 at round 1, 2 added by `panel-for-your-attention`, none
added here (one cell is longer).

17 of 17 in a headless QA tab on the worktree's build of `bb7259ed`, by the snippet of the
implementer brief, `bad []`, the tab's clock 20:20:13 CEST, `visibilityState` visible. The same
17 with `lope-tests.ts` in 14.88 s.

Each defect put back in the seed alone, built to another file, `lope-tests.ts --filter test_issues_panel_says`:

```
no order guard (n !== asks taken out)        0 passed, 1 failed   expect(received).toEqual(expected)
joined read once, when the panel is made     0 passed, 1 failed   expect(received).toEqual(expected)
```

Which `toEqual` failed in each was not read (the output was cut at the first lines of the
difference). Before the fix, the new assertions as a cell of their own failed on
`joined.slice is not a function`: round 1's panel has no function form, so that run shows the
form missing and not the false line.

What the added half reads, with `getInfo` answering from a list of `[milliseconds, hash]`:

```
page has A, Worker A, check()                       asked once, no line
page and Worker both B (the page deployed)          no line
Worker C                                            "brain-x-issues is cccccccccccc, this page has bbbbbbbbbbbb."
answer C in 60 ms, page has C before it lands       no line
two calls: B in 150 ms, then C at once; page has C  no line after both
two calls: C in 150 ms, then B at once              the line, "is bbbbbbbbbbbb, this page has cccccccccccc."
page has nothing                                    nothing asked
issuesJoinedAt(listed A, loaded B)                  B; A with no row loaded; B with no list; null with neither
```

### Not tried, round 2

- Still not seen on the cb4 page, for the reason of round 1. No page deployed
  `brain-x-issues` with this panel on it. That `fromBrain` on a Brain's page has a row with
  `worker: "brain-x-issues"` and the hash `getInfo` answers is read from `cloud-brain.ojs` 785
  and from `verifyService`, which compares the same two (line 807), not from a page.
- A false line for a short time after the page deploys. When the deploy changes `issuesPanel`,
  `applySource` makes `viewof issuesView` again and the new panel asks at once, before
  `loadService` reaches line 785: `fromBrain` still has the old hash, and the line is drawn if
  `getInfo` answers before 785 runs. It goes at the next question. Read from the code, not timed.
  For the owner `verifyService` then runs this module's tests, and
  `test_issues_panel_says_when_a_newer_one_is_deployed` sends `visibilitychange` and `focus` to
  the document, which the page's panel hears; that this clears the line was not seen.
- Round 1's "in this file" case. Once `assembled` has run `loadService` for the Worker,
  `fromBrain` has the hash of what the page's copy was made the same as, so the comparison is
  with what the page runs. Before that the deployer's list is still used. Read from the code.
- A row of `fromBrain` that goes away while the line is drawn: the line would stay. Nothing
  removes a row (`grep -n fromBrain tools/cloud-brain/cloud-brain.ojs`: lines 683, 752, 785).
- The hazard to round 1's half of the test: the owner coming back to the tab while the page
  runs it adds a `getInfo` call to the counts it expects, the test fails, and a failed test on
  the page has the Worker put back. Not changed here; the review did not ask.
