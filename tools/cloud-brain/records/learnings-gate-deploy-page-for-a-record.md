# learnings-gate-deploy-page-for-a-record: a record's write no longer asks for the page on changing and deploying

2026-10-13, writer `impl-2b3d41`, in the worktree `bm-learnings-gate-deploy-page-for-a-record`. One trigger of
a knowledge page, four lines of another, and a test. No seed, no deploy.

## What was wrong

`scripts/learnings-gate.sh` refuses a tool call that matches a `triggers:` regex of a `knowledge/*.md` the
session has not read. The first trigger of `knowledge/changing-and-deploying-a-cloud-brain-worker.md` was

```
^(Edit|Write|MultiEdit) .*tools/cloud-brain/
```

so the write of `tools/cloud-brain/records/<id>.md`, which every writer of the issue loop makes, asked for that
page: 21,109 bytes by the issue's `wc -c`, 21,131 after this change (`wc -c`, 2026-10-13 19:55 CEST). The
writer's brief says a change with no deploy "is meant to be written from this file alone".

The hook's fire log on this machine, `~/.claude/learnings-fires.tsv`, read 2026-10-13 19:46 CEST (`date`). Rows
whose learning is that page, whose decision is `block` and whose tool is not Bash, the target taken from
column 8:

```
edit blocks                      14
of them tools/cloud-brain/records/ 11
the new trigger matches           3   notebook-backup.sh, brain-info-size.ts, fly/token-file.ts
the new trigger matches a record  0
```

The triage counted 10 records and 9 Bash rows at 19:40; these are 11 and 10. The log is appended to by every
session, and I did not look for which row is new. The commands:

```
awk -F'\t' '$5=="knowledge/changing-and-deploying-a-cloud-brain-worker.md" && $3=="block" && $4!="Bash" {print $8}' ~/.claude/learnings-fires.tsv > edits.txt
wc -l < edits.txt;  grep -c 'tools/cloud-brain/records/' edits.txt
/usr/bin/grep -cE -- '^(Edit|Write|MultiEdit) .*tools/cloud-brain/.*\.(ojs|ts|js|sh|py)$' edits.txt
```

## What changed

