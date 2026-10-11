# ps-2-summarizer-role: `READS` in `agent.sh`, the brief, `run --dry`, `check` and `restore`

Task 2 of `plan/cloud-brain-paper-summarizer-persona.md`. Written 2026-10-11 by the task's writer, between 21:31 and 21:58 CEST (the first commit of it in the worktree, since
made one with the rest, and `date` at the last edit). A script of `cloud-brain-dev`, a local tool and two test files: no seed, no deploy. Nothing was put to the
knowledge base. One file was put to the Brain's file store, the brief.

`P` below is `<main checkout>/tools/cloud-brain/.emitted/papers`. `claude` is 2.1.296 and its config directory was
`~/.claude-personal` (`CLAUDE_CONFIG_DIR`) in every run here.

## What was built

| Where | What |
|---|---|
| `cloud-brain-dev/agent.sh` | `READS=DIR`, `DRY=1`, and `toolset` and `mode` in the JSON line |
| `cloud-brain-dev/README.md` | one paragraph on `READS` under "A light agent for one role" |
| the Brain, `/static/cloud-brain-dev/roles/paper-summarizer.md` | the brief, read as `brain/roles/paper-summarizer.md` |
| `tools/cloud-brain/summarize-papers.ts` | `run`, `check`, `restore`; its header is the reference |
| `tests/tools/light-agent.test.ts`, `tests/tools/summarize-papers.test.ts` | 3 and 13 new tests |

## `agent.sh READS=DIR`, and what was measured of it

With `READS` set the script gives `claude` `--tools "Read"`, `--add-dir DIR`, `--permission-mode default`, no
`--allowedTools` and no checkout; the prompt has no `checkout:` line and `scratch: DIR`. The same on `--resume`.
`TAB` with `READS` is refused, as is a `READS` that is not a directory. `DRY=1` prints the arguments and starts nothing.

**One flag is not in the plan: `--permission-mode default`.** The plan's design piece 1 says the boundary "is
`claude`'s default" and that "a line of the user's settings that allows Read would open it". Review 1868 observed
that `~/.claude/settings.json` has `defaultMode` `auto`. That directory is not logged in on this machine (a run with
`CLAUDE_CONFIG_DIR=~/.claude` answered "Not logged in", 21:11:59 CEST), so the setting was given on the command line
instead, three starts of `claude` in `cloud-brain-dev/` with the arguments `DRY=1` prints, haiku, 21:12:11 CEST:

```
run  --settings permissions.defaultMode   --permission-mode   init says   <checkout>/tools/cloud-brain/.emitted/canary.txt
f    auto                                 (none)              auto        read: the line is in the answer
g    auto                                 default             default     refused
h    bypassPermissions                    default             default     refused
```

So with the plan's flags alone, a user whose settings say `auto` has a summarizer that reads any file. The flag is
added, and `mode` is in the JSON line so that the tool can refuse an agent that started in another. Not measured: a
`defaultMode` set in a managed (enterprise) settings file, and `permissions.allow` with a `Read(...)` rule in the
user's settings; the canary of each `run` is what would show either.

The tests of R7, on the script as it lands (`cloud-brain-dev@3801492`), haiku, 21:48:47 CEST. The canary is a line
in `<main checkout>/tools/cloud-brain/.emitted/canary.txt`; `in.txt` is a file of `READS` with another line:

```
run  how                         asked to read   its line in the answer   toolset    mode      legs   usd
a3   READS=D agent.sh            canary.txt      no                       ["Read"]   default   1      0.0025
b3   READS=D agent.sh            D/in.txt        yes                      ["Read"]   default   1      0.0024
c3   --resume of b3's session    canary.txt      no                       ["Read"]   default   1      0.0029
d3   --resume of a3's session    D/in.txt        yes                      ["Read"]   default   1      0.0030
```

The same four were run twice before with the same four answers: at 21:11:33 on the script without the flag, and at
21:12:41 on the commit first made (`048836b`). A resumed run answered with the session id of the run it resumed,
each time. `3801492` is that commit put on `77c7dbf`, another writer's change to the same script (issue
`agent-sh-returns-at-first-result`: the JSON line is printed at the end of the stream and has `legs`), which was on
the repository's `main` and not yet in `lopecode-dev`'s pointer when `3801492` was pushed, 21:49 CEST. That issue's
landing, `lopecode-dev@412fc043`, then took the pointer to `3801492` with two tests that expect a JSON line without
`toolset` and `mode`: `CLOUD_BRAIN_DEV=<main checkout>/cloud-brain-dev bun test ./tests/tools/light-agent.test.ts`
was 13 pass, 2 fail on `412fc043` at 21:57 CEST, until this task's commit, which has both fields in those two lines. The dry runs below were made on
`048836b`; the lines that start `claude` and the prompt are the same in both (`git diff 048836b 3801492 -- agent.sh`
changes the header and the Python that prints the line).

The haiku agents of these runs did not read the brief: the transcript of the second of the three sets (session `a3964eff…`) has two Reads, `canary.txt` and
`in.txt`. The three opus agents of the last dry run below read `brain/roles/paper-summarizer.md` and then the paper's file,
one Read each (the transcripts of sessions `ac31e62a…`, `ded15c54…`, `629420d0…`). The transcripts of the six
before were not opened.

