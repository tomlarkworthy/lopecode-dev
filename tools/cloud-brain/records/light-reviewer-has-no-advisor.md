# light-reviewer-has-no-advisor: the light reviewer is started with no advisor

2026-10-11. The owner, after the table of what 198 cost comments with a usage give
(`cost-comment-has-billed-usage.md`, "The backfill"): "ok lets disable the advisor for review". Earlier the same
day, before those figures: "I think Fable advisor is helpful".

## Why

A light reviewer's first run was a median $2.85 at fitted prices against a fresh subagent reviewer's $2.47,
though its last request is smaller (91,046 against 110,484). It called the advisor 1.6 times a run in the mean
against 0.9, and a call sends the whole transcript to another model uncached: 51,375 to 83,233 tokens in the
seven light reviews read one by one that day.

## What changed

- `cloud-brain-dev/agent.sh` (`67a1245`, then round 2): `--settings '{"advisorModel":""}'` on every start and
  every `--resume`. `ADVISOR=1`, that value and no other, leaves the user's setting alone.
- `.claude/skills/brain-maintenance/SKILL.md` step 4 says the light reviewer has none.
- `cloud-brain-dev/README.md`, "A light agent for one role", has the measurements.

## How the switch was found

`~/.claude-personal/settings.json` has `"advisorModel": "fable"`. Three starts in `cloud-brain-dev`, each
`claude -p "Reply with the two letters OK and nothing else." --model opus --strict-mcp-config --tools
"Bash,Read,Grep,Glob" --output-format json`, the size being the input of the one request:

```
as it was                               9,871   transcript has an advisor_tool row, available: true
--settings '{"advisorModel":""}'        8,513   no such row
--disallowedTools advisor               9,871   the row is there
```

Then `agent.sh reviewer` with a task to name its tools (session `7a22a635`): "Bash, Read, Grep, Glob", 14,792
after reading its brief, no `advisor_tool` row.

## Tests

`tests/tools/light-agent.test.ts`, "no advisor unless ADVISOR=1": the settings argument on a start and on a
resume, none with `ADVISOR=1`, and since round 2 the argument again for `0`, `false`, `off` and a space.
The file: 14 tests, 47 expects.

## Round 2 (review 1892, the first review with no advisor: 62,866 at its end, 16 requests, 147 s, $0.81 as Claude Code reported it)

1. There was no record. This file.
2. The two new lines of `agent.sh`'s header stood between "stdout is one JSON line:" and the line's shape. Moved below.
3. `ADVISOR=0` left the advisor on, as any value that is not empty did. Now `1` alone does. Tested.
4. The README's "1.2 to 1.6 times" had no source; 1.2 was the mean of later runs and was not written anywhere.
   It now gives 1.6 for a first run and names the record that has it.

## Not done, not tried

- A reviewer spawned as an Agent, the loop's fallback, has the advisor of its session. No switch for one subagent was looked for.
- One review has run with no advisor. Whether reviews find less without it was not measured, and one review cannot say.
- A real `--resume` with no advisor was not run; the test reads the argument only.
- The implementer, the spec writer and the overseer are subagents and keep the advisor.
