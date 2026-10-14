# fly-tools-from-reviewed-ref

D3 of `fly-loop-needs-cloud-brain-dev-alone` (comment 7512), which the owner approved in comment 7529: "D3 yes". The
Fly machine is to run `cloud-brain-dev`'s tools from a ref `loop` that only a reviewed change moves, so that a
`worktree.sh --push-dev` landing before its review does not change what runs (the approver's leave, event 7502 of
`run-ts-commits-to-cloud-brain-dev`). The issue asked first where the machine's start clones `cloud-brain-dev` today.

## Where the machine clones it

Not in `tools/cloud-brain/fly/run.sh`, which the issue's body named (`run.sh:64`, `git pull … origin main` of
`lopecode-dev`). That script is the start of the earlier machine `loop` (`fly-2-image-and-run-sh`), which cloned
`lopecode-dev` and updated its submodules. The machine the setting `machine` of `brain-x-fly` names since comment 7441
is `d896915f316098`, `drain`, and its Fly config's `init.cmd` is the one of comment 7380:

```
rm -rf /w && git clone -q https://cb4.endpointservices.workers.dev/git/cloud-brain-dev.git /w && cd /w && exec bun drain.ts
```

So it runs `cloud-brain-dev`'s `main` as it stands at each start. No file of `cloud-brain-dev` or of `lopecode-dev`
holds that command: `git grep` for `cloud-brain-dev.git /w` and `exec bun drain.ts` in this checkout, and `grep` for
`git clone` in `cloud-brain-dev/*.ts`, `*.md` and `*.sh`, found it in neither (the one `git clone` there is
`work.ts`'s clone of a work repository, and the README's example of a clone by hand). It was set with `fly.post`,
which `brain-x-fly` answers to the owner's own session alone (`getSource?worker=brain-x-fly&part=reference`, the
table of methods). The machine's config was not read back from Fly: `fly.get` is the owner's session too. That the
init is still 7380's is from comment 7441 ("7380's body with `skip_launch: true` added") and comment 7512 ("cloned
cloud-brain-dev, drain.ts").

What moves `main` there: `push.ts` after a pass or an approve (reviewed), `worktree.sh --push-dev` of `lopecode-dev`
(`README.md` and `records/*.md` since `loop-work-in-issue-clone`, before their review), and a session outside the loop
with a write token. `git ls-remote` of `cloud-brain-dev`, 2026-10-14 at 22:24 CEST (`date` beside it), answered `HEAD` and
`refs/heads/main`, both `f574ba6`: there is no `loop` yet.

## What changed

| Where | What |
|---|---|
| `cloud-brain-dev/README.md`, "Until none is left: drain.ts" | A paragraph: the machine's `init.cmd`, that it runs `main` at each start, that no file holds the command and `fly.post` sets it, and what is to change it (the two follow-ups below) |
| `cloud-brain-dev/README.md`, "A change to this repository: push.ts" | "the Fly machine follows that record, not `main`" was untrue of the drain machine, which clones `main`. It now says so, and points to the paragraph above |
| `tests/tools/fly-tools-from-reviewed-ref.test.ts` | 3 tests on the README: the untrue sentence is gone, the drain section has the clone, `init.cmd`, `-b loop` and both issues, the push.ts section says the machine clones `main` |
| tracker | `push-moves-loop-ref` opened, `about` `cloud-brain-dev`, linked `related` (events 7545, 7546) |

The README is a `SAFE` file of `patch.ts`, landed with `worktree.sh --push-dev`.

## What is left, and whose it is

1. **`push-moves-loop-ref`**: `push.ts` pushes the commit it pushed to `main` to `refs/heads/loop` too, with no force,
   creating it the first time. `push.ts` is outside `SAFE`, so it is loop work for `run.ts` and an approve, and not
   this writer's to land (`rules.md`, "Always", the item "Work on `main`"). The first `push.ts` push after it lands
   makes `loop`, at a commit that was reviewed. Its title as written lost the word `loop` between backticks to the
   shell that sent it ("push.ts moves a ref  to the commit it pushes, …"); its body has it.
2. **The machine's `init.cmd`**, once `loop` exists: an act of a session the owner is in, with `fly.post`, as comment
   7441's was. The body is in the comment of this issue. Done before `loop` exists, the clone fails and `drain.ts`
   does not run: the machine stops with nothing done.
3. **`fly-machine-per-run-tokens`**: the machine's template there needs the same `-b loop`.

## Tests

`bun test --timeout=30000 ./tests/tools/fly-tools-from-reviewed-ref.test.ts`: 3 pass, 0 fail. With
`README=` a copy of `cloud-brain-dev` `origin/main:README.md` (the file before the change): 0 pass, 3 fail.

## Not tried

- Reading the machine's config from Fly (`fly.get?path=machines/d896915f316098`): the owner's session.
- `git clone -b loop` against the Brain's `/git/cloud-brain-dev.git`: there is no `loop` to clone.
- Whether anything but `push.ts` can be kept from moving `loop`: a push goes to Cloudflare's address with a write
  token of `git.token`, not through a method the Brain could refuse it in. That `loop` moves only after a review is
  an agreement of the tools, as `--push-dev`'s limit to `SAFE` is.
- A commit of `main` that no review read and that a later reviewed commit sits on top of: `push.ts` pushes the work's
  HEAD, whose base is `main` at the work's start, so `loop` takes what was under it. The patch the reader passed is the
  diff from that base; what was already on `main` is not in it.
- `tools/cloud-brain/fly/run.sh` was not changed: it is the start of the earlier machine, and the setting `machine`
  names the drain machine.
