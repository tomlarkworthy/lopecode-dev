---
topics: using Claude Fable 5 economically; routing token-heavy work through subagents; subagent model selection; Fable pricing
triggers:
  - "^(Edit|Write|MultiEdit|NotebookEdit) "
  - "^Bash "
  - "^(Agent|Task) model=inherit"
when-model:
  - "fable"
---

# Effective use of Fable

## Why this repo in particular

Prices per MTok, from the `claude-api` skill's model table (cached 2026-06-24):

```
Fable 5     $10 in  $50 out      2x Opus 5,  5x Sonnet 5,  10x Haiku 4.5
Opus 5      $ 5 in  $25 out
Sonnet 5    $ 2 in  $10 out
Haiku 4.5   $ 1 in  $ 5 out
```

Cache read is ~0.1x input, so a Fable cache read is $1/MTok. Every token in the main
context re-bills at that rate on **every later turn**.

What makes it bite here is the file format. Measured 2026-08-28:

```
lopecode/notebooks/    50 files   117 MB   mean 2.3 MB
lopebooks/notebooks/  183 files   641 MB   mean 3.5 MB
largest: linux-claude.html 48M, coded-landmark-tracking 14M, blog-netlify 13M
```

A *mean* lopebook is ~918k tokens at 4 chars/token — one file that nearly fills the 1M
window. Reading it once on Fable is ~$9, and then ~$0.92 on every subsequent turn for
the rest of the session. CLAUDE.md tip 1 ("never read entire HTML files") is a cost
rule on Fable, not only a context rule.

**Unverified:** the 4 chars/token estimate is not a `count_tokens` measurement. The
byte counts are exact; treat the token figure as an order of magnitude.

## Policy when the session runs on Fable

- Route token-heavy work through subagents: corpus sweeps, `lope-reader.ts` dumps over
  many notebooks, `lope-preflight.ts` full runs, bulk-export QC, QA report reading, log
  and test output. Ask them for conclusions, never file contents.
- Set `model` explicitly on every Agent call: `sonnet` for mechanical work (greps, notebook
  scans, rote edits), `opus` for code authoring and analysis, `fable` only when the task
  needs frontier judgment. Sonnet is the floor. `fork` subagents always inherit Fable and
  ignore the override — that is stated in the Agent tool's own description, so a `fork` is
  never a cost saving.
- Mechanical skills: frontmatter `context: fork` + `model: sonnet` (`background: true` for
  long-running monitors). A bare `model:` without `context: fork` only switches the rate —
  the output still lands in the Fable context. Verified in use at
  `taktile/.claude/commands/grant-oncall.md:1-7` (`context: fork` / `model: sonnet` /
  `background: false`) and `run-e2e.md` (`background: true`).
- Skills that manipulate the session or must ask the user mid-run cannot fork. Here that is
  `/restart` (writes the restart descriptor, then `kill $PPID`), `/pair-headless` and
  `/design-login`.
- The Fable main loop does synthesis, judgment, reviewing subagent output, decisions — and
  **all prose written for humans** (PR bodies, commit messages, `knowledge/*.md`, notebook
  `md` cells), never delegated.
- Never paste large command output, logs, or file dumps into the main context; run them in a
  subagent, or redirect to a file and have a subagent summarize.

No lopecode skill currently sets `context: fork` — checked across every
`.claude/skills/*/SKILL.md` on 2026-08-28, all seven carry only `name`/`description`/`version`.
Converting the mechanical ones is open work, not something this port did.

## Compact at task boundaries

When a user message starts a task unrelated to the work so far and the session already
carries substantial context, do not start work. Reply only with the exact command for the
user to copy-paste, placeholder filled in:

```
/compact focus on <the new task, one line>
```

Then stop and wait. If the user proceeds without compacting, do the task without
suggesting it again.

<!-- injection-ends -->

## How this is enforced

Only the text above the `<!-- injection-ends -->` marker is injected into a Fable
session; everything below is for humans. Policy was 3.7 kB, meta 4 kB, and the whole
body was billed as cache read on every turn until 2026-08-29.

Ported 2026-08-28 from `taktile/learnings/effective-use-of-fable.md`. The policy is
taktile's; the numbers were re-verified against this repo, and the enforcement was cut
down to the two hooks that work without taktile's learnings-gate (see *What was not
ported*).

