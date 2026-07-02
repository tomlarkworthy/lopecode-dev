// Browser-only adapter: the single window-aware core file (mirror of nodeSession.mjs's role for
// the node eval). It binds the DOM-free agent loop's runCommand seam to window.justbash.exec and
// the OpenRouter client to window.fetch. Imported by @tomlarkworthy/robocoop-4 notebook-modules.js.

import { createOpenRouterClient } from './openrouter.mjs';
import { createAgentLoop } from './agentLoop.mjs';
import { createBashTool } from './bashTool.mjs';

export function createNotebookRunner({
  apiKey,
  baseUrl,        // omit for direct OpenRouter; set to the demo gateway when the user has no key
  model,
  systemPrompt,
  workdir = '/notebook',
  maxSteps = 12,
} = {}) {
  const bridge = globalThis.justbash;
  if (!bridge || typeof bridge.exec !== 'function')
    throw new Error('createNotebookRunner: window.justbash.exec is unavailable — publish the justbash bridge first');

  // bridge.exec returns the raw shell result { stdout, stderr, exitCode }; bashTool formats it.
  const runCommand = (command) => bridge.exec(command);

  const client = createOpenRouterClient({
    apiKey,
    ...(baseUrl ? { baseUrl } : {}),
    defaultModel: model,
    fetch: globalThis.fetch.bind(globalThis),
    title: 'robocoop-4',
  });
  const loop = createAgentLoop({
    client,
    tools: [createBashTool()],
    systemPrompt,
    model,
    maxSteps,
    runCommand,
  });

  let ensured = false;
  async function run(prompt, callbacks = {}) {
    if (!ensured) {
      try { await runCommand('mkdir -p ' + workdir); } catch { /* best effort */ }
      ensured = true;
    }
    return loop.run(prompt, callbacks);
  }

  return { run };
}
