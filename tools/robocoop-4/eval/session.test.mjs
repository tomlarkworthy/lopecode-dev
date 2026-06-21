// node --test tools/robocoop-4/eval/session.test.mjs
// Unit tests for createAgentSession — the persistent, live-resolved conversation. Covers the
// properties the single-shot loop can't: messages persist across turns, and tools / system prompt
// are re-read every step so a notebook can add a tool MID-CONVERSATION without a restart.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createAgentSession } from '../agentSession.mjs';
import { createScriptedClient } from '../scriptedClient.mjs';
import { defineTool } from '../defineTool.mjs';
import { createBashTool } from '../bashTool.mjs';

// Wrap a scripted client so we can assert which tool names were offered to the model each step.
function recordingClient(steps) {
  const inner = createScriptedClient(steps);
  const calls = [];
  return {
    calls,
    chat: async (req) => {
      calls.push((req.tools ?? []).map((t) => t.function.name));
      return inner.chat(req);
    },
  };
}

const simpleTool = (id, output, onRun) =>
  defineTool({
    id,
    description: id,
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    execute: async () => {
      onRun?.();
      return { output };
    },
  });

test('messages persist across multiple send() turns', async () => {
  const client = createScriptedClient([{ content: 'hi' }, { content: 'again' }]);
  const session = createAgentSession({ client, tools: [], systemPrompt: 'SP', model: 'm' });

  await session.send('first');
  await session.send('second');

  const roles = session.messages.map((m) => m.role);
  assert.deepEqual(roles, ['system', 'user', 'assistant', 'user', 'assistant']);
  assert.equal(session.messages[1].content, 'first');
  assert.equal(session.messages[3].content, 'second');
  // exactly one system message, and it stays at index 0
  assert.equal(session.messages.filter((m) => m.role === 'system').length, 1);
});

test('a tool registered mid-conversation is offered and called on the next turn', async () => {
  let extraRan = false;
  const base = simpleTool('noop', 'NOOP');
  const extra = simpleTool('extra', 'EXTRA-OK', () => { extraRan = true; });

  // Live registry the notebook would mutate. toolsProvider re-reads it every step.
  let registry = [base];

  const client = recordingClient([
    { content: 'ready' },                                          // turn 1: stop
    { tool_calls: [{ id: 'x1', name: 'extra', arguments: {} }] },  // turn 2 step 0: call extra
    { content: 'done' },                                           // turn 2 step 1: stop
  ]);

  const session = createAgentSession({ client, toolsProvider: () => registry, model: 'm' });

  await session.send('hello');
  // Before registration, only the base tool was offered.
  assert.deepEqual(client.calls[0], ['noop']);
  assert.equal(extraRan, false);

  // Register a new tool WITHOUT restarting the session.
  registry = [base, extra];

  await session.send('please use extra');
  // The new tool was offered to the model on the next turn...
  assert.ok(client.calls.some((names) => names.includes('extra')), 'extra not offered: ' + JSON.stringify(client.calls));
  // ...and actually executed, with its output threaded back as a tool message.
  assert.equal(extraRan, true);
  const toolMsg = session.messages.find((m) => m.role === 'tool' && /EXTRA-OK/.test(m.content));
  assert.ok(toolMsg, 'no tool reply carrying EXTRA-OK');
});

test('system prompt is re-read (editable) between turns', async () => {
  let prompt = 'v1';
  const client = createScriptedClient([{ content: 'a' }, { content: 'b' }]);
  const session = createAgentSession({ client, tools: [], systemPromptProvider: () => prompt, model: 'm' });

  await session.send('one');
  assert.equal(session.messages[0].content, 'v1');

  prompt = 'v2';
  await session.send('two');
  assert.equal(session.messages[0].content, 'v2');
  assert.equal(session.messages.filter((m) => m.role === 'system').length, 1);
});

test('unknown tool yields an error tool reply, not a throw', async () => {
  const client = createScriptedClient([
    { tool_calls: [{ id: 'u1', name: 'ghost', arguments: {} }] },
    { content: 'ok' },
  ]);
  const session = createAgentSession({ client, tools: [simpleTool('real', 'R')], model: 'm' });

  const r = await session.send('go');
  assert.equal(r.finishReason, 'stop');
  const toolMsg = session.messages.find((m) => m.role === 'tool' && m.tool_call_id === 'u1');
  assert.match(toolMsg.content, /unknown tool ghost/);
});

test('abort() during a turn stops the loop with finishReason aborted', async () => {
  const session = { ref: null };
  const client = createScriptedClient([
    { tool_calls: [{ id: 'a1', name: 'noop', arguments: {} }] }, // step 0: a tool call
    { content: 'should-not-reach' },                              // step 1: would continue
  ]);
  const s = createAgentSession({ client, tools: [simpleTool('noop', 'N')], model: 'm' });
  session.ref = s;

  // Abort right after the first tool result; the next step must see it and bail.
  const r = await s.send('go', { onToolResult: () => s.abort() });
  assert.equal(r.finishReason, 'aborted');
  assert.ok(!s.messages.some((m) => m.content === 'should-not-reach'));
});

test('bash tool runs through the session via runCommand seam', async () => {
  const seen = [];
  const runCommand = async (command) => {
    seen.push(command);
    return { stdout: 'ran:' + command, stderr: '', exitCode: 0 };
  };
  const client = createScriptedClient([
    { tool_calls: [{ id: 'b1', name: 'bash', arguments: { command: 'ls /notebook' } }] },
    { content: 'done' },
  ]);
  const session = createAgentSession({ client, tools: [createBashTool()], model: 'm', runCommand });

  await session.send('list it');
  assert.deepEqual(seen, ['ls /notebook']);
  const toolMsg = session.messages.find((m) => m.role === 'tool' && m.tool_call_id === 'b1');
  assert.match(toolMsg.content, /ran:ls \/notebook/);
});
