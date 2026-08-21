import { chromium } from 'playwright';
const b = await chromium.launch();
for (let i = 0; i < 3; i++) {
  const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
  await p.addInitScript(() => {
    window.__m = {};
    const mk = (k) => { if (!(k in window.__m)) window.__m[k] = +performance.now().toFixed(0); };
    setInterval(() => {
      const el = document.getElementById('@tomlarkworthy/tarot-deck');
      if (el && el.nextSibling != null) mk('deck code block');
      const cm = document.getElementById('@tomlarkworthy/codemirror-6-v2');
      if (cm && cm.nextSibling != null) mk('codemirror block');
      if (window.__lopeStreaming === false) mk('fully parsed');
      const m = document.querySelector('#lopepage-2 .observablehq');
      if (m && !m.closest('#lope-prerender')) mk('MOUNT');
    }, 20);
  });
  await p.goto('https://thetarot.online/', { waitUntil: 'commit', timeout: 120000 });
  for (let n = 0; n < 600; n++) {
    if (await p.evaluate(() => !!window.__m?.MOUNT && window.__lopeStreaming === false).catch(() => 0)) break;
    await p.waitForTimeout(100);
  }
  const m = await p.evaluate(() => window.__m);
  console.log(Object.entries(m).sort((a, b) => a[1] - b[1]).map(([k, v]) => `${String(v).padStart(6)}ms ${k}`).join('  |  '));
  await p.close();
}
await b.close();
