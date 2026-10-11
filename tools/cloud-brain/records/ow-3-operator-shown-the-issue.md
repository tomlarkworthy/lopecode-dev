# ow-3-operator-shown-the-issue

2026-10-11. Task 3 of `plan/cloud-brain-owner-acts-on-what-waits-for-him.md`, approved by the owner at
event 2359: the Operator of the page is shown the issue that the block "For your attention" shows, can
put a text in that issue's box, and its `brain_call` refuses ten of the tracker's 13 procedures. The
seed is `tools/cloud-brain/cloud-brain.ojs`, which deploys as `brain-x-page`. The issue is `major`: it
changes who may do what, by narrowing. The seed's commit is the first ref of the issue's submit.

## What changed

In `cloud-brain.ojs`:

- `assistantRefuses` is true for `issue.move`, `issue.swap`, `issue.label`, `issue.comment`,
  `issue.review`, `issue.install`, `issue.rebuild`, `issue.resign`, `issue.narrow` and `issue.lock`,
  short and as NSID. It has two callers, the Operator's `brain_call` (`assistantTools`) and the
  `brain_call` of a turn that answers a message from a channel (`turnTool`). `issue.locks`, a read, is
  not `issue.lock`: the ten end at a character that is not a letter, a digit or a hyphen.
- `assistantRefuses` is also true for a method that is not a string, and for one with a character other
  than a letter, a digit, a dot or a hyphen. Not in the spec; see "Readings" below.
- `attentionParts = plugins.get("attention")`, mirrored into the constant `attentionNow` by
  `attentionMirror`, as `inboxNow` and `inboxMirror` do for the inbox.
- `attentionSummary(parts)` makes the text of the watch from the first part: "none shown", or the id,
  the place, the kind, the state, the title, the ask, and the text asked about.
- `assistantWatches(held = attentionNow)` has a second watch, `attention`.
- `attentionDraftTool(held)` makes the tool `attention_draft { id, text }`, which calls `draft` of the
  first part. `assistantTools` registers it with the other four.
- `turnToolset(turn, tool, tools)` is the choice of tools that was written inside `answerTurn`, as a
  cell, and leaves `attention_draft` out of every turn that came over a channel.
- `assistantPrompt` has one more item, on the tracker. The suffix of the owner's turn over a channel
  says that turn has no `attention_draft` and is not shown `attention`.
- A prose cell under `## Operator` says the above, and what the reviewer of the spec noted (review
  2345): the Operator also has `eval_js`, so the refusals make a move by it harder and not impossible.
  The reference `brain-x-page` serves has it: read from `source.reference` of the emitted record,
  3601 characters, with "up to 3000 characters" where the cell has `${attentionLimits.about}`.

The chat does not depend on the plugin set. From the built module, after the change:

```
$def(…, "operatorChat", ["robocoop5","assistantPrompt","promptView","defaultWatches","assistantWatches","plugins","invalidation"], …)
$def(…, "assistantWatches", ["attentionNow","brainSummary","attentionSummary","attentionLimits"], …)
$def(…, "attentionMirror", ["attentionNow","attentionParts"], …)
```

`plugins` in the first line is the registry the cell adds itself to, as before the change.

Elsewhere: `tools/cloud-brain/running-a-cloud-brain.md`, which the Operator's brief sends it to, has
the tool in its table and the ten refusals under it. The spec has two "(As built …)" notes.

## What was found on the way: a watch is cut to 400 characters

robocoop-5's watch bus (`createWatchBus` in `@tomlarkworthy/robocoop-5-tools`, read from
`cloud-brain-dev/deploy/`, which is what cb4 runs) shows a polled watch through
`summarize = x => clip(one(x), 400)` and `limit = 900` unless the watch gives its own: 400 characters,
with every run of white space made one space. The asks the spec measured are 657 to 1848 characters.
So the watch of the spec's design, `{ label, read }`, would have shown the Operator the first quarter
of a median ask on one line. The watch as built gives `summarize: (text) => String(text)` and
`limit: 4000`; `robocoop-5` is not changed. The test drains the module's own bus and compares the line
with the whole summary. A build with those two options taken out fails that test (below).

