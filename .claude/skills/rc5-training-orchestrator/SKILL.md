---
name: rc5-training-orchestrator
description: Use when the user asks to run robocoop-5 training continuously ("keep training rc5", "run the rc5 training loop", "rc5-training-orchestrator", overnight rc5 training). The main session is the orchestrator. It keeps a pool of ~4 rc5-train workers running and judges each proposal as it lands: it applies the fix to the canonical notebook, gates it on probes, tests and preflight, registers the eval, then commits and pushes to main and refills the slot. It also audits each worker's method and amends the worker playbook (rc5-train's standing rules). Extends rc5-train, whose worker procedure and "where a change belongs" table still apply.
version: 0.1.0
---

# rc5-training-orchestrator: the continuous merge loop

`rc5-train` describes one round: spawn workers, aggregate, stop for approval, apply. This skill is
the loop that ran on 2026-09-28. The orchestrator judged and merged each worker's result on its own,
because Tom had given standing authority to commit and push on main. The record: 51 batches (27 to
78) between 09:59 and 17:29, each committed and pushed on its own, with the log in
`tools/scratch/rc5-train/overnight/log.md`.

Read `.claude/skills/rc5-train/SKILL.md` first. Workers follow its "Worker procedure" and its
"Standing rules". The orchestrator owns those rules: it amends them when a worker's method fails
(see "Evolving the playbooks"). Three things improve in this loop: the agent (by workers), the
worker playbook (by the orchestrator), and this playbook (by the orchestrator with the user).

## Preconditions

- **Standing authority.** The user must have said to commit and push on main without asking. If
  they have not, use `rc5-train`, which stops for approval.
- **Model.** All workers use `xiaomi/mimo-v2.5-pro`. v2.6 was dropped on 2026-09-28: it timed out
  in 3 of 3 goal runs with long reasoning steps.
- **Credits.** Check before each refill. Never print the key; refer to it as `$KEY`.
  ```
  curl -s https://openrouter.ai/api/v1/credits -H "Authorization: Bearer $(grep -o 'OPENROUTER_API_KEY=.*' tools/robocoop-4/.env | cut -d= -f2)" \
    | python3 -c "import json,sys;d=json.load(sys.stdin)['data'];print(round(d['total_credits']-d['total_usage'],2))"
  ```
  Measured cost (2026-09-28): a full regression run (r5) was $1.08 for 99 evals. Credits read
  $9.61 after batch 73.

## The loop

