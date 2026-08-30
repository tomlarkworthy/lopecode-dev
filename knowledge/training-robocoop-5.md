---
triggers:
  - "(^Bash |^|[;&|] )bun +tools/robocoop[a-z0-9-]*/"
  - "^(Edit|Write|MultiEdit) .*modules/@tomlarkworthy/robocoop-5\.js"
---

# Training robocoop-5 against industry benchmarks

How robocoop-5 is improved: measure the SYSTEM (harness + model) against a raw-model baseline on
external benchmarks, autopsy the failures, fix the harness, verify the mechanism, guard against
regression. "Training" here means harness and prompt engineering — the model is never fine-tuned.

Premise (after poetiq.ai's "benchmarks are dead" essay): a benchmark score measures the whole
system, not the model. The same model scores differently under different harnesses, so the harness
is an engineering surface with measurable headroom — and the raw-model control arm is what makes a
system score meaningful.

## Results ladder

All runs `xiaomi/mimo-v2.5-pro` for agent AND (on τ) user simulator, pinned explicitly per run —
`OPENROUTER_MODEL` in any `.env` is ignored. System = robocoop-5 in the live notebook; raw = the
benchmark's official loop on the bare model.

| benchmark | raw model | Jeffreys 95% | robocoop-5 system | Jeffreys 95% | date |
|---|---|---|---|---|---|
| HumanEval-JS (MultiPL-E) | 153/161 = 0.950 | [0.908, 0.976] | 155/161 = **0.963** | [0.925, 0.984] | 2026-07, baseline corrected 2026-08-17 |
| aider-polyglot JS | 41/49 = 0.837 | [0.715, 0.920] | 46/49 = **0.939** | [0.846, 0.982] | 2026-08-18 |
| τ-bench retail, 115 tasks | 91/115 = 0.791 | [0.710, 0.858] | 91/115 = **0.791** (v1 core: 0.730) | [0.710, 0.858] | 2026-07-17 |

Row notes (2026-08-17 port audits, both corrections are regrades of stored runs — no model calls):
- **The polyglot row is the 2026-08-18 corrected-protocol gate and supersedes the earlier
  0.735/0.796 pair**, which was measured under graderHash `aff5fb6e71cd` / runnerHash `3b4bdde3c070`
  and is non-poolable history under U2. That day's port audit merged the grader's module cache,
  restored jest code frames, removed the test-output truncation that was cutting ~23% of repair
  turns mid-frame, stripped ANSI escapes, and made warm resume the attempt-2 protocol; both arms
  were then re-run end to end (criterion `f5993b70a0b8` / problems `0184c1046234`, agent core =
  lopebooks canonical). Paired n=49: both-pass 41, both-fail 3, raw-only **0**, system-only 5,
  exact sign test **P = 0.0625** — strict dominance at the design floor for 5 discordant pairs.
  Cost $0.27 vs $1.10; blended tokens 27,964 vs 313,776/task (~11×).
  (`tools/robocoop-5/eval/polyglot/README.md` § 2026-08-18 corrected-protocol gate.)
- **HumanEval raw** read 0.932 until 2026-08-17. `grade.mjs` used to brace-extract the target
  function out of a baseline candidate and discard everything else, which deleted a `require` and two
  helper functions from three correct solutions; agent candidates took the emulator path and were
  never affected, so the defect had a sign. Regraded whole-program: 0.932 → **0.950**, gap +3.1pp →
  **+1.2pp**, paired flips 9-4 → 6-4, P = 0.2668 → **0.754**. Grader since fixed (whole-program is
  the primary path for plain-JS candidates, extraction is a fallback).
- **τ row is uncorrected in this table** because the correction moves both columns. Official
  tau-bench ends the episode the instant `transfer_to_human_agents` is called; our port kept looping.
  Corrected: raw **0.774** (89/115) vs yield-fix core **0.765** (88/115), P = 1.0000 — parity within
  noise, not the "exact tie" 91-vs-91 implied. The v1 core moves furthest, 0.730 → **0.635**.
  Details and the reverse-direction check: `tools/robocoop-5/eval/tau/README.md` § 2026-08-17.

Every interval on that table overlaps every other one in its row: no single-roll marginal here
resolves an arm difference, which is why the house rule is to verify the MECHANISM in-trajectory and
to report paired statistics where both arms saw the same tasks (`tools/robocoop-5/eval/ladder.mjs`,
`plan/rqgm-and-robocoop-5.md` U1/U4).

τ-bench addendum: after the tie, generic operating principles converted 6 of the 11
non-model-ceiling gate failures on targeted re-runs. The full confirmation gate ran 2026-08-16
(principles + context core): 88/115 = 0.765, Jeffreys 95% [0.682, 0.835] — 11 gains / 14 losses vs
the yield-fix 91. The exact two-sided sign test on those 25 discordant pairs gives **P = 0.6900**
(`node ladder.mjs --paired tau/results/agent-final-shard0.json,tau/results/agent-final-shard1.json
tau/results/gate-principles-shard0.json,tau/results/gate-principles-shard1.json` — comma joins the
shards of one run, the space separates the two arms),
i.e. PARITY; τ per-task churn is ~22% per roll, and a paired context-on/off A/B on the 14 losses
(8/14 vs 9/14) acquitted the 2026-08-08 context system. Single-roll τ gates cannot resolve
differences of a few tasks — use discordant-pair counts and the credible-interval reporting from
`plan/rqgm-and-robocoop-5.md` (U1/U4).
Per-benchmark detail, commands, and failure taxonomies: `tools/robocoop-5/eval/{humaneval,polyglot,tau}/README.md`.

## The improvement loop

1. **Port with fidelity anchoring.** Before any A/B, replay the benchmark's official ground truth
   through the official implementation and require the port to reproduce it bit-identically
   (τ: 115/115 final DB states, 582/582 tool observations, including Python banker's rounding).
   An unanchored port measures port bugs, not the system.

   **Fidelity of the TOOLS is not fidelity of the PROTOCOL** (learned 2026-08-17, the hard way).
   τ's tool anchor was and remains perfect, and the port still ran a different game: official
   tau-bench ends the episode the instant `transfer_to_human_agents` fires and scores it there
   (`envs/base.py:108`), ours let the agent escalate to a human and then finish the job. All three
   ports on this ladder turned out to hide a divergence in the code *around* the tools — polyglot
   starved one arm of the export contract (stale `problems.json`, § below), HumanEval graded the two
   arms through different code paths (one preserved the whole candidate, one didn't), τ diverged on
   episode termination and gives the arms non-comparable step budgets. The direction is not
   predictable — polyglot's starved the system arm (fixing it: 0.776 → 0.796), HumanEval's and τ's
   flattered it — which is the point: an unaudited protocol is a bias of unknown sign, and two of
   three were found only after the numbers were published. So: before trusting any cross-arm delta,
   diff the port's LOOP against the official runner —
   termination conditions, step budget, what counts as an action, when reward is computed, what each
   arm is allowed to see — not just its tool outputs. A number produced by an unaudited protocol is
   an artifact of the protocol.
2. **Two arms, one variable.** Baseline mirrors the official agent loop exactly; the system arm runs
   the real product in the notebook — tools registered on the live plugin bus, prompt driven through
   the editable `viewof rc5_systemPrompt` textarea, benchmark state held in Node as single source of
   truth (`page.exposeFunction` proxies). Everything else identical: model, user simulator, grading.
3. **Iterate on the failing subset; full run as regression gate.** Re-run only the losses (plus a few
   passing win-controls) while debugging; one full run when satisfied. Subset deltas are cheap and
   noisy; the full gate is the number that counts.
4. **Autopsy trajectories, not scores.** Replay each failed trajectory's mutations and structurally
   diff the final state against the oracle (`tau/analyze-fails.mjs`: MISSING / EXTRA / per-path
   WRONG). Classify failures; separate model-ceiling (both arms fail, or fails even with the answer
   volunteered) from harness defects (system-only losses with a recurring signature).
5. **Fix, then verify the MECHANISM.** A score delta is not evidence the fix worked — find the
   failure signature in trajectories and confirm it is gone (e.g. the think-loop →
   `transfer_to_human_agents` pattern disappeared after the yield fix; a converted τ task showed the
   full survey → enumerate → ask sequence after the principles).
6. **Over-application canary.** A new prompt rule can leak into domains it wasn't meant for. Re-run
   a slice of previously-passing tasks from a DIFFERENT benchmark and check the trajectories for the
   rule's signature (e.g. question-shaped completions in one-shot coding after adding ask-the-user
   rules). Both principles canary failures were ordinary variance — the rule stayed silent.

## Counterfactual credit assignment (added 2026-08-16)

Step 4's autopsy now has an instrument: `polyglot/attribute.mjs` resumes a captured failed
trajectory from cut k (session.messages injection + send(null) via driver-core `resume`; file state
refolded from the prefix's write/edit calls) and estimates pass-probability p(k) by resampling. It
bisects for the step where p collapses and labels each fail variance / strategic@k / model-ceiling.
`run-agent.mjs --trajectories` captures what it needs. Unit tests: `tests/robocoop5/attribution.test.mjs`.

What its first campaign actually taught (polyglot, 11 residual fails, $0.45):
- Zero strategic@k found — every fail was p(0)=0 with DETERMINISTIC signatures (same test, every
  roll). In a fail set selected by two failed attempts, re-roll-recoverable errors are filtered out
  by construction; the instrument's value was forcing the model-ceiling/harness-defect split to be
  measured rather than eyeballed.
- "model-ceiling" means "ceiling under THIS system": the decisive follow-up is the free arms
  comparison on the same slugs. That found a port bug (word-search: stale problems.json → empty
  export contract + unwired default export; system arm only) and a protocol asymmetry (cold-restart
  repair vs the baseline's in-context repair). Fixing both: 0.776 → 0.796.
- Labels from 3 samples are estimates: go-counting and simple-linked-list, both labeled
  model-ceiling, converted at attempt 2 under warm repair in the gate.
- **Postscript (2026-08-18): under the corrected protocol the campaign's "model-ceiling" labels
  largely dissolved.** Every historic hidden-convention fail except promises and react converted in
  at least one arm once the repair turn carried code frames and untruncated output — the ceiling was
  the port's information starvation, not the model. U1's relabel of all 11 to `undetermined` was
  right; the original labels were reading the harness back to us.

## What moved numbers vs what didn't

Rules that legitimize or mandate a specific action at a specific structural trigger work; generic
care-exhortations don't.

Worked:
- **Protocol-fidelity fixes** (polyglot port, 2026-08-18) — the largest mover on this ladder, and
  none of it touched the agent. Jest code frames restored to the repair turn, the 6000/3500-char
  truncation removed (it was amputating ~23% of repair inputs mid-frame), ANSI escapes stripped, and
  warm resume made the attempt-2 default. Mechanism, measured over the repair turns themselves:
  code frames present 0/33 → 31/31, ANSI 24/33 → 0/31, repair steps mean 12.9 → 7.9, repair pass
  rate 64% → **90%**. Both arms rose (raw 0.735 → 0.837, system 0.796 → 0.939, cross-criterion) and
  the system arm became strictly dominant (raw-only flips b=0). Generalization: **fix what the agent
  is allowed to SEE before tuning what it is told** — an information defect in the loop looks exactly
  like a model ceiling in the results.
- **Yield fix** (engine/core): `task_complete` described as the way to END YOUR TURN, including when
  blocked on user input — "ending the turn IS how you ask" — plus a matching stall-nudge branch and
  a completion-guard exemption for turns that ask the user a question. Closed the entire −6.1pp τ
  gap as measured then; on the corrected numbers (2026-08-17) it closed −13.9pp to within −0.9pp,
  and the transfer-call count per roll fell 26 → 9, which is the mechanism reading directly. Root
  cause: the loop's action bias ("concrete action every step") fought conversational
  yield; agents think-looped then escalated to a human rather than end the turn to ask.
- **Operating principles** (core, appended to ANY provider system prompt): (1) target check before
  hard-to-undo actions — survey ALL plausible candidate records (unopened records count as
  unexamined), never act on the first match, ask only when only the user can disambiguate;
  (2) enumerate multi-part requests up front and check each part off before finishing. Both are
  trigger-conditioned: they name when they apply AND when they don't.
- **Contract-binding prompt** (polyglot v2): task contracts override style preferences; verify
  against the spec's literal examples before completing. 0.633 → 0.776.
- **Write auto-feedback** (srctools): module writes report probed cell values and the cross-module
  reactive blast radius (runtime-sdk `descendants()`) in the same tool result — the notebook runtime
  gives the agent its consequences for free instead of costing a lookup turn.
- **Streaming client + turn-level retry ×3** on the persistent session: infra losses to network
  blips went to zero on the final τ gate.

Didn't work:
- A "double-check state after mutations" sentence in `task_complete`'s description: read-back rate
  stayed within noise; reverted. Exhortation without a structural trigger changes nothing.
- An LLM reviewer as a second utility (RQGM U3, measured 2026-08-17 before any wiring): three
  reviewer prompts scored against test verdicts on 56 held-out patches from our own trajectories
  (`polyglot/reviewer-corpus.mjs` / `reviewer-measure.mjs`, $0.87). Best accuracy 53.6% vs the
  majority-constant bar of 60.7%; Youden's J ≈ 0 for all three; the quality-score prompt rated
  failing patches HIGHER than passing ones (6.76 vs 6.27). mimo cannot judge mimo's patches here —
  measure-before-wire saved the integration. Corpus + protocol kept for retesting stronger judges.
- Sharpened principles could not fix model-ceiling tasks (fails even when the user volunteers the
  disambiguating fact) or a precondition-ordering trap that resisted three formulations. Know when
  the residue is the model's, not the harness's.

Didn't (yet) — mechanism works, score unresolved:
- **Executable-spec gating** (polyglot, 2026-08-17/18): the agent writes a `{name, js, expected}`
  spec module before implementing, with a grounding audit against the instructions, a write-feedback
  scorecard, a `task_complete` gate, and a waiver escape. v2 fixed every mechanism defect v1's
  autopsy found and the mechanisms verify in-trajectory (compliance 13/22 → 17/22, examples 5.7 →
  8.0, zero shrinkage, all attempt-2 passes via explicit reconciliation, 0 waivers, gate fired 8×).
  The score does not follow: 11/22 vs control 14/22, P = 0.51 — and the unchanged control arm swung
  10/22 → 14/22 between the two runs, so nothing was resolvable. Not deployed; decision deferred to
  a retest under the corrected 2026-08-18 protocol, whose code frames and warm resume attack the
  same hidden-convention failure. Detail: `tools/robocoop-5/eval/polyglot/README.md` § Spec-lock.

## Operational gotchas

- Model pinning: pass `xiaomi/mimo-v2.5-pro` explicitly; never trust env defaults. Confirm the
  printed `model:` line.
- `--notebook` paths must be absolute — relative paths become `file://../…` → `ERR_INVALID_URL`.
- Keep a local eval bundle (`tools/robocoop-5/eval/robocoop-5-eval*.html`, gitignored) seeded with
  the store core under test; re-sync it after core edits or the run measures the old prompt.
- `debugger;` statements freeze Playwright-driven notebooks — strip from working copies.
- **An 11-slug × 2-roll polyglot slate cannot resolve a harness effect.** Measured 2026-08-18: the
  spec-lock A/B's control arm was byte-identical code in both runs and scored 10/22 then 14/22.
  Slate noise on that design is ±4/22 — larger than any harness delta seen on this benchmark. Use
  the full 49 with paired discordant-pair counts, or treat the subset run as mechanism evidence only
  (step 3's "subset deltas are cheap and noisy" is not a hedge here, it is the whole result).
- τ user-simulator instructions contain deliberate ambiguity probes ("If the agent asks…") — 32/115
  retail tasks reward asking; a harness that discourages yielding silently fails them.

## Deployment chain (after a PR merges)

The lopebooks notebook (`lopebooks/notebooks/@tomlarkworthy_robocoop-5.html`) is canonical and
DRIFTED from `/modules` (Observable-decompiled formatting, notebook-side extra cells: wiki-composed
`rc5_systemPrompt`, viewof extraction cells). Per module block:
- block byte-matches the store → `bun tools/channel/sync-module.ts` is safe (core, historically);
- drifted block → block-scoped surgical patch with exactly-one-occurrence assertions on anchors
  (srctools, engine). Never sync-module over a drifted block.

Then: `node tools/robocoop-5/boot-smoke.mjs` (must be green: all tools registered, all core exports
instantiate, zero console errors) → commit/push lopebooks → bump the submodule gitlink → per-cell
Observable pushes with `tools/lope-push-ws.js` (targets and round-trip hazards in the session memory
`robocoop5-observable-targets`). Narrow `--cells` pushes deliberately drop import cells — a change
to a module's imports (e.g. adding `descendants`) requires a full-module push.
