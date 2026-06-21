# robocoop-4 status

## Architecture

robocoop-4 is a bash-only coding agent for editing Observable notebook modules. A portable, DOM-free core (`.mjs`) runs a tool-use loop: a model client (OpenRouter for real runs, a deterministic scripted client for tests) is given a single `bash` tool that operates over a just-bash virtual filesystem where each live module is one text file at `/notebook/<moduleId>.js`. The loop appends assistant turns verbatim, emits exactly one tool reply per tool call, parses tool-call arguments defensively, and head+tail-truncates tool output centrally so node and browser produce byte-identical text. The only environment seam is `runCommand` — node binds it to a just-bash `InMemoryFs` session; the browser binds it to `window.justbash.exec`. The notebook module (`notebook-modules.js`) is the only window/DOM-aware layer and reaches the core by dynamic import.

## File map (tools/robocoop-4/)

Core (`.mjs`, DOM-free):
- `index.mjs` — public core surface re-exports (the harness imports the camelCase versions through here).
- `openrouter.mjs` — OpenRouter chat-completions client (`createOpenRouterClient`, `recordClient`); non-streaming, pluggable fetch/key.
- `scriptedClient.mjs` — deterministic no-network model client; OpenRouter-identical return shape incl `tool_calls[].function.arguments` as a JSON string.
- `agentLoop.mjs` — the tool-use loop (`createAgentLoop`); LIVE entry used by the harness.
- `bashTool.mjs` — the single normalized `bash` tool (`createBashTool`); LIVE version used by the harness.
- `defineTool.mjs` — minimal tool normalization/validation (`defineTool`, `validateParameters`).
- `nodeSession.mjs` — node-only adapter: one Bash + one InMemoryFs, threads cwd/env across stateless exec calls.
- `fsmap.mjs` — pure path↔moduleId codec + system-path filter (`idToPath`, `pathToId`, `listModuleFiles`).
- `render.mjs` — shared bash-output rendering + truncation (`formatResult`, `truncate`).
- `systemPrompt.mjs` — base bash-centric system prompt + `composeFooter({workdir, model})`.

Notebook layer:
- `notebook-modules.js` — `@tomlarkworthy/robocoop-4` notebook module source (17 cells); dynamic-imports the core + adapter via a `CORE_BASE` placeholder URL.
- `notebookAdapter.mjs` — browser-only adapter (`createNotebookRunner`); the single window-aware core file; binds the loop's `runCommand` seam to `window.justbash.exec` and the OpenRouter client to `window.fetch`. Mirror of `nodeSession.mjs`.

Eval (`eval/`):
- `eval/run-eval.mjs` — CLI entrypoint; runs the no-network self-test first, then the task eval (`--real`, `--model`, `--only`, `-v`, `--no-self-test`).
- `eval/harness.mjs` — node eval harness; per task seeds a fresh InMemoryFs, builds runCommand + client (scripted default, OpenRouter on `--real`), runs the loop, then `task.assert(fs)`.
- `eval/selfTest.mjs` — no-network loop-invariant self-test (8 invariants over a scripted 2-step transcript).
- `eval/assertions.mjs` — reusable async assertion primitives, all fs access routed through fsmap.
- `eval/tasks.mjs` — the LIVE task list (8 tasks).
- `eval/adapter-smoke.mjs` — browser-path smoke test: stubs `window.justbash` + `fetch` and drives `createNotebookRunner` end-to-end (no network).

Reference material (extracted prior notebooks, not in the import graph):
- `DESIGN.md`, `README.md` — design/usage notes.
- `robocoop-2.extracted.js`, `robocoop-3.extracted.js`, `observablejs-toolchain.extracted.js` — source references.

(Orphaned duplicate files the build originally emitted — `agent-loop.mjs`, `bash-tool.mjs`, `openrouter-client.mjs`, `eval/tasks/` — have been deleted.)

## How to run

Mock (scripted, no network, no key):
```
node /Users/tom.larkworthy/dev/lopecode-dev/tools/robocoop-4/eval/run-eval.mjs
```
Runs the self-test then the 8 scripted tasks. Last verify: self-test 8/8, tasks 8/8, exit 0.

Real (OpenRouter):
```
OPENROUTER_API_KEY=... node /Users/tom.larkworthy/dev/lopecode-dev/tools/robocoop-4/eval/run-eval.mjs --real --model anthropic/claude-sonnet-4
```

## Eval task list (8, eval/tasks.mjs)

1. `rename-identifier` — rename `foo`→`bar` everywhere via sed; assert `bar` present, `foo` absent (word-boundary), still parses.
2. `add-markdown-cell` — append a `_title` md cell via quoted heredoc; assert `_title` and `# Hello` present, parses.
3. `fix-syntax-error` — repair a missing `]` in an array literal via sed; assert parses without syntax error.
4. `change-numeric-literal` — change `const N = 10` to `42` via sed; assert `= 42` present, `10` absent, parses.
5. `replace-string-literal` — change title `'Old Title'`→`'New Title'` via sed; assert new present, old absent, parses.
6. `delete-cell` — delete the `_unused` cell line via sed; assert `_unused` absent, `_keep` retained, parses.
7. `create-new-file` — create `/notebook/@user/helper.js` via printf redirect; assert exists, contains `_help`, parses.
8. `add-import-line` — prepend `import {range} from '@d3/array'` via `sed 1i`; assert import present, parses.

## DONE

- Core `.mjs` implemented and syntax-clean: `node --check` passes on all 24 `.mjs`/`.js` files.
- Mock eval fully green: self-test 8/8 invariants, tasks 8/8, exit 0.
- Notebook module source authored (`notebook-modules.js`, node --check passes).
- OpenRouter client implemented and unit-verified against a fake fetch (URL, headers, gating, error path, env-key fallback, recordClient).

## Needs the human

- **Live notebook assembly via the pairing channel.** `notebook-modules.js` is source only; it must be assembled into a live `@tomlarkworthy/robocoop-4` notebook (route A: `create_module` + `define_cell` per cell; route B: push → jumpgate → `sync-module.ts`). Requires serving the `.mjs` core + `notebookAdapter.mjs` somewhere and setting `CORE_BASE` to that URL.
- **Real-model eval run.** The OpenRouter network path was never exercised against a live model. Run the `--real` command above to validate end-to-end.

## Known gaps

- The OpenRouter network code path is unverified against a live model. It is wired and verified against a stub fetch (unit test in openrouter, and `eval/adapter-smoke.mjs` for the browser path), but DESIGN invariant 6 still applies: re-verify model ids against openrouter.ai/models before shipping real calls (default `anthropic/claude-sonnet-4`).
- `CORE_BASE` in `notebook-modules.js` is a placeholder GitHub Pages URL; point it at wherever the core `.mjs` files are actually served before live assembly.

## Post-build fixups (applied after the workflow)

- Deleted orphaned duplicate files (`agent-loop.mjs`, `bash-tool.mjs`, `openrouter-client.mjs`, `eval/tasks/`).
- Made the just-bash import relative (`../justbash-build/...`) in `nodeSession.mjs` + `eval/harness.mjs` (was absolute).
- Removed the node-only `createNodeSession` re-export from `index.mjs` so the browser barrel no longer drags the node just-bash bundle.
- Authored the missing `notebookAdapter.mjs` and a browser-path smoke test (`eval/adapter-smoke.mjs`, passes).
