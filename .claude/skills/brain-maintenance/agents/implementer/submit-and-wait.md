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
      the count of the whole suite is from a run made after your last edit. Writing that count in the record
      is no such edit: the suite is not run again for it, and the record is not committed once more for a
      count alone (`suite-count-in-the-record-loops`, 2026-10-13: of three writers that day one ran the suite
      three times, and two made a commit of the record alone, for it). A test of yours that reads the
      record is run after the count is written, that file alone: `land.sh --test` runs it on the tree pushed.
    - No sentence says more than you saw: "every", "always", "no other", and anything of a run you did not make.
    - A number that is not from this change has where it is from beside it.
    - The test you added fails without the fix, and you ran it without the fix to see.
    - You tried the inputs the reviewer will: the empty value, the wrong type, the call sent twice, the value
      next to the one that works (`0` where `1` is the switch), and the caller that should be refused.
    - A comment or a header you added reads in order where it stands.
    - Each ref of the submit is a commit that is pushed.
    - What you changed is spoken of elsewhere. For each command, method, flag or step whose
      behaviour you changed, `git grep -n -F -e '<name>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'`,
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
    request every 4 minutes keeps it. Since `tr-3-briefs-and-queue` (2026-10-13;
    `plan/cloud-brain-tracker-trigger-rules.md`, part 3) the wait is an event of the record: the tool writes
    it on your issue (`issue.wait`), and while it is live the queue's entry of the issue has `waiter`, by which
    the orchestrator knows that the round is yours and sends you none. With the submit of step 12 answered
    (`seq` of its answer is the submit's; `land.sh` prints it). First stop what you started that is billed
    ("Before a wait", below): this wait is up to 20 minutes, and the tool takes no word of what runs.
    ```
    $W/tools/cloud-brain/issue-wait.sh <token> <id> <seq of your submit> --left in-review
    ```
    in the foreground, with the Bash `timeout` at 280000, by its absolute path (from a worktree it
    reads the main checkout's tokens, as `issue-as.sh` beside it does). The first run writes the wait, key
    `impl/<id>/wait-<seq>`, `when` `issue.state != "in-review"`, for 25 minutes; then it reads
    `wakes?id=<id>&seconds=25`, a call the tracker holds until the wait is due, 25 s at most (since `tr-4-held-read`,
    2026-10-13; every 15 s until then). A later run with the same `<seq>` writes nothing and reads the same wait, so
    the seq and the state are the same in every run of one wait. Run it only after your submit: on an issue
    you are at work on, `--left in-review` is due at once and reads as a round sent back.
    - **Exit 3**, nothing printed: the issue is still at `in-review` after 240 s. Run the same line again, up
      to 5 runs in all (20 minutes), the fifth with `--last` after `in-review`: at its exit 3 the tool takes
      the wait off, so the queue no longer says you listen. Then report as step 12 left it: the orchestrator
      sends the round or judges, as before. A review that is recorded while the issue stays at `in-review`
      (the reviewer's move did not come) is not an exit 0: the runs end as these do, and the queue lists the
      issue as a `look`.
    - **Exit 0**: the issue has left `in-review`. The first line is the due entry of `issue.wakes`, with
      `issue.state`. The second is the last `reviewed` event of the issue after your submit, whole, with its
      `verdict` and `body`: the review the round is taken from. `null`: the issue was moved with no review;
      read `ia "get?id=<id>" --short` once and report what you read.
    - `"verdict":"pass"`: the tool has taken the wait off. Report.
    - `"verdict":"changes"`, and stderr says `<id> is at in-progress: a round was sent back, and the wait
      stands as it is`, with two commands. The wait still says you listen, so the next call is one of the two:
      - The issue has 3 `rework` moves or more (count them in `ia "get?id=<id>" --short`): the judgment at 3
        is the orchestrator's (`SKILL.md`, step 3). `$W/tools/cloud-brain/issue-wait.sh <token> <id> <seq of your submit> --remove`,
        and report. You take no round.
      - Otherwise the round is yours. `$W/tools/cloud-brain/issue-wait.sh <token> <id> <seq of your submit> --work`
        before anything else: it writes the wait of a round, 60 minutes, in the place of the first, and the
        queue goes on saying the round has its agent. Then follow "A resumed round" below from its first
        item; the review it speaks of is the second line, and no message comes. Then the comment and the
        submit of step 12 with the round's number, and this step once more from the new submit's `seq`, with
        `--no-round`: `… <seq of the round's submit> --left in-review --no-round`. That is the one round you
        take: with `--no-round` the tool takes the wait off at whatever the issue moves to, so after a second
        `changes` the round is in the queue with no `waiter` before you have read the verdict. Report.
    - `"verdict":"changes"` and no such line on stderr, or any other verdict or state: the tool has taken the
      wait off. Read `ia "get?id=<id>" --short` once and report what you read.
    - **Exit 5**, nothing printed: your wait is not live. It is past its 25 minutes, was taken off, or another
      wait of your token on the issue took its place. Report.
    - **Exit 2**: the tool keeps no token of your name, or a call was refused (401, 403): your
      token was ended. Write nothing with another, and report.
    - **Exit 64**: the arguments, or a wait the tracker refused, with its message on stderr. The line with no
      flag (`… <seq of your submit>` and nothing after it) is this exit since `tr-3-briefs-and-queue`, and
      stderr has the line to run.
    A round that came to you as a message does not wait: submit and report. Neither does a quick
    win: its review is the orchestrator's to hand out and to read. In your report say how many runs
    of the tool you made, what each exited with, and which rounds this run made. The orchestrator
    learns of your submit from its watch, which prints the queue's new entry for it, `QUEUE review <id>`, not from your report.
    Until `tr-3-briefs-and-queue` the tool read `sync?after=` and wrote nothing, its exit 0 was the review
    and, when it came within 30 s, the reviewer's move, and the orchestrator inferred a waiting writer from
    which of its agents had not reported. Seen of that form: one run of 240 s in the foreground of a writer
    that was an agent of the orchestrating session ended with exit 3 and was not stopped (2026-10-11,
    23:40:35 to 23:44:35 CEST). First round a writer took with the form above: not yet, when this
    was written (`tools/cloud-brain/records/tr-3-briefs-and-queue.md`).

