# policy-v5-names-the-approver-as-it-is

`plan/cloud-brain-issues-policy-v5.json`: the body of one `issue.install`, the v4 file with the end
of its reason made again so that it names the approver's brief and tool as `main` has them. Written
2026-10-13 by a writer of the issue loop (`impl-59a4ad`), round 1, started at event 5534. A data
file, a local tool, its test, one sentence of the approver's brief and two notes in specs: no seed,
no deploy. The commits are refs of the submit.

**cb4 runs no new policy after this landing.** The policy in force is the one of event 4668. The
install is the owner's (`rules.md`, Never) and was not sent, with any token.

## Why

`approver.ts approve` makes no move unless the reason of the policy in force ends
`approver brief <blob> tool <blob>` with the blobs `origin/main` has for
`.claude/skills/brain-maintenance/agents/approver.md` and `tools/cloud-brain/approver.ts`
(`approver.ts`, lines 317 to 323, its R7). Two changes landed after the install of event 4668,
`approver-brief-his-test` (the brief) and `approver-own-files-are-the-policy-cells` (the tool).
Read 2026-10-13 01:53:06 CEST (`date`), with `origin/main` at `db812016`:

```
$ issue-as.sh impl-59a4ad policy          # policy.seq, and the end of policy.reason
seq 4668
… Task ap-4-policy-v3. approver brief 9956b9aa3debe4c9d6d3434868f1efaa98b525f7 tool 89632e99fa43626f4137587a66d58470c9da5393
$ git rev-parse HEAD:.claude/skills/brain-maintenance/agents/approver.md HEAD:tools/cloud-brain/approver.ts
830321772b647eb5bfe5f67665a4db504605bb73
23e410a69c9a288aacc0bfb1badae25578380c9e
```

Neither blob is the one in force. The v4 file (`bk-4-install-the-project-workflow`) ends with the
same two old blobs and was not installed: `policy.seq` is still 4668.

## What changed

