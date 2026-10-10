# seen-json-6-of-19-workers

## Round 1, 2026-10-10: a Worker with no entry is refused in its own words

`tools/cloud-brain/seen.json` had an entry for 6 of cb4's 19 Workers. `brain.ts apply` of any
other was refused with the advice written for a Worker that moved: read its source with `--owner`,
merge it into the seed. Two writers met it on the first deploy the loop made of a Worker
(`bluesky-tick-poll-test-no-overlap`, event 314; `browser-run-timeout-test-wall-clock`, event 318),
and in the second the seed was ahead of cb4, with nothing to merge. The change is in `brain.ts`,
with a test file. No seed and no Worker changed.

### What was read first

`brain.ts saw`, main checkout, before the change: 6 lines with a hash, 13 with `none` and nothing
after it. `brain.ts state --full`: every one of the 19 Workers has `deployedAt` as a number.
`brain.ts curl "/xrpc/com.lopecode.brain.getSource?worker=brain-x-ai"` with no `--owner` answered
with `worker`, `hash`, `module`, `text`: the read needs no session.

### What changed

The refusal for a Worker with no entry, before and after (the test's stand-in Worker):

```
w.json not sent: brain-x-w runs aaaaaaaaaaaa and seen.json has no hash for it. Read its source (curl "/xrpc/com.lopecode.brain.getSource?worker=brain-x-w" --owner), merge it into the seed, build and emit again, then: saw brain-x-w

w.json not sent: brain-x-w runs aaaaaaaaaaaa and seen.json has no entry for it: no apply or saw of it is recorded in this checkout, which does not say it changed elsewhere. Compare what runs (curl "/xrpc/com.lopecode.brain.getSource?worker=brain-x-w", field text) with source.text of w.json. If every difference is a change made in this checkout, the seed is ahead: saw brain-x-w, then apply w.json again. If what runs has text the seed lacks, merge it into the seed, build and emit again, then: saw brain-x-w
```

- When the emitted record's hash is the hash that runs, the refusal says so in place of the
  comparison: "has the same hash, so the seed builds to what runs and there is nothing to deploy".
  It compares the two hashes `apply` already holds and makes no call.
- `remove` of a Worker with no entry names the read and `saw`.
- `--owner` is gone from every advice line (`HOW`, also printed after a refusal by the deployer).
- `saw` with no name prints, after each `none`: `no entry: its first apply from here is refused
  until its source is compared and: saw <worker>`.
- `saw NAME` wrote `at: 0`. It writes the `deployedAt` of what runs, and the time it ran only
  when the deployer gives none. The refusal of an old record reads "was emitted before <worker>
  last changed (<date and time>)"; it had the time only and said "in this checkout".

### Why not the time `saw` ran

The triage (event 333) said "saw writes the time it ran". The order the same triage names is
compare, `saw`, apply the record already emitted. With the time `saw` ran, the check of line 113
(`mtime of the record < at`) refuses that record, and the tab that emitted it is closed by then.
That is why the line was written with 0. `deployedAt` keeps the order and makes the check refuse
what it describes: a record emitted before the Worker that runs was deployed. The fifth test holds
both halves (a record 60 s older than the deploy is not sent, one 60 s newer is sent with `was`).

### Not done, with the reason

- The 13 missing entries are not filled. Nobody compared those Workers with their seeds, and an
  entry says a comparison was made.
- `redistil` is not in the advice. It distils again the source the deployer keeps and compares that
  with what runs; the seed of this checkout is not read by it, so `same` says nothing about which
  of seed and Worker is ahead. The issue's first side rested on it.
- `apply` does not fetch `getSource` and print a diff. The writer reads the direction; the message
  says how to tell.

### The three entries with `at: 0`

They are the three Workers the loop has deployed. Step 10 of the implementer brief runs `saw <worker>`
after `apply`: `apply` had written the time, and `saw` then wrote 0 over it. That step now writes
`deployedAt` and needs no change.

`saw brain-x-bluesky brain-x-browser brain-x-issues`, run in the worktree with the changed
`brain.ts` after the listing showed no `MOVED` for them. The hashes are the same; `at` is now
1791658197500, 1791658336105 and 1791657425818, the `deployedAt` of each.

### The test

`tests/tools/brain-seen.test.ts`, 5 tests. Each runs a copy of `brain.ts` in a directory of its
own (`seen.json` is read beside the script) against a `Bun.serve` that answers `infra.getState`
and counts what is posted. `brain.ts` could not be pointed at such a server: the deployer's
address was built from the state file's `subdomain` under `workers.dev`. A state file may now carry
`deployerUrl`, used only when it is `http://127.0.0.1:<port>`. The state file already holds the
recovery key that is sent there.

```
cd tests/tools && bun test brain-seen.test.ts brain-cli.test.ts          14 pass, 0 fail (5 + 9)
BRAIN_TS=<main's brain.ts with the one line for deployerUrl> bun test brain-seen.test.ts   0 pass, 5 fail
```

The 5 fails on the old text are the wording, the empty `none` line and `at: 0` (received
`"…seen.json has no hash for it. Read its source (… --owner), merge it into the seed…"`).

### Not tried

- No `apply` was sent to cb4 with the changed `brain.ts`; the refusal was read from the stand-in
  only. On cb4 the changed file ran `saw` (a read of `getState`, and the three entries above).
- A Worker of the deployer's state with no `deployedAt`: the fall-back to the time `saw` ran is
  not under test, and none of cb4's 19 lacks it.
- Whether the browser's emitted hash always equals the deployer's for the same source. `apply`
  prints a line when they differ; if they did for a Worker with no entry, the writer would get the
  comparison advice, which still holds.
- The clocks: `deployedAt` is the deployer's, the record's `mtime` is this machine's.
