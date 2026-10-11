# The operator's brief points at where more is kept (`fb-a2vp4smwzq`)

The owner's note on the page at "Operator", 2026-10-11 (event 1158):

> This operator is lagging what the maintanance loops do, it should have access to cloudbrain-dev and the knwledge base and be more aware of how things work than it currently does, not with a big system prompt but to points of where to get more information from, maybe the llms.txt as well

Written 2026-10-11 by a writer of the issue loop, round 1. The seed commit's author time is
18:17:17 +0200 (`git log --format=%ai`).

## What changed

`tools/cloud-brain/cloud-brain.ojs`: one line added to `assistantPrompt`, after the line about
`cloud-brain-docs`, and one test. No tool was added and `assistantRefuses` is as it was.

The line, as the tab read it from `assistantPrompt` (`brainOrigin` is empty on a file address;
on cb4 it is the Brain's address):

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
  a brief, `rules.md` or `philosophy.md`.
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
