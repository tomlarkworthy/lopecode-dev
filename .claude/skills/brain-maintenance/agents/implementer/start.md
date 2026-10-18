<!-- A page of `agents/implementer.md`: the token, the advisor, the worktree, and steps 1 to 4 (read the issue, read the code and search, decide whether it is yours, claim it).
Read it when a line of the brief on one of these is not enough for the case you have: a worktree that holds work, a prompt that names the main checkout, a stop for the owner, an issue another token started.
Cut from the brief 2026-10-13 (`writer-brief-and-tool-output-smaller`), as it stood. "Above" and "below" in it are of the
brief before the cut: the table "The pages" of `agents/implementer.md` has the page of each step and section. -->
# Implementer brief

You take one issue of the Cloud Brain tracker on `cb4` from `ready` to `in-review`, wait for its
review, and take one round of changes yourself (step 13). Your prompt names the issue. Read `.claude/skills/brain-maintenance/rules.md` first; it overrides this file.

You write to the tracker with the token your prompt names: its last line says `Your token is` and a
name, `impl-` and six hex digits. The orchestrator made it for this run, and it is yours alone
(`rules.md`, "Which token"). `issues-implementer-2` when the prompt names none. `<token>` below is
that name, written out. Shorthand below: `ia` is `tools/cloud-brain/issue-as.sh <token>`. Define it
as a function, `ia() { <root>/tools/cloud-brain/issue-as.sh <token> "$@"; }`, in each command that
uses it (the copy in your worktree, `$W/tools/cloud-brain/issue-as.sh`, does the same: "Where you work"),
with the name in place of `<token>` and no variable for it: the shell is zsh, which does
not word-split a variable and stops on an unquoted `*` or `?` that matches no file, and no shell
state lasts between calls. Quote the method and the JSON.
A name the tool does not keep is exit 2 with nothing sent: write nothing with another token, and
end with a report that says so. You do not run `brain.ts agent-token`: the orchestrator makes a
token and ends it.

## The advisor: one call, before the submit

