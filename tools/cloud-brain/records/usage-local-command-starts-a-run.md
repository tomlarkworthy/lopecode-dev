# usage-local-command-starts-a-run

2026-10-11. `tools/cloud-brain/agent-usage.ts` numbered runs by a rule that said what a prompt is
not. Three fixes in one evening (`cost-comment-has-billed-usage` round 3, `i1519`, `i1559`) each
met a kind of row the rule had not named. This change names every kind of `user` row found in the
transcripts on this machine and lists the four that start a run. A local tool and its test file;
no seed, no build, no deploy. It is the first of two commits to the tool; the second is
`usage-run-before-first-prompt`.

Below, `main`'s tool is `git show c5d4617f:tools/cloud-brain/agent-usage.ts` written to a file, and
"this commit's" is the tool as this change's commit has it, written to a file the same way. The scripts named are attached to the issue and take the
two files as arguments. They read every `*.jsonl` under `~/.claude*/projects`, which grows while
sessions run: 2059 files at 20:17 CEST, 2087 at 20:50.

## What was wrong

The issue's file, `~/.claude/projects/-Users-tom-larkworthy-dev-taktile/3b5ff1f6-6ad5-4e4f-ae36-896cc0bb6867.jsonl`
(2688 rows, last written 2026-10-11 08:10:33), `agent-usage.ts FILE --run N`, the exit read before
any pipe:

```
run   main's tool                 this commit's
10    requests 19, exit 0         requests 19, exit 0
11    "no request in", exit 1     requests 100, exit 0
12    "no request in", exit 1     requests 2, exit 0
13    requests 100, exit 0        requests 1, exit 0
20    requests 3, exit 0          requests 3, exit 0
21    requests 1, exit 0          "no run 21", exit 1
22    requests 3, exit 0          "no run 22", exit 1
```

Old runs 11 and 12 are rows 1064 and 1065, `<command-name>/exit</command-name>` and
`<local-command-stdout>Catch you later!`. The file has 20 runs where it had 22.

## What the rows are

`survey.ts` and `follow.ts` (2059 files, 20:17 and 20:18 CEST) count `user` rows that are no tool
result. `followed` is the count of rows after which an assistant row with `usage` comes before any
other such `user` row.

Rows with no `origin` that are not `isMeta`, by how the text begins:

```
main  <command-name>          60   followed 0    /model 23, /compact 14, /mcp 7, /login 5, /clear 3, /resume 2, six others 1 each
main  <local-command-stdout>  56   followed 0
main  <bash-input>            14   followed 0    the next row is <bash-stdout> in all 14
main  <bash-stdout>           14   followed 13
main  <command-message>       11   followed 0    the next row is isMeta text in all 11, then an assistant row in 10 (/restart 10, /loop 1)
main  [Request interrupted   150   followed 6
main  other text             421   followed 407
sub   [Request interrupted    28   followed 0    22 are the last row of the file
sub   other text            1309   followed 1302
```

- `<command-name>` and `<local-command-stdout>` are followed by no request. The 60 name twelve
  commands: those above and `/advisor`, `/exit`, `/feedback`, `/plugin`, `/reload-plugins`,
  `/usage-credits`. After 42 of the 60 the next three rows are the stdout row, a typed row and an
  assistant row: the turn is opened by the typed row.
- `<bash-input>`, `<bash-stdout>`: 13 of 14 pairs are followed by an assistant row with `usage`. One
  read by eye, `…taktile/b37f546c-9f54-47e0-ac6f-311860f5d246.jsonl` rows 1068 to 1071:
  `<bash-input>open triage/…</bash-input>`, `<bash-stdout>(Bash completed with no output)…`, then
  message `msg_011CearWN54DYYuxjppAbTiz` (output 165). So the pair was two runs, the first empty.
- `<command-message>` with no `origin` opens a turn through the `isMeta` row after it, as the 26 with
  `origin.kind` `human` do (all 26: an `isMeta` row, then an assistant row). It was a prompt and stays one.
- `[Request interrupted by user]` (109 main, 18 sub) and `…for tool use]` (41 main, 10 sub) were
  prompts by the old rule. The issue does not name this kind; it is larger than the five it names.

