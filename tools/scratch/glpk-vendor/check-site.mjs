// Load a notebook on observablehq.com (2.0 viewer) or old.observablehq.com (legacy) and report
// whether any cell errored. Anonymous by default; --auth uses the stored cookies.
import fs from 'node:fs';
import { chromium } from 'playwright';

const url = process.argv[2];
const wait = Number(process.argv[3] ?? 35000);
const auth = process.argv.includes('--auth');
const browser = await chromium.launch();
const context = await browser.newContext();
if (auth) {
  const c = JSON.parse(fs.readFileSync('tools/.observable-cookies.json', 'utf8'));
  const domain = new URL(url).hostname;
  await context.addCookies([
    { name: 'I', value: c.I, domain, path: '/', httpOnly: true, secure: true },
    { name: 'T', value: c.T, domain, path: '/', httpOnly: true, secure: true },
  ]);
}
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 160)));
const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
console.log(`HTTP ${resp.status()}  ${url}`);
await page.waitForTimeout(Math.min(wait, 8000));
// the viewers render lazily, so walk the page to force every cell to mount
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(700);
}
await page.waitForTimeout(wait);

const report = await page.evaluate(() => {
  // cell output can sit inside shadow roots, so gather text from the whole composed tree
  const deepText = (root, out = []) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) deepText(el.shadowRoot, out);
    }
    out.push(root === document ? document.body.innerText : (root.host ? root.textContent : ''));
    return out;
  };
  const composed = deepText(document).join('\n');
  const sel = '.observablehq--error, .observablehq--inspect.observablehq--error, [class*="error"]';
  const errs = [...document.querySelectorAll(sel)]
    .map((e) => e.textContent.trim().replace(/\s+/g, ' '))
    .filter((t) => t && /error|not defined|not a function|failed/i.test(t));
  const body = document.body.innerText;
  const grab = (name) => {
    // the cell whose rendered text follows its name in the DOM order is hard to address;
    // fall back to searching the whole page for the marker text
    return body.includes(name);
  };
  const markers = ['Licensing', 'Blending', 'test_', 'optimal', 'GLPK', 'x1'];
  return {
    errorNodes: [...new Set(errs)].slice(0, 12),
    markers: Object.fromEntries(markers.map((m) => [m, body.includes(m)])),
    hasOptimal: /status:\s*"optimal"|"optimal"/.test(body),
    mentionsRequire: /require is not defined/.test(body),
    length: body.length,
    title: document.title,
  };
});
console.log(JSON.stringify({ ...report, pageErrors: [...new Set(pageErrors)].slice(0, 8) }, null, 1));
await browser.close();
