#!/usr/bin/env node
// Runnable CLI entrypoint. Runs the no-network self-test first, then the task eval.
//   node tools/robocoop-4/eval/run-eval.mjs
//   node tools/robocoop-4/eval/run-eval.mjs --only rename-identifier -v
//   node tools/robocoop-4/eval/run-eval.mjs --real        (key from tools/robocoop-4/.env)
//   OPENROUTER_API_KEY=... node tools/robocoop-4/eval/run-eval.mjs --real   (inline still works)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { main } from './harness.mjs';
import { runSelfTest } from './selfTest.mjs';

// Minimal .env loader (no dependency). Existing process.env wins; later files don't override
// earlier ones. Search order: tools/robocoop-4/.env then repo-root .env.
function loadEnv() {
  const here = dirname(fileURLToPath(import.meta.url)); // .../tools/robocoop-4/eval
  const candidates = [join(here, '..', '.env'), join(here, '..', '..', '..', '.env')];
  for (const file of candidates) {
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    for (const line of text.split('\n')) {
      const s = line.trim();
      if (!s || s.startsWith('#')) continue;
      const eq = s.indexOf('=');
      if (eq < 0) continue;
      const key = s.slice(0, eq).trim();
      let val = s.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (key && !(key in process.env)) process.env[key] = val;
    }
  }
}
loadEnv();

const argv = process.argv.slice(2);
// Let OPENROUTER_MODEL act as the default model when --model isn't passed explicitly.
if (process.env.OPENROUTER_MODEL && !argv.includes('--model')) {
  argv.push('--model', process.env.OPENROUTER_MODEL);
}
const skipSelfTest = argv.includes('--no-self-test');

let selfFail = false;
if (!skipSelfTest) {
  const st = await runSelfTest();
  console.log('self-test (no network):');
  for (const c of st.checks) {
    console.log('  ' + (c.ok ? 'PASS ' : 'FAIL ') + c.name + (c.ok ? '' : ' :: ' + c.detail));
  }
  console.log('  -> ' + (st.ok ? 'all loop invariants hold' : 'SELF-TEST FAILED') + '\n');
  selfFail = !st.ok;
}

const code = await main(argv.filter((a) => a !== '--no-self-test'));
process.exit(selfFail ? 1 : code);