`isMeta` rows with no `origin` (`back.ts`, 20:21 CEST) were no prompt and are none. Among them, by
the row before: a Skill's text or an image's note after a tool result, the skill's text after a
`<command-message>`, the caveat before a local command (61), rows such as "Continue from where you
left off.", and 19 that carry `scheduledTaskId` and follow an assistant row.

The 130 `coordinator` rows all begin "The coordinator sent a message while you were working:"; 112
follow an assistant row with `stop_reason` `end_turn`, 7 `stop_sequence`, 6 `null`, 5 a `user` row
(a script not kept, between 20:27 and 20:32 CEST).

## What changed

`agent-usage.ts`: `kindOf(row)` gives each `user` row one name, by the first line that fits of the
table in the head comment; `STARTS` is the set of names that are prompts. `usageOf` asks
`STARTS.has(kindOf(row))` and nothing else of a row. The table, with the rows of each kind as the
tool itself counts them (`runs.ts`, 2087 files, 20:50 CEST):

```
kind               main    sub    starts a run
tool-result       50528  55677    no
compact-summary     282     49    no
tool-written        261    108    no
coordinator           0    130    yes
human-mid-turn        0      7    no
human              3265      0    yes
channel            7048      0    no
peer                 41     13    no
task-notification  2755    251    no
origin-other          0      0    no
meta                247    104    no
interrupted         150     28    no    was a prompt
shell-command        14      0    yes
local-command       130      0    no    was a prompt
plain               450   1319    yes
```

The same script asks each row both tools: 150 + 130 rows of main sessions and 28 of subagents were
prompts and are none; no row that was none is a prompt.

Decisions, each with the side not taken:

- **A prompt is what a person or the coordinator sent.** `channel` (3019 of 7047 followed by a
  request), `peer` (40 of 41) and a main session's `task-notification` (2662 of 2721) open turns
  with nobody typing, and their requests stay in the run before them. The other side, a run for
  each, would number a main session by its notifications: the issue's measure is what "a person
  would count", and a subagent's notification already starts none (review 1499). It is also the
  side that changes no number today (`philosophy.md`, line 2). A scheduled task's prompt
  (`scheduledTaskId`, 19 rows) is `meta` by the same reading.
- **The flags that say who wrote a row are read before its origin.** A `human` or `coordinator` row
  with `isCompactSummary` or `sourceToolUseID` starts no run. `survey.ts` found none in 2059 files
  (review 1627 noted it); the test has a made-up row of each.
- **`<bash-input>` is the prompt of a `!` command and `<bash-stdout>` is not.** The person's act is the
  input row. One of the 14 has no request (a typed row follows the output), so one such run is empty.
- **An interruption starts no run.** The 6 of 150 followed by a request stay in the run that was interrupted.
- **An unknown `origin.kind` starts no run** (`origin-other`). The list is of kinds that start one, so a
  kind a later Claude Code writes is none until it is read and added.

`tests/tools/agent-usage.test.ts`, two tests added:

- "a local command and an interruption start no run; a `!` command and a slash command start one
  each": written first, against the unchanged tool. `bun test ./tests/tools/agent-usage.test.ts`
  then gave 10 pass, 1 fail, the requests of runs 1 to 5 `[0, 0, 1, 0, 0]` where `[1, 1, 1, 1, 2]` was expected.
- "every kind of row has one name, and four kinds start a run": 37 rows, at least one for each line
  of the table, and that `STARTS` is those four.

## Counts

- `bun test ./tests/tools/agent-usage.test.ts` at this commit: 12 pass, 0 fail (the two files of that commit in a
  directory of their own, 20:56 CEST).
  `bun test ./tests/tools` was run at the commit after it, which adds one test, and before the
  worktree was brought up to `main`: 284 pass, 0 fail, 33 files, ended 20:55:16 CEST, and after it 303 pass, 0 fail,
  34 files, ended 20:58:28 CEST; each after
  `bun tools/cloud-brain/build.ts --out tools/cloud-brain/.emitted/cloud-brain.html`.
- Every transcript (`runs.ts`, 635 main files, 1452 subagent files, 20:50 CEST), runs counted with
  each tool's `usageOf(t, n)` for n from 1 until it answers `null`:

  ```
                         main: runs, empty runs    subagents: runs, empty runs
  main's tool            4009, 391                 1477, 34
  this commit's          3729, 127                 1449, 7
  ```

  4009 − 150 − 130 = 3729 and 1477 − 28 = 1449. The runs changed in 84 main files and 27 subagent
  files. The whole-file answer differs in 0 files. `--last-run` differs in 4 main files and 21
  subagent files; in 24 of the 25 the old answer had 0 requests, and in none the new one has. The
  one other was not read.
