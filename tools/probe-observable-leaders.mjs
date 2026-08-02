// Leaders missing on observablehq.com: are the paths drawn, and where? Also check each note's
// label against the cell it actually resolved onto.
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
await page.goto(process.argv[2] || 'https://observablehq.com/@tomlarkworthy/annotate',
  { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(22000);
const frame = page.frames().find((f) => f.url().includes('observableusercontent.com'));
console.log(await frame.evaluate(() => {
  const rt = window.__ojs_runtime;
  const home = ([...rt._variables].find((v) => v._name === 'a2Layer') || {})._module;
  const g = (n) => { const v = [...rt._variables].find((x) => x._name === n && x._module === home); return v && v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  const out = [];
  for (const l of document.querySelectorAll('[data-a2-layer],[data-a2-root]')) {
    const r = l.getBoundingClientRect(), s = l.querySelector('svg');
    const sr = s && s.getBoundingClientRect();
    out.push(`layer ${l.getAttribute('data-a2-layer') === null ? 'root' : 'layer'} in ${l.parentElement.tagName}` +
      ` box=${Math.round(r.width)}x${Math.round(r.height)} overflow=${getComputedStyle(l).overflow}` +
      ` svg=${sr ? Math.round(sr.width) + 'x' + Math.round(sr.height) : 'none'}` +
      ` svgOverflow=${s ? getComputedStyle(s).overflow : '-'} paths=${l.querySelectorAll('path[data-a2-line]').length}`);
  }
  for (const rec of store.all()) {
    const res = A.resolve(rec.anchor);
    const line = document.querySelector(`path[data-a2-line="${rec.id}"]`);
    const bb = line && line.getBoundingClientRect();
    const label = document.querySelector(`[data-ann-id="${rec.id}"] span`);
    out.push(`${rec.id.padEnd(14)} rung=${String(res && res.rung).padEnd(6)} label=${JSON.stringify(label ? label.textContent : null)}` +
      ` d=${line ? JSON.stringify((line.getAttribute('d') || '').slice(0, 40)) : 'no path'}` +
      ` bbox=${bb ? Math.round(bb.left) + ',' + Math.round(bb.top) + ' ' + Math.round(bb.width) + 'x' + Math.round(bb.height) : '-'}` +
      ` display=${line ? getComputedStyle(line).display : '-'}`);
  }
  return out.join('\n');
}));
await browser.close();
