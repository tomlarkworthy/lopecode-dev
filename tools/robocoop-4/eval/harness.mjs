// Node eval harness. Per task: seed a fresh InMemoryFs, build a nodeSession runCommand + a model
// client (scripted default; OpenRouter when --real and OPENROUTER_API_KEY are present), run the
// prompt through a fresh agent loop, then run task.assert(fs). FAILS LOUDLY if a task has no assert.
//
// Run: node tools/robocoop-4/eval/run-eval.mjs   (scripted, no key)
//      OPENROUTER_API_KEY=... node tools/robocoop-4/eval/run-eval.mjs --real --model anthropic/claude-sonnet-4

import { InMemoryFs } from '../../justbash-build/node_modules/just-bash/dist/bundle/index.js';

import { createNodeSession } from '../nodeSession.mjs';
import { createBashTool } from '../bashTool.mjs';
import { createAgentLoop } from '../agentLoop.mjs';
import { createScriptedClient } from '../scriptedClient.mjs';
import { createOpenRouterClient } from '../openrouter.mjs';
import { systemPrompt, composeFooter } from '../systemPrompt.mjs';
import { tasks as defaultTasks } from './tasks.mjs';

async function seedFs(files) {
  const fs = new InMemoryFs();
  await fs.mkdir('/notebook', { recursive: true });
  for (const [path, src] of Object.entries(files ?? {})) {
    const dir = path.slice(0, path.lastIndexOf('/'));
    if (dir) await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path, src);
  }
  return fs;
}

function makeClient({ real, task, model }) {
  if (real) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('--real set but OPENROUTER_API_KEY is empty');
    return createOpenRouterClient({
      apiKey,
      referer: 'https://lopecode.com',
      title: 'robocoop-4-eval',
      defaultModel: model,
    });
  }
  // Default: deterministic scripted replay of the task's recorded tool-calls.
  if (!Array.isArray(task.script))
    throw new Error('task "' + task.id + '" has no `script` for scripted mode (run with --real or add script)');
  return createScriptedClient(task.script);
}

export async function runTask(task, { real = false, model = 'anthropic/claude-sonnet-4', verbose = false } = {}) {
  if (typeof task.assert !== 'function')
    throw new Error('task "' + task.id + '" has NO assert function — refusing to grade (DESIGN.md P0/P2)');

  const fs = await seedFs(task.files);
  const session = createNodeSession(fs);
  const client = makeClient({ real, task, model });

  const loop = createAgentLoop({
    client,
    tools: [createBashTool()],
    systemPrompt: systemPrompt + composeFooter({ workdir: '/notebook', model: real ? model : 'scripted' }),
    model,
    runCommand: session.runCommand,
  });

  const callbacks = verbose
    ? {
        onToolCall: (id, name, args) => console.log('    > ' + name + ' ' + JSON.stringify(args)),
        onToolResult: (id, out) => console.log('    < ' + out.split('\n')[0].slice(0, 80)),
        onText: (t) => console.log('    . ' + String(t).split('\n')[0].slice(0, 80)),
      }
    : {};

  let runError = null;
  let finishReason = null;
  let steps = 0;
  try {
    const r = await loop.run(task.prompt, callbacks);
    finishReason = r.finishReason;
    steps = r.steps;
  } catch (e) {
    runError = e;
  }

  let result;
  try {
    result = await task.assert(fs);
  } catch (e) {
    result = { ok: false, detail: 'assert threw: ' + e.message };
  }

  return {
    id: task.id,
    pass: !runError && !!result?.ok,
    detail: runError ? 'loop error: ' + runError.message : result?.detail ?? '',
    finishReason,
    steps,
  };
}

function parseArgs(argv) {
  const args = { real: false, verbose: false, model: 'anthropic/claude-sonnet-4', only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--real') args.real = true;
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--model') args.model = argv[++i];
    else if (a === '--only') args.only = argv[++i];
  }
  return args;
}

export async function main(argv = process.argv.slice(2), tasks = defaultTasks) {
  const args = parseArgs(argv);
  const selected = args.only ? tasks.filter((t) => t.id === args.only) : tasks;
  if (selected.length === 0) {
    console.error('No tasks matched.');
    return 2;
  }

  const mode = args.real ? 'REAL OpenRouter (' + args.model + ')' : 'SCRIPTED (no network)';
  console.log('robocoop-4 eval — mode: ' + mode + ', tasks: ' + selected.length + '\n');

  const rows = [];
  for (const task of selected) {
    if (args.verbose) console.log('# ' + task.id);
    const row = await runTask(task, args);
    rows.push(row);
    const tag = row.pass ? 'PASS' : 'FAIL';
    console.log(
      tag.padEnd(5) + row.id.padEnd(24) + 'steps=' + String(row.steps).padEnd(4) +
        (row.pass ? '' : ' :: ' + row.detail),
    );
  }

  const passed = rows.filter((r) => r.pass).length;
  console.log('\n' + passed + '/' + rows.length + ' passed.');
  return passed === rows.length ? 0 : 1;
}
