# The operator's brief points at where more is kept (`fb-a2vp4smwzq`)

The owner's note on the page at "Operator", 2026-10-11 (event 1158):

> This operator is lagging what the maintanance loops do, it should have access to cloudbrain-dev and the knwledge base and be more aware of how things work than it currently does, not with a big system prompt but to points of where to get more information from, maybe the llms.txt as well

Written 2026-10-11 by a writer of the issue loop, round 1. The seed commit's author time is
18:17:17 +0200 (`git log --format=%ai`).

## What changed

`tools/cloud-brain/cloud-brain.ojs`: one line added to `assistantPrompt`, after the line about
`cloud-brain-docs`, and one test. No tool was added and `assistantRefuses` is as it was.

The line, as the tab read it from `assistantPrompt` (`brainOrigin` is `null` on a file address, so the
line reads `null/llms.txt` there; corrected in round 2, this said "empty". On cb4 it is the Brain's address):

```
- What this brief does not say is read where it is kept, not remembered. What the Brain holds on a question (the guides to how this Brain and its notebooks are worked on, the designs, notebook modules, papers): brain_call knowledge.search { q, semantic: "true" }, with kind: "doc" for the guides alone, then knowledge.get { id } for an entry's text. One Worker's methods, inputs and answers as deployed: brain_call getSource { worker, part: "reference" }, before a method you have not called. How a program calls this Brain, and every method deployed: ${brainOrigin}/llms.txt. The files the agents that maintain this Brain read: ${brainOrigin}/static/cloud-brain-dev/index.md lists them. Those two are addresses, not methods: eval_js with (await fetch(address)).text().
```

769 characters in the seed. `assistantPrompt` is 4256 characters with it, in a tab with no session.

`test_the_operator_is_pointed_at_what_the_brain_holds` holds five strings in the brief and in the
owner's turn over a channel, and out of a member's turn and a room's turn (they have `brain_call`
alone). It also holds that `assistantRefuses` is false for `knowledge.search`, `knowledge.get` and
`getSource`, so a later change that refuses one of them fails a test of the brief that names it.

## Each pointer, and the tool that reaches it

Triage (event 1161) asked that each be shown reachable by the operator's own tools first.

| Pointer | Tool | Shown by |
|---|---|---|
| `knowledge.search`, `knowledge.get` | `brain_call`, a query | `brain.ts curl … --owner`, reads: `knowledge.search?semantic=true&kind=doc&q=how is a worker deployed&limit=3` answered 3 entries, the first `doc:changing-and-deploying-a-cloud-brain-worker`; `knowledge.get?id=` that id answered a `text` of 9210 characters |
| `getSource { worker, part: "reference" }` | `brain_call`, a query. The answer is `text/…`, which `xrpc-client.ojs` line 24 reads as text, and `brain_call` passes a string on | the same from the tab with no session: 200, 14068 characters for `brain-x-knowledge` |
| `/llms.txt` | `eval_js` and `fetch` | from the QA tab, origin `file://`, no `Authorization`: 200, 16745 characters. The header is `access-control-allow-origin: *` |
| `/static/cloud-brain-dev/index.md` | `eval_js` and `fetch`; `static.get { path }` by `brain_call` answers it too | from the tab: 200, 269 characters |

`/llms.txt` is a route of the core and not a method, so `brain_call` does not reach it. The page
keeps its session in `localStorage` and sends it as a header of `brainClient` (`brain-shell.ojs`,
"Session"), so a bare `fetch` from `eval_js` sends none, which is what `/llms.txt` wants: the
kernel answers a token 403 there (`brain-kernel.ojs`, line 1234).

`llms.txt` begins its own tour with `service.list`, which `assistantRefuses` refuses. The operator
has that list as `brain_services`. Not changed.

## What the pointers do not reach

- **Most of `cloud-brain-dev`.** `index.md` lists one file on 2026-10-11, `roles/reviewer.md`.
  `AGENTS.md`, `philosophy.md` and `README.md` are only in the git repository
  (`/git/cloud-brain-dev.git`), which answers the git protocol and no file by address. Files
  under `cloud-brain-dev/` of the file store are put with `put.sh` and the token `loop-roles`,
  which `rules.md` keeps for the overseer, so nothing was put. Filed as the feedback
  `seen-operator-cannot-read-dev-repo` (event 1187), linked to this issue.
