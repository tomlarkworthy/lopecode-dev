# robocoop-5 — bash-less robocoop

robocoop-5 is robocoop-4 with the shell and virtual filesystem removed. The nobash experiment
(2026-07-05, results in `tools/robocoop-4/eval/live/results/strategy/`) showed the agent performs at
parity without bash: the whole performance effect of the robocoop-4 architecture is the byte-stable
`/src` Read/Write/Edit contract, and 93% of observed bash usage was `ls`/`grep`/`find` — replaced here
by structured `glob`/`grep` tools.

Notebook: `lopebooks/notebooks/@tomlarkworthy_robocoop-5.html` (2.4 MB vs robocoop-4's 3.0 MB — the
just-bash bundle was its largest block).

## Architecture

| robocoop-4 | robocoop-5 |
|---|---|
| just-bash interpreter + InMemoryFs workspace | none |
| `bash` tool | `glob` + `grep` structured tools |
| `/src` files in the fs, seeded by hostSetup | `fn.src` field on each module's compiled define function (`rc5_store.srcFns`) |
| `/notebook` mirror kept fresh by jbFileSync's poll loop | synthesized per read from `exportModuleJS` |
| `/content` mirrored eagerly (mirrorBlocks + attachmentMirror) | read directly from DOM blocks / attachment URLs |
| jbFileSync applies bash-written files asynchronously (~600ms) | write_file/edit_file compile + apply synchronously |

Modules (all fresh, no robocoop-4 dependencies):
- `robocoop-5` — chat app (no terminal; tool calls render as activity lines).
- `robocoop-5-engine` — session/model/key/prompt. The session uses a `completeGuard` (vetoes a
  task_complete with zero tool calls once per turn — mimo fabricates completions otherwise) and a
  last-non-empty toolsProvider fallback (the registry reads empty transiently during re-registration).
- `robocoop-5-srctools` — file+search+value tools, the apply engine, `rc5_host` eval seam.
- `robocoop-5-tools` — pluggable tool registry (seeded empty; `registerTool` from any cell).
- `robocoop-5-core` — the DOM-free brain: `createAgentSession` (with `completeGuard`),
  `createOpenRouterClient`, `defineTool`, `composeFooter`, transcript formatters. Descended from
  robocoop-4-core minus bash tooling and the rc4 prompt; robocoop-4 keeps its own core untouched.

