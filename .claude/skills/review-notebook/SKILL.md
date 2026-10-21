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
- 2026-10-10 `plan/specs/deploy-verification.html` (`@spec/deploy-verification`, authored by the spawning
  session): FIX, 10 findings and 5 minor. 14 taken, 1 declined (the unused `annotation` import is the
  template's). 148k subagent tokens, 5m22s. Nothing rendered: `lope-browser-runner.ts` wants
  `chromium_headless_shell-1200`, which is not installed. It found what the author could not see from
  inside: the handover's `--filter test_deployer` matched 2 of the deployer's 42 tests.
- 2026-10-10 `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`, modules brain-deployer, brain-core,
  cloud-brain, brain-shell, changes since `344e904d~3` (deploy verification): BLOCK, 7 findings and 4 minor.
  5 fixed, 1 left for the owner (a spec row), 1 not changed (in `cloudflare-iac.ojs`, ask first); 1 of 4 minor
  fixed. 232k subagent tokens, 11m35s. It could not launch a browser (`chromium_headless_shell-1200` missing).
  What it found that the author had not: two callers that did not know the new result states `verified` and
  `failing`, and a deploy token that could confirm its own deploy.
- 2026-10-11 the same notebook, modules brain-deployer, brain-core, brain-kernel, cloudflare-iac, changes since
  `ff76e3ae`: BLOCK, 2 findings and 1 out of scope, all confirmed and fixed. 123k subagent tokens, 5m30s. All
  three were prose a code change had made false, one of them `/llms.txt`, which programs read.
- 2026-10-11 `@tomlarkworthy/brain-snapshot` (changes since `f4840711~1`), `brain-maintenance/agents/digest.md`
  and `records/snapshot-opens-digest-issue.md`, one agent for the three: FIX, FIX, CLEAR. 9 findings (6 confirmed,
  3 plausible), all taken. 169k subagent tokens, 6m39s. What the author had not seen: the brief's check counted
  items on a `file://` page that cannot read them, and its publish command named a file the landing deletes.
- 2026-10-11 `.claude/skills/brain-maintenance/rules.md`, changes since `60d2b63d~1` (a Bluesky DM to the owner
  is allowed): FIX, 4 findings (2 confirmed, 2 plausible), all taken. 94k subagent tokens, 3m05s. The send
  command failed from a writer's worktree (no token file there), and the loop has no read of a member's DID.
- 2026-10-11 `tools/cloud-brain/digests/research-2026-10-11.html`, module `@digest/research-2026-10-11` (the first
  digest written by the issue loop): FIX, 6 findings (4 confirmed, 2 plausible), all taken (lopecode-dev `53e49fbf`).
  128k subagent tokens, 6m57s. It replayed the loader against cb4 and checked the quoted numbers against stored
  summaries and pages; the browser runner still could not launch. What the author had not seen: a "first seen"
  column that meant the first of the two days covered, and a list of the Brain's Cloudflare services without R2.
- 2026-10-11 `tools/cloud-brain/knowledge-reranking.md`, `@tomlarkworthy/brain-knowledge` (changes since `3f469ba6`) and
  `tools/cloud-brain/knowledge-eval/knowledge-eval.ts`, one agent for the three: FIX, FIX, FIX. 16 findings (13 confirmed,
  3 plausible), all taken; one (the last of a list scores 0, as an absent entry does) is said in the prose and not changed.
  142k subagent tokens, 8m59s. It ran the eval again from the cache and the tables held to the digit; what the author had
  not seen: two example ranks in the record that the results file contradicts, an interval column no code computed, and
  baseline arms that could no longer be made after the deploy they measured.
- 2026-10-11 `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html`, modules brain-library, brain-static, changes
  since `997bbcdf` (a token publishes, served with no origin): BLOCK, 6 findings, all taken (lopecode-dev
  `daf5cc6d`). 156k subagent tokens, 5m52s. It found the path the author's measurement could not: the Library
  panel opened an owner-only notebook as a blob of its own page, which has the opener's session and none of
  the answer's headers. Its browser runner could not launch; it probed the one call in headless shell 1234.
- 2026-10-11 `tools/cloud-brain/records/library-token-put-sandboxed.md`, `agents/digest.md`, `rules.md` of
  brain-maintenance, changes since `997bbcdf`: FIX, 7 findings, all taken. 103k subagent tokens, 4m07s. Three
  were lines the same day's work had made false (no digest written from the brief, no DM sent, no seed with
  the loader).
- 2026-10-11 `tools/cloud-brain/research-talorys.md` (a reading of another project's repository and its Hacker News
  thread): FIX, 8 findings (7 confirmed, 1 plausible), all taken. 91k subagent tokens, 4m43s. It fetched the repository
  and the thread again and every figure and quotation about them held, three counts to within one; what was wrong was
  what the file said of Cloud Brain ("multi-tenant", "four commands", prices "in the method tables").
