# RQGM upgrades to the robocoop-5 eval/attribution stack

Plan drafted 2026-08-17 for handoff to the `rc5-credit-assignment` worktree team. Written in the
main checkout (this session does not write into another session's worktree); the changes target
files on branch `worktree-rc5-credit-assignment`.

Sources, and how they were read:
- **The paper.** "The Red Queen Gödel Machine: Co-Evolving Agents and Their Evaluators", Iacob,
  Jovanović, Shen et al. (Cambridge / NVIDIA / Flower Labs / MBZUAI / Inria), arXiv:2606.26294v2,
  29 Jun 2026. Read 2026-08-17 from text extracted out of the PDF with a hand-rolled
  ToUnicode-aware scraper (no pdftotext on this box); inter-word spacing and math glyphs are
  imperfect in the extraction, so the quotes below are faithful to wording but re-spaced. Section
  numbers cited are from that extraction.
- **The worktree.** `plan/robocoop-5-credit-assignment.md` (status 2026-08-16),
  `tools/robocoop-5/eval/polyglot/attribute.mjs`, and the modified
  `knowledge/training-robocoop-5.md` §"Counterfactual credit assignment", all read 2026-08-17 at
  worktree HEAD `199e82c` + dirty state.
- Interval computations in this doc were run 2026-08-17 (python3, continued-fraction regularized
  incomplete beta, bisected quantiles); the command is reproducible from the numbers alone.

## The paper, reduced to what we need

RQGM extends the Huxley Gödel Machine (HGM) family: self-improvement as tree search over an
archive of agent nodes, each node scored by binary task outcomes pooled into a Beta posterior.
Selection uses Thompson sampling over clade metaproductivity (a node's subtree-pooled success
rate); the final pick maximizes the **ε-best-belief score** `BB_ε = I⁻¹_ε(1+S, 1+F)` — the
ε-quantile of Beta(1+S, 1+F), i.e. a lower credible bound on the pass rate, not the raw ratio
(§3.1).

Three additions over HGM:

1. **A node is a workspace of roles** — task agents AND their evaluators in one editable codebase;
   utility averages uniformly over a role's tasks, then over roles (§3.2).
2. **Controlled utility evolution** — search is cut into epochs; each evaluator slot is frozen
   within an epoch (stationary utility → HGM's guarantees hold per epoch) and may be replaced only
   at an epoch boundary, only when the challenger beats the incumbent's BB_ε on a **ground-truth
   anchor** (a fixed held-out labelled set, evaluator-independent so scores compare across epochs;
   ties favour the incumbent) (§3.4–3.5).
3. **Selective erasure** — on replacement, every utility record produced by the displaced
   evaluator is deleted, not rescaled: "keeping stale utilities or re-scaling them onto the new
   evaluator would mix evidence from different utility functions and violate the condition
   required by our guarantees" (§3.5). Re-scoring is lazy (only when sampling revisits a node),
   with exponentially spaced checkpoints keeping bookkeeping O(budget).

The coding experiment (§5.1) is on **Polyglot** — their held-out multi-language split, GPT-5.5
(low), searched agent code; not comparable to our 49-problem JS slice under mimo, do not put the
numbers in one table. They co-evolve a **code reviewer** alongside the coder: an agent-as-a-judge
scoring each patch once at generation time, anchored to CRAVE (a dataset of accepted/rejected pull
requests), averaged in as a second utility next to test execution. Result 71.7% held-out vs the
HGM-H baseline's 69.9% at 1.35–1.72× fewer blended tokens (blended = input + 5×output, generation
AND evaluation calls). 90% of accepted patches edited infrastructure shared by coder and reviewer.

The ablations (App. D.2, Nemotron 3 Super, 12,288-evaluation budget) are the part that
constrains us:
- replacement off → the writer saturates its frozen critic at 75/75 accepted (reward hacking);
- erasure off → stale records keep the displaced ordering, the slot oscillates A→B→A, replacements
  stop triggering, "driving the search to explore the same nodes repeatedly".

Authors' own limits (§6.1): guarantees are epoch-local only; "evaluator quality is only as good as
its anchor". The paper is self-described as preliminary, short search horizons.

## Why this maps onto the worktree at all

`attribute.mjs` estimates p(k) — pass-probability of a resampled continuation from trajectory
prefix k — by N graded continuations pooled per probe. That is the same estimator RQGM runs on a
different tree: their nodes are edited agent workspaces, ours are trajectory prefixes, but both
are "boot from a node, sample a rollout, record a binary outcome, pool into a Beta". So the
paper's statistical machinery is drop-in, and its ablations describe failure modes we have already
exhibited (U1, U2 below). The search algorithm itself does NOT map — see "Not ported".

## U1 — replace the hard-threshold label with BB_ε credible bands

**The defect, measured.** `attribute.mjs:219` labels `model-ceiling` when `p(0) < threshold`
(default 0.5, `:103`) from `--samples 3` (`:102`). At N=3 that fires on 0/3 or 1/3. The Jeffreys
95% interval for 0/3 is **[0, 0.536]** — three failures are compatible with a true pass rate of
0.54, so "even a fresh attempt fails" (the label's gloss at `:17`) is not supported by the data
that assigns it. The first campaign bore this out: of 10 `model-ceiling` labels, **4 were later
falsified** — word-search (eval-port bug), list-ops (protocol asymmetry), go-counting and
simple-linked-list (both converted at attempt 2 under warm repair in the gate). See
`plan/robocoop-5-credit-assignment.md` Phase 2 log and `knowledge/training-robocoop-5.md`
§"Counterfactual credit assignment". A 40% label error rate, caught only because the arms
comparison was free.

**The fix.** Label from the posterior's bounds, three-way:
- `model-ceiling` only when the **upper** 95% bound < threshold. Reference points: 0/10 → upper
  0.217; 0/30 → upper 0.080. 0/3 never qualifies.
- `variance` only when the **lower** bound ≥ threshold.
- otherwise `undetermined` — an instruction to buy more probes for that prefix, not a verdict.

This is RQGM's BB_ε applied at both tails, ~10 lines in the label block at `:217-229` plus an
incomplete-beta helper (unit-testable next to the existing `tests/robocoop5/attribution.test.mjs`,
38/38 as of 2026-08-16). Budget then concentrates where the data is actually ambiguous instead of
being spent uniformly and trusted uniformly.

**Alternative rejected:** raise `--samples` globally (e.g. to 10 everywhere). Costs ~3× per sweep
and still emits a binary label at the boundary; the band version spends the same tokens only on
the undetermined cases and says so in the output JSON.

**Verification:** re-run the labeler over the already-captured continuations
(`results/attribution/`) with no new model calls — the four falsified slugs must come out
`undetermined`, not `model-ceiling`.

## U2 — evidence stamps + selective erasure for eval results

**The defect, already on record.** The word-search failure was a system-arm-only port bug
"present in the July 0.776 measurement" (worktree plan, Phase 2 log): the committed
`problems.json` carried an empty export contract, so the July criterion and the current criterion
are different utility functions. The ladder row still pools across them —
`0.796 (v2 prompt: 0.776; v1: 0.633)` — presenting scores under three harness versions and (at
least) two grader versions as one progression. This is the paper's no-erasure ablation arm run on
ourselves; their observed symptom (stale evidence pins the old ordering, transitions stop firing)
reads here as: already-fixed problems keep looking unfixed, and version deltas are
uninterpretable. The existing informal rule — "re-sync the eval bundle after core edits or the run
measures the old prompt" (`knowledge/training-robocoop-5.md`, gotchas) — is this mechanism without
the bookkeeping.

**The fix.** Stamp every result JSON with the criterion identity:
`{model, promptHash, coreModuleHashes, problemsJsonHash, graderVersion}` (the driver already knows
all five at run time). Then two rules:
- **Never pool across stamps.** A ladder row is (score, stamp, date). A superseded stamp's row
  stays in the table as history but is marked displaced, mirroring selective erasure: don't
  rescale, don't average, just stop counting it as current evidence.
- **Re-score lazily.** When a criterion change invalidates old records (as the `problems.json`
  regeneration did), affected slugs are re-graded from cached candidates where grading is pure
  (word-search's captured "failed" candidate regraded PASS with zero model calls — the mechanism
  already worked once), and re-run only when next needed otherwise.

**Cost:** a few fields in `run-agent.mjs` output and a check in whatever assembles the ladder.
No new runs.

**Verification:** the stamp of the July `agent-prompt-v2-full.json` must differ from the current
gate's stamp on `problemsJsonHash` — that difference is exactly the word-search bug being visible
in metadata instead of in a by-eye autopsy.

## U3 — a reviewer role anchored on our own graded continuations

**The gap this fills.** The first sweep's headline was 10/10 fails at p(0)=0 with deterministic
signatures — under a pass/fail utility those trajectories carry no gradient; there is no step for
bisection to localize. RQGM's coding arm is aimed at exactly this: add a second, cheap,
non-degenerate utility (the reviewer scores every patch on quality, one call, even when all test
outcomes agree) rather than sharpen the first one. Their evidence that it pays even where a
verifier exists: the §5.1 pass-rate and token numbers above, plus the 90% shared-infrastructure
observation.

**The anchor is already being generated as a side effect.** Every attribution continuation and
every gate attempt is a `{patch, passed?}` pair — our agent, our benchmark, our distribution
(`attribute.mjs --save-continuations`; `run-agent.mjs --trajectories`). That is a CRAVE analogue
with zero human labelling and better distribution match than mined PRs. ≥30 labelled continuations
existed after the first sweep ($0.449); every gate shard adds ~49×2 more.

**The build, smallest first:**
1. Assemble the corpus from `results/attribution/` + `results/trajectories-gate/` into
   `{patch, spec, verdict}` rows; hold out a split.
2. Score candidate reviewer prompts by held-out agreement with the test verdict, reported as BB_ε
   (same helper as U1). This anchor score is the promotion criterion — a reviewer version is
   adopted only if it beats the incumbent's BB_ε on held-out agreement, ties to the incumbent
   (RQGM's replacement rule, human at the boundary).
3. Only after 2 clears a bar worth having (to be set from the first measurement, not guessed
   here): wire the reviewer in as a second utility — e.g. rank pass@2 attempt-2 candidates, or
   gate `task_complete` on coding tasks. Averaged in as its own role, per §3.2.

**Constraint respected, stated for the handoff team:** `tools/robocoop-4/eval/live/CONTRACT.md:5`
mandates "NO LLM-as-judge" for the 58 deterministic gate criteria. U3 does not touch them. The
reviewer is a separate role with its own anchor and its own utility column; the deterministic gate
stays the regression gate. This mirrors the paper's structure (test execution and reviewer are
separate utilities, never merged into one number).

**Honest transfer caveat:** the paper's token savings come from the reviewer replacing multi-turn
test evaluation. Ours doesn't — our evaluation cost is the agent rollout itself, and grading is
already cheap. The claim we can test is the pass-rate/selection claim, not the token claim; report
tokens anyway (U4) so the cost of the extra call is visible.

**Why this also matters beyond polyglot:** an anchored reviewer is the only route to a numeric
utility on axes with no verifier at all — notebook quality, and the lopeteam rubric.
`lopeteam-reflect` currently evolves critic prompts and the rubric from the critics' own past run
logs with no anchor and no erasure — structurally the paper's two failing ablation arms, mitigated
today only by the human gate. An anchor there (accepted-vs-abandoned notebook diffs) is a separate
plan; U3's machinery (corpus → held-out agreement → BB_ε promotion) is what it would reuse.

## U4 — reporting changes on the ladder

Cheap, and they change what conclusions the ladder can support:

- **Intervals on every score.** Computed 2026-08-17 (Jeffreys 95%): 39/49 → [0.668, 0.890];
  38/49 → [0.645, 0.874]; raw 36/49 → [0.600, 0.842]. The marginal intervals of every ladder row
  overlap. The house rule "verify the MECHANISM, not the score delta" is why the 0.796 claim
  stands anyway (warm-repair conversions 2/3 vs 0 in every recorded cold restart, mechanism
  confirmed in-trajectory); the intervals make the reason visible in the table itself.
- **Paired analysis for system-vs-raw.** Both arms see identical problems, so the discordant-pair
  count (system-only passes vs raw-only passes) is the correct statistic and much tighter than the
  marginal intervals. The paper does NOT do this (it reports marginal Jeffreys intervals); we
  should, because our two-arm design affords it.
- **Blended tokens per arm** (input + 5×output, generation and evaluation calls, charged at the
  point the best score is first reached — the paper's §4 definition). The ladder currently has no
  cost axis; U3's extra reviewer call and any test-time-compute change (in-attempt resampling is
  already declared fair game in the worktree plan) are invisible without one.

## Not ported, and why

- **The archive search** (meta-agent editing its own workspace, Thompson sampling over clade
  metaproductivity, population co-evolution). Their ablation budget alone was 12,288 evaluations
  per run; our full polyglot gate is 49 problems at pass@2 and the coding gain being bought is
  +1.8pp on their setup. The improvement loop here already is the outer shape with population 1
  and a human/Claude meta-agent; the transferable content is the statistics (U1, U4), the
  bookkeeping (U2), and the complementary judge (U3).
- **Thompson sampling over prefixes** as a bisection replacement in `attribute.mjs`. The bisection
  invariant (`:222`, `p(lo) ≥ threshold, p(hi) < threshold`) assumes a single monotone collapse
  and the code already emits `~coarse` when the bracket won't close. Posterior-guided probe
  allocation fixes that without the monotonicity assumption — but the first campaign found zero
  strategic@k cases, so there is no evidence target yet. Revisit when attributing a set where
  strategic@k actually occurs (the deferred τ adapter, or notebook-authoring tasks).

## Suggested order

U1 → U2 → U4 → U3. U1 and U2 are corrections to instruments already in use (each has a
zero-model-call verification step); U4 is reporting; U3 is the only new capability and the only
one with an open empirical question (does reviewer agreement clear a useful bar), which is why it
goes last and starts with a measurement, not a wiring change.