- **`agents/approver.md`, step 6.** It said `policy` is "a `plan/cloud-brain-issues-policy-*.json`,
  `brain-issues.ojs`" and named no mark `tracker`. The tool since
  `approver-own-files-are-the-policy-cells` marks the seed `policy` only when a commit changes a
  policy cell of it, and `tracker` when it changes none. The sentence now says both, that `tracker`
  is no refusal, and that the tool compared the text of the policy cells and nothing else, so the
  diff is read for a cell that writes into one when it runs. The last clause is from that change's
  record ("What `[tracker]` does not say": "The approver reads the diff for that at step 6 of its
  brief; the tool does not"), and the brief did not say it. **This is a change to the approver's
  brief.** It was made before the blobs were read, so the one install covers it. The brief's blob
  after it: `0189a17f3d7aad4f30777b98dfe81149604919c8`.
- **`tools/cloud-brain/policy-pins.ts`**, new. `remake <from.json> <to.json> [--note "…"]` writes the
  text of `<from.json>` with the two blobs of its reason replaced by `git hash-object` of the two
  files of the checkout, and a note put before `approver brief`; every other byte is as it was.
  `check` holds the newest `plan/cloud-brain-issues-policy-v<n>.json` against the two files of the
  checkout: exit 0 or exit 1 with both pairs and the cost. Neither calls the tracker. The script
  `bk-4` made v4 with was not kept (its record: "The script is not kept"), so the steps could not
  be run again as they were; v4's body is taken whole instead, and `policy.seq` is the same 4668
  v4 was made from.
- **`plan/cloud-brain-issues-policy-v5.json`**, new, made by the tool after the brief's mend:

  ```
  $ bun tools/cloud-brain/policy-pins.ts check
  plan/cloud-brain-issues-policy-v4.json names the brief 9956b9aa… and the tool 89632e99…; the checkout has 0189a17f… and 23e410a6…. A change to the approver's brief or its tool is one more policy file and one more install by the owner: …
  exit 1
  $ bun tools/cloud-brain/policy-pins.ts remake plan/cloud-brain-issues-policy-v4.json plan/cloud-brain-issues-policy-v5.json --note "Made again by policy-v5-names-the-approver-as-it-is, for the brief and the tool as main has them after approver-brief-his-test and approver-own-files-are-the-policy-cells."
  plan/cloud-brain-issues-policy-v5.json: the brief 0189a17f3d7aad4f30777b98dfe81149604919c8, the tool 23e410a69c9a288aacc0bfb1badae25578380c9e, a reason of 1182 characters
  $ bun tools/cloud-brain/policy-pins.ts check
  plan/cloud-brain-issues-policy-v5.json names the brief 0189a17f… and the tool 23e410a6…, as the checkout has them
  exit 0
  $ git diff --no-index --stat plan/cloud-brain-issues-policy-v4.json plan/cloud-brain-issues-policy-v5.json
   1 file changed, 1 insertion(+), 1 deletion(-)
  ```

  (The hashes in the first and third answers are cut here; the second is whole.) The one line is
  the reason. The key, the policy and the migrate are v4's.
- **`tests/tools/issues-policy-v5.test.ts`**, new, 6 tests.
- `plan/cloud-brain-issues.md`, "Installing it", and `plan/cloud-brain-approver-persona.md`, the
  paragraph of R7: one note each.

## The key is v4's, and what follows from it

The issue asks that the body differ from v4 "in the reason alone", and the key is left
`policy-2026-10-12-project-children-work-v4`. Read in `brain-issues.ojs`, lines 1429 to 1436, not
run: an install whose key the record keeps, with the same policy, writes nothing and answers
`duplicate: true` with the reason that was kept. So v4 and v5 are one install to the tracker, and
the first one sent is the one kept.

- v5 first, as this record asks: a later send of the v4 file writes nothing, and the old blobs do
  not come back by it.
- v4 first: the v5 file would write nothing and the approver would still make no approve. The
  first read below is what shows it. The file is then made again with a key of its own, which
  `remake` does not write.

## What the test holds, and what it fails on

`bun test --timeout=30000 ./tests/tools/issues-policy-v5.test.ts`: 6 pass, 0 fail, 33 `expect()` calls.

| the state, each made and put back, 01:58 CEST | pass, fail | the tests that fail |
|---|---|---|
| the brief as it was before the mend | 3, 3 | the newest file names the checkout's two; a checkout that differs is exit 1; the command |
| `approver.ts` with one more empty line | 3, 3 | the same three |
| the key of v5 changed | 4, 2 | it is the v4 file but for the end of its reason; the command |
| `finish` of v5 reading `children.open` | 4, 2 | the same two |
| the brief's old blob in v5's reason | 2, 4 | the blobs of the file's commit, and the first three |

What the body does at an install (the swap of the open projects, the finish of `group-invites`, the
approve of the named delegation) is held by `tests/tools/issues-policy-v4.test.ts`, of the same
policy and migrate, and is not run again on the v5 file.

Counts, each after the last change to a test, the tool, the brief or the file:

| command | result |
|---|---|
| `bun test --timeout=30000 ./tests/tools/issues-policy-v5.test.ts` | 6 pass, 0 fail |
| the same with `issues-policy-v4`, `issues-policy-v3`, `approver-brief`, `approver`, `briefs-name-the-prompts-token`, `owner-decisions-written-dense` (the files that read the brief or the tool), `--timeout=120000` | 92 pass, 0 fail, 1017 `expect()` calls, 7 files |
| `tests/tools/suite.sh`, 01:56:05 to 01:58:16 CEST | 958 pass, 0 fail, 6566 `expect()` calls, 98 files, 125.22 s; `uptime` after it 15.98 |

## What a later change to either file costs

A commit that changes `agents/approver.md` or `tools/cloud-brain/approver.ts` stops every approve
of the approver from its landing until the owner installs a policy whose reason names the new
blobs: the file is made again (`remake`, from the newest), a test of the new file is written, and
he makes one `issue.install`. `approver-brief-his-test` landed without one; the leave on
`fly-3-brain-fly-service` (verdict 5432, the issue's body) is where it was seen.

**A guard, built.** The third test of the file runs `check` on the checkout. For a writer who has
changed either file it fails, and its message ends with that cost (the first two rows of the table
above). It is in `tests/tools`, so `tests/tools/suite.sh` runs it.

What it does not hold:

- **It reads no policy of cb4.** A test of the suite makes no call. It holds the newest file of
  `plan/` against the checkout, so a file that is on `main` and not installed passes it. That is
  the state after this landing, until he installs.
- **It does not stop a landing.** `land.sh --test` runs the tests its writer names. A writer who
  runs neither the suite nor this file lands unhindered. A line in `land.sh` was weighed and not
  built: `check` is 0.1 s, but the script is every landing's and its own tests are a larger change
  than this issue.
- **It makes the next file a writer's task, not his.** The install is still one act of the owner
  for each change to either file.

## For the owner, and when

Not run on cb4: needs the owner present. From the main checkout, once it has the file
(`git pull`), the one call:

```
BRAIN_BASE=cb4 bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.issue.install --owner \
  -X POST -H 'content-type: application/json' -d @plan/cloud-brain-issues-policy-v5.json
```

Three things are read first, each by anyone. As read by this writer at 01:53:06 CEST, before the landing:

- `tools/cloud-brain/issue-as.sh <token> policy`: `policy.seq` is 4668. It was. If another policy
  was installed since, the file is made again from that one: this body would undo it, or, after
  the v4 file, write nothing (above).
- `tools/cloud-brain/issue-as.sh <token> "list?state=spec-review"` is empty: a swap empties
  `issue.reviews` of a project. It answered `{"issues":[],"total":0,"more":false}`.
- `bun tools/cloud-brain/policy-pins.ts check` in a checkout at `origin/main` is exit 0: `main` has
  the two files at the blobs the reason ends with. In the worktree, at the commit of the file, it
  was. A landing of either file between this one and the install makes it exit 1.

After it, `issue-as.sh <token> policy` has a new `policy.seq` and a reason that ends with the two
blobs above, and the answer of the install has no `duplicate`.

## Not tried

- **The install on cb4**, and an `approve` of the approver after it.
- **`approver.ts` given the v5 file as the policy in force.** The test reads the reason's end with
  the tool's own expression copied (`approver.ts` does not export `pinsOf`, and the tool is not
  changed here: each change to it is one more install). The two differ in `\s*` before the end.
- **The v5 file in the tracker's rig.** `issues-policy-v4.test.ts` runs the v4 file there; the two
  differ in the reason alone (the first test).
- **A v4 or v5 file sent after the other.** Read in the seed, above, not run in the rig.
- **`owner-reject` or `revert` of `approver-brief-his-test` or
  `approver-own-files-are-the-policy-cells`**, both at `awaiting-approval` when this was written.
  Either would change a file again, and the test would fail in the checkout that has the revert.
- **A reviewer's brief on the Brain.** Nothing of it was put: the approver's brief is read from
  `origin/main` (`approver.ts brief`).
- **`remake` on a file whose reason has an escape in its last 100 characters.** The replacement is
  of plain text; a file where the ending is not found once as text is refused, by a test.

## Read

Searches of the Brain (`knowledge.search?semantic=true`, `loop-knowledge`): "approver brief tool
blobs pinned in the policy reason install", "policy file remade when approver brief changes test
guard". First of each: `doc:pm-approver-leaves-everything`, `doc:cloud-brain-approver-persona`.
Used: the spec's paragraph of R7, and the records of `bk-4-install-the-project-workflow`,
`ap-4-policy-v3` and `approver-own-files-are-the-policy-cells`. `git grep -n -F 'approver brief'`
over `knowledge`, `plan/cloud-brain-*.md`, the skill and `tools/cloud-brain/*.md` printed 5 lines,
and `policy-v4` over the same 4 lines in two plans; the two notes above are the mends.