Since `implementer-one-advisor-call` (2026-10-13). When your run has a tool `advisor`, its own description asks for
two calls: "Call advisor BEFORE substantive work", and again "When you believe the task is complete" (read in a
writer's prompt that day). This brief asks for one, and where the two differ this brief holds:

- **The one call** is made at step 11: the change and its record are committed in `$W`, your read "as the reviewer
  will" is made, and the landing has not begun. What it finds is mended before the landing.
- **The call before the approach is left out**, unless the task is one you cannot plan from the issue and the spec
  it names: they can be read two ways, and neither they nor `philosophy.md` say which. That call is then named in
  your comment, with what could not be planned.
- A round you take after a review (step 13) has one call too, before its submit.
- Say in your report how many calls you made, and what each was for.

Why: a call sends your whole context again at the full input price, and a reviewer reads the change after the
submit in any case. The issue's body has the measurement, made 2026-10-12 by its opener from `issue.runs` and not
run again for this part: 179 first-round runs of a writer, a median 2 calls a run (mean 1.75), the advisor 23% of
what a run cost. Whether this part moves that mean is not known: the tool's description is not this repository's
to change, and stands beside it (`tools/cloud-brain/records/implementer-one-advisor-call.md`).

## Where you work

Since `wt-3-land-by-push` (2026-10-12; `plan/cloud-brain-worktree-per-topic.md`, parts 1 and 3) the
orchestrator puts you in a git worktree before it spawns you. You make none and you remove none.
The first line of your prompt names it, `Working directory: <W>`, a directory
`…/.claude/worktrees/bm-<tree>`. Below, `$W` is that path and `<tree>` is what follows `bm-` in its
name: the topic of your issue (its parent, or the issue itself when it has none), with `.2` or a
higher number after it when the topic's first worktree was not free. Its branch is `bm/<tree>`.
`<root>` is the main checkout the worktree is of:
`dirname "$(git -C $W rev-parse --path-format=absolute --git-common-dir)"`. Write the paths out in
each command; no shell state lasts between calls.

- **You edit, build, test, commit and push in `$W`.** In `<root>` you write no tracked file and run
  no `git commit`, `merge` or `pull` and no `build.ts`. What `<root>` is to you: the place of
  `tools/cloud-brain/.emitted` (the state, the tokens, the files you emit; none of it tracked) and
  of `lopebooks`, where step 10 writes the built notebook under the lock.
- **Tools are run from `$W`**, by their path there: the copy is the one of the commit you are at,
  and it changes only at your own rebase. `issue-as.sh`, `lock.sh`, `issue-wait.sh` and
  `worktree.sh` find the main checkout's tokens and worktrees from there. `brain.ts` finds the
  state with `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted` before it, and not without. Run
  2026-10-12 from this change's worktree: `issue-as.sh <token> "get?id=…"` answered 200,
  `LOCK_TOKEN=<token> lock.sh show land` answered `land is not held`, `issue-wait.sh` waited, and
  `brain.ts curl … --as loop-knowledge` answered entries with the variable and
  `no token "loop-knowledge" is kept` with none. Two tools were not moved and are run from `<root>`
  as their steps say: `verify-run.ts` (step 8) and `issue-stats.ts`.
- **`$W/cloud-brain-dev` is where you test** (Tom, 2026-10-10: the loop is "to prefer using that
  directory in a worktree when solving tasks"). It is a clone of the repository `cloud-brain-dev`
  from the cluster's git, yours alone, at the commit your worktree's `HEAD` names, and
  `worktree.sh` has read what cb4 runs into its `deploy/` (about 1 s;
  `bun sync.ts https://cb4.endpointservices.workers.dev` there reads it again and loses any edit
  under `deploy/`; `worktree.sh --rebase <tree>` does it too). `bun test.ts <worker>` there runs
  that service's tests as deployed, with no browser, in about 2 s; `--with FILE` runs your built
  module in its place. A change to `README.md` and `records/*.md` of that repository is committed
  in the clone, never in `<root>/cloud-brain-dev`, and landed by `worktree.sh --push-dev` (step 10).
  A change to any other file of it (its tools, `agent.sh`, `roles/`, `AGENTS.md`) is not yours to
  land: the loop runs those files. Open an issue `about` `cloud-brain-dev` for it, linked
  `related` to yours, which `run.ts` runs in an issue clone and `push.ts` pushes after its review
  (`rules.md`, "Always", the item "Work on `main`").
- `git status` stops in the worktree, exit 128, with `error: expected submodule path 'lopebooks' not to be a symbolic link`
  (`lopebooks`, `lopecode` and `lopecode-plugin` are links). `git status --short --ignore-submodules=all` answers
  there, exit 0: the changed and the untracked files, and no line for a submodule. `git diff --stat HEAD` lists the
  links as changed files, which they are not; `git diff --stat --ignore-submodules=all HEAD` does not list them
  (issue `git-status-answers-in-a-worktree`, 2026-10-13: until then this item said that it fails and gave no form).
  `git diff`, `git add <file>` and `git commit` work. Never `git commit -a` or `git add -A` there:
  the commit records the links in the submodules' place, which the landing would push to `main`.
  `git fetch origin` there prints the same error of the link and is exit 128;
  `git fetch --no-recurse-submodules origin` is exit 0 (four writers met the first by 2026-10-12, the last of
  `ap-1-approver-tool`: "the brief warns of status only").
- The shell of a command is zsh: an unquoted variable is one word, so `for f in $FILES` runs once with the whole
  string and `$CMD` is not a command with its arguments. Write the names out, or use an array (`F=(a b); for f in $F`).
  (The writer of `suite-tests-read-the-live-brief`, 2026-10-12: a loop over four names in one variable left an empty
  file named by all four in `tests/tools`, two runs of the suite counted it, and the landing took a second commit and a
  second take of the lock.)
- **A worktree that holds work when you come to it.** When your prompt says so, a writer of this
  issue before you died or was sent back, and its commits and edits stand:
  `git -C $W log --oneline origin/main..HEAD` and `git -C $W diff --stat HEAD` show them. Go on
  from them (step 4 says how the round is counted). You are put in no worktree that holds
  another issue's unlanded work; if those two commands show some that is not this issue's, write
  nothing there, and say so in a comment and your report.
- **A prompt whose first line names the main checkout** (no `.claude/worktrees/bm-` in the path)
  is from an orchestrating session that still runs the procedure of before that day. Then you
  make the worktree yourself, after the claim of step 4:
  `W=$(<root>/tools/cloud-brain/worktree.sh <id>)`. `<tree>` is then `<id>`, and all else is as
  written here. (The writer of `wt-3-land-by-push` was started that way.)

## Steps

1. **Read the issue.** `ia "get?id=<id>"`: the issue and every event on it. If it came back from
   review, the reviewer's findings are the `reviewed` events; fix those and nothing else.
   If you wrote the round before and this one came to you as a message, read "A resumed round" below first.
   An issue whose `labels` have `post-mortem` is not a fix: read "A post mortem" below before step 2.
2. **Read the code it is about.** The source of a `brain-x-*` service (but the page) is what cb4 runs, in your
   worktree after `bun sync.ts` in `$W/cloud-brain-dev`: `$W/cloud-brain-dev/deploy/@tomlarkworthy/<module>.js`, with
   each Worker's hash in `deploy/services.json`. Its seed was deleted on 2026-10-14, and a change to it is a patch in
   `cloud-brain-dev` (its README, "One issue, from ready to deployed"; `run.ts`). Its first `md` cell is its method
   reference, also `getSource?worker=brain-x-NAME&part=reference`. A module whose entry in `MODULES` of
   `tools/cloud-brain/build.ts` has `seed:` (and `cloud-brain-specs`, which `build.ts` builds from its seed apart) is a
   seed, `tools/cloud-brain/<name>.ojs`, and a change to it is made in the seed: on 2026-10-18 the kernel, the core,
   the database, the deployer, `cloudflare-iac` and its fixtures, and the page's own modules. Each is being retired by
   a task of i13287 (spec r2, option A: `cloud-brain-dev/deploy/@tomlarkworthy/<name>.js` is the one source); once its
   seed is gone, read that file and change it there. For a module no Worker owns (all of the page's but `cloud-brain`,
   and `cloudflare-iac-fixtures`) no command sends such a change to cb4 yet: `apply.ts` refuses a patch of a file that is
   no service's module in `deploy/services.json` (2026-10-18). `spec-as-built.md` and `tools/cloud-brain/records/` have the history.
   **Then search the Brain for prior art, before you design the fix** (Tom, 2026-10-11: "update
   the loop instructions to use knowledge.search to do prior art research before implementing or
   designing"): `BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted BRAIN_BASE=cb4 bun $W/tools/cloud-brain/brain.ts curl "/xrpc/com.lopecode.brain.knowledge.search?semantic=true&q=<words, url-encoded>" --as loop-knowledge 2>/dev/null`.
   It answers `entries`, each with `id`, `kind`, `title`, `source` and `score`: `doc` is a guide
   in `knowledge/`, `module` a notebook module in the library, `paper` a paper from the daily
   feeds. Two or three searches, in the words of the problem and in the words of the fix you have
   in mind. Read what bears on the issue (a `doc:<name>` is `knowledge/<name>.md`; a module is
   reused by import, never copied). In the comment of step 12 say what you searched for and what
   you used, or that nothing bore on it. The token names that one read; it was made 2026-10-11
   with `brain.ts token loop-knowledge knowledge.search`.
3. **Decide whether it is yours.** Stop, comment with what you found, add the label
   `needs-owner`, and report, when any of these is true (the comment is for the owner to decide by: it is
   written as `rules.md`, "What the owner is asked to decide", has it, short, with what you found in a second comment or after the choice):
   - the fix needs something in the Never list of the rules. A change to `brain-kernel.ojs`,
     `brain-core.ojs`, `brain-db.ojs`, `brain-deployer.ojs` or `cloudflare-iac.ojs` is not such a
     fix: the deploy of its Worker is in that list, and writing the change is not (the paragraph
     after these three);
   - `philosophy.md` (beside `rules.md`) does not say which of two reasonable behaviours to take.
     When it does, take it and say in your comment which line decided it; that is not a stop;
   - it needs a new policy, a new secret, a new permission or a new Worker. A token that an
     approved spec names, with the methods that spec gives, is not such a secret: the orchestrator
     makes it (`rules.md`, "A token an approved spec names"). When your task needs one that
     `brain.ts` says is not kept, say so in a comment and in your report, with no label, and do
     not make it.
   Do not `start` such an issue.
   What you need of the orchestrating session, and not of the owner, once you work: "When you need the orchestrating session", below.
   **A fix in the seed of the kernel, the core, the database or the deployer is started as any
   issue is, with no word of the owner; its deploy alone is his** (`rules.md`, Never, since
   `never-list-three-reductions`, 2026-10-13). The seeds are `brain-kernel.ojs`, `brain-core.ojs`,
   `brain-db.ojs`, `brain-deployer.ojs` and `cloudflare-iac.ojs` (the deployer's hash covers it).
   A change to a `test_*` cell of one is such a fix too: a Worker's hash covers its module's
   source with the test cells, so it moves a Worker the loop does not deploy.
   The seed is landed on `main` by step 10 with no deploy: `land.sh` with `--seed-lands-undeployed`
   beside its `--test` (without the flag it refuses a commit that changes a seed, exit 64). Steps 7
   and 8 run on the build of your worktree, and you emit, apply and probe nothing of it on cb4. The
   first line of your comment and the reason of your submit say that cb4 does not run the change
   and that the deploy is the owner's, and the comment says what he is to apply. The release of
   your landing prints `deploys (cb4): … deploy-waits-<worker> opened`, or `list changed`: the issue
   his page shows him for that Worker (`tools/cloud-brain/waiting-deploys.ts`); it finds your
   commit by the seed and your issue by the commit's subject, `<issue id>: …`. `seen.json` is
   not changed. Your record says what he is to run and what his deploy will meet, as far as you
   know it: `tools/cloud-brain/records/core-getinfo-line-says-access.md` has such a section, "For
   the owner: the deploy". A new policy, secret, permission or Worker that the fix also needs is
   still the third stop above.
   (Until that day such an issue was labeled `needs-owner` and not started, and was started only
   when it came back with the owner's answer to land the seed or was a task of an approved spec
   that said the deploy was his. Three writers landed so from their issue alone on 2026-10-12:
   `token-revoke-no-name-ends-links`, `ds-1-rows-add-within`, `ds-2-core-spends-by-row`. No writer
   had landed so on the rule alone when this was written.)
4. **Claim it.** `ia move '{"key":"impl/<id>/start","id":"<id>","to":"in-progress","reason":"…"}'`.
   Whoever starts an issue is the only one who can submit it: the policy lets the token of its
   last `start` submit and refuses every other, 403. An issue that is already `in-progress` is
   yours only when you started it: read `by.holder` of its last `start` event in `get?id=`. When
   it is `secret:<token>`, it was sent back to you: skip this step. Count its `rework` moves; your
   round is that number plus one, and it goes in every key you write this time. When it is
   another's, it is not yours to submit, whatever your prompt says: comment with what you read,
   say so in your report, and stop. The orchestrator makes `back`, and the writer it then spawns
   makes `start`. An issue at `ready` whose events have a `back` move had a writer before you:
   make `start` as above, read that writer's comments and the commits they name, and go on from
   what is landed; your round is still the count of `rework` moves plus one.
   **Then work in your worktree, `$W`** ("Where you work", above): the orchestrator made it at
   `origin/main`, or put you in it as it stood when it holds unlanded work of your issue (your
   prompt then has the line `The worktree holds unlanded work of this issue.`), and in either case
   wrote your token in it as its occupant, so no other agent is put there while you work (for the
   second case since `fb-batch-loop-tools`, 2026-10-13: `worktree.sh --occupy`). Steps 5 to 10 happen in it. (Until `wt-3-land-by-push`, 2026-10-12, each writer made
   a worktree of its own here, one an issue, and removed it at its landing.)
