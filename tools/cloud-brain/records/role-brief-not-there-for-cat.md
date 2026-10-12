# role-brief-not-there-for-cat: `CLAUDE.md` of cloud-brain-dev says the brief is read with the Read tool

Issue `role-brief-not-there-for-cat`, opened by the overseer at event 5484 from three reviewers' reports in the
journal. Written 2026-10-13, round 1.

## What was wrong

A light agent started by `cloud-brain-dev/agent.sh` gets its brief from `cloud-brain-dev/CLAUDE.md`, which read:

> If your prompt has a line `role:`, read `brain/roles/<role>.md` before anything else and follow it. It is a file
> of the Brain, fetched when you read it; `brain/index.md` lists the others.

The fetch is a hook on the Read tool (`cloud-brain-dev/.claude/settings.json`, one `PreToolUse` entry, matcher
`Read`). "when you read it" did not say which read. The three reports the issue quotes each began with a `cat` or
an `ls` that found no file. I did not read the journal files; the quotes are the issue's.

## What changed

`cloud-brain-dev/CLAUDE.md`, five lines of text where it had three:

> If your prompt has a line `role:`, read `brain/roles/<role>.md` before anything else and follow it, with the Read
> tool. It is a file of the Brain, and a hook of that tool fetches it at each Read. A `cat`, an `ls` or a Grep fetches
> nothing: it finds no file, or the copy an earlier Read left. A shell gets the file with `./put.sh --get roles/<role>.md`.

`cloud-brain-dev/README.md`, "A light agent for one role": the sentence "`CLAUDE.md` here is three lines" says five,
and what the two new sentences are.

`tests/tools/light-agent.test.ts` in `lopecode-dev`, two tests:

- The sentence: `CLAUDE.md` has "with the Read tool", `cat` and `ls` before "fetches nothing", and the command
  `./put.sh --get roles/<role>.md`; and `settings.json` there has one hook, on `Read`, which is what "a Grep
  fetches nothing" rests on.
- What the sentence says, run against the test's stand-in Brain: in a new directory `ls brain && cat brain/roles/x.md`
  is not exit 0; after the hook of a Read it prints the file; in a second new directory the command taken from
  `CLAUDE.md`, with `x` for `<role>`, is exit 0, prints `brain/roles/x.md`, and the `cat` then prints the file;
  `--get` of a role the Brain does not have is exit 1 and leaves no file.

The second test takes the command from `CLAUDE.md` and runs `put.sh` and the hook, neither of which this change
touches: it holds that the command the sentence gives does what the sentence says. Without the change it fails for
want of the command in the file (below); whether it would pass on the old file with the command put in was not run.

## Counts

Before the edit of `CLAUDE.md`, with the two tests added (the hook check of the first was added after):

```
$ bun test --timeout=30000 ./tests/tools/light-agent.test.ts
 21 pass
 2 fail
```

The first failed at `Expected to contain: "with the Read tool"`, the second where it takes the command from the file.

After the last edit:

```
$ bun test --timeout=30000 ./tests/tools/light-agent.test.ts
 23 pass
 0 fail
$ tests/tools/suite.sh
 954 pass
 0 fail
Ran 954 tests across 97 files.
```

On cb4's own files, in the worktree's clone of `cloud-brain-dev`, 2026-10-13 01:50 CEST, with no `brain/` there:

```
$ cat brain/roles/reviewer.md
cat: brain/roles/reviewer.md: No such file or directory
$ ./put.sh --get roles/reviewer.md
brain/roles/reviewer.md                      (exit 0; the file 45133 bytes, first line "# Reviewer brief")
$ ./put.sh --get roles/nobody.md
put.sh: roles/nobody.md is not on the Brain, or it did not answer      (exit 1; ls brain/roles: reviewer.md)
```

`brain/` was removed from the clone after.

## Alternatives weighed

- `agent.sh` fetches the brief before it starts `claude`, so a `cat` finds it. Not taken: the copy would be as old
  as the start of the run, where the hook fetches at each Read, and the issue asks for the sentence.
- The line in the brief itself. The issue says why not: it is the file not yet read.

## Not tried

- A light agent started with the new `CLAUDE.md`. Whether its first call is now a Read is not known. The issue's
  second condition, no such report among the next 20 reviewers' reports, is the overseer's to count.
- A Grep or a Glob under `brain/` in a live `claude`: that no hook runs for them is read from `settings.json` alone.
- `put.sh --get` from a directory other than `cloud-brain-dev`: the command in `CLAUDE.md` is written for the
  directory `agent.sh` starts the agent in.
- "the copy an earlier Read left" was not met in a run: it is what a `cat` reads in a directory where a Read was
  made before (the first new test, after the hook).
