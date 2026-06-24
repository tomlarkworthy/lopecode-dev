// Grounded multi-turn probe: drive the REAL core loop (imported from the notebook module,
// not copied) with xiaomi/mimo-v2.5 over a tiny fake fs. Reveals multi-turn protocol bugs:
// does it keep emitting tool_calls, does it call task_complete, does reasoning_details round-trip?
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { importNotebookModule } from '../notebook-import.ts';

const here = dirname(fileURLToPath(import.meta.url));
const KEY = readFileSync(join(here, '.env'), 'utf8').match(/OPENROUTER_API_KEY=(\S+)/)[1];
const MODEL = process.argv[2] || 'xiaomi/mimo-v2.5';
const TASK = process.argv[3] || 'Read /notebook/@user/counter.js, then write_file a new /notebook/@user/double.js that doubles its count. Then finish.';

const corePath = join(here, '..', '..', 'modules', '@tomlarkworthy', 'robocoop-4-core.js');
const core = await importNotebookModule(corePath, { overrides: { md: (s) => String(s.raw?.[0] ?? s) } });
const createOpenRouterClient = await core.value('createOpenRouterClient');
const createAgentSession = await core.value('createAgentSession');
const defineTool = await core.value('defineTool');

const client = createOpenRouterClient({ apiKey: KEY, referer: 'https://lopecode.com', title: 'rc4-probe' });

// tiny fake fs
const fs = {
  '/notebook/@user/counter.js': 'const _count = function _count(){return( 3 )};\nexport default function define(runtime, observer){ const main=runtime.module(); main.variable(observer("count")).define("count",[],_count); return main; }\n',
};
const bash = defineTool({ id: 'bash', description: 'Run bash over an in-memory fs (ls, cat).', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
  execute: async ({ command }) => {
    if (/^ls\b/.test(command)) return { output: Object.keys(fs).join('\n') };
    const m = command.match(/cat\s+(\S+)/); if (m) return { output: fs[m[1]] ?? `cat: ${m[1]}: No such file` };
    return { output: '(ok)' };
  } });
const write_file = defineTool({ id: 'write_file', description: 'Write a file. Args: file_path, content.', parameters: { type: 'object', properties: { file_path: { type: 'string' }, content: { type: 'string' } }, required: ['file_path', 'content'] },
  execute: async ({ file_path, content }) => { fs[file_path] = content; return { output: `written ${file_path} (${content.length} bytes); applied live (1 cell changed)` }; } });
const read_file = defineTool({ id: 'read_file', description: 'Read a file with line numbers. Args: file_path.', parameters: { type: 'object', properties: { file_path: { type: 'string' } }, required: ['file_path'] },
  execute: async ({ file_path }) => ({ output: fs[file_path] ?? `read_file: ${file_path}: not found` }) });

const session = createAgentSession({
  client, tools: [bash, read_file, write_file],
  systemPrompt: 'You are a coding agent over a virtual fs. Use tools every turn; never just describe. Call task_complete when done.',
  modelProvider: () => MODEL,
  completeToolName: 'task_complete', stallNudgeLimit: 2, maxStepsPerTurn: 12, maxTokens: 8192,
});

let steps = 0;
const r = await session.send(TASK, {
  onStep: (s) => { steps = s; },
  onToolCall: (id, name, args) => console.log(`  step ${steps} ⚙ ${name} ${JSON.stringify(args).slice(0, 120)}`),
  onText: (t) => t && console.log(`  step ${steps} 💬 ${String(t).slice(0, 160)}`),
  onNudge: (n) => console.log(`  ⚠ NUDGE #${n}`),
  onFinish: ({ finishReason }) => console.log(`  ✓ finish: ${finishReason}`),
});
console.log('\nRESULT finishReason:', r.finishReason, '| steps:', r.steps);
console.log('files now:', Object.keys(fs));
console.log('double.js written:', !!fs['/notebook/@user/double.js']);
if (fs['/notebook/@user/double.js']) console.log('---\n' + fs['/notebook/@user/double.js'].slice(0, 400));
