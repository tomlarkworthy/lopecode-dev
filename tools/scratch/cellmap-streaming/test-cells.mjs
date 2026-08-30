// Boot a notebook, force all variables, report every test_* cell's outcome plus liveCellMap.
//   node test-cells.mjs <notebook.html>
import { chromium } from 'playwright';
import { resolve } from 'path';
import { spawn } from 'node:child_process';

const file = resolve(process.argv[2]);
const server = spawn('bun', ['scratch/rmbt/slow-serve.ts', file, '50000000', '8128'], {
  stdio: ['ignore', 'pipe', 'inherit']
});
await new Promise((r) => server.stdout.once('data', r));
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await p.goto('http://localhost:8128/', { waitUntil: 'load', timeout: 120000 });
await p.waitForFunction(() => {
  const rt = window.__ojs_runtime;
  return rt && rt._variables && rt._variables.size > 50;
}, null, { timeout: 60000, polling: 250 });
await p.waitForTimeout(4000);
console.log('vars:', await p.evaluate(() => window.__ojs_runtime._variables.size));
await p.evaluate(() => {
  const runtime = window.__ojs_runtime;
  const mods = [runtime, ...(runtime.mains ? [...runtime.mains.values()] : [])];
  for (const m of mods) {
    if (!m._variables) continue;
    for (const v of m._variables) { v._reachable = true; runtime._dirty.add(v); }
  }
  runtime._computeNow();
});
await p.waitForTimeout(12000);
console.log(JSON.stringify(await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const tests = [];
  let liveCellMap = null;
  for (const v of rt._variables) {
    if (typeof v._name === 'string' && v._name.startsWith('test_')) {
      tests.push({
        name: v._name,
        state: v._error !== undefined ? `ERROR: ${String(v._error).slice(0, 120)}`
          : v._value !== undefined ? 'ok' : 'pending'
      });
    }
    if (v._name === 'liveCellMap' && v._value instanceof Map) liveCellMap = v._value.size;
  }
  return { tests: tests.sort((a, b) => a.name.localeCompare(b.name)), liveCellMapSize: liveCellMap };
}), null, 1));
console.log('pageerrors:', errs.slice(0, 5));
await b.close();
server.kill();
