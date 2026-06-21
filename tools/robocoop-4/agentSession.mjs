// Persistent, live-resolved tool-use session. DOM-free. Supersedes the single-shot loop in
// agentLoop.mjs (which now wraps this). Two properties matter:
//   1. `messages` persists across send() calls — one long conversation, many user turns.
//   2. tools + system prompt are re-read from their PROVIDERS at the top of EVERY step, so a
//      notebook can register a new tool (or edit the system prompt) mid-conversation and it takes
//      effect on the next model turn WITHOUT restarting the session.
// All other loop invariants are carried over verbatim from agentLoop: assistant turns appended
// unchanged, exactly one {role:'tool'} reply per tool_calls[] entry, defensive arg parse, central
// truncate of tool output.

import { truncate } from './render.mjs';

function toWireTool(t) {
  return {
    type: 'function',
    function: {
      name: t.id,
      description: String(t.description ?? ''),
      parameters: t.parameters ?? { type: 'object', properties: {}, required: [] },
    },
  };
}

export function createAgentSession({
  client,
  tools,                 // static array (convenience) ...
  toolsProvider,         // ... OR a getter re-read each step: () => tool[]
  systemPrompt,          // static string ...
  systemPromptProvider,  // ... OR a getter re-read each turn: () => string
  model,                 // static model id ...
  modelProvider,         // ... OR a getter re-read each step: () => string (lets the picker change live)
  maxStepsPerTurn = 12,
  toolChoice = 'auto',
  toolOutputLimit = 8000,
  runCommand,
} = {}) {
  if (!client || typeof client.chat !== 'function')
    throw new Error('createAgentSession requires a client with a chat() method');

  const getTools = toolsProvider ?? (() => tools ?? []);
  const getSystemPrompt = systemPromptProvider ?? (() => systemPrompt ?? null);
  const getModel = modelProvider ?? (() => model);

  const messages = [];
  let currentAbort = null;

  function abort() { currentAbort?.abort(); }
  function reset() { messages.length = 0; }

  async function send(userText, callbacks = {}) {
    const abortController = new AbortController();
    currentAbort = abortController;
    let metadata = {};
    const ctx = {
      callId: null,
      abort: abortController.signal,
      runCommand,
      metadata: (u) => { metadata = { ...metadata, ...u }; },
      getMetadata: () => metadata,
    };

    // Seed/refresh the system prompt as messages[0] (lets the prompt be edited between turns).
    const sp = getSystemPrompt();
    if (sp != null) {
      const m = { role: 'system', content: String(sp) };
      if (messages[0]?.role === 'system') messages[0] = m;
      else messages.unshift(m);
    }

    if (userText != null) messages.push({ role: 'user', content: String(userText) });

    let finishReason = null;
    let step = 0;
    const startLen = messages.length;

    for (step = 0; step < maxStepsPerTurn; step++) {
      if (abortController.signal.aborted) { finishReason = 'aborted'; break; }
      callbacks.onStep?.(step, messages);

      // LIVE resolution — the one line that makes mid-conversation tool additions work.
      const live = getTools() ?? [];
      const wire = live.map(toWireTool);
      const byId = new Map(live.map((t) => [t.id, t]));

      const res = await client.chat({ model: getModel(), messages, tools: wire, tool_choice: toolChoice, signal: abortController.signal });
      const msg = res?.message;
      if (!msg) throw new Error('client.chat returned no message');

      messages.push(msg); // verbatim append (incl tool_calls)
      if (msg.content) callbacks.onText?.(msg.content);

      const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
      if (calls.length === 0) {
        finishReason = res.finish_reason ?? 'stop';
        callbacks.onFinish?.({ messages, finishReason });
        break;
      }

      // exactly one {role:'tool', tool_call_id} per tool_calls[] entry.
      for (const call of calls) {
        const callId = call.id;
        const name = call?.function?.name;
        let args;
        try {
          const raw = call?.function?.arguments;
          args = raw == null || raw === '' ? {} : JSON.parse(raw); // defensive parse
        } catch {
          const content = 'ERROR: could not parse tool arguments as JSON: ' + String(call?.function?.arguments);
          messages.push({ role: 'tool', tool_call_id: callId, content });
          callbacks.onToolResult?.(callId, content);
          continue;
        }
        const tool = byId.get(name);
        if (!tool) {
          const content = 'ERROR: unknown tool ' + String(name);
          messages.push({ role: 'tool', tool_call_id: callId, content });
          callbacks.onToolResult?.(callId, content);
          continue;
        }
        callbacks.onToolCall?.(callId, name, args);
        let output;
        try {
          const r = await tool.execute(args, { ...ctx, callId });
          output = String(r?.output ?? '');
        } catch (e) {
          output = 'ERROR: ' + (e?.message ?? String(e));
        }
        output = truncate(output, toolOutputLimit); // central cap
        callbacks.onToolResult?.(callId, output);
        messages.push({ role: 'tool', tool_call_id: callId, content: output });
      }

      if (step === maxStepsPerTurn - 1) finishReason = 'max_steps';
    }

    return {
      messages,
      finishReason: finishReason ?? 'max_steps',
      steps: step + 1,
      turnMessages: messages.slice(startLen),
    };
  }

  return { messages, send, abort, reset };
}
