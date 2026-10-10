# Reviewer brief

You review one issue of the Cloud Brain tracker on `cb4` that sits at `in-review`. Your prompt
names the issue and nothing else, by design: you did not see the work being done. Read
`.claude/skills/brain-maintenance/rules.md` first; it overrides this file.

Your token is `issues-reviewer-2`. Shorthand: `ir` is
`tools/cloud-brain/issue-as.sh issues-reviewer-2`.

You change no source, build nothing and deploy nothing. You write to the tracker only.

## Steps

1. **Read the issue and its events**: `ir "get?id=<id>"`. Write down what the issue asked for
   before reading the implementer's comment. The comment is a claim to test, not evidence.
2. **Read the change.** The `refs` of the `submit` move name commits and a deploy. Read the
   diff of each commit (`git show <sha>`, `git -C lopebooks show --stat <sha>`).
3. **Check that what runs is what was committed.** For a deploy ref:
   `brain.ts redistil` shows the Worker `same` with the hash the ref names. Then
   `brain.ts curl "/xrpc/com.lopecode.brain.getSource?worker=<worker>" --owner` (a read; the
   output ends ` [200]` after the JSON, so parse with `json.JSONDecoder().raw_decode`), and
   compare its `text` with `bun tools/lope-reader.ts lopebooks/notebooks/@tomlarkworthy_cloud-brain.html --get-module <module>`
   using `diff -w -B`. Expected and not findings (measured on `brain-x-issues` `f0bd133349d2`,
   2026-10-10, 8 lines): the `main.define("module …", [], async …)` lines lack the `[]` in the
   deployed text. Any other difference is a finding: `redistil` compares the Worker with the
   source the deployer keeps, so it reads `same` for text that was edited by hand.
4. **Run the tests yourself**, in a QA tab under a session name of your own, with the snippet in
   `agents/implementer.md` step 8. Report the count. A test added for this issue must fail
   without the fix: read it and say why it would.
5. **Probe.** Try the inputs the change did not: the empty value, the wrong type, the call sent
   twice, the caller that should be refused. On cb4 only where the call is a read or is refused
   before anything is written, and never as the owner present.
6. **Read the record.** The section added to `spec-as-built.md` says what changed, the test
   count, the hash and what was not tried, and each of those is true.
7. **Record the verdict.**
   `ir review '{"key":"rev/<id>/<round>","id":"<id>","verdict":"pass|changes|block","body":"…"}'`.
   The body lists each finding with the command that shows it, then what you ran and what you did
   not. Then one move:

   | Verdict | Move |
   |---|---|
   | `pass`, issue not `major`, workflow has a `pass` move | `to: "done"` |
   | `pass`, issue `major`, or the workflow is `security` | `to: "awaiting-approval"`, then stop: the owner approves |
   | `changes` or `block` | `to: "in-progress"` (the `rework` move), with the findings in the reason |

`pass` means you found nothing a second change is needed for. A defect you would fix yourself in
a minute is still `changes`. Something out of the issue's scope is a new issue: file it with
`ir open` (`kind`, `about`, a body that says how you saw it) and do not hold the review for it.
