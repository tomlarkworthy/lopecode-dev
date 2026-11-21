# bun-live

Keeps one bun process with `lopebooks/notebooks/soundscript.html` booted and applies each source save to it as
variable redefinitions, so a SoundScript edit is answered by the notebook's own checker and tests in 0.5-15 s
instead of a build plus a fresh `bun-verify` run. Written 2026-11-21/22. Boot and capabilities are
`../bun-verify/`'s, imported; compiling is the notebook's own `soundscript.compileCell` or the build's
`compile()`; the recompute is the Observable runtime's.

Paths: `lite/` is `tools/lang-experiment/lite/`; `soundscript/…`, `toolchain/…`, `infer/…` and `parse.ts` are under
`lite/`; `.scratch/bun-live/` is `tools/lang-experiment/lite/soundscript/.scratch/bun-live/`.

## Start

```
bun tools/lang-experiment/bun-live/live.ts --serve          # boots, rebuilds once to scratch, watches lite/
bun tools/lang-experiment/bun-live/ask.ts check             # apply saves not yet applied; exit 1 while a test fails
bun tools/lang-experiment/bun-live/ask.ts tests spec_S2     # current state of matching test_* cells
```

With no `--notebook`, `live.ts` boots the shipped `lopebooks/notebooks/soundscript.html`. When another process
rebuilds that file, copy it into `.scratch/bun-live/` and pass the copy; `equiv.ts` and `latency.ts` build their own.

`live.ts` options: `--root dir` (a source tree other than this checkout), `--notebook f.html`, `--filter s` (wait
for and report only tests whose name contains `s`), `--serve`, `--socket path` (default
`lite/soundscript/.scratch/bun-live/live.sock`), `--no-watch`, `--no-initial` (skip the first full rebuild; use it
only when the notebook was built from the same files), `--poll ms` (100), `--timeout ms` (30000, the settle
watchdog), `--dump out.json` (boot, write tests, cell states and definition hashes, exit).

Commands, on stdin or through `ask.ts`: `check`, `tests [filter]`, `verdict <cell>`, `status`, `dump`, `quit`, and
`js <expr>` (evaluates with `live` in scope; for debugging this tool). `ask.ts [--socket path] <command>` exits 1
when any line of the reply is a failure (a rejected verdict, a failing test, a build failure, an error) and 2 when
no server listens on the socket.

With the watcher on, a save is applied by the watcher and its report printed on `live.ts`' stdout. The next
`ask.ts check` returns that report, so its exit code covers the save; a `check` with nothing new lists the tests
that still fail and exits 1 if any do. Checked 2026-11-22 with `.scratch/bun-live/probe-watch.ts` (watcher on): the
`ixNamedMember` edit gave exit 1 with the `FAIL` line, a second `check` exit 1 with `FAILED … test_spec_S2_7`, the
revert exit 0. Before that change the reviewer traced a `check` after a watched save returning `nothing changed`
with exit 0. The equivalence and latency runs below used `--no-watch` and ran before it.

Env `LIVE_DEBUG=1` prints the settle loop's pending variables to stderr. `LIVE_NO_COMPILER=1` skips booting the
toolchain compiler, which disables the fast tier for `.ojs` files.

## What a save does

The watcher coalesces saves 30 ms apart into one `check`; a save during a check queues one more.

1. Changed files are found by content against the last snapshot.
2. **Fast tier**, body-only edits. A section registered in `ts-cells.ts` is split with its `ssCellTexts`; any other
   `.ts` cell file (the `spec-*.ts` files) with `ss-toolchain.ts`' `splitCells`, and is mapped to the one module
   whose decompiled cells it matches by text. Cells are matched by index to the live module's decompiled texts (`ss_moduleCells`). Equal cell count and equal
   name (or `type X`) at every index is required. Each changed cell is compiled with the notebook's
   `soundscript.compileCell(text, true, ss_context(...))` and the result is diffed against the live variable. A
   `.ojs` block must compile with the build's `compile()` to the same names as before. Before any of this, the
   notebook's `ss_check` must evaluate; when it throws (a runtime cell it takes is rejected) the save goes slow.