- **The loop's rules and briefs** (`.claude/skills/brain-maintenance/`). `knowledge.search` with
  `kind=doc` and `q=cloud`, `limit=100`, answered 17 docs, all of `knowledge/` and `plan/`; none is
  a brief, `rules.md` or `philosophy.md`. 17 is that one search's answer and not what the Brain holds: see round 2.
- **A full doc over 16000 characters.** An entry's `text` is cut there (the reference of
  `brain-x-knowledge`). Not measured which of the 17 are cut.

## Alternatives not taken

- A tool that reads an address (`brain_read`). Triage chose pointers and no new tool
  (`philosophy.md`, line 2, the smaller side). `eval_js` already fetches.
- The text of `llms.txt` or of a guide in the brief. The owner: "not with a big system prompt".
- A pointer to the tracker (`issue.list`), to show the operator what the loop is working on. The
  owner's note names three places and the tracker is not one. Not added.

## Tests

- **Before the fix**, the new test alone in the seed, a QA tab on the worktree's build (`r=7101`),
  the snippet of the brief's step 8: `[19, ["test_the_operator_is_pointed_at_what_the_brain_holds
  expect(string).toContain(value) … Expected value: "knowledge.search { q, semantic: \"true\" }" …"]]`.
- **After**, a fresh tab (`r=7102`), the same snippet: `[19, []]`.
- `bun test.ts brain-x-page --with …/fb-a2vp4smwzq.js` in the worktree's `cloud-brain-dev`:
  `passed` 8, `failed` 0, `needsBrowser` 11. The new test is one of the 11 (`location is not
  defined`: `assistantPrompt` reads `brainOrigin`), as the two tests beside it are. 8 + 11 = 19.
- `BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-page --shell <the build> --times 20`,
  ended 2026-10-11T16:27:44Z: `runs` 20, `passed` 20, `failed` 0, `none` 0, `byChance` `[]`. Each
  of the 20 lines has `"tests": 19, "failed": []`. 19 is the build's count; what cb4 ran then had 18.

## Not tried

- The operator itself. No turn was run with a model, so whether it follows a pointer, and how
  often, is not known. The line is a string and the test holds the string.
- `brain_call` in a signed-in tab. The reads were made with `brain.ts curl --owner` and from a tab
  with no session, not through the tool's `execute`.
- The owner's turn over a channel. There `brain_call` is made with the turn's token, "the owner,
  without the owner's own session"; that `knowledge.search` answers that caller was not tried.
- `eval_js` fetching from the Brain's own address (the tab was on `file://`).
- The cluster's browser (Chrome 128); the 20 runs were Chrome 151 on this machine.

## Round 2, 2026-10-11

The review at event 1259 sent it back with two findings. The seed commit's author time is
18:48:45 +0200 (`git log --format=%ai`).

### Finding 1: the operator was shown 8000 characters of an answer

The page's agent loop shows 8000 characters of a tool's result, the first 4000 and the last 4000
(`robocoop-5-core`, `toolOutputLimit = 8000`, `truncate`), unless the tool returns `outputLimit`.
`brain_call` cut its answer at 20000 and returned none, so the 20000 was never shown. Round 1
showed each pointer reachable with `brain.ts curl` and a `fetch`, which have no cap, and listed
the tool's `execute` under "Not tried". That was the miss.

Measured in a QA tab on the round's build (`r=7202`), with the reference of `brain-x-issues` read
from cb4 and the notebook's own `truncate`:

```
{"ref":27094,"oldShown":8056,"oldMarker":"...[12000 bytes truncated — use grep/sed to narrow]...",
 "newFirst":20076,"newSecond":7094,"whole":true,"cut":false,
 "tail":"\n[characters 0 to 20000 of 27094. The rest: the same call with offset 20000]"}
```

`oldShown` is round 1's return (`.slice(0, 20000)`, no `outputLimit`) through `truncate(…, 8000)`.
`newFirst` and `newSecond` are `turnTool`'s two answers through `truncate(output, outputLimit)`;
`whole` is that the two, less the last line of the first, are the reference.