- 2026-10-11 `@tomlarkworthy/brain-issues` (changes since `878802c3`: `issue.link`, the project workflow), `plan/cloud-brain-issues.md`,
  `records/review-the-default-workflow.md` and `brain-maintenance/agents/spec.md`, one agent for the four: FIX, FIX, FIX, BLOCK.
  18 findings (15 confirmed, 3 plausible), 17 taken (lopecode-dev `3cb43d9b`), 1 declined (the path by `triage` and `ready`
  stays open for a `major` issue: said in the prose). 241k subagent tokens, 10m06s. What the author had not seen: a link named a
  security issue to a caller who could not read it; a project had no way out once approved; the record's own count dropped an
  issue whose id begins `test`; and a second submit under the spec brief's key answered 200 and moved nothing.
- 2026-10-11 `tools/cloud-brain/research-memento-3.md` (a reading of one paper and 25 related sources): FIX, 6 findings
  (4 confirmed, 2 plausible) and 1 minor, all taken. 93k subagent tokens, 4m04s. It fetched the paper and one neighbour
  again; what the author had not seen: the comparison quoted a neighbour's run with another model and left out its run
  with the same model, which used fewer actions than the paper under review.
- 2026-10-11 `plan/cloud-brain-paper-summarizer-persona.md`, changes since main at `cdae8f99` (round 2 of the spec, after review 1611 on cb4): FIX, 7 findings
  (3 confirmed, 4 plausible) and 1 aside, all taken (lopecode-dev `93018451`). 127k subagent tokens, 8m05s. It asked cb4 for the counts and the 30
  searches again and they held. What the author had not seen: the copies kept to put an entry back from would have been written in a writer's
  worktree, which is removed at landing, and `text` run again would have kept a summarized entry as the text as entered.
