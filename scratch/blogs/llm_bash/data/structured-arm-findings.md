# The off-distribution arm: coding through a structured runtime API

**Question.** robocoop-4's tools were deliberately shaped like Claude Code's (a `bash` tool in the
Terminal-Bench mould + `read_file`/`write_file`/`edit_file` mirroring Read/Write/Edit). Does that shape
actually matter, or would any tool surface do? To test it we built the *opposite* surface — a structured
semantic runtime API — and ran the same task with the same model (mimo).

**The structured arm.** Same agent loop, same model, same eval. Only the tool surface changes:
`bash` + the file tools are removed; the agent gets `create_module`, `define_variable`,
`delete_variable`, `list_variables`, `eval_code`. `define_variable` is the real low-level Observable API
(`{name, definition:"(x,y)=>x+y", inputs:["x","y"], module}`) — it builds reactive variables directly,
no files, no shell, no cell-syntax compilation. (This is just a custom tool. It has nothing to do with MCP;
"structured semantic surface vs files/bash" is the only axis that matters.)

Implemented in the live driver (`--tool-surface structured`): a dedicated agent session whose
`toolsProvider` is the fixed structured set, plus a system prompt that accurately states the API's contract
(builtins like `Inputs`/`html`/`Generators` are injected ONLY when named in `inputs`; `viewof x` is two
variables; redefine-by-name updates in place). Cells are `observe()`d on definition so `Generators.input`
inputs pump in headless, exactly as the file path does.

## Result (N=3, `long-store-to-checkout`, two models, all 24 runs PASS 1.00)

Mean steps to completion; order most-off-distribution → most-aligned:

| arm | surface / contract | distribution | mimo | sonnet-4.6 |
|---|---|---|---:|---:|
| Structured | create_module/define_variable/delete_variable/list_variables/eval_code | **off** | **24.0** | **22.7** |
| Bash | bash + sed/heredoc | on (Terminal-Bench) | 22.7 | 16.3 |
| Std Tools (broken contract) | Read/Write/Edit, reformat-on-apply | on (Claude-tools) | 19.3 | 18.0 |
| Std Tools (aligned) | Read/Write/Edit + byte-stable `/src` | on (Claude-tools) | **10.3** | **8.0** |

Per-run steps (mimo / sonnet): Structured `31,10,31` / `27,21,20`; Bash `16,21,31` / `13,14,22`;
broken-contract `21,18,19` / `18,17,19`; aligned `13,8,10` / `8,8,8`. Gap aligned→structured: **2.3× mimo,
2.8× sonnet** (up to 3.4–3.9× on the hardest off-distribution runs). The stronger model widens the relative
gap; its aligned arm is dead-consistent at `8/8/8`.

## What the result is — and isn't

- **Not a correctness cliff.** Given an *accurate* prompt, the structured surface completes the same task at
  1.00. (An earlier 0.50 was an artifact: my first prompt showed the wrong builtin-injection pattern, and
  generators weren't being observed in headless. Both fixed; see below. Plausible-looking failures are not
  failures until the harness is proven fair.)
- **It is an efficiency cliff.** The off-distribution surface is the most expensive (24.0), on par with sed
  and ~2.3× the most contract-aligned on-distribution arm (10.3). Within the on-distribution zone, aligning
  with the Claude-tools shape *and honouring its byte-stability contract* roughly halves the cost again
  (22.7 → 19.3 → 10.3).
- **The cost signature is diagnostic.** The structured API emits *exactly 13* `define_variable` calls every
  run (it forces one-variable-per-call decomposition — so decomposition is not a discriminator here). The
  step variance is entirely **`eval_code` verification churn**: 4 (fast run) vs 19 / 25 (slow runs). With no
  glanceable file artifact, the model re-probes the reactive graph value-by-value to convince itself it's
  right. The file/Claude-tools arms read and write whole files and verify by inspection — fewer, more
  confident steps.

**Caveat (honest scope).** One small eval (~8–12 cells), N=3, high variance. At this size the gap is gentle
and efficiency-shaped, not a hard wall. The argument is that this per-step overhead compounds with task size
— the same reason a large multi-file build is where the on-vs-off-distribution gap would become a capability
gap, not just a cost gap.

## Harness notes (so the number is trustworthy)

The off-distribution arm only became a fair test after three corrections, each of which had silently
inflated the "cliff":

1. **Tool swap must beat reactive re-registration.** robocoop-4's tool registry is reactive: the hostbridge
   re-registers `bash`/`read_file`/`write_file`/`edit_file` whenever `currentModules` recomputes — which the
   agent's own `create_module`/`define_variable` trigger. A one-shot unregister loses the race and the model
   falls back to `write_file` by step 2 (observed: mimo reaching for `write_file`/`eval_js` out of habit, and
   them *executing*). The registry element's `value` is also a non-configurable getter, so it can't be locked.
   Fix: a **dedicated agent session** with a fixed `toolsProvider`, bypassing the live registry entirely.
2. **Module resolution race.** The pairing handler resolves modules through a reactive `currentModules` view
   that lags `runtime.mains`; back-to-back `create_module`→`define_variable` read "module not found." Fix:
   resolve directly from `runtime.mains` (synchronous, authoritative).
3. **Generators must be observed.** `Generators.input(viewof x)` cells never advance in headless without an
   observer, so `price/qty/subtotal/total` stayed `undefined` and graded wrong. Fix: `observe()` each defined
   cell, mirroring the file path's probe-and-watch.

Mechanically: the model habitually reaches for `write_file`/`eval_js` even when handed only the structured
surface — direct evidence of the on-distribution prior.
