# label-guard-token-removes-annotation

An `issue.label` that adds or removes the label `annotation` is the owner present, held in the
tracker's code (`issueAllowed`, `tools/cloud-brain/brain-issues.ojs`) and not in a guard of the
policy. Written 2026-10-13 by a writer of the issue loop (`impl-78d63c`), round 1, started at event
5725. One seed, one deploy of `brain-x-issues`, no policy file and no install. The commits and the
deploy's hash are refs of the submit.

## Why it is not the guard the issue names

The issue asks that the label guard of `issuesDefaultPolicy` gain `annotation` beside `major`, and
that the owner install the policy. That was not built, for what the record of cb4 has.

Read with `issue-as.sh impl-78d63c "list?label=annotation&limit=100"`, 2026-10-13 05:54:54 CEST
(`date`): 5 issues, `more: false`.

```
fb-a24kt7jw3q closed True f0eab0a2346e feedback ['annotation']
fb-a2b5yudl8s done   True 8dd86dbd1724 feedback ['annotation']
fb-a2oogpkdjb done   True 8dd86dbd1724 feedback ['annotation']
fb-a2pyxbfzuh done   True 8dd86dbd1724 feedback ['annotation']
fb-a2kw99i9wy closed True 8dd86dbd1724 feedback ['annotation']
```

(id, state, `closed`, the first 12 characters of `workflow`, kind, labels.) All five are closed.
These are the notes the rule is for: Remove on the page is offered on a done issue
(`brain-feedback.ojs`, the row "Remove").

- An act on an issue is judged by the workflow the issue is on, by its hash (`issueAllowed`:
  `issueAt(view.workflows, i.workflow)`).
- An install's `migrate` moves the open issues of a workflow and no closed one: the query is
  `SELECT issue FROM issues_view WHERE workflow = ?1 AND closed = 0` (`onWorkflow`, line 449).
- So after an install of a policy with the new guard, each of the five would still be judged by
  the guard it closed under, which names `major` alone. Four of them are on `8dd86dbd1724…`, a
  workflow from before the install of event 4668. A token's `remove: ["annotation"]` on any of the
  five would be taken as before.

Two ways were left, and this change takes the first:

| | what it reaches | what it costs |
|---|---|---|
| **In the code**, beside the other rules "Fixed in the code" | every issue, open or closed, on any workflow, from the deploy | a label's name in the tracker's code (two `forWhom` of the seed name it already, for whom an issue is); a policy cannot give the label to another caller |
| A guard of the policy, with a `migrate` of the four workflows in force | the issues open at the install and those opened after it; none of the five | a policy file, the owner's `issue.install`, a swap event for each open issue, and a review lost for an issue at `in-review` with a review and no move after it (`plan/cloud-brain-issues.md`, "Installing it") |

