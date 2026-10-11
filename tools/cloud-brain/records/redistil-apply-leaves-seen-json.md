# redistil-apply-leaves-seen-json

## Round 1, 2026-10-11: `redistil --apply` moves the entry of each Worker it deployed

`brain.ts apply` wrote `seen.json` for each result. `brain.ts redistil --apply` printed its results
and wrote nothing, so after the sweep of 2026-10-11 08:23 (event 375) `brain.ts saw` read `MOVED`
for Workers nobody had put back. The issue was opened at 11:05 CEST (event 411). The change is in
`tools/cloud-brain/brain.ts`, `tests/tools/brain-seen.test.ts` and the `redistil` row of
`knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, first committed 2026-10-11
11:11:11 +0200. No seed, no Worker, no deploy.

### What was read first

`BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts saw`, main checkout, 2026-10-11 11:10:58 CEST,
before the change:

```
brain                9856f86908b6 MOVED: runs b1049a69c17f
brain-core           059c03d2412f MOVED: runs 716194d83bd1
brain-x-bluesky      d63b5fccfa5f MOVED: runs 05a51f502310
brain-x-browser      ef7bf8d54793 MOVED: runs df61083604fb
brain-x-git          65d26e97c27d MOVED: runs f335934b5ed3
brain-x-page         f13f461a23af MOVED: runs e45568e2faf0
```

Six `MOVED`, six with an entry that matches (`brain-x-container`, `-issues`, `-knowledge`,
`-library`, `-snapshot`, `-static`), eight with `none` (`brain-db`, `brain-x-ai`, `-blob`, `-feed`,
`-inbox`, `-logs`, `-proxy`, `-whatsapp`), two removed Workers with `null`. The six `MOVED` are
the ones event 410 named. That each of the six was moved by the sweep and by nothing else was not
checked by me: the issue says it took a `logs.query` with the owner's session.

The deployer's row for a Worker a redistil deployed (`brain-deployer.ojs`, `redistil`):
`{ worker, module, state: "changes", from, hash, applied }`, where `applied` is the state of that
deploy. A Worker it left is `{ state: "same", hash }`.

### What changed

After the results are printed, for each row with `state: "changes"`, an `applied` that stands
(`deployed`, `probation`, `verified`, `failing`, the list the apply branch used, now one constant
`STANDS` read by both) and a hash:

- the entry is `from`: it is written with `hash` and the time of the command;
- the entry is another hash: it is left, and a line says so;
- there is no entry: none is made, and a line says so.

```
  brain-x-w moved from aaaaaaaaaaaa and seen.json has cccccccccccc for it: the entry is left. Compare what runs (curl "/xrpc/com.lopecode.brain.getSource?worker=brain-x-w", field text) with the seed, then: saw brain-x-w
  brain-x-w moved from aaaaaaaaaaaa and seen.json has no entry for it: none is made. Compare what runs (…) with the seed, then: saw brain-x-w
```

A row with `state: "same"` writes nothing, with or without `--apply`. Nor does `applied` of
`put-back`, `refused` or `waiting`, or a redistil with no `--apply`.

### The two choices the issue left

**A Worker with no entry gets none.** `seen.json` is what `apply` sends as `was`, and a Worker
with no entry has its first apply refused until its source is compared with the seed (`FIRST` in
`brain.ts`, `records/seen-json-6-of-19-workers.md`). A redistil distils the source the deployer
keeps; it says nothing about the seed here. An entry made by it would let the next `apply` from
this checkout go over a change made elsewhere. The other side, an entry for every Worker moved,
would have made step 1 of a pass read fewer `none` lines; its cost is that guard. `philosophy.md`
line 1 (a change that lets a caller do what it could not is not made on an agent's judgment) and
line 2 (the smaller side) both give this one.

**An entry at another hash is left.** The same reason: when the entry is not `from`, this
checkout had not seen what ran before the redistil either, and writing the new hash would hide
that. The cost is real today: the four `brain-x-*` entries above are behind, so the next sweep
will leave them again and print four lines. They are cleared once with `saw`, below.

A redistil row with `state: "same"` whose entry differs is not written either. To a redistil a
Worker that was put back and one deployed from elsewhere both read `same`, and that mismatch is
what step 1 of a pass is there to read.

### Tests

`tests/tools/brain-seen.test.ts` went from 5 cases to 16. The stand-in deployer answers
`infra.redistil` with rows the test gives it. Run in the worktree, `cd tests/tools`:

```
BRAIN_TS=<main checkout>/tools/cloud-brain/brain.ts bun test brain-seen.test.ts   ->  10 pass, 6 fail
bun test brain-seen.test.ts brain-cli.test.ts brain-confirm-names-a-worker.test.ts ->  26 pass, 0 fail
bun test                                                                          ->  86 pass, 1 fail
```

The first line is `brain.ts` before the change. Four of its six failures are the defect
(`Expected: "bbbb…" Received: "aaaa…"` for `deployed`, `probation`, `verified`, `failing`); two are
the new lines not printed. The five new cases that pass before the change are the ones that
assert nothing is written. The one failure of the last line is in `sync-module.test.ts`
("ordering applies to blocks a module reads off the DOM"), which reads no file of this change;
the same file gives 6 pass, 0 fail in the main checkout, where the notebooks are not links.

My first run of the four cases failed on a pattern of mine (two spaces after `->` in the printed
row), not on the defect. The counts above are after that was corrected.

### Not tried

- No `redistil --apply` was sent to cb4. It is a sweep of every Worker, and the kernel, the core
  and the deployer are among what it may deploy. The behaviour is shown against the stand-in only.
- The stale entries were not cleared. `seen.json` in the main checkout had another session's
  uncommitted edit when this began. The call, once someone has read that the six moved by the
  sweep alone: `brain.ts saw brain brain-core brain-x-bluesky brain-x-browser brain-x-git brain-x-page`.
- `probation` writes the new hash, as `apply` does. A Worker put back after it reads `MOVED`,
  which is the case step 1 is for. A put-back that arrives after the command returned was not
  simulated.
- Two rows for one Worker in one answer, and a row with `applied` and no `from`, were not tested.
  The deployer's code makes neither.
- With `BRAIN_STATE_DIR`, `seen.json` is still the one beside the script that ran: a worktree's
  `brain.ts` writes the worktree's file. That is so for `apply` too and was not changed.
