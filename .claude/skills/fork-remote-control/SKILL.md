---
name: fork-remote-control
description: Use when the user wants to spawn a NEW Remote Control-enabled Claude Code session that they can drive from the claude.ai web app or mobile app — e.g. "spawn a remote control session", "/fork-remote-control", "give me a new remote session named X", "fork this session to remote control". Two modes: a FRESH session (default — new session, no history, in the current directory) or a FORK of the current session (inherits this conversation's history; this session is untouched). The new session registers under a name the user picks and appears in their session list to be driven remotely.
---

# Spawn a new Remote Control session

Launches a separate, detached interactive Claude Code session with Remote
Control enabled. Once it reports *Remote Control active*, it shows up in the
claude.ai web app and the mobile app for the user to drive remotely. It runs
independently of this session (closing or continuing this one doesn't affect it).

## Two modes

- **Fresh (default)** — a brand-new session in the current directory with no
  history. Use this unless the user explicitly wants to carry context over.
- **Fork** — a fork of the *current* session: gets a fresh session id but
  inherits this conversation's history up to now. This session is left untouched.

## How it works

`fork.sh` in this skill directory wraps the CLI and waits for the *Remote
Control active* line before returning:
- fresh: `claude --dangerously-skip-permissions --remote-control "<name>"`
- fork:  `claude --resume "$CLAUDE_CODE_SESSION_ID" --fork-session --dangerously-skip-permissions --remote-control "<name>"`

It's launched detached behind a PTY (`script(1)`) so the interactive TUI renders
without a real terminal, and reuses the current `CLAUDE_CONFIG_DIR` (here
`~/.claude-personal`) so it finds the same Remote Control credentials (and, for
fork mode, the session history).

**Prompts / sandbox.** `--dangerously-skip-permissions` stops the child blocking
on permission prompts when driven remotely. It's safe because the child is a
descendant of this session and inherits its safehouse/metadev sandbox (a detached
grandchild can't escape the Seatbelt jail), keeping it after this session exits.
We deliberately do NOT nest `metadev`/`safehouse` — a nested sandbox boots slowly
and stalls on the PTY's unanswered terminal queries.

## Steps

1. **Pick mode.** Default to fresh. Use fork only if the user asks to carry over
   the current conversation's context.
2. **Get the name.** If the user gave a session name, use it; otherwise ask (it's
   the label they'll see in the session list).
3. **Run the helper** from the skill directory:
   ```bash
   bash "$CLAUDE_PROJECT_DIR/.claude/skills/fork-remote-control/fork.sh" [--fresh|--fork] "<session name>"
   ```
   (If `$CLAUDE_PROJECT_DIR` isn't set, use `.claude/skills/fork-remote-control/fork.sh` under the repo root.)
4. **Report.** On `OK:` tell the user the named session is live and visible in
   their claude.ai / mobile session list, and give them the `kill <pid>` line it
   printed for stopping it later. On failure, surface the log path.

## Notes

- Each spawn is independent and gets its own session id; running it twice gives
  two separate Remote Control sessions.
- Stop a session with the printed `kill <pid>`, or drive it from Remote Control
  and exit.
- A harmless `nice(...) failed: operation not permitted` line from `script` may
  appear in the log; ignore it.
