# issue-as-body-from-a-file

## Round 1, 2026-10-11: `issue-as.sh NAME <call> @file` sends the file's bytes as the body

`tools/cloud-brain/issue-as.sh` took the JSON body as its third argument, and every brief gives the
call as inline single-quoted JSON. The issue (event 1586) names three reports of one cause: a body
of 1048660 bytes that gave "argument list too long" (event 1012), and two calls with an apostrophe
in the text that zsh did not run. The second was made again here, in a file run with `zsh`:

```
ia() { echo "called with $# args"; }
ia move '{"key":"k","reason":"the owner's word"}'

z.zsh:3: unmatched "
zsh exit 1
```

`ia` is not called. A local tool and a brief: no seed, no Worker, no deploy.

### What changed

In `tools/cloud-brain/issue-as.sh`, a third argument that begins with `@` is a file's path:

- the time check (`records/tracker-write-names-a-time-not-read.md`) parses the file's text in place
  of the argument;
- curl is given `--data-binary "@<path>"`, so the bytes go as they are;
- a file that is absent or empty is exit 4 with `issue-as.sh: the body's file <path> is absent or
  empty; nothing was sent` on stderr, before the token is read. Exit 4 was not in use (2 is no token,
  3 the time check). An empty file is refused because the script takes an empty body for a read;
- a relative path gets `./` in front, so `@-` is a file named `-`. curl reads stdin for `@-`, and the
  time check could not have read that.

The inline form is as it was. No tracker body begins with `@` (each is a JSON object), so no call
that worked before is read as a file.

Before this change `@file` already reached curl, as `-d "@file"`: the script before
(`git show 7e50dddc:tools/cloud-brain/issue-as.sh`) sent the file with its newlines taken out and
with no time check, since the argument `@path` is not JSON. That is what five of the seven new tests
fail on.

`.claude/skills/brain-maintenance/agents/implementer.md`, "The tracker's write calls", has a
paragraph after the table: when a body goes in a file, why, and exit 4. The issue asked for one
sentence; it is three, because the reason (zsh sends nothing) and the exit code are what a writer
would otherwise guess.

### Tests

`tests/tools/issue-as-body-file.test.ts`, seven tests, with the real curl against a local server
that keeps the bytes of each request (the rig of `tool-status-stderr.test.ts`). Run in the worktree
between 20:18:03 and 20:18:57 CEST (`date` before the first and after the third), curl 8.7.1, `getconf ARG_MAX` 1048576:

| Command | Result |
|---|---|
| `bun test ./tests/tools/issue-as-body-file.test.ts` | 7 pass, 0 fail |
| `ISSUE_AS_SH=<the script of 7e50dddc> bun test ./tests/tools/issue-as-body-file.test.ts` | 2 pass, 5 fail |
| `bun test ./tests/tools` (after `build.ts --out` in the worktree, which `issue-lock-sql.test.ts` reads) | 267 pass, 0 fail |

After `worktree.sh --rebase` brought in `main` (a test file and nine tests more, none of this
change's files), between 20:19:11 and 20:20:09 CEST: the first command 7 pass, 0 fail; the third
276 pass, 0 fail in 33 files. A second rebase under the landing lock brought `issue-stats.ts` with
its test and a record; the suite was not run again after it.

The two that pass against the old script are the inline form and the brief's paragraph, which the
script does not decide; the paragraph's test failed before the brief was edited (1 pass, 6 fail
with nothing changed).

What the seven hold:

1. A pretty-printed body with an apostrophe, a double quote, a backtick, `$HOME`, a backslash and
   seven lines arrives byte for byte, with `content-type: application/json`.
2. A body of 1263297 bytes (over ARG_MAX) arrives byte for byte from a file. The same text as an
   argument makes no request: the spawn fails or the script exits nonzero, and the test takes either.
3. A file whose `reason` names 11:10 with the clock at 11:06 is exit 3 and no request;
   `ISSUE_AS_TIME_AHEAD=1` sends it.
4. An absent file and an empty file are exit 4 and no request; the message names the path and not
   the token.
5. `@rel.json` is read from the directory of the call; `@-` is exit 4 with no such file and sends
   the file named `-` when there is one.
6. An inline body with an apostrophe and an `@` inside it is sent as given.
7. The brief's section has the word "apostrophe" and a call of the form `ia <call> @<path>`.

### On cb4

Not called on cb4 before the landing: the script reads its tokens beside itself, and a worktree's
`.emitted/` has none.

### Not tried

- A body over ARG_MAX sent to cb4. `issue.attach` takes 1048576 bytes of text and the JSON around it
  adds to that; the local server here takes 8 MB. Whether the core or the Worker refuses a request of
  that size before the tracker reads it is not known.
- Linux. bash 3.2 and curl 8.7.1 on macOS only. `--data-binary` and `%{stderr}` are in curl 7.63.
- A file that is not UTF-8, through the script. In python alone, `json.loads(open(f, encoding="utf-8").read())`
  on a file that begins `\xff\xfe` raises `UnicodeDecodeError`, which is a `ValueError`: the check
  would pass it, as it passes text that is not JSON, and curl would send it.
- `brain.ts curl`: the issue says it is not known whether a writer met the same there. No call made.
  `brain.ts` line 567 spawns curl with the caller's arguments spread into the list (`...rest`), so a
  `--data-binary @file` given there is curl's own; that was read, not run.
- The other briefs that name the helper (`agents/digest.md`, `agents/overseer.md`, `agents/spec.md`,
  the reviewer's on the Brain) were not edited: the issue names the implementer's alone, and the
  reviewer's is the overseer's to put.
- The inline examples of the briefs still show `'{…}'`; the issue says the inline form stays.
