# Bulk Self-Improvement (cross-session)

Resume every recent claude session in this project, run `/improve` on each in
parallel, aggregate the proposals, and let the user approve by number.

This is the cross-session counterpart to `/improve` (which only sees the
current session). `/improve-bulk` replaces the old "check insights facets"
step — replaying actual sessions surfaces real friction, not just facet
summaries.

## Process

1. **Run the sweep**: `bash scripts/bulk-improve.sh [--days N] [--parallel N] [--budget USD]`
   - Defaults: `--days 7 --parallel 4 --budget 2`
   - Output lands at `scratch/bulk-improve/<timestamp>/`
   - The script discovers sessions via mtime in `$CLAUDE_CONFIG_DIR/projects/<repo-path-with-dashes>/` (`./metadev` sets `CLAUDE_CONFIG_DIR=~/.claude-personal`; derived from the repo root), skips any transcript with no `tool_use`, then spawns parallel `claude --resume <id> --print "/improve"` workers
   - `--limit` takes the cheapest **non-empty** sessions (selection is ascending by size, applied after the empty-session filter)
   - Anchor: the script `cd`s to repo root before resuming (claude resolves the project from cwd)
   - Cost: variable per session — watch the actual cost summary printed at the end of the sweep

2. **Read `aggregated.md`** in the output dir. Each session's proposals are under a `## Session <id>` heading.

3. **Trigger lifecycle report**: run `bash scripts/learnings-trigger-report.sh --days 30`. Present the per-trigger table alongside the proposals. Propose retiring any trigger with 5 or more blocks and no probable true positive among them.

4. **Surface recurring proposals first** — if multiple sessions independently propose the same change (e.g., "add a `--force` guard to `sync-module.ts`"), promote it to the top with a count ("flagged by 4 sessions"). This is the highest-signal output.

5. **Surface high-signal one-offs** — concrete proposals tied to real domain knowledge (e.g., a CI gotcha, a version-compat matrix). Skip "no proposals" sessions and budget-cap-truncated ones unless they contain a usable partial.

6. **Present numbered list** — group as:
   - **Recurring** (worth higher priority, multiple sessions agree)
   - **One-off, high-signal** (rare and concrete)
   - **Nice-to-have / no-ops** (only if user asks)

7. **Wait for approval** — user replies with numbers (e.g., "1 3 5"). Do not implement until approved.

8. **Implement approved changes**. Verify each before applying — proposals can reference files that have moved, or describe state that has since changed.
   - Apply the `/improve` tiering: a recurring proposal for a CLAUDE.md or knowledge note is usually a tooling fix that several sessions each documented instead of fixing. Re-propose at tier 1 (MCP server, notebook handler, CLI tool, hook) before landing it as prose.
   - Sweep sub-sessions replay **without** your MEMORY.md / memory-file context loaded, so a high-count recurring proposal can contradict an established memory note the sub-agents never saw — and dedup-count is NOT authoritative (N sessions agreeing while all missing the same memory isn't N independent confirmations). Before implementing a recurring proposal, cross-check it against MEMORY.md and the relevant memory file. (Cuts both ways: a sub-session may *also* mis-flag a correct proposal as "contradicting memory" — read the memory yourself rather than trusting either claim.)

9. **Commit** once the approved changes are in. Stage only the files the sweep touched — `git add <paths>`, never `git add -A`: this repo carries unrelated untracked work and nested repos from normal sessions. Don't stop and ask at the commit step; approval of the numbered proposals is approval to land them.

## Cost / safety guards

- The script disables Edit/Write/NotebookEdit on the inner claude calls and uses `--dangerously-skip-permissions` (safe because edit tools are off). It sets `METADEV=1` so the SessionStart hook does not refuse the worker; the worker runs inside the parent's safehouse sandbox.
- Sweep sub-sessions execute Bash, so they write rows to the learnings fire log like any other session. `scripts/bulk-improve.sh` exports `LEARNINGS_FIRE_TAG=bulk` into them, and the trigger report drops `bulk`-tagged rows by default (`--all-tags` to include them).
- `--max-budget-usd` is a **soft** cap — subagents can blow well past it on long sessions. Watch the actual cost summary printed at the end.
- `--max-budget-usd` counts the resumed session's **historical** cost, so sessions that originally cost more than the budget fail instantly with `error_max_budget_usd`. The script retries those once with `historical + budget`, making `--budget` the incremental spend per session. Expect total sweep cost ≈ sessions × budget, plus the cheap failed first attempts.
- Sessions that hit your hourly usage limit return empty output ("You're out of extra usage"). Skip these without retrying — they'll re-run cleanly on the next sweep.
- Do not raise parallelism above ~6 — too many simultaneous claude instances thrash MCP/keychain. Each worker also starts the `lopecode` MCP channel server; a pairing session in progress will see extra connections.
- On Fable, `--budget 2` buys little per session (see `knowledge/effective-use-of-fable.md`). Pass `--model sonnet` through to the workers if the sweep is mostly triage — not yet wired into the script; edit `run_claude` in `scripts/bulk-improve.sh`.

## When NOT to use this

- After a single short session — `/improve` alone covers it.
- When you're under budget pressure — a full sweep adds up; check recent sweep cost summaries before launching.
- Inside a ticket-focused session — recurring patterns won't have surfaced yet.

## Output triage shorthand

When summarizing for the user, count proposals across all sessions. Many
proposals are duplicates of each other — dedup mentally before presenting,
and call out the deduplication count ("flagged by N sessions") as a priority
signal.
