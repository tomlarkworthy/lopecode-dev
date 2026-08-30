// Measure, under a rate-limited stream, when the cellMap products become available relative to
// the streaming module API and to the end of the document.
//   node tools/probe-cellmap-streaming.mjs <notebook.html> [rateBytesPerSec] [port]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const file = process.argv[2];
const rate = Number(process.argv[3] ?? 1_700_000);
const port = Number(process.argv[4] ?? 8123);
if (!file) throw new Error('usage: probe-cellmap-streaming.mjs <notebook.html> [rate] [port]');

const server = spawn('bun', ['scratch/rmbt/slow-serve.ts', file, String(rate), String(port)], {
  stdio: ['ignore', 'pipe', 'inherit']
});
await new Promise((r) => server.stdout.once('data', r));

const probe = () => {
  const t0 = performance.now();
  const marks = (window.__probe = { t0 });
  const stamp = (k) => { if (marks[k] == null) marks[k] = Math.round(performance.now() - t0); };
  document.addEventListener('DOMContentLoaded', () => stamp('domContentLoaded'));
  window.addEventListener('load', () => stamp('load'));

  const nonEmptyMap = (v) => v instanceof Map && v.size > 0;
  setInterval(() => {
    const rt = window.__ojs_runtime;
    if (!rt) return;
    stamp('runtime');
    for (const v of rt._variables) {
      if (v._name === 'liveCellMap' && nonEmptyMap(v._value)) {
        stamp('liveCellMap');
        marks.liveCellMapModules = v._value.size;
      }
      // module-map's blocking snapshot, and @tomlarkworthy/modules' streaming one. Both cells are
      // named currentModules; the streaming record has no dependsOn field.
      if (v._name === 'currentModules' && nonEmptyMap(v._value)) {
        const rec = v._value.values().next().value;
        const streaming = rec && !('dependsOn' in rec);
        stamp(streaming ? 'currentModules_streaming' : 'currentModules_moduleMap');
        marks[streaming ? 'streamingSize' : 'moduleMapSize'] = v._value.size;
      }
      if (v._name === 'cellMap' && typeof v._value === 'function') stamp('cellMapFn');
    }
  }, 25);
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript(probe);
await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
await page.waitForTimeout(20000);
console.log(JSON.stringify(await page.evaluate(() => window.__probe), null, 2));
await browser.close();
server.kill();
