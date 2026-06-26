// Validates the live-control additions to the CANONICAL robocoop-4-core createAgentSession:
//   steer(input)  → aborts the in-flight model call + injects a user message read on the next step
//   interrupt()   → aborts the in-flight call so a switched model drives the next step
//   abort()       → hard-stops the whole turn
// Drives the REAL createAgentSession (imported from modules/@tomlarkworthy/robocoop-4-core.js) with an
// abortable fake client, so this exercises the shipped loop, not a copy.  Run: bun tools/robocoop-4/probe-steering.mjs

import assert from 'node:assert/strict';
import { importNotebookModule } from '../notebook-import.ts';

const m = await importNotebookModule('modules/@tomlarkworthy/robocoop-4-core.js');
const createAgentSession = await m.value('createAgentSession');

const abortErr = () => { const e = new Error('aborted'); e.name = 'AbortError'; return e; };
const lastUser = (msgs) => { for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'user') return typeof msgs[i].content === 'string' ? msgs[i].content : '[parts]'; return null; };

// Fake client: each chat() waits ~40ms (abortable via signal), records {model,lastUser}, then returns the
// next scripted step. A step is only consumed when the await RESOLVES, so an aborted call costs no step.
function makeClient(script) {
  let i = 0; const calls = [];
  return {
    calls,
    async chat({ model, messages, signal }) {
      calls.push({ model, lastUser: lastUser(messages) });
      await new Promise((res, rej) => {
        if (signal?.aborted) return rej(abortErr());
        const t = setTimeout(res, 40);
        signal?.addEventListener('abort', () => { clearTimeout(t); rej(abortErr()); }, { once: true });
      });
      const step = script[i++] ?? { finish_reason: 'stop', message: { role: 'assistant', content: 'done' } };
      return { message: step.message, finish_reason: step.finish_reason };
    },
  };
}

const complete = (summary) => ({ finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'task_complete', arguments: JSON.stringify({ summary }) } }] } });
const mkSession = (client, model) => createAgentSession({ client, tools: [], modelProvider: () => model.v, systemPromptProvider: () => 'sys', runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0 }), completeToolName: 'task_complete', maxStepsPerTurn: 10 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0;

// ── 1. steer() injects a user message mid-turn and aborts the in-flight call ──
{
  const model = { v: 'model-A' };
  const client = makeClient([complete('did Y')]);   // first RESOLVED call ends the turn
  const s = mkSession(client, model);
  const p = s.send('do X');
  await sleep(15);                 // first chat (do X) is in flight
  s.steer('actually do Y');        // abort it + queue the redirect
  const r = await p;
  assert.equal(r.finishReason, 'completed', '1: turn completes after steer');
  assert.equal(client.calls.length, 2, '1: aborted call + redo = 2 chat calls');
  assert.equal(client.calls[0].lastUser, 'do X', '1: first call saw original prompt');
  assert.equal(client.calls[1].lastUser, 'actually do Y', '1: redo call saw the steer message');
  assert.ok(s.messages.some((mm) => mm.role === 'user' && mm.content === 'actually do Y'), '1: steer message is in history');
  pass++; console.log('✓ 1 steer injects + interrupts');
}

// ── 2. switching model mid-turn + interrupt() makes the new model drive next step ──
{
  const model = { v: 'model-A' };
  const client = makeClient([complete('ok')]);
  const s = mkSession(client, model);
  const p = s.send('task');
  await sleep(15);
  model.v = 'model-B';             // user picks a new model
  s.interrupt();                   // abort in-flight so the switch applies now
  const r = await p;
  assert.equal(r.finishReason, 'completed', '2: completes');
  assert.equal(client.calls[0].model, 'model-A', '2: first call used old model');
  assert.equal(client.calls[1].model, 'model-B', '2: redo used the switched model');
  pass++; console.log('✓ 2 model switch + interrupt');
}

// ── 3. abort() hard-stops the whole turn ──
{
  const model = { v: 'model-A' };
  const client = makeClient([complete('never')]);
  const s = mkSession(client, model);
  const p = s.send('task');
  await sleep(15);
  s.abort();
  const r = await p;
  assert.equal(r.finishReason, 'aborted', '3: hard abort ends the turn');
  assert.equal(client.calls.length, 1, '3: no redo after hard abort');
  pass++; console.log('✓ 3 hard abort');
}

// ── 4. baseline: a normal turn with no interruption still completes unchanged ──
{
  const model = { v: 'model-A' };
  const client = makeClient([complete('plain')]);
  const s = mkSession(client, model);
  const r = await s.send('hello');
  assert.equal(r.finishReason, 'completed', '4: plain turn completes');
  assert.equal(client.calls.length, 1, '4: one call, no spurious abort');
  pass++; console.log('✓ 4 baseline unchanged');
}

m.dispose();
console.log(`\n${pass}/4 passed`);
process.exit(pass === 4 ? 0 : 1);
