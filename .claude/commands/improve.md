# Self-Improvement Cycle

Analyze session friction and cross-session patterns to propose config improvements. Number each proposal for easy approve/reject.

## Process

1. **Analyze session** for: friction, knowledge gaps, mistakes, patterns worth documenting
2. **Review current config** — read `CLAUDE.md`, `.claude/settings.json`. List filenames in `.claude/commands/` and `knowledge/` (do NOT read them all — only read specific files if needed to check for duplicates)
3. **Propose numbered changes** — for each: what happened, specific file+edit, why it helps. Categories: CLAUDE.md updates, new/improved commands, knowledge, **MCP server instructions** (tools/channel/lopecode-channel.ts `instructions` field), **deletions of unused skills/config**. If friction occurred during notebook pairing (Observable cell patterns, define_cell pitfalls, viewof gotchas, module format issues), propose updates to the MCP server instructions so future sessions avoid the same mistakes.
4. **Wait for approval** — do not implement until human approves. User may approve by number (e.g., "1 3 4")
5. **Implement** approved changes
6. **Update knowledge** — prefer adding to an existing process-oriented file in `knowledge/` over creating new ones

## Rules

- Only propose changes based on actual observed friction, not hypotheticals
- Be specific with proposed changes
- Keep CLAUDE.md concise — move detailed knowledge to `knowledge/`
- **Knowledge files are process-oriented**: named so an LLM scanning filenames knows when to read them (e.g., `deploying-workspace-services-stack-recovery-and-gotchas.md`). Add to existing files rather than creating new date-prefixed situational ones.
- **Trim dead weight**: propose deleting unused skills, CLAUDE.md sections, or MEMORY.md entries that add context without value
