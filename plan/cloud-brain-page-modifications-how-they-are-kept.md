# Cloud Brain: how a change the owner makes to the Brain's page is kept

Spec of the project `page-modifications-how-they-are-kept` on the tracker of cb4. Written 2026-10-13,
08:59 to 09:30 CEST, by the spec writer `spec-8d8514`, in the worktree `bm-spec-page-mods` at
`3a159fbf`. Nothing is built. It is options for the owner with a pick, and the tasks of the pick.

## What was asked

The owner, 2026-10-13, to the orchestrating session, whole (the body of the issue, event 6123):

> Bug: on the UI, I closed all the feedback panels, but a refresh later and they have all appeared again, so the UI is tending towards clutered with no way of fixing it. I think this is a larger issue of how we should treat UI page modifications. I am not sure what the right answer is, so some research and options need to be done.

The first sentence is the bug `page-notes-return-after-a-refresh`. This spec is the second and the third:
research, and options he chooses from.

His words of 2026-10-11, when he asked for the notes (`tools/cloud-brain/records/annotations-file-feedback.md`,
"What was asked"), bear on every option:

> Progress on the ticket would be annotated and I the user would get signal when the work is done and then when I clocked remove at that point the annotation would be permemenetly removed.

Three sentences of this spec rest on more than his words say:

- That "closed" was the × of a note whose work was not done yet is the writer's reading and not his words: the
  record has his five Removes of that morning (below) and has nothing of a ×, which sends no call.
- That a note he put away comes back once, when its work is done, is the writer's reading of "I the user would
  get signal when the work is done", and not his words: he has not said what a put-away note does then.
- That "UI page modifications" takes in every change he can make on the page (the table below), and not the
  notes alone, is the writer's reading and not his words.

## The gathered reports

`list?parent=page-modifications-how-they-are-kept` answered `total: 0` at 08:59 CEST. One issue is linked `related`:

| Issue | What it becomes |
|---|---|
| `page-notes-return-after-a-refresh` (bug, `ready`, no writer's commit at 09:05 CEST) | R1 and R2 below. Its body says "If the fix is not narrow (it needs the answer of the feature), say what was found here and on that feature and stop": task pm-1 of this spec is that fix, and the orchestrator decides whether pm-1 is that issue or a part of this one. |

## Read

In the Brain, with `knowledge.search?semantic=true` as `loop-knowledge`, 2026-10-13 about 09:00 CEST. Six searches;
the first entry of each, with its score, and what was used:

| Words | First entries | Used |
|---|---|---|
| closed panels come back after a refresh; where UI state of the page is kept | `doc:keeping-user-state-in-the-saved-notebook` 1.000; `doc:cloud-brain-dashboards-share-series-and-controls` 0.450 | Both read. The first is option E. The second, at line 285, lists "Keeping the span in the address or in local storage. Not asked." under what it left out. |
| user interface preferences persisted per user: localStorage, server, URL hash | the same doc 0.916; `module:tomlarkworthy:local-storage-view` 0.698; `module:tomlarkworthy:url-query-field-view` 0.662 | The two modules are views bound to one browser item or one address field. Not used: the hidden notes are a set the app reads, not a view. |
| dismissed notification stays dismissed across devices | `doc:corepox-shipped-ui-observed` 0.782 | Nothing on this. |
| keeping user state in the saved notebook sticky | the same doc 1.000; `module:tomlarkworthy:sticky` 0.442 | Option E. |
| malleable software user modifications persist local-first | `module:tomlarkworthy:lopecode-live-2026` 0.716; `module:tomlarkworthy:local-change-history` 0.576 | Not read further. |
| annotation note hidden removed label page reload | `module:tomlarkworthy:annotate` 1.000 | The module read from the built notebook: its × is `p.del.addEventListener("click", () => store.remove(id))`, line 1434 of the extracted module. |

Records read: `annotations-file-feedback.md`, `feedback-draft-lost-on-reload.md`, `feedback-closed-or-promoted.md`
(by `grep` for Remove, not whole), `label-guard-token-removes-annotation.md` (its first 25 lines).

Outside, three pages, each read through a fetch that summarises the page, so each claim below is from a summary
and not from the page's own text:

- WebKit, "Tracking Prevention in WebKit", <https://webkit.org/tracking-prevention/>: Safari deletes a site's
  script-writable storage (`localStorage`, IndexedDB) after 7 days of Safari use with no interaction with that
  site. A site added to the home screen is exempt. Used: the cost of option A in Safari.
- Webstrates, "Transient data", <https://webstrates.github.io/userguide/api/transient.html>: a system that keeps
  the whole page as the shared document still sets apart data that "does not get persisted or synchronized to
  other clients". Used: the rule of part "The rule", that what one person looks at is kept apart from what the
  page is.
- Ink & Switch, "Malleable software", <https://www.inkandswitch.com/essay/malleable-software/>: of changes a user
  makes to a tool, mods are "often difficult to maintain as the underlying application evolves". Used: the cost
  of option E.

Searched and not found: a source that says whether a dismissed item should be one person's on one device or on
all of them. The local-first essay (<https://inkandswitch.com/local-first/>) was found by a search and not read.

## What exists today, measured

### The notes

`brain-feedback.ojs` at `3a159fbf`. A note's × removes its cell. `gone` (lines 233 to 247) then does one of two things:

```
240:      if (!progress(t).done) hidden.add(iss);
...
243:        await client.procedure("issue.label", { key: `annotation/${iss}/removed`, id: iss, remove: [limits.label] })
```

`hidden` is a `Set` made with the app (line 90), so a load of the page starts with an empty one, and `sync`
(line 211) places a note for every issue that has the label. The module's own test asserts it, lines 660 to 667:

```
  // The note of an open issue closed with annotate's own x: no call, hidden here, and back on the next load.
  ...
  const reloaded = rig.app();
  await reloaded.sync();
  expect(rig.store.all().map((a) => a.issue)).toEqual(["fb-open"]);
```

Built in the worktree and run, 2026-10-13 09:01:46 to 09:02:17 CEST:
`bun tools/lope-tests.ts tools/cloud-brain/.emitted/cloud-brain.html --filter test_feedback` ended
`Tests: 14 passed, 0 failed, 0 timed out, 0 skipped, 14 total`. So what he reported is what the module is
written and tested to do, for a note whose work is not done. The first cell of the seed says so too: "On an
open, gathered or just closed issue the × hides the note until the page is loaded again."

The record of cb4, read with `spec-8d8514` at 09:00 CEST:

```
fb-a2kw99i9wy  opened 2026-10-11 13:52:42 UTC  closed, part of dashboards-share-series-and-controls (done)  6109 labelled remove annotation, owner (tab), 2026-10-13T06:50:08Z
fb-a2oogpkdjb  done                                                                                         6110 … 06:50:12Z
fb-a2b5yudl8s  done                                                                                         6111 … 06:50:17Z
fb-a2pyxbfzuh  done                                                                                         6112 … 06:50:20Z
fb-a24kt7jw3q  opened 2026-10-11 19:16:43 UTC  closed, part of group-invites (done 2026-10-13T03:43:27Z)    6113 … 06:50:35Z
list?label=annotation: total 1, fb-a2k9vvmfvv (open, his note of 06:52:29Z)
```

Ten issues `fb-…` exist; nine have no label now. His five Removes were made in 27 seconds and each is held. A
note of an issue that is part of a project had no Remove until the project closed (`feedbackProgress`, `done`):
`fb-a24kt7jw3q` from 2026-10-11 19:16 UTC to 2026-10-13 03:43 UTC, 32 hours in which its × lasted one load.

Not known: whether any note came back after its Remove. Nothing read here says so, and the list has one issue.
If one did, the cause is not in this spec and is the bug's writer's to name.

### Every change he can make on the page, and where it is kept

From the seeds at `3a159fbf`. `grep -c localStorage` answers 5 for `brain-feedback.ojs`, 5 for `brain-issues.ojs`,
4 for `brain-shell.ojs`, 0 for `cloud-brain.ojs`, `brain-dashboard.ojs` and `brain-operator.ojs`.

| What he changes | Where it is kept | After a load | In another browser of his |
|---|---|---|---|
| The panes that are open and their places | the address, `#view=…` (`brain-shell.ojs`, `viewModules`) | kept while the address is; the bare address opens the shell's own layout | with the address |
| The dashboard shown | the address, `dashboard=NAME` (`brain-dashboard.ojs`, line 5) | the same | the same |
| A dashboard's panels | rows of `brain-x-dashboard` (`dashboard.put`) | kept | kept |
| A Worker's setting | rows of the core (`config.set`) | kept | kept |
| A note filed | the tracker: the issue and its label `annotation` | kept | kept |
| Remove of a note whose work is done | the tracker: the label taken off | kept | kept |
| A note not yet filed | this browser, `brain_feedback_drafts ADDRESS` (`feedbackKept`) | kept | not there |
| Who is signed in | this browser, `brain_session` | kept | not there |
| **The × of a note whose work is not done** | **the app's memory** (`hidden`) | **lost** | not there |
| A note's box, moved | nowhere (the seed's first cell: "the new place is not kept") | lost | not there |
| The span of Health (`viewof span`, `cloud-brain.ojs` line 36) | the cell's value | lost | not there |
| The filters of the Issues panel | the panel's values (`Inputs.select`, `brain-issues.ojs` line 1840) | lost | not there |
| A cell edited in the page's editor | the runtime | lost: the page is the shell and the Workers' modules, and the source of both is a seed | not there |

Four places are in use (the address, this browser, a service's rows, the tracker's record) and five rows have
none. `brain_issues2 ADDRESS` is a fifth browser item and is left out of the table: it is a copy of the
tracker's view, not a change of his. The modules of lopecode on the page keep things of their own in the
browser (the Operator's key and model in `robocoop-5-engine`); those were not listed.

Nothing writes down which place a new change goes in. `knowledge/keeping-user-state-in-the-saved-notebook.md`
is the one doc on it, and it answers for a notebook the reader saves: "the state is written into that file when
the notebook is saved". The Brain's page is not saved by him: the shell is posted with the recovery key
(`brain.ts shell`) and the modules come from the Workers. That doc's hook fires on any edit that names
`localStorage`, so a writer of a page module is told to use `sticky`, which on this page writes into a cell
nothing saves.

## Requirements

- **R1.** A note he puts away with × stays away over a load of the page, whatever the state of its issue.
- **R2.** He can see which notes are put away and bring one back.
- **R3.** He still gets the signal of 2026-10-11 when the work is done, and Remove is still for good.
- **R4.** One written rule says where a change made on the page is kept, by what the change is, so the next
  module's writer does not choose again. It is read before a seed is edited.
- **R5.** Nothing is added that another member, or a token of the loop, can use to change what his page shows.
  (Line 1 of `philosophy.md`. Today the label `annotation` is the owner present in the tracker's code,
  `label-guard-token-removes-annotation`, deployed 2026-10-13.)

## The options

The choice is where the fact "he put this note away" is kept. Each row: what is kept, where, who else sees it,
how it is undone, what it costs to build.

| | Kept | Who else sees it | Undone by | Build |
|---|---|---|---|---|
| **A. In this browser** | a set of issue ids in one `localStorage` item for the Brain's address, beside the drafts | nobody; not his phone or a second browser either | a list of what is put away, with Show; or clearing the site's data | one task in `brain-feedback.ojs`, no deploy, one post of the shell |
| **B. On the Brain, for him** | the same set as a private file of `brain-x-static`, written with his session | every browser he signs in from; no member and no token (a file private to its maker) | the same list | one task, larger: the copy is read over the network before the first notes are placed, and two tabs write one file, the last one holding |
| **C. In the tracker, as a second label** | a label `annotation-hidden` on the issue | every browser, and every reader of the record: each × is a signed event | taking the label off | two tasks and a deploy of `brain-x-issues`: a token may put any label but `annotation` and `major` today, so the new name needs the guard in the tracker's code, or a writer of the loop could hide his notes (R5) |
| **D. × is Remove** | nothing new: × takes `annotation` off at any state | every browser | **Add label** on the issue in the Issues panel (`brain-issues.ojs`, line 26) | the smallest: lines deleted. He loses the signal when the work is done (R3 is not met) |
| **E. The page is his to save** | his changes as cells of a module of his own, saved to the Brain, which the shell loads | whoever the module is served to | editing or dropping the module | a project of its own: where the module is kept, a Save, and what happens to his cells when a seed changes under them |

What each costs him after it is built:

- **A.** The notes he put away on the laptop are on the phone's page again. Safari forgets the set after 7 days
  in which he did not use the page there (WebKit, above; read in a summary). The drafts have had both costs since
  2026-10-11.
- **B.** One more request at each load and at each ×. No cost in money was measured: `static.put` of a file of
  a few hundred bytes.
- **C.** The record of the work gains events that are about his screen: its last event was 6131 at 08:59 CEST, on a tracker begun 2026-10-10, and each × would add one.
- **E.** Is the lopecode way, and the only one of the five that would also keep a cell he edited. It is the
  largest by far and nothing he reported needs it.

### The pick: A, with the rule of the next part

By line 2 of `philosophy.md`, the side that is smaller and easier to undo: A adds no call, no file and no
deploy, and B can be put under it later without changing the notes, because the app takes its copy as a pair
`{ get, set }` already (`feedbackApp({ kept })`). B is the answer when he reads the page from more than one
browser; whether he does is his to say and nothing in the record shows it.

## The rule (R4)

A change made on the page is kept by what it is. This is what the page does today for eight of the thirteen rows
above, written down; the pick puts a ninth under it.

| The change is | Kept in | Today |
|---|---|---|
| a fact about the work, which any reader or any browser should have | the record or the rows of the service it belongs to | a note filed, Remove, a dashboard, a setting |
| what he is looking at, which a link should carry | the address | the panes, the dashboard shown |
| something of his own that he put out of sight, or has not sent yet | this browser, one item a module for a Brain's address, read and written through a pair `{ get, set }` the tests replace | the drafts; with pm-1, the notes put away |
| a change to what the page is or does | the seed, through a note filed on the page | every cell |

What the rule leaves where it is: the moved box, the span of Health and the filters of the Issues panel are of
the second or third kind and are kept nowhere. He has not asked for them and no task here builds them
(the dashboards' spec left the span out as "Not asked").

Falsified by: a change that is of two kinds at once. The × of a note is close to one: under C it is a fact of
the record. The rule calls it his own because nobody else acts on it.

## The design of the pick

In `brain-feedback.ojs` alone.

- `feedbackKept(brain, what = "drafts")`: the item is `brain_feedback_<what> ADDRESS`. With no second argument
  it is today's item, so a draft kept before the change is read after it.
- `feedbackApp` takes `away = { get, set }`, as it takes `kept`. With none given the set is in memory, as today.
  On the page it is `feedbackKept(brainOrigin, "away")`: the item `brain_feedback_away ADDRESS`, an object of
  issue id to the time it was put away.
- `gone`: for a note whose work is not done, the id is added and the item written.
- `sync`, on every ask (30 s), reads the item again, so a × in a second tab holds in the first from its next ask.
  A listed issue that is in it and is not done gets no note. One that is in it and is done gets its note, which
  reads **Done** with Remove, and its entry is dropped: that is the signal of R3. An entry whose issue is no
  longer in the list is dropped.
- A cell `feedbackAway` in the module: "N notes put away in this browser", a line for each with the issue's id,
  its title and its state, and **Show**, which drops the entry and places the note on the next ask. With none it
  says so. He reaches it by opening the module's pane (`#open=@tomlarkworthy/brain-feedback`), which the seed's
  first cell says in the row Remove.
- The first cell: the row Remove says what × does at each state and where the list is; the paragraph on the
  drafts names the second item.
- Tests: the three places that assert "back on the next load" (lines 660, 668, 694) assert the opposite with a
  copy given, and the same as today with none. New: put away, load, not placed; done, placed once with Remove
  and the entry gone; Show; a second tab; a copy that is not an object places every note.

Not covered: a note put away in one browser is there in another (the cost of A). A note put away and then
reopened after Done is placed, as any note with the label.

## Not chosen

- **B, C, D, E**: in the table above, each with its cost. B is the one to take up again, on his word that he
  uses a second browser.
- **A second browser item beside the drafts' one.** The design adds one standing thing, the item
  `brain_feedback_away ADDRESS`. What exists of the same job is `brain_feedback_drafts ADDRESS`, written by
  `feedbackKept`. The function is extended and the item is not: the drafts' item is a map of note names to
  drafts, and `placeAgain`, `keep` and the app's first loop each walk every key of it as a draft.
- **A cell shared by every module for the third kind of the rule** (`brain-shell`, one `{ get, set }` for
  `feedbackKept` and `issuesStore`). Two modules keep three items today with twelve lines each; the two differ
  (one removes an empty item, one keeps a view that is checked against the record's head). Not made until a third
  module needs one.
- **A new method or a table on a Worker for what a person keeps.** `static.put` of a private file does that job
  (option B), found in `brain-static.ojs`, "Tags": a file carries `by:<did>` and is private until set public.
- **`config.set` on `brain-x-page`.** It is the owner's and is kept on the Brain, but a value is at most 500
  characters and the core logs each change as a setting of a Worker (`brain-core.ojs`, line 32).
- **The address.** A list of issue ids in `#…` is lost at the bare address, which is where he starts.
- **A new knowledge doc for the rule.** `knowledge/changing-and-deploying-a-cloud-brain-worker.md` is what the
  hook has a writer read before an edit under `tools/cloud-brain/`; the rule is a section of it.
  `knowledge/keeping-user-state-in-the-saved-notebook.md` is not edited: its scope is `in-notebook`, so a change
  to it is shipped into the notebooks of `lopecode`, which the loop does not push.
- **A role, a tool, a token, a Worker.** None is added. Looked for in `.claude/skills/brain-maintenance/agents/`,
  in `https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/index.md` (three role files: `reviewer`,
  `summarizer`, `paper-summarizer`) and in `tools/cloud-brain/`: `feedback-reload-check.ts` is the tool that
  loads the page again and prints the notes, and pm-1 extends it.

## How each requirement is known to be met

Each is run in the worktree of its task with no token but the writer's own. `$N` is
`tools/cloud-brain/.emitted/cloud-brain.html`, built by `bun tools/cloud-brain/build.ts --out $N`.

| | Check | Today (run 2026-10-13, 09:02 to 09:05 CEST) | After its task |
|---|---|---|---|
| R1, R3 | `bun tools/lope-tests.ts $N --filter test_feedback` | `14 passed, 0 failed … 14 total` | Cannot be run before pm-1 is built. Then: 0 failed, and among the passed `test_feedback_a_note_put_away_stays_away_over_a_load` and `test_feedback_a_note_put_away_comes_back_once_when_done`. |
| R1 | `grep -c "back on the next load" tools/cloud-brain/brain-feedback.ojs` | `3` | `0` (run on a copy of the seed with the three phrases reworded: `0`) |
| R1, R2 | `bun tools/cloud-brain/feedback-reload-check.ts $N`, extended by pm-1 with three points: a filed note of an open issue put away with ×, the page loaded again, Show pressed | not run today: the tool has no such points | Cannot be run before pm-1 is built. Then, in a local headless Chrome on the built file, over the module's rig (a file has no `brainOrigin`, so the app is made over the rig as the tool does now): `notes` is `[]` after the load and has the issue's note after Show. |
| R2 | in the same run of the tests, `test_feedback_away_lists_what_is_put_away_and_show_places_it` | no such test | passed |
| R4 | `grep -c "## Where a change made on the Brain's page is kept" knowledge/changing-and-deploying-a-cloud-brain-worker.md` | `0` | `1`; and `bun test tests/tools/pm-2-page-changes-kept.test.ts`, which holds the four kinds and the names `feedbackKept` and `brain_feedback_away`, 0 fail. Cannot be run before pm-2. |
| R5 | `grep -c "brain_feedback_" tools/cloud-brain/brain-feedback.ojs` and no new `client.procedure(` in `gone` | `4`; `gone` has one, `issue.label` | the count is the writer's to give; `gone` still has one `client.procedure(`, so a × sends nothing |

For the owner alone, and no condition of a task landing: on cb4, signed in, after the shell is posted, a note
he puts away is not there after a refresh, and the list has it. The loop does not open the Brain's own page in
a browser of the cluster (`rules.md`, Never).

## The tasks

- **pm-1-notes-put-away-are-kept.** After nothing. `brain-feedback.ojs` as "The design of the pick" has it, its
  tests, and the three points of `feedback-reload-check.ts`. No Worker's module changes and nothing is deployed.
  It is on cb4 when the orchestrating session posts the shell, on its standing leave (`rules.md`, "Two standing
  leaves": `brain-feedback` is one of the six modules). This is the fix of `page-notes-return-after-a-refresh`.
- **pm-2-rule-in-the-doc.** After pm-1. The section "Where a change made on the Brain's page is kept" in
  `knowledge/changing-and-deploying-a-cloud-brain-worker.md`: the table of "The rule" with the rows that
  have no place, one sentence that the saved-notebook doc is for a file the reader saves, and
  `tests/tools/pm-2-page-changes-kept.test.ts`.

No wait that is not for a task.

If he picks B: pm-1 is the same but for the copy, which is `static.get` and `static.put` of one private file
with his session, read once before the first ask; pm-2 names that file in the third row. If he picks C, D or E
this spec is sent back: none of them is designed here beyond its row.

## What only the owner can do

- Choose between A and B (and C, D, E).
- Say whether he reads the page from more than one browser.
- Look at his page after the shell is posted (above).

No deploy of the kernel, the core, the database or the deployer, no policy and no rule.

## What the orchestrator makes

No token: the checks call nothing on cb4, and under B the page writes the file with the owner's own session.
The post of the shell after pm-1 passes review is the orchestrating session's, as above.