- `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, the first trigger:
  `^(Edit|Write|MultiEdit) .*tools/cloud-brain/.*\.(ojs|ts|js|sh|py)$`. A write of a seed or a tool under
  `tools/cloud-brain/`, at any depth. The other four triggers of the page, its Bash commands, are as they were.
- `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`: its first trigger is as it was, every write
  under `tools/cloud-brain/` (`rules.md`, "Always", asks for that page before the first edit there). After
  the line "The hook that asks for this file asks for the page too", four lines say which writes ask for
  which page. The file is 18,277 bytes (`wc -c`), 17,972 by the triage's count before.
- `tests/tools/learnings-gate-deploy-page-for-a-record.test.ts`, five tests. Each case is a run of
  `scripts/learnings-gate.sh` with the JSON Claude Code gives a PreToolUse hook on stdin, a session that has
  read nothing (its own `TMPDIR` and `CLAUDE_CODE_SESSION_ID`) and a fire log in that directory. The pages
  asked for are read from the `  - knowledge/…` lines of stderr.

So a record's write is still refused once in a session that has read neither page, for the hub page alone.

### Why a list of endings, and not "everything but `records/`"

The hook gives a trigger to `grep -E`, which has no negative lookahead (the triage's note). Three shapes were
weighed:

| Shape | What it leaves out | Cost |
|---|---|---|
| The endings of a seed or a tool: `.ojs`, `.ts`, `.js`, `.sh`, `.py` (taken) | every `.md`, and files with no such ending | a tool written in a new language is not asked for the page until its ending is added |
| A file directly in `tools/cloud-brain/`: `tools/cloud-brain/[^/]+$` | `records/`, `post-mortems/`, and also `fly/`, `digests/`, `knowledge-eval/` | `fly/token-file.ts` and `digests/build.ts` are tools and would not ask; `spec-as-built.md` would |
| "Does not end `.md`", as `([^d]\|[^m]d\|[^.]md)$` | every `.md` | reads as a puzzle where it stands, and a data file asks for a page that says nothing of it |

What the taken shape leaves out, counted over every write the fire log has for the page, blocked or allowed
(distinct values of column 8, 275 of them; 53 match the new trigger, 222 do not):

```
211 records/*.md        3 post-mortems/*.md      1 *.md (top level)
  2 .emitted/ (.md, .txt)
  5 fly/: Dockerfile (2), fly.toml, machine.json, ssh_config
```

The five files of `fly/` are the one group that is not prose. `grep -n -i fly` of the page prints no line, so
the page has nothing for the writer of one. The tracked files under `tools/cloud-brain/` outside `records/`,
by ending (`git ls-files tools/cloud-brain | grep -v '/records/'`, the part of the name after its last dot,
counted with `sort | uniq -c`): 38 `.ojs`, 36 `.ts`, 12 `.sh`, 10 `.js` and 1 `.py`, which the trigger names;
17 `.md`, 7 `.json`, 2 `.gitignore`, 1 `.b64`, 1 `.toml`, `Dockerfile` and `ssh_config`, which it does not.

## Tests

- Before the trigger was changed: `bun test --timeout=30000 ./tests/tools/learnings-gate-deploy-page-for-a-record.test.ts`,
  3 pass, 2 fail. The two that failed are the record and the other `.md` files:
  `Expected to not contain: "knowledge/changing-and-deploying-a-cloud-brain-worker.md"`, received both pages.
  The test then had 35 expects and took 24.5 s; I cut the tool names tried on each path (all three on one
  path of a kind, `Write` on the rest), since a run of the hook is about 0.75 s.
- After: the same command, 5 pass, 0 fail, 26 expects, 15.9 s.
- `bash scripts/check-learnings-triggers.sh`: "checked 40 trigger/when-cwd/when-model regexes and 53 scope
  declaration(s) in knowledge/: 0 error(s)", exit 0, before the change and after. The fifth test runs it.
- `scripts/replay-learnings-triggers.sh --trigger <ERE> --days 4`, over the transcripts of the main checkout's
  project directory (`CLAUDE_CONFIG_DIR=~/.claude-personal`, `CLAUDE_PROJECT_DIR` the main checkout), the old
  trigger and then the new over one extraction (`--fields-from`): 5104 calls extracted, 4949 evaluated; the old
  fires on 13, the new on 5. The 5 are `deploy-sync.ts`, `brain-git.ojs`, `brain-feedback.ojs`,
  `knowledge-eval/knowledge-eval.ts` and `brain-knowledge.ojs`. The 8 it no longer fires on are five writes of
  a record and `knowledge-reranking.md`, `research-talorys.md` and `research-memento-3.md`. A writer of the
  loop runs in a project directory of its worktree, of which there are 159
  (`ls -d ~/.claude-personal/projects/*worktrees-bm-* | wc -l`); the replay did not read them.
- The whole suite, `tests/tools/suite.sh`, after the last edit of a page or the test: 1279 pass, 0 fail, "Ran
  1279 tests across 133 files", ended 19:55 CEST (`date`). No line of its output begins `skipped:` or `(fail)`.

## Not tried

- No session met the hook with the new trigger. This session had the page marked as read before it wrote this
  file: `scripts/learnings-track-bash-read.sh` took a `head` and a `grep` of the page as a read of it (its
  state file lists the page). What a writer meets is held by the test, which runs the hook's script with the
  hook's input.
- A session takes its `knowledge/` from its own project directory, which for a writer is its worktree (the
  state file of this session names this worktree's pages). A worktree made before this landing asks as before
  until it is rebased. I did not start a session in a worktree made after it.
- `NotebookEdit` is not in the trigger and was not before.
- A script kept in `records/` asks for both pages: a run of the hook's script on `tools/cloud-brain/records/notes.sh`
  printed both, and on `tools/cloud-brain/x.tsx` and `tools/cloud-brain/fly/Dockerfile` the hub page alone. One
  tracked file of `records/` does not end `.md`, `cost-comment-has-billed-usage.backfill.py`
  (`git ls-files tools/cloud-brain/records | grep -v '\.md$'`). The three paths are not cases of the test.
- The replay over the worktrees' transcripts, and over more than four days.

## For the overseer

- `rules.md`, "Always", first item: "A hook blocks those until you have." It stays true of the hub page for an
  edit, and of the page on changing and deploying for a seed, a tool and its commands. Not edited: the file
  is not a writer's.
- The hook holds a page as read after a `head` or a `grep` of it in Bash (above). Seen once, in this run, and
  not looked into.
