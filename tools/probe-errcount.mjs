// Boot a notebook and report its errored cells, so a change can be compared against a baseline.
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
for (const f of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const perr = [];
  p.on('pageerror', (e) => perr.push(String(e).slice(0, 90)));
  await p.goto(`file://${resolve(f)}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForTimeout(30000);
  const r = await p.evaluate(() => {
    const rt = window.__ojs_runtime, names = [], msgs = {};
    for (const v of rt._variables) {
      const n = v._observer && v._observer._node;
      const t = n && n.textContent ? n.textContent : '';
      const m = /(Runtime|Reference|Type|Syntax|Range)Error: (.{0,55})/.exec(t);
      if (m) { names.push(String(v._name)); msgs[m[2]] = (msgs[m[2]] || 0) + 1; }
    }
    return { vars: rt._variables.size, names, msgs, iframes: document.querySelectorAll('iframe').length,
             body: document.body.innerText.length };
  });
  await p.close();
  console.log(`${f.split('/').pop()}  vars=${r.vars} body=${r.body} iframes=${r.iframes} errcells=${r.names.length} pageerr=${perr.length}`);
  console.log(`   msgs: ${JSON.stringify(r.msgs)}`);
  console.log(`   names: ${r.names.join(', ') || '(none)'}`);
}
await b.close();
