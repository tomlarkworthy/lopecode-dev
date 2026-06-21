// No-network self-test: drive the loop with a scripted client over a 2-step bash transcript,
// asserting verbatim-append, one-tool-reply-per-call, defensive-parse and truncation paths fire.

import { createScriptedClient } from '../scriptedClient.mjs';
import { createAgentLoop } from '../agentLoop.mjs';
import { createBashTool } from '../bashTool.mjs';

export async function runSelfTest() {
  const checks = [];
  const check = (name, ok, detail = '') => checks.push({ name, ok, detail });

  // A fake runCommand: records commands, returns a long stdout to exercise truncation.
  const seen = [];
  const runCommand = async (command) => {
    seen.push(command);
    if (command.includes('big')) return { stdout: 'x'.repeat(50000), stderr: '', exitCode: 0 };
    return { stdout: 'ok:' + command, stderr: '', exitCode: 0 };
  };

  const client = createScriptedClient([
    // step 0: two tool calls in one turn (tests one-reply-per-id) + one malformed-args call.
    {
      tool_calls: [
        { id: 'c1', name: 'bash', arguments: { command: 'ls' } },
        { id: 'c2', name: 'bash', arguments: '{bad json' }, // raw STRING, unparseable
        { id: 'c3', name: 'bash', arguments: { command: 'cat big' } },
      ],
    },
    // step 1: terminal assistant turn.
    { content: 'All done.' },
  ]);

  const loop = createAgentLoop({
    client,
    tools: [createBashTool()],
    systemPrompt: 'test',
    runCommand,
    toolOutputLimit: 1000,
  });

  const { messages, finishReason, steps } = await loop.run('do stuff');

  // Verbatim-append: the assistant message with tool_calls must be present unchanged.
  const asst = messages.find((m) => m.role === 'assistant' && m.tool_calls);
  check('verbatim assistant append', !!asst && asst.tool_calls.length === 3,
    asst ? 'tool_calls=' + asst.tool_calls.length : 'no assistant tool_calls message');

  // function.arguments is a STRING on the wire (byte-identical to OpenRouter).
  check('arguments is JSON string', typeof asst?.tool_calls?.[0]?.function?.arguments === 'string',
    'typeof=' + typeof asst?.tool_calls?.[0]?.function?.arguments);

  // One tool reply per tool_call id, matched by id.
  const toolMsgs = messages.filter((m) => m.role === 'tool');
  const ids = toolMsgs.map((m) => m.tool_call_id).sort();
  check('one tool reply per call', toolMsgs.length === 3 && ids.join(',') === 'c1,c2,c3',
    'ids=' + ids.join(','));

  // Defensive parse: the malformed-args call produced an error tool message, not a throw.
  const c2 = toolMsgs.find((m) => m.tool_call_id === 'c2');
  check('defensive parse error message', !!c2 && /could not parse tool arguments/.test(c2.content),
    c2 ? c2.content.slice(0, 40) : 'no c2 message');

  // Truncation: the big-cat reply was capped to ~limit + marker, not 50k.
  const c3 = toolMsgs.find((m) => m.tool_call_id === 'c3');
  check('central truncation fired', !!c3 && c3.content.length < 2000 && /bytes truncated/.test(c3.content),
    c3 ? 'len=' + c3.content.length : 'no c3 message');

  // Loop terminated on the plain assistant turn.
  check('finish reason stop', finishReason === 'stop', 'finishReason=' + finishReason);
  check('two steps', steps === 2, 'steps=' + steps);

  // The malformed call must NOT have invoked runCommand (only c1 + c3 ran).
  check('bad-args call skipped runCommand', seen.length === 2 && seen.includes('ls') && seen.includes('cat big'),
    'ran=' + JSON.stringify(seen));

  const ok = checks.every((c) => c.ok);
  return { ok, checks };
}
