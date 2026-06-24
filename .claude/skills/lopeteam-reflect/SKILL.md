---
name: lopeteam-reflect
description: Use between lopeteam runs when the user asks to "improve the team", "/lopeteam-reflect", "tune the lopeteam agents", or wants to evolve the team's own role prompts and QA rubric based on what past runs got wrong. Reads progress logs, lessons, and reports across runs; proposes diffs to the critic/applier role prompts (.claude/skills/lopeteam/agents/*.md) and to the shared rubric (.claude/skills/qa-notebook/qa/general.md, e.g. adding visual #12 / performance #13 criteria). All proposals are HUMAN-CURATED — nothing is applied without explicit approval.
version: 0.1.0
---

# Lopeteam reflector — human-curated self-improvement

The meta-loop. It improves the **agents themselves**, not the notebook. It runs **between** runs and **never** applies a change without explicit human approval (this is the only sanctioned way to edit the role prompts or the shared rubric).

This is the Reflexion / procedural-memory idea with a human gate replacing an automated archive — the safe form, because optimizing an agent against its own self-judgement is exactly where autonomous loops go wrong.

## When to use
After one or more `/lopeteam` runs, when the user wants to harvest what was learned into better critics, a better applier, or a richer rubric. Optionally scoped to one `<slug>`; otherwise reflect across all of `.claude/lopeteam/*`.

## Procedure

### 1. Gather evidence (read-only)
- `.claude/lopeteam/<slug>/progress.md` and `lessons.md` (per slug, or all slugs).
- `.claude/lopeteam/<slug>/backlog.json` — look at rejected/parked items and attempt counts.
- `.claude/skills/qa-notebook/qa/reports/*` — the run reports, especially recurring parked items and unresolved aesthetic queues.
- The current role prompts in `.claude/skills/lopeteam/agents/*.md` and the rubric `qa/general.md`.

### 2. Diagnose (where did the team underperform?)
Most multi-agent failure is upstream of verification (bad specs + coordination), so look there first:
- **Critic misses** — issues a human or a later round caught that a critic should have surfaced. → sharpen that critic's "what to look for".
- **Over-claiming** — items accepted then later found not to be real improvements, or rejects the applier had to make repeatedly. → tighten the grounding requirement.
- **Stalls / repeats** — same edit signature retried, same lesson re-learned. → encode the lesson into the relevant role prompt, not just `lessons.md`.
- **Rubric gaps** — recurring findings with no home criterion. The standing gaps are **visual (#12)** and **performance (#13)**; propose concrete, scoreable criteria in the `general.md` pass/partial/fail style. The visual criterion must score **reusable UI components** (controls built from `Inputs.*`/`@tomlarkworthy/view`/`htl`, not hand-rolled bespoke DOM) and **theme respect** (reads `--theme-*`/`--syntax-*`, no hard-coded colors/sizes, no external fonts) — these are pass/fail-able, not subjective, so they belong in the shared rubric rather than only the aesthetic role prompt.

### 3. Propose (diffs, not edits)
Present each proposal as a concrete diff with a one-line rationale grounded in the evidence:
- changes to `agents/<role>.md` (what to look for / grounding / output),
- new or revised criteria in `qa/general.md`,
- per-notebook rubric additions in `qa/per-notebook/<slug>.md`.
Group them, smallest-blast-radius first. **Change one thing at a time** where prompts are fragile.

### 4. Human curation gate (STOP)
Present the proposals and **stop**. Apply only what the human approves, verbatim to their wishes. After applying, note in the relevant `progress.md` what was changed and why, so the next reflection has the trail. Never apply un-approved proposals; never edit role prompts or the rubric outside this gate.

## Output
A short, grouped proposal list with diffs and rationale, then a question to the human about which to apply. Terse and evidence-backed.
