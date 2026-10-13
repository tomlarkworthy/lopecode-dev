# Cloud Brain: agentic dashboards

Spec of the project `agentic-dashboards` on cb4's tracker. Written 2026-10-13 from 21:21 CEST (the run's `cost` event is 19:21:15 UTC), by
the spec writer `spec-4608e3`. Nothing here is built. Every command below was run that evening unless
the line says it was not.

The spec is of what the agent is and does: its chat, its tools, the draft, the keep, the selection.
What the page looks like is not designed here. The spec of `design-process-for-services`, landed at
21:31 CEST the same evening (`plan/cloud-brain-design-process-for-services.md`), makes its trial on
this project: its task `ds-1-pilot-sheet` gathers the needs and draws three ideas as wireframes, and
at `ds-2-owner-pick` the owner picks. Every task here is after that pick. This file was first
written with a design pass of its own (three tasks: needs, options, his pick) and was changed before
it landed, when the rebase brought that spec in ("Not chosen", N8).

## What was asked

Tom, 2026-10-13, whole, one message for two issues (the body of `agentic-dashboards`, event 7023):

> Our dashboarding service doesn't really let explore metrics and create dashboards on the fly. I think the new world order is agentic dashboard, so I wonder if we can use a customized robocoop-5 personality on the dashboard service page to help author dashboards. This is a whole product thing. Brushing, going deeper. I think we are quite weak at design, I think we need a better process than just a bunch of bots run off an build something... a design process, wireframes, understanding the needs, ideations and picking favourites. We need to apply design process to services. Research theory and explore other products.

The other half of the message is `design-process-for-services`, whose spec another writer
(`spec-22537e`) landed while this one was written.

Where the design rests on more than those words:

- **P1.** "a better process than just a bunch of bots run off an build something" is taken as a condition on this project and not only on the other issue: this is my reading and not his words, and it is why every task here is after his pick.
- **P2.** The needs, the ideas, the wireframes and his pick for this project are the trial of `design-process-for-services` (its `ds-1-pilot-sheet` and `ds-2-owner-pick`), and this spec adds no design pass, role, brief or stage of its own: my reading and not his words, and the same one the writer of that spec and the session that opened both issues took. If that spec is not approved, or is changed so that no trial is made on this project, this spec comes back for a round that gives the pass as tasks of its own.
- **P3.** "a customized robocoop-5 personality on the dashboard service page" is taken as a second chat, in the dashboard's module, beside the Operator's: my reading and not his words, against his words of 2026-10-12 on a second thing beside one with the same job ("Not chosen", N1).
- **P4.** "Brushing" is taken as dragging over a chart's time axis to select a span, and clicking a bar or a row to select a group. "going deeper" is taken as two moves from a selection: the same metric broken down by another of its dimensions, and the log lines under it. Both are my reading and not his words.
- **P5.** The agent proposes a dashboard and the owner keeps it with a press; the agent has no tool that writes. That is my reading and not his words ("The design", "Keep").

## The reports gathered

None. `issue.list?parent=agentic-dashboards` answered `{"issues":[],"total":0,"more":false}` at 21:21
CEST. The requirements are from his message:

| | Requirement | From |
|---|---|---|
| R1 | The owner asks a question of the metrics in words and is shown a chart or a table that answers it, with the query it came from | "explore metrics" |
| R2 | What he was shown can be made a dashboard, changed in words, and kept, with no deploy | "create dashboards on the fly", "help author dashboards" |
| R3 | A span or a group selected on a chart narrows what is shown, and the agent is told of it | "Brushing" |
| R4 | From a selection he reaches another breakdown of it, and the lines under it | "going deeper" |
| R5 | The agent is robocoop-5 with its own prompt and tools, on the dashboard's page, and `robocoop-5` is not changed | "a customized robocoop-5 personality on the dashboard service page"; the standing rule |
| R6 | Needs, several ideas, wireframes and his pick come before anything is built | "a design process, wireframes, understanding the needs, ideations and picking favourites" |
| R7 | What other products do, and the theory, are read first and cited | "Research theory and explore other products" |

