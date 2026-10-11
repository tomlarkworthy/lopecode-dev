# dv-2-build-writes-verify-html

## Round 1, 2026-10-11

Task 2 of `plan/cloud-brain-deploy-verdict-from-a-shared-page.md`, design 1: `build.ts` writes
`tools/cloud-brain/.emitted/verify.html`, the shell with the `mains` of `bootconf.json` cut to
`["@tomlarkworthy/brain-shell"]`. No seed changed and nothing was deployed. Nothing posts the file
to a Brain: that is task 3 (`brain.ts shell`, the deployer), which is the owner's.

### What changed

- `tools/cloud-brain/verify-shell.ts`, new: `verifyShell(shell)` and `VERIFY_MAINS`. It finds the
  `bootconf.json` block with `findSpan` and `blockContent` of `tools/lib/notebook-blocks.ts`, sets
  `mains`, and writes the block back with its opener. It throws when the file has no
  `bootconf.json` block or no block of brain-shell.
- `tools/cloud-brain/build.ts`: one `writeFileSync` after the shell's, and two lines of the header.
- `tests/tools/verify-shell.test.ts`, new.
- `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, "Changing it" step 2: what
  `build.ts` writes into `.emitted/`.

The cut is a file of its own and not a line of `build.ts` because `build.ts` cannot be loaded by a
test: it compiles the 27 seeds and writes files when imported. It is not in `shellOf`
(`brain-shell.ojs`) because the spec has "No seed changes, so no Worker's hash moves".

Every other key of `bootconf.json` is kept. From the build of 15:30 CEST:

```
shell.html   5,039,138 characters  153 blocks  20 mains
verify.html  5,038,451 characters  153 blocks  {"mains":["@tomlarkworthy/brain-shell"],"hash":"#view=C100(S70(…,@tomlarkworthy/brain-shell),S30(@tomlarkworthy/claude-code-pairing))","headless":true}
```

No block is taken out, so the file is 687 characters shorter than the shell and no more. The spec's
gain is in what the page boots (variables 4743 to 1231), not in what it loads.

### The tests

In the worktree, 15:35 CEST:

```
$ bun test ./tests/tools/verify-shell.test.ts
 6 pass  0 fail  16 expect() calls  Ran 6 tests across 1 file.
$ bun test ./tests/tools
 130 pass  0 fail  404 expect() calls  Ran 130 tests across 15 files. [16.89s]
```

Before `verify-shell.ts` existed the first command gave `0 pass, 1 fail, 1 error` ("Cannot find
module"). Five of the six call `verifyShell` on a fixture whose first block is a writer module
that carries a look-alike `<script id="bootconf.json">` in its text: `mains` is brain-shell alone;
the other keys and their order are as they were; the block ids, the other blocks' text and every
character outside the block are the same; made again from its own output it is the same file; a
file with no `bootconf.json` or no brain-shell block is refused. The sixth reads `build.ts` and
fails when the line that writes `.emitted/verify.html` from the shell's text is not there. It does
not run the build: a build from a test would write `.emitted/shell.html`, which `brain.ts shell`
posts, from whatever seeds are open in that checkout.

Each of these changes to `verify-shell.ts` was run against the test file and taken out again,
15:36 CEST:

```
a boot list that keeps lopepage-2                    4 pass  2 fail
headless dropped from bootconf.json                  5 pass  1 fail
the block found with indexOf, not findSpan           3 pass  3 fail
no check that the file has a brain-shell block       5 pass  1 fail
```

### R1 and R2 locally, with the tool of dv-1

`bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html` in the worktree
at commit `35712f55`, then for each of the 19 Workers of `cloud-brain-dev/deploy/services.json` but
the kernel and the deployer: `verify-run.ts WORKER` once as cb4 serves `/`, and
`verify-run.ts WORKER --times 5 --shell tools/cloud-brain/.emitted/verify.html`. 15:30:33 to
15:35:08 CEST, 114 runs, local headless Chrome 151.0.7922.34. The driver, the log and the reader
are `run.sh`, `runs.log` and `table.ts` in
`tools/cloud-brain/.emitted/issue-loop/dv-2-build-writes-verify-html/` (git-ignored). `bun table.ts runs.log`:

```
               runs   passed   none   otherTestsRan   verdict ms   load to verdict   heap     variables   exit       tests
as served      19     19       0      132 in 19       451          2153 ms           103 MB   4743        1 for 19   231
verify.html    95     95       0      9 in 95         206          1001 ms           47 MB    1231        0 for 19   231
(medians; tests is the sum over the 19 Workers of the test_ cells of each one's module)
```

- **R1.** With `verify.html` no module but brain-shell, its fixture `@test/verify-…` and the
  Worker's ran a test (`otherModules` empty and exit 0 for 19 of 19). As served, nine other modules
  did: svg-lens, robocoop-5-engine, robocoop-5-srctools, robocoop-5, editable-md, switchboard,
  xrpc-client, brain-secrets, claude-code-pairing.
- **R2.** Each Worker's verdict was `ok` in 5 of 5, on the hash of its as-served run, with the
  same count of tests: 231 both ways. dv-1 counted 230 at 15:03 and the spec 228 at 12:01; Workers
  were deployed between.

The four slowest verdicts with `verify.html` were brain-x-browser's, 10.3 s, as in the spec. In 9
of the 95 runs (brain-x-browser 5, brain-x-bluesky 4) the page read brain-shell 9 and no fixture,
where the other 86 read brain-shell 8 and the fixture 1. brain-shell has 9 `test_` cells and one
waits 6 s; that this is the reason was not checked.

What these runs are: the document is this checkout's build, and every module the page joins is
what cb4 serves. So brain-shell's tests on the page are the seed's at `35712f55`, beside each
Worker's deployed module.

### Not tried

- The file on cb4, or in the cluster's Chrome 128. Nothing puts it there until task 3.
- `brain.ts shell` posting it. `brain.ts:248` reads `shell.html` alone; task 3 changes it.
- `--times 20` on any Worker, and R3.
- A build in the main checkout. `build.ts` was run in the worktree only, with `--out`.
- The 9 runs with no fixture, above.
