# Self-Improvement Cycle

Analyze session friction and cross-session patterns to propose improvements. Number each proposal for easy approve/reject.

## Prefer fixing behavior over documenting workarounds

For every friction point, your **first move** is to ask "can the tool, server, or codebase be changed so this friction stops happening for everyone?" — not "where should I document the workaround?"

Documentation/memory entries are the fallback when fixing the root cause is genuinely too expensive. They are **not** the default response to friction. A docs note tells the next LLM how to avoid the trap; a code/tool fix removes the trap. The latter compounds; the former just spreads tribal knowledge.

For each friction point, classify it in this order — pick the highest tier that's actually feasible, not the easiest one:

1. **Tooling fix** — change the MCP server (`lopecode-plugin/src/lopecode-channel.ts`), a notebook module (e.g. `@tomlarkworthy/claude-code-pairing`'s handlers), a CLI tool (`tools/lope-*.ts`), `.claude/settings.json` hooks/permissions, or codebase behavior. Eliminates the friction.
2. **MCP server instructions** — update the `instructions` field in `lopecode-channel.ts`. Reaches every session that uses the MCP server, no codebase grep required.
3. **CLAUDE.md / knowledge/** — only when (1) and (2) aren't viable. Future LLMs have to find and read the doc; lower leverage than a code fix.
4. **Memory entry** — last resort. Per-user, per-project, doesn't reach other contributors. Reserve for cross-session user-preference signals, not technical gotchas.

When friction has both a tooling-fix path and a docs path, **lead with the tooling fix as the recommended proposal** and only list the docs path as an alternative if the tooling fix is genuinely deferrable. If you catch yourself proposing a CLAUDE.md note for something that's really a missing tool flag or a buggy handler, stop and re-propose at tier 1.

## Process

1. **Analyze session** for: friction, knowledge gaps, mistakes, patterns worth documenting, **and knowledge-gate misses and false positives** (see below). Cross-session pattern detection is handled by `/improve-bulk` (which replays recent sessions and aggregates), so focus this run on the current session only. For each item, write down what the *root cause* is (e.g., "MCP `list_cells` filters to named variables"), not just the symptom (e.g., "couldn't find the markdown cell").
    - **First, check the session is worth analysing.** Count assistant `tool_use` entries in the transcript. If there are none, or only a handful with no user corrections, report "no proposals: session had no substantive work" and stop. Do not run the read-log, config-review or gate steps — none of them can find anything, and inventing proposals to justify the run violates the observed-friction rule below.
    - **Knowledge-gate misses (false negatives)**: read the per-session read-log at `$(getconf DARWIN_USER_TEMP_DIR)claude-learnings-read-$CLAUDE_CODE_SESSION_ID` (written by `scripts/learnings-track-read.sh`; the hook runs with the user's TMPDIR — `/var/folders/.../T/` on macOS — NOT the Bash tool's sandbox TMPDIR, so `$TMPDIR` from a Bash call resolves to the wrong directory. Fall back to `/tmp/claude-learnings-read-$CLAUDE_CODE_SESSION_ID` on Linux) to see which `knowledge/*.md` files were Read this session. **Compaction caveat**: `SessionStart:compact` fires a few hundred ms *after* the first Read of the new context window; `learnings-reset-on-compact.sh` has a grace window for this, but if a read-log looks impossibly empty, suspect a reset race before suspecting the session ID. If the read-log is missing or empty, glob `$(getconf DARWIN_USER_TEMP_DIR)claude-learnings-read-*`, take files modified within this session's window, and union their contents — AND cross-check the transcript, which is authoritative: `grep -oE 'knowledge/[a-z0-9-]+\.md' <session-jsonl> | sort -u`. Treat a missing/empty read-log as "unknown", NOT "nothing was read", before proposing a trigger. For each friction point, ask "is there a `knowledge/*.md` (not in that log) that would have prevented this if read?" If yes and the file has a `triggers:` frontmatter list (see `scripts/learnings-gate.sh`), propose a trigger regex that matches the tool call which caused the friction and obeys the authoring rules below. The fix is one line added to that file's frontmatter, not a new knowledge file. If no relevant file exists, that's a new-knowledge proposal — not a trigger proposal — and it still goes through the tiering above first.
    - **Knowledge-gate false positives**: read the fire log at `~/.claude/learnings-fires.tsv`, filtered to `$CLAUDE_CODE_SESSION_ID`. It lives in `$HOME` (shared by every project on the machine — filter on the cwd column too), so the read-log's TMPDIR caveat above does not apply. Columns: epoch, session, decision, tool, knowledge file, regex, cwd, matched text (200 chars), tag. Classify every `block` row mechanically:

        | code | shape of the fire | verdict |
        |---|---|---|
        | R1 | the command was read-only text processing | FP, and rare — the gate exempts these, so a hit means an allowlist gap in `scripts/lib/learnings-match-string.sh` |
        | R2 | the matched text sits inside quoted or heredoc data, not in command position | FP: data, not action |
        | R3 | a write to a machine artifact (scratch, transcript, restart descriptor) | FP: no reader ever sees it |
        | R4 | the blocked command is the one the knowledge file itself prescribes | FP: the trigger is inert |
        | R5 | the regex is a bare path or identifier | FP: it fires on investigation, not on the action |
        | R6 | the same (session, file) blocked twice or more | compaction re-block — count the cluster once |

        Each FP cluster becomes one numbered trigger-narrowing or deletion proposal stating: trigger, fire count, verdict, proposed replacement, replay result.
    - **If the session was compacted**: do NOT rely on the post-compaction summary — it loses exactly the mid-session corrections (user "no" / "don't" / "stop" moments) this skill is designed to surface. Read the raw JSONL transcript at `$CLAUDE_CONFIG_DIR/projects/<cwd-encoded>/<session-id>.jsonl` (`./metadev` sets `CLAUDE_CONFIG_DIR=~/.claude-personal`). The current session ID is `$CLAUDE_CODE_SESSION_ID`. `<cwd-encoded>` is the current working directory with every non-alphanumeric char replaced by `-` (leading `-` included — e.g. `/Users/jane.doe/dev/repo` → `-Users-jane-doe-dev-repo`). For large transcripts (>1MB), delegate the scan to a subagent (`model: sonnet`) with a focused prompt so the analysis doesn't blow your own context.
2. **Review current config** — read `CLAUDE.md`, `.claude/settings.json`. List filenames in `.claude/commands/`, `knowledge/` and `scripts/` (do NOT read them all — only read specific files if needed to check for duplicates). If the friction is MCP-related, also glance at the relevant handler in `lopecode-plugin/src/lopecode-channel.ts` to confirm a fix is feasible. Run `bash scripts/check-learnings-triggers.sh` and surface each failure as a proposal.
3. **Replay before adopt** — every NEW or CHANGED trigger goes through `scripts/replay-learnings-triggers.sh --trigger '<regex>' --days 7` before it reaches the user. The proposal reports "would have fired N times; sampled K/M look like true positives". Reject the trigger if under half the sample is a true positive. (`--days 7` took 21s over a 716 MB transcript dir on 2026-08-29; `--days 30` exceeded 2 min — widen only when 7 days has too few hits.)
4. **Propose numbered changes** — for each: what happened, the **root cause**, the **tier 1 fix you considered** (even if you ultimately propose a lower tier), specific file+edit, why it helps. Categories in priority order: **tooling fixes** (MCP server, notebook handlers, CLI tools, hooks), **MCP server instructions**, **CLAUDE.md / knowledge updates**, **deletions of unused skills/config**, and lastly **memory entries**. Sketch effort (minutes / half hour / few hours) so the user can pick by ROI.
5. **Wait for approval** — do not implement until human approves. User may approve by number (e.g., "1 3 4"). If they push back ("can we fix this in the tool instead?"), re-propose at the higher tier rather than insisting on the docs path.
6. **Implement** approved changes. For tooling fixes that change the MCP server or notebook handlers, note that the user may need to restart Claude Code and/or sync the updated module into consumer notebooks before the fix is live everywhere.
7. **Update knowledge** — prefer adding to an existing process-oriented file in `knowledge/` over creating new ones. Only do this for things that genuinely can't be fixed at tier 1 or 2.

## Rules

- Only propose changes based on actual observed friction, not hypotheticals.
- Be specific with proposed changes.
- **Default to fixing, not documenting.** When a documentation proposal could instead be a tool/server/config change, lead with the latter.
- Keep CLAUDE.md concise — move detailed knowledge to `knowledge/`.
- **Knowledge files are process-oriented**: named so an LLM scanning filenames knows when to read them (e.g., `deploying-workspace-services-stack-recovery-and-gotchas.md`). Add to existing files rather than creating new date-prefixed situational ones.
- **Trim dead weight**: propose deleting unused scripts, skills, CLAUDE.md sections, or MEMORY.md entries that add context without value.
- **Trigger authoring rules.** A `triggers:` entry must match the failing tool call and nothing else. `scripts/check-learnings-triggers.sh` enforces most of these — run it after ANY frontmatter change.
  - Anchor command triggers `(^Bash |^|[;&|] )`. Matching is per physical line, so the three alternatives cover the first line, a continuation line of a multi-line command, and a command after `;`, `&&` or `|`.
  - End a command token with `( |$)`, never `\b`. The gate's grep is pinned, but keep every regex POSIX-ERE-portable.
  - Escape literal dots: `\.js`, not `.js`.
  - No optional prefix groups (`(cd .*x && )?bun tools/x` ) — they collapse to the bare unanchored tail. Scope with `when-cwd:` instead.
  - Never a bare path or identifier. It fires on investigation far more than on action; anchor the write instead: `^(Edit|Write|MultiEdit) .*<path>`.
  - A trigger must not match the command the knowledge file itself prescribes. Test both: the call that caused the friction, and the one the file tells you to run.
  - Single backslash in YAML. The parser does no unescaping, so `\\.` matches a literal backslash and the trigger is dead.
  - Before gating a new tool, confirm its name matches the `PreToolUse` matcher in `.claude/settings.json`; otherwise the trigger can never fire.
  - If no regex can avoid firing on unrelated calls, the friction needs a different fix (tooling change, CLAUDE.md note, new knowledge file).
