<!-- A page of `agents/implementer.md`: an ask of the orchestrating session, and what is stopped before a wait.
Read it when you need something of the session that spawned you, or you started something billed (a Fly machine, a browser or a container of the cluster) and are about to wait.
Cut from the brief 2026-10-13 (`writer-brief-and-tool-output-smaller`), as it stood. "Above" and "below" in it are of the
brief before the cut: the table "The pages" of `agents/implementer.md` has the page of each step and section. -->
## When you need the orchestrating session

Since `asks-orchestrator-label-and-watch` (2026-10-12). Something only the session that spawned you
can give or say while you work: a go-ahead that rests on its other agents, a token it makes. What is
the owner's is step 3 and `needs-owner`, not this. Until that day such a request had no form a tool
read: the writer of `fly-1-by-hand` asked in comment 4816 at 22:21:06 CEST with a billed Fly machine
running, and the answer came at 22:43:04, after the owner asked
(`tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md`).

**First choice: end the run.** Stop what you started that is billed (a Fly machine, a browser or a
container of the cluster), commit in `$W` what stands, comment on the issue with what you need, and
end with a report whose first line is the ask. A report wakes the session, which no comment of yours
does, and it resumes you by message with the answer, as it did that writer at 21:06, in the worktree,
which stays. No label then.

**The label `asks-orchestrator` is for a run that cannot end**: what the answer is for would be lost
with the run. One call makes the two writes, the comment first, since the session's watch prints the
label and the session then reads the comment:

```
$W/tools/cloud-brain/issue-ask.sh <token> <id> <n> <minutes> --nothing-billed <the ask>
$W/tools/cloud-brain/issue-ask.sh <token> <id> <n> <minutes> --runs "<what is billed>" --since <HH:MM> --stop-in <minutes> <the ask>
```

`<minutes>` is how long you wait, 1 to 10. `--runs` names what you started that is billed and still
runs, `--since` the time it was started (read from `date` or an event's `at`, as a time of day of this machine), and `--stop-in` the
minutes from now at which you stop it yourself, answered or not, the wait's at most. The tool
refuses, exit 64 with nothing sent, an ask with no minutes, one with neither `--nothing-billed` nor
`--runs`, and a `--stop-in` past the wait. It writes the two times from the clock in the comment,
under your ask: "Waits until …" and "Billed while it waits: …". Its line of JSON has `until` and
`stop`: stop the thing by `stop`. Exit 1 says which write was not made. Do not write the comment and
the label with `ia`: `issue-as.sh` refuses a body that names a time of the same day ahead of the clock (exit 3), and
the wait's end is one, but in the last 10 minutes of a day (`tests/tools/issue-ask.test.ts` has both).

`tools/cloud-brain/issue-watch.sh` prints a `labelled` event that adds that name, whatever token wrote
it, and the line wakes the session; the comment alone prints nothing (`tests/tools/issue-watch.test.ts`).
It prints a second line, `asks-still`, when the label is still on and the issue has had no event for 5 minutes.
(What it reads is the issue's `updated_at`, which a `cost` event does not move.)
The session answers with a comment keyed `orch/<id>/answer-<n>` and then takes the label off
(`SKILL.md`, step 3, the row of the label). You read for the label gone, once a minute:

```
ia "get?id=<id>" 2>/dev/null | python3 -I -c 'import sys,json; sys.exit(0 if "asks-orchestrator" in json.load(sys.stdin)["issue"]["labels"] else 3)'
```

Exit 0: still on. Exit 3: off, and the answer is the comment of that key in the same read. Any other
exit: the read gave no issue, and says nothing of the label. At the
time the tool gave as `until`, with the label still on, take it off yourself (`"remove":["asks-orchestrator"]`, key
`impl/<id>/asks-<n>-off`) and take the first choice. The 10 minutes are this section's writer's and are
not measured. (The tool, since `wait-says-what-runs-and-until-when`, 2026-10-12: until then the ask was
two calls of `ia`, and the first would have been refused for its time.) Seen on cb4, 2026-10-12 23:12 CEST: a writer's token put the label on its own
issue and took it off (events 5125 and 5126), `list?label=asks-orchestrator` listed the issue between
the two, and the watch's filter printed 5125 and not 5126. First ask made this way: not yet.

## Before a wait

Since `wait-says-what-runs-and-until-when` (2026-10-12). The case: the Fly machine of `fly-1-by-hand`,
`started` and idle for the 22 minutes its writer waited, while no text said what a billed thing does
through a wait (`tools/cloud-brain/post-mortems/pm-agent-request-not-seen-fly-idle.md`, "The root cause", 2).
`rules.md` has the check for the end of a run ("Before finishing"); this is the one for a wait inside it.

Before you wait for anyone (the owner, the orchestrating session, your review, a lock another holds),
stop what you started that is billed by the minute: a Fly machine, a browser or a container of the
cluster. What must run through the wait, because the answer is for it, is said in the request:
what runs, since when, and the time at which you stop it yourself, answered or not.

| The wait | What holds it |
|---|---|
| for the orchestrating session, with the label | `issue-ask.sh` refuses the ask without `--nothing-billed` or `--runs … --since … --stop-in …`, and writes the times ("When you need the orchestrating session") |
| for your review (step 13) | this sentence: `issue-wait.sh` reads the tracker and knows nothing of what you started. Nothing billed runs through it |
| for the owner (`needs-owner`, step 3) | the run ends: `rules.md`, "Before finishing" |
| for a lock another holds (step 10, the take with `--wait`) | this sentence |

A message of the session that tells you to wait names a time (`SKILL.md`, "A message that asks an
agent to wait"). One that names none, or a condition ("when no other agent runs"): ask it for the
time in your report or your ask, and wait 10 minutes at most.

