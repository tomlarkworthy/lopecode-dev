# bluesky-tick-poll-test-no-overlap

## Round 1, 2026-10-10: the rig holds the first `getLog`, and the cell says which call was skipped

`test_bluesky_tick_and_poll_deliver_once` (`brain-bluesky.ojs`) started `rig.tick()` and
`rig.poll()` in one `Promise.all` and expected 4 calls of `getLog`. Nothing in `blueskyRig` kept
the first poll running while the second started. Found in `brain-tests-fail-headless-unread`
(`records/brain-tests-fail-headless-unread.md`). No line of the service is changed.

### Reproduced

Worktree at `lopecode-dev@5387a6a0`, `build.ts --out`, then
`bun tools/lope-tests.ts …/.emitted/cloud-brain.html --filter test_bluesky_tick_and_poll_deliver_once`:

```
✗ test_bluesky_tick_and_poll_deliver_once
    Expected: 4
    Received: 5
Tests: 0 passed, 1 failed, 0 timed out, 0 skipped, 1 total
```

### What changed

Seed commit `cc636768` (committed 2026-10-10 20:47:29 +0200), one file.

- `blueskyRig`: the fake's `getLog` branch waits for `net.hold` when a test has put a promise
  there, and clears it first, so one call waits and the later pages do not.
- The cell puts a promise in `rig.net.hold`, starts the tick and the page's poll, and waits for
  the first of the two to answer (`Promise.race`). The call that took the row `busy` cannot end
  before the test opens the promise, so the other one finds `busy` set in every runtime. At that
  point the cell expects: at most 1 `getLog` asked, the inbox empty, `busy` a number, no row
  `polled`. It then opens the promise and expects the page's answer to be
  `{ configured: true, skipped: "a poll is running" }` or `{ configured: true, events: 5, taken: 5 }`
  according to which call the race named, `polled.by` to be the other one with 5 events, 4 calls
  of `getLog`, and no row `busy` left. The lines after that are as they were.
- The cell's value ends with which call was skipped.

A dead end: the first version expected exactly 1 `getLog` at the moment the skipped call answers.
With no browser that held. In HeadlessChrome 151 it was 0 (`Expected 1, Received 0`, tab
`r=8101`): the skipped call answered while the other was still signing in, before its first
`getLog`. The row `busy` is what shows the overlap, so the count there is `<= 1`.

### Tests

| Run | Result |
|---|---|
| `bun tools/lope-tests.ts … --filter test_bluesky`, after the change | 21 passed, 0 failed, 0 timed out |
| Browser, HeadlessChrome 151.0.7922.34, QA tab `r=8102` on the worktree's notebook, the snippet of step 8 of the implementer brief, 20:47:10 CEST by the tab's clock | 21 cells, 0 failed |

The cell's value in that tab: `5 messages over 3 pages, read 1.6 times, 5 entries; the tick found a poll running`.

The rebase onto `main` after these runs brought in `.claude/skills/brain-maintenance/agents/reviewer.md`
and `oversight.md` only; nothing was built or run again.

### A deploy

The emitted record's `source.js` (104356 characters) is the whole module and contains
`test_bluesky_tick_and_poll` and `net.hold` (read from the emitted file), so the change is a
deploy of `brain-x-bluesky`, which ran `102b0cde7225` before it. Whether `worker.js` differs
from the one deployed was not compared.

### Not tried

- Which of the two calls is skipped with no browser. `lope-tests.ts` does not print a cell's value.
- The order in which the page's poll takes `busy` and the tick is skipped. The cell accepts either
  order; one run in a browser gave "the tick"; no run was seen to give "the page".
- Why the two calls overlapped in Chrome and not in bun before the change.
- The cluster's browser (Chrome 128): the rules forbid opening the Brain's page there.
- A call on cb4 that shows the change: it is in a test cell, and `bluesky.poll` on cb4 reads Bluesky.