The summary cuts the text asked about at 3000 characters and names `brain_call issue.get { id }` for
the rest, so that the line stays under the 4000 the bus is given. The `brain` watch has no such
options and is cut at 400 as before; not changed here.

## Readings where the spec left room

- **A method name with other characters is refused.** `xrpcClient` puts the name in the address as it
  is (`root + "/xrpc/" + name`, `xrpc-client.ojs` line 22), and the core reads the method from the
  path. So `com.lopecode.brain.getInfo/../com.lopecode.brain.issue.move` is let through by a rule that
  reads the start of the name, and a browser's `fetch` sends it to `issue.move`. That the address is
  made shorter by `fetch` is how URLs are parsed; no such call was sent to cb4 to see it. The same
  holds of every method refused before this change (`secret.get` among them). The check narrows what a
  caller may do (line 1 of `philosophy.md`, "A change that only narrows what a caller may do is
  taken"). A method name on cb4 with another character was not looked for; the names in `llms.txt`
  were not read for this.
- **A channel turn does not get `attention_draft`.** `answerTurn` gave the owner's turn over WhatsApp
  or Bluesky every tool of the Operator. With no change it would have had the new tool: a message sent
  from a phone would write in a box of a page its sender is not looking at. Left out, by line 1: it
  would have let a caller do what it could not do before. The spec says of such a turn only that it
  moves nothing on the tracker.
- **The first part.** With two panels on a page the watch and the tool use the first of the set, as
  `brain-operator` does with `"operator"`. One panel is what the page has.
- **A part that throws** in `shown()` reads "none shown".
- **No session check in the tool.** The other four tools throw with no owner session (`need()`). This
  one calls no method; with nobody signed in the part's own `draft` throws
  (`records/ow-2-panel-offers-what-it-shows.md`, "no panel of the owner on this page").

## Tests

Three new cells. `grep -c '^test_' tools/cloud-brain/cloud-brain.ojs`: 30 (27 on `main` before).
`grep -c 'label: "attention"' tools/cloud-brain/cloud-brain.ojs`: 1, and `grep -c 'attention_draft'`:
10 (the spec's two checks; 0 and 0 before).

- `test_the_operator_moves_nothing_on_the_tracker` (R6): the ten are refused, short and as NSID; 12
  are not (`get`, `list`, `sync`, `open`, `link`, `attach`, `locks`, `policy`, `snapshot`, `key`,
  `attachment`, `verify`), short and as NSID; 12 names that are not a method's name are refused;
  `turnTool` over a client that lists its calls answers "not available" to each of the ten and makes
  2 calls of 12, `issue.get` and `issue.open`; the brief has the two pointers.
- `test_the_operator_is_shown_the_issue_in_the_block` (R4): "none shown" for no set, an empty one, a
  part that shows nothing and a part that throws; an issue with an `about` of two lines and 1200 more
  characters, whole; the first of two parts; an issue with no `about`, a hidden one, and one of 20000
  characters cut at 3000; the labels `brain` and `attention`; through `createWatchBus`, "none shown",
  then the whole summary once, then nothing until the part shows another issue; `attentionMirror` is
  `attentionNow`.
- `test_attention_draft_calls_the_part_and_no_method` (R5): no part; one draft handed to the first of
  two parts; the part's two refusals passed on word for word; the factory takes one argument and its
  text names no client, no `fetch` and no call; `turnToolset` for the owner's turn, a room's and a
  member's.

The spec's R5 test has "a client that counts calls: 0 calls". The tool is given no client, so the
test holds that instead: there is nothing to count on. What the part does with a draft (the box, the
buttons, no write) is `test_issues_attention_part_says_what_is_shown` of `brain-issues`.

Before the change, on a build of the seed with the three tests and nothing else:
`bun tools/cloud-brain/tab-tests.ts <build> @tomlarkworthy/cloud-brain` printed
`"tests":30,"passed":22`, and `failed` named the three: `attentionDraftTool is not defined`,
`attentionSummary is not defined` (listed six times), and for R6 ten `false` where ten `true` were
expected. Why the tool lists one cell six times and counts 22 was not looked into
(`records/ow-2-panel-offers-what-it-shows.md` met the same).

With one part of the change taken out, same command, each on a build of its own, 22:52 CEST:

| taken out | printed |
|---|---|
| `summarize` and `limit` of the watch | 30 tests, 29 passed; failed `test_the_operator_is_shown_the_issue_in_the_block` |
| the check of the name's characters | 30, 29; `test_the_operator_moves_nothing_on_the_tracker` |
| the filter of `turnToolset`, and the end of the ten | 30, 28; `test_attention_draft_calls_the_part_and_no_method`, `test_the_operator_moves_nothing_on_the_tracker` |

The runs submitted, on a build of the worktree after its rebase onto `main` (`20dc75fa`) and after
the last edit, 22:53 to 22:54 CEST (`date`):

- `cd cloud-brain-dev && bun test.ts brain-x-page --with <the built module>`:
  `"passed":14,"failed":0,"needsBrowser":16`. All three new tests are among the 16.
- `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloud-brain --emit page_service=…`:
  `"tests":30,"passed":30,"failed":[]`, Chrome 151.0.7922.34.
- `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell <the build> --times 20`:
  last line `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`; `mains` of
  the first line is brain-shell and cloud-brain; `"tests":30` in a run's line, which is 14 + 16.

In a page: `bun tools/lope-browser-runner.ts <the build> --get-cell attentionMirror --wait 12000`, a
local file with nobody signed in, printed `{ "parts": [ {} ] }` with the tracker's tab in the layout
and with the layout the build opens with. So the mirror gets the part the tracker's module offers.

## Not tried

- **A turn of the Operator.** No agent runs one: it needs the owner's tab and his model. Not seen:
  that the model reads the `attention` line, that it names the shown issue when asked, that it calls
  `attention_draft`, that a draft appears in the box on his page. These are in the owner's list in the
  spec.
- **The watch on the owner's page, signed in.** The page run above had nobody signed in, so its part
  shows nothing. The text of an issue that waits on cb4 was not read through the watch.
- **`brain_call` of `assistantTools` through its `execute`.** It needs a session. The test calls
  `assistantRefuses`, which it reads, and `turnTool`, the other caller.
- **A move by `eval_js`.** Not run. That it is possible is the reviewer's note of review 2345 and what
  the prose cell says.
- **Whether the chat's view is kept when the tracker's tab joins or leaves the page.** Read from the
  inputs of the cells above, not watched in a page with a conversation in it.
- **A call with a name that has a path in it**, sent to cb4 before the change. See "Readings".
- Of the brief's cases for a control that sends a write: the tool sends none. A second draft before
  the first is pressed is refused by the part, and the test passes that refusal on. A refused write,
  two answers out of order and another caller's event on the row are the panel's
  (`records/ow-2-panel-offers-what-it-shows.md`).

## Searched first

`knowledge.search?semantic=true` with `loop-knowledge` answered 502 at 22:44 CEST: "ai.v1/embeddings
answered 402 owner has made 2000 priced calls today, which is the most for one day". By words, without
`semantic`: "operator brain_call refuses" (the spec, `doc:cloud-brain-dev-agents`), "robocoop watches"
(`module:tomlarkworthy:robocoop-5-engine`, `doc:cloud-brain-i1842`), "plugin registry attention"
(`module:tomlarkworthy:plugin-registry`). Used: the spec; `records/ow-2-panel-offers-what-it-shows.md`
and `records/operator-tab-module.md` for the part and the plugin set; `robocoop-5-tools` and
`robocoop-5-engine` read in `cloud-brain-dev/deploy/` for how a watch is shown, which is where the
400 characters were found.
