// Deterministic, no-network model client. Byte-identical return shape to OpenRouter
// incl tool_calls[].function.arguments as a JSON STRING. Index-sequenced (no fingerprint match).

export function createScriptedClient(steps = []) {
  let i = 0;
  async function chat(/* req */) {
    if (i >= steps.length) {
      // Exhausted script: emit a terminal stop turn so the loop ends cleanly.
      return { message: { role: 'assistant', content: '[scripted client exhausted]' }, finish_reason: 'stop' };
    }
    const step = steps[i++];
    const message = { role: 'assistant', content: step.content ?? null };
    if (step.tool_calls) {
      message.tool_calls = step.tool_calls.map((tc, idx) => ({
        id: tc.id ?? 'call_' + (i - 1) + '_' + idx,
        type: 'function',
        function: {
          name: tc.name,
          // arguments is ALWAYS a JSON STRING, matching OpenRouter wire shape.
          arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments ?? {}),
        },
      }));
    }
    return {
      message,
      finish_reason: step.finish_reason ?? (step.tool_calls ? 'tool_calls' : 'stop'),
      raw: { scripted: true, index: i - 1 },
    };
  }
  return { chat };
}
