// Grounded DAW probe: run the REAL core loop with xiaomi/mimo-v2.5 on the "fully featured Audio DAW"
// task, with a REAL compile check on every module write (the browser's "FAILED TO COMPILE" signal,
// approximated by importing the written module + running its define() against a stub runtime).
// Captures per-step finish_reason + token usage to catch max_tokens truncation of large writes.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { importNotebookModule } from '../notebook-import.ts';

const here = dirname(fileURLToPath(import.meta.url));
const KEY = readFileSync(join(here, '.env'), 'utf8').match(/OPENROUTER_API_KEY=(\S+)/)[1];
const MODEL = process.argv[2] || 'xiaomi/mimo-v2.5';
const MAX_TOKENS = Number(process.argv[3] || 8192);
const TASK = 'Create me a fully featured Audio DAW';

const corePath = join(here, '..', '..', 'modules', '@tomlarkworthy', 'robocoop-4-core.js');
const core = await importNotebookModule(corePath, { overrides: { md: (s) => String(s.raw?.[0] ?? s) } });
const createOpenRouterClient = await core.value('createOpenRouterClient');
const createAgentSession = await core.value('createAgentSession');
const defineTool = await core.value('defineTool');

// wrap client to record per-step usage + finish_reason
const baseClient = createOpenRouterClient({ apiKey: KEY, referer: 'https://lopecode.com', title: 'rc4-daw-probe' });
const stepLog = [];
const client = { chat: async (req) => { const r = await baseClient.chat(req); stepLog.push({ finish: r.finish_reason, usage: r.raw?.usage }); return r; } };

const tmp = mkdtempSync(join(tmpdir(), 'rc4daw-'));
const fs = { '/notebook/README.md': '# workspace\n', '/notebook/@tomlarkworthy/robocoop-4.js': '/* the app module (stub for listing) */\n' };

