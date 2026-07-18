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

| benchmark | raw model | robocoop-5 system | date |
|---|---|---|---|
| HumanEval-JS (MultiPL-E) | 0.932 | **0.963** | 2026-07 |
| aider-polyglot JS | 0.735 | **0.776** (v1 prompt: 0.633) | 2026-07 |
| τ-bench retail, 115 tasks | 0.791 | **0.791** (v1 core: 0.730) | 2026-07-17 |

τ-bench addendum: after the tie, generic operating principles converted 6 of the 11
non-model-ceiling gate failures on targeted re-runs (full confirmation gate not yet run).
Per-benchmark detail, commands, and failure taxonomies: `tools/robocoop-5/eval/{humaneval,polyglot,tau}/README.md`.

## The improvement loop

1. **Port with fidelity anchoring.** Before any A/B, replay the benchmark's official ground truth
   through the official implementation and require the port to reproduce it bit-identically
   (τ: 115/115 final DB states, 582/582 tool observations, including Python banker's rounding).
   An unanchored port measures port bugs, not the system.
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

## What moved numbers vs what didn't

Rules that legitimize or mandate a specific action at a specific structural trigger work; generic
care-exhortations don't.

Worked:
- **Yield fix** (engine/core): `task_complete` described as the way to END YOUR TURN, including when
  blocked on user input — "ending the turn IS how you ask" — plus a matching stall-nudge branch and
  a completion-guard exemption for turns that ask the user a question. Closed the entire −6.1pp τ
  gap. Root cause: the loop's action bias ("concrete action every step") fought conversational
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
- Sharpened principles could not fix model-ceiling tasks (fails even when the user volunteers the
  disambiguating fact) or a precondition-ordering trap that resisted three formulations. Know when
  the residue is the model's, not the harness's.

## Operational gotchas

- Model pinning: pass `xiaomi/mimo-v2.5-pro` explicitly; never trust env defaults. Confirm the
  printed `model:` line.
- `--notebook` paths must be absolute — relative paths become `file://../…` → `ERR_INVALID_URL`.
- Keep a local eval bundle (`tools/robocoop-5/eval/robocoop-5-eval*.html`, gitignored) seeded with
  the store core under test; re-sync it after core edits or the run measures the old prompt.
- `debugger;` statements freeze Playwright-driven notebooks — strip from working copies.
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