- 2026-10-11 `plan/cloud-brain-i1842.md` (the spec of the Operator's own tab, first writing): FIX, 7 findings (6 confirmed, 1 plausible),
  all taken (lopecode-dev `0a26c20a`). 92k subagent tokens, 4m04s. What the author had not seen: the check that closes the project piped
  a page into `lope-reader.ts`, which reads no stdin, and the pairing check opened a layout that still had the pane the spec removes.
- 2026-10-11 `plan/cloud-brain-i1842.md`, the uncommitted diff of round 2 (after review 1951 on cb4): FIX, 5 findings (4 confirmed, 1 plausible),
  all taken. 93k subagent tokens, 1m41s. What the author had not seen: one command line was given two opposite pass conditions (task 1's run in the
  old shell and task 3's in the new), and the check of the inbox pump passed on a signed-out page where the pump polls nothing.
- 2026-10-11 `plan/cloud-brain-owner-acts-on-what-waits-for-him.md` (the spec of the block that shows one issue at a time, first writing, draft `906aa771`):
  FIX, 8 findings (6 confirmed, 2 plausible), all taken (lopecode-dev `99cefd01`). 114k subagent tokens, 5m16s. What the author had not seen: the
  refusal list named 8 of the tracker's 13 procedures and left `issue.review` and `issue.lock` open, the refusing function has a second caller, and
  the draft into a row's box would have left its buttons disabled and written over what the owner had typed.
- 2026-10-11 `plan/cloud-brain-worker-machine-on-fly.md` (the spec of a worker machine on Fly.io, first writing, before its landing): FIX, 9 findings
  (5 confirmed, 4 plausible) and 7 minor, all taken (lopecode-dev `728e3f11`). 114,587 subagent tokens, 5m22s. What the author had not seen: the machine's
  token file used names no brief or tool reads, the test that starts the machine was not the loop's own table of step 3, and `fly.down` stopped a loop in
  the middle of a landing.
- 2026-10-11 `plan/cloud-brain-worker-machine-on-fly.md`, changes since `728e3f11` (round 2 of the spec, after review 2886 on cb4, before its landing):
  FIX, 12 findings (8 confirmed, 4 plausible) and 6 minor, all taken (lopecode-dev `59da6348`). 119,461 subagent tokens, 4m41s. Not run again after the
  fixes, which rewrote the section it read. What the author had not seen: `lock.sh renew` answers exit 0 for a lock that ended and nobody took, so the
  round's signal of a lost lock never came; the watch's second argument was taken; and one empty pass under a usage limit stopped the machine for good.
- 2026-10-12 `plan/cloud-brain-orchestrator-as-steps.md` (the spec of the issue loop's orchestrator as a program and processes, first writing, draft
  `18d8c32c`): FIX, 11 findings (7 confirmed, 4 plausible), all taken. 129,699 subagent tokens, 6m54s. What the author had not seen: an overseer is on
  no issue and so could not have the event the design reads for "which agents run"; the rows that start an agent did not say that none runs on the
  issue already; and the event that records a run named the pid of a process not yet started.
- 2026-10-12 `plan/cloud-brain-orchestrator-as-steps.md` (round 2 of that spec, the diff since `1904d03d`, draft `eb4784e0`): FIX, 10 findings and 4
  smaller, all taken. 118,280 subagent tokens, 4m28s. What the author had not seen: the bound on writers started again counted runs the view keeps
  one of a role and round; a second resume of one token in one round had the first one's key; and an issue labeled `needs-owner` at `in-progress`
  stays in the queue, so the row that reads the owner's answer never took it.
- 2026-10-12 `plan/cloud-brain-orchestrator-as-steps.md` (round 3 of that spec, the diff since `41d44c77`, draft `6ff3ad66`): FIX, 7 findings (4
  confirmed, 3 plausible) and 2 smaller, all taken. 123,933 subagent tokens, 4m19s. What the author had not seen: the role of a run in the record
  (`spec-writer`, `overseer`) is not the prefix of its token (`spec`, `over`), so the condition the round was written to mend read a role no run
  has; and a task told its writer to ask "in a comment", the form the same spec says nothing reads.
- 2026-10-20 `tools/cloud-brain/retro/brief.md` with `run.sh` and `boot.sh` (a daily agent with the owner's authority on
  Fly, authored by the spawning session): BLOCK, 10 findings (6 confirmed, 4 plausible), 9 taken (lopecode-dev `38e235e4`),
  1 moot (the model id; the run had already accepted it, and the default became Opus). 121k subagent tokens, 5m16s. What
  the author had not seen: the tracker token and the deploy lock both needed a kept parent token the machine never had,
  and a Cloudflare token would have sat in an un-ignored path of a public repository the agent commits to.
- 2026-10-20 `tools/cloud-brain/retro/brief.md`, rewritten for the cluster's health (second run): BLOCK, 5 findings
  (2 confirmed, 1 confirmed-false-claim, 2 plausible) and 2 minor, all taken in the brief and `pull-sync.py`; the stale
  "loop work" line of `cloud-brain-dev/README.md` it named is left to the retro (a direct machinery change). 104k subagent
  tokens, 2m40s. What the author had not seen: the push recipe the brief cited was the loop's worktree path, which
  cannot run on the retro machine, and `measure.py` silently printed no deploy table because nothing wrote its input.
- 2026-10-21 `plan/cloud-brain-agentic-redesign.md` (the redesign of the issue loop as labels, one resumed session and one review guard, first
  writing): FIX, 10 findings (9 confirmed, 1 plausible), all taken; 2 had been fixed by the author between the spawn and the report. 120k subagent
  tokens, 3m18s. What the author had not seen: a yield that left `worker-processing` on would never be started again by its own wake rule; a wait
  written before its label is due at once; an expired wait is in no read, so nothing named noticed it; and the session store on `/data` was said to
  exist (`useradd --create-home` has no `-d`).
- 2026-10-21 `cloud-brain-dev` `brain-issues.js` since tag `base` (tracker changes 1 to 4 of the redesign, branch `redesign-tracker`),
  `plan/cloud-brain-issues-policy-v10.md` and `tools/cloud-brain/migrate-labels.ts`, one agent for the three: FIX, 6 findings (2 confirmed,
  4 plausible) and 3 minor, all sent back to the builder. 171k subagent tokens, 6m26s. What the author had not seen: a worker's own token
  could call `issue.receive` and write a "deploy.confirmed" line for its own wait; a logged deployer line carries `worker: "brain-deployer"`
  beside `target`, and the handler read `worker` first; two lines of one ray shared a comment key, so `confirmed` after `verified` was dropped.
- 2026-10-21 `cloud-brain-dev` branch `redesign-drain` `c364fca` (`drain2.ts`, `deploy.ts`, the sessions on the volume, the worker and reviewer
  briefs; TypeScript and markdown, not a notebook): BLOCK, 14 findings (8 confirmed, 6 plausible), all sent back; the same reviewer then
  verified the fix commit `167c67a`: 10 fixed, 4 partly, one new (boot recovery reclaimed another machine's sessions). 142k + 193k subagent
  tokens, 4m08s + 1m52s. What the author had not seen: the deploy token reached an agent running as root, since the hand-off was named in
  the header and not called; a worker under `bypassPermissions` could write a `SessionStart` hook into the shared persisted home that
  would run in the reviewer's session with the reviewer's token; and an owner-held deploy was yielded on and never sent again.
- 2026-10-22 `plan/cloud-brain-agentic-redesign.md`, changes since `76cf02be` (the amendments made while building it): FIX, 9 findings and
  4 minor, all taken (one a tracker change: a `waiting` line now swaps `waiting-deploy` for `needs-owner`, so an issue carries one routing
  label at every step). 113k subagent tokens, 4m20s. What the author had not seen: the method was `issues.receive` in §2 and §3.4 and
  `issue.receive` in §5 and the code; §3.3 held two designs for the agent's home in one paragraph; and the header still said "not built".
  A separate read-only agent then checked the four branches against each other (fields, keys, order of events, auth, env): 5 runtime
  mismatches none of the four per-branch reviews could see, since each branch was built against prose about its neighbours.