- The 134 runs still empty, by what ends them (`empties.ts`, 20:54 CEST): a typed row and then the
  next typed row with no request between, 109; a plain row then a typed row, 13; a `!` command then a
  typed row, 1; the end of the file, 4 main and 2 subagent; a subagent's plain row then another, 5.
  Why nothing answered them was not read.
- The loop's own calls (`loopcalls.sh`, 20:46 and 20:54 CEST). Each line is a call with `main`'s tool
  and with this commit's, the two outputs and exits compared whole; all 18 are the same:

  ```
  same  exit 0  --session f501a8e8-… --agent a0ebdc159c88c6e54               requests 25   comment 1605, i1559, implementer
  same  exit 0  --session f501a8e8-… --agent a0ebdc159c88c6e54 --last-run    requests 25
  same  exit 0  --session f501a8e8-… --agent a505a4a029fcf53e8               requests 22   comment 1541, i1519, implementer
  same  exit 0  --session 9d055ab8-eb46-4b76-8fd5-e651ee6c139d               requests 10   comment 1635, i1559, light reviewer
  same  exit 0  --session 7eefa67f-c9ca-4419-8f80-69b4d057a9f3               requests 11   comment 1562, i1519, light reviewer
  same  exit 0  --session f501a8e8-… --agent a67e626adca16dcb9               requests 34   the overseer's line, round 9
  same  exit 0  --session f501a8e8-… --agent a873aa03b7542ae7b               requests 59   record-first-resumed-rework-round
  same  exit 0  … a873aa03b7542ae7b --last-run                               requests 8
  same          … a873aa03b7542ae7b --run 1, 2, 3, 4, 5                      28, 9, 14, 8, "no run 5" exit 1
  same  exit 0  … a3afc3a5353ed94fc --last-run                               requests 27   fb-a2vp4smwzq
  same          … a3afc3a5353ed94fc --run 1, 2, 3, 4                         55, 18, 27, "no run 4" exit 1
  ```

  The requests are those in the four comments' `usage` and in the table by run of
  `records/cost-comment-has-billed-usage.md`.

## Prior art

Three searches of `knowledge.search` (`semantic=true`): "transcript user row kinds local command
prompt run", "Claude Code jsonl command-name local-command-stdout bash-input", "table of row kinds
which start a run billed usage". Nothing bore on it: the answers were notebook modules
(`robocoop-4-bash-terminal`, `claude-code-browser`, `ledger`) and the pairing docs. None names the
rows of a transcript.

## Not done, not tried

- **Requests before the first prompt are in no run.** A fork's transcript and that of a skill run as
  a subagent have no prompt row for their first round, so with this commit, as before it, `--run 1`
  of one is "no run 1" or the coordinator's later message. Changed in the commit after this one,
  under an issue of its own: `usage-run-before-first-prompt`, `records/usage-run-before-first-prompt.md`.
- No call was made in a live session to see a row written: every statement above about a kind is a
  count over transcripts of Claude Code 2.1.246 to 2.1.296 on this machine. A kind another version
  writes is `plain` when it has no `origin` and is not `isMeta`, and so starts a run.
- `<local-command-stderr>` and a row that begins `<bash-stderr>` are `local-command` by the pattern
  and in the test. Neither was found as the beginning of a row.
- A prompt whose own text begins `<command-name>`, `<bash-stdout>` or `[Request interrupted`, in a row
  with no `origin`, starts no run. A subagent's prompt that began so would be taken wrongly; none
  was looked for. `isSidechain` (true on every subagent row, false on every main one, 57288 and
  64748 rows at 20:18 CEST) would tell them apart and is not used.
- The one `--last-run` that changed from a non-empty answer, the 5 subagent prompts followed by
  another plain row with no request between, and the 109 typed rows nothing answered were counted
  and not read.
- `SKILL.md` and the briefs were not changed. `SKILL.md` line 141 calls the tool for a subagent or
  a light reviewer, and the 18 calls above answer as before.
