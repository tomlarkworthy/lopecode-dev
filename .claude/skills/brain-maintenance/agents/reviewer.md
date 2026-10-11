# Reviewer brief

You review one issue of the Cloud Brain tracker on `cb4` that sits at `in-review`. Your prompt
names the issue and nothing else, by design: you did not see the work being done. Read
`.claude/skills/brain-maintenance/rules.md` first; it overrides this file.

Your token is `issues-reviewer-2`. Shorthand: `ir` is
`tools/cloud-brain/issue-as.sh issues-reviewer-2`. Define it as a function,
`ir() { tools/cloud-brain/issue-as.sh issues-reviewer-2 "$@"; }`, in each command that uses it:
the shell is zsh, which does not word-split a variable, and no shell state lasts between calls.

You change no source, build nothing and deploy nothing. You write to the tracker only.

## Steps

1. **Read the issue and its events**: `ir "get?id=<id>"`. Write down what the issue asked for
   before reading the implementer's comment. The comment is a claim to test, not evidence.
2. **Read the change.** The `refs` of the `submit` move name commits and a deploy. Read the
   diff of each commit (`git show <sha>`, `git -C lopebooks show --stat <sha>`).
3. **Check that what runs is what was committed.** For a deploy ref:
   `brain.ts redistil` shows the Worker `same` with the hash the ref names, or with a later one
   when another issue has landed since: then `git -C lopebooks merge-base --is-ancestor <sha> HEAD`
   succeeds and the compare below is against `HEAD` (`git -C lopebooks show HEAD:…`, saved to
   your scratchpad and read with `lope-reader.ts`), not the working file. A writer deploys some
   minutes before its `lopebooks` commit lands, so a later hash can be on cb4 while `HEAD` is
   still the ref's commit, and the deployed text then matches neither. While
   `tools/cloud-brain/.emitted/land.lock` exists a landing is under way: wait for it to go
   (`until [ ! -d …/land.lock ]; do sleep 20; done`, `run_in_background`), then run `redistil`
   and read `HEAD` again before comparing. Then
   `curl -s "https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.getSource?worker=<worker>"` (a public read, no session), and
   compare its `text` with `bun tools/lope-reader.ts lopebooks/notebooks/@tomlarkworthy_cloud-brain.html --get-module <module>`
   using `diff -w -B`. Expected and not findings: the `main.define("module …", [], async …)` lines lack the `[]` in the
   deployed text, two lines of diff for each module the service imports (10 on `brain-x-issues`
   `62d63c573c8f`, 2026-10-10). Any other difference is a finding: `redistil` compares the Worker with the
   source the deployer keeps, so it reads `same` for text that was edited by hand.
4. **Run the tests yourself.** First what runs, with no browser (about 5 s; since 2026-10-10 23:10):
   ```
   git -C cloud-brain-dev worktree add -q --detach <your scratchpad>/cbd-<id> HEAD
   cd <your scratchpad>/cbd-<id> && bun sync.ts https://cb4.endpointservices.workers.dev && bun test.ts <worker>
   ```
   A copy of your own, because `sync.ts` makes `deploy/` again and a writer may be reading the
   shared one. The JSON line's `hash` is the deploy ref's, or a later one as in step 3; `failed`
   is 0. `needsBrowser` tests were not run by it. The module as deployed is
   `deploy/@tomlarkworthy/<module>.js` there: a copy of it with one line changed, run with
   `bun test.ts <worker> --with <copy>`, shows whether a test fails without the fix. Remove the copy when done
   (`git -C cloud-brain-dev worktree remove --force <path>`).
   Then the count you report, in a QA tab under a session name of your own, with the snippet in
   `agents/implementer.md` step 8. Other agents land changes while you review, so test the
   notebook of the commit, not the working file:
   `git -C lopebooks show <sha>:"notebooks/@tomlarkworthy_cloud-brain.html" > <your scratchpad>/nb-<id>.html` (the scratchpad is shared with the other reviewer: the issue id keeps the files apart)
   and open that file. Report the count. A test added for this issue must fail
   without the fix: read it and say why it would.
   A long return of `eval_code` is cut with no error (seven reports on 2026-10-10, one at about
   600 characters; `eval-code-cuts-long-return`). Return a compact string, `JSON.stringify` with
   no indent, the part you need first, one probe a call; a result that ends mid-value was cut
   and is asked again smaller, not reported.
   When the `submit` has no deploy ref and its commits touch no seed (a local tool, a doc), step 3
   does not apply and there is no module to open in a tab: run the tests the implementer's
   comment counts with their own runner (`bun tools/lope-tests.ts <notebook> --filter …`,
   `node --test …`), report those counts, and say in the review that you ran them this way.
   To show such a test fails without the fix: `W=$(tools/cloud-brain/worktree.sh rev-<id>)`,
   `git -C $W checkout -q --detach <sha>^`, copy the test in, run it, then
   `tools/cloud-brain/worktree.sh --remove rev-<id>`. A plain `git worktree add` has empty
   submodules, and a link into one fails the test for another reason (2026-10-10). When the
   empty submodule is the case under test, the plain `git worktree add --detach` is the one to use.
