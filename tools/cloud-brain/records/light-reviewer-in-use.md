# light-reviewer-in-use

The reviewer of the issue loop is a process of its own with four tools and its brief on the Brain. Built
2026-10-11 by a session outside the loop on the owner's word, then filed as an issue so that it is reviewed
(the owner: "you will need reviews on the work so you can use the lightweight agent to review the tickets and
act as the orchistrator").

## What changed

| Where | What |
|---|---|
| `cloud-brain-dev@e3f1e6b`, `@4f14fc8` | `agent.sh` (the launcher, `--resume`, `TAB=1`), `CLAUDE.md` (three lines), `.claude/settings.json` and `.claude/hooks/brain-read.sh` (a Read under `brain/` fetches `/static/cloud-brain-dev/<path>`), `put.sh` (put, `--delete`, `--get`, the copy before kept), `.gitignore`, README "A light agent for one role" |
| `lopecode-dev@35a6da21` | `SKILL.md` step 4 starts the reviewer with `agent.sh`; `agents/reviewer.md` is a pointer; `agents/overseer.md` and `rules.md` name `put.sh` and the token `loop-roles` |
| this commit | `tests/tools/light-agent.test.ts`, this record |
| cb4, no deploy | the file `cloud-brain-dev/roles/reviewer.md` in the file store, public; six files under `cloud-brain-dev-history/`; the token `loop-roles` |

## What was measured

In `cloud-brain-dev/README.md`, "A light agent for one role", with the commands: the size of a request for five
ways of starting an agent (40,842 for an Agent of lopecode-dev told to answer OK; 25,212 for `agent.sh reviewer`
after its brief, the rules and `philosophy.md`), and one review replayed (69,440 at its end against 100,725,
the same verdict, one of the two findings of event 195 and two that no round had).

## Tests

`bun test ./tests/tools/light-agent.test.ts`: 13 pass, 0 fail (2026-10-11, round 3; 12 at round 2, 9 at the
first submit). `bun test ./tests/tools`: 173 pass, 0 fail, 20 files. The Brain in them is a server of the test process and `claude` a stand-in on PATH.
They cover the hook (a fetch each read, a 404, a Brain that does not answer, a path outside `brain/`, `..`),
the arguments `agent.sh` gives `claude` and the JSON line it prints, and the refusals of `agent.sh` and `put.sh`.

## Not tried, not known

- `put.sh` on cb4: the put, the delete and the kept copy were run with the text of `4f14fc8` but for one line, the
  date of the index, which was changed after those runs (review 1055, finding 1). The index was written by the
  committed text in round 2. Its `--delete` on cb4 was not run again.
- No review made this way was on the tracker when this was submitted. The review of this issue is the first.
- A review that uses the tab. `TAB=1` opened and closed one tab.
- Whether the hook fires for a `claude -p` of another version than 2.1.296.
- The token `loop-roles` reaches every path of the file store; only `put.sh` uses it.
- The rules ask for `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` before `brain.ts`; no hook
  makes this reviewer read it, and the replayed one did not.

## Round 2: the review of event 1055

The first review made by the light reviewer: `changes`, six findings, 91,046 at its end, 444 s, $2.27
(78,915 written to the cache, 1,226,622 read from it, 24,084 out), session `925f727d`. The reviewer
runs of the loop before it have a median of about 109,000 by three counts (round 3 below).

| Finding | What was done |
|---|---|
| 1. The index on cb4 was not written by the committed `put.sh` (a time in milliseconds) | The brief was put again with the committed script; the index reads `2026-10-11 15:01 UTC`. The line of this record that said otherwise is corrected above. |
| 2. A kept copy could not be read back by any written step | `put.sh --history PATH` lists them, `put.sh --restore PATH NAME` makes one the file on disk. Run on cb4: the list gave two names; a restore of the first gave the brief as it was before the move; a name not there exits 1. `SKILL.md` and `agents/overseer.md` say so where they said `git revert`. |
| 3. The brief names a scratchpad the process is not given | `agent.sh` makes a new directory and sends it as a fourth line, `scratch:`; the brief says `<your scratchpad>` is that line. |
| 4. The hook fetched for one spelling of a path | The path is made plain (`os.path.normpath`, a relative one under the root) before it is compared. Five spellings are in the test. A path that leaves `brain/` by `..` is no longer refused: it is a path outside, and is not fetched. |
| 5. No hook makes this process read the knowledge doc, and `rules.md` says one does | The brief now names the doc, says the hook is lopecode-dev's and does not run here, and that the read is the reviewer's to do before `brain.ts`. The sentence of `rules.md` is left: it is true of every other agent, and a change to that file is the owner's. |
| 6. Two puts in one second gave the kept copy one name | The name ends with the first 8 of the copy's SHA-256. Two copies of different text in one second have two names; of the same text, one, which loses nothing. |

Seen by the review and done: `SKILL.md` step 4 falls back to an Agent on exit 1 as well (a result that was an error).
Seen and left: `put.sh --get` removes the local file on any answer but 200, as the hook does.

## Round 3: the review of event 1059

`changes`, three findings, 86,421 at its end, 512 s, $2.43 (73,983 written to the cache, 1,584,136 read from it,
21,454 out), session `a3c42656`. The six of round 1 were all answered.

| Finding | What was done |
|---|---|
| 1. "55 reviewer runs, median 107,955" did not reproduce | The number was this session's count of the journal earlier in the day, with a script that is not in the repository, and the journal has grown since. It is taken out. The reviewer's three counts stand in its place: 79 journal headings that name a reviewer and a count, median 109,954; 73 that begin with "reviewer", median 109,954, lowest 72,754; 72 `cost` comments of role reviewer and not light over the 100 issues `list` answers, median 109,172.5, lowest 72,754 (event 1059). |
| 2. Five spellings still skipped the fetch | The hook resolves the path and the root with `os.path.realpath`, which closes the four that go through a symlink (the root, `brain`, the project directory, `/var` for `/private/var`); each is in the test. `Brain/` in capitals on a disk that does not tell the two apart is not closed, and the hook's comment says so. |
| 3. Nothing removed a scratch directory; the brief still called it shared | `agent.sh` removes it when the run ends (a trap). The brief's step 4 no longer says it is shared, and its header says what `<your scratchpad>` is for a reviewer spawned as an Agent, which has no `scratch:` line. The directories earlier runs left under `$TMPDIR` are not removed by this. |
