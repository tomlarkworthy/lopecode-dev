# writers-qa-tabs-wake-the-orchestrator: a writer's browser run with no pairing

2026-10-11. Asked for by the owner in the orchestrating session: "yes file an issue to stop the write subagents
pairing channels from spamming the maintanance session".

## What was measured first

The issue said the count and the tokens were not measured. The orchestrating session of that day is
`f501a8e8-b922-4e11-a581-2b725efd6272`. `channel-wakes.ts` (new, below) reads its transcript:

```
$ date; bun tools/cloud-brain/channel-wakes.ts --session f501a8e8-b922-4e11-a581-2b725efd6272
Sun 11 Oct 2026 21:36:35 CEST
{"rows":1047,"byType":{"connected":87,"variable_update":438,"cell_change":433,"disconnected":89},"notebooks":47,
 "first":"2026-10-11T09:23:59.687Z","last":"2026-10-11T19:34:07.593Z",
 "answers":{"requests":501,"input":2004,"cacheWrite":510617,"cacheRead":120112812,"output":16039}}
$ bun tools/cloud-brain/agent-usage.ts --session f501a8e8-b922-4e11-a581-2b725efd6272
{"input":4333,"cacheWrite":2833577,"cacheRead":323212726,"output":667726,"requests":1376,…}
```

- 1,047 rows from the channel server in 10 h 10 min, naming 47 different notebook files.
- 501 of the session's 1,376 requests had a channel row as their prompt, and 120,112,812 of its 323,212,726
  cache-read tokens were in those requests: 36% and 37%. Their output was 16,039 tokens, 32 a request.
- A row that arrives while a turn runs starts no request of its own, which is why 1,047 rows are 501 requests.