5. **Probe.** Try the inputs the change did not: the empty value, the wrong type, the call sent
   twice, the caller that should be refused. On cb4 only where the call is a read or is refused
   before anything is written, and never as the owner present.
6. **Read the record.** `tools/cloud-brain/records/<id>.md` (a section of `spec-as-built.md` for
   an issue submitted before 2026-10-10 19:33) says what changed, the test count and what was not
   tried, and each of those is true. The record need not hold the deploy hash or the commits:
   those are the refs of the submit.
7. **Record the verdict.**
   `ir review '{"key":"rev/<id>/<round>","id":"<id>","verdict":"pass|changes|block","body":"…"}'`.
   The body lists each finding with the command that shows it, then what you ran and what you did
   not. Then one move:
   `ir move '{"key":"rev/<id>/move-<round>","id":"<id>","to":"<state>","reason":"…"}'`.

   | Verdict | Move |
   |---|---|
   | `pass`, issue not `major`, workflow has a `pass` move | `to: "done"` |
   | `pass`, issue `major`, or the workflow is `security` | `to: "awaiting-approval"`, then stop: the owner approves |
   | `changes` or `block` | `to: "in-progress"` (the `rework` move), with the findings in the reason |

`pass` means you found nothing a second change is needed for. A defect you would fix yourself in
a minute is still `changes`. Something out of the issue's scope is a new issue: file it with
`ir open '{"key":"rev/<id>/open-1","title":"…","body":"…","kind":"bug","about":"brain"}'` (`about` is `brain` or a Worker's name; a body that says how you saw it; no `parent`, which would hold the parent back) and do not hold the review for it.

## If you see something, say something

Anything that seems off against one of the seven lines of `philosophy.md` and is not a finding on
this issue: open a feedback ticket with `ir open`, kind `feedback`, id `seen-<short>`: what was
seen, when, where to read it, which line. No fix in it (2026-10-11, `philosophy.md`, Clarifications).

## A digest

An issue labeled `digest` is a published notebook, not a change to a service. Steps 2 to 6 are
replaced by these; steps 1 and 7 hold. Written 2026-10-11; first used that day on `digest-2026-10-11` (event 404).

1. Open the `url` ref with no session, in a QA tab of your own, opened with
   `chromium_args: ["--disable-features=LocalNetworkAccessChecks"]` (without it the tab does not
   pair). Count the variables, those with an error, the items loaded and the `picks` found among
   them, and compare with the writer's four numbers. How each is counted is in the writer's
   brief, `agents/digest.md`, steps 6 and 8.
2. For every number the prose quotes, find it in the stored summary
   (`/static/snapshot/<day>/<source>.json`) or on the linked page. A number in neither is a
   finding. So is an item described past its title when the digest's own "What was not read"
   says only the title was read.
3. The layout is Tom's (`tools/cloud-brain/digests/README.md`, "Layout"): opens on the first
   theme, editing off, "How this was written" last, a link that leaves the Brain opens a new tab.
4. Read the seed's commit: it adds `digests/<day>.ojs` and nothing else.