Two hooks, wired in `.claude/settings.json`:

| hook | script | effect |
|---|---|---|
| `SessionStart` | `scripts/learnings-session-model.sh` | caches the `model` field from hook stdin so the model is resolvable on turn 1, before the transcript has an assistant entry |
| `UserPromptSubmit` | `scripts/learnings-model-policy.sh` | once per session, if the model matches `fable`, prints this file's body (frontmatter stripped) into context |
| `PreToolUse(Agent\|Task)` | `scripts/agent-model-gate.sh` | on a Fable session, exit 2 on an Agent spawn with no `model` set; `subagent_type: fork` is exempt |

Model resolution lives in `scripts/lib/learnings-match-string.sh` (`lms_resolve_model`): it
reads the last non-`<synthetic>` `"model":"…"` from the tail of the transcript, falling back
to the SessionStart cache, and memoises per `prompt_id`. An unresolvable model is the empty
string, and **every one of these hooks fails open on it** — no injection, no gate. So a
session where resolution breaks silently loses the policy rather than blocking work.

The body of this file is what gets injected, so edits here change the live policy. The
frontmatter is stripped by an `awk` that skips to the second `---` and stops at the
`<!-- injection-ends -->` marker; a file with no frontmatter injects *nothing*, silently,
and a file with no marker injects everything. Keep both.

## What was not ported, and why

Taktile drives this file from a general learnings gate: 74 files in `learnings/`, each with
`triggers:` regexes matched against a per-call match string, a per-session read-tracking
index fed by `PostToolUse(Read)` and `PostToolUse(Bash)`, a `SessionStart(compact)` reset,
a trigger linter (`check-learnings-triggers.sh`, 235 lines) and a test suite
(`test-learnings-hooks.sh`, 902 lines). A gated call is *blocked* until the matching
learning has been read this session.

That was left out. Cost of leaving it out: the `triggers:` block above is inert — nothing
matches it, and the enforcement is the injection plus the Agent gate, not a block-until-read.
Cost of taking it: it imposes frontmatter and trigger-regex discipline on all 22 existing
`knowledge/*.md`, and the trigger rules are subtle enough that taktile needed a linter and a
900-line test to keep them from firing on prose (see the header comment in
`taktile/scripts/learnings-gate.sh` — seven numbered rules, each recorded as learned from a
measured false positive).

`scripts/lib/learnings-match-string.sh` was copied **verbatim** rather than slimmed, so that
adding the gate later is a settings change and not a rewrite. About 60% of it — the read-only
Bash allowlist, the write-path exemptions, the MCP content extraction — is unused by the two
hooks that are wired up.

## Verification, 2026-08-29

Hooks were first exercised by priming the SessionStart model cache by hand and feeding
hook stdin directly. All four scripts pass `bash -n`.

`agent-model-gate.sh`, six cases:

```
fable + Agent, no model         exit=2 (BLOCKED)
fable + Agent, model=sonnet     exit=0
fable + Agent, subagent=fork    exit=0
opus  + Agent, no model         exit=0
unresolvable model, no model    exit=0     <- fails open
fable + Bash (not an Agent)     exit=0
```

`learnings-model-policy.sh`: on a primed `claude-fable-5` cache the first call prints the
policy body with the frontmatter stripped; the second call prints 0 lines (the sentinel
holds). On `claude-opus-5` it prints 0 lines and creates no sentinel, so it re-checks next
turn rather than burning the once-per-session budget on a model switch.

The frontmatter hazard was checked against the actual `awk`: a body with no `---` lines
prints 0 lines, silently. That is the failure mode to watch for if this file is ever
edited by something that strips YAML.

Live, 2026-08-29 06:21, session `51833f32…` on `claude-fable-5`:

```
claude-learnings-model-51833f32…         d82f6de3…<TAB>claude-fable-5
claude-learnings-model-policy-51833f32…  created (sentinel)
grep -c 'MODEL POLICY (claude-fable-5'   1     <- injected exactly once
grep -c 'BLOCKED (Fable session)'        0     <- gate not yet hit
```

Switching to Fable mid-session with `/model` lags one turn: the resolver reads the last
assistant entry in the transcript tail, which is still the old model until the first
Fable reply lands.