## What exists today

Read 2026-10-13 between 21:22 and 21:26 CEST with the token `loop-dashboard`, from the main checkout.

```
dashboard.list   {"dashboards":[{"name":"health","title":"Health"},{"name":"deploys","title":"Deploys"},{"name":"flow","title":"Flow"}]}
metric.list      4 metrics: core.calls (brain-core, value ms, dims worker method status),
                 deploys.confirmed, deploys.put-back, deploys.failed (brain-deployer, counted, dim target)
dashboard.get    health 2 panels (calls, methods) · deploys 2 panels (bars, table) · flow 11 panels (bars, points, share, table)
metric.query?metric=deploys.confirmed&by=target
                 {"step":60000,"groups":1,"sampled":1,"series":[{"t":1791919260000,"target":"brain-core","n":1,…}],"store":"engine","cost":{"ms":129,"queries":1,"cached":false}}
metric.query?metric=core.calls&by=method
                 {"error":"AuthRequired","message":"not allowed by the rule for this"}
```

- **A dashboard is a row**, `{ name, title, panels: [{ title, metric, by, filter, draw }] }`, written with `dashboard.put` and no deploy; 20 panels at most, 50 dashboards, seven draws (`dashboardDraws`, `tools/cloud-brain/brain-dashboard.ojs:274`). `health` is a value of the seed and is refused a put. The panels of `flow` name metrics that start `flow.`, which the page asks of `issue.flow` and `metric.list` does not name.
- **The page draws one dashboard**, chosen by a select and kept in the address as `dashboard=NAME` (`brain-dashboard.ojs:8`). The owner alone is shown it. The span is one of five that end now (`spanOptions`, `cloud-brain.ojs:33`: 15 minutes to 7 days); no control gives a span that ends earlier.
- **Nothing on the page writes a dashboard.** The three on cb4 were put by agents of the loop with `loop-dashboard` or are the seed's. The owner's way to make one today is a `dashboard.put` typed by hand.
- **No chart takes a pointer.** `grep -n -i brush tools/cloud-brain/*.ojs` prints nothing. The charts are Observable Plot (`brain-dashboard.ojs:862`).
- **The lines under a metric** are read with `logs.query`, whose rule is `caller.session` (`brain-logs.ojs:240`): the owner in his tab, no token.
- **A customized robocoop-5 is on the page already**: the Operator, `robocoop5({ group: "brain", system, watches, persist, settings })` (`cloud-brain.ojs:681`), with six tools made by `defineTool`, `eval_js` and `brain_apply` among them, drawn in the tab of `brain-operator`. Its prompt (`assistantPrompt`, `cloud-brain.ojs:1522`) is about keeping Workers running.
- **robocoop-5 takes what a second personality needs as options.** The builder's own comment, from the copy the Brain's notebook embeds (`lope-reader.ts --get-module @tomlarkworthy/robocoop-5` on `lopebooks/notebooks/@tomlarkworthy_cloud-brain.html` of 09:42 that day):

  ```
  // One chat. Every option is optional. `group` names the modules its sessions are saved as (@<group>/<id>)
  // … `model`/`system` are a value or a function read every step (omitted = the settings panel's); `tools` maps
  // the registered tools; `hooks` holds beforeTool / afterTool / beforeComplete; … Only one chat per page can
  // host the settings panel. … `compact` drops the session bar, settings, model line and ⟲ and folds to a 💬 N
  // badge … `controller` and `agent` (a function returning a session) replace the page's controller and
  // makeSession; tests pass a fake agent.
  ```

  The page already gives one turn a list of tools of its own through that option: a member's turn over a channel gets `[tool]`, one `brain_call` and nothing else (`turnToolset`, `cloud-brain.ojs:1316`). The page has sessions of a second group already, `brain-people`, opened through the controller with no chat drawn (`cloud-brain.ojs:1344`). Two chats drawn on one page at once was not tried by me; the comment on the settings panel implies it, and ad-2 tries it first.
