---
scope: [local-development]
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

`qa-notebook` is the one lopecode skill that forks (`context: fork` / `model: opus`,
set 2026-08-29). The rest cannot: `bug-fix` stops for approval between phases,
`lopeteam` and `lopeteam-reflect` are human-gated, `document` writes prose for humans,
`/improve` and `/reflect` analyse the session's own context.

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
taktile's; the numbers were re-verified against this repo. The first port (2026-08-28)
carried only the three model hooks; the learnings gate followed on 2026-08-29 (see
*Ported 2026-08-29*).

Hooks, wired in `.claude/settings.json`:

| hook | script | effect |
|---|---|---|
| `SessionStart` | `scripts/learnings-session-model.sh` | caches the `model` field from hook stdin so the model is resolvable on turn 1, before the transcript has an assistant entry |
| `UserPromptSubmit` | `scripts/learnings-model-policy.sh` | once per session, if the model matches `fable`, prints this file's body (frontmatter stripped) into context |
| `PreToolUse(Agent\|Task)` | `scripts/agent-model-gate.sh` | on a Fable session, exit 2 on an Agent spawn with no `model` set or with `model: fable`; `subagent_type: fork` is exempt. It does not judge `opus` versus `sonnet` — that is this document's job |
| `SessionStart` | inline `ls knowledge/*.md` | prints the knowledge index and the read-before-acting rule |
| `PreToolUse(Bash\|Edit\|Write\|Agent\|mcp__lopecode__…)` | `scripts/learnings-gate.sh` | exit 2 when the call's match string hits a `triggers:` regex in a `knowledge/*.md` not yet read this session |
| `PostToolUse(Read)`, `PostToolUse(Bash)` | `scripts/learnings-track-read.sh`, `scripts/learnings-track-bash-read.sh` | credit a read of `knowledge/*.md` (Read tool, or `cat`/`sed`/`grep` naming the file) to the per-session index |
| `SessionStart(compact)` | `scripts/learnings-reset-on-compact.sh` | drop read credit older than 30 s and re-arm the policy injector |

Model resolution lives in `scripts/lib/learnings-match-string.sh` (`lms_resolve_model`): it
reads the last non-`<synthetic>` `"model":"…"` from the tail of the transcript, falling back
to the SessionStart cache, and memoises per `prompt_id`. An unresolvable model is the empty
string, and **every one of these hooks fails open on it** — no injection, no gate. So a
session where resolution breaks silently loses the policy rather than blocking work.

The body of this file is what gets injected, so edits here change the live policy. The
frontmatter is stripped by an `awk` that skips to the second `---` and stops at the
`<!-- injection-ends -->` marker; a file with no frontmatter injects *nothing*, silently,
and a file with no marker injects everything. Keep both.

## Ported 2026-08-29

The learnings gate that drives this file in taktile — `triggers:` regexes in frontmatter,
a per-session read index, a compact reset, and the linter `check-learnings-triggers.sh` —
was ported the day after the model hooks, retargeted from `learnings/` to `knowledge/`.
Fourteen of the 23 `knowledge/*.md` carry `triggers:`; the rest (concepts, quality
criteria, design records) have no action to gate on. The linter passes on all 23 regexes.
Trigger rules are the seven in the header comment of `scripts/learnings-gate.sh`; run the
linter after editing any frontmatter. Taktile's 902-line `test-learnings-hooks.sh` was not
ported; the gate was checked by hand (block on unread `sync-module.ts`, allow after Read,
allow after `sed` credit, read-only Bash exempt).

Why it was ported: session `51833f32` (started 2026-08-24, before either port) ran 573
turns on Fable, spawned three research subagents on `opus` where `sonnet` was the policy,
and at 07:27 on 2026-08-29 wrote a memory encoding "mechanical → Opus". Injection alone,
arriving at turn ~400 of a long session, did not correct it; a block-until-read gate would
have.

`qa-notebook` now forks (`context: fork` / `model: opus`). The other skills cannot:
`bug-fix` stops for approval between phases, `lopeteam` and `lopeteam-reflect` are
human-gated, `document` writes prose for humans, `/improve` and `/reflect` analyse the
session's own context.

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
