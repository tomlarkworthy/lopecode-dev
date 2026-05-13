# Self-Improvement Cycle

Analyze session friction and cross-session patterns to propose improvements. Number each proposal for easy approve/reject.

## Prefer fixing behavior over documenting workarounds

For every friction point, your **first move** is to ask "can the tool, server, or codebase be changed so this friction stops happening for everyone?" — not "where should I document the workaround?"

Documentation/memory entries are the fallback when fixing the root cause is genuinely too expensive. They are **not** the default response to friction. A docs note tells the next LLM how to avoid the trap; a code/tool fix removes the trap. The latter compounds; the former just spreads tribal knowledge.

For each friction point, classify it in this order — pick the highest tier that's actually feasible, not the easiest one:

1. **Tooling fix** — change the MCP server (`tools/channel/lopecode-channel.ts`), a notebook module (e.g. `@tomlarkworthy/claude-code-pairing`'s handlers), a CLI tool (`tools/lope-*.ts`), `.claude/settings.json` hooks/permissions, or codebase behavior. Eliminates the friction.
2. **MCP server instructions** — update the `instructions` field in `lopecode-channel.ts`. Reaches every session that uses the MCP server, no codebase grep required.
3. **CLAUDE.md / knowledge/** — only when (1) and (2) aren't viable. Future LLMs have to find and read the doc; lower leverage than a code fix.
4. **Memory entry** — last resort. Per-user, per-project, doesn't reach other contributors. Reserve for cross-session user-preference signals, not technical gotchas.

When friction has both a tooling-fix path and a docs path, **lead with the tooling fix as the recommended proposal** and only list the docs path as an alternative if the tooling fix is genuinely deferrable. If you catch yourself proposing a CLAUDE.md note for something that's really a missing tool flag or a buggy handler, stop and re-propose at tier 1.

## Process

1. **Analyze session** for: friction, knowledge gaps, mistakes, patterns worth documenting. For each item, write down what the *root cause* is (e.g., "MCP `list_cells` filters to named variables"), not just the symptom (e.g., "couldn't find the markdown cell").
2. **Review current config** — read `CLAUDE.md`, `.claude/settings.json`. List filenames in `.claude/commands/` and `knowledge/` (do NOT read them all — only read specific files if needed to check for duplicates). If the friction is MCP-related, also glance at the relevant handler in `tools/channel/lopecode-channel.ts` to confirm a fix is feasible.
3. **Propose numbered changes** — for each: what happened, the **root cause**, the **tier 1 fix you considered** (even if you ultimately propose a lower tier), specific file+edit, why it helps. Categories in priority order: **tooling fixes** (MCP server, notebook handlers, CLI tools, hooks), **MCP server instructions**, **CLAUDE.md / knowledge updates**, **deletions of unused skills/config**, and lastly **memory entries**. Sketch effort (minutes / half hour / few hours) so the user can pick by ROI.
4. **Wait for approval** — do not implement until human approves. User may approve by number (e.g., "1 3 4"). If they push back ("can we fix this in the tool instead?"), re-propose at the higher tier rather than insisting on the docs path.
5. **Implement** approved changes. For tooling fixes that change the MCP server or notebook handlers, note that the user may need to restart Claude Code and/or sync the updated module into consumer notebooks before the fix is live everywhere.
6. **Update knowledge** — prefer adding to an existing process-oriented file in `knowledge/` over creating new ones. Only do this for things that genuinely can't be fixed at tier 1 or 2.

## Rules

- Only propose changes based on actual observed friction, not hypotheticals.
- Be specific with proposed changes.
- **Default to fixing, not documenting.** When a documentation proposal could instead be a tool/server/config change, lead with the latter.
- Keep CLAUDE.md concise — move detailed knowledge to `knowledge/`.
- **Knowledge files are process-oriented**: named so an LLM scanning filenames knows when to read them (e.g., `deploying-workspace-services-stack-recovery-and-gotchas.md`). Add to existing files rather than creating new date-prefixed situational ones.
- **Trim dead weight**: propose deleting unused skills, CLAUDE.md sections, or MEMORY.md entries that add context without value.
