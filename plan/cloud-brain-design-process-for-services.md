# Cloud Brain: a design round before the spec of a thing a person looks at

Spec of the issue `design-process-for-services`, written 2026-10-13 by the spec writer `spec-22537e`.
Nothing is built by it. It is the research he asked for first, four ways to do what he asked with a
pick, and a trial of the pick on one project before any brief of the loop is changed.

## What was asked

Tom, 2026-10-13, to the session `out-5f56b2`, one message for two issues, whole, as the body of the
issue has it (event 7022):

> Our dashboarding service doesn't really let explore metrics and create dashboards on the fly. I think the new world order is agentic dashboard, so I wonder if we can use a customized robocoop-5 personality on the dashboard service page to help author dashboards. This is a whole product thing. Brushing, going deeper. I think we are quite weak at design, I think we need a better process than just a bunch of bots run off an build something... a design process, wireframes, understanding the needs, ideations and picking favourites. We need to apply design process to services. Research theory and explore other products.

The first half is the issue `agentic-dashboards`. This spec is of the second half, from "I think we
are quite weak at design".

What the design rests on beyond those words. Each is marked, and his approval is where he says
otherwise:

- "picking favourites": a reading of this writer, not his words: he is the one who picks, he may name more than one idea or parts of several, and he picks before a spec is written.
- "wireframes": a reading of this writer, not his words: drawings of low fidelity, grey boxes with the real labels, and not finished screens.
- "services": a reading of this writer, not his words: a project that adds or changes something a person looks at (a panel of the page, a page, a control). A tool, a brief or a method with no face gets no design round.
- "Research theory and explore other products": a reading of this writer, not his words: asked twice over, of this spec (the part "Read") and of every design round after it (other products that do the job of that service).
- The trial is made on `agentic-dashboards`: a reading of this writer, not his words. The session that opened the two issues read it the same way ("reads as the first thing to go through it").

## The gathered reports

