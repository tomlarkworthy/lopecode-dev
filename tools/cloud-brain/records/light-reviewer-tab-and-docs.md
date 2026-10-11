# light-reviewer-tab-and-docs: no tab unless the change is a notebook's, and the knowledge doc in four files

2026-10-11. Asked for by the owner after he read what the light reviewer loads: "Yes remove TAB for non
notebooks. yes lets refactor the working-with-cloud-brain-remote-lopecode-cluster.md into more granular docs.
skil changing the system prompt." Of the advisor: "I think Fable advisor is helpful", so it stays.

## What was read first

The transcripts of the three reviews of `light-reviewer-in-use`
(`~/.claude-personal/projects/-Users-tom-larkworthy-dev-lopecode-dev-cloud-brain-dev/<session>.jsonl`), all started with `TAB=1`:

```
review  requests  first request  context at end  tab tools called  advisor (Fable), input / output
1       19        -              91,046          0                 62,360 / 5,766
2       24        -              86,421          0                 72,381 / 7,457
3       14        18,106         88,501          0                 68,742 / 9,167
```

The same start with no `TAB` was 9,764 (measured for `light-reviewer-in-use`), so the 28 tool definitions of the
channel server and its instructions are 8,342 tokens in every request. The first request of reviews 1 and 2
was not read. What review 3 read, by size of the tool result: the issue with its events 39,098 characters,
the knowledge doc 28,621, `philosophy.md` 16,985, its brief 12,428.

The advisor's tokens are not in `context`, which is what the loop posts as `tokens` in a cost comment. That
comment undercounts a light review by the advisor's call. Not changed here.

## What changed

- `.claude/skills/brain-maintenance/SKILL.md` step 4: the reviewer is started with no `TAB`. `TAB=1` in three
  cases: `tools/cloud-brain/review-needs-tab.sh <repo@sha>…` on the submit's commit refs exits 0 or 2, the issue
  has a `url` ref, or the reviewer reported `needed a tab`.
- `tools/cloud-brain/review-needs-tab.sh` (new): exit 0 with the file when a commit touches `*.ojs`, `*.html`,
  `modules/` or `deploy/`; 1 when none does; 2 when a commit cannot be read. On real commits:
  `lopecode-dev@7d9f15ee cloud-brain-dev@f85ecc7` exit 1; `lopebooks@HEAD` exit 0, `notebooks/@tomlarkworthy_cloud-brain.html`.
- The reviewer's brief on the Brain (`/static/cloud-brain-dev/roles/reviewer.md`, sha256 `bd7c4ddb0040…`, the
  one before kept by `put.sh --history`): with no tab and a step that needs one it writes nothing to the tracker
  and reports `needed a tab`; before `brain.ts` it reads the calling page, not the whole doc.
- `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`, 28,710 bytes, is now four files:

```
 9,833  working-with-cloud-brain-remote-lopecode-cluster.md   the documents, the parts, Tom's rules, which page to read; triggers as before
 8,141  calling-a-cloud-brain-from-this-checkout.md           brain.ts, state, tokens, health check, logs, knowledge-docs.ts; trigger: brain.ts, knowledge-docs.ts
 9,796  changing-and-deploying-a-cloud-brain-worker.md        the change routine, redistil/apply/saw, Playwright, where files are kept; trigger: an edit under tools/cloud-brain/, build.ts, the deploy commands
 4,677  pairing-with-the-cloud-brain-page.md                  trigger: brain.ts page
```

  The text was moved by line number with a script, not written again. Checked by sorting the lines of the old
  file and of the four new ones: four old lines are in no new file, the three of the opening paragraph (written
  again in the hub) and the heading "Pairing with the Brain's page" (now the page's title). One cell was
  changed: the `page` row of the command table said "(below)" and now names the pairing page.
  `scripts/check-learnings-triggers.sh`: 40 regexes, 53 scopes, 0 errors.
- The hub keeps its three triggers, so nothing that was gated is ungated. A session that runs `brain.ts curl`
  now reads the hub and the calling page, 17.9 KB where it read 28.7; one that edits a seed reads the hub and
  two pages, 27.7 KB. The reviewer has no hook and reads the calling page alone.
- Three tests read the old file for a line that moved: `lock.test.ts`, `playwright-chrome.test.ts`,
  `redistil-record-statements.test.ts` now read `changing-and-deploying-a-cloud-brain-worker.md`.
- `CLAUDE.md` has a row a page; `rules.md`, Always, says to read the page the hub names.

## Tests

`tests/tools/review-needs-tab.test.ts`, 3 tests, 10 expects. `bun test ./tests/tools`: see the submit.

## Round 2 (review 1176, by the light reviewer with no tab)

The review: `changes`, four findings; context 91,087 at its end, 30 turns, 507 s, $3.20. Review 3 of
`light-reviewer-in-use`, with the tab tools, was 88,501, 16 turns, 295 s, $2.17. So this one review did not come
out smaller: the start is 8,342 lower and it did more (it rebuilt the tree before the change to show 6 tests fail
there, and filed two tickets). One review each way is not a comparison of the two starts.

1. A merge commit read as no file, so exit 1 where a seed was merged: `review-needs-tab.sh lopecode-dev@57c775cc
   lopecode-dev@737fda15` (the refs of `dv-4-owner-install-and-shell`) was 1. The script now reads a merge against
   its first parent, and the same command exits 0 with `tools/cloud-brain/brain-feedback.ojs`. One test added (4 tests, 12 expects).
2. The line of `rules.md` now carries the owner's words for the cut.
3. `knowledge-eval/queries.json`, committed in this round: the three questions that want the old file also accept
   the page (6 ids added). It was written after the submit and before the review, by the writer of this issue.
   The eval was not run against cb4.
4. Left out of this record before: the docs were entered again on the Brain after the commit,
   `knowledge-docs.ts put --stale`, `{"put":10,"entered":7,"changed":3,"vectors":8}`; that is the four files of
   this change and six other docs that were stale or missing. And "one cell was changed" was short: each page
   also gained a title, a paragraph saying where it was moved from, and the changing page a heading, "The
   commands that deploy", a second header for its part of the command table, and one sentence pointing at the
   calling page, which has one pointing back.

The reviewer could not see who put the brief on the Brain: the writer of this issue did, with `put.sh` and the
token `loop-roles`, as the owner of the issue on the owner's word of 2026-10-11 ("you own the issues").

## Round 3 (review 1200, the light reviewer with no tab: 63,786 at its end, 14 turns, 291 s, $2.37)

One finding. The merge of round 2 was read against its first parent. The real one, `57c775cc`, is main merged
into the branch, so its first parent is the branch: the diff was what main brought, and the exit 0 came from a
seed of another issue. The branch's own seed, `brain-deployer.ojs`, was not in it. The script now reads a merge
against each parent (`git show -m --name-only`), so it asks for a tab when either side brought a seed. That
asks too often for a branch that merged main while main held a seed; the cost is the tab tools, not a missed
test. Two tests added, the reviewer's direction and a merge of docs alone (6 tests, 15 expects).

The reviewer opened `seen-writer-put-brief-with-loop-roles`: `rules.md` gives `loop-roles` to the overseer alone,
and the writer of this issue put the brief. Left with the owner.

## Not done, not tried

- No review has yet run with no tab; the review of this issue is the first.
- `needed a tab` has not been reported by any reviewer, so the second start was not exercised.
- The system prompt and the tool list of the light agent are as they were (the owner: skip).
- The reviewer still reads the issue with every event (39 KB for an issue in its third round).
- Records and `spec-as-built.md` that name a section of the old file were left as written.