Taken by line 1 of `philosophy.md` as it is read there ("A change that only narrows what a caller
may do is taken") and line 2 ("the side that is smaller and easier to undo"): the change takes a
call from tokens and gives none to anyone, and it is undone by a deploy of the seed without it.
`issuesDefaultPolicy` is as it was, so the policy files of `plan/` and their tests are too.

## What changed

- **`issuesLimits.ownerLabels`**, new: `["annotation"]`.
- **`issueAllowed`**, before the workflow's `label` guard is read: an act of type `label` from a caller who is not `present`, with a name of
  `ownerLabels` in `add` or in `remove`, is refused, `the label annotation is put on and taken off
  by the owner, present` (403). It stands after the `read` guard, so a caller who may not read the
  issue is still answered 404.
- **`test_issues_label_annotation_is_the_owner_present`**, new, and four lines of
  `test_issues_panel_removes_a_label`.
- The method reference in the seed: the row of `issue.label`, the paragraph "Fixed in the code",
  the sentence on who may label, and the panel's sentence on the `×` of a label.
- `plan/cloud-brain-issues.md`, the table under "Built": one row.

`issue.open` with `labels: ["annotation"]` is not held: a token still opens a new issue with the
label, which `issue.list?label=annotation` then answers to the page. The rule's second half,
"never put it on another issue", is held for `issue.label` alone. Two test cells of the seed open
such an issue with a token (`o-note`, `f1`), for what `for` of the queue answers.

## The tests

Each count is from a run after the last change to the seed.

| command, in the worktree | result |
|---|---|
| `cd cloud-brain-dev && bun test.ts brain-x-issues --with <the built module>` | `49 passed, 0 failed, 17 need a browser` |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/brain-issues --emit issues_service=…`, Chrome 151.0.7922.34, 05:56 CEST | `"tests":66,"passed":66,"failed":[]` |
| from the main checkout, `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-issues --shell <the build> --times 20` | `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`, `at` 03:57:33Z |
| `bun tools/cloud-brain/tab-tests.ts … @tomlarkworthy/brain-feedback` (the module whose Remove sends the call; not changed), on the same build | `"tests":14,"passed":14,"failed":[]` |

**Without the fix.** The new cell was written first and run on the seed as it stood:
`48 passed, 1 failed`, the fail `test_issues_label_annotation_is_the_owner_present`, expected
`[403, "the label annotation is put on and taken off by the owner, present"]`, received
`[200, undefined]`: a token's `remove: ["annotation"]` was taken. With the whole change but the
line `if (his) return no(…)`, `tab-tests.ts` gave 64 of 66, and the two that failed were that cell
and `test_issues_panel_removes_a_label` (the `×` of `annotation` for `token:a`: expected
`[true, <the refusal>]`, received `[false, "Remove the label annotation"]`).

What the new cell holds, each in the tracker's rig (`issuesRig`):

- `token:a` is refused `remove: ["annotation"]`, `remove: ["ui", "annotation"]`,
  `add: ["annotation"]`, and `add: ["api"], remove: ["annotation"]`, each 403 with the message.
- So is the owner under a delegation, and the owner's session with `x-brain-tab: 0`. A Worker and
  a member are 403.
- `["Annotation"]`, `[" annotation"]`, `"annotation"` and `[["annotation"]]` as `remove` are 400.
- The seq of the record's last event and the labels of both issues are the same after those calls.
- `token:a` removes `ui` and adds `page` and `annotations` in one call, 200, and removes
  `annotations`, 200.
- After `fb-n1` is closed, `token:a` is still refused.
- Under an installed policy whose `label` guard is `true` in every workflow, with a `migrate` of
  each (`moved: ["t1"]`; the closed note is not moved), a Worker adds `seen` to `t1`, 200, and is
  refused `annotation`; so is `token:a`.
- The owner present removes it from the closed note and adds it to the task, 200 each, and
  `issue.verify?guards=true` answers `ok`.

## Not tried

- **A token's call on cb4 with `annotation` in `remove` of one of the five notes**, before the
  deploy: it would have taken a note off the owner's page. What was sent after the deploy is in the
  comment of the submit.
- **Remove pressed on the Brain's page after the deploy.** It is the owner's tab. What stands for
  it is the record, below: his four Removes were each written as the owner present.
- **`issue.open` with the label by a token**, above: not held, by choice.
- **A second label in `ownerLabels`.** The list has one name; `find` gives the first of two in the
  message, which no test ran.

## What the record of cb4 has of the label

The issue says of a token's remove: "Whether any agent has done it was not searched in the record."
Searched 2026-10-13 05:58 CEST (`date`), with `issue-as.sh impl-78d63c "sync?after=<seq>"` from 0
until no event came: 5,774 events, the last of seq 5774. Those of type `labelled` with `annotation`
in `add` or in `remove`:

```
1281 fb-a2l7nb492m remove ['annotation'] by {'caller': 'owner', 'via': 'session', 'holder': '', 'tab': True}
1735 fb-a2vp4smwzq remove ['annotation'] by {'caller': 'owner', 'via': 'session', 'holder': '', 'tab': True}
2237 fb-a2rkg8fq0f remove ['annotation'] by {'caller': 'owner', 'via': 'session', 'holder': '', 'tab': True}
3709 fb-a2g3jyhecp remove ['annotation'] by {'caller': 'owner', 'via': 'session', 'holder': '', 'tab': True}
```

Four, each a remove by the owner's session in a tab, which is `caller.present` (`issueCaller`). No
token took the label off an issue or put it on one with `issue.label` in those events. So the
page's Remove is a call the new line takes, and `issue.verify?guards=true`, which judges each
event again under the code as deployed, has no event of the record that the new line refuses.

## Read

Searches of the Brain (`knowledge.search?semantic=true`, `loop-knowledge`), and what was used, are
in the comment of the submit. Records read: `annotations-file-feedback.md`,
`policy-v5-names-the-approver-as-it-is.md`.