None. `list?parent=design-process-for-services` answered `{"issues":[],"total":0}` on 2026-10-13. The
issue is his message and six readings of the session that opened it. Those readings are data here:
five are taken up above or under "The options", and its last ("Not known: whether he wants a role of
the loop (a designer), a stage of the workflow, a use of Claude Design, or himself in the room for
the picking") is the four options.

## Read

In the Brain first, with `knowledge.search?semantic=true` as `loop-knowledge`, 2026-10-13:

| Search | Found | Used |
|---|---|---|
| `design process wireframes ideation` | `doc:designer-resources-for-notebooks` 0.593, `doc:preparing-a-good-claude-design-spec-handover` 0.478; the rest papers on self-improving agents | both docs, read whole |
| `user needs interface design of a panel` | the same two; `doc:cloud-brain-dashboards-share-series-and-controls` 0.631 | that spec, for what a spec of a panel has today |
| `claude design handover brief` | `doc:preparing-a-good-claude-design-spec-handover` 1.0 | option C |
| `several alternatives shown owner picks` | `doc:pm-second-summarizer-role` 0.608, `doc:cloud-brain-approver-persona` 0.5 | the first, for "Not chosen" |
| `prototyping parallel design alternatives LLM` | eight papers on agent evolution, none on design | nothing |
| `spec notebook svg drawings annotate` | `module:tomlarkworthy:svg-lens` 0.764, `module:tomlarkworthy:annotate` 0.792 | the `/spec` skill, which is built on them |

The Brain holds no doc on needs, ideation or wireframes. It holds two things of the same job:
`.claude/skills/spec/` (a spec as a notebook, with one drawing a state; found by the listing of the
skills, not by the search) and the Claude Design handover.

Outside, by one sub-agent with web search, 2026-10-13. "Read" is the paper's or the page's own text;
"summary" is somebody else's account of it.

| Source | What it says | Read how |
|---|---|---|
| Dow et al., "Parallel prototyping leads to better design results", TOCHI 17(4), 2010. https://hci.stanford.edu/publications/2010/parallel-prototyping/ParallelPrototyping2010-submitted.pdf | 33 ads by novices. Three prototypes made before the first critique, against one at a time: 445.0 against 397.9 clicks a million impressions (p<.05), experts' rating 24.4 against 21.7 of 50, and the prototypes less alike. One task, novices | read, pages 1, 2, 5, 6 |
| Tohidi, Buxton, Baecker, Sellen, "Getting the right design and the design right", CHI 2006. https://www.billbuxton.com/rightDesign.pdf | 48 people. Shown one design they "give significantly higher ratings and were more reluctant to criticize" than when the same design was one of three | the abstract and the introduction; the results were not read |
| Nielsen, "Parallel & iterative design", of Nielsen and Faber 1996. https://www.nngroup.com/articles/parallel-and-iterative-design/ | One case: four designs made apart and merged, 70% better than the first design, against 18% for one design made twice. At least 3 alternatives, 5 at most | the article; the paper was not read |
| Design Council, the Double Diamond. https://www.designcouncil.org.uk/our-resources/framework-for-innovation/ | Two rounds of widening and narrowing: the problem first ("understand, rather than simply assume, what the problem is"), then "different answers to the clearly defined problem" | the page |
| Singer, Shape Up, chapters 3 and 4. https://basecamp.com/shapeup/1.3-chapter-04 | A breadboard is places, affordances and the lines between them, "words for everything instead of pictures"; a sketch with "such broad strokes that adding detail is difficult or impossible" | the pages |
| The design sprint. https://www.gv.com/sprint/ | Map, sketch, decide, prototype, test. One person, the Decider, makes the call after sketches made alone are shown side by side | the days from the page; the Decider from a summary (https://seeds.storaenso.com/toolkit/design-sprint/) |
| Job stories. https://thoughtbot.com/blog/converting-to-jobs-stories.md | A need written as "When [situation], I want to [motivation], so I can [outcome]" | summary; Klement's own post answered 403 |
| Deng, Brucks, Toubia, arXiv 2602.20408. https://arxiv.org/abs/2602.20408 | A model's first ideas constrain its later ones; ordinary personas raised the diversity of the set | the abstract |
| Terwiesch et al., arXiv 2607.27553. https://arxiv.org/abs/2607.27553 | Sets of ideas from a model are less diverse than people's; personas, constraints and more ideas bring them near | the abstract |
| Anderson, Shah, Kreminski, C&C 2024. https://arxiv.org/abs/2402.01536 | 36 people: those with ChatGPT made ideas less distinct from each other's | the abstract |
| Honeycomb BubbleUp. https://docs.honeycomb.io/investigate/analyze/identify-outliers/ | A box drawn on a chart is compared with the rest, and the next filter is offered from it. For `agentic-dashboards`, not for this spec | the docs |

Other products that make an interface with a model, each from one page and none from a run of the
product: Google Stitch offers variants of a screen (three by default, in a tutorial; summary), Magic
Patterns four (its docs), Lovable asks questions and writes one plan before code (its docs), tldraw
"make real" turns one drawing into one page (its blog). All four draw finished screens; none found
writes the need down with its source. No study was found that measures how alike a model's
alternatives for an interface are.

What was used: three ideas shown together, made apart (Dow; Tohidi; Nielsen; the three papers on
models); the need before the ideas (the Double Diamond; job stories); low fidelity with real words
(Shape Up); one person who picks (the sprint). Not found, so not claimed: that any of it holds when
the designers are agents and one person picks.

## What exists today, measured

All on 2026-10-13, in the worktree at `daaf51ae` or on cb4.

- **No spec of the loop has a drawing.** `ls plan/cloud-brain-*.md` is 36 files.
  `grep -il "wirefram\|mockup\|sketch\|artboard\|<svg"` over them prints none, and so does
  `grep -l "┌\|+----"`. 34 of the 36 name a panel or "the page".
- **The spec writer's brief asks for none of it.** In `.claude/skills/brain-maintenance/agents/spec.md`
  `grep -c -i` answers 0 for each of `wirefram`, `the need`, `ideat`, `several ideas`, `favourit` and
  `drawing`. Step 5 asks for "the smallest design that meets the requirements, and what was not
  chosen and why": one design, with the others as sentences by the writer who had chosen.
- **He is shown one design and letters about it.** A project is at `spec` a median 12 minutes
  (62 stays) and at `spec-review` 3.3 minutes (58 stays), from `issue-stats.ts`. The letters of the
  comment he approves by are of the one design: approve, approve with a change, reject.
- **The case he names.** `dashboard-service` was approved by him 2026-10-11 17:14 UTC and finished
  2026-10-13 07:43 UTC. He said it "doesn't really let explore metrics and create dashboards on the
  fly" the same day, before 19:20 UTC. `grep -c -i 'explor\|on the fly\|brush\|drill'` of its spec,
  `plan/cloud-brain-dashboard-service.md`, answers 0: the spec has what a dashboard is and nothing
  of what he would do with one.
- **What has a face.** 17 functions named `…Panel` in 13 of the 34 seeds of `tools/cloud-brain/`.
- **His notes on the page.** One issue has the label `annotation` (`fb-a2k9vvmfvv`, a panel that
  refreshes while he scrolls). So what he thinks of a face mostly reaches the loop in chat.
- **A spec as a notebook, with drawings.** `.claude/skills/spec/`, built 2026-10-04:
  `tools/spec-notebook.ts` builds `plan/specs/<slug>.html` from a seed, with an `artboard_<state>`
  cell a state, each an SVG he can drag, and a table `questions`. It is made for a session he is in,
  paired on a `file://` address. The loop's spec writer does not use it. Run in this worktree:
  the template built in 1.68 s to 4,802,215 bytes, exit 0.
- **Claude Design.** A design system of 17 components is bound there
  (`knowledge/designer-resources-for-notebooks.md`). Two handovers on 2026-08-29, one shipped and one
  he called "a really bad handover that wasted time"
  (`knowledge/preparing-a-good-claude-design-spec-handover.md`). The brief goes as a zip that he
  drags into the chat: no agent of the loop can send it or read what comes back.
- **A page an agent publishes for him.** `library.put` with the token `loop-library`: the digest
  writer puts a notebook of 4.8 MB each day, served at `/library/<name>` with scripts and no origin
  (`agents/digest.md`, step 8; `rules.md`, "Publishing a notebook").
- **A wait for his word at `spec`.** `tools/cloud-brain/loop.ts`, the function `owners`: an issue
  labeled `needs-owner` is left until an event of his follows the label, and is then judged
  (`judge(id, "answer", …)`). What that judgment does with an issue at `spec` was not read.

## Requirements

- **R1.** The need is written before any idea, each need with where it comes from: his words with
  their date, an issue, or a count.
- **R2.** Other products that do the job are read first, three at least, each with its address.
- **R3.** Three ideas that differ in what the person does, each made without sight of the others.
- **R4.** Each idea is a drawing he opens in the cluster, at an address.
- **R5.** He picks before a spec is written, and nothing is built before he picks.
- **R6.** It holds for every project with a face, and the writer says in the record which it took the
  project for.
- **R7.** What a round costs is measured on one project before the briefs are changed.
- **R8.** Nothing is made beside a thing that has the same job.

## The options

| | What it is | For | Against |
|---|---|---|---|
| **A** | A design round at the start of the spec writer's run: needs, three ideas, a sheet of wireframes at an address, his pick, then the spec of what he picked | no new role, state, tool or token; built from the `/spec` notebook and the library | the sheet reaches him with no review; one more wait for him on each such project |
| **B** | A role `designer` with its brief, and states `design` and `pick` in the project workflow | a reviewer reads the sheet before he does; the record has the round as states | a policy he installs, a brief, a token role and a row of the driver, for the same writing as A |
| **C** | Claude Design draws: the loop writes the brief, he drags the zip in and sends back what it drew | finished screens, from the bound components | his hand twice a project; one design unless asked for more; one of two handovers failed |
| **D** | He is in the room: `/spec` in a session of his, for each such project | exists today; he drags the shapes himself | not the loop: nothing happens while he is away, and the session's one writer makes every idea |

**The pick: A.** It is the smallest that meets R1 to R5, and each part of it exists. B is A with a
review and a policy, and is what to go to if the trial shows sheets that waste his time. C is not
dropped: after his pick, a face that is worth finished screens is handed to Claude Design by the
existing guide, by him, and that is no part of this spec. D stays as it is.

## The design of A: the design round

A project "has a face" when it adds or changes something a person looks at. The spec writer decides
at step 2 of its brief and says which in the reason of a comment; with no face, the brief is as today.

With a face, before step 5:

1. **Needs.** Three to seven, each one line, "When …, I want to …, so I can …", each with its
   source: his words quoted with the date, an issue's id, or a count with its command. Then a list
   "Not known", of what the writer would ask him. A need with no source is put in that list.
2. **Other products.** Three at least, each with the address read, what it does for one of the needs
   in a sentence, and whether its own page was read or a summary.
3. **Three ideas.** The writer gives each idea one line that says what the person does first, and
   the three lines differ in that (a table to filter, a question typed, a chart to mark). Each idea
   is then drawn by a sub-agent of its own, which is given the needs, the other products, its one
   line and the service's method reference, and not the other two ideas. It answers a breadboard
   (the places, what can be done in each, where each leads, in words) and one wireframe.
4. **A wireframe** is one SVG at the width of the panel, in grey, of the state with data. Its labels
   and field names are the service's own, from its method reference or its panel's source. No
   colour, no icon, no second state. Under it, two lines by the writer: what the idea is best at,
   and what it is worst at.
5. **The sheet** is a notebook built with `tools/spec-notebook.ts` from the template of the `/spec`
   skill: the needs and the products as prose, each idea an `artboard_<letter>` cell with a row of
   `states` (`{ state: "idea A", drawing: "artboard_a", … }`), the sections of a spec that a sheet has
   no use for deleted from the seed, as that skill says. The seed is committed as
   `plan/design/<id>.ojs`; the built file is not committed.
6. **Published** with `library.put?name=design-<id>` as `loop-library`, not public, so that it opens
   for him at `https://cb4.endpointservices.workers.dev/library/design-<id>` and for nobody else.
7. **Asked.** One comment on the project, in the form of `rules.md`, "What the owner is asked to
   decide": what the project is for, the need in a sentence, the address, a line a letter for the
   ideas, the writer's pick, and that he may name several or parts. Then the label `needs-owner`.
   The writer's run ends there, with the project at `spec`.
8. **After his word**, the round is the spec writer's. The spec's "What was asked" quotes his pick,
   the picked wireframe's seed cell is named in the spec, and each task that draws a part of the
   face names the part of the wireframe it draws.

What is not known of it, and what the trial is for: whether a notebook of that template opens from
the library under the header a token's put is served with (the digests do; no spec notebook was
tried); what the page opens on, since the build writes a `file://` address with panes for pairing;
what a round costs; and what the driver's judgment does at his answer.