On every worker completion: **merge, then refill that slot.** Keep about 4 workers running. A
regression run in the background is not a reason to pause (Tom, 2026-09-28: "Why are we not
pushing on with parallel training?"). Stop refilling only on credits, a harness breakage, or the
user saying so. "Let the pool drain" means merge what lands and spawn nothing new.

1. **Pick the next goal.**
   - Mix maintenance tasks in with building new things: add tests, refactor, upgrade, QA and review
     existing notebooks, restore after save. Tom asked for this explicitly on 2026-09-28.
   - Before spawning, check the goal is not already covered:
     `git log --format=%s | grep "rc5-train batch"` and `ls tools/robocoop-5/eval/rc5t/`.
     The m42 worker (d3 v5→v7 upgrade) was stopped after launch because batch 43 had already
     covered it and found no defect.
   - A follow-up worker gets the previous worker's dir and findings in its brief, so it does not
     redo them (m39 continued m32's reopen work).
2. **Spawn** with `Agent`, `model: "opus"`, `run_in_background: true`. Use the rc5-train worker
   brief; the standing rules travel with it because the worker reads the skill. Add notes only
   for this task: the fixture's shape, the defects to plant, the negative controls to include, and
   a predecessor's dir if there is one. A note you find yourself repeating in every brief belongs
   in the standing rules instead.
   Name the worker `m<N>` and give it the dir `tools/scratch/rc5-train/<RUN>/m<N>/`.
3. **Judge** the proposal (see below). Often the model solves the goal unaided: batches 40, 43, 45,
   49 and 74, and m41 in batch 77, found no defect. The result is then an eval only, which is
   still worth merging as a regression guard.
4. **Apply, verify, register, commit** (sections below).
5. **Audit the worker's method,** not only its result. List what you had to change at merge time
   and why. If a rule would have prevented it for any goal, amend the worker playbook (below).
6. **Log one line** per batch in `tools/scratch/rc5-train/overnight/log.md`, including any
   playbook amendment.

A worker notification can be interim ("waiting for the fixed run"). Act only on a result that
names `proposal.md`.

## Judging a proposal

Reject or trim a proposal on any of these. Each was seen on 2026-09-28.

- **The eval scores a wiki read.** Evals score behaviour. m43's eval had a
  `tool_call_matches moving-cells-into-another-module.md` criterion; it was removed before
  registering.
- **The fix is tactical.** Apply the rc5-train test: would it be written the same way for a
  different domain? A wiki example must not use the goal's own domain.
- **A trigger that matches ordinary code.** It refuses every write until the page is read. Ask for
  the corpus count of trigger matches. m32's triggers matched 9 infrastructure modules and no user
  notebook.
- **An unread page.** If the agent never read the page in the runs that had it, the page is
  unproven. Hold it back and say why in the commit (m43's `moving-cells-into-another-module.md`).
- **An idiom with no precedent.** Search the corpus for the general mechanism, not the goal's
  shape. For example, `Inputs.bind(` appears 698 times; the task-specific phrasing appeared 0 times.
- **Too few runs to claim a fix.** With 1–3 runs per side, say "anecdote" in the commit. The
  model-free probe is the actual evidence for a tool fix.
- **An edit to shared infrastructure for one app's sake.** Examples: save-in-place, exporter-3,
  fileattachments. Take it to the user instead.

Decisions that change behaviour for every session go to the user, not into a batch. Examples:
where new modules open in the layout (the `open=` hidden-tab defect), a corpus-wide `jbApply`
sweep, a bootloader hook.

## Applying a change

```
bun tools/lope-sync.ts checkout --force @tomlarkworthy/<m>      # learnings gate: read resyncing-modules… first
bun tools/lope-sync.ts status                                   # must say clean before patching
patch -s modules/@tomlarkworthy/<m>.js < DIR/<m>.diff           # unified diffs only
bun tools/channel/sync-module.ts --module @tomlarkworthy/<m> --source modules/@tomlarkworthy/<m>.js \
  --target lopebooks/notebooks/@tomlarkworthy_robocoop-5.html
```

- **Normal-format diffs** (`diff` without `-u`) misapplied by line number twice (m26, m30). One
  landed `emptyNote` in the wrong function. Apply those by content with a Python string replace.
  Assert that the anchor occurs exactly once.
- **A worker diff can be stale.** Check the diff header's canon timestamp against the last batch.
  If the canonical moved, `patch --dry-run` first.
- **Review the added lines before applying.** Add small guards the worker missed. For example,
  batch 76 made `content` optional in `write_file`, then added an error when neither `content` nor
  `from` is given. It also reworded a hint the model had misread.
- **Wiki page:**
  - Copy it to `knowledge/`.
  - Run `bun tools/sync-wiki.ts --write --doc <page>.md --notebook <nb>` for both
    `@tomlarkworthy_robocoop-5.html` and `@tomlarkworthy_markdown-wiki.html`.
  - Run `bash scripts/check-learnings-triggers.sh`.

## Verifying (all must hold before commit)

| gate | command | baseline (2026-09-28) |
|---|---|---|
| boot | `node tools/robocoop-5/boot-smoke.mjs \| grep -c '"session": "ok"'` | 1 |
| in-notebook tests | `node tools/lope-browser-runner.ts <nb> --run-tests \| grep Found` | 276: 271 passed, 4 failed, 1 timeout |
| static | `bun tools/lope-preflight.ts --baseline tools/preflight-baseline.json <nb>` | 0 NEW |
| probe | `node tools/scratch/rc5-sessions/s<NN>-<slug>.mjs <nb>` | fails before the change, passes after |
| neighbours | the other probes that drive the same tool | still pass |
| eval oracle | `node tools/robocoop-5/eval/run.mjs --oracle --model xiaomi/mimo-v2.5-pro --ids <id> --json DIR/oracle-reg.json` | 1.00 |

The test counts are absolute here only because they were stable across 50 batches. A changed
count needs comparing against `git show HEAD:<nb>`.

Ported probes and fixtures need their paths fixed. Worker probes resolve
`"../../../../robocoop-5/lib/"`; in `tools/scratch/rc5-sessions/` that is `"../../robocoop-5/lib/"`.

## Registering an eval

```
cp DIR/eval.mjs tools/robocoop-5/eval/rc5t/<slug>.mjs
sed -i '' 's#^import <prev> from "./rc5t/<prev-file>.mjs";#&\nimport <name> from "./rc5t/<slug>.mjs";#; s#^<prev>,$#&\n<name>,#' \
  tools/robocoop-5/eval/evals-rc5-train.mjs
```

`<prev>` is the last import and list entry, and each registration moves it. Check with
`grep -c <name>` (expect 2). An eval module that exports an array is registered as `<name>[0]`.
The eval must not `readFileSync`; fixtures are inlined with `json.dumps`.

## Committing

Write the message to the scratchpad. Follow the `document` skill's commit-message section: the goal
in quotes, the quoted symptom, the before → after runs as aligned text, what is not verified, and
the gates. End with the session's attribution trailers.

```
git -C lopebooks add notebooks/@tomlarkworthy_robocoop-5.html [notebooks/@tomlarkworthy_markdown-wiki.html]
SKIP=lope-sitemap git -C lopebooks commit -q -F $MSG \
  || (git -C lopebooks add -u notebooks/ && SKIP=lope-sitemap git -C lopebooks commit -q -F $MSG)
git -C lopebooks push -q origin HEAD:main
git add lopebooks knowledge/<page>.md tools/robocoop-5/eval/rc5t/<slug>.mjs \
  tools/robocoop-5/eval/evals-rc5-train.mjs tools/scratch/rc5-sessions/s<NN>-*.mjs
git commit -q -F $MSG && git push -q
```

- The spec-sync hook fails the first lopebooks commit when a sibling spec changed. The `||` branch
  stages it and retries.
- Never stage `modules/canonical.json`; the user has unrelated edits in it. `modules/*.js` is
  gitignored, so `git add` of a working copy is a no-op.

## Regression runs

```
nohup node tools/robocoop-5/eval/run.mjs --model xiaomi/mimo-v2.5-pro --timeout 600000 \
  --json $RUN/rN.json > $RUN/rN.log 2>&1 < /dev/null & disown
```

- Pass `--timeout`. `run.mjs` defaults to 120s. m39's baseline stopped at that cap and scored
  0.25, against 0.88 for the same notebook under a 20-minute cap.
- **Batches merged during a run make it a mixed baseline.** r6 started at batch 61 while batches
  62–78 landed. Log this when it happens. For a clean comparison, run on a copy frozen with
  `rc5-sandbox.sh new`.
- **A scoring change breaks comparability.** Batch 58 made `no_runtime_errors` read promise
  rejections, including anonymous cells. Before that it had passed 233 of 233 results. Evals that
  use it are not comparable across that line.
- Compare only the evals the two runs share. r4 → r5 (85 shared evals): 0.917 → 0.941.
- Measured cost profile (r5, 99 evals, 781 calls):
  - 20.3k prompt tokens per call, 91% cached.
  - Fixed prefix about 11k tokens.
  - Median steps 5.5 for evals scoring ≥ 0.9 against 6 for those under 0.7.

  Context size was not what separated passing evals from failing ones.

## Worktrees and stale builds

A robocoop-5 tab that runs from a worktree runs that worktree's build. The owl session on
2026-09-28 ran the `rc5-multi-session` build from 2026-09-27 22:15, before that day's batches. It
failed on two tool results the canonical already fixed; replay probe s67 shows the difference.
Before judging a live session, compare its build against the canonical:
`grep -c <marker from a recent batch>` on both HTML files.

Do not fast-forward a worktree while one of its notebooks is open and paired. Saving that tab
writes its old build back over the updated file.

## Evolving the playbooks

**Level 2: the worker playbook** (`rc5-train/SKILL.md`, "Standing rules"). Amend it when a worker's
result had to be fixed, trimmed or redone at merge. Signals seen on 2026-09-28:

| observed at merge | rule added |
|---|---|
| a normal-format diff misapplied by line number (m26, m30) | unified diffs against a fresh canonical |
| an eval rewarded reading a wiki page (m43) | evals score behaviour only |
| a baseline stopped at run.mjs's 120 s default (m39) | pass every time limit explicitly |
| a goal already covered was dispatched (m42) | check the batch log before dispatch |
| evals read fixtures from the worker's dir | evals are self-contained |
| v2.6 timed out in 3 of 3 runs | pin the worker model |

- **One rule per failure,** written with the case that caused it, so a later session can judge
  whether it still applies.
- **The rule must be general:** would it read the same for a different goal? A goal-specific
  lesson goes in that goal's brief, not the playbook.
- **Commit the amendment on its own** (`rc5-train playbook: <rule>`), so the change in worker
  behaviour can be traced to it.
- **Remove a rule that no longer applies,** and say why in the commit. The list must not only grow.

**Level 3: this playbook.** It is amended with the user, not by the orchestrator alone:
- A user correction becomes a rule here, with the user's words as the case. Examples: "Why are we
  not pushing on with parallel training?" (keep the pool full) and "cover maintenance tasks".
- At hand-over, review the session's own bad calls, such as a duplicate dispatch or a mixed
  regression baseline, and propose the rule to the user.

## Handing over

End with a write-up for the user covering these three things:
- batches merged, with each batch's fix and eval;
- playbook amendments (worker and orchestrator), each with the failure that caused it;
- the regression result, with its caveats;
- the open decisions, each with the alternative and its cost.
