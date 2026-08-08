# robocoop-5 pluggable situational context

## Problem

robocoop-5 starts every conversation blind. The system prompt (`robocoop-5-engine.systemPrompt`)
describes the notebook *model* and the agent's own anatomy, but says nothing about the **situation**:
which notebook it is in, what the human is looking at, what the human just changed, or what time it
is. The agent burns steps re-deriving that with `glob`/`read_file`, and it cannot derive the parts
that only exist in the browser (scroll position, focused pane, wall-clock time, edit recency).

Today the only live signal into the loop is `noticesProvider` — watched-variable deltas drained at the
top of **every** step. That is a delta channel, not an orientation channel.

## Design

### 1. One new seam in the loop: `contextProvider`

`createAgentSession` (`@tomlarkworthy/robocoop-5-core`) gains one option, sibling to `noticesProvider`:

```js
contextProvider: async ({ scope, turn }) => string | null
```

Called inside `send()`, not per step:

- `scope:'session'` — called once, on the first `send()` of a session. Result is spliced as a
  `{role:'system'}` message at index 1, immediately after the system prompt. It then lives in the
  cached prefix forever (zero recurring cost).
- `scope:'turn'` — called at the start of every `send()`, **before** the user message is pushed, so
  the human's words stay last. Result is pushed as `{role:'system', content:'<environment …>'}`.

Placement matters for cost: both land at the end of the growing history, so the two
`cache_control` breakpoints the client sets (system message + rolling last message) keep working
unchanged.

New callback `callbacks.onContext?.(scope, text)` so the UI can show what was injected.
`reset()` clears the session-scope latch so a new chat re-emits it.

Alternative considered and rejected: piggyback on `noticesProvider`. It has no turn boundary (fires
every step) and no session scope, so context would repeat 40× per turn. A second seam is ~15 lines.

### 2. Registry: `rc5-context` plugin set

Mirror the existing tool registry exactly (`@tomlarkworthy/robocoop-5-tools`), which is built on
`@tomlarkworthy/plugin-registry`:

| tools (exists) | context (new) |
|---|---|
| `registerTool(tool)` / `unregisterTool(id)` | `registerContext(provider)` / `unregisterContext(id)` |
| `toolsView` — `{value:[…]}` mutable box fed by the plugin generator | `contextView` — same shape |
| `plugins.get('rc5-tools')` | `plugins.get('rc5-context')` |

`contextView` being a mutable box (not a reactive array) is **load-bearing**: `session` must not take
a reactive dependency on the provider list, or registering a provider mid-conversation rebuilds the
session and wipes the chat history. This is the same reason `toolsView` exists.

The engine wires it in with no new session dependency:

```js
contextProvider: ({scope, turn}) => composeContext(contextView.value, {scope, turn})
```

`composeContext` is a pure function in `robocoop-5-core` (node-testable, DOM-free).

### 3. Provider contract

```js
registerContext({
  id: 'viewport',                 // unique; re-register replaces
  label: 'On screen',             // section heading in the block
  scope: 'turn',                  // 'session' | 'turn'  (default 'turn')
  priority: 20,                   // lower first; ties → registration order
  budget: 400,                    // max chars for this section (default 400)
  render: async ({turn, since}) => 'string | null'   // null ⇒ omit the section entirely
});
```

`composeContext` guarantees:

- **Isolation** — every `render` in try/catch; a throw drops that section, never the turn.
- **Timeout** — 250 ms per provider, 1 s total, via `Promise.race`; a slow provider is dropped with
  `(timed out)`.
