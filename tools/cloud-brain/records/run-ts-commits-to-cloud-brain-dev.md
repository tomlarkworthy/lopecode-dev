# run-ts-commits-to-cloud-brain-dev

Issue opened 2026-10-14 17:47:32 UTC by `out-5bc2ed`, on the owner's A of `new-loop-takes-tooling-issues` (comment
7454: "Yes A, does the loop pull fresh tools automatically? I guess that can happen when \"applied\""), labelled
`major` at 17:50:22 UTC. Written by `impl-1a8a44`.

## Why

`drain.ts` took only issues `about` a `brain-x-*` service, and `run.ts`'s product was a patch of one service's module,
deployed by `ship.ts`. An issue about `cloud-brain-dev`'s own files had no path through the new loop, and nothing
brought the laptop's checkout to the tools that were pushed.

## What changed

In `cloud-brain-dev`, one commit in the clone of this worktree, pushed with `worktree.sh --push-dev`:

- `patch.ts`. `devPatch(clone, upstream)`: `git fetch` of `upstream`'s main into the clone, the merge-base with `HEAD`,
  and `git diff --binary` from there to `HEAD` over every file, with its SHA-256 and the names of the files.
  `DRIVER` and `touchesDriver(files)`: `run.ts`, `ship.ts`, `push.ts`, `drain.ts`, `laptop.ts`, `laptop.sh`,
  `sandbox.ts`, `patch.ts`, `work.ts`, `apply.ts`, `sync.ts`, `roles/dev-writer.md`, `roles/dev-reviewer.md`. `fastForward(dir)`: a fetch of `origin main` and a
  `merge --ff-only FETCH_HEAD`, with a change in no commit under `deploy/` put back first and one elsewhere a stop.
- `push.ts`, new: what `ship.ts` is for a service. It checks the record as `ship.ts` does (the submit's `patch:`, a
  pass of it by another actor, no review against), makes a clone with `work.ts open`, makes `devPatch` there, and
  pushes that clone's `HEAD` to `main` with no force, a token of 60 s from `git.token` asked with `GIT_TOKEN`, to
  `remote.origin.pushurl` of its checkout. A refusal writes a comment and moves nothing. It pushes from `in-review`
  with no `major` (then moves `done` with refs `patch:` and `commit:`), or from `done` after `to-approval` and
  `approve` (then comments, once, keyed `push-ID/pushed-<submit seq>`). A driver file with no approve is a stop.
- `run.ts`. `about` `cloud-brain-dev`: the label `major` does not stop it; the agents are told to read
  `roles/dev-writer.md` / `dev-reviewer.md` of the checkout; the patch is `devPatch`; the driver's tools are not
  copied over the reader's clone; a patch with a driver file gets the label `major` before the reader starts; on a
  pass a `major` issue is moved `awaiting-approval` (outcome `awaiting-approval`, exit 0), another runs `push.ts`
  (outcome `pushed` or `not-pushed`). `GIT_TOKEN` and `GIT_TOKEN_FILE` are in `NOT_PASSED`.
- `drain.ts`. `doable(..., { dev })` takes `about` `cloud-brain-dev` when `dev`, which the drain sets when
  `GIT_TOKEN` or its file is set; for such an issue `major` is not one of the labels that keep it out.
- `laptop.ts`. `fastForward` of its checkout before each drain; a refusal ends it; when `laptop.ts` itself came in
  changed it starts the new one and exits with its code. `laptop.sh` reads `loop-git` as `GIT_TOKEN` (empty when
  not kept).
- `work.ts patch --dev`: `devPatch`, for the writer's `--ref patch:`.
- `roles/dev-writer.md`, `roles/dev-reviewer.md`, new; `README.md`, "A change to this repository: push.ts" and two
  lines it made untrue (doable, `laptop.sh`'s tokens).

In `lopecode-dev`: `tests/tools/run-ts-commits-to-cloud-brain-dev.test.ts`, and this record.

Decisions taken, with the line that took each:

- **The briefs are files of `cloud-brain-dev`, not of the Brain.** `rules.md`, "The files of the Brain an agent
  reads": a put with `loop-roles` is the overseer's, or a writer's whose issue is a task of a spec the owner
  approved; comment 7454 is an A to a choice, not a spec. The agent reads them from the checkout `run.ts` runs from,
  which the sandbox already gives it read-only.
- **The push after an approve is `push.ts ID` run by hand.** The `approve` move leaves the issue `done`; nothing in
  the loop runs `push.ts` then. Wiring it into `laptop.ts`'s wake is more code in a driver file (philosophy line 2:
  the smaller side).
- **`DRIVER` is wider than the owner's list** by `push.ts`, `work.ts`, `apply.ts` and `sync.ts`, each of which runs
  outside the sandbox (`apply.ts` and `sync.ts` from `ship.ts` with the key), and by the two dev briefs, which a writer
  could otherwise rewrite for the next writer with one reviewer's pass. Philosophy line 1: a change that only narrows
  what passes without an approve is taken.
- **A dev issue is doable only with `GIT_TOKEN`**, so the Fly machine (no such token) spends no writer and reader on
  an issue it cannot push.

## Tests

```
bun test --timeout=30000 ./tests/tools/run-ts-commits-to-cloud-brain-dev.test.ts     11 pass, 0 fail, 55 expect() calls
```

With `run.ts`, `drain.ts`, `patch.ts`, `laptop.ts`, `laptop.sh` and `work.ts` put back to 7df3c5b (`push.ts` and
`roles/` kept): 0 pass, 9 fail of the 9 tests the file had then. With `GIT_TOKEN` taken out of `NOT_PASSED` the
`run.ts` brief test fails; with the driver stop of `push.ts` taken out the stops test fails; with the `major` label of
`run.ts` taken out the `awaiting-approval` test fails (these three runs were made before `roles/` joined `DRIVER`
and before the `work.ts patch --dev` and detached-head lines were added to the test). The `devPatch` test runs
`work.ts patch --dev` in a writer's clone and gets `devPatch`'s SHA-256 and bytes; the `fastForward` test runs on a
detached head, as a submodule's checkout is. `tests/tools/run-sandboxes-agents.test.ts`: 9 pass, 0 fail.

The suite's count is in the issue's comment.

## Not tried

- Any of it on cb4 or against Cloudflare's git: a real `git.token` with `loop-git`, a push to the pushurl, `devPatch`
  fetching from `https://cb4.endpointservices.workers.dev/git/cloud-brain-dev.git`.
- The briefs in `roles/` with a real agent, in safehouse or not.
- `laptop.ts` at all: the fast-forward before a drain and the restart when `laptop.ts` came in changed are not run;
  `fastForward` is run as a function only.
- A second round of a dev issue; a dev issue resumed at its reader; `push.ts` while `worktree.sh --push-dev` pushes.
- The main checkout's `cloud-brain-dev` after a fast-forward. Read, not run: it would move past the commit
  `lopecode-dev` records for the submodule, and the Fly machine, which follows that record (the issue's body), keeps
  the older tools until a pointer commit.
