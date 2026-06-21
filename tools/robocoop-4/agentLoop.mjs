// Single-shot tool-use loop. Thin wrapper over the persistent createAgentSession (agentSession.mjs):
// each run() builds a fresh session with a static tool set and sends one user prompt. Kept as a
// stable surface for the node eval harness + self-test; the browser uses createAgentSession directly
// for a multi-turn, live-pluggable conversation. The only environment seam is the injected `client`
// and ctx.runCommand. See DESIGN.md.

import { createAgentSession } from './agentSession.mjs';

export function createAgentLoop({
  client,
  tools = [],
  systemPrompt,
  model,
  maxSteps = 12,
  toolChoice = 'auto',
  toolOutputLimit = 8000,
  runCommand,
} = {}) {
  if (!client || typeof client.chat !== 'function')
    throw new Error('createAgentLoop requires a client with a chat() method');

  async function run(userPrompt, callbacks = {}) {
    const session = createAgentSession({
      client,
      tools,
      systemPrompt,
      model,
      maxStepsPerTurn: maxSteps,
      toolChoice,
      toolOutputLimit,
      runCommand,
    });
    const { messages, finishReason, steps } = await session.send(userPrompt, callbacks);
    return { messages, finishReason, steps };
  }

  return { run };
}