- **Budget** — per-section `truncate` (reuse core's head+tail `truncate`), plus a total cap
  (default 1500 chars/turn) applied in priority order; overflow is dropped and noted.
- **Silence** — `null`/empty ⇒ no section. A turn where nothing changed emits no message at all.
- **Framing** — one `<environment>` block, sections as `## label`, stamped with the turn number and
  local time so the model can tell how stale it is mid-turn.

### 4. Providers shipped in a new module `@tomlarkworthy/robocoop-5-context`

Booted the same way srctools is: the chat UI cell (`robocoop_5`) depends on `contextSetup`, which
registers the providers on mount and unregisters on `invalidation` — same lifecycle shape as
`hostSetup`. NOT a bootconf main: riding the UI dependency means every consumer notebook that embeds
the chat gets context by module sync alone, with no per-notebook `bootconf.mains` edit (and no
mains-fixed-point hazard). Every provider is
DOM-first and degrades to nothing if its source is absent, so robocoop-5 dropped into a plain
notebook still works.

| id | scope | content | source |
|---|---|---|---|
| `notebook` | session | title, `bootconf.mains`, module inventory with cell counts | `lope`-side: `document`, `rc5_store` |
| `page` | session | `document.title`, `location` **with credentials stripped** (`cc=`, keys, tokens) | DOM |
| `clock` | turn | local time + IANA timezone + gap since previous turn | `Date` |
| `layout` | turn | open panes/tabs and split geometry (the `#view=` DSL), which pane is focused | `.lp2-pane[data-module]` DOM, or `lp2Model` if importable |
| `viewport` | turn | **what is actually on screen** — per pane, the cells whose boxes intersect the visible band, plus scroll fraction | `.lp2-pane` + `.observablehq[cell]` `offsetTop`/`offsetHeight` vs `scrollTop`/`clientHeight` (the same geometry `lp2_anchor.capture` already uses) |
| `selection` | turn | current text selection and focused editor cell, if any | `getSelection()`, `document.activeElement` |
| `edits` | turn | last N code changes since the previous turn: module, cell, timestamp, and **who** (human vs this agent — the agent's own writes go through `applyModuleSrc`, so they are taggable) | ring buffer fed by `runtime-sdk.onCodeChange`; falls back to `local-change-history`'s commit history when present |
| `health` | turn | cells currently ERRORING at runtime, by module + name | runtime scan (same walk `list_values` already does) |

`viewport`, `edits` and `health` are the three that pay for themselves — they answer "fix the thing
I'm looking at", "what did I just change?" and "is anything broken?" without a tool call.

### 4b. Where the provider code lives — the rendezvous

**Rule: the code that produces a piece of context lives next to the data that produces it, and finds
robocoop-5 through `@tomlarkworthy/plugin-registry` — never by importing it.**

`plugins` is a neutral hub: `plugins.add(name, value, {invalidation}) → remove()` and
`plugins.get(name) → Generator<value[]>`. Providers and consumers share only the *name string*
`'rc5-context'`. lopepage-2 already imports `plugins` (for `lp2MenuItems` and `lp2_importWizards`), so
a host module can hand context to an agent it has never heard of, and rc5 can read context from
modules that do not exist yet. Neither side gains a dependency. That is the whole extension story —
the same one `registerTool` already uses.

Three tiers, by who owns the data:

**Tier 1 — shipped with rc5, DOM-only** (`@tomlarkworthy/robocoop-5-context`).
Reads browser globals and *DOM conventions* rather than other modules' cells: `.lp2-pane[data-module]`
for open panes, `.observablehq[cell]` boxes for what is on screen, `getSelection()`,
`document.activeElement`, `Date`, and `rc5_store` (which rc5 already owns) for the module inventory.
Zero new imports, works in any host, degrades to nothing when the selectors match nothing. This
covers `clock`, `page`, `notebook`, `health`, and usable versions of `layout`, `viewport`, `selection`.

**Tier 2 — owner-registered, richer** (a cell inside the module that owns the data).
`lopepage-2` can register a `layout`/`viewport` provider from `lp2Model` + `lp2_paneRegistry` instead
of scraped DOM; `local-change-history` can register `edits` from its real commit history;
`editor-5` can register the focused cell and cursor. Each is a single new cell in that module of the
shape:

```js
lp2_context = plugins.add('rc5-context', {id:'layout', …, render}, {invalidation})
```

**Cost warning:** `lopepage-2` and `editor-5` are embedded in most of the 218-notebook corpus, so a
cell added there triggers a full resync sweep (`sync-module.ts --all-canonical`) for a marginal
improvement over the tier-1 DOM read. **v1 ships tier 1 only.** Tier 2 is deferred until a tier-1
provider is demonstrably insufficient, and then it is one module at a time on its own schedule —
which is exactly what the registry buys us.

**Tier 3 — userspace, per-notebook.** Any cell in any lopebook (or the agent itself, or the human
mid-conversation) can call `registerContext({id, render})` to teach the agent about *that document*:
the current filter selection, the loaded dataset, the rules of the game being built. This is the
answer to "pluggable" in the sense that matters — context is not a fixed list rc5 maintains, it is
whatever the surrounding document chooses to say about itself.

### 4c. How providers get their content: pull, not push

`render()` is called at turn start and reads its source **synchronously, at the moment it matters**.
No subscriptions, no cached snapshots to invalidate, no staleness bookkeeping — the DOM is already
the live truth, and `rc5_store`/the runtime are already live. This is why tier 1 can be DOM-scraped
without a plumbing layer.

The one exception is `edits`, which is a *delta since the last turn* and therefore must be recorded
as it happens: it subscribes at registration (`runtime-sdk.onCodeChange`, or `local-change-history`'s
commit stream where present) into a bounded ring buffer, and `render()` drains what is new. Any
future delta-shaped provider follows that pattern; everything else stays pull.

Not a new channel: durable project knowledge already reaches the agent through
`@tomlarkworthy/markdown-wiki` (`wiki_index` is appended to the system prompt today). The registry is
for *situational* facts that change between turns. Keep the two apart — anything that would still be
true tomorrow belongs in the wiki.

### 4d. Precedence when two providers claim one id

`rc5_contextMgr` keeps a shared `id → remove()` map (like `rc5_toolMgr`), so re-registering an id
replaces. Boot order is not deterministic, so tier-1 fallbacks register with `weak: true`: a weak
provider never displaces an existing registration, and is dropped the moment a non-weak one claims
its id. So lopepage-2's `layout` beats rc5's scraped `layout` regardless of which booted first, and
removing lopepage-2's provider lets the fallback re-arm.

### 5. Mid-turn refresh: `get_context` tool

A turn can run 40 steps; a `scope:'turn'` snapshot goes stale. `robocoop-5-context` also registers
one tool, `get_context({id?})`, which re-runs all providers (or one) and returns the block. The
prompt tells the agent to call it when the human's view matters and the turn has been long.

### 6. Prompt + UI changes

- `systemPrompt` gains a short **SITUATION** paragraph: an `<environment>` block may precede the
  user's message; it is ambient observation of the human's browser, not something the agent did;
  it is a snapshot at turn start — call `get_context` to refresh; never report it as a tool result.
- Settings pane: one checkbox `situational context` (default on) and, when injected, a muted
  collapsible `🌐 context` line in the transcript rendering the exact injected text — so the human
  can see and audit what the agent was told. Off ⇒ `contextProvider` returns null.

### 7. Cost

Session block ≈ 300–600 tokens, once, inside the cache prefix. Turn block ≈ 100–250 tokens with
default budgets. Providers that return `null` when nothing changed keep a quiet conversation near
zero. Worst case is bounded by the 1500-char total cap.

## Verification

1. **Unit (node, no browser)** — `tools/robocoop-5/context-unit-test.mjs`, modelled on
   `guard-unit-test.mjs`: `composeContext` isolation (throwing provider), timeout, priority order,
   per-section and total budget, `null` ⇒ omitted; and a fake-client `createAgentSession` run
   asserting session context appears once at index 1, turn context once per `send()` before the user
   message, and `reset()` re-arms the session scope.
2. **Boot smoke** — extend `tools/robocoop-5/boot-smoke.mjs` so every `robocoop-5-context` export
   instantiates and `contextSetup` registers without a DOM (it must no-op headlessly, not throw).
3. **Browser QA** — pairing session on `lopebooks/notebooks/@tomlarkworthy_robocoop-5.html`: scroll a
   pane, confirm the `🌐 context` line names the cells actually on screen; edit a cell by hand, confirm
   the next turn's `edits` section names it; break a cell, confirm `health` reports it.
4. **Evals** — `tools/robocoop-5/eval` with MiMo, subset first then the full 45-eval sweep:
   - New context-dependent tasks: "fix the cell I'm looking at" (no name given — passes only with
     `viewport`), "what did I just change?" (`edits`), "what is broken?" (`health`).
   - **Regression gate**: the existing sweep is at 1.00. Extra tokens and a new distractor block can
     only hurt; the sweep must stay at 1.00 or the budgets/wording get cut back.

## Files touched

| What | Where | Canonical |
|---|---|---|
| `contextProvider` seam, `composeContext` | `@tomlarkworthy/robocoop-5-core` | `lopebooks/notebooks/@tomlarkworthy_robocoop-5.html` |
| `rc5_contextMgr`, `registerContext`, `unregisterContext`, `contextView` | `@tomlarkworthy/robocoop-5-tools` | same |
| wiring (`contextProvider:` on `session`), prompt SITUATION paragraph, settings checkbox | `@tomlarkworthy/robocoop-5-engine` | same |
| `🌐 context` transcript line | `@tomlarkworthy/robocoop-5` | same |
| **NEW** tier-1 providers + `get_context` tool + `contextSetup` | `@tomlarkworthy/robocoop-5-context` | same (new block; declared in `modules/canonical.json`) |
| unit tests | `tools/robocoop-5/context-unit-test.mjs`, `boot-smoke.mjs` | repo |
| context evals | `tools/robocoop-5/eval/evals.mjs` | repo |
| *(deferred, tier 2)* | `lopepage-2`, `local-change-history`, `editor-5` | corpus-wide — one cell each, own schedule |

Working copies come from `bun tools/lope-sync.ts checkout <module>`; nothing is edited by grepping a
copy out of an HTML file.

## Delivery

Phase A — core seam + registry + `composeContext`, unit tests green, no providers (behaviour
identical to today because `contextView` is empty).
Phase B — `robocoop-5-context` module with `clock`, `page`, `notebook`, `health`; browser QA.
Phase C — `viewport`, `layout`, `selection`, `edits`; browser QA; `get_context` tool.
Phase D — prompt + UI surfacing; context evals; full sweep regression; then the corpus chain
(`sync-module.ts` into `lopebooks/notebooks/@tomlarkworthy_robocoop-5.html`, add the new module to
`bootconf.mains` and `modules/canonical.json`, push cells to Observable, re-jumpgate).

Each phase is independently shippable; A alone changes nothing observable, which is the point.

## Risks

- **Session rebuild** — any reactive dependency from `session` onto the provider list wipes the chat.
  Mitigated by the `contextView` mutable-box pattern; covered by a QA step (register a provider
  mid-conversation, assert history survives).
- **Distraction** — a large environment block can pull a model off-task (seen with over-long
  prompts). Mitigated by hard budgets and the regression sweep.
- **Leakage** — `location.href` on a pairing session carries `cc=TOKEN`; the `page` provider must
  strip credential-ish query/hash params before they reach a third-party model. Unit-tested.
- **Cost of freshness** — a stale turn-start snapshot invites the agent to act on where the human
  *was*. Mitigated by the timestamp in the block and `get_context`.