The file→live apply engine (`jbApply`, with the F7 plumbing-upsert fix) lives in
`@tomlarkworthy/file-sync` next to `probeDefine`. robocoop-4's justbash-filesync still carries its own
pre-F7 copy (create-only import plumbing: a once-broken import can't be fixed by editing the file).

## Eval harness

Both robocoop harnesses share one driver + CLI (`tools/robocoop-eval/driver-core.mjs`,
`run-cli.mjs`); each side contributes a thin config (`eval/driver.mjs`: layout, seed/collect seams,
settle time) and a thin `run.mjs`. criteria/score live in `tools/robocoop-4/eval/live/` and are
imported, not copied; rc5's evals are the rc4 suite with a small overlay (`eval/evals.mjs`) for the
shell-specific self-knowledge questions.

```bash
node tools/robocoop-5/eval/run.mjs [--ids <id,..>] [--category <cat>] [--model <m>] [--json <path>]
```

`OPENROUTER_API_KEY` from `tools/robocoop-5/.env`, `tools/robocoop-4/.env`, or repo-root `.env`.

No-model checks (Playwright boot shared via `lib/notebook-boot.mjs`):
- `node tools/robocoop-5/boot-smoke.mjs` — boot, tool registry, seed/snapshot round-trip, and every
  robocoop-5-core export instantiates (lazy cells hide a missing definition until first use).
- `node tools/robocoop-5/import-heal-test.mjs` — regression for the F7 plumbing-upsert: a module
  written with a broken import binding must be healable by re-writing the corrected file.
- `bun tools/robocoop-5/guard-unit-test.mjs` — completeGuard veto path with a scripted mock client
  (fabricated completion rejected once, work proceeds, second completion accepted — no livelock).

### Capability evals — vendoring and reflection (added 2026-08-30)

Two abilities the shared rc4 suite never asks for. They live in `eval/evals-capability.mjs`, appended
to `EVALS` after the rc4 set, under their own categories — so a mean over the whole rc5 list is no
longer comparable with an rc4 mean; use `--category vendoring` / `--category reflection`.

#### Vendoring (`vendor-npm-attachment`, `vendor-offline-report`)

Fetch a package once and put its bytes in the notebook as a module FileAttachment, so the notebook
still runs with the network unplugged. No check on module source separates that from a CDN import —
both read `import(…)` — so grading needs the attachment store itself. The driver now collects one:
`eval/driver.mjs` `collectAttachments` reads the notebook's own `all_module_files`
(`@tomlarkworthy/fileattachments`) into `snapshot.attachments`, and two criteria
(`attachment_exists`, `attachment_contains`) query it. That list is the same one exporter-3
serializes, so a pass means the bytes would survive an export.

The package is served from a sentinel URL by `setup.routes` (`fixtures.mjs`), never from a real CDN.

The route works but is not sign-posted anywhere: the system prompt explains how to DECODE an
attachment (`FileAttachment(…).stream()` → `DecompressionStream`) and never mentions creating one.
What does work, established by driving the tools directly with no model
(`tools/scratch/rc5-cap-probe.mjs`, 2026-08-30):

```
eval_js  module="@tomlarkworthy/fileattachments"
  await setFileAttachment(new File([src], "tiny-chunk.js", {type:"text/javascript"}),
                          window.__ojs_runtime.mains.get("@user/chunker"))

→ B4 read back via FileAttachment   export function chunk(a, n) {…
→ B5 import from attachment         {"v":"3.1.4","c":[[1,2],[3,4],[5]]}
→ B6 glob /content                  /content/main/tiny-chunk.js
```

Three things the probe cost a round each to find, all silent failures:

- `setFileAttachment(file)` defaults its second argument to the **fileattachments module**, not the
  caller's. The write succeeds and `FileAttachment(name)` in the intended module still reports
  `File not found`. Pass the owning module explicitly.
- `myModule` imported from `@tomlarkworthy/runtime-sdk` does **not** identify the importing module
  under rc5's apply path — probe B3b returned `{"found":true,"same":false}` comparing it against
  `runtime.mains.get("@user/vendor")`. `runtime.mains.get(<id>)` is the one that resolves.
- `eval_js` binds every cell name the snippet mentions as a function parameter, and `file` IS a cell
  of `@tomlarkworthy/fileattachments`, so a local `const file = …` there dies with
  `syntax error: Identifier 'file' has already been declared`. The first oracle run failed on
  exactly this.

`all_module_files` labels an attachment's owner `"main"` when the runtime cannot name the module
(`/content/main/tiny-chunk.js` above), so `collectAttachments` re-derives the id from
`runtime.mains` + the `module <id>` variables rather than trusting that field.

Anti-shortcut criteria: `not_contains_string` on `eval.test` (no run-time network) and on `__tcOut`,
an identifier that exists only inside the fixture library's implementation — it can appear in a
module file only if the library was pasted in rather than bundled.

#### Reflection (`reflect-plot-scales`, `reflect-blackbox-kiln`)

Establish how a library behaves by RUNNING it. Both ground truths are chosen so recall cannot supply
them.

`reflect-plot-scales` asks for the introspection API on what `Plot.plot` returns. Measured
2026-08-30 against the Plot bundled in `@tomlarkworthy_robocoop-5.html`, for
`Plot.plot({marks:[Plot.dot([{a:1,b:10},{a:5,b:50}],{x:"a",y:"b"})]})`:

```
{"tag":"svg","sy":{"type":"linear","domain":[10,50],"range":[370,20],"clamp":false}}
```

`yScaleRange` is the anti-recall anchor: `[370,20]` falls out of Plot's default height and margins,
so it can only be measured, not remembered. It is also the criterion that will break first if the
bundled Plot ever changes — which the oracle run below is there to catch.

`reflect-blackbox-kiln` seeds `@user/kiln`, whose single cell evaluates a base64 payload, so reading
the module file shows a blob rather than a contract. Calling it wrong answers with errors that name
the next step (`kiln.steps`, the spec keys, the known step names). Over `[4,8,15,16,23,42]`:
`fold=108`, `spread=38`, `tally=6`; `not_contains_string "108"` on the answer module keeps those
computed rather than transcribed.

#### Reference-solution gate (`--oracle`)

Each capability eval carries an `oracle`: a list of `{tool, args}` steps the driver executes against
the live tool registry INSTEAD of sending the question to a model (`driver-core.mjs`, inert without
the flag).

```
$ node tools/robocoop-5/eval/run.mjs --oracle --ids vendor-npm-attachment,vendor-offline-report,reflect-plot-scales,reflect-blackbox-kiln
PASS  vendor-npm-attachment  1.00  steps=3  (8/8)
PASS  vendor-offline-report  1.00  steps=3  (6/6)
PASS  reflect-plot-scales    1.00  steps=2  (6/6)
PASS  reflect-blackbox-kiln  1.00  steps=2  (9/9)
mean aggregate: 1.00 over 4 eval(s)
suite cost: $0.0000 over 0 call(s)  ·  wall-clock: 2.7s
```

No key, no tokens, ~3s. It scores the eval's own reference solution, so anything below 1.00 means
the EVAL is broken — an unsatisfiable criterion or a ground truth that drifted with the notebook —
and the CLI prints the failing criteria inline. It says nothing about the agent. Run it after any
change to the notebook that could move a ground truth (a Plot bundle bump, a fileattachments edit).

Only the nine capability evals carry an `oracle`; `--oracle` over the rc4-derived evals scores 0
because they have no reference solution, not because they are broken.

#### First baseline (mimo-v2.5-pro, 2026-08-30)

```
                        --timeout 120000   --timeout 300000   steps (300s)
reflect-plot-scales     1.00               —                   9
reflect-blackbox-kiln   0.00 (timeout)     1.00                7
vendor-npm-attachment   0.00 (timeout)     0.00 (timeout)     15
vendor-offline-report   0.00 (timeout)     0.00 (timeout)     27
```
`results/capability-baseline.json`, `results/capability-baseline-300s.json`. $0.13 and 88 OpenRouter
calls across both runs.

Reflection is solved; both losses at 120s were the turn cap, not the task. `reflect-blackbox-kiln`
reverse-engineered the API in two `eval_js` calls — `kiln.steps` plus a bare `kiln()` to read the
error — and spent the rest of the turn hunting for the cross-module import idiom.

Vendoring fails, and both runs fail the SAME way. The agent finds the wiki page, reads
`fileattachments.js`, then builds the attachment the way a bundled library LOOKS in the file: gzip
the source and inject a `<script type="text/plain" id="@user/report/tiny-chunk@3.1.4.js.gz">` block
via `eval_js`. That block is real — `window.lopecode.contentSync(id)` answers
`{status: 200, mime: "application/gzip", bytesLen: 322}` — and it is dead, because a module's
`FileAttachment` map is built from `contentSync` once, inside `define()`. The cells keep answering:

```
⚠ 2 cells ERRORING at runtime — tinyChunk: File not found: tiny-chunk-3.1.4.js.gz
```

and the agent loops on it (27 steps). `setFileAttachment`, the function that writes the live map, was
grepped and read in both runs and used in neither. So the gap is not "cannot create an attachment" —
`tools/scratch/rc5-cap-probe.mjs` does it in one call — it is that the DOM block and the runtime map
are two separate stores and nothing the agent can read says the second one exists. Untried: whether
saying so in the system prompt closes it.

#### Vendoring patterns — the doc-assisted arm (`vendoring-patterns`, added 2026-08-30)

`knowledge/vendoring-npm-dependencies.md` was written after the baseline above, and ships inside the
notebook as a markdown-wiki block at
`/content/@tomlarkworthy/markdown-wiki/vendoring-npm-dependencies.md`. Five evals in
`eval/evals-vendoring-patterns.mjs` test whether that doc is usable: one per package shape that cannot
simply be attached and imported.

| eval | shape | the trick the doc names | ground truth |
|---|---|---|---|
| `vendor-pattern-bare-specifier` | ESM importing `tiny-stats-core` | fetch the `/+esm` build, not the entry point | `statsMean` 7, `statsSpread` 11 |
| `vendor-pattern-relative-multifile` | two files, `import "./pad.js"`, no bundle published | attach both, rewrite the specifier to the sibling's blob URL (§ 3) | `stamps` `["#0007","#0042","#1234"]` |
| `vendor-pattern-umd-amd` | UMD, on a page that has an AMD loader | shadow `define`/`module`/`exports`, read the global (§ 2.1) | `mixed` `"#202020"` |
| `vendor-pattern-commonjs` | CommonJS | `new Function("module","exports",src)` (§ 2.2) | `slugs` `["hello-world","a-b-test"]` |
| `vendor-pattern-gzip` | gzipped ESM bundle, stored compressed | `DecompressionStream("gzip")` in a loader cell (§ 4) | `packed` `[["a",2],["b",1],["a",3]]` |

Each grades on three things at once, and all three are needed: the doc was read
(`tool_call_matches` on `vendoring-npm-dependencies`, which matches `read_file`, `glob` and `grep`
alike), the package's bytes reached the module's **attachment map** (`attachment_contains` /
`attachment_exists` — the surface exporter-3 serializes, not the DOM), and a live cell holds a value
only the real library produces. Reading the doc and failing scores the first only; a correct answer
typed in by hand fails the `__msOut`/`__dfOut`/`__pbOut`/`__spOut`/`__prOut` anti-paste checks, one
internal accumulator name per fixture library.

**The evals are hard because the naive route provably fails.**
`tools/scratch/vendor-fixture-negative-control.mjs` runs it on the same fixture bytes in the same
notebook (2026-08-30):

```
N1 bare specifier    THREW: Failed to resolve module specifier "tiny-stats-core". Relative references must start with either "/", "./", or "../".
N2 relative import   THREW: Failed to resolve module specifier "./pad.js". Invalid relative url or base scheme isn't hierarchical.
N3 UMD as a module   LOADED []
N4 UMD as a script   {"global":null,"defineIsAmd":true}
N5 CommonJS          THREW: module is not defined
N6 gzip unexpanded   THREW: Invalid or unexpected token
```

N3 falsified a row of the doc, which had recorded the UMD failure as
`Cannot set properties of undefined (setting 'MyLib')`. That is what a UMD whose root falls back to a
bare `this` does. `paintbox` uses the commoner `typeof self !== "undefined" ? self : this`, and `self`
exists in module scope — so the import **succeeds and exports nothing**, which is the worse failure
because nothing throws. The doc now carries both rows. Re-run the control after changing a fixture.

Reference-solution gate, after the wiki re-sync:

```
$ node tools/robocoop-5/eval/run.mjs --oracle --category vendoring-patterns
PASS  vendor-pattern-bare-specifier      1.00  steps=4  (9/9)
PASS  vendor-pattern-relative-multifile  1.00  steps=5  (8/8)
PASS  vendor-pattern-umd-amd             1.00  steps=4  (8/8)
PASS  vendor-pattern-commonjs            1.00  steps=4  (7/7)
PASS  vendor-pattern-gzip                1.00  steps=4  (8/8)
mean aggregate: 1.00 over 5 eval(s)  ·  wall-clock: 4.4s
```

The gzip fixture needed one harness change: `setup.routes` entries now take `bodyBase64` as well as
`body`, because a gzip payload cannot survive being served as a string
(`robocoop-eval/driver-core.mjs`). The attachment it produces is 203 B against 300 B of source, which
is how the oracle result proves the bytes stayed compressed.

**Why the older two evals stay unaided.** `vendor-npm-attachment` and `vendor-offline-report`
(category `vendoring`) say nothing about the wiki and carry no read criterion, deliberately: they are
the cold-capability control the 2026-08-30 baseline was measured against, and adding a hint would
destroy the comparison. The delta between `vendoring` and `vendoring-patterns` is the measurement of
whether writing the doc bought anything.

**First model measurement (`xiaomi/mimo-v2.5`, non-pro, 2026-08-30).** Three runs, same evals, same
notebook, `maxStepsPerTurn: 40` (the shipped `robocoop-5-engine` setting, not an eval knob):

```
                                   300s cap   900s cap   900s cap (re-run)
vendor-pattern-bare-specifier       0.00        0.56       0.00 (turn cap, 8 steps)
vendor-pattern-relative-multifile   0.00        0.12       0.12
vendor-pattern-umd-amd              0.00        0.47       0.47
vendor-pattern-commonjs             0.00        0.73       0.13
vendor-pattern-gzip                 0.00        1.00       0.12
mean                                0.00        0.58       0.17
cost / calls                     $0.050/120  $0.103/177  $0.085/168
```

The 300 s column is not a capability result: every turn died on `session.send timed out after
300000ms`, so no WorldSnapshot was collected and all criteria failed by default — including
`tool_call_matches`, which the transcripts show was satisfied. The doc IS discoverable and IS being
used: all five runs read
`/content/@tomlarkworthy/markdown-wiki/vendoring-npm-dependencies.md`, the commonjs run as its very
first tool call, before going on to read `jszip-3-10-1`, `codemirror-6-v2` and `setFileAttachment`'s
signature. That column produced the retry fix below rather than a number.

**What actually separates pass from fail is the module id, not the package shape.** Across the nine
scored runs the outcome is perfectly predicted by one choice:

```
wrote /src/@user/…            0.47  0.56  0.73  1.00  0.47
wrote /src/@tomlarkworthy/…   0.12  0.12  0.13  0.12
```

Every question names the module explicitly ("Create a module `@user/stamper`"). When the agent instead
creates `@tomlarkworthy/stamper`, `module_exists` fails and takes the six other module-scoped criteria
with it, so a naming slip and a total inability to vendor score the same. `vendor-pattern-relative-
multifile` chose the wrong namespace in BOTH runs, which is the whole of its stable 0.12 — that eval
has not yet tested the § 3 specifier rewrite even once. The A/B is clean on `vendor-pattern-gzip`,
1.00 in 17 steps at `@user/packer` against 0.12 in 41 steps at `@tomlarkworthy/packer`, where the
whole budget went into debugging an attachment on a module the criteria were not looking at.

Two consequences, and the second is a measurement defect worth fixing before the next run: the
capability signal is real but partial (of the runs that got the id right, four of five landed the
package's bytes in the attachment map), and this eval currently cannot distinguish "named it wrong"
from "could not vendor". Making the two legible — an instruction-following criterion separate from
capability criteria that find the module wherever it was created — changes the yardstick, so it has
not been done unilaterally.

**Run-to-run variance is larger than any effect measured so far.** `vendor-pattern-commonjs` went
0.73 → 0.13 and `vendor-pattern-gzip` 1.00 → 0.12 on identical configuration. Per-step latency also
swung (`bare-specifier`: 41 steps in 648 s, then 8 steps in 900 s). OpenRouter's provider for a given
call is not recorded in the result JSON, so routing cannot be confirmed or ruled out as the cause —
it is a hypothesis, not a finding. Treat a single run of this suite on this model as one draw:
n ≥ 3 with a pinned provider before believing a per-eval number.

**The step cap was the dominant constraint, not the model (2026-08-30).** Re-running against a copy of
the notebook with `maxStepsPerTurn` patched 40 → 120 (`eval/robocoop-5-eval-bigcap.html`, gitignored,
regenerable by copying the canonical notebook and replacing that one literal) and a 1800 s turn cap:

```
                                    40 steps / 900s      120 steps / 1800s
vendor-pattern-relative-multifile   0.12   0.12          1.00   (37 steps)
vendor-pattern-umd-amd              0.47   0.47          0.71   (26 steps)
vendor-pattern-commonjs             0.73   0.13          1.00   (74 steps)
vendor-pattern-gzip                 1.00   0.12          1.00   (113 steps)
vendor-pattern-bare-specifier       0.56   0.00           — (run stopped by hand)
```

`commonjs` needs **74** steps and `gzip` needed **113** — 2–3× the shipped cap — so the earlier runs
were being cut off around half-done and scored as though they had failed. `relative-multifile`, which
had never once reached the § 3 specifier rewrite, solves it cleanly. The 0.58 and 0.17 means above
were therefore measuring the cap, not the model.

This also retires the provider-routing hypothesis for the score variance. `vendor-pattern-gzip` took
17 steps on one run and 113 on another for identical work — a 6.6× spread in trajectory LENGTH. Score
swings follow from a step budget that some trajectories fit inside and others do not; nothing about
routing needs to be invoked, and it was never evidenced.

What it does NOT settle is whether 40 is the wrong product setting. These are vendoring tasks with a
long measure-and-debug tail; the rc4-derived suite passes at 40. Raising the shipped cap would need
its own regression sweep.

**Parallelism (added 2026-08-30).** The runner was strictly sequential — 2996 s of summed per-eval
duration against a 2996 s wall clock, i.e. the machine idled through the whole run, because a turn is
~100% model latency. `--concurrency <n>` runs n evals at a time (default 1, so the sequential baseline
is unchanged). Evals are independent — own browser context, own boot, own route fixtures — and scored
results are re-sorted into declared order because completion order is no longer deterministic.

**Second model: `z-ai/glm-4.7-flash` (2026-08-30).** Same raised-cap bundle, same 1800 s turn cap,
same `--concurrency 3`, so the only variable is the model:

```
                                    score  steps  wall   cost   cache  wrote
vendor-pattern-bare-specifier       0.00*    82  1800s  $0.150   36%   /src/@user/stats.js
vendor-pattern-relative-multifile   0.00*    81  1800s  $0.194    0%   /src/@user/stamper.js (+loader)
vendor-pattern-umd-amd              0.00*   116  1800s  $0.112   70%   /src/@user/painter.js
vendor-pattern-commonjs             0.27     31   235s  $0.047    0%   /src/@user/slugger.js
vendor-pattern-gzip                 0.59     99  1570s  $0.234    0%   /src/@user/packer.js (+loader)
mean 0.17  ·  $0.7372 over 410 calls  ·  14.4M prompt tokens, 27% cached  ·  7204.8s
                            (* turn cap; see the scoring caveat below — these are understated)
```

Against mimo-v2.5 on the identical configuration — mean 0.74, $0.1331, 250 calls, 11.3M prompt
tokens at **97%** cached, 3549 s — glm-4.7-flash is 5.5× the cost and 2× the wall clock. The cost gap
is not the sticker price ($0.06/$0.40 per M against $0.14/$0.28): it is the cache hit rate, 27%
against 97%, erratic per eval (0%, 0%, 0%, 36%, 70%). Both runs used the same concurrency, so
interleaving is not the cause.

Two things glm does BETTER, and they matter for reading the score:

- **Namespace, 5/5.** Every eval wrote `/src/@user/<name>.js`. mimo slipped to `@tomlarkworthy/` in 4
  of 9, which was that model's single largest source of lost points.
- **It read the wiki in all five runs**, as mimo did.

Its failure mode is convergence, not comprehension: 73 and 64 `eval_js` calls on the two worst evals —
it experiments without closing. All five built the right module in the right place and three ran out
of clock while still probing.

**Scoring caveat, and it is a harness bug this run exposed.** The three `0.00*` rows are not "built
nothing" — each had a real module on disk. They scored zero because the scorer short-circuited every
criterion whenever `snapshot.ok === false`, and a turn-cap timeout sets that flag even though the
driver has already force-computed the cells and collected files, modules and attachments.
`criteria.mjs` now grades the surviving world state for a turn-cap timeout specifically (`isTurnCapTimeout`),
leaving the short-circuit in place for a run that never started — no session, or an empty turn — where
the world is meaningless. Capped rows print `[turn cap — lower bound]`.

The fix landed mid-flight, so the glm numbers above were produced by the OLD scorer and the three
capped rows remain understated. They cannot be recovered offline: the results JSON persists the
transcript but NOT the world snapshot, so re-scoring requires re-running (~$0.74, ~2 h). The mimo
comparison above is affected the same way and in the same direction.

**`deepseek/deepseek-v4-flash-0731`, full 54-eval sweep (2026-08-31).** Canonical notebook at the
shipped `maxStepsPerTurn: 40`, 900 s turn cap, `--concurrency 5`: **mean 0.895, $0.2865 over 523
calls, 86% cached, 3758 s**. 43 of 54 perfect. On vendoring-patterns at the RAISED cap it leads:

```
                                    deepseek   mimo-v2.5   glm-4.7-flash
vendor-pattern-bare-specifier         0.89       0.56         0.00*
vendor-pattern-relative-multifile     1.00       1.00         0.00*
vendor-pattern-umd-amd                1.00       0.71         0.00*
vendor-pattern-commonjs               1.00       1.00         0.27
vendor-pattern-gzip                   0.71       1.00         0.59
mean                                  0.92       0.85         0.17
```

The 11 imperfect sweep rows are four groups, and only one is a model weakness: 7 vendoring evals
step-starved at cap 40 (the same evals score 0.92 at 120); `algo-roman`/`algo-word-count` lost to a
CRITERION bug, not the model — `cell_fn_evaluates` fills cell params from `LIB_STUBS`, so a sibling
user cell resolves to `undefined` and the closure throws (`romanTable is not iterable`), punishing the
decomposition this prompt mandates; `bt-build-and-use` registered a tool and never called it; and one
stale `old_string` in `src-byte-stability`.

**A prompt change that did NOT work, recorded so it is not retried.** The system prompt contains
`wiki` 0 times, `knowledge` 0, `setFileAttachment` 0, `vendor` 0 — an apparent information gap. Adding
a trigger-conditioned `KNOWLEDGE BASE` block pointing at `/content/@tomlarkworthy/markdown-wiki/*.md`
and naming when to read it, A/B'd on the 7 vendoring evals at the same cap and model:

```
MEAN   control 0.507   with-block 0.462   Δ -0.045
       per-eval Δ ranges -0.47 … +0.64
```

The mean delta is an order of magnitude smaller than the per-eval spread, so it measures noise. The
premise was simply false: the CONTROL arm already read the wiki three times in both evals whose
questions never mention it (`wiki_reads=3, question_hints_wiki=False`). deepseek finds the knowledge
base unaided through glob/grep, so the block had no gap to fill — which also answers the question left
open above, whether a model would find the wiki without being told. It does.

The two interventions still worth making are structural rather than prose, and neither was tested
here: a `completeGuard`-style rejection of `task_complete` when the turn registered a tool it never
called (the prompt already mandates calling it, so more text is the wrong instrument), and teaching
`cell_fn_evaluates` to resolve sibling cells from the same file.

**Why vendoring costs 90+ turns — a PRODUCT defect, not a model weakness (2026-08-31).** Profiling the
deepseek trajectories that succeeded at 92–121 steps: `eval_js` dominates (36–72 calls) while
`write_file` fires only 1–3 times — the agent is not rewriting the module, it is stuck probing.
`File not found` recurs 10–17 times per run.

The agent finds the right API immediately. `setFileAttachment` appears at call **#3–#10** in all five
runs, straight after reading the wiki. It then does not work:

```
#3-#10    setFileAttachment(file, runtime.mains.get("@user/stamper"))  → reports success
          FileAttachment("pad.js") → still throws  File not found
#24-#45   ~20 steps of runtime archaeology: _builtins, _variables, _source, rt._modules,
          prototype walks, Object.getOwnPropertyNames
#78-#95   isolates the cause:
          faVar: "function NoFileAttachments(name) { throw new Error(`File not found: ${name}`)"
```

The write path and the read path disagree — but not where the trajectory profiling first suggested.
The repro (`tools/scratch/fa-noop-repro.mjs`, 2026-08-31) falsified the "stub in `_builtins`" theory:
`module._builtins.get('FileAttachment')` is `undefined`, the lazy-create guard fires, and the write
lands in the freshly created builtin's map — not an orphan. The cells still throw because the
runtime cached an implicit variable in `module._scope` the first time any cell referenced
`FileAttachment` (`@observablehq/runtime` `src/module.js:142` checks `_scope` before `_builtins`),
and that variable is an import of the Library's throwing `NoFileAttachments`. `module.builtin()`
never reaches it:

```
1. before attach:    {"ok":false,"e":"Error: File not found: pkg.js"}
   guard: _builtins.get('FileAttachment') = undefined
2. after current fix attempt: {"ok":false,"e":"Error: File not found: pkg.js"}
3. scope var exists: true  type: 2  value name: NoFileAttachments
```

Meanwhile `contentSync` appears 12–20 times against `setFileAttachment`'s 2–13: the agent keeps
drifting back to the `<script>`-block route the wiki calls a dead end, because `contentSync` answers
`200` and looks like it worked.

Consequence for prompt work: the wiki is NOT the bottleneck. Agents read it, follow it on the first
try, and the documented API silently no-ops — which is also why the knowledge-base prompt A/B above
measured nothing.

**`setFileAttachment` fixed (2026-08-31).** After writing the map, it redefines the scope-cached
implicit variable (only when `_type === 2` TYPE_IMPLICIT; a user-defined `FileAttachment` cell is
warned about, not clobbered), which repoints cells at the real resolver AND recomputes dependents —
fixing the second latent defect that even on the working path, `map.set()` never un-stuck a cell
already showing `File not found`. It also read-back verifies via `getFileAttachments(module)` and
throws instead of silently succeeding. `removeFileAttachment` got the same recompute nudge. Verified:
`fa-fix-verify.mjs` (4 scenarios), `fa-module-check.mjs` (real compiled cells, headless), vendoring
oracle 1.00 over 5 in-browser, all 9 oracle-backed evals 1.00.

**What the fix bought, measured (2026-08-31).** `deepseek-v4-flash-0731`, `robocoop-5-eval-bigcap.html`
(cap 120), 1800 s, before/after the patch — same model, same notebook, same evals:

```
                        score           steps
                     before  after   before  after
bare-specifier        0.89   1.00      121     43
relative-multifile    1.00   1.00      121     43
umd-amd               1.00   1.00      107    104
commonjs              1.00   0.80       92     62
gzip                  0.71   1.00      121     26
                     ------ ------   ------ ------
mean / total          0.92   0.96      562    278
suite cost          $0.7349 $0.3139
```

**Steps 562 → 278 (2.0x), cost 2.3x lower, mean 0.92 → 0.96.** The archaeology phase is gone: no run
now spends 20 steps probing `_builtins`/`_variables`/prototype chains.

Caveats, stated because n = 1 per condition and this repo has measured a 6.6x trajectory-length
spread on identical tasks: no single row is significant on its own — the halving of the *total* is
the robust part. `commonjs` moved 1.00 → 0.80 on one criterion, `attachment_contains` for the
`slugpress v0.4.1 (cjs)` banner on `@user/slugger`; every functional criterion passed, including the
weight-4 `live_value_contains` (`["hello-world","a-b-test"]`) and `variable_no_error`, so the module
does vendor and run offline. Diagnosis **unverified**: the world snapshot is not persisted, and the
likeliest reading — the bytes landed on a module other than `@user/slugger` — cannot be checked
after the fact. No mechanism connects it to this patch, which moves no attachment between modules.
One eval wedged with a renderer hang and was retried, plausibly contention from a second suite run
concurrently on the same machine; the 3319 s wall-clock is inflated by it.

The new read-back check fired **zero** times across all five runs (`Error: setFileAttachment:` → 0),
so it produced no false positives. Note for anyone re-profiling: raw `setFileAttachment` counts in a
transcript are now contaminated — the agent reads the patched module source, which mentions the name
repeatedly — so grep for thrown errors, not for the identifier.

### Where deepseek's tokens and wall-clock actually go (post-fix run, 2026-08-31)

`tools/scratch/deepseek-cost-analysis.mjs` and `deepseek-waste.mjs`, over
`results/patterns-deepseek-fafix-0753.json`. Prompt tokens are dominated by **re-billing**: a message
added at turn *i* is resent on every later call, so cost is attributed as `chars x calls-remaining`.

```
prompt 14.3M : completion 229k  =  63:1     output is 1.6% of tokens

re-billed prompt tokens, by source        share   raw chars  msgs
  tool result: read_file                  45.8%       429k     96
  tool result: grep                       29.6%       348k     73
  system prompt                           14.2%       106k     35
  assistant text + tool calls              4.2%        55k    278
  tool result: eval_js                     2.8%        32k    115
  (edit_file + write_file results)          1.3%        17k     21
```

**Three-quarters of the token bill is reading and searching; 1.3% is writing code.** The estimate
recovers 9.9M of the measured 14.3M (ratio 1.44) — tool schemas, reasoning tokens and the 4 chars/token
approximation account for the gap, so read the *shares* rather than the absolute figures.

Tool calls tell the same story: `eval_js` 115 (35%), `read_file` 96 (30%), `grep` 73 (22%), against
`write_file` 6 and `edit_file` 15 — **6% of calls produce code**.

Two concrete wastes:

1. **53% of `read_file` calls re-read a path already read in that same eval** (51 of 96, 221k chars).
   The most-read paths are not the task's files but the harness's own plumbing:
   ```
   18  /src/@tomlarkworthy/robocoop-5-srctools.js
   17  /src/@tomlarkworthy/file-sync.js
   14  /src/@tomlarkworthy/exporter-3.js
   13  /src/@tomlarkworthy/fileattachments.js
   10  /content/@tomlarkworthy/markdown-wiki/vendoring-npm-dependencies.md
   ```
2. **73% of `eval_js` snippets still touch runtime internals** (`_builtins`, `_variables`, `_scope`,
   `_runtime`), and 13% still try the `contentSync` dead end. The implicit-variable fix removed the
   *failure*, not the *archaeology*.

The cause is structural, and it is a gap in the tool surface rather than in the prompt or the docs:
**robocoop-5 has no write-side attachment tool.** `robocoop-5-srctools.js` lets an agent read
attachments (`/content`) and decode them (the `eval_js` description documents the gzip recipe at
length), but the only way to *create* one is to hand-roll `setFileAttachment` inside `eval_js`, which
first requires discovering `window.__ojs_runtime.mains.get(<id>)`. That discovery is what the 84
internals-probing snippets and the 62 reads of four infrastructure modules are buying.

An `attach_file` tool would delete that whole phase, and the module it needs is already imported at
`robocoop-5-srctools.js` (`main.define("module @tomlarkworthy/fileattachments", …)`).

**Implemented and measured (2026-08-31).** `attach_file({module, name, content | url, mime?})` added
to `fileTools` in `@tomlarkworthy/robocoop-5-srctools`; `url` mode fetches in-page and stores the
response bytes as-is, so binary/gzip works and the library never enters the model's context. Gated by
a direct Playwright probe (`tools/scratch/attach-file-probe.mjs`: erroring cell recovers on attach,
binary via data: URL, three ERROR paths) and the vendoring oracle (still 1.00/5 — the oracle does not
use the tool). The vendoring wiki doc now leads with it.

The three-arm chain, deepseek-v4-flash-0731, same notebook (cap 120), same 1800 s timeout:

```
                       baseline      +FA fix      +attach_file
                     score steps   score steps   score steps
bare-specifier        0.89   121    1.00    43    1.00    18
relative-multifile    1.00   121    1.00    43    1.00    22
umd-amd               1.00   107    1.00   104    1.00    38
commonjs              1.00    92    0.80    62    0.87    18
gzip                  0.71   121    1.00    26    1.00    12
                     ----- -----   ----- -----   ----- -----
mean / total          0.92   562    0.96   278    0.97   108
suite cost           $0.7349      $0.3139       $0.0823
```

**Steps 562 → 278 → 108 (5.2x), cost 8.9x lower than baseline, mean 0.92 → 0.97.** The predicted
collapse happened: `eval_js` 115 → 12 calls, of which runtime-internals probing 84 → **1**;
`read_file` 96 → 53. Every eval used `attach_file` (7 calls across 5 runs), `url` mode throughout.
The only lost criterion in the suite is `commonjs`'s `not_contains_string: eval.test` — both times a
markdown provenance *link* (`[packrat@5.0.0](https://eval.test/…)`) in the module's title cell, good
authorship punished by a criterion aimed at runtime fetching. That criterion should match executable
fetch/import usage, not any occurrence of the string; left untouched mid-measurement for
comparability.

mimo-v2.5 ran the fix-only arm once (`patterns-mimo-v2.5-fafix-0807.json`, no attach_file calls in
any row): commonjs 74 → 23 steps, gzip flat at 112, umd-amd 26 → 50 with score 0.71 → 0.88, and two
rows destroyed by 1800 s *turn*-cap timeouts at ~3 min/step (provider latency, two suites sharing
the machine). Read as no-regression, not confirmation — n = 1 per cell against a known 6.6x
trajectory-length spread.

### Full-suite head-to-head after both fixes (2026-08-31)

Both models, full 54-eval suite, canonical `@tomlarkworthy_robocoop-5.html` (shipped
`maxStepsPerTurn: 40`), run strictly solo. deepseek 900 s / conc 5; mimo 1800 s / conc 3 (its
latency episodes; no row hit either cap).

```
                        mimo-v2.5    deepseek-v4-flash-0731
mean aggregate            0.9978        0.9753
perfect evals             53 / 54       50 / 54
total steps                349           486
median steps                 4           (—)
suite cost                $0.0953       $0.2971
prompt tokens (cached)    4.5M (91%)    10.1M (83%)
wall-clock                3342 s        4889 s
```

Every category ties at 1.000 except three, and every one of the six imperfect rows has a named cause:

- `vendoring-patterns` (mimo 0.976, deepseek 0.953): **all three** misses are the
  `not_contains_string: eval.test` provenance-link criterion (mimo 1, deepseek 2) — the eval defect,
  not the models.
- `build-tool` (deepseek 0.40): `bt-build-and-use` registered `rot13` and never called it — the
  pre-existing defect the `completeGuard` idea targets; mimo called it.
- `vendoring` (deepseek 0.75): `vendor-npm-attachment` 0.50, attachment not on `@user/chunker`.

The mimo namespace defect (`@tomlarkworthy/` for `@user/`, 2 of 5 rows in the vendoring-patterns arm
an hour earlier) **did not appear once** in this sweep — all `write_file`/`attach_file` targets
verified `@user/…`. With 4/9 baseline incidence, 0/9-ish here is consistent with both luck and the
shorter trajectories leaving less room to drift; not settled.

Verdict: with the product defects fixed, the models are inseparable on score (Δ0.02, inside single-run
noise) and **mimo is 3.1x cheaper**. The pre-fix benchmark was measuring the harness, not the models:
the same pair scored 0.74 vs 0.92 on vendoring-patterns two days ago. Remaining suite losses are two
eval defects (`eval.test` criterion, `bt-build-and-use` guard) plus one real deepseek attachment miss.
Raw results: `full-sweep-{mimo,deepseek}-postfix-*.json`.

Separately, **58% of the suite's wall-clock was one wedge**: 3319 s total against a 1381 s slowest
eval, because `relative-multifile` hung for 2100 s on a renderer stall before its retry succeeded in
309 s. That is environment, not model — and a second suite was running concurrently on the same
machine. Per-step latency on the clean evals is 6.6–8.8 s. Swept to all 232 consumer notebooks;
differential preflight attributes **0 of its 14 NEW findings to this change** — none mentions
`fileattachments`. 12 are in `tomlarkworthy_spreadsheet.html` and `@tomlarkworthy_sheet.html`,
neither present in the 2026-08-19 baseline, so every finding in them is new by construction; the
other 2 are `robocoop-5-srctools: {pathLib,applyLib} declares importShim … but never uses it` in
`@tomlarkworthy_lopecode-newsletter-002.html`, byte-identical to findings the baseline already
carries 16 times for that module, surfacing because the notebook gained six `robocoop-5*` blocks in
the working tree (the fileattachments sweep reported `0 carried`, so it did not add them).

**`cell_fn_evaluates` fixed (2026-08-31).** It filled cell params from `LIB_STUBS` only, so a sibling
USER cell resolved to `undefined` and the returned closure threw on the first case. `resolveCellValue`
in the same file already did the right thing — explicit input, then lib stub, then sibling cell,
recursively with a cycle guard, with a comment saying it exists so decomposition is not penalised —
`cell_fn_evaluates` just did not use it. Now it does. Verified by re-scoring the ACTUAL module source
deepseek wrote, recovered from the sweep transcripts:

```
algo-roman       PASS  toRoman satisfies 4 case(s)
algo-word-count  PASS  wordCount satisfies 2 case(s)
```

Both answers were correct in the live runtime all along. Self-contained cells still pass (control) and
the cycle guard terminates. deepseek's corrected sweep mean: **0.895 → 0.923**. Other models are
unaffected — they happened to write self-contained function cells and already passed.

Two harness defects surfaced and were fixed during these runs:

- **A turn-cap timeout was being retried three times identically.** `session.send timed out after
  Nms` is deterministic — the re-run expires the same way — so it now fails fast alongside the quota
  errors (`robocoop-eval/run-cli.mjs`). Two thirds of the 300 s run's 1500 s and 120 calls bought
  nothing.
- **Attachment content checks were blind to compression.** The first run stored a correct
  `@user/painter/paintbox.umd.js.gz` (388 B) — the corpus-standard form this repo's own doc
  recommends — and lost `attachment_contains` against gzip bytes. `collectAttachments` now pipes a
  gzip attachment through `DecompressionStream` before capturing `text`; `size` stays the stored size
  so `vendor-pattern-gzip`'s compression requirement still measures what it did. Oracle gate
  re-verified 1.00 across all five afterwards.

## Results (mimo-v2.5-pro, 2026-07-05)

Full-sweep trend 0.95 → 0.96 → 0.97 → **1.00** over 45 evals (~$0.2/run; the 1.00 ran on the
refactored modules + unified harness), each systemic cause fixed at the root:
- jbApply plumbing upsert (import-cross-module 0.63 @ 41 steps → 1.00 @ 3).
- completeGuard + prompt guards for mimo's step-1 fabricated completions (fired live in
  net-fetch-json; that eval passed).
- toolsProvider last-non-empty fallback for the registry re-registration window.
- grader fix in rc4's criteria.mjs (fnParamsBody brace scan is now string/comment-aware).

Residual variance is model-stochastic (different single flake each sweep, passes on re-run).
long-store-to-checkout: 8 steps (robocoop-4 C-arm mean 10.3). Gate categories (editor-lifecycle,
drive-ui, build-tool): 1.0.

## Iterating on the system prompt

The prompt lives in the `systemPrompt` cell of `modules/@tomlarkworthy/robocoop-5-engine.js`. Edit it,
then:

```bash
bun tools/channel/sync-module.ts --module @tomlarkworthy/robocoop-5-engine \
  --source modules/@tomlarkworthy/robocoop-5-engine.js \
  --target lopebooks/notebooks/@tomlarkworthy_robocoop-5.html
node tools/robocoop-5/eval/run.mjs --ids long-store-to-checkout   # or a category / full sweep
```