3. **Slow tier**, anything else. `soundscript/build.ts --force --out .scratch/bun-live/live-<pid>.html` runs as a
   subprocess on the root, its `@tomlarkworthy/soundscript*` blocks are recorded by running their `define()`
   against a recorder, and the records are diffed against the records of the booted state. Changed variables are
   redefined, new ones defined, missing ones deleted. When the build refuses, nothing is applied and the build's
   error line is the report.
4. When a module gained or lost a variable, its `test_*` variables are defined again as they are. A test that
   reads a cell by name (`spec_module.value("s2_shadow")`, `ss_check(spec_module)`) has no edge to it, and without
   this it kept its old result (equivalence run 1, step 4). A body edit to such a cell needs the same, so
   the rule is not limited to added or deleted variables. Cost: every spec-module edit reruns the module's 120
   tests (2.3-3.2 s of settle in run 3 and latency row (c)), where an edit to one test's source would otherwise
   rerun that test. It covers tests of the changed module only; a test in another module that reads this one by
   name would not rerun. Equivalence found no such case.
5. A redefinition of a variable upstream of `ss_context`, `ss_moduleCells`, `ss_check` or `ss_outside` (689
   variables when counted on 2026-11-21, through the `soundscript` import chain) is a checker edit. Round 1 compiles it with the remembered
   context minus the edited cells' facts. After the runtime settles, every SoundScript module is recompiled with the
   new checker and any definition that changed is applied, up to 3 rounds.
6. Settle: every 100 ms `runtime._computeNow()` is called, as `lope-runtime.js`'s boot settle does (`test_spec_S7_5`
   and `S7_7` depend on it). Settled means no tracked test is pending and the version signature of the tracked
   tests is unchanged for 2 polls. `--timeout` is a watchdog only.
7. Report: one line per redefined/defined/deleted variable, the checker's verdict for each edited cell (rule id,
   file:line, message), cells of the module whose state flipped (`(was rejected)`), one `FAIL` line per failing
   test that recomputed, passing recomputed tests on one `PASS N recomputed:` line when more than 12 recomputed, more than 5 failures with one
   message on one line, the tier, counts, ms from the check's start and from the last save, and a phases line.

A report for a leaf runtime edit, from equivalence run 3 (2026-11-22):

```
redefined @tomlarkworthy/soundscript-runtime#drawnTag
verdict drawnTag ok
fast; 1 redefined, 0 defined, 0 deleted; 158 tests recomputed, 0 failing; 5209 ms (5210 ms since the last save)
phases (ms): planned 9, context 69, compiled 48, defined 6, verdicts 685, settled 4391
```

Most of that is settle. `drawnTag` reaches the `soundscript` object, which takes about 78 names (counted 2026-11-21 in a probe, not in a saved log), so 158 of the
168 tests rerun; the last to settle are `test_breakout_memo` and `test_spec_S7_4`, which are frame- and
async-driven. That fan-out is the notebook's graph, not this tool. A spec-module edit reruns 120 tests, which settle in
2.3-2.5 s (run 3, spec-2.ts steps); that fan-out is this tool's step 4.

## Coverage

| source | live | how |
|---|---|---|
| `lite/**/*.ss.ts` registered in `ts-cells.ts` | yes | fast tier for a body edit, slow tier otherwise |
| `soundscript/spec-*.ts`, other `.ts` cell files listed in `SS_SOURCES` | yes | same |
| `soundscript/*.ojs` | yes | fast tier for a block body edit that keeps the block's names; slow otherwise |
| type-only cells (`type`, `interface`) | yes | they have variables (`$ss$type$Key`); `cellStates` gives them no state, so the report says "a declaration, no state of its own" |
| an `.ss.ts` file not in `ts-cells.ts` (the `rg-*`, `cp-*`, `tc-*` files) | verdicts only | "not in the notebook", then `checkCells` over the file with the checker module's other cells and `ss_outside`. Types declared in a sibling unregistered file are unknown: `cp-members.ss.ts` alone gives `[unknown-type] unknown type CpReg` (2026-11-22) |
| a new module | no | "restart to load it" |
| `parse.ts`, `toolchain/ss-toolchain.ts`, `soundscript/ts-cells.ts`, `toolchain/module-js.ts` and their imports | no | `live.ts` imports them; the report says "restart needed" |
| file attachments (`notebook/examples/**`) | slow tier rebuilds them, but attachment contents are not redefined | restart |
| bun-side `lite/infer-ss.ts`, `lite/types.ts`, `lite/runtime-ss.ts`, `*.test.ts` | not run by this process | they link their own copies of the `.ss.ts` files; the slow tier's build subprocess sees edits |

