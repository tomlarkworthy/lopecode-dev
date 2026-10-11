# light-reviewer-in-use

The reviewer of the issue loop is a process of its own with four tools and its brief on the Brain. Built
2026-10-11 by a session outside the loop on the owner's word, then filed as an issue so that it is reviewed
(the owner: "you will need reviews on the work so you can use the lightweight agent to review the tickets and
act as the orchistrator").

## What changed

| Where | What |
|---|---|
| `cloud-brain-dev@e3f1e6b`, `@4f14fc8` | `agent.sh` (the launcher, `--resume`, `TAB=1`), `CLAUDE.md` (three lines), `.claude/settings.json` and `.claude/hooks/brain-read.sh` (a Read under `brain/` fetches `/static/cloud-brain-dev/<path>`), `put.sh` (put, `--delete`, `--get`, the copy before kept), `.gitignore`, README "A light agent for one role" |
| `lopecode-dev@35a6da21` | `SKILL.md` step 4 starts the reviewer with `agent.sh`; `agents/reviewer.md` is a pointer; `agents/overseer.md` and `rules.md` name `put.sh` and the token `loop-roles` |
| this commit | `tests/tools/light-agent.test.ts`, this record |
| cb4, no deploy | the file `cloud-brain-dev/roles/reviewer.md` in the file store, public; six files under `cloud-brain-dev-history/`; the token `loop-roles` |

## What was measured

In `cloud-brain-dev/README.md`, "A light agent for one role", with the commands: the size of a request for five
ways of starting an agent (40,842 for an Agent of lopecode-dev told to answer OK; 25,212 for `agent.sh reviewer`
after its brief, the rules and `philosophy.md`), and one review replayed (69,440 at its end against 100,725,
the same verdict, one of the two findings of event 195 and two that no round had).

## Tests

`bun test ./tests/tools/light-agent.test.ts`: 9 pass, 0 fail, 19 expects (2026-10-11). `bun test ./tests/tools`:
169 pass, 0 fail, 20 files. The Brain in them is a server of the test process and `claude` a stand-in on PATH.
They cover the hook (a fetch each read, a 404, a Brain that does not answer, a path outside `brain/`, `..`),
the arguments `agent.sh` gives `claude` and the JSON line it prints, and the refusals of `agent.sh` and `put.sh`.

## Not tried, not known

- `put.sh` past its refusals has no test: its put, delete, history and index were run once each on cb4
  (the reviewer's brief put; five files deleted; `static.list` showed six kept copies, not public).
- No review made this way was on the tracker when this was submitted. The review of this issue is the first.
- A review that uses the tab. `TAB=1` opened and closed one tab.
- Whether the hook fires for a `claude -p` of another version than 2.1.296.
- The token `loop-roles` reaches every path of the file store; only `put.sh` uses it.
- The rules ask for `knowledge/working-with-cloud-brain-remote-lopecode-cluster.md` before `brain.ts`; no hook
  makes this reviewer read it, and the replayed one did not.
