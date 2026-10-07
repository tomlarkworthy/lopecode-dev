---
name: review-notebook
description: Use after authoring or substantially editing a notebook module, a spec notebook or a doc (`knowledge/*.md`, `plan/*.md`, a README), before reporting it done, and when the user asks to "/review-notebook <target>", "get a fresh review", "have another agent review this". Spawns one subagent that shares no context with this session, has it review the saved file against `reviewer.md`, then verifies and acts on its findings. Not the browser QA pass; that is /qa-notebook.
version: 0.1.0
---

# Review a notebook with a fresh agent

The session that wrote a notebook reads it with the intent already in mind, so it does not see
what the file fails to say. This skill hands the saved file to one subagent that has only the file.

Ported 2026-10-07 from `~/dev/taktile/.claude/commands/review-pr.md`, which spawns fresh-context
reviewers on a PR. **Unverified here:** no measurement in this repo yet of what the reviewer finds
that the author missed. The first runs should record that in `Runs` below.

## Arguments

`$ARGUMENTS`:
- Required: the target. A notebook HTML path, optionally followed by the module ids to review, or
  a markdown path.
- Optional: `--since <git ref>`. Review only what changed since that ref. Default: the whole
  module or doc.

## Steps

Every change is reviewed, however small. There is no size threshold (Tom, 2026-10-07: "don't skip").

1. **Get the work onto disk.** The reviewer reads the file, not the live runtime. After pairing
   work, `export_notebook` first. A reviewer handed a stale file reviews the old notebook.
2. **Name the modules.** Default: the entries of `bootconf.mains` that are not a frame or cargo
   (`lopepage*`, `save-in-place`, `module-selection`, `claude-code-pairing`). The other embedded
   modules are dependencies and are out of scope.
3. **Spawn one `Agent`**: `subagent_type: general-purpose`, `model: opus`, with the prompt below
   and nothing else. Not `fork`: a fork inherits this conversation, which removes the point.
   Do not add what was built, why, what is known to be broken, or what to look at. If the reviewer
   cannot tell what the notebook is for, that is a finding against the notebook.
4. **Carry on with the task** while it runs. When it reports:
   - Verify each finding against the source before acting. The reviewer may be right about the
     problem and wrong about the fix.
   - Fix it, fix part of it, or decline it with a reason.
   - Stop and ask the user when a finding would change what the notebook does or needs a design
     call.
   - Fixes to a module follow CLAUDE.md tip 8 (`lope-sync.ts checkout`, `sync-module.ts`), or the
     pairing channel plus `export_notebook`.
5. **Report** the verdict, the finding count, and one line per finding saying what was done.
   One round by default. Re-run only after fixes that rewrote a cell or a section.

## Reviewer prompt

```
You are reviewing a lopecode notebook or doc that another session wrote. You have no other
context, by design. Working directory: <absolute repo root>.

Read <absolute repo root>/.claude/skills/review-notebook/reviewer.md and follow it.

Target: <absolute path>
Modules: <@user/name, ...>            (omit for a markdown target)
Scope: <whole | changes since <git ref> in <repo path>>
```

## Runs

Append one line per run: date, target, verdict, findings confirmed / declined.