What changed, in `cloud-brain.ojs`:

| | |
|---|---|
| `callAnswer(out, offset)` (new) | `{ output, outputLimit: 20200 }`: 20000 characters of the answer from `offset`, and a last line when there is more. 20200 leaves room for that line. |
| `turnTool`, and `brain_call` of `assistantTools` | both return `callAnswer(out, offset)`, take `offset` (a number) and say so in their description. |
| `assistantPrompt` | the end of round 1's line: `eval_js with (await (await fetch(address)).text()).slice(0, 7000), then slice(7000, 14000) and on, since eval_js shows 8000 characters of a result with the middle cut out.` (Wrong, and corrected in round 3: `eval_js` shows the first 6000 characters of a text.) Round 1's `(await fetch(address)).text()` was also not JavaScript that answers a text. |
| import | `truncate` from `@tomlarkworthy/robocoop-5-core`, read by the test. `robocoop-5` is not changed. |

Both of the reviewer's ways were taken, each where it applies: `outputLimit` for `brain_call`,
and the brief for `eval_js`, which is robocoop-5's tool and returns no `outputLimit`.

`offset` makes the call again. For a query that is a second read. For a procedure it would be the
act a second time; the description says "the same query", and nothing refuses `offset` with a
procedure.

`test_brain_call_shows_a_long_answer_in_parts_and_the_loop_cuts_none` gives `turnTool` a text of
27094 characters, passes each answer through the loop's `truncate` with the `outputLimit`
returned, and holds: the first is 20000 characters and the line, no "truncated"; the first and
the second (`offset: 20000`) are the text; a short answer and an object are as before.
`test_the_operator_is_pointed_at_what_the_brain_holds` also holds `.slice(0, 7000)` in the brief.
The operator's own `brain_call` is made in `assistantTools`, which needs a session; no test calls
it. It returns the same `callAnswer(out, offset)` (`cloud-brain.ojs`, the two lines `callAnswer(out`).

### Finding 2: two wrong lines

- The comment of round 1 said the Brain "holds 17 docs". 17 was one search's answer.
  `BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-docs.ts status`, 2026-10-11 18:49 CEST:
  `{"docs":63,"fresh":59,"stale":2,"missing":2,…}`, so 61 of 63 are entered. (The review read 62
  and 1 missing at its time.) A comment is not edited; round 2's comment says so.
- `brainOrigin` on a file address is `null`, not empty. Corrected above.

### Tests, round 2

- QA tab on the build (`r=7202`), the snippet of step 8: `[20, []]`.
- `bun test.ts brain-x-page --with …/fb-a2vp4smwzq.js`: `passed` 9, `failed` 0, `needsBrowser` 11.
  The new test is one of the 9. 9 + 11 = 20.
- `verify-run.ts brain-x-page --shell <the build> --times 20`, ended 2026-10-11T16:49:06Z: first
  line `mains` `["@tomlarkworthy/brain-shell", "@tomlarkworthy/cloud-brain"]`; last line `runs` 20,
  `passed` 20, `failed` 0, `none` 0, `from` `["document"]`, `byChance` `[]`. Each of the 20 lines
  has `tests` 20, `failed` `[]`.

### Not tried, round 2

- A turn with a model: whether the operator asks for the rest with `offset`, or slices in
  `eval_js`, is not known.
- `brain_call` of `assistantTools` through its `execute`, in a signed-in tab.
- A guide over 16000 characters: `knowledge.get` answers a `text` cut there by the knowledge
  service, which `offset` does not change. The entry's `file` in `brain-static` is the whole doc
  where it has one; the brief does not say so.
- `eval_js` itself with a result over 8000 characters; the 8000 is read from `robocoop-5-core`.

## Round 3, 2026-10-11

The review at event 1308 sent it back with two findings. The seed commit's author time is
19:05:45 +0200 (`git log --format=%ai`).

### Finding 1: the brief's slices of 7000 lost 1000 characters each

Round 2 wrote that `eval_js` shows 8000 characters with the middle cut out. That is the loop's
cap, read from `robocoop-5-core`; the tool was not run. `eval_js` cuts a text itself, before the
loop sees it: `summary(r.value, 6000)` keeps the first 6000 characters and ends ` …(+N chars)`
(`robocoop-5-srctools`, `valueLib` and `tool_eval_js`). The same miss as round 1: a cap read, a
tool not run.

