# ta-5-outside-session-doc

## 2026-10-12: the guide tells a session outside the loop to make an `out-` token. The command was not run

Task 5 of `plan/cloud-brain-record-names-token-not-agent.md`, approved at event 1285. A doc and a
test file: no seed, no Worker, no deploy. Started at event 3993 (2026-10-12 12:22:34 CEST, its `at`).

**The three lines the guide now gives were run by nobody.** The writer was an agent of the issue
loop, which makes no token (`rules.md`, "Which token": "An agent the orchestrating session spawned
does not make itself a token"). What the guide says `agent-token out` prints and keeps is read from
`tools/cloud-brain/brain.ts` and from `records/ta-1-agent-token-command.md`, not seen for the role
`out`. The record had no event of an `out-` token to read either:

```
$ python3 <scratch>/holders.py <worktree>     # issue-as.sh impl-cdf92d "sync?after=N", page by page; by.holder, the six hex digits cut
events 3995 last 3995
1774 secret:issues-implementer-2
607 secret:impl-*
495 secret:orch-*
474 secret:issues-reviewer-2
215 secret:issues-overseer-1
168 via:session
141 secret:rev-*
58 secret:over-*
23 secret:spec-*
15 secret:claude-mv2fpk63-c9a3
12 via:None
4 via:
3 secret:dig-*
2 secret
2 secret:issues-implementer-1010
2 secret:issues-reviewer-1010
Mon 12 Oct 2026 12:23:14 CEST
```

No line starts `secret:out-`. The spec's task says the doc "says to run `brain.ts agent-token out`
before a first write to the tracker, in place of a role's token", and that is what was written. The
last item of the new part says it was not run and asks the first session that runs it to say how
it went.

### What changed

`knowledge/calling-a-cloud-brain-from-this-checkout.md`, under "Access from this checkout":

| Before | After |
|---|---|
| "**No token of your own for the tracker.**" | "**No token for the tracker from `brain.ts token`.**" A session outside the loop now has a token of its own, so the old heading said the opposite of the part under it. The events and the guard it quotes are unchanged |
| "An agent of the issue loop writes to the tracker with its role's token through `tools/cloud-brain/issue-as.sh` … and makes no other" | A paragraph: since 2026-10-11 a token for the tracker is made with `brain.ts agent-token`; an agent of the loop writes "with the token its prompt names and makes none" |
| nothing for a session the loop did not start | "**A session outside the loop makes itself a token before its first write to the tracker**", with three lines (`agent-token out "…"`, a comment through `issue-as.sh out-xxxxxx`, `agent-token revoke out-xxxxxx`) and five items: what the token is, what the command prints with no parent, why, that it was not run, and the label `owner` |
| "**An issue the owner asked for.**", a paragraph of its own (`os-1-owner-label`, which landed while this task was held; comment 2715 of this issue) | its sentences, unchanged, as the last item of that part |
| "`--as` also reads `.emitted/<base>-issues-tokens.json`" | and `.emitted/<base>-agent-tokens.json` (`brain.ts`, the `curl` command: `{ ...tokens(AGENTS), ...tokens(BASE + "-issues-tokens.json"), ...tokens() }`) |
| `topics:` of the frontmatter | gains "brain.ts agent-token out, the tracker token of a session outside the issue loop" |

Two specs gain an "(As built, `ta-5-outside-session-doc`, 2026-10-12: …)" line:
`plan/cloud-brain-loop-order-of-service.md` where it says which of the two tasks adds the sentence,
and `plan/cloud-brain-record-names-token-not-agent.md` at task 5 ("With task 3": it landed after).

`tests/tools/issue-watch.test.ts` is not changed. Comment 2715 asked that its test of the label
sentence be changed with the move. The sentence was moved word for word, so that test reads it as
before (13 pass, below), and where the sentence stands is held by the new file.

### What was seen, and what was read

| Sentence of the guide | From |
|---|---|
| a token made by `agent-token` is read by `issue-as.sh` | seen: every tracker call of this task was `issue-as.sh impl-cdf92d …`, a name of `cb4-agent-tokens.json`; `get?id=ta-5-outside-session-doc` answered 200 |
| an event's `by.holder` is the token that wrote it | seen for `impl-`: event 3993 has `"holder":"secret:impl-cdf92d"` (the answer of the `start` move) |
| the main checkout's `.emitted/` has the parent | seen, the name only: `'loop-agents' in json.load(open('<root>/tools/cloud-brain/.emitted/cb4-tokens.json'))` printed `True` at 12:24 CEST. Whether it is still a live row on cb4 was not asked |
| `issue.*`, 48 hours, `cb4-agent-tokens.json`, the note | read: `brain.ts`, `const ROLES = […, "out"], PARENT = "loop-agents", HOURS = 48`, `const AGENTS = BASE + "-agent-tokens.json"`, and the `else` branch that makes the child. The new test holds the first two lines |
| mode 600, the value not printed, stdout the name alone | read: the table and "What the test holds" of `records/ta-1-agent-token-command.md` (`tests/tools/agent-token.test.ts`, against a stand-in) |
| the line printed with no `loop-agents` | read: the same record's run of `agent-token list` on 2026-10-11, and the `stop(…)` of `brain.ts` that prints it for every `agent-token` command |
| 10 events of `issues-overseer-1` were an outside session's | read: the spec, "The overseer token is two" |

### The test

`tests/tools/ta-5-outside-session-doc.test.ts`, six tests, reads the guide (`GUIDE=<file>` reads
another copy) and two lines of `brain.ts`.

```
$ git show origin/main:knowledge/calling-a-cloud-brain-from-this-checkout.md > <scratch>/guide-before.md
$ GUIDE=<scratch>/guide-before.md bun test ./tests/tools/ta-5-outside-session-doc.test.ts
 0 pass
 6 fail
 8 expect() calls
$ bun test ./tests/tools/ta-5-outside-session-doc.test.ts
 6 pass
 0 fail
 17 expect() calls
$ bun test ./tests/tools/issue-watch.test.ts
 13 pass
 0 fail
$ bun test ./tests/tools/doc-token-example.test.ts
 3 pass
 0 fail
$ tests/tools/suite.sh
 589 pass
 0 fail
Ran 589 tests across 61 files.
```

The first draft of the new paragraph failed one of the six: it quoted the old words, "with its
role's token", which the test refuses anywhere in the guide. The quote was taken out.

`doc-token-example.test.ts` refuses a line with `brain.ts token <name> … issue.`. The line the guide
quotes for a missing parent is the tool's own, `token loop-agents 'issue.*' --delegate`, with no
`brain.ts` before it, and passes.

### Not tried

- `brain.ts agent-token out`, a write with an `out-` token, `agent-token revoke` of it, on cb4 or
  against the stand-in for that role. `tests/tools/agent-token.test.ts` makes "seven roles"
  (`ta-1`'s record); it was not run again for this task apart from the suite.
- `agent-token` from a worktree with `BRAIN_STATE_DIR`. The guide says "From the main checkout".
- Whether a session outside the loop reads this guide before it writes. The guide's triggers are
  `brain.ts` and `knowledge-docs.ts` commands; a first call that is `issue-as.sh` matches none of
  them, and no trigger was added.
- The label sentence as a session would act on it: no issue was opened with `"labels":["owner"]`.
- The three role tokens are still kept, and nothing refuses a session that writes with one. The
  spec puts their revoke with the owner, after `ta-6-checks-after-three-issues`.

### Searched for

`knowledge.search?semantic=true` with `loop-knowledge`, twice: "session outside the loop token for
the tracker" and "agent-token out before first write". Both put
`doc:cloud-brain-record-names-token-not-agent` first (scores 1 and 0.921), the spec of this task;
the first also listed this guide (0.441). Nothing else bore on it.
