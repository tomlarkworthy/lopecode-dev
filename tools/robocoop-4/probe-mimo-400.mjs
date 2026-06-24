// Pin the exact cause of "OpenRouter 400: Provider returned error" on multi-turn mimo.
// Turn 1: get an assistant message with tool_calls (+ reasoning/reasoning_details).
// Turn 2 variants: echo assistant msg VERBATIM vs SANITIZED, see which 400s.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const KEY = readFileSync(join(here, '.env'), 'utf8').match(/OPENROUTER_API_KEY=(\S+)/)[1];
const MODEL = 'xiaomi/mimo-v2.5';

const tools = [{ type: 'function', function: { name: 'bash', description: 'Run bash.', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } } }];

async function call(messages, label) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: 'auto', max_tokens: 1024, stream: false }),
  });
  const text = await res.text();
  let j; try { j = JSON.parse(text); } catch { j = null; }
  console.log(`\n[${label}] HTTP ${res.status}`);
  if (!res.ok) { console.log('  error:', JSON.stringify(j?.error || text).slice(0, 500)); return null; }
  return j.choices[0].message;
}

// Turn 1
const m1 = [
  { role: 'system', content: 'You are a coding agent. Use the bash tool.' },
  { role: 'user', content: 'Run `ls /notebook`.' },
];
const a1 = await call(m1, 'turn1');
console.log('  assistant msg keys:', Object.keys(a1));
console.log('  has reasoning:', 'reasoning' in a1, '| reasoning_details:', 'reasoning_details' in a1, '| refusal:', 'refusal' in a1, '| content:', JSON.stringify(a1.content));
const toolCall = a1.tool_calls?.[0];
const toolResult = { role: 'tool', tool_call_id: toolCall?.id, content: 'README.md\n@tomlarkworthy' };

// Turn 2a: VERBATIM echo (what the current loop does)
await call([...m1, a1, toolResult], 'turn2-VERBATIM (current loop)');

// Turn 2b: strip reasoning_details only
const stripRD = (m) => { const { reasoning_details, ...rest } = m; return rest; };
await call([...m1, stripRD(a1), toolResult], 'turn2-strip-reasoning_details');

// Turn 2c: strip reasoning + reasoning_details + refusal
const stripAll = (m) => { const { reasoning, reasoning_details, refusal, ...rest } = m; return rest; };
await call([...m1, stripAll(a1), toolResult], 'turn2-strip-reasoning+details+refusal');

// Turn 2d: minimal — only role, content, tool_calls
const minimal = (m) => ({ role: m.role, content: m.content ?? null, ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}) });
await call([...m1, minimal(a1), toolResult], 'turn2-MINIMAL (role+content+tool_calls)');
