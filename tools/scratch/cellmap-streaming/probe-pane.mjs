// Boot a notebook at its own bootconf hash and report what the lopepage-2 panes actually render.
// Optionally block all off-localhost network to simulate offline use.
//   node probe-pane.mjs <notebook.html> [--offline] [--port N]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const offline = args.includes('--offline');
const port = args.includes('--port') ? Number(args[args.indexOf('--port') + 1]) : 8131;

const server = spawn('bun', ['scratch/rmbt/slow-serve.ts', file, '50000000', String(port)], {
  stdio: ['ignore', 'pipe', 'inherit']
});
await new Promise((r) => server.stdout.once('data', r));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const blocked = [];
if (offline) {
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.includes('localhost') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    blocked.push(u.slice(0, 90));
    return route.abort();
  });
}
await page.goto(`http://localhost:${port}/`, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(12000);

const panes = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.lp2-pane')) {
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
    out.push({ chars: t.length, head: t.slice(0, 90) });
  }
  const rt = window.__ojs_runtime;
  return {
    panes: out,
    mains: rt?.mains ? [...rt.mains.keys()] : null
  };
});
console.log(JSON.stringify({ offline, ...panes, blockedSample: [...new Set(blocked)].slice(0, 6) }, null, 1));
await browser.close();
server.kill();
