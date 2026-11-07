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
- 2026-10-22 `plan/cloud-brain-agentic-redesign.md` §12 (the landing and the first live hours, written from the landing agent's reports):
  FIX, 11 findings (9 confirmed, 2 plausible), all taken. 130k subagent tokens, 2m37s. It read the 176 events of the record and the
  two logs against every figure: the hashes, seqs, counts and dollars held; what the author had wrong was the date (the landing was
  the 21st, the author wrote the 22nd and 23rd), two of eight turns left out of a table whose total counted them, a 14 s race
  written as 1 s, and two placeholders ("01:0x") left in place of times the record had.
- 2026-10-20 `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, section "The dashboard chat" (ad-6b): FIX, 7 findings (6 confirmed,
  1 plausible), all taken. 101k subagent tokens, 2m24s. What the author had not seen: in demo mode the vision mark comes from the gateway's
  catalog, not OpenRouter's, and the Operator's brief tells the Operator to send the owner to the dashboard chat, not to forward the question.
- 2026-10-27 `plan/retros/2026-10-27.md` and `cloud-brain-dev` `40e3daf` (push.ts/drain2.ts land a dev patch on a service
  issue), authored by the spawning session: BLOCK, 9 findings and 2 minor, all taken (`cloud-brain-dev` `f4b77e1`, the report).
  123k subagent tokens, 6m37s. What the author had not seen: three more lost patches from 10-22 and 10-23 outside the
  window it searched, and that no test failed with the new `devWork` check forced true.
- 2026-10-31 `plan/retros/2026-10-31.md`, authored by the spawning session: FIX, 5 findings, all confirmed and taken (a table
  header naming one of two checks, two patches not named, a negative median unexplained, a heading that said 21 missing
  where the body found 5, a line reference into a git-ignored file). 77k subagent tokens, 3m37s.
- 2026-11-01 `plan/retros/2026-11-01.md`, authored by the spawning session: FIX, 6 findings (4 confirmed, 2 plausible), all
  taken (a wait dated by the wrong state, a seq cited wrong, two reads counted as made where one was, a before row and the
  issue's bar left out, an observation left with nobody, an ask count with no method). 89k subagent tokens, 3m20s.
- 2026-11-06 `plan/retros/2026-11-06.md`, authored by the spawning session: FIX, 6 findings (5 confirmed, 1 plausible), all
  taken (a hand-back said to need one start where the code needs a second pass 600 s later, three runs called none, a delay
  left out, a wait read as its label, `$S` undefined, a token's file the tool does not search). 100k subagent tokens, 3m58s.
- 2026-10-24 `cloud-brain-dev/AGENTS.md` and `CLAUDE.md`, the new opening section "How the Brain is built, and how to decide": FIX, 3
  findings confirmed and 1 plausible, all taken (cloud-brain-dev `b1f1c19`). 105,623 subagent tokens, 3m27s. What the author had not seen: the
  two files gave opposite reading orders, the summary dropped the cases `philosophy.md` still leaves to the owner, and a session with no role
  could not tell whether the read applied to it.
- 2026-10-24 the same two files, changes since `b1f1c19` (old-loop sections cut, `CLAUDE.md` imports `AGENTS.md`): FIX, 3 confirmed and 1
  plausible, all taken (cloud-brain-dev `753d702`). 88,982 subagent tokens, 1m58s. What the author had not seen: quoted Never lines cut with no
  `[...]` (one cut changed behaviour), two owner rules that existed nowhere else, and `roles/digest.md` called dead when the worker follows it.
- 2026-10-25 `cloud-brain-dev` commit `d0cb164` (`docs/usage.md` for every service: `roles/worker.md`, `roles/reviewer.md`,
  `sync.ts`, `docs-check.ts`): FIX, 6 findings (4 confirmed, 2 plausible), all taken (cloud-brain-dev `4364de3`). 78k subagent
  tokens, 1m09s. What the author had not seen: the reviewer's caller-only rule would have refused every doc in `docs/` that is
  not `usage.md`, including the one that already exists, and one doc blob that failed to fetch stopped the whole sync, even for a removed Worker.
- 2026-10-25 `cloud-brain-dev` commit `ab5a4df` (`usage.md` rewritten as a guide to the service: domain model, purpose of each method): FIX, 3 findings (2 confirmed,
  1 plausible) and 1 aside, all taken (cloud-brain-dev `dec24c7`). 75k subagent tokens, 1m02s. What the author had not seen: the update rule
  left out access, price and limits, which the guide itself lists, and the guide sent readers to a schema that does not exist yet.
- 2026-10-25 `lopebooks/notebooks/@tomlarkworthy_vr-hackerspace.html`, module `@tomlarkworthy/vr-hackerspace` (Babylon 9 upgrade and an
  HTML-in-canvas panel spike): BLOCK, 11 findings, 7 taken, 4 declined as scope (CDN libraries not vendored, no `test_*` cells,
  the architecture prose, the sphere's box collider). 104k subagent tokens, 4m35s. What the author had not seen: the panel prose
  said the flag was required while Babylon's SVG fallback draws it without one, and every edit upstream of `loop` added a second
  physics observer. It could not enter VR or turn the flag on; the author's Playwright + IWER harness covered that.
- 2026-10-27 `plan/specs/ordinal-diagram.html` (`@spec/ordinal-diagram`, spec with a running prototype, authored by the spawning
  session): FIX, 5 findings, all confirmed by the reviewer in a browser; 4 fixed and rebuilt, 1 (offline the prototype draws nothing)
  answered in the prose, because a cell cannot catch an error in the stdlib `SQLite` it depends on. 126k subagent tokens, 6m11s.
  What the author had not seen: three edges read as calls the snapshot does not have, because a curve passed behind the box
  between its ends; the author's fix covered same-row edges only, and a screenshot after it showed the cross-row case.
- 2026-10-27 `lopebooks/notebooks/@tomlarkworthy_systems-tabletop.html`, module `@tomlarkworthy/systems-tabletop` (new, authored by
  the spawning session): BLOCK, 7 findings (6 confirmed, 1 plausible), all taken; the plausible one (journal source grows ~1–2 KB per
  step) is stated in the prose, not changed. 103k subagent tokens, 3m58s. What the author had not seen: dragging while a past board
  was shown silently made it the live board, every log write wiped a half-typed note, and human rule edits left no log step.
- 2026-10-27 the same notebook, second run after the fixes: FIX, 4 findings (3 confirmed by trace, 1 plausible), all taken. 93k
  subagent tokens, 3m12s. What the author had not seen: `describe()` handed the AI the previewed board as the current one, and the
  preview test could not fail because the previewed and live boards were the same.
- 2026-10-27 `plan/specs/ordinal-diagram.html`, the Prototype section after it gained three linked views (second run): FIX, 4
  findings (3 confirmed, 1 plausible), all taken and rebuilt. 116k subagent tokens, 4m25s. What the author had not seen: the
  engine ignored `hulls: false`, which only the UI cell honoured, so the module the Handover tells an implementer to extract
  would have drawn hulls on the matrix view. The fixes were first sent over the channel; the tab closed before
  `export_notebook`, they were lost, and they went in through the seed instead.
- 2026-10-27 the same notebook after a rewrite (component tray, drag-to-add, 10 shapes, robocoop-5 prompt rule + context +
  tools): FIX, 4 findings, all taken. 108k subagent tokens, 3m29s. What the author had not seen: an `add` with no zone landed
  inside Triage and was logged "in open space", and "duplicate" made two pieces with one label, which the AI addresses by label.
- 2026-10-28 `lopebooks/notebooks/robocoop-5-voice-try.html`, modules `@tomlarkworthy/robocoop-5-voice-try` (new) and the
  diff of `@tomlarkworthy/robocoop-5-voice` against cloud-brain-dev 928a2948 (speak `task_complete`'s summary): FIX, 6
  findings (4 confirmed, 2 plausible), all taken (lopebooks `9a80ffa8`). 99k subagent tokens, 4m12s. What the author had
  not seen: the fix was silent again whenever the model spoke a preamble before `task_complete`, because "said text" was
  kept per turn, not per step; the author's live test happened to have no preamble. The new test for it times out with
  the fix removed.
- 2026-10-28 `plan/cloud-brain-delvetown.md` (first writing, authored by the spawning session): BLOCK, 9 findings (6 confirmed,
  3 plausible), all taken. 90k subagent tokens, 4m06s. What the author had not seen: the town publishes its lexicons as
  records, and `membership.join`'s says a code admits an account on any PDS, which removed one of option B's gaps and a
  "Not known" item; the post limit is 100000 graphemes, not Bluesky's 300; a `.delve.town` handle does not survive a move.
- 2026-10-28 `tools/cloud-brain/delvetown-agents.md` (a public page for Delvetown agents, authored by the spawning session):
  FIX, 4 findings (2 confirmed, 2 plausible), all taken; the plausible one about `static.*` was partly answered by the
  author's test (`static.list` 200 as a member) and the page now says `static.put` was not run. 76k subagent tokens,
  1m37s. What the author had not seen: step 2 used `$TOKEN` that step 1 never set, and nothing said GET for a query
  and POST for a procedure, so `member.deploy` could not be called from the page alone.
- 2026-10-31 `plan/specs/ordinal-diagram.html`, rebuilt as an 11-step tutorial (Part 1), the full example (Part 2) and the
  spec (Part 3): FIX, 4 findings, all confirmed and taken. 144k subagent tokens, 6m22s. What the author had not seen: every
  Part 1 diagram waited on `sqlRows` (sql.js from a CDN) through `diagramFor`'s default argument though it passed its own
  rows, so Part 1 was blank offline; and no test compared the SQL views with the JS copies the tests read.
- 2026-10-31 `plan/specs/ordinal-diagram.html` (rebuilt as the cb4 article "How Do We Understand This Slop?"): FIX, 8 findings, all confirmed and all taken. 160k subagent tokens, 4m40s. What the author had not seen: the bindings parser read on into the next pipe table, the deployer's own calls and resources never reached the tables, and a wildcard call (`*.send`) was dropped with no note.
- 2026-11-02 `plan/specs/ordinal-diagram.html`, whole (after methods nested in their Worker and "Explore any tables"): FIX, 7 findings, all
  taken. Token count not recorded. What the author had not seen: the worked cases named the web shop but used rows only the
  2026-10-27 snapshot has, and five internal cells printed raw values in the reading order.
- 2026-11-03 `plan/specs/ordinal-diagram.html`, whole (after SQL was removed): BLOCK, 5 findings, all confirmed and all taken in the
  next round (the move of every diagram onto tables). 170k subagent tokens, 7m25s. What the author had not seen: tutorial step 2
  showed `tinySchema is not defined` while all 11 test cells passed, ↗ never opened on a box that shared a cell (the drag handler
  captured the pointer), and the deployer lines quoted a sentence the saved fixture does not contain.
- 2026-11-03 `plan/specs/ordinal-diagram.html`, whole (after every diagram moved onto tables): FIX, 4 findings, all confirmed and
  taken. 178k subagent tokens, 8m37s. What the author had not seen: `products` dropped rows the `bindings` table still pointed at,
  so Explore listed a gap the page made itself; the legend offered a "guess" line style no line has; and the mermaid flowchart
  is the one cell that fails offline.
- 2026-11-03 `plan/specs/ordinal-diagram.html`, whole (after the methods chapter and the method-level call graph): BLOCK, 3 findings,
  all confirmed and taken. 156k subagent tokens, 5m04s. What the author had not seen: chapter 3's prose stated the call-depth
  direction backwards, and chapter 2's fold instruction described the fold of the next level down.
- 2026-11-02 `lopebooks/notebooks/@tomlarkworthy_systems-tabletop.html`, module `@tomlarkworthy/systems-tabletop`, whole (after ▶ tick and dice): FIX,
  6 findings (4 confirmed, 1 confirmed/plausible, 1 plausible), all taken. 123k subagent tokens, 4m11s. What the author had not seen: seed rule 3
  ("stands next to it") asked for a placement the tools cannot make or show; the live model had worked around it with a link, which hid the gap.
- 2026-11-03 `lopebooks/notebooks/@tomlarkworthy_systems-tabletop.html`, module `@tomlarkworthy/systems-tabletop` (after the deck/draw change): FIX, 6 findings (4 confirmed, 2 plausible), all taken: prompt narrowed to "every op that changes the board" rather than loosening `note`'s fields, tray grows the board height, size note 2,717, `unlink` throws on a missing id, preview banner says the rules shown are current, "oldest" defined as lowest-numbered. 119k subagent tokens, 4m31s.
- 2026-11-03 the same module after `draw` was replaced by `pick` + `$n` references: FIX, 6 findings. 3 taken (example tickets relabelled "Ticket 1".."3" so an added ticket is "Ticket 4"; opening a step stops a running replay; `BOARD NOW` cut at the last `\nBOARD:\n`, not the first, which rules text could contain). 3 declined: `why` on `note` (the owner ruled against loosening the tool; the prompt asks for it on board ops only), a key/endpoint sentence (unpaired demo mode needs none: tested with MiMo that day), a registration test (deferred). 124k subagent tokens, 5m10s.
- 2026-11-03 the same module, cells `tabletopTools`, `aiPrompt`, the pick test (after `$n` became `as`/`$name`): FIX, 3 findings, all taken: a deck card could be moved or listed by name (now refused unless reached through a pick's `$name`, and left out of the "no piece" id list; the pick test covers both), `restoreMoment` takes a `why` (it changes the board), the prompt's draw example carries `why`. 94k subagent tokens, 3m48s.
- 2026-11-03 `plan/specs/ordinal-diagram.html`, `@spec/ordinal-diagram`, the reflexion `compare`, line weights and the Prior art rewrite: BLOCK, 6 findings (4 confirmed, 2 plausible). 5 fixed (Explore threw on an `id` level after the new reserved-name guard; R14 contradicted its Decisions row; chapter 6 named 2 of 4 uncompared callers; a role held by 26 Workers mapped to one; the chapter's title), 1 left as is (a compared line into a docs-only method would be dashed; none exists). 131k subagent tokens, 5m31s.
- 2026-11-04 `plan/specs/ordinal-diagram.html`, whole (after chapters 7 and 8, security and tests): BLOCK, 7 findings (6 confirmed,
  1 plausible), all taken. 170k subagent tokens, 7m08s. What the author had not seen: the stranger added for chapter 7 made chapter
  4's "the one row of the actors table" false, the opening still listed six questions, and every chapter waited for the 6.4 MB of
  source that only chapter 8 reads.
- 2026-11-05 `lopebooks/notebooks/@tomlarkworthy_systems-tabletop.html`, module `@tomlarkworthy/systems-tabletop`, named rules in place of numbered ones: FIX, 3 findings (all plausible), all taken. 76k subagent tokens, 16m10s. What the author had not seen: the rule-name definition also matched the example's title line and its "Each turn…:" line, and nothing on the page told a person writing rules that each needs a name.
- 2026-11-06 `plan/specs/modular-arm.html` (`@spec/modular-arm`, design-space spec for a modular 6DOF arm, authored by the spawning
  session): FIX, 9 findings (8 confirmed, 1 plausible), all taken and rebuilt. 112k subagent tokens, 8m23s. What the author had not
  seen: the belt stage was attached by object identity, so it also geared the wrist whenever both actuator choices matched; fixing it
  made an identical-module design pass at 0.3 kg @ 0.4 m, and that falsified the author's "never passes" finding. Two quoted figures
  (92% of stall, 0.2–0.4 kg on a bayonet) came from the wrong column.
- 2026-11-06 `plan/specs/modular-arm.html`, `@spec/modular-arm`, the four sections added after the servo-arm findings (direction, prior art, market research, hexapod links) and `questions`: FIX, 8 findings (6 confirmed, 2 plausible), 7 taken, 1 partly (the untracked `hexlink.ts` is labelled uncommitted, not committed or moved into a cell). 102k subagent tokens, 3m32s. What the author had not seen: the T8×8 screw it called self-locking back-drives (lead angle ~20° against ~11° friction), the spec's opening and Handover still built the servo arm, and the new 0.1 mm target had no requirement.
- 2026-11-06 `plan/specs/modular-arm.html`, `@spec/modular-arm`, the hexapod-link-with-cube-joints and low-cost-link entries plus the research-log rewording: FIX, 10 findings, all taken. 117k subagent tokens, 4m43s. What the author had not seen: a servo link priced "under $100" from parts its own row put at up to $159, and a "serves" column naming markets the market table never researched.
- 2026-11-06 the same module, the DC-motor strut entry (live thrust/speed/resolution table): BLOCK, 7 findings, all taken. 92k subagent tokens, 4m09s. What the author had not seen: it sized the fast N20 for "about 20 N" of tool load when the notebook's own strut-force ratio (2.4–3.9× the load) gives 5–9 N, and the summary block was hand-copied from the live table with no test (one added).
- 2026-11-06 the same module, the light-link stack entry (`stackDemand`, new N20/HPCB/JGA25 rows): BLOCK, 6 findings, all taken. 111k subagent tokens, 3m48s. What the author had not seen: the demand table filed the HPCB motors under a 0.6 kg link while the prose rated them against the 0.3 kg demand (HPCB is N20-size; the row label was the error), and the HPCB rows used 28 encoder counts where Pololu's encoder is 12 CPR.
- 2026-11-06 `plan/specs/modular-arm.html`, `@spec/modular-arm`, cells from "Hexapod link model, moved into the notebook" to the end
  (the hexapod model, four configurations, a three.js viewer, a design proposal): BLOCK, 6 findings (5 confirmed, 1 plausible),
  all taken. 116k subagent tokens, 5m04s. What the author had not seen: the proposal priced generic N20s next to a branded
  Pololu strut, a "within 2°" claim the sliders contradict (and a twist range that falls to ±55° at 15°), and a ±40° tilt
  that holds only when the platform height may move (±37–38.5° at home height).
- 2026-11-06 `plan/specs/modular-arm.html`, `@spec/modular-arm`, the link-controller cells (`linkPinBudget`, its test, "Link
  controller: proposal"): FIX, 7 findings (2 confirmed, 1 datasheet fact, 4 plausible), all taken. 79k subagent tokens, 3m39s.
  What the author had not seen: two earlier cells still named the RP2040 the new cell replaced; 26 GPIO is the Pico board,
  not the chip (30); a DRV8833 has two sense pins, which took the budget from 33 to 36; and "a port gives 15 W" is a maximum.
- 2026-11-06 `plan/specs/modular-arm.html`, `@spec/modular-arm`, the draft link-controller circuit (`ctrlPinMap`, `ctrlParts`,
  `ctrlSense`, block diagram, notes): FIX, 12 findings (6 confirmed against fetched datasheets, 6 plausible), all taken.
  120k subagent tokens, 5m34s. The reviewer fetched the RP2350, DRV8833 and Pololu #3072 pages and closed the author's
  "recalled, unchecked" caveats. What the author had not seen: the proposal's "cap to what the port reports" had no wire to
  the CC pins; the ADC behind an RC filter reads current × duty, not current; a 100 µF bulk cap charged straight from VBUS;
  and six motors at rated load draw about 3.6 A, more than a 3 A port.
- 2026-11-07 `plan/specs/modular-arm.html`, `@spec/modular-arm`, the connector cells (`interfaceLoads` to "Connector:
  proposal"): FIX, 8 findings (5 confirmed, 3 plausible), all taken. 134k subagent tokens, 11m46s. The mechanics and every
  load figure recomputed. What the author had not seen: the test went red when a slider moved; a "thumbscrew" reached only
  by a hex key, so the 0.3 N·m behind 375 N was uncontrolled and the margin over 360 N was 4 %; 2 magnets cannot match 3
  coupling orientations; a 3 mm hex cannot pass an M4 thread at all; and a tilted link puts its screw 72 mm off the key's line.
- 2026-11-07 `plan/specs/modular-arm.html`, `@spec/modular-arm`, the quarter-turn collar cells (`wrenchAtConnectors` to
  `test_collar_connector`): BLOCK, 6 findings (5 confirmed, 1 plausible), all taken; the plausible one (no plug boss in the
  model) went into the prose and "Not done", not the masses. 142k subagent tokens, 11m23s. What the author had not seen: the
  3D model drew every hook lip mirrored (three's cylinder theta runs from +z, so world angle = theta − π/2), and the author's
  own screenshot of it had looked right; "the ramp back-drives" ignored the thrust washer that the closing torque counted.
- 2026-11-07 `plan/specs/modular-arm.html` (`@spec/modular-arm`), the collar section after the joint-height change, the stiffness
  model, and the mass and design cells: BLOCK, 4 findings and 3 minor, all taken. 128k subagent tokens, 7m31s. What the author had
  not seen: the 3D view drew a 20.3 mm joint (6.3 mm seat + 14 mm boss) while the stack model used 14 mm. Every load moved with the fix
  (spring 429 → 462 N), and the plain elbow arm's plate clash went away, with 1.3 mm of joint height to spare. The prose also said
  the boss was a fifth of a rise it was nearly all of, and that strut stiffness mattered less than the seat's, which is false for the
  steel seats the same paragraph recommended.
- 2026-11-07 the same notebook, second round over the collar, stiffness, BOM and summary sections: BLOCK, 11 findings, 10 taken,
  1 handled by a pointer rather than a move (the collar section's data cells render above its heading; a sentence now says so, as
  moving seven cells including a viewof means delete and redefine). 157k subagent tokens, 6m21s. What the author had not seen:
  the clash margin was read off a sweep with 1 mm steps (1.3 mm; the edge is at 18.5 mm, so 1.8 mm), the drawn stop post met the
  lug at 77° of an 86° turn, before the dwell, and the configuration the proposal keeps (the spacer elbow) sags most, while the
  summary named only the 3-link stack.
- 2026-11-07 `plan/specs/modular-arm.html` (`@spec/modular-arm`, the Parts and adjacent-face sections, authored by the spawning session): FIX, 8
  findings (7 confirmed, 1 plausible). 7 fixed, 1 partly: the cut sheet and 3D view still render before the prose that explains them,
  because cells defined over the channel cannot be moved; the Parts intro now gives the reading order. 143k subagent tokens, 5m19s. What the author had not
  seen: the adjacent-face check held the first link at one rotation, so its 78–80 mm answer depended on how the sockets are clocked
  (at any rotation the cube needs 82 mm); and the opening summary still gave the proposal's 2.2× margin and $830 stack after Parts had replaced them.
- 2026-11-07 `plan/specs/modular-arm.html`, `@spec/modular-arm`, the wiring and power cells (base, mains, link cable, cube harness, tools): FIX, 8 findings (5 confirmed, 3 plausible), all taken. 144k subagent tokens, 5m47s. What the author had not seen: the drop per run never added up to the voltage at the top link (6.44 V before contacts, 13.5 mΩ a joint may lose), the coil's turn count assumed a full helix through a 10 mm wire hole, and "The model" still said wires were not drawn.
- 2026-11-07 `plan/specs/modular-arm.html`, `@spec/modular-arm`, the datasheet cells (18 attached PDFs, `ds`, `ratingChecks`, the "What the datasheets say" section): BLOCK, 9 findings (8 confirmed, 1 plausible), all taken. 157k subagent tokens, 7m42s. What the author had not seen: the 0.2 Ω sense resistor the section proposed allows 1.2 A against the 1 A contact, because the DRV8833's trip tolerance was on a page the excerpt had dropped; the XT30U citation pointed at a cover page; and the section above it still said "XT30 is rated 15 A" and "from memory". Also: a cell can be moved after all, by defining a new variable with the same source and deleting the old one (it is appended to the module, and the exporter keeps that order).
- 2026-11-07 `lopebooks/notebooks/ordinal-diagram.html`, `@spec/ordinal-diagram`, whole (the spec trimmed for lopebooks: robocoop-5, pairing
  mains and svg-lens dropped, 5.1 MB -> 3.9 MB): BLOCK, 6 findings (4 confirmed, 2 plausible), all taken. 173k subagent tokens, 7m27s. What the
  author had not seen: dropping svg-lens left the drawing toolbar and a "drag shapes" instruction with nothing to act on, and path ids
  held a space, which the linked hover splits on.
- 2026-11-07 `plan/specs/modular-arm.html`, `@spec/modular-arm`, the round-2 cells (`jointTrials`, `powerChain`, "Joints", "Drive",
  "Proposed compromise", `test_compromise_numbers`, the HPCB 6 V table in `ds`): FIX, 9 findings, all taken in round 3 the same evening.
  What the author had not seen: dropping the 1 A cap had lowered the continuous limit to 0.375 A, so "30:1 cannot" was a duty of 0.73,
  not a no; a stall's 231 N went into a screw, nut and gearbox nobody had checked; and the parallel-bridge wiring needs AISEN and BISEN
  on one resistor, on a datasheet page the excerpt had dropped.
- 2026-11-07 `plan/specs/modular-arm.html`, `@spec/modular-arm`, whole, after round 3 (tool forces, thrust bearing, 3.3 V rail, DRV8215,
  measurement kit, 22 attachments): FIX, 12 findings, 10 taken and 2 declined (one cell of proposal values to replace three copies of the
  same literals, left as upkeep; the 16 MB size, explained in the notebook instead of shrunk). 293k subagent tokens, 7m25s. What the author
  had not seen: "One strut, end to end" still told a builder to glue the ball and fit the brass coupling two headings after both were
  replaced, the 3D model still drew the coupling, and Handover named 4 of the 9 blocking questions and not the proposed next step.
- 2026-11-07 `plan/specs/modular-arm.html` (`@spec/modular-arm`), the Test kit BoM section and the cutSheets style scoping: FIX, 6 findings, all confirmed and all taken. 118k subagent tokens, 5m21s. What the author had not seen: the kit had no bench supply or controller for two of its six measurements, the cup arc was drawn as a dome over the ball (SVG sweep flag), the lip sat at the wrong height and cut into the ball, two labels collided, and two earlier pointers still sent the reader to the superseded €92 list.
- 2026-11-07 `@tomlarkworthy/exporter-3`, changes since `e65982c~1` (write `"prerender": false` back to bootconf): FIX, 2 findings and 1 note, all confirmed. Taken: the missing test (prerender logic pulled into `resolvePrerender` and `bootconfPrerenderLine`, two tests, lopecode `b87dbcd` / lopebooks `2f00130b`). Left for Tom: the push of the `book` cell to Observable, whose copy still has the old line, and the sweep to the 252 other copies. 77k subagent tokens, 2m51s.