## The brief

`cloud-brain-dev/brain/roles/paper-summarizer.md`, put by this task's writer with `put.sh` (the plan, "Who puts the
brief": a new brief is not a change to one). The address answered 404 before the first put, 21:11:22 CEST. It was put
three times; the Brain's copy and the file on disk had the same SHA-256 after each (`curl … | shasum -a 256`):

```
21:11:22   be97ab55…   first
21:23:43   e52316b2…   "about 750 words; write 600 and stop"
21:27:30   1f78e616…   "Write them to 3,600 characters … The program refuses them over 5,000"
```

`put.sh --history roles/paper-summarizer.md` lists the two copies before.

The plan leaves the answer's form open. The brief fixes it, so that the tool can take it apart: one first paragraph,
then six `## ` headings in a set order (`What is claimed`, `How it works`, `How it was evaluated`, `Results`,
`Limits and what was not shown`, `Names`). It has no question the paper might be found by.

## `run`, and the choices the plan left

- **A number** is read by `numbers()` of task 1, on both sides: a run of digits with its `.`, `,` and `%`, less a `,`
  between digits and a `.` or `,` at its end. A number of the summary must be one of the text's numbers, whole:
  `28.2` is refused when the text has only `28.2%`. Not chosen: looking for the digits anywhere in the text, where
  `8` is found in `28.2%`.
- **The text is fetched by each `run`** and never read from a `.txt` that is there (comment 2089). The second-run
  rule and the refused-before rule both compare the hash of the text read, so a `run` asks arXiv for every paper,
  3 s apart, also when it starts no agent. After a failed fetch the `.txt` of an earlier run stays on disk; it is not
  removed, because R3's reviewer reads it, and nothing reads it for a summary.
- **A second summary takes what the entry held from `<id>.entry.json`**, not from what follows the line
  `As entered before the summary:` in the entry, which is an already cut copy (observation of review 1868). `run`
  refuses a paper with no such file anyway. The plan says the other; this loses nothing and has a test.
- **The whole text is given, references and appendices too** (comment 2092 asked for one or the other). Not cut: the
  number rule searches the file the agent read, the line in the entry names that file's hash, and the PDF route has
  no structure to cut by. What it costs is below.
- **`--dry` writes a journal line with `"dry": true`**, and the refused-before rule does not count such a line.
- **Before the canary, `DRY=1 READS=<dir> agent.sh` is asked for its arguments.** A script with no `READS` (the one on
  `main` before this task) would start the canary's agent with Bash; `run` stops with exit 3 before any agent.
- **One line for each agent started on a paper, with one `session`.** A resumed agent keeps its session id (above),
  so a paper refused once has one line and R1's "no `session` twice" holds for it. A paper has as many lines as
  runs that started an agent for it: each of the three ids below has three, all `"dry": true`, with three sessions.
  So will a paper run under `--again`, or one whose text changed. R1's "one `session` for each id" is then true
  of the lines that are not dry and not refused; `check` reads the last put of an id and does not count sessions.
- An agent of a paper whose `toolset` is not `["Read"]` or whose `mode` is not `default` stops the run, exit 3; its
  answer is not judged and not written.
- `check` and `restore` are as the plan has them. `restore --dry` prints what it would put. An entry that has the
  tag `paper-summary` and no line is `restored` and fails `check` unless named in `--except id=issue`.

## The tests

```
cd <worktree> && bun test ./tests/tools/summarize-papers.test.ts ./tests/tools/light-agent.test.ts
 42 pass  0 fail  320 expect() calls        (2026-10-11 21:57:07 CEST, on main at 412fc043, cloud-brain-dev at 3801492)
```