## Is a live state the same as a fresh boot

`equiv.ts` copies `lite/` to `.scratch/bun-live/roots/equiv` (`root.ts`; the rest of the repo is symlinked, and an
import scan of the copy finds no file reached outside it), builds it, starts `live.ts --serve --no-initial` on that
build, and for each edit asks `check`, takes a `dump`, builds the edited copy to a fresh notebook, boots it in a
separate process and compares: every test's status and message, every cell's state and reasons
(`cellStates` of `ss_check` per module), and a hash of every variable's inputs and definition. Edits are located
on the AST (`edits.ts`). It never writes outside `.scratch/bun-live/`.

`bun tools/lang-experiment/bun-live/equiv.ts [--only step,...]`. Run 3, 2026-11-22, AC power:

| step | result | tests not passing | `ask` exit | live check ms |
|---|---|---|---|---|
| 0 no edit | SAME | 0 | 0 | 10 |
| 1 runtime cell body (`drawnTag` `"span"` to `"div"`) | SAME | 0 | 0 | 5211 |
| 1b revert | SAME | 0 | 0 | 4928 |
| 2 checker cell body (`ixNamedMember` rule id `banned-member` to `banned-member-x`) | SAME | 1 | 1 | 12624 |
| 2b revert | SAME | 0 | 0 | 13089 |
| 3 add a cell (`liveAdded` in `render.ss.ts`) | SAME | 0 | 0 | 11056 |
| 3b delete it | SAME | 0 | 0 | 10212 |
| 4 delete a spec cell (`s2_shadow`) | SAME | 1 | 1 | 12161 |
| 4b restore | SAME | 0 | 0 | 12363 |
| 5 rename `s2_base` to `s2_base_x` | SAME | 2 | 1 | 12166 |
| 5b `s2_answer` takes `s2_base_x` | SAME | 2 | 1 | 2606 |
| 5c restore | SAME | 0 | 0 | 11929 |
| 6 checker error (`drawnTag` tag `1`) | fresh build refuses | 154 | 1 | 574 |
| 6b fix | SAME | 0 | 0 | 15250 |
| 7 a cell that does not parse (`s2_double`) | both builds refuse, same error | - | 1 | 8008 |
| 7b repair | SAME | 0 | 0 | 7 |
| 8 two files saved together (`render.ss.ts`, `spec.ojs`) | SAME | 0 | 0 | 5593 |
| 8b revert both | SAME | 0 | 0 | 6078 |
| 9 add a type (`type KeyWide = Key \| bigint`) | SAME | 0 | 0 | 10431 |
| 9b change a type in place (`Key` adds `bigint`) | SAME | 0 | 0 | 10311 |
| 9c revert | SAME | 0 | 0 | 517 |

Each SAME covers 168 tests, 788-790 cell states and 2106-2108 definitions. Log:
`.scratch/bun-live/equiv-run3.log`.

Step 5b shows a rename's dependents erroring and then recovering in two stages: after 5 `s2_answer` is rejected
`[inject-unknown] parameter s2_base names no cell`; after its parameter is renamed it is rejected
`[free-name] free name s2_base`, because the body still says `s2_base`; 5c restores it. Live and fresh agree at
each stage.

Step 6 has no fresh side: the build refuses a notebook whose checker rejects a cell
(`render.ss.ts: the checker does not accept every cell: drawnTag: rejected [type] 1 is not assignable to string`).
Live applies the edit, 154 tests fail with that message, and the report says the notebook's `ss_check` itself
fails, so no per-cell verdicts. This is a state a fresh boot cannot reach.

### Divergences found, and their causes

Runs 1 and 2 (2026-11-21/22) found these; all are fixed in run 3.

