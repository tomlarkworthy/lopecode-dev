// Grounded probe: what does xiaomi/mimo-v2.5 actually return for a tool-use request
// shaped exactly like robocoop-4-core builds it? Raw response dump — no loop, no parsing.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(here, '.env'), 'utf8');
const KEY = env.match(/OPENROUTER_API_KEY=(\S+)/)[1];
const MODEL = process.argv[2] || 'xiaomi/mimo-v2.5';

const tools = [{
  type: 'function',
  function: {
    name: 'bash',
    description: 'Run a bash command in a sandboxed shell over an in-memory project filesystem.',
    parameters: { type: 'object', properties: { command: { type: 'string', description: 'The bash command line' } }, required: ['command'], additionalProperties: false },
  },
}, {
  type: 'function',
  function: {
    name: 'task_complete',
    description: 'Call this ONLY when the task is fully complete to end your turn. Put your summary in `summary`.',
    parameters: { type: 'object', properties: { summary: { type: 'string' } }, required: [] },
  },
}];

const messages = [
  { role: 'system', content: 'You are a coding agent. Use the bash tool to inspect the filesystem. Take a tool action on every turn; never just describe. Call task_complete when done.' },
  { role: 'user', content: 'List the files in /notebook using the bash tool.' },
];

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}`, 'HTTP-Referer': 'https://lopecode.com', 'X-Title': 'robocoop-4-probe' },
  body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: 'auto', max_tokens: 8192, stream: false }),
});

console.log('HTTP', res.status, res.statusText);
const text = await res.text();
let data; try { data = JSON.parse(text); } catch { console.log('NON-JSON BODY:\n', text.slice(0, 4000)); process.exit(1); }
if (!res.ok) { console.log('ERROR BODY:', JSON.stringify(data, null, 2).slice(0, 4000)); process.exit(1); }

const choice = data.choices?.[0];
const msg = choice?.message || {};
console.log('\nfinish_reason:', choice?.finish_reason);
console.log('message.role:', msg.role);
console.log('message.content:', JSON.stringify(msg.content));
console.log('message.reasoning present:', 'reasoning' in msg, msg.reasoning ? `(len ${String(msg.reasoning).length})` : '');
console.log('message.reasoning_details present:', 'reasoning_details' in msg);
console.log('message.tool_calls:', JSON.stringify(msg.tool_calls, null, 2));
console.log('\nusage:', JSON.stringify(data.usage));
console.log('\n--- full message keys:', Object.keys(msg));