## Not chosen

- **A role `designer`, and its brief.** `agents/spec.md` and its writer do the same job for the same
  purpose, saying what is to be built before it is built, and are extended. A second role would have
  a second token role, a row of the driver and a hand-over between two agents of the need.
- **States `design` and `pick`.** `spec` with the label `needs-owner` holds the project for his
  word today (`loop.ts`, `owners`), and is used. New states are a policy only he installs.
- **A tool that builds a sheet.** `tools/spec-notebook.ts` builds a page with drawings from a seed,
  and is used as it is. Run 2026-10-13: the template with its two drawings renamed `artboard_a`
  and `artboard_b` and their rows renamed built with exit 0, and the module read back had both rows.
- **A template of its own for a sheet.** `.claude/skills/spec/template.ojs` is used, with sections
  deleted. A second template is a second file to keep in step with the build.
- **A token for the put.** `loop-library` names `library.put` alone and is used. Its use until now
  is the digest's; this spec widens the use to a design sheet named `design-<id>`, and
  `rules.md`, "Publishing a notebook", gets that sentence in ds-3.
- **A store for the sheets.** Seeds in `plan/design/`, beside the specs in `plan/`. `plan/specs/`
  holds built files of 4.8 MB each, and a seed is what a later round changes.
- **A review of the sheet before he sees it.** A round of a writer and a reviewer cost 167,000 to
  266,000 tokens on 2026-10-10 (`philosophy.md`, line 5), and what a sheet is for is his critique of
  rough drawings. The spec's own review comes after, and reads the spec against the pick.
