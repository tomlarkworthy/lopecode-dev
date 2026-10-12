<!-- A page of `agents/implementer.md`: steps 11 to 13: the check on cb4, the read as the reviewer will, the comment and the submit by hand, the wait for the review.
Read it when the change is checked on cb4, the comment and the submit are written by hand, or `issue-wait.sh` answers something the brief has no line for.
Cut from the brief 2026-10-13 (`writer-brief-and-tool-output-smaller`), as it stood. "Above" and "below" in it are of the
brief before the cut: the table "The pages" of `agents/implementer.md` has the page of each step and section. -->
11. **Check it where it runs**, after the lock is gone, when that needs no owner act: one call
    that shows the new behaviour on cb4. When it needs one (`issue.rebuild`, `issue.install`, a move the workflow
    keeps for the owner, anything the Never list of the rules names), send no call, with any
    token: a refusal is still a forbidden call. Write "not run on cb4: needs the owner present"
    in the comment, with the call the owner would make.
    **Before the submit, read your change as the reviewer will.** What reviews sent changes back for, by
    how often (the tracker on 2026-10-11: 68 `changes` reviews, 144 findings, about half of them on a record,
    a README or wording; the owner that day: "reduce review rounds"). Each is a minute now and a round later:
    - The record exists, `tools/cloud-brain/records/<id>.md`, and has what changed, the test count and what was not tried.
    - Every count in the submit's reason, the comment and the record is one a command of yours printed, and
      the count of the whole suite is from a run made after your last edit.
    - No sentence says more than you saw: "every", "always", "no other", and anything of a run you did not make.
    - A number that is not from this change has where it is from beside it.
    - The test you added fails without the fix, and you ran it without the fix to see.
    - You tried the inputs the reviewer will: the empty value, the wrong type, the call sent twice, the value
      next to the one that works (`0` where `1` is the switch), and the caller that should be refused.
    - A comment or a header you added reads in order where it stands.
    - Each ref of the submit is a commit that is pushed.
    - What you changed is spoken of elsewhere. For each command, method, flag or step whose
      behaviour you changed, `git grep -n -F '<name>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
      and read the lines in files you did not touch. One your change made untrue is mended in this
      landing. In the spec of your task, when the sentence is a choice the owner approved, it stays
      and gains "(As built, `<id>`, <date>: …; the record.)". In a file that is not yours (the
      reviewer's brief on the Brain, a seed whose Worker you do not deploy, `rules.md`,
      `philosophy.md`), the line and its mend go in your comment under "For the overseer". Say in the
      comment what you searched for and how many lines it printed.
    Then, when your run has the tool, your one call of the advisor ("The advisor: one call, before the submit", above).
    Since that day a reviewer holds a change only for what it does, its tests and what is claimed of it, and
    mends a small thing in a document itself (its brief, "What holds a change, and what is a note").
12. **Say it on the issue, then submit.** A landing made with `land.sh` (step 10) has written both, from the two
    files you gave it; what follows is their content, and the two calls for a landing made by hand.
    `ia comment '{"key":"impl/<id>/comment-<round>","id":"<id>","body":"…"}'` (the field is `body`; `text` is refused 400) with the fix, the test count and what was not tried, then
    `ia move '{"key":"impl/<id>/submit-<round>","id":"<id>","to":"in-review","reason":"…","refs":[{"kind":"commit","value":"lopecode-dev@<sha of the seed commit>"},{"kind":"deploy","value":"<worker>@<hash>"}]}'`.
    A key used before answers 200 with `duplicate: true` and moves nothing: read the issue
    again and see `in-review`. A submit with no refs is refused. One `commit` ref for each commit the landing added to `lopecode-dev`. No `lopebooks` ref: the notebook of a change is the build of its `lopecode-dev` commit, and a `lopebooks` commit, on the day's first landing, is a backup (step 10). A change with no deploy (a doc, a local tool with its test file) has the commits only.
13. **Wait for your review, and take the next round yourself.** On trial since `os-4-writer-waits`
    (2026-10-11; `plan/cloud-brain-loop-order-of-service.md`, part 5): your context is in the prompt
    cache for 5 minutes after your last request, and all 16 rounds sent to a writer by message before that
    day came later than that and wrote the whole context again, 111,329 to 203,811 tokens each. A
    request every 4 minutes keeps it. With the submit of step 12 answered (`seq` of its answer is
    the submit's). First stop what you started that is billed ("Before a wait", below): this wait is up
    to 20 minutes, and the tool takes no word of what runs.
    ```
    $W/tools/cloud-brain/issue-wait.sh <token> <id> <seq of your submit>
    ```
    in the foreground, with the Bash `timeout` at 280000, by its absolute path (from a worktree it
    reads the main checkout's tokens, as `issue-as.sh` beside it does). It reads `sync?after=` every 15 s and writes nothing.
    - **Exit 3**, nothing printed: no review in 240 s. Run the same command again, up to 5 runs in
      all (20 minutes). After the fifth, report as step 12 left it: the orchestrator sends the round or judges, as before.
    - **Exit 0**: the first line is the `reviewed` event, with its `verdict` and `body`. The second
      line, when there is one, is the reviewer's move after it, which the tool waits 30 s for.
    - `"verdict":"pass"`: report.
    - `"verdict":"changes"` and a second line with `"to":"in-progress"`: the round is yours. Follow
      "A resumed round" below from its first item; the review it speaks of is the first line, and no
      message comes. Then the comment and the submit of step 12 with the round's number, and this
      step once more from the new submit's `seq`. That is the one round you take: after a second
      `changes`, report. Report also, and take no round, when the issue then has 3 `rework` moves or
      more: the judgment at 3 is the orchestrator's (`SKILL.md`, step 3).
    - `"verdict":"changes"` and one line: the review is recorded and the reviewer's `rework` move was
      not read. Start nothing on the verdict alone: the round's number is the count of `rework` moves
      plus one, so before that move your keys are the first round's, and a write with one answers
      `duplicate: true` and writes nothing. Read `ia "get?id=<id>"` once; so too when the second line
      is a move to any other state. `in-progress`: as the item
      above. Still `in-review`: report that, with the review's seq; the orchestrator's table has the
      row for it. Any other state: report what you read. (To event 2851 each of the 54 `changes` reviews of the record had its `rework`
      within 9.7 s, 0.5 s at the median; `tools/cloud-brain/records/os-4-writer-waits.md`.)
    - **Exit 2**: the tool keeps no token of your name, or the read was refused (401, 403): your
      token was ended. Write nothing with another, and report.
    A round that came to you as a message does not wait: submit and report. Neither does a quick
    win: its review is the orchestrator's to hand out and to read. In your report say how many runs
    of the tool you made, what each exited with, and which rounds this run made. The orchestrator
    learns of your submit from its watch, which prints the queue's new entry for it, `QUEUE review <id>`, not from your report.
    First run by a writer, of its own review: not yet, when this was written. Two things of it were
    seen: one run of 240 s in the foreground of a writer that was an agent of the orchestrating
    session ended with exit 3 and was not stopped (2026-10-11, 23:40:35 to 23:44:35 CEST), and five
    runs one after another were not tried.

