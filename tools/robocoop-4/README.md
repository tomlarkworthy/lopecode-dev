# robocoop-4

Bash-centric, OpenRouter-gated coding agent. Core logic is DOM-free `.mjs` so the SAME code runs in
the node eval harness (just-bash `InMemoryFs` + scripted client) and the browser notebook
(`window.justbash` + real OpenRouter). See `DESIGN.md` for the full interface contract.

## Core surface (`index.mjs`)

`createOpenRouterClient`, `createScriptedClient`, `createAgentLoop`, `createBashTool`,
`createNodeSession`, `defineTool`/`validateParameters`, `idToPath`/`pathToId`/`listModuleFiles`,
`formatResult`/`truncate`, `systemPrompt`/`composeFooter`.

## Wiring

The only environment-specific seam is `runCommand(command) -> {stdout, stderr, exitCode}`:

- node: `createNodeSession(fs).runCommand` — one `Bash` + one `InMemoryFs`, cwd/env threaded via
  `result.env`/`result.env.PWD` (just-bash `exec` is stateless except the fs).
- browser: `runCommand = cmd => window.justbash.exec(cmd)` (in `notebookAdapter.mjs`, the only file
  touching `window`).

```js
import { createAgentLoop } from './agentLoop.mjs';
import { createBashTool } from './bashTool.mjs';
import { createNodeSession } from './nodeSession.mjs';
import { createScriptedClient } from './scriptedClient.mjs';
import { systemPrompt } from './systemPrompt.mjs';

const session = createNodeSession(fs);
const loop = createAgentLoop({
  client: createScriptedClient(steps),   // or createOpenRouterClient({apiKey, fetch})
  tools: [createBashTool()],
  systemPrompt,
  runCommand: session.runCommand,
});
const { messages, finishReason, steps } = await loop.run(userPrompt);
```

Live modules are one `.js` file each at `/notebook/<moduleId>.js` (`fsmap.mjs` owns the codec and
the `/notebook` system-path filter — the single chokepoint every grader routes through).

## Eval harness

Per task: seed a fresh `InMemoryFs`, build the node session + bash tool + a fresh agent loop, run
the prompt, then run `task.assert(fs)` (programmatic post-state assertions — no LLM judge). Fails
loudly if a task has no `assert`. Grading primitives: `fileContains`, `fileLacksIdentifier`,
`parsesWithoutSyntaxError`, `fileExists`, `fileAbsent`.

Default mode uses a deterministic SCRIPTED client that replays each task's recorded tool-call
commands — no API key, no network. `--real` (with `OPENROUTER_API_KEY`) uses the live OpenRouter
client.

```bash
# no-network self-test + scripted task eval
node tools/robocoop-4/eval/run-eval.mjs

# single task, verbose tool trace
node tools/robocoop-4/eval/run-eval.mjs --only rename-identifier -v

# live model
OPENROUTER_API_KEY=... node tools/robocoop-4/eval/run-eval.mjs --real --model anthropic/claude-sonnet-4
```

Flags: `--only <id>`, `--verbose`/`-v`, `--model <id>`, `--real`, `--no-self-test`.
Exit code is `0` only when the self-test and every selected task pass.

## No-network self-test

`eval/selfTest.mjs` drives the loop with a scripted client over a 2-step bash transcript and asserts
the loop invariants fire: verbatim assistant append (incl `tool_calls`), `function.arguments` as a
JSON string, exactly one tool reply per `tool_call_id`, defensive `JSON.parse` of malformed args, and
central head+tail output truncation.

Dependencies: node built-ins + just-bash only (imported from
`tools/justbash-build/node_modules/just-bash` by absolute path, since cwd resets between harness bash
calls).
```
