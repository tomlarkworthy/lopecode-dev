# ac-3-operator-tools-through-call-answer

Task 3 of `plan/cloud-brain-answers-cut-and-not-said.md`. Written 2026-10-12, after 20:25:43 CEST
(`date` at the rebase before this file) and before the landing lock was taken at 20:27:08. One file changed, `tools/cloud-brain/cloud-brain.ojs`.

## What was wrong

`brain_services`, `brain_status` and `brain_apply` returned `{ title, output }` with no
`outputLimit`, so the loop of `robocoop-5-core` showed 8000 characters of a longer answer, the
first and last 4000, with a marker that names grep and sed. The operator has neither for a tool's
answer.

Reproduced before the fix, with the tools moved into `operatorTools` and their returns as they
were. `bun test.ts brain-x-page --with …/ac-3.js --whole` in the worktree's `cloud-brain-dev`:

```
14 passed, 1 failed, 18 need a browser
test_the_operators_other_tools_show_a_long_answer_in_parts_and_the_loop_cuts_none failed
expect(string).not.toContain(value)   Expected value: "bytes truncated"
```

The answer the test gave it was 300 rows of services, 76172 characters as JSON. How long the three
answers are in the owner's tab was not measured, here or in the spec.

## What changed

| Cell | Change |
|---|---|
| `operatorTools({ brain, client, services, declared, origin, attention })` (new) | The five tools as a list. It reads no cell of the page: `assistantTools` passes `brain`, `client`, `viewof services`, `declaredWorkers`, `brainOrigin` and `attentionNow`. A test passes its own. |
| `assistantTools` | Calls `operatorTools`, then registers and unregisters as before. The ids and their order are as they were. |
| `brain_services`, `brain_status` | Take `offset` (a number, in the schema) and return `{ title, ...callAnswer(out, offset, "query") }`. Each description gains "An answer is shown 20000 characters at a time and its last line says when there is more: make the same call again with offset." `brain_status` also says "The seconds in it are counted at each call." |
| `brain_apply` | Returns `{ title, ...callAnswer(out.results, 0, "procedure") }`, and an `offset` is refused before anything is emitted or applied, with `offsetRefused`. Its schema has no `offset`. The description says so. |
| `callAnswer` | `JSON.stringify(out, null, 1) ?? ""`: an answer of `undefined` is an empty text. Without it `text.length` threw for `viewof services.value` before its first value and for an apply with no `results`. |

Two things are not in the spec:

- **`brain_apply` refuses an offset.** Its long answer ends "The rest is not read: a procedure
  called again would run a second time". A model that sent `offset` anyway would have deployed a
  second time, since `execute` did not read the argument. `brain_call` has the same guard for a
  procedure. The other way was to leave it and name it under "Not tried"; the guard is one line.
- **`?? ""` in `callAnswer`.** It also changes `brain_call` for a method that answers nothing:
  an empty text where it was an error of `text.length`. No such method was looked for.

## The test

`test_the_operators_other_tools_show_a_long_answer_in_parts_and_the_loop_cuts_none` calls
`operatorTools` with a `brain`, a `client`, a `services` and a `declared` of its own and reaches
each tool through its `execute`. Each return goes through the loop's `truncate` at the
`outputLimit` returned, or at 8000 with none, which is the loop's line
(`cap = toolOutputLimit; if (Number(r?.outputLimit) > 0) cap = …`). `truncate(text, undefined)` cuts
nothing, so a test that passed `r.outputLimit` as it is would have passed before the fix.

It holds:

- `brain_services` read by its last line until there is none: the parts joined are the JSON of the
  rows, in `ceil(length / 20000)` calls, and no part has "bytes truncated";
- `brain_status` the same way: the parts joined parse, with 300 workers, the address passed as
  `origin`, 299 secrets not set and 1 inbox entry waiting. `tick` is `null` in that read so that
  the text is the same at each call;
- `brain_apply`: 20000 characters and the procedure's last line; a second call with
  `offset: 20000` is refused and `brain.apply` ran once; a Worker that is not declared is refused;
- a short answer of `brain_services` is the JSON as it was, with `outputLimit: 20200`; a status
  with a `tick` and a kernel on probation has `secondsAgo` and `secondsLeft: null`;
- `offset` is in the schema of the two reads and not in `brain_apply`'s;
- a view with no value and an apply with no `results` give an empty output;
- with `brain: null` each of the three answers "No owner session…" and makes no call.

The test was run without the `callAnswer` returns (the failure above), and then on a build with one
line taken out of the finished seed, each put back after (same command, 2026-10-12, between those two times):

```
without the guard of brain_apply   14 passed, 1 failed   Expected: "Error: offset is for a query. …"  Received: "[\n {\n  \"worker\": \"brain-x-echo\", …"
without ?? ""                      14 passed, 1 failed   Received: "Error: undefined is not an object (evaluating 'text.length')", twice
```

## Counts

Each after the last change to the seed, 2026-10-12.

| Command | Result |
|---|---|
| `bun test.ts brain-x-page --with …/.emitted/ac-3.js --whole`, in `cloud-brain-dev` of the worktree | `passed` 15, `failed` 0, `needsBrowser` 18. The new test is among the passed |
| `bun tools/cloud-brain/tab-tests.ts tools/cloud-brain/.emitted/cloud-brain.html @tomlarkworthy/cloud-brain`, in the worktree | `"tests":33,"passed":33,"failed":[]`, Chrome 151.0.7922.34 |
| `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell <the build> --times 20`, in the main checkout | `"runs":20,"passed":20,"failed":0,"none":0,"from":["document"],"byChance":[]`; `mains` is `["@tomlarkworthy/brain-shell","@tomlarkworthy/cloud-brain"]`; run 1 has `"@tomlarkworthy/cloud-brain":33` |
| `grep -c outputLimit tools/cloud-brain/cloud-brain.ojs`; `grep -c "callAnswer(" …` | 7; 9 (4 and 6 in the spec) |

15 + 18 = 33, the browser's count.

## Not tried

- The three tools in the owner's signed-in tab, through the loop, with a model. `assistantTools`
  needs the owner's session; the test reaches the same functions with fakes.
- How long `brain_services` and `brain_status` are on cb4. If both are under 8000 characters today
  the change shows nothing there yet.
- A second part of `brain_status` or `brain_services` after the state changed between the two
  calls. The last line gives the whole's length, so a changed length shows; a change of the same
  length does not (the spec, "The operator's tools").
- An error a tool throws that is over 8000 characters. The loop cuts it with the grep and sed
  marker; none of that length was seen.
- `tools/cloud-brain/running-a-cloud-brain.md`, the guide the operator reads, lists the tools and
  says nothing of the length of an answer. Not changed: it is a file of the shell, which this
  task does not post.
