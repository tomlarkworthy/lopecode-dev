<!-- A page of `agents/implementer.md`: step 9: the rebase, what the record holds, the emit.
Read it when your change has a deploy (the emit; with no state file, the stop before it), a rebase ends in a conflict, or a sentence of your record is one you did not see in a run.
Cut from the brief 2026-10-13 (`writer-brief-and-tool-output-smaller`), as it stood. "Above" and "below" in it are of the
brief before the cut: the table "The pages" of `agents/implementer.md` has the page of each step and section. -->
9. **Make it ready to land, still in the worktree and with no lock.** Since 2026-10-10 19:33 the
   lock covers the deploy and the push only; before that the second test run, the emit and the
   record were inside it and writers queued (Tom: "Issue completetion is bottlneck").
   - **Bring the worktree up to `origin/main`:** `$W/tools/cloud-brain/worktree.sh --rebase <tree>`
     (a fetch, then the rebase), never `git rebase` there (after a conflict `git rebase --continue`
     fails on the submodule links). It prints the files that came in, and nothing when
     `origin/main` had not moved. Exit 2: origin was not reached, and nothing changed.
     Exit 1 is a conflict: another writer changed the same lines. Resolve it in the seed, never in
     the notebook, `git add` each file by name, and run the same command again.
   - **If the rebase changed what your module is built from** (the files it printed
     name your seed, a seed it imports, `cloudflare-iac*.ojs` or `build.ts`), run steps 7 and 8
     again in the worktree (the rebase has read what cb4 runs again: another writer has deployed). Another service's seed, a record, `seen.json` or a doc does
     not count. The count you submit is the last run you made.
   - **Record it** in a file of the issue's own, `tools/cloud-brain/records/<id>.md` (follow
     `.claude/skills/document/SKILL.md`): what changed, the test count, what was not tried. A
     second round adds a dated section to the same file. Every time in it is read from
     `git log --format=%ci`, an event's `at` or `date`, never estimated. Every count in it, and in
     your comment, is the output of a command written beside it, run after the last change it
     counts; a count you cannot run again is not written. A sentence that says what the page, a
     tool or a doc line does is held the same way (where a thing is drawn, when a call is sent, "at
     no other time", "for every Worker"), in the record, the comment and the docs: you saw it in a
     run of your own after the last change, made the way its reader will meet it (the page in the
     tab, the tool that caller has, each Worker the sentence covers). What you saw of one case is
     written of that case and the rest goes under what was not tried. Words taken from the issue or
     the spec are checked as your own are (2026-10-11: review 1202 of `ds-2-span-and-refresh-controls`,
     three texts had the note "under the panels" as the spec does, and it is drawn above them;
     review 1250 of `verify-run-shell-runs-deployed`, "The page's module is then not booted", false
     for `brain-x-page`; review 1259 of `fb-a2vp4smwzq`, four pointers shown reachable with
     `brain.ts curl`, and the operator's own tool cut three of them at 8000 characters). What the
     check finds is mended in the file, and that landed, before the submit: a comment that says a
     sentence of the record goes further than what you saw, with the record left as it was, is sent
     back for that sentence (review 1090 of `record-first-resumed-rework-round`, after comment 1027,
     "Three smaller things in what landed, not changed"; review 1424 of `ds-3-logs-reads-the-span`,
     finding 2, after comment 1411, "Two places where the record's words go further than what I
     saw": a resumed round of 154,128 tokens and a second review for two lines). Not `spec-as-built.md`:
     every writer appended there and the cherry-picks met. The deploy hash and the commits are
     the refs of the submit, not part of the record. Of your own commits the record names neither
     a sha nor a `%ci` while a rebase is still ahead of them (this step's, and step 10's under the
     lock): a rebase gives each a new sha and a new committer date, and the record that quoted one
     is then wrong and is mended (2026-10-12, five writers between events 3591 and 3662 said so:
     `cost-events-test-reads-stale-deploy` and `fm-4-stats-flow-block` mended it before the push,
     `fm-2-open-stays-submits` and `fm-3-issue-flow-method` took the lock a second time for it, and
     `fm-5-page-and-dashboard` a second and a third). A time of your own
     work is read from `date` or an event's `at`. A commit already on `origin/main` keeps its sha
     and may be named. Commit it (a second commit is fine).
     The loop's reviewer is the record's fresh read; `/review-notebook` is not run on it.
   - **With no state file, a change that needs `brain.ts apply` stops here** (`fly-4-loop-files`, 2026-10-13;
     `plan/cloud-brain-worker-machine-on-fly.md`, part 2, "A deploy"). That is a main checkout with no
     `<root>/tools/cloud-brain/.emitted/cb4.json`: the worker machine on Fly.io, which is given no recovery key,
     and `apply` is signed with it. There you emit nothing, take no lock and push nothing. Commit what you have in the worktree, each file by
     name. Comment on the issue with what is built and tested there, the count with its command, and the Worker
     the deploy is of. Add the label: `ia label '{"key":"impl/<id>/laptop","id":"<id>","add":["laptop"],"remove":[]}'`.
     Then report, with no submit and no wait. The driver's next step finds the issue at `in-progress` with no
     writer and makes `back`; the loop there starts nothing on an issue labeled `laptop`, and a writer of the
     laptop's loop takes it from `ready` with your comment. The same when your check needs a token the machine
     does not hold (`loop-library`, `loop-bluesky`, `loop-roles`, `loop-deploys`, `loop-papers`, `loop-dashboard`).
     The commits stay in that machine's worktree and are not on `origin/main`: the comment is what the next
     writer has. No writer had stopped this way when this was written.
   - **Emit** with the same tool, to a file named for the issue in the main checkout, where `apply` reads it:
     `cd $W && bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/<module> --emit <name>_service=<root>/tools/cloud-brain/.emitted/<id>-<worker>.json`.
     It runs the tests again and then writes what `(await module.value("<name>_service")).emit()` gives;
     `emitted` in its line has the file, its `hash` and its size. With a failed test it writes no file (exit 1);
     exit 2 is tests passed and no file written (`notEmitted` says why). The cell is named for the service: `issues_service` for Worker `brain-x-issues`,
     `git_service` for `brain-x-git`. The command that gave your count and the one that emitted may be one.
     A change with no deploy (a doc, a local tool, a test file under `tests/`) emits nothing.
     A changed `test_*` cell of a seed is a deploy of that seed's Worker: emit and apply it.
