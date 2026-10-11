# operator-tab-module: the Operator's chat in a tab of its own

Task 1 of `plan/cloud-brain-i1842.md` (the owner approved the spec at event 2071 of the tracker).
Written 2026-10-11; the worktree was made at 21:04:07 CEST (`date`) on `41e72b7e`, and each output
below carries its own `at` where the tool prints one. Every output is of a command run in the task's
worktree that evening, on a build of the seeds as committed unless it says otherwise. The Chrome is Playwright's headless shell 151.0.7922.34, window 1400 x 900,
no session. The runs made after the deploy are in the issue's comment, not here: this file was
committed before the landing.

## The proof asked for first

The spec's change 2 rested on a reading: a chat made by a function of one module draws and works in
a cell of another. The task was to stop if that failed. It was run before any seed was edited, on a
build of `41e72b7e`:

```
$ bun tools/cloud-brain/operator-tab-check.ts tools/cloud-brain/.emitted/cloud-brain.html --proof
{"proof":{"ok":true,"sent":["hello from module B"],"replyShown":true,"messages":["user","assistant"],"group":"operator-proof","viewIsNode":true,"madeIn":"A","drawnIn":"B","modulesDiffer":true,"fieldPlaceholder":"Message robocoop-5… ","height":300},"browser":"151.0.7922.34","at":"2026-10-11T19:08:03.887Z"}
```

Module A imports `robocoop5` and holds a cell whose value is `{ chat }`. Module B imports that cell
and its own cell calls `chat({ invalidation })`. A line typed in the node B holds, and Send pressed,
reached the agent once and the answer was drawn in the same node. The agent is a fake
(`agent:` of `robocoop5`, as `test_robocoop5_session_thread` of robocoop-5 has it) on a controller of
its own, so no model was called and no session of the page was written. A turn with a model through
the tab was not run.

The first run printed `"ok":false,"replyShown":false` with `sent` filled. The transcript is in a
shadow root (`rc5_unsnapshotted`), which `textContent` does not read; the probe now walks shadow roots.

## What changed

- `cloud-brain.ojs`: `viewof assistant` is gone. `operatorChat` holds `{ chat }`, whose call is the
  old cell's with the same options, and adds itself to the plugin set `"operator"`. `chat` also takes
  a `height`, 420 when none is given, which is what the cell had. `operatorSection(mains, part)` draws
  a link to the tab when `mains` has `@tomlarkworthy/brain-operator` and the chat when it has not;
  `operatorHere` is that, called with `runtime.mains`. `assistantLine` is where it was.
- `brain-operator.ojs`, new, a main of the shell and not a Worker's (`build.ts`, `MODULES`, not in
  `OWNED`). It imports `plugin-registry`, `lopepage-urls` and `jest-expect-standalone`.
  `viewof operator = operatorView(operatorParts, …)`: the chat of the first part, or a line with a
  link to `cloud-brain`.
- `build.ts`: the layout is `#view=C100(S50(cloud-brain,cloud-brain-docs,cloud-brain-specs),S50(brain-operator))`.
  claude-code-pairing is still a main.
- `cloud-brain-docs.ojs` line 15 and R17 of `cloud-brain-specs.ojs` name the tab. R17's status was
  not touched; its new text is not true of cb4 until a shell of this build is posted.
- `tools/cloud-brain/operator-tab-check.ts` and `tests/tools/operator-tab-check.test.ts`.

Two things differ from the spec's text, both chosen here (`philosophy.md`, line 2):

- The chat's height in the tab is `calc(50vh - 80px)`, not a number. The spec left the height to
  what R2's check measures. With `50vh - 150px` the message field's bottom edge was at 798 of 900 and
  the pane had room; at `- 80px` it is at 868. A length of the window follows a taller window in the
  default layout, where the pane is half of it. It does not follow a pane the owner drags; the grip
  under the chat is for that. Read at 1400 x 900 only: no other window size was tried.
- The cell under "## Operator" is `operatorHere`, not `viewof assistant`. Nothing read `assistant`
  (`grep -n "assistant\b" cloud-brain.ojs`), and a `viewof` over a link has no value to give.