- **The issue's attachments, for the drawings.** `issue.attach` keeps an SVG, and the panel "saves
  the bytes as a file of that name; it is not opened in the page" (`brain-issues.ojs`, the
  reference). He would save three files to see three drawings.
- **One agent for all three ideas.** The first idea constrains the later ones (Deng et al.), and the
  cost of three small runs is not known to be more than his time on three drawings of one idea.
- **Five ideas, or finished screens.** Three is the least the sources ask for. A finished screen is
  read as decided (Tohidi et al. on one design; Shape Up on detail), and is option C after the pick.
- **Changing the brief now.** His words ask for research first, and no round has been run. The
  trial is made by the text above, and the brief is written from what the trial found.
- **A check of the built face against the wireframe at review.** Wanted, and not designed: nothing
  has been built from a wireframe yet. It is a question of ds-4.

## How each requirement is known to be met

Each by an agent with its own token. Run before this submit where it can be; said where it cannot.

| | Check | Result |
|---|---|---|
| R1, R2, R3 | After ds-3: `bun test tests/tools/spec-brief-design-round.test.ts`, which reads `agents/spec.md` for the round's items by their words, as `tests/tools/spec-brief-names-what-exists.test.ts` does for step 5 | not run: the test is written in ds-3. The two tests of the brief that exist ran 7 pass, 0 fail on 2026-10-13 |
| R3, R4 | After ds-1: `bun tools/lope-reader.ts <built file> --get-module @spec/design-agentic-dashboards` has three cells `artboard_a`, `artboard_b`, `artboard_c` and three rows of `states` | the same read of a probe with two renamed drawings printed `state: "idea A", drawing: "artboard_a"` and `state: "idea B", drawing: "artboard_b"`, 2026-10-13; the probe was removed |
| R4 | After ds-1: the answer of the `library.put` has `"sandboxed":true` and the `sha256` of the built file (`shasum -a 256`) | not run: a put writes to cb4, and this run builds nothing. Whether the page draws there is seen by the writer of ds-1 in a QA tab opened on a copy served with the same header, and by him at the address; an agent's token does not read a notebook that is not public |
| R5 | After ds-2: `ia "get?id=agentic-dashboards"` has an event of his after the comment of the sheet; after ds-3 the test above holds the words "nothing is built" and the label | not run |
| R6 | After ds-3: the test holds the sentence that the writer says which it took the project for | not run |
| R7 | After ds-1: its record has the tokens and the seconds of the run, from the `cost` events of `ia "get?id=ds-1-pilot-sheet"` | not run |
| R8 | `grep -c "designer" .claude/skills/brain-maintenance/agents/*.md` is 0 after ds-3, and `ls tools/cloud-brain/*.ts \| wc -l` is what it was before it | run 2026-10-13: 0 in each of the seven files, and 30 |

