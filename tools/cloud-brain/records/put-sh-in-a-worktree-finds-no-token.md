# put-sh-in-a-worktree-finds-no-token

## Round 1, 2026-10-12: `put.sh` gives `brain.ts` the main checkout's state directory

The overseer filed it (event 4826): `cloud-brain-dev/put.sh roles/reviewer.md`, run in the clone of
its worktree, answered "the copy before was not kept; nothing changed" under a Python traceback.
`wt-4-reviewer-in-a-view` had met the same that morning (its record, "Not done, not tried", the item of `put.sh`).

Made again in this issue's worktree, `.claude/worktrees/bm-put-sh-in-a-worktree/cloud-brain-dev`,
with the call that writes nothing, at 22:31:32 CEST:

```
$ ./put.sh --history roles/reviewer.md
…
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
exit 1
```

The cause is the one the issue gives. `put.sh` calls `$CHECKOUT/tools/cloud-brain/brain.ts`, with
`CHECKOUT` the directory above; `brain.ts` reads its tokens from `BRAIN_STATE_DIR`, or with none
from `.emitted` beside itself; a worktree's `.emitted` holds no token; `2>/dev/null` in `call()`
drops the line of `brain.ts` that says so, and the empty answer fails the JSON read.

### What changed

`cloud-brain-dev/put.sh`, one line after `CHECKOUT` is set, and four lines of its header:

```
if [ -z "${BRAIN_STATE_DIR:-}" ] && G="$(git -C "$CHECKOUT" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)"; then export BRAIN_STATE_DIR="$(dirname "$G")/tools/cloud-brain/.emitted"; fi
```

`git` is asked of `CHECKOUT` and not of the script's own directory: `cloud-brain-dev` is a clone of
its own in a worktree and a submodule in the main checkout, and its common directory is not
`lopecode-dev`'s. A `BRAIN_STATE_DIR` that is given is kept. A `CHECKOUT` in no git repository sets
nothing, so `brain.ts` reads beside itself as before (the rig of the three older `put.sh` tests is
such a directory).

`cloud-brain-dev/README.md` has three lines of it where it describes `put.sh`.
`plan/cloud-brain-worktree-per-topic.md`, the answer to finding 1 of round 2, said `put.sh` is run
"with no worktree of a topic"; it gains an "As built" note.

The same command after the change, same directory, 22:32:26 CEST:

```
$ ./put.sh --history roles/reviewer.md
…
2026-10-12T19-51-28Z-91ce06ae
2026-10-12T20-21-50Z-295cbef5
exit 0
```

### Tests

One test added to `tests/tools/light-agent.test.ts`, "put.sh gives brain.ts the main checkout's
state directory from a worktree, and keeps one that is given". It makes a git repository and a
worktree of it in a temporary directory, copies `put.sh` under each, and reads the
`BRAIN_STATE_DIR` a stand-in `bun` was given: the repository's `tools/cloud-brain/.emitted` from the
worktree and from the repository itself, `/given` when that was set, and empty from a directory in
no repository.

- Before the change, `bun test --timeout=30000 ./tests/tools/light-agent.test.ts`: 20 pass, 1 fail,
  the new test, at its first expectation (received an empty line).
- After: 21 pass, 0 fail.
- `tests/tools/suite.sh`, after the last edit of `put.sh` and the test: 741 pass, 0 fail, 77 files.

### Not done, not tried

- The other half of what the issue offers: `call()` still has `2>/dev/null`, so a token that is not
  kept for another reason (ended, or a state directory with none) still reads as "the copy before
  was not kept". Seen after the change: `BRAIN_STATE_DIR=/nonexistent ./put.sh --history roles/reviewer.md`
  ends with the same `JSONDecodeError`, exit 1. Not taken because `brain.ts curl` also writes the
  HTTP status on stderr, so letting it through changes what every call prints.
- No put, delete or restore was made with the changed script: only `--history`, a read. The
  variable is set before `call()` is defined and every call goes through it, by reading; the write
  forms were not run from a worktree.
- `BRAIN_STATE_DIR=` (set and empty) is taken as not set: `--history` answered the list, exit 0.
- From the main checkout the script was run once, as `CHECKOUT=<root> <worktree>/cloud-brain-dev/put.sh --history roles/reviewer.md`,
  and answered the list. The main checkout's own copy of `put.sh` changes at the orchestrating
  session's next pull of `cloud-brain-dev` and was not run.
- A `cloud-brain-dev` cloned alone, with a directory above it that is some other git repository:
  not tried. By reading, the variable is then that repository's `tools/cloud-brain/.emitted`, which
  is where `brain.ts` of that `CHECKOUT` would read with none.
- `agents/overseer.md` gives the put with no variable, which now works there; it is not changed.
- `summarize-papers.ts` and `agent.sh` are not touched.