// REAL compile check: write the module to a temp .mjs, import it, run define() against a stub runtime.
async function compileCheck(path, content) {
  if (!path.endsWith('.js') || !path.startsWith('/notebook/')) return 'written';
  const file = join(tmp, 'm' + Math.abs(hash(path + content)) + '.mjs');
  writeFileSync(file, content);
  try {
    const mod = await import(pathToFileURL(file).href);
    if (typeof mod.default !== 'function') return 'written, but FAILED TO COMPILE: no export default define function — live runtime unchanged';
    let cells = 0;
    const stubRT = { module: () => ({ variable: () => ({ define: () => { cells++; return { set pid(v) {} }; } }) }) };
    mod.default(stubRT, () => () => {});
    return `applied live (${cells} cells changed)`;
  } catch (e) { return `written, but FAILED TO COMPILE: ${e.message} — live runtime unchanged`; }
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

const bash = defineTool({ id: 'bash', description: 'bash over in-memory fs (ls/grep/find/cat).', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
  execute: async ({ command }) => {
    if (/(^|\s)ls(\s|$)/.test(command)) return { output: Object.keys(fs).join('\n') };
    const m = command.match(/cat\s+(\S+)/); if (m) return { output: fs[m[1]] ?? `cat: ${m[1]}: No such file` };
    return { output: '(ok)' };
  } });
const read_file = defineTool({ id: 'read_file', description: 'Read a file w/ line numbers. Args: file_path,offset,limit.', parameters: { type: 'object', properties: { file_path: { type: 'string' } }, required: ['file_path'] },
  execute: async ({ file_path }) => ({ output: fs[file_path] ?? `read_file: ${file_path}: not found` }) });
const write_file = defineTool({ id: 'write_file', description: 'Write/create a file. Args: file_path, content. A /notebook/<id>.js write compiles live and reports status.', parameters: { type: 'object', properties: { file_path: { type: 'string' }, content: { type: 'string' } }, required: ['file_path', 'content'] },
  execute: async ({ file_path, content }) => { fs[file_path] = content; const st = await compileCheck(file_path, content); return { output: `written ${file_path} (${content.length} bytes); ${st}` }; } });
const edit_file = defineTool({ id: 'edit_file', description: 'Literal replace. Args: file_path, old_string, new_string, replace_all.', parameters: { type: 'object', properties: { file_path: { type: 'string' }, old_string: { type: 'string' }, new_string: { type: 'string' }, replace_all: { type: 'boolean' } }, required: ['file_path', 'old_string', 'new_string'] },
  execute: async ({ file_path, old_string, new_string, replace_all }) => {
    const cur = fs[file_path]; if (cur == null) return { output: `edit_file: ${file_path}: not found` };
    if (!cur.includes(old_string)) return { output: 'edit_file: old_string not found' };
    const parts = cur.split(old_string);
    fs[file_path] = replace_all ? parts.join(new_string) : parts[0] + new_string + parts.slice(1).join(old_string);
    const st = await compileCheck(file_path, fs[file_path]); return { output: `edited ${file_path}; ${st}` };
  } });
const inspect_value = defineTool({ id: 'inspect_value', description: 'Live runtime value/error of a cell. Args: module, name.', parameters: { type: 'object', properties: { module: { type: 'string' }, name: { type: 'string' } }, required: ['module', 'name'] },
  execute: async ({ module, name }) => ({ output: `${module}:${name} = [node probe: runtime value unavailable; module compiled OK if write reported applied]` }) });
const list_values = defineTool({ id: 'list_values', description: 'List live values for a module. Args: module.', parameters: { type: 'object', properties: { module: { type: 'string' } }, required: ['module'] },
  execute: async ({ module }) => ({ output: `${module}: [node probe stub]` }) });

const systemPrompt = await core.value('systemPrompt');
const session = createAgentSession({
  client, tools: [bash, read_file, write_file, edit_file, inspect_value, list_values],
  systemPrompt, modelProvider: () => MODEL,
  completeToolName: 'task_complete', stallNudgeLimit: 2, maxStepsPerTurn: 20, maxTokens: MAX_TOKENS,
});

console.log(`MODEL=${MODEL} MAX_TOKENS=${MAX_TOKENS}\nTASK=${TASK}\n`);
let cur = 0;
const r = await session.send(TASK, {
  onStep: (s) => { cur = s; },
  onToolCall: (id, name, args) => { const a = JSON.stringify(args); console.log(`step ${cur} ⚙ ${name} ${a.length > 100 ? a.slice(0, 100) + `…(${a.length}b)` : a}`); },
  onToolResult: (id, out) => { if (/FAILED TO COMPILE|not found|ERROR/.test(out)) console.log(`        ↳ ${String(out).slice(0, 180)}`); },
  onText: (t) => t && console.log(`step ${cur} 💬 ${String(t).slice(0, 200)}`),
  onNudge: (n) => console.log(`  ⚠ NUDGE #${n}`),
  onFinish: ({ finishReason }) => console.log(`  ✓ finish: ${finishReason}`),
});
console.log('\n=== per-step finish_reason / tokens ===');
stepLog.forEach((s, i) => console.log(`  ${i}: finish=${s.finish} compl=${s.usage?.completion_tokens} reason_tok=${s.usage?.completion_tokens_details?.reasoning_tokens ?? '?'} prompt=${s.usage?.prompt_tokens}`));
console.log('\nRESULT finishReason:', r.finishReason, '| steps:', r.steps);
const modules = Object.keys(fs).filter((p) => p.endsWith('.js') && !p.includes('robocoop-4.js'));
console.log('modules written:', modules);
for (const m of modules) console.log(`  ${m}: ${fs[m].length} bytes`);
// dump the largest created module
const created = modules.filter((m) => !m.includes('robocoop-4.js'));
const biggest = created.sort((a, b) => fs[b].length - fs[a].length)[0];
if (biggest) { console.log(`\n=== ${biggest} (first 1200 chars) ===\n` + fs[biggest].slice(0, 1200)); writeFileSync(join(here, 'mimo-daw-output.js'), fs[biggest]); console.log(`\n(full module saved to mimo-daw-output.js)`); }
