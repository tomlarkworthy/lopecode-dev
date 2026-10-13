# policy-pins-remake-keeps-the-key

`tools/cloud-brain/policy-pins.ts remake` wrote the next policy file with the key of the file it
read. The tracker's `install` route answers a body whose key the record keeps as the install it
was, and writes nothing, so such a file is installed with no effect and the approver stays stopped.
The line the tool prints when the pins are behind (`COST`) gave `remake`, a test and the install as
the whole remedy. Written 2026-10-13 by a writer of the issue loop (`impl-04d2e1`), round 1, started
at event 6794. A local tool, two test files and one note in a spec: no seed, no deploy, no policy
file written.

## The fault, run before the change

`tests/tools/policy-pins-remake-key.test.ts`, with the tool and the spec as HEAD had them (the two
files put back from `git show HEAD:<file>` for the run, then restored), 2026-10-13 after 19:38 CEST:

```
$ bun test --timeout=30000 ./tests/tools/policy-pins-remake-key.test.ts
error: expect(received).not.toContain(expected)
Expected to not contain: "policy-2026-10-13-approver-policy-parts-v6"
(fail) the command as the tool's line gives it writes a file with a key no policy file of plan/ has, or writes none
 0 pass
 5 fail
```

The first test reads the command out of `COST`, runs it on the newest policy file with a file of a
temporary directory for `<to.json>`, and reads the key of what was written. The tool of HEAD wrote
the key of `plan/cloud-brain-issues-policy-v6.json`.

That the install route answers a kept key as the install before was not run by me apart from the
suite. It is the rig of `tests/tools/issues-policy-v6.test.ts`, which installs the v6 body under
v5's key, and that file passed here with the change (below).

## What changed

**The key of the new file is an argument of `remake`**:
`remake <from.json> <to.json> --key <key> [--note "<a sentence>"]`. The triage (event 6787) left the
choice of an argument or a key made from the name of `<to.json>` to the writer. An argument was
taken: the keys of the five files of `plan/` each say what their policy is for
(`policy-2026-10-13-approver-policy-parts-v6`), which a name and a date do not give.

The command writes nothing and exits 1 when:

- no `--key` is given, or it has no value, or the value is empty, begins `--` (the next flag taken
  for the key) or has a space at either end;
- the key is longer than 100 characters (`issuesLimits.key` of `brain-issues.ojs`, line 346, read
  and not run);
- the key is the key of `<from.json>`;
- a `plan/cloud-brain-issues-policy-*.json` of the checkout the tool is in has the key. The line
  names each such file.

The runs, 2026-10-13 19:38 CEST, with `$O` a file of the scratchpad that did not exist:

```
$ bun tools/cloud-brain/policy-pins.ts remake plan/cloud-brain-issues-policy-v6.json $O
policy-pins.ts: remake needs --key <key>, the key of the new file: issue.install answers a key the record keeps as the install it was, and writes nothing
exit 1
$ bun tools/cloud-brain/policy-pins.ts remake plan/cloud-brain-issues-policy-v6.json $O --key policy-2026-10-13-approver-policy-parts-v6
policy-pins.ts: policy-2026-10-13-approver-policy-parts-v6 is the key of plan/cloud-brain-issues-policy-v6.json, and an install under it is answered as the install before
exit 1
$ bun tools/cloud-brain/policy-pins.ts remake plan/cloud-brain-issues-policy-v6.json $O --key policy-2026-10-12-project-children-work-v4
policy-pins.ts: policy-2026-10-12-project-children-work-v4 is the key of plan/cloud-brain-issues-policy-v4.json and plan/cloud-brain-issues-policy-v5.json, and an install under it is answered as the install before
exit 1
$ bun tools/cloud-brain/policy-pins.ts remake plan/cloud-brain-issues-policy-v6.json $O --key policy-2026-10-13-a-key-of-the-record-v7 --note "A note of the record."
$O: the key policy-2026-10-13-a-key-of-the-record-v7, the brief fe5c1e7dd1cef09b6df4db4ee0c50d2cb23304f3, the tool 1ffc4f93af34142592bb5bd14ec918a21ad1643e, a reason of 1420 characters
exit 0
```

After the first, `ls $O` found no file. The second and the third wrote none either: the fourth
wrote `$O`, and the command writes over no file that exists (a fifth run, with another key, was
exit 1 with `exists, and is not written over`). Of the file the fourth wrote, `diff` against
the v6 file printed lines 2 and 3 alone, the key and the reason, and the `policy` and the `migrate`
of the two were equal as JSON. The file was then removed: this change adds no policy file.

**In the code.** `remake(text, pins, note, key)` of `policy-pins.ts` takes the key as a fourth
argument. With none it answers as before, which `tests/tools/issues-policy-v6.test.ts` relies on.
With one it replaces the first place the old key stands in the text as a JSON text, parses the
result, and throws unless the key is the new one and everything else is as it was: a file whose
key is not the first such place is refused and not written wrong. `taken(key, root)` answers the
policy files of `plan/` that have a key. The command refuses a taken key before it reads
`<from.json>`.

**`COST`** now gives the command with `--key <key>` and says why: "with a key no policy file has
(an install under a key the record keeps writes nothing)".

**`plan/cloud-brain-approver-persona.md`**, the note "As built" under R7, said "`remake` keeps the
key of the file it reads: the next file [...] takes a key of its own by hand". It now says what
was so until this issue and what the command takes since.

**`tests/tools/issues-policy-v5.test.ts`**: its run of the command now gives `--key`, since the
command writes nothing without one.

## Tests

```
$ bun test --timeout=30000 ./tests/tools/policy-pins-remake-key.test.ts
 5 pass
 0 fail
 62 expect() calls
$ bun test --timeout=120000 ./tests/tools/issues-policy-v5.test.ts ./tests/tools/issues-policy-v6.test.ts
 13 pass
 0 fail
 65 expect() calls
Ran 13 tests across 2 files.
```

The whole of `tests/tools`, 2026-10-13 19:59 to 20:02 CEST, after the last edit of the tool and the tests
and after the rebase (a first run was stopped at the harness's time limit with nothing printed, while
other suites ran on the machine; a second, before the refusal of a key that begins `--`, was 1279 pass
of 133 files):

```
$ tests/tools/suite.sh
 1287 pass
 0 fail
 10636 expect() calls
Ran 1287 tests across 134 files. [148.31s]
```

## Not tried

- **An install.** No policy file was made and nothing was sent to cb4. That a file `remake` writes
  under a new key is taken by `issue.install` was not run.
- **A key that cb4 keeps and no file of `plan/` has.** The tool reads the files of the checkout and
  not the record. Its header says so.
- **A key with characters an install may refuse.** The tool refuses the empty key, one that begins
  `--`, a space at either end and a length over 100, and takes any other. Before that refusal was
  written, 19:58 CEST, `--key " spaced-key "` wrote a file with that key and `--key --note foo` wrote
  one with the key `--note`; both are in the test now and write nothing.
- **`--note` given twice.** By the code the last is used; read and not run. `--key` given twice is in
  the test: the last is the key.
- **A third file name.** `remake a.json b.json c.json --key k` reads the first two and says nothing of
  the third, as before this change; read and not run.
- **A policy file whose key is not the first field.** The five of `plan/` have it first. The case of
  a field before the key with the same text is in the test and is refused; other orders were not run.
- **`check`** is as it was and does not look at keys: the v4 and v5 files have one key and are
  history, as the issue says.
