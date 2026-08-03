import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto(`file://${resolve('scratch/tpl-dataviz-tutorial.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(16000);
console.log(JSON.stringify(await p.evaluate(() => {
  const el = [...document.querySelectorAll('*')].filter((e) => /^cell _/.test(e.textContent.trim()) && e.children.length && e.children.length < 8);
  const h = el[el.length - 1];
  const codes = h ? [...h.textContent.trim()].filter((c) => c.charCodeAt(0) > 127)
    .map((c) => `${c} U+${c.codePointAt(0).toString(16).toUpperCase()}`) : [];
  return { text: h ? h.textContent.trim() : null, glyphs: [...new Set(codes)],
    html: h ? h.outerHTML.replace(/\s+/g, ' ').slice(0, 400) : null };
}), null, 1));
await b.close();