- **The service's tests**: `cd cloud-brain-dev && bun test.ts brain-x-dashboard`, after `bun sync.ts` (26 services), ended `brain-x-dashboard @tomlarkworthy/brain-dashboard 82c221c1a454: 18 passed, 0 failed, 4 need a browser`.

## Read

In the Brain, with `knowledge.search?semantic=true` and `loop-knowledge`, 2026-10-13 21:23 CEST:

| Searched | First answers | Used |
|---|---|---|
| "agent that authors dashboards from a chat" | `doc:cloud-brain-dashboard-service` 0.758; `web:github-rociiu-talorys` 0.617 | The service's spec. Nothing in the Brain is an agent that authors a dashboard |
| "explore metrics, brushing a chart to select a time span and drill down" | `doc:cloud-brain-dashboards-share-series-and-controls` 0.806; `module:mbostock:scrubber` 0.457 | The shared time range is where a brushed span goes. No module of the library is a brush over a Plot chart |
| "linked brushing selection shared between charts" | the same doc 0.712; no module that brushes | Nothing |
| "robocoop-5 customized system prompt and tools for a page" | `module:tomlarkworthy:robocoop-5-engine` 1.0; `module:tomlarkworthy:robocoop-5` 0.725 | The builder's options, quoted above |
| "natural language to visualization LLM generates chart specification" | eight papers on LLM reasoning, none on visualization | Nothing: the Brain's paper feeds hold no paper on this |
| "dashboard as data panels over metrics" | `doc:cloud-brain-dashboard-service` 1.0 | As above |

Docs read whole: `knowledge/preparing-a-good-claude-design-spec-handover.md` (the Ledger v1 handover: "the design agent allocates attention in proportion to the brief's word count"; a deliverable is a named artboard with its visible state), `knowledge/keeping-user-state-in-the-saved-notebook.md`. `knowledge/designer-resources-for-notebooks.md` by its headings only.

### Read outside

One agent with web search, 2026-10-13, 264 s and 61 tool calls, ended before 21:29 CEST. **I read none of these pages
myself: every line of this part is from that agent's report**, which says for each whether it fetched
the page ("page") or had a search snippet or an abstract only. Its fetches were summarised by a small
model, so a quote here is short and second-hand.