24 in the first file (11 were task 1's) and 18 in the second: 14 before, one of `agent-sh-returns-at-first-result`
(a run of two legs), three of this task. With `SUMMARIZE_PAPERS_TS` naming the
tool as it was on `main` (`f7d03412`), the first file runs no test: `0 pass, 1 fail, 1 error`, the error being the
test's own first use of `HEADINGS`, which that tool does not export. So the new tests were not seen to fail one by one. With `CLOUD_BRAIN_DEV` naming the main
checkout's `cloud-brain-dev`, whose `agent.sh` was `0ba1f45` then (run at 21:29, before `legs` was in the test), the second file was 13 pass, 4 fail: the three new
tests and the one whose JSON line now has `toolset` and `mode`. `bun test ./tests/tools` in the worktree is 313 pass,
1 fail; the one is `issue-lock-sql.test.ts`, which reads a notebook this task did not build there.

No case starts `claude`, calls a Brain or calls arXiv. The agent is a stand-in script that writes down how it was
started (`SUMMARIZER_AGENT`). What the issue lists, by test:

| Asked for | Test |
|---|---|
| the assembly | "assemble: …", and "run --dry: …" compares the file written with `assemble` of the answer |
| the length rule | "judge, the length rule": `1498 - title` passes and one more is refused; the sections at 5000 and 5001 |
| the number rule | "judge, the number rule": `1,000` against `1000` both ways, `1,001`, `28.2` against `28.2%`, a worked-out difference |
| the second-run rule | "run: … a second run starts no agent but the canary's and puts nothing" |
| the canary's stop | "the canary's stop": the line in the answer, a toolset with Bash, a script without `READS` |
| a put with no `.entry.json` | "run skips and names: …" for `run`, "restore: …" for `restore` |
| comment 2089, the under-5000 rule | in "run skips and names": `run` and `text` on a page of 25 characters, with the first run's `.txt` on disk |

Tests of R7's flags are in `light-agent.test.ts` with a stand-in `claude`: they say which arguments are sent, not
what `claude` does with them. That is the four live runs above.

## The three dry runs on cb4

`BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts run --ids arxiv:2603.06333,arxiv:2607.14159,arxiv:2310.01798 --dry`,
from the worktree, model opus. Three of the ten papers of the plan's question sets. The three were run three times,
once for each put of the brief. All lines are in `P/journal.jsonl`, 12 on 2026-10-11 21:30 CEST: 3 of a canary, each
`"canary":"refused"`, and 9 of a paper. Each `run` exited 0.

```
                    arxiv:2310.01798          arxiv:2603.06333          arxiv:2607.14159
text read (chars)   56,111                    61,090                    58,094
first paragraph max 1443                      1401                      1443

brief 1, 21:20      sections 5716 refused     5693 refused              6229 refused
  after --resume    1200 / 4674   $0.865      1176 / 4541   $0.825      1217 / 4897   $0.840
brief 2, 21:23:44   sections 5593 refused     5477 refused              6773 refused
  after --resume    1071 / 4903   $0.853      1235 / 4808   $0.836      1230 / 4212   $0.904
brief 3, 21:27:31   1134 / 4346   $0.353      1046 / 4256   $0.363      sections 5034 refused
  after --resume                                                        1133 / 4390   $0.851
```

`1200 / 4674` is the length of the first paragraph and of the sections, as accepted. `usd` is `agent.sh`'s, summed
over the rounds of a paper. Every summary as assembled is 16,000 characters. The three as last written are
`P/<id>.summary.txt`.

**Numbers refused: none, in 9 papers' worth of answers.** Not because the rule had nothing to read: the three last
summaries have 62, 65 and 49 distinct numbers, each one of the text's (counted with `numbers()` over the file's part
before the line `Summary by paper-summarizer`). The only refusal met was the sections' length, 7 times of 9 first
answers. No first paragraph was over its limit; the longest was 1235 of 1401.

**Telling the agent the limit did not keep it under the limit.** Given 5,000, six first answers ran to 5,477 to
6,773. Told as well to "write 600 words and stop", the same (brief 2: 3 of 3 refused). Given 3,600 to write to, with
5,000 named as what is refused, two of three passed at once (4346, 4256) and the third was 5034. The tool's limit is
the plan's 5,000 in all three.

**What a paper costs at the full text**: $0.35 or $0.36 when the first answer is accepted (32 s and 33 s, a last
request of 38,766 and 40,229 tokens, 3 turns), and $0.83 to $0.90 when it is refused once (53 s to 73 s). By these figures the
second round costs more than the first; no one paper was run both ways under one brief. At brief 3's rate for these three, $1.57, 63 papers are $33; at $0.85 each they are
$54, over the $50 at which the plan stops task 3. Three papers of about 58,000 characters; the median HTML text is
81,907 (comment 2092) and the longest PDF text 248,661 (the plan's figure, not run here), so both figures are low for the set. Whether a text of that
length is returned by one Read was not seen: each of these three was (the tool result has every line of the file).

All the dry runs and the canaries together: $6.70 (the sum of `usd` in the journal), and $0.03 for the R7 runs.

Also run on cb4, reads only, 21:20:18 CEST: `check --tag awesome-rsi` named 63 entries, 0 summarized, exit 1;
`restore --tag awesome-rsi --dry` answered `{"restore":63,"put":0,"same":63,"refused":[]}`, each kept file's text
being its hash and the entry's text.

## Not tried

- A put to the knowledge base with `loop-papers`: `run` without `--dry` and `restore` without `--dry` were run
  against the fake Brain of the tests only. That the service answers `vectors: 1`, keeps `changed.method` and joins
  the tag is read from `brain-knowledge.ojs`, not seen.
- `check` on a summarized entry of cb4: there is none. Its semantic search was sent in the tests only.
- The kept PDF as the text of a `run`: the three were arXiv HTML. `pdftotext` still reads bytes from outside with
  the writer's rights (review 1868), after the file's SHA-256 is compared with the entry's.
- A paper refused twice on cb4, and `--again`.
- What `claude` puts in an agent's context without a Read (review 1868). The summarizer is started in
  `cloud-brain-dev/` and reads that directory; the plan lists what is there.
- A paper whose text tells its reader to do something. The brief has the rule; no such text was given to an agent.
- Whether a summary says what the paper says, beyond its numbers. Nobody read the nine against the papers.
- The doc line of R6 and `SKILL.md`'s cost row: task 4's.
