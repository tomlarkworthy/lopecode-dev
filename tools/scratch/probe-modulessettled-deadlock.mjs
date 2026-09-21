// Does modulesSettled() resolve at all? Its internal budget here is 10s, so anything still
// pending at 25s is a teardown deadlock (await gen.return() queued behind a suspended next()),
// not a slow settle. Run against the CANONICAL, i.e. whatever is currently synced.
//
// Measured against the unfixed canonical, 2026-09-21:
//   release:true  -> {"done":false,"pendingAfterMs":25000}
//   release:false -> {"done":true,"ms":408,"size":2}
// i.e. settling is fine; the teardown is the hang.
//
// The third measurement is the one that matters after the fix: modulesSettled has a bounded-wait
// seatbelt, so it would report "done" even with a generator that never wakes. Only calling
// gen.return() on the RAW generator shows whether the bump() generalization really works — i.e.
// whether the title watches and force-load observers are actually released rather than leaked.
import { chromium } from 'playwright';
const file = 'file:///Users/tom.larkworthy/dev/lopecode-dev/lopecode/notebooks/@tomlarkworthy_modules.html';
const browser = await chromium.launch({ args: ['--disable-web-security'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await page.goto(file, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__ojs_runtime, null, { timeout: 60000 });
await page.waitForTimeout(8000);

const out = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  let mod = null;
  for (const v of rt._variables) if (v._name === 'modulesSettled') { mod = v._module; break; }
  if (!mod) return { error: 'modulesSettled not found in runtime' };
  const modulesSettled = await mod.value('modulesSettled');
  const modules = await mod.value('modules');
  const Runtime = await mod.value('Runtime');

  const titled = (scratch) => {
    const m = scratch.module();
    m.variable().define('title', [], () => {
      const d = document.createElement('div');
      d.innerHTML = '<h1>Settled</h1>';
      return d;
    });
    return m;
  };

  const scratch = new Runtime();
  titled(scratch);

  const t0 = Date.now();
  const p = modulesSettled({ runtime: scratch, rescanMs: 100, titleTimeoutMs: 500, quietMs: 400, timeoutMs: 10000 })
    .then(map => ({ done: true, ms: Date.now() - t0, size: map.size, titles: [...map.values()].map(x => x.title) }),
          e => ({ rejected: true, ms: Date.now() - t0, message: String(e && e.message || e).slice(0, 300) }));
  const verdict = await Promise.race([p, new Promise(r => setTimeout(() => r({ done: false, pendingAfterMs: 25000 }), 25000))]);

  // Was the inner generator's release the thing that hung? Re-run with release:false.
  const t1 = Date.now();
  const p2 = modulesSettled({ runtime: scratch, rescanMs: 100, titleTimeoutMs: 500, quietMs: 400, timeoutMs: 10000, release: false })
    .then(map => ({ done: true, ms: Date.now() - t1, size: map.size }), e => ({ rejected: true, message: String(e).slice(0, 200) }));
  const verdictNoRelease = await Promise.race([p2, new Promise(r => setTimeout(() => r({ done: false, pendingAfterMs: 20000 }), 20000))]);

  // The generalization itself: does the raw generator honour return() on a quiet runtime?
  const scratch2 = new Runtime();
  titled(scratch2);
  const gen = modules({ runtime: scratch2, rescanMs: 100, titleTimeoutMs: 500 });
  await gen.next();
  await new Promise(r => setTimeout(r, 800)); // let it go quiet, so nothing is bumping
  const t2 = Date.now();
  const verdictRawReturn = await Promise.race([
    gen.return().then(() => ({ returned: true, ms: Date.now() - t2 }), e => ({ threw: String(e).slice(0, 200) })),
    new Promise(r => setTimeout(() => r({ returned: false, pendingAfterMs: 8000 }), 8000))
  ]);

  return { verdict, verdictNoRelease, verdictRawReturn };
});

console.log('release:true    ->', JSON.stringify(out.verdict));
console.log('release:false   ->', JSON.stringify(out.verdictNoRelease));
console.log('raw gen.return  ->', JSON.stringify(out.verdictRawReturn));
if (out.error) console.log('ERROR:', out.error);
console.log('pageerrors:', errs.length, errs.slice(0, 3));
await browser.close();