## What was run

```
$ cd cloud-brain-dev && bun test.ts brain-x-page                      # what cb4 ran, hash 1a3d5c8c9e93
"passed":10,"failed":0,"needsBrowser":12
$ bun test.ts brain-x-page --with ../tools/cloud-brain/.emitted/operator-tab-module.js
"passed":10,"failed":0,"needsBrowser":13
```

The one more is `test_operator_section_is_a_link_where_the_shell_has_the_tab` ("document is not
defined" there). In a QA tab on the build (layout `S70(cloud-brain,brain-operator),S30(claude-code-pairing)`,
paired with a `cc=` token), the brief's snippet, once for each module:

```
{"test_operator_section_is_a_link_where_the_shell_has_the_tab":[23,[]],"test_operator_none_then_one":[3,[]]}
```

23 of `cloud-brain` and 3 of `brain-operator`, none failed. `brain-operator` has no Worker, so
`test.ts` does not run its three; `bun tools/lope-tests.ts <build> --filter test_operator` runs them
with the page module's one: `Tests: 4 passed, 0 failed`.

```
$ BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell <build> --times 20
{"worker":"brain-x-page","runs":20,"passed":20,"failed":0,"none":0,"from":["document"],…,"byChance":[],…,"exit":0,"at":"2026-10-11T19:15:04.389Z"}
```

Its first line has `mains: ["@tomlarkworthy/brain-shell","@tomlarkworthy/cloud-brain"]` and each run
`tests: 23`. That page has no `brain-operator`, so `operatorHere` drew the chat in the section there,
which is the branch an old shell takes.

The probe on the build, the checks of the spec's table by requirement:

```
$ bun tools/cloud-brain/operator-tab-check.ts tools/cloud-brain/.emitted/cloud-brain.html
{…,"ok":true,"failed":[],"joinedMs":2248,"reads":3,…,"operatorPane":"chat","pageSection":"link","fields":1,"fieldsInPane":1,"folds":1,"fieldBottom":868,"paneScroll":0,"paneHeadings":["Operator","Tests"],"sectionFields":0,"ccWs":4,"inboxPump":8,"operatorInMains":true,"pairingInMains":true,…,"at":"2026-10-11T19:14:15.327Z"}
```

`bun tools/lope-reader.ts tools/cloud-brain/.emitted/shell.html` has `brain-operator` and
claude-code-pairing in `mains` and the hash
`#view=C100(S50(@tomlarkworthy/cloud-brain,@tomlarkworthy/cloud-brain-docs,@tomlarkworthy/cloud-brain-specs,@tomlarkworthy/brain-shell),S50(@tomlarkworthy/brain-operator))`.
`bun test ./tests/tools/operator-tab-check.test.ts`: 4 pass, 0 fail.

## Two faults the first runs found

- `test_operator_none_then_one` failed in `lope-tests.ts` with "Spread syntax requires
  ...iterable[Symbol.iterator] to be a function". `plugins.get(name)` is `Generators.observe`, whose
  `next()` gives a value that is itself a promise: `await (await gen.next()).value`, as
  `test_get_reflects_add` of plugin-registry has it.
- The page module's test first read `operatorChat` too, and failed in `lope-tests.ts` with
  "sampleFileAttachment could not be resolved": that cell reaches robocoop-5, which that runner does
  not load whole. The line was taken out; the test is of `operatorSection` with a fake part.

## Not tried

- A turn with a model in the tab, a saved conversation of the group `brain` showing there, and a
  channel message being answered: all need the owner's signed-in tab (the spec's list).
- The page with a session. Every read here is signed out.
- `operatorParts` yielding twice in a row (the page module's `operatorChat` running again takes its
  part out and adds it). `operatorView` then makes the chat again, as the old cell did when its
  inputs changed; robocoop-5 finds the session by `group`. Text typed and not sent at that moment
  was not looked at, in the old place or the new.
- A window other than 1400 x 900, and a pane the owner has resized.
- The line "with no part" on a page: seen in the three tests only. In a whole build the part is
  there by the first read.