Whose tab each row came from was not separated: a row has the file's address and no agent's name. At 21:50, of
51 addresses, 30 were under `.claude/worktrees/` (writers' builds) and 19 under the session's scratchpad (copies
of the notebook; whose, not read). A reviewer started with `TAB=1` has a
channel server of its own (`cloud-brain-dev/agent.sh`) and is not in this transcript.

## The three ways of the issue

| Way | Verdict |
|---|---|
| The session's channel server does not forward a subagent's tab | Not the loop's: the channel server is in the Never list of `rules.md`. Looked for a switch that exists already (`grep -n "quiet\|silent\|mute" lopecode-plugin/src/lopecode-channel.ts`): none for a session's notifications. |
| A writer has a channel server of its own, as the light reviewer does | A writer is an `Agent` call and has the session's MCP servers. It would have to become a `claude -p` process (`agent.sh`), which changes how `SKILL.md` spawns and resumes writers. Not tried. |
| The browser run is made in Playwright with no pairing | Taken. A tool and an edit of the brief, undone by one revert (`philosophy.md`, line 2). `verify-run.ts` already launched a local headless Chrome this way. |

Prior art searched on the Brain (`knowledge.search`, semantic): "QA tab channel notifications wake orchestrating
session" and "run module tests in headless Playwright without pairing". Read from the answers:
`knowledge/changing-and-deploying-a-cloud-brain-worker.md` (the side-module observers of its step 3, and
"A Playwright script in `tools/`"). `tools/cloud-brain/run-tests.js` is an older in-page routine of the same
kind, for a paired tab; it waits on each test in turn for 20 s and was not reused.

## What changed

- `tools/cloud-brain/tab-tests.ts` (new). `tab-tests.ts NOTEBOOK MODULE [--emit CELL=FILE]… [--timeout S] [--boot S]`.
  It opens the file at `#view=C100(S100(MODULE))&r=…`, with no pairing pane and no `cc=`, waits until the module
  is in the runtime's `mains` with a `test_` cell, and observes each `test_` cell from a module of its own, as
  the snippet of the brief did. One line of JSON: `tests`, `passed`, `failed` (name and message, `TIMEOUT`
  after 90 s), `emitted`, `notEmitted`. `--emit` writes `(await module.value(CELL)).emit()` to FILE when every
  test passed. Exit 0, 1 (a test failed; nothing emitted), 2 (an emit not written), 64, 70. The header is the reference.
- `tools/cloud-brain/channel-wakes.ts` (new): the count above. `--match TEXT` counts the rows that name TEXT.
- `.claude/skills/brain-maintenance/agents/implementer.md`: step 8 is the tool's command in place of
  `qa_open_notebook` and the `eval_code` snippet, and says not to open a paired tab for it and why; step 9's
  emit is the tool's `--emit` to `<root>/tools/cloud-brain/.emitted/<id>-<worker>.json` in place of the POST to
  the receiver on 47814; "A resumed round" no longer speaks of a tab.
- `knowledge/changing-and-deploying-a-cloud-brain-worker.md`, step 3: five lines that name the tool.

Changed from the old flow on purpose: a build with a failed test is not emitted. In the tab the emit was a
second call and nothing tied it to the count.

## What was run

All in the worktree, on a build of `main` at `f7d03412`, Chrome 151.0.7922.34.

Every module that a Worker of cb4 runs, through the tool and through `cloud-brain-dev/test.ts` (what cb4 runs,
no browser), 21:42:09 to 21:49:46 CEST:

```
module            tab-tests: tests passed failed ms   test.ts: passed failed needsBrowser
brain-ai          9 9 0 15797      8 0 1        brain-issues     32 32 0 23521   21 0 11
brain-blob        8 8 0 17577      8 0 0        brain-kernel     28 28 0 22070   28 0 0
brain-bluesky     21 21 0 16288    21 0 0       brain-knowledge  11 11 0 16246   10 0 1
brain-browser     18 18 0 18425    17 0 1       brain-library    9 9 0 16828     8 0 1
brain-container   8 8 0 15141      7 0 1        brain-logs       7 7 0 14068     7 0 0
brain-core        34 34 0 17316    34 0 0       brain-proxy      3 3 0 5242      3 0 0
brain-dashboard   11 11 0 19212    11 0 0       brain-snapshot   10 10 0 18345   9 0 1
brain-db          11 11 0 15747    11 0 0       brain-static     12 12 0 12969   12 0 0
brain-deployer    56 56 0 25002    (not compared) brain-whatsapp 11 11 0 22090   11 0 0
brain-feed        11 11 0 20965    10 0 1       cloud-brain      23 23 0 13966   10 0 13
brain-git         6 6 0 14902      6 0 0        cloudflare-iac   26 26 0 13275   24 0 2
brain-inbox       4 4 0 14514      4 0 0
```

23 modules, 369 tests, none failed. For 22 of them the tool's `tests` equals `passed + needsBrowser` of
`test.ts`. `brain-deployer` was not compared: `test.ts brain-deployer` runs `cloudflare-iac` (24, 0, 2), and the
run with the module's name was not made.

- **The emit is the one a paired tab made.** `--emit static_service=…` on that build wrote a record of 195,683
  bytes with `hash` `c93090dafeae…`, the hash `cloud-brain-dev/deploy/services.json` has for `brain-x-static`
  as deployed. One module; no record written by the tool has been applied.
- **A failed test.** A cell `test_static_tab_tests_probe = { throw new Error("made to fail"); }` added to
  `brain-static.ojs` and built to another file: `"tests":13,"passed":12,"failed":["test_static_tab_tests_probe made to fail"]`,
  `"notEmitted":["static_service a test failed"]`, exit 1, no file. The seed was put back (`git checkout`).
- **Wrong inputs.** A module that is not there, `--boot 5`: exit 70, "was not defined with a test_ cell in 5 s".
  `--emit nope_service=…`: exit 2, `"notEmitted":["nope_service evaluate: RuntimeError: nope_service is not defined"]`.
- **The session was not sent a row.** After the 31 runs of the tool above:

```
$ date; bun tools/cloud-brain/channel-wakes.ts --session f501a8e8-b922-4e11-a581-2b725efd6272 --match bm-writers-qa-tabs-wake-the-orchestrator
Sun 11 Oct 2026 21:49:56 CEST
{"rows":1081,…,"notebooks":50,"matched":0,…,"answers":{"requests":521,…}}
```

  `matched` is the rows that name this issue's worktree, where every file the tool opened was: none of the
  1,081 does. Whose the 34 rows since 21:36 are was not read.

Tests: `tests/tools/tab-tests.test.ts`, 9 tests. Seven are of the tool with no browser: the in-page functions
run against a real `@observablehq/runtime` (a throw and a hang are named, a same-named test of another module is
not read, nothing is defined in the module under test), the address, the arguments, the exits. One is of
`channel-wakes.ts`. One reads steps 8 and 9 of the brief; it failed before the brief was edited
(`8 pass, 1 fail`). The suite: `bun test ./tests/tools` in the worktree, after the rebase onto `main` at `943cf83d` and the last
edit of a file it reads: 330 pass, 0 fail, 38 files (326 and 37 before the rebase, which brought in a test file).

## What was not tried

- No writer has made a round with the new brief. A writer spawned before this landed has the old step 8 in
  its context and opens a tab as before.
- The digest writer's brief (`agents/digest.md`, steps 6 and 8) opens a paired tab once a day. Not changed.
  (Changed 2026-10-12, `digest-counts-in-a-paired-tab`: both steps count with `digests/count.ts`, and no tab is
  opened; `records/digest-counts-in-a-paired-tab.md`.)
- "When a deploy is put back on a test" in the writer's brief still says to open the run address in a QA tab.
  Not changed: the address is the Brain's and the tool takes a file.
- A test that depends on the pairing pane or on `cc=` in the address would differ between the tool and a
  tab. None of the 369 did; a paired tab was not opened beside the tool to compare counts.
- `--emit` twice in one call, and an emit of `brain-deployer`'s two modules.
- A file that is no notebook, and a notebook whose boot list lacks the module but whose view could load it.
- `channel-wakes.ts` on a transcript of another session, and on one with a second channel server.