The brief now ends: `eval_js with (await (await fetch(address)).text()).slice(0, 6000), then
slice(6000, 12000) and on, since eval_js shows the first 6000 characters of a text and drops the rest.`

Run this time, in a QA tab on the round's build (`r=7301`): the page's own `tool_eval_js.execute`
on module `@tomlarkworthy/cloud-brain`, with the brief's code on
`https://cb4.endpointservices.workers.dev/llms.txt`, each output through the loop's `truncate`:

```
{"file":16745,"parts":[6000,6000,4745],"whole":true,"old7000":[6015,"` …(+1000 chars)"]}
```

`parts` are the slices from 0, 6000 and 12000; `whole` is that joined they are the file.
`old7000` is round 2's `.slice(0, 7000)`: 6015 characters, ending in the marker.

`test_eval_js_shows_the_slice_the_brief_names_whole` runs `tool_eval_js` on a text of 6000
(shown whole, and whole through `truncate(…, 8000)`) and of 6001 (6000 and ` …(+1 chars)`), so a
change of that number in robocoop-5 fails a test of the page.
`test_the_operator_is_pointed_at_what_the_brain_holds` holds `.slice(0, 6000), then slice(6000, 12000)`.

The test reads the tool with `runtime.module((await importShim("/@tomlarkworthy/robocoop-5-srctools.js?v=4")).default).value("tool_eval_js")`
after a first line `document;`, and does not import it. Tried first as an import: with no browser
the test then failed with "Text is not defined", from a cell the tool is built on, and `test.ts`
counts that as `failed` (its `noDom` names `document`, `location` and five others, not `Text`).
`test.ts` is in `cloud-brain-dev`, which the loop has no token to push. The form is the one
`brain-shell.ojs` uses in its own test ("An import by path gets the same module").

### Finding 2: `offset` with a procedure ran the write again

Both `brain_call` tools now refuse `offset` when `kind` is not `query`, before the call:
"offset is for a query. A procedure called again would run a second time, so it is not called."
(`offsetRefused`). The last line of a procedure's long answer reads `The rest is not read: a
procedure called again would run a second time`, and no longer names an offset. Both of the
reviewer's ways, since the second alone leaves the call open and the first alone leaves a line
that says to make it. The descriptions say "offset is refused with a procedure."

`test_brain_call_never_runs_a_procedure_again_for_the_rest`: a fake whose procedure answers 25000
characters, called once with no offset and once with `offset: 20000`; the second answers the
refusal and the fake ran 1 time.

Not changed: a procedure's answer over 20000 characters cannot be read past 20000. No method's
reference was searched for a procedure that answers so much.

### Tests, round 3

- QA tab on the build (`r=7301`), the snippet of step 8: `[22, []]`.
- `bun test.ts brain-x-page --with …/fb-a2vp4smwzq.js`: `passed` 10, `failed` 0, `needsBrowser` 12.
  The procedure test is one of the 10, the `eval_js` test one of the 12. 10 + 12 = 22.
- `verify-run.ts brain-x-page --shell <the build> --times 20`, ended 2026-10-11T17:06:07Z: first
  line `mains` `["@tomlarkworthy/brain-shell", "@tomlarkworthy/cloud-brain"]`; last line `runs` 20,
  `passed` 20, `failed` 0, `none` 0, `from` `["document"]`, `byChance` `[]`. Each of the 20 lines
  has `tests` 22, `failed` `[]`. On that page `robocoop-5-srctools` is not a main, so the
  `eval_js` test's read of it by path was run there 20 times.

### Not tried, round 3

- A turn with a model.
- `brain_call` of `assistantTools` through its `execute`, in a signed-in tab. Its two changed
  lines are the same as `turnTool`'s (`cloud-brain.ojs`, `offsetRefused` twice, `callAnswer(out, offset, kind)` twice).
- `eval_js` from a tab on the Brain's own address; the tab was on `file://`.
- `eval_js` on a value that is not a text (an object goes through `summarizeJS` with the same
  6000); the brief's code answers a text.