## The tasks

- **`ds-1-pilot-sheet`.** After nothing. The design round of `agentic-dashboards`, steps 1 to 6 of
  "The design of A", made by that text with no brief changed: the seed `plan/design/agentic-dashboards.ojs`,
  the sheet published as `design-agentic-dashboards`, and a record
  `tools/cloud-brain/records/ds-1-pilot-sheet.md` with what the round cost, whether the page opened
  from the library and on what, and each sentence of the text that had to be guessed at. Its writer
  reads the spec of `agentic-dashboards` if one is landed and does not draw from it: the three ideas
  come from the needs.
- **`ds-2-owner-pick`.** After ds-1-pilot-sheet.
  The owner's: he opens the sheet, says which ideas he takes for `agentic-dashboards`, and says whether the round is to be made for every project with a face.
- **`ds-3-brief-and-rules`.** After ds-2-owner-pick. With his yes: `agents/spec.md` gets the round
  as steps, changed by what ds-1's record found; `.claude/skills/spec/SKILL.md` a paragraph on a
  sheet; `rules.md`, "Publishing a notebook", the sentence on `design-<id>`; `agents/orchestrator.md`
  what the judgment does at his answer on a project at `spec`, if it has no line for it; and
  `tests/tools/spec-brief-design-round.test.ts`. A change to `rules.md` is `major`. With his no, the
  task is closed with his words.
- **`ds-4-read-after-three`.** After ds-3-brief-and-rules. A wait that is not for a task: until three
  projects have a sheet he picked from. Read then, from the record: how often he picked other than
  the writer's pick, the median cost of a round, the time each project waited for his pick, and the
  feedback issues about each built face in its first seven days. The task says whether to keep the
  round, go to B, or add the check of the built face against the wireframe.

## What only the owner can do

- `ds-2-owner-pick`: his pick from the pilot sheet, and his word on the round.
- The approval of ds-3, which changes `rules.md`.
- Whether the spec of `agentic-dashboards`, which another writer (`spec-4608e3`) began at 19:21 UTC
  on 2026-10-13, waits for ds-2. This writer would have it wait: approved first, it is one design
  shown alone once more. The move is his or the orchestrator's, not this spec's.

## What the orchestrator makes

Nothing. `loop-library` exists and no token is added.