- **Run 1 step 4, `test_spec_S2_8` live passed, fresh `s2_shadow is not defined`.** The test reads
  `spec_module.value("s2_shadow")`, a lookup by name that is no edge of the graph, so deleting `s2_shadow` did not
  rerun it. Fix: step 4 of "What a save does".
- **Run 1 step 5 and 5b, `test_spec_S2_1`/`S2_4` live passed, fresh `s2_answer does not check`.** Same cause: those
  tests call `ss_check` on the spec module, which does not depend on the module's variable set.
- **Run 1 crashed at step 6**: `dump` threw because `ss_check` throws once a runtime cell it takes is rejected.
  Fixed by catching that in `dump`, `verdicts` and `index`.
- **Run 2 steps 6b to 8b, 154 tests DIFFERENT.** The fix in 6b went through the fast tier, which needs
  `ss_moduleCells` and `ss_context`; both threw from the rejected `drawnTag`, so the check errored and every
  later check errored the same way. Fix: when the notebook's checker throws, the save goes to the slow tier, whose
  build does not depend on the live checker. Run 3 6b: `slow (... the notebook's checker fails ...)`, SAME.
- **Run 2 step 9, 7 spurious defines and deletes** (`pid:_ss173_0` deleted, `pid:_ss174_0` defined): appending a
  type renumbered the unnamed markdown cells after it. A pid change with the same inputs and definition now
  retags the live variable instead of replacing it. Not a correctness difference (run 2 step 9 was already SAME).

### Control

Step 2 is the control. Changing the rule id `ixNamedMember` emits makes the spec's reject row fail:

```
FAIL @tomlarkworthy/soundscript-spec#test_spec_S2_7: "const a = () => Math.random();" gave ["banned-member-x"], expected exactly [banned-member]
fast; 1 redefined, 0 defined, 0 deleted; 154 tests recomputed, 1 failing; 12621 ms
phases (ms): planned 15, old context 9, compiled 5, defined 6, settled 8423, recompiled every module 3682, verdicts 57, settled 424
```

and `ask check` exited 1. Run again on 2026-11-22 through the `ask.ts` command line
(`.scratch/bun-live/probe-control.ts`): exit 0 with nothing changed, exit 1 after the edit with the same `FAIL`
line, exit 0 after the revert. The fresh boot fails the same test with the same message.

## Checker edits

The checker is cells of `@tomlarkworthy/soundscript-checker`, and the notebook's compile path takes it through
`soundscript`. Step 2 shows a checker-cell redefinition reaching the spec tests through the graph: live and fresh
agree on all 168 tests. Nothing in the notebook was found holding a checker value outside the graph.

Captured at boot, in this process:

- `parse.ts`, `ss-toolchain.ts`, `ts-cells.ts`, `module-js.ts` are imported once by `live.ts`; an edit to them is
  reported as needing a restart.
- The round-1 compile of a checker edit uses the context computed before the edit. Round 2 corrects it; in step 2
  it took 3682 ms ("recompiled every module").

Captured by the build, which is why the build is a subprocess and not called in-process: `ts-cells.ts`'
`generate()` keeps a module-level `groupChecks` memo, links the bun-side checker by static ESM import, and freezes
`ssKeys`. Calling it twice in one process after an edit would check with the first checker.

## Latency

Measured 2026-11-22 00:38-00:43 CET by `bun tools/lang-experiment/bun-live/latency.ts [--reps n]` on `.scratch/bun-live/roots/latency` and a notebook built
from it. `pmset -g batt`: `Now drawing from 'AC Power'`. Load averages `4.92 5.58 8.36` at the start,
`3.86 4.44 6.97` at the end. Time is from writing the file to the `check` reply; each edit is a comment inserted
at the start of the cell's body (an `.ojs` block gets a trailing `// x`), alternated with its revert.

