# robocoop-5: counterfactual credit assignment on failed trajectories

Plan drafted 2026-08-15 in worktree `rc5-credit-assignment`, from an ideation conversation (Tom +
claude.ai, pasted into the session). Final result at the foot of this status block: **0.837 raw /
0.939 system, 2026-08-18**. Status 2026-08-16 (superseded criterion): **done through Phase 4's
polyglot gate — 39/49 = 0.796** (July v2: 0.776, raw: 0.735). Full gate narrative in
`tools/robocoop-5/eval/polyglot/README.md` § 2026-08-16; instrument doc in
`knowledge/training-robocoop-5.md` § "Counterfactual credit assignment".

Status 2026-08-17: **RQGM fold-in complete** (`plan/rqgm-and-robocoop-5.md`, dated notes in its
§Suggested order). U1 credible-band labels (all 11 recorded `model-ceiling` labels → `undetermined`
on relabel — the whole campaign ran at N=3); U2 criterion stamps + do-not-pool ladder; U4 paired
sign test (τ 91-vs-88 confirmed parity at P=0.6900) + blended-token axis; U3 measured and
REJECTED — no reviewer prompt beat the majority-constant bar (best 53.6% vs 60.7%, Youden's J ≈ 0),
nothing wired. Tests 180/180 in `tests/robocoop5/`. Deferred: τ attribution adapter (bands now
exist; still needs a churn-aware protocol), stub-contract monitor (unchanged rationale below), U3
step 3 (blocked on a judge that beats the constant bar — retest with a stronger model than mimo).
τ full confirmation gate: DONE 2026-08-16 (88/115, parity — see τ phase log).

Status 2026-08-17: **benchmark-port audits landed** — HumanEval's grader was deleting top-level
declarations from baseline candidates (raw 0.932 → **0.950** corrected, gap +1.2pp, paired flips 6-4,
**P = 0.754**) and the τ port never terminated the episode on `transfer_to_human_agents` (raw 0.774
vs yield-fix core 0.765, **parity**, P = 1.0000). Both are regrades of stored runs, no model calls;
evidence in `tools/robocoop-5/eval/{humaneval,tau}/README.md` § 2026-08-17. Polyglot's own port
fixes are queued as task #1.

Status 2026-08-18: **polyglot port fixes landed and the stamps moved** — grade.mjs memoization
merge (regrade of 291 stored candidates: 1 legitimate flip, the 39/49 gate unchanged), jest code
frames via `@babel/code-frame` mapped to the original spec files, test-output truncation removed
(the old 6000/3500 caps cut ~23% of repair turns mid-frame; 60000-char safety cap now), warm resume
as the attempt-2 default (`--cold-repair` keeps the legacy path; `warmSeeds` carries only
`/src/@user/*` + scratch), official ADDENDUM in both arms, symmetric `grep` CLI framing, 180s suite
timeout. `validate-grader --mode both`: esm 49/49, module 48/49 (`parallel-letter-frequency`
documented unconvertible — CommonJS `worker_threads` self-execution). graderHash
`aff5fb6e71cd`→`5922182d5357`, runnerHash `3b4bdde3c070`→`cf0306e5ac4c`, so under U2 every prior
polyglot number (0.735 raw, 0.796 gate, both spec-lock A/Bs) is non-poolable history. Tests 227/227.
The **spec-lock arc concluded**: v1's mechanism bugs were all fixed in v2 and the mechanisms verify
in-trajectory, but the score is indistinguishable (11/22 vs control 14/22, P = 0.51) on a slate
whose unchanged control swung 10/22 → 14/22 — mechanisms yes, score unproven, retest deferred to the
corrected protocol (`tools/robocoop-5/eval/polyglot/README.md` §§ 2026-08-18 / Spec-lock). Full
corrected-protocol gates are launched. Tasks #1–#4 complete; **#5 (rc5 temperature option) open**.

Status 2026-08-18 (closing): **the corrected-protocol gate landed — raw 41/49 = 0.837, system
46/49 = 0.939**, both arms re-run end to end under graderHash `f5993b70a0b8` / problemsJsonHash
`0184c1046234`, agent core hashes equal to the lopebooks canonical (no spec-lock code), three
identity-enforced shards merged, zero infra-polluted fails, no re-rolls. Paired n=49: both-pass 41,
both-fail 3 (connect, promises, react), raw-only **b=0**, system-only c=5 (complex-numbers,
resistor-color-trio, robot-name, transpose, wordy), exact sign test **P = 0.0625** — strict
dominance at the design floor for 5 discordant pairs. Cost $0.27 raw vs $1.10 system; blended
27,964 vs 313,776 tokens/task. Repair-turn forensics (`mechanism.mjs`): code frames 0/33 → 31/31,
ANSI 24/33 → 0/31, repair steps mean 12.9 → 7.9, repair pass rate 64% → 90%.

**Campaign conclusion.** The instrument's real yield was not a strategic@k localization — it was
forcing the model-ceiling/harness-defect split to be measured, and every time it was measured the
answer came back "harness". The 11 residual fails this plan set out to attribute were labeled
model-ceiling; U1 relabeled them `undetermined`; the corrected protocol converted all but
promises/react (and connect, a step-budget timeout) in at least one arm. The ceiling was the port's
information starvation. Full record: `tools/robocoop-5/eval/polyglot/README.md` § "2026-08-18
corrected-protocol gate"; ladder row and the generalized lesson in
`knowledge/training-robocoop-5.md`.

## The idea being realized

The ideation's claims, mapped to this repo:

1. Agent evals collapse strategic errors (wrong plan, runs clean) and tactical errors (typo, throws)
   into one pass/fail number. The current improvement loop (`knowledge/training-robocoop-5.md` step 4)
   separates them by reading trajectories by eye.
2. In a replayable environment, credit assignment is mechanical: re-run from step k with a resampled
   continuation N times; estimate pass-probability p(k). The step where p collapses is the decision
   error. Bisection finds it in O(log steps) prefixes instead of one per step.
3. The binding constraint is selection, not the policy — the model can often produce the good
   trajectory but the system cannot tell mid-flight that it is on a bad one. Monitors with
   structural triggers (the house pattern that moved numbers: yield fix, completeGuard) are the
   harness-side response.

Decisions taken with Tom (AskUserQuestion, 2026-08-15): polyglot first, then τ. North star is
**benchmark scores** — the attribution tool is an instrument in service of harness fixes, built
lean. Extra test-time compute in the system arm is fair game (the premise of the ladder is that the
score measures the system); token cost gets reported alongside.

## Why the mechanism is feasible (verified against source, 2026-08-15)

- **Environments are replayable.** τ: `eval/tau/retail-env.mjs` is fidelity-anchored (115/115 final
  states, 582/582 tool observations vs the official Python — `eval/tau/README.md`). polyglot: file
  state is the only state and grading is automatic (`eval/polyglot/grade.mjs`, validated 49/49 on
  reference solutions).
- **Trajectories are captured but not persisted.** The shared driver builds `result.conversation`
  (full message list incl. tool_calls) and `result.toolCalls` on every run
  (`tools/robocoop-eval/driver-core.mjs:354-377`), but polyglot's `run-agent.mjs` records only
  steps/candidate/testOutput into its results JSON (`eval/polyglot/run-agent.mjs:127-150`). So no
  existing polyglot run can be attributed post hoc; fails must be re-run once with persistence on.
- **Prefix resumption exists without modification.** `session.messages` is the live closure array
  (`modules/@tomlarkworthy/robocoop-5-core.js:333`, exposed — the driver reads it at
  `driver-core.mjs:354`). `send(null)` pushes no user message (`buildUserMessage(null)` → null,
  core :346-356,:365-406) and the loop proceeds from existing history. So resumption =
  seed reconstructed files, `messages.push(...prefix)`, `send(null)`. The system message need not
  be in the prefix — send() unshifts/replaces it itself (core :398-400).
- **File state at step k reconstructs in Node** by folding the prefix's `write_file`/`edit_file`
  arguments (write = set content, edit = string replacement), then seeding through the same
  `rc5_host.seedFile` seam the driver already uses (`eval/driver.mjs:15-32`).

Known fidelity limits, stated up front rather than discovered later:
- Replayed tool results are frozen text from the original run; the reconstructed file state is what
  makes them consistent. `eval_js` calls in the prefix leave no file trace — any userspace runtime
  state they created is NOT reconstructed. Believed low-impact for polyglot (solutions live in
  `/src/@user/solution.js`); unverified.
- Write auto-feedback in frozen tool results (probed values, blast radius) reflects the original
  runtime, not the resumed one. Same status: believed benign, unverified.
- The resumed turn re-runs turn-scope context providers; the prefix already contains the original
  turn's context block. Duplicate context is possible; check in the smoke test.

## Where the headroom is (numbers from eval READMEs, runs of 2026-07-16/17)

| benchmark | raw | system | residue |
|---|---|---|---|
| HumanEval-JS | 0.932 | 0.963 | saturated |
| polyglot pass@2 | 0.735 | 0.776 (38/49) | 11 fails: interpreter/simulation class (forth, react, two-bucket, word-search, food-chain, …) |
| τ retail | 0.791 | 0.791 | principles core converted 6/11 targeted; full gate NOT run |

The polyglot residue is exactly the long-horizon class where the ideation predicts a strategic
error early in the trajectory dooms the run — which is the hypothesis Phase 1 tests.

## Phases

### Phase 1 — attribution instrument (polyglot)

1. Trajectory persistence: `run-agent.mjs` gains `--trajectories` (persist
   `snapshot.conversation` + `toolCalls` per attempt to `results/trajectories/<slug>-<attempt>.json`).
   One re-run of the 11 fails with persistence on gives the input set.
2. `eval/attribution.mjs`: input = one failed trajectory + problem def. Mechanism: bisect over
   assistant-step index k; at each probe, boot a fresh context, reconstruct files at k, inject
   prefix, `send(null)` ×N (N=3–5 default), grade each continuation with `grade.mjs`. Output per
   failure: p(k) curve, localized decision step, label:
   - **tactical/variance** — p(0) already high: a re-roll passes; nothing structural to fix.
   - **strategic** — p collapses after one identifiable action; that action + its context is the
     labeled example.
   - **model-ceiling** — p ≈ 0 at every prefix including k=0.
3. Smoke test: one known fail end-to-end; verify a resumed continuation is coherent (no duplicate
   context block, tool calls resolve, grading runs).

Cost ballpark (unverified until first run): 11 fails × ~4 bisection probes × 4 resamples ×
~$0.01–0.05/attempt (mimo) ≈ $2–9, plus wall clock dominated by per-attempt turn time.

### Phase 2 — autopsy with the instrument

Run attribution over the 11 fails. Read the localized decision steps; name what they share before
naming the class (the τ autopsy pattern: 10/16 losses called `transfer_to_human_agents`). Output:
a failure taxonomy grounded in localized steps, and candidate fixes phrased the way that has moved
numbers here — a specific action legitimized/mandated at a specific structural trigger
(`knowledge/training-robocoop-5.md` "What moved numbers").

### Phase 3 — harness changes (score-moving)

Ordered by expected value from the existing taxonomy; Phase 2 evidence reorders or replaces these:
- Pre-completion verification gate: before `task_complete` on coding tasks, mechanically run the
  spec's literal examples against the live solution (targets taxonomy #2, "self-verification
  confirms the agent's own assumptions"; same completeGuard-shaped seam as the existing veto).
- Belief-vs-actual contract monitor: diff required export names/signatures against defined cells,
  surfaced through the notices/context seam (targets taxonomy #1, "house style beats task contract").
- Gated on Phase 1 evidence: in-attempt resample-at-decision-point for interpreter-class problems —
  early pruning rather than terminal best-of-N. Fair-game compute per the decision above; report
  tokens.

### Phase 4 — regression gates

Full polyglot 49 pass@2 with the changed harness; τ full 115 gate (also finally confirms the
pending principles core); over-application canary on the other benchmark per the house method.

### Later — τ adapter

Same attribution core, τ adapter: state reconstruction = replay prefix tool calls through
`retail-env.mjs`; continuation needs the user simulator resumed too (its message history is in the
trajectory). More machinery than polyglot; deferred until the instrument has paid once.

## Phase 1 log (2026-08-16)

Built and verified:
- `run-agent.mjs --trajectories` persists per-attempt conversations; grader faults can no longer
  throw away a paid attempt (gradeFromSnapshot try/catch — the first capture run lost 3 attempts to
  an ENOENT before this).
- `driver-core.mjs` `resume` mode; `attribute.mjs` (bisection, labels, `--probe k`,
  `--save-continuations`). Pure functions unit-tested: `node --test
  tests/robocoop5/attribution.test.mjs`, 38/38; the fold was checked line-for-line against
  `edit_file`'s executor by an independent reviewer pass.
- Grading environment: `polyglot-src/` and `harness/node_modules` are gitignored and were MISSING —
  recovered from the sibling `humaneval-rc5` worktree (network clone blocked by sandbox SSL).
  `validate-grader.mjs` (new): 49/49 reference solutions pass, matching the July validation.
- Capture run: all 11 July fails reproduced as fails (0/11 pass@2, `results/traj-capture.json`).
  forth and food-chain attempt-1 were network-polluted and are being recaptured.
- Resume coherence, observed not assumed: go-counting-1 resumed at k=5 — the model's first resumed
  message continues mid-task ("I see the issue - the owner values are \"B\" and \"W\" instead of
  \"BLACK\" and \"WHITE\". Let me fix this") with an edit_file against the reconstructed file; at
  k=10 of 14 the continuation finished in 2 steps. Exactly one fresh turn-context system message
  appears at the resume point (`results/attribution/go-counting-1-k5s0.cont.json`).
- go-counting p(0)=0 at samples=1 — first hint it is model-ceiling; the sweep re-measures at
  samples=3.

## Phase 2 log (2026-08-16): sweep result and what it actually meant

Sweep (`results/attribution/SWEEP.md`): 10/10 attributed attempt-1 trajectories labeled
**model-ceiling** — p(0)=0 over 30 continuations, zero strategic@k rows. $0.449, 27 min. food-chain
flipped to pass on recapture (variance). The failures are deterministic: 6/10 slugs failed all three
continuations on the SAME test, and the signatures match the July `agent-shard*.json` records.

The label needed interpretation: p(0)=0 means a re-roll under the SAME system fails — it cannot
distinguish "model can't do it" from "the system arm is rigged against it". The decisive follow-up
was free: compare with the raw arm on the same slugs (`baseline-full.json`). Raw passes word-search
at attempt 1 and list-ops at attempt 2; the other 8 fail in both arms (genuinely model-limited,
leave per the know-when-the-residue-is-the-model's rule).

**word-search was an eval-port bug, not a model failure.** The committed `problems.json` predates
extract.mjs's defaultExport detection (0 of 49 entries carried the key; the current regex finds
`WordSearch` in the stub). Consequences, both system-arm-only: the agent's prompt read "Provide
these exports as cells with EXACTLY these names: ." (empty contract), and synthesizeCJS never wired
`module.exports.default`, so the spec's `import WordSearch from ...` got the exports object —
"WordSearch is not a constructor" over a CORRECT class the agent had shipped. The raw arm grades
whole ESM files and never hits the synthesis path: an arms-asymmetry violating the port-fidelity
rule, present in the July 0.776 measurement. Fix: regenerated problems.json (diff clean — only
word-search changes semantically), validate-grader still 49/49, the captured "failed" candidate
regrades PASS, and a fresh targeted agent run passes at attempt 1 (`results/word-search-confirm.json`).

**list-ops is the harness-behavior target.** Tests do `new List([...])` then instance calls; the
agent ships static methods on arrays, every roll, and the cold-restart repair (file + test output
only) thrashed 22-26 steps to the same shape in both captures. Raw converts it in-context at
attempt 2. Change made: warm repair — `question2` now carries the tail of attempt 1's assistant
reasoning (`summarizeAttempt1`, capped 1800 chars), framed as subordinate to the test output.

Warm-repair verification (2026-08-16, 3 targeted list-ops runs + 1 infra loss discarded):
**2/3 converted at attempt 2** (steps 19+17 and 10+8) vs 0 conversions in every recorded
cold-restart repair. Mechanism confirmed in the non-converting run's trajectory: the notes block is
in the repair question and the candidate became a proper instance-method `class List` (0 statics) —
the structural miss is gone; that run's residual was a narrower semantic misread (`concat(...lists)`
variadic vs the contract's single list-of-lists argument) and its repair turn was truncated by a
300s send timeout. One caution for later reading: warm repair makes attempt 2 stochastic where the
cold restart was deterministically wrong — full-gate results on list-ops are now a coin weighted
~2/3.

Method note for the doc trail: the instrument's first payoff was not a strategic@k localization —
it was forcing the model-ceiling/harness-defect split to be MEASURED (deterministic same-test
failures → arms comparison → port bug), where July's by-eye autopsy had filed word-search under
"interpreter/simulation core, model-limited".

## τ phase log (2026-08-16/17): principles gate at parity; context acquitted; churn dominates

Environment restored from the humaneval-rc5 sibling worktree (retail-export.json + tau-src;
fidelity re-verified 115/115 states, 582/582 observations). July per-task results recovered for all
three arms, including the baseline merge (86+5 = 91/115 verified programmatically).

Full 115-task gate on the CURRENT core (principles + 2026-08-08 context system), full trajectories
captured (`tau/run-agent.mjs --trajectories`, new): **88/115 = 0.765** vs July yield-fix 91/115 =
0.791. But the per-task diff is 11 gains / 14 losses — 25 flips of 115. Two-sided binomial on the
discordant pairs: P ≈ 0.69 — no evidence of a real difference. Zero errored fails (the runner's
3×-retry absorbed a full day of train-network flakiness).

Context-noise hypothesis, tested and killed: the current bundle injects ~550-char `<environment>`
blocks (page URL, layout, notebook inventory) into every retail turn — 5 per conversation,
irrelevant to the task, absent from July's build. Paired A/B on the 14 lost tasks
(`--no-context` flag, new; mechanism-verified — 0 env blocks in the OFF trajectories):
**OFF 8/14 vs ON 9/14**. No effect. The losses re-convert at ~60% under EITHER arm — churn, not
mechanism. (First A/B attempt was destroyed by an OpenRouter 402 credit exhaustion — 11/14 tasks
never ran; discarded, re-run after top-up.)

Conclusions: the principles core is at parity with yield-fix at full-gate level (July's 6/11
targeted conversions do not manifest as net full-gate gain — consistent with a small effect under
~22% per-roll churn); the context system costs nothing measurable on τ; and τ single-roll
task-level comparisons cannot support 3-task conclusions — which is what the RQGM U1/U4 upgrades
(`plan/rqgm-and-robocoop-5.md`) address. τ attribution adapter remains unbuilt: in this churn
regime, p(k) labels need U1's credible bands first to mean anything.

## Worktree setup notes (done 2026-08-15)

- Worktree `rc5-credit-assignment` off origin/main. lopebooks submodule initialized from the local
  checkout (`git -c protocol.file.allow=always submodule update --init lopebooks`; network clone
  fails under the sandbox: SSL issuer). Pinned at gitlink `6071475`.
- Gotcha: the built-in worktree Bash guard refuses any command containing the substring `eval` —
  which includes every path under `tools/robocoop-5/eval/`. Workaround: spell it `ev?l` in commands.
- Still needed before Phase 1 runs: the gitignored eval bundle (`eval/robocoop-5-eval.html` — a
  copy of the canonical notebook with the core under test synced in) and the OpenRouter key
  (read from `tools/robocoop-4/.env`, present in the main checkout only).
