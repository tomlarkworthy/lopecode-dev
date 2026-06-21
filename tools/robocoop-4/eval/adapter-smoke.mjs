// Browser-path smoke test (no network, no browser): stubs globalThis.justbash + globalThis.fetch
// and drives createNotebookRunner end-to-end through openrouter client -> loop -> bashTool ->
// window.justbash.exec -> a node just-bash session. Proves the notebookAdapter wiring matches the core.
//
// Run: node tools/robocoop-4/eval/adapter-smoke.mjs

import { InMemoryFs } from '../../justbash-build/node_modules/just-bash/dist/bundle/index.js';
import { createNodeSession } from '../nodeSession.mjs';
import { createNotebookRunner } from '../notebookAdapter.mjs';

const fs = new InMemoryFs();
await fs.writeFile('/notebook/@user/mod.js', 'const _x = function _x(){return( foo )};\n');
const session = createNodeSession(fs, { cwd: '/notebook' });

// stub the browser bridge: exec returns the raw {stdout,stderr,exitCode} shape robocoop expects.
globalThis.justbash = { exec: (cmd) => session.runCommand(cmd) };

// stub fetch: first call -> one bash tool_call (sed rename), second call -> stop.
let turn = 0;
globalThis.fetch = async (_url, init) => {
  const body = JSON.parse(init.body);
  turn++;
  const message =
    turn === 1
      ? {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'c1',
              type: 'function',
              function: {
                name: 'bash',
                arguments: JSON.stringify({ command: "sed -i 's/\\bfoo\\b/bar/g' /notebook/@user/mod.js" }),
              },
            },
          ],
        }
      : { role: 'assistant', content: 'done', tool_calls: [] };
  return {
    ok: true,
    status: 200,
    async json() {
      return { choices: [{ message, finish_reason: turn === 1 ? 'tool_calls' : 'stop' }] };
    },
    async text() { return ''; },
  };
};

const runner = createNotebookRunner({ apiKey: 'sk-or-test', model: 'anthropic/claude-sonnet-4', systemPrompt: 'you edit notebook files with bash' });

const seen = [];
const result = await runner.run('rename foo to bar in /notebook/@user/mod.js', {
  onToolCall: (_id, name, args) => seen.push(name + ':' + args.command),
});

const after = await fs.readFile('/notebook/@user/mod.js');
const ok = after.includes('bar') && !/\bfoo\b/.test(after) && result.finishReason === 'stop';

console.log('tool calls:', seen);
console.log('file after:', JSON.stringify(after));
console.log('finishReason:', result.finishReason, 'steps:', result.steps);
console.log(ok ? 'PASS adapter smoke' : 'FAIL adapter smoke');
process.exit(ok ? 0 : 1);
