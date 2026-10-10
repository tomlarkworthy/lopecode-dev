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

- 2026-10-07 `lopebooks/notebooks/@tomlarkworthy_liquid-timer.html` (trial, not authored by the
  spawning session): BLOCK, 10 findings, 9 CONFIRMED / 1 PLAUSIBLE by the reviewer, none yet
  verified or acted on by the spawner. 124k subagent tokens, 14m36s. The browser runner could not
  launch (Playwright headless shell missing), so nothing rendered was reviewed; the reviewer fell
  back to `notebook-import.ts`. Five brief defects reported, four fixed in `reviewer.md` the same
  day. Outcome: Tom deleted the notebook on 2026-10-08 ("it is not high quality") rather than fix it.
- 2026-10-10 `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`, module `@tomlarkworthy/brain-issues`: FIX, 13
  findings, 11 confirmed by the reviewer's own probes against the module's rig and 2 by trace; all 13 acted on
  (lopecode-dev `b629bef8`). 176k subagent tokens, 10m52s. The browser runner could not launch (it wants
  `chromium_headless_shell-1200`); the reviewer ran scratch scripts against build 1234.
- 2026-10-10 `plan/cloud-brain-issues.md`: FIX, 6 findings, 5 fixed (`d59929e6`), 1 declined (a field list inside the
  section kept as pasted). 105k subagent tokens, 3m29s.
- 2026-10-10 `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`, module `@tomlarkworthy/brain-issues`, changes
  since `5e9a20b6`: FIX, 8 findings, 6 confirmed by the reviewer's probes, 1 plausible, 1 prose; all 8 acted on
  (lopecode-dev `7782ac73`). 196k subagent tokens, 11m52s. The browser runner still could not launch; headless
  `lope-tests.ts` passed 2 of 9 for a harness reason (the vm context's `Object` is the host's, which cel-js rejects).
- 2026-10-10 `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`, module `@tomlarkworthy/brain-issues`, changes
  since `b629bef8`: FIX, 4 findings, all confirmed by the reviewer's probes; all 4 acted on (lopecode-dev
  `525a8bc7`). 156k subagent tokens, 7m07s. The count fell 13, 8, 4 over three runs on one module in one day.
- 2026-10-10 `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`, module `@tomlarkworthy/brain-issues`, changes
  since `7782ac73`: FIX, 3 findings, all confirmed by the reviewer's probes and all in one handler
  (`issue.install`); all 3 acted on (lopecode-dev `a0a5ce85`). 147k subagent tokens, 5m58s. Re-reading that handler
  whole afterwards, shape by shape, found 4 more inputs it answered wrongly that no run had named.
- 2026-10-10 the same module, changes since `525a8bc7`: FIX, 4 findings, all confirmed by the reviewer's probes, all
  in `issue.install`, the first a regression made by the round before; all 4 acted on (lopecode-dev `2a5cb517`).
  151k subagent tokens, 4m47s. Five rounds on one handler found 13, 8, 4, 3, 4: this round the handler's shape was
  changed (the key looked up first, an input form removed) where the earlier rounds had patched.
- 2026-10-10 the same module, changes since `a0a5ce85`: FIX, 2 findings, both confirmed by the reviewer's probes, both
  in the migrate shape check of `issue.install` (a mapped state not checked against the target workflow unless an
  issue was there; "undefined" in a refusal); both acted on (lopecode-dev `f9351237`). 160k subagent tokens, 5m00s.
  Seventh run on this module: 13, 8, 4, 3, 4, 2.
- 2026-10-10 `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`, module `@tomlarkworthy/brain-issues`, changes
  since `2a5cb517` (eighth run): CLEAR, no findings; two asides not acted on. Findings by round on this module:
  13, 8, 4, 3, 4, 2, 0. Rounds 3 to 6 were all in one handler (`issue.install` with `migrate`); what ended it was
  checking the key before the body and removing an input form, not a further patch. Recorded as `pass` on
  `review-fixes-2` on cb4 (events 45, 46). No reviewer could run `lope-browser-runner.ts --run-tests`
  (`chromium_headless_shell-1200` has no executable); each ran the cells by hand in build 1234.
- 2026-10-10 `brain-issues` as deployed by another session (`bee926e17a78`, three bug fixes, read through
  `getSource` and diffed against the build): reviewed by the session that wrote the module, not a fresh agent.
  PASS, 0 defects in the code, 2 about the process (tests never run; compiled module edited by hand, seed not
  committed). Tests 10 of 10 after the port. Recorded as `pass` on the three issues on cb4.
- 2026-10-10 `.claude/skills/brain-maintenance/` (six files, written that day): BLOCK, 8 findings, all acted on
  (`getSource` against the build differs by 130 lines on a correct deploy, 8 with `diff -w -B`; `mod` out of
  scope between two `eval_code` calls; `major` approved after it is live; a second-round submit reusing its key;
  three states matching no row; `rules.md` naming a move the policy lacks; two names for one emitted file; four
  smaller gaps). 144k tokens, 5m50s. Not rerun.