| edit | tier | median ms (n=10) | range | tests rerun |
|---|---|---|---|---|
| (a) leaf runtime cell, `render.ss.ts` `drawnTag` | fast | 4879 | 4614-5100 | 158 |
| (b) checker cell in inference, `infer/ix-expr.ss.ts` `ixNamedMember` | fast | 12695 | 11710-13524 | 154 |
| (c) spec test source, `spec.ojs` `test_spec_S1_5` | fast | 3412 | 3190-3824 | 120 |
| `bun-verify/run.ts` on the built notebook (fresh boot, 168 tests), n=3 | - | 5853 | 5841-5896 | 168 |
| `build.ts --force` + `bun-verify`, n=3 | - | 14488 | 14303-14637 | 168 |

The fair comparison for a source edit is the last row, since `bun-verify` alone does not see an edit. Against it
(a) is 3.0x faster, (c) 4.2x, and (b) only 1.14x. Compiling is under 0.2 s in all three; the rest is tests rerunning: in (a) and (b) the ones the edit
reaches in the notebook's graph, in (c) the spec module's 120 tests that step 4 of "What a save does" reruns. For (a), phases were `context 117, compiled 42, defined 3, verdicts 484,
settled 4128`. A checker edit settles twice, once on the round-1 definition and again after "recompiled every
module" (`settled 8174, recompiled every module 3054`), which is why (b) is close to a fresh build. Not tried:
timing `--filter`, which waits for fewer tests but does not stop the others running. The slow tier is a build plus a
settle, 10-15 s in equivalence run 3.

## Commands checked

2026-11-22, `.scratch/bun-live/probe-cmds.ts`, `--filter spec_S2`, the `ixNamedMember` edit:

```
check            exit 1   PASS lines for test_spec_S2_*, FAIL test_spec_S2_7
verdict drawnTag exit 0   drawnTag is in @tomlarkworthy/soundscript-runtime | verdict drawnTag ok
status           exit 0   watching 189 files; 89 mapped to cells (fast tier); 137 read by the build | tests in scope 168: 155 pass, 1 fail, 12 pending, 0 skipped
tests spec_S2_7  exit 1   FAILED ...test_spec_S2_7 ... | 0 pass, 1 fail, 0 pending, 0 skipped
tests spec_S1    exit 0   33 pass, 0 fail, 0 pending, 0 skipped
revert, check    exit 0
```

With `--filter`, `status` still counts all 168 tests, and the 12 pending are tests outside the filter that had
not finished when the check returned. The settle time with `--filter` was not recorded.

## Changes wanted in existing files

None was made. Each would remove a copy or a subprocess:

- `bun-verify/run.ts`: export its `boot()` (the `loadNotebook` call with `ALL` capabilities and the test toggles)
  and its test runner. `boot.ts` repeats that call because `run.ts` is a script.
- `soundscript/build.ts`: export `buildModule`, or a function that builds one module's block from sources. The slow
  tier now builds every module: `build` phase 8.5-9.5 s in equivalence run 3, up to 12.6 s in run 2.
- `soundscript/ts-cells.ts`: export `SS_CHECKED_WITH`, `SS_GROUPS`, `SS_SHELL`, `SS_HOME`, `SS_ADDON_SOURCES`, and a
  way to reset `groupChecks`, so a cell file maps to its module without running `generate()`.
- `.claude/skills/review-notebook/SKILL.md`: the skill asks for a `Runs` line for this review. Wanted: "2026-11-22
  `tools/lang-experiment/bun-live/README.md`: FIX, 8 findings (5 confirmed, 3 minor), all taken. 119k subagent
  tokens, 2m57s. What the author had not seen: with the watcher on, `ask check` after a save could answer `nothing
  changed` with exit 0 while a test failed; the example report mixed two steps' lines."
- `tools/lope-runtime.js`: `defineVariable(module, ...)` finds only mains by name; an option to find an imported
  module would replace the `module <name>` variable walk in `boot.ts`.

## Not known

- Booting the toolchain `compiler()` notebook before the main notebook makes `test_polyglot_listing` fail with
  `invalid module` from d3-require. Booting it after avoids it. The cause was not found.
- A check with nothing applied can still take about 3 s to settle (`settled 3001` on 2026-11-22 against an
  unregistered file), from tests still running from earlier.
- In run 3 step 5b the report listed `s11_late_twice ok (was rejected)`. Live and fresh agreed on every cell state
  at both steps, so it is the notebook's checker changing that cell's state; why it depends on `s2_base` was not
  looked into.