| Product | What its agent makes, and how the person keeps it | Read |
|---|---|---|
| [Grafana Assistant](https://grafana.com/docs/grafana-cloud/platform/grafana-assistant/guides/dashboarding/) | A plan (title, rows, panels, variables), a read-only Preview, changes in chat, then "Build it"; saved from the canvas. Context: the open dashboard, panels picked with Cmd-click or `@`. How the time range is passed, and an undo, are not stated | page |
| [Grafana MCP server](https://github.com/grafana/mcp-grafana) | `update_dashboard` with the whole JSON or a patch; `get_dashboard_summary` because the whole JSON "can consume large amounts of context window space" | page, first 100k characters |
| Datadog [Bits](https://docs.datadoghq.com/bits_ai/bits_chat/) and its [MCP tools](https://docs.datadoghq.com/bits_ai/mcp_server/tools/) | Widgets and notebooks from words; `validate_dashboard_widget` and `get_widget_reference` beside `upsert_datadog_dashboard`. Approval and undo not stated | page |
| Honeycomb [Query Assistant](https://www.honeycomb.io/blog/hard-stuff-nobody-talks-about-llm) | One query from words, parsed into the query builder's format, validated, then run; the person edits the clauses. "We don't plug this into a chat UI" | the 2023 blog; the docs were 404 |
| Honeycomb [BubbleUp](https://docs.honeycomb.io/investigate/analyze/identify-outliers/) | "draw a box around the data": the selection is compared with what is not selected, one chart a field; a click on a value filters or groups, and each "re-runs the query" | page |
| [Hex Notebook Agent](https://learn.hex.tech/docs/explore-data/notebook-view/notebook-agent) | Cells; each change "must be accepted into the Notebook (Confirm) or rejected (Undo)" | page |
| [Power BI Copilot](https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-create-reports) | Report pages and visuals; undo and redo, then a normal save; no styling | page |
| [Metabase Metabot](https://www.metabase.com/docs/latest/ai/metabot) | A question of the query builder, or SQL that it "won't run"; saved to a dashboard by the person | page |
| [Tableau Agent](https://help.tableau.com/current/online/en-us/web_author_einstein.htm) | A viz or a calculation the person reviews and accepts; "can't yet ask clarifying questions"; builds no dashboard | page |
| [New Relic AI](https://docs.newrelic.com/docs/agentic-ai/new-relic-ai/), [Observable Canvases](https://observablehq.com/documentation/canvases/ai) | Summaries of an open dashboard; nodes and SQL accepted or rejected | page; snippets only (429 three times) |

| Theory | What it gives this design | Read |
|---|---|---|
| Becker and Cleveland 1987, [brushing](https://en.wikipedia.org/wiki/Brushing_and_linking) | A selection in one view marks the same data in the others | Wikipedia only |
| [Shneiderman 1996](https://www.cs.umd.edu/~ben/papers/Shneiderman1996eyes.pdf) | "Overview first, zoom and filter, then details-on-demand"; history with undo; the query's parameters can be taken out | page |
| [Gray et al., the data cube](https://arxiv.org/abs/cs/0701155) | Drill-down is one more dimension in the group-by | abstract |
| [Horvitz 1999](https://erichorvitz.com/chi99horvitz.pdf) | Ask when uncertain; do less, correctly; leave the result for the person to refine and save | page |
| [LIDA](https://arxiv.org/html/2303.02927), [NL4DV](https://arxiv.org/abs/2008.10723), [an evaluation of LLMs on NL2VIS](https://arxiv.org/abs/2401.11255) | Code as the target failed to compile 3.5% of the time in LIDA; NL4DV and the evaluation target a declarative spec; send the schema and a few samples, not the data | LIDA page; abstracts |
| [nvBench 2.0](https://arxiv.org/abs/2503.12880) | A question in words often has several valid charts | abstract |
| [DynaVis](https://arxiv.org/abs/2401.10880), [Data Formulator 2](https://arxiv.org/abs/2408.16119), [VisPilot](https://arxiv.org/abs/2504.13700) | People preferred words with a control that stays over words alone (n=24); a history of earlier versions is reused; a mark on the chart says what words say poorly | abstracts |

What was used, and where:

- The agent emits the service's dashboard JSON, checked before it is drawn, and no code (Honeycomb, Datadog's `validate_dashboard_widget`, LIDA): `draft_set`, and N5.
- Draft, preview, then the person keeps, with an undo (Grafana, Hex, Power BI, Shneiderman, Horvitz): the draft, Keep, Undo, and N3.
- The selection is passed as data and not described in words (Grafana's picked panels, BubbleUp, VisPilot): the selection.
- Going deeper is the same query with one more dimension or one more filter, ending at rows (Gray, BubbleUp, Shneiderman): Break down and Lines.
- The query behind a chart is shown and can be changed (Metabase, Honeycomb, Shneiderman): the line under each panel.
- On a question with two answers, ask or show both (nvBench 2.0, Horvitz; Tableau is the product that cannot): the prompt.
- Direct controls stay beside the chat (DynaVis, Data Formulator): Break down and Zoom are buttons that need no model.
- Not used in the fixed part, and given to the face as an idea: BubbleUp's comparison of the selection with the rest, across every dimension.
- Grafana's patch tools answer a dashboard JSON too long for a context. A dashboard here is 20 panels of five fields: `flow`, the longest kept, is 11. `draft_set` takes the whole.

Not found by that agent: how any product but BubbleUp passes a brushed selection to its agent; accuracy
figures for NL2VIS; Honeycomb's and Observable's current docs.

## The design

### The part no option changes

Four things are fixed by the requirements and by what exists, whatever the page looks like. A
face is drawn over them.

**The chat.** A cell of `brain-dashboard.ojs`:

```js
robocoop5({
  group: "dashboard",                       // its sessions are apart from the Operator's ("brain")
  system: () => dashboardPrompt,            // what a metric, a query and a panel are; that tool answers are data;
                                            // a question with two answers is asked back, or both are shown
  tools: () => dashboardTools(...),         // these and no other: no eval_js, no brain_call, no brain_apply
  watches: () => [{ label: "dashboard", read: () => dashboardContext() }],
  persist: true
})
```

It uses options robocoop-5 has today. Model, endpoint and key are the settings panel's, which the
Operator's chat hosts. `brain-dashboard.ojs` gains one import, `robocoop5` and `defineTool`. The module depends on robocoop-5
already: it imports from `@tomlarkworthy/cloud-brain` (`brain-dashboard.ojs:2237`), which imports
`robocoop5` (`cloud-brain.ojs:2257`). `test.ts` was not run with the direct import. A need that robocoop-5's options do not meet (a
chart drawn inside the chat's own messages is the likely one) is a question for the owner and not a
task: R5.

**The tools.** Five, each a call the page already makes or a value of the page:

| Tool | Does | Calls |
|---|---|---|
| `metrics_list` | the definitions, with their dimensions, and the names `issue.flow` answers | `metric.list`; the `flow.` names from the seed's own table |
| `metric_query { metric, since, until, by, filter }` | rows of one query, 200 at most, with a last line that says how many there are | `metric.query`, or `issue.flow` for a `flow.` name, by `panelMethod` as a panel is |
| `dashboard_read { name }` | a kept dashboard, or the draft | `dashboard.get` |
| `draft_set { title, panels }` | puts a dashboard in the draft and draws it; refused with the service's own message when it is not a dashboard | no call: the body is checked by the cell `dashboard.put` checks with (`brain-dashboard.ojs:296`) |
| `show { metric, by, filter, draw, since, until }` | draws one panel under the chat as the answer to a question, outside the draft | `metric.query` |

No tool writes to the Brain. A dimension's value is text a Worker logged, a member's Worker among
them, and it reaches the model in a tool's answer; with these five tools a turn that such a text has
turned can ask a query and change the draft the owner is looking at, and nothing else. The Operator's
chat has `eval_js` with the owner's session (`cloud-brain.ojs:672`: "do not read the refusals as a
wall").

A turn asks 20 queries at most (the panels of one dashboard); the next `metric_query` or `show` of
that turn is refused with a line that says so. What a query costs Cloudflare is not known
(`brain-dashboard.ojs`, "No price").

**The draft.** One value of the page: a dashboard that is not kept. It is drawn by the functions a
kept one is drawn by, with a line that says it is a draft and of which kept dashboard, if any. It is
in the page's memory only: a reload loses it, and the chat's session, which is saved, has the
`draft_set` that made it. No draft is a row of the service. The draft before the last `draft_set` is
held too, and Undo puts it back, one step. Under every panel, of a draft, of `show` and of a kept
dashboard, one line has its query: the metric, `by`, the filter and the span.

**Keep.** The owner presses Keep: `dashboard.put` with his session, then the select names the kept
dashboard and the draft is empty. A draft made from `health`, or under a name that is refused, asks
for another name beside the button with the service's message (run 21:25 CEST: `{"error":"Forbidden","message":"health is built in: a value of the seed, which no method writes"}`). Discard empties the draft.

**The selection.** One value of the page, `{ panel, metric, by, filter, since, until, group }`, set by
the pointer and read by two things: the page, and the line `dashboard` of the agent's context, which
has the shown dashboard's name, the span, whether there is a draft, and the selection. So "why is
this high?" after a drag is asked of that span and that group with nothing typed twice.

- A drag over the time axis of `bars`, `points` or `calls` selects `since` and `until`, cut to the answer's step. No chart of the page has such a handler, and `knowledge/drawing-charts-with-plot.md` names none (`grep -n -i 'invert\|pointer\|brush'` prints nothing of it); the handler is the task's writer's to work out, from the plot's x scale. `knowledge/event-handlers-in-cells.md` has what a `pointerdown` in a cell needs (its lines 217 to 230; not read whole by me).
- A click on a bar, a dot, a legend entry or a row of `table` or `share` selects that group: the dimensions of the panel's `by` with the values of the row.
- **Zoom**: the dashboard is drawn over the selected span. `timeRange` (`cloud-brain.ojs:126`) is today a span that ends now; it gains a range with an end, shown with the select and cleared by choosing a span there. Health reads the same range.
- **Break down**: for a selected group or span, the metric's other dimensions as buttons; a press draws the same metric over the selection, filtered to the group, by that dimension. No model call: the page has the definition from `metric.list`.
- **Lines**: the log lines under the selection, 50 at most, newest first, from `logs.query` with the definition's Worker and `at`, the selection's span and the group as filters. The owner's tab only. A row of a `flow.` metric has an issue's `id`, and its line is a link to that issue.

### The part the pick decides

Where the chat is, how a draft is told from a kept dashboard, and where the acts of a selection
appear. None of it is designed here. `ds-1-pilot-sheet` draws three ideas from the needs, and its
spec has its writer read this file "and does not draw from it". What the fixed part gives a face to
show, so that a wireframe leaves none of it out (`knowledge/preparing-a-good-claude-design-spec-handover.md`:
what a brief summarised, the designer dropped):

| Thing | Its states and controls |
|---|---|
| the chat | idle; a turn running, with the tool it called; an answer; no model key set; folded to a badge (`compact`) |
| an answer of `show` | one panel, its query line, "Add to the draft" |
| the draft | none; a draft of a kept dashboard, or of none; Keep, Undo, Discard; the name asked for after a refused put, with the service's message |
| a panel | its query line; with a selection: the span or the group in words, Zoom, Break down by each other dimension, Lines |
| the range | one of five spans that end now; a range with an end, and how it is cleared |
| Lines | 50 lines at most, newest first; for a `flow.` metric a link to the issue; refused for a caller that is not the owner in his tab |

Three ideas of this writer, a line each, for whoever wants them: the chat beside the dashboard with
the draft in the dashboard's place; one line to ask in above the panels with the conversation
folded; no standing chat, an "ask" on each panel and a menu at the selection. A fourth from BubbleUp:
the selection compared with the rest of the chart across every dimension of the metric, one small
chart a dimension.

## Not chosen

- **N1. The Operator given the five tools and the `dashboard` line, and no second chat.** What exists today of the same job: the Operator's chat, a robocoop-5 with a prompt and tools of the page. Not extended, for three reasons. Its turn holds `eval_js`, `brain_apply` and `brain_call` with the owner's session, and a metric's dimension values are text any Worker logged: the dashboard's chat is given tools that write nothing. It is drawn in the tab `brain-operator`, away from the charts a selection is made on. Its prompt is 14 paragraphs on operating Workers, sent at every step. Against this choice: two chats on one page, two prompts to keep, and his words of 2026-10-12 ("we just make the summarizer more general as it has the same basic job for the same purpose"). The jobs differ here (operate the Workers; explore and author), and the smaller authority is line 1 of the seven. P3 puts it to him.
- **N2. The tools registered for every chat** (`registerTool`), so the Operator has them too. Left out: the Operator's context grows by five tool descriptions at every step for a job it is not asked. It is one line to add later.
- **N3. A tool `dashboard_keep`.** The agent would write the owner's dashboards from a turn that a logged text can reach. One press is the cost of not having it.
- **N4. Drafts as rows of the service** (`dashboard.put` under `draft-…`). A draft would survive a reload and count against the 50. A method's meaning would change for a thing the conversation can make again.
- **N5. The agent writes Plot code or a cell** (robocoop-5's own `define_cell`). Any chart could be drawn. The dashboard would stop being data that `dashboard.put` checks, and the chat would need the tools that write cells. A draw the seven do not have is a change to the seed, by a task.
- **N6. A model call in a Worker** that turns a question into a query. The standing rule: no agent loop in a Worker; a turn runs in a notebook.
- **N7. A designer role, a wireframe stage in the workflow, or a handover to Claude Design.** Looked for: `.claude/skills/brain-maintenance/agents/` has `approver digest implementer orchestrator overseer reviewer spec`, and the Brain's `index.md` lists the roles `paper-summarizer`, `reviewer` and `summarizer`; none designs. Whether one is added is the subject of `design-process-for-services`, whose spec weighs each (its options B and C) and picks a round made by the spec writer.
- **N8. A design pass of this project's own**: three tasks, `ad-1-needs`, `ad-2-options` (a notebook of wireframes put to the library) and `ad-3-pick`, as this file had them until 21:33 CEST. What exists of the same job: `ds-1-pilot-sheet` and `ds-2-owner-pick` of the other spec, made on this project. Two passes would ask him to pick twice for one page.
- **N9. Building the fixed part before the pick**, since no idea should change it. It would save the days the pick takes. It is what P1 takes him to be asking the loop to stop doing, and a pick can change the fixed part (ad-1).
- **N10. Members.** The select and the panels are the owner's today; a member's metrics and dashboards are behind grants. A member's chat is not in this project.

## Standing things this adds

| Kind | Name | What exists of the same job | Why not that |
|---|---|---|---|
| a chat (a robocoop-5 group, with a prompt) | `dashboard` | the Operator's chat, group `brain` | N1 |
| five tools of that chat | `metrics_list`, `metric_query`, `dashboard_read`, `draft_set`, `show` | the Operator's `brain_call`, which calls any method | it calls any method; these five are the dashboard's reads and a page value |
| two values of the page | the draft, the selection | nothing: `grep -n -i "draft\|selection" tools/cloud-brain/brain-dashboard.ojs` prints no cell of either | |
| a range with an end | in `timeRange` | `timeRange` itself, which is extended | |

No role, brief, tool of the loop, token, Worker, method or store.

## How each requirement is known to be met

Each check is run by a writer or a reviewer with its own token or `loop-dashboard`, except where it
says the owner's.

| | Check | Result today |
|---|---|---|
| R6 | `ia "get?id=ds-2-owner-pick"` is at `done` with an event of the owner's before `ad-1-spec-the-pick` is started: the link `after` holds the start | `ia "get?id=ds-2-owner-pick"` answered 404 `no such issue` at 21:33 CEST: that spec is at `spec-review` and its tasks are not open |
| R7 | "Read outside" of this file names each source with its address | below |
| R5 | robocoop-5's source is in `lopecode` and `lopebooks`, which are links in a writer's worktree, so a task cannot commit a change to it; `git diff --name-only origin/main...HEAD` of each build task names paths under `tools/cloud-brain/`, `knowledge/`, `plan/` and `tests/` only. And `grep -c "robocoop5(" tools/cloud-brain/brain-dashboard.ojs` | the diff names nothing today (no commit); the grep prints 0 today, and 1 with a line `x = robocoop5({})` added to the seed (run 21:31 CEST, and the line taken back: 0 again) |
| R1, R2 | Tests of the seed, with a fake agent (`agent:` of the builder) that calls the tools in a written order: `metric_query` answers rows and the last line; `draft_set` of a body the service refuses is refused with its message; a `draft_set` then Keep sends one `dashboard.put` with that body. `bun test.ts brain-x-dashboard` | `18 passed, 0 failed, 4 need a browser` today. Cannot be run before ad-2; run then in `cloud-brain-dev`, and the ones that need a document with `tools/cloud-brain/tab-tests.ts` |
| R2 | On cb4 with `loop-dashboard`: a put of a draft's body, `dashboard.get` answers it, `dashboard.delete` removes it | run 21:25 CEST with `check-agentic-draft`: 200 `{"dashboard":{"name":"check-agentic-draft",…"filter":{},"draw":"bars"}]}}`, get the same, a draw `pie` 400 `panel 1: draw is one of calls, faults, methods, bars, table, points, share`, delete `{"deleted":"check-agentic-draft"}`, list back to three |
| R3 | A test that sends pointer events to a `bars` chart of a written answer and reads the selection's `since` and `until`; one that clicks a row of `table` and reads `group` | cannot be run before ad-4; `tab-tests.ts` then |
| R4 | A test: Break down of a selection asks `metric.query` with the span, the group as filter and the pressed dimension in `by`, against a stand-in client. Lines: the same with `logs.query`, against a stand-in | cannot be run before ad-5 |
| R1 to R4 | **The owner's**: in his tab, a question typed to a model, a drag on Health's chart of `core.calls`, Lines. `core.calls` and `logs.query` answer his session and no token | not a condition of a task landing |

Whether the agent's answers are good ones (the right metric, a readable dashboard) is checked by no
test here. The fake agent shows the tools and the page work; a model's turns are his to judge in use,
and ad-7 is where that is read.

## Tasks, in the order they land

Ids are `ad-N-…`. `ds-2-owner-pick` is a task of `design-process-for-services`, which does not exist
until that spec is approved and decomposed. This project is decomposed after that one, so that the
first link below can be written; until then it waits at its approval, and that wait is read by
`ia "get?id=ds-2-owner-pick"`.

1. **`ad-1-spec-the-pick`**. After ds-2-owner-pick. "The part the pick decides" of this file is written as what he picked, with his words and the picked wireframe's cell of `plan/design/agentic-dashboards.ojs` named; each of tasks 3 to 6 gets the part of the wireframe it draws, in this file and in a comment on the task. His word at ds-2 is his word for that part: it says how the fixed part is shown and changes nothing it does. A pick that changes "The part no option changes" (a tool that writes, a draft kept by the service, the Operator's chat and no second one, no chat) or needs a change to robocoop-5 is not written by this task: the task says so in a comment for him, and the project goes back for a spec and its review.
2. **`ad-2-chat-and-tools`**. After ad-1-spec-the-pick. The chat cell, `dashboardPrompt`, the five tools, the draft as a value, the `dashboard` line of the context without a selection. Two chats drawn on one page are tried first. Tests with a fake agent. Deploys `brain-x-dashboard`.
3. **`ad-3-draft-and-keep`**. After ad-2-chat-and-tools. The draft drawn, the query line, Keep, Undo and Discard, the name asked for when the put is refused. Tests against a stand-in client; the round trip on cb4 with `loop-dashboard`.
4. **`ad-4-selection`**. After ad-2-chat-and-tools. The drag and the click, the selection as a value and in the agent's context, its acts shown and not yet working. May be written while ad-3 is.
5. **`ad-5-zoom-and-deeper`**. After ad-4-selection. `timeRange` with an end (a change to `cloud-brain.ojs`, the page), Zoom, Break down, Lines.
6. **`ad-6-docs`**. After ad-3-draft-and-keep and ad-5-zoom-and-deeper. The prose of `brain-dashboard.ojs` (a section "The chat"), the Operator's brief told that the dashboard has a chat of its own, `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md`.
7. **`ad-7-read-after-a-week`**. After ad-6-docs. A wait that is not for a task: seven days from ad-6's `finish`. Read then: how many dashboards were kept from a draft (`dashboard.list` against the three of today), the sessions of the group `dashboard` in the built notebook, and what he said. The record says what to change, or that nothing was used.

## What only the owner can do

- His pick, which is `ds-2-owner-pick` of the other project and no task of this one.
- Whether this spec is approved before that pick. The other spec's writer would have it wait ("approved first, it is one design shown alone once more"). Approved now, his approval is of the fixed part and the five readings P1 to P5, the face is still his to pick at ds-2, and no task here starts before it in either case.
- The checks in his tab, after ad-5: a question to a model, a drag on `core.calls`, Lines.
- A model's key in the settings panel, when none is set.

No deploy of the kernel, the core, the database or the deployer; no policy; no rule; no new
permission. `brain-x-dashboard` and the page are deployed by the loop, as they have been.

## What the orchestrator makes

Nothing. `loop-dashboard` (`metric.query metric.list 'dashboard.*'`) exists and is enough.
