// What did cell-map-viz's thisNotebookDiagram actually draw? Counts marks, reads labels and size,
// then adds a cell to cell-map-2's module and checks the diagram redraws with it.
// run: node tools/scratch/probe-viz-demo.mjs <notebook.html>
import { chromium } from 'playwright';
import { resolve } from 'path';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('file://' + resolve(process.argv[2]));
await page.waitForFunction(() => window.__ojs_runtime, { timeout: 60000 });
await page.waitForTimeout(8000);

const setup = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const target = [...rt._variables].find((v) => v._name === 'thisNotebookDiagram');
  if (!target) return { found: false };
  window.__figs = [];
  target._module.variable({
    fulfilled(fig) { window.__figs.push({ t: performance.now(), fig }); },
    rejected(e) { window.__figs.push({ t: performance.now(), error: String(e).slice(0, 160) }); }
  }).define(null, ['thisNotebookDiagram'], (x) => x);
  const cm2 = [...rt._variables].find((v) => v._name === 'liveCellMap' && v._inputs.some((i) => i._name === 'runtime_variables'));
  window.__cm2module = cm2 && cm2._module;
  return { found: true, cm2: !!cm2 };
});
console.log('setup', JSON.stringify(setup));
await page.waitForTimeout(6000);

const describe = () => page.evaluate(() => {
  const last = window.__figs.at(-1);
  if (!last) return { renders: 0 };
  if (last.error) return { renders: window.__figs.length, error: last.error };
  const fig = last.fig;
  const svg = fig.querySelector('svg:not(.plot-swatches svg)') || fig.querySelector('svg');
  const svgs = [...fig.querySelectorAll('svg')];
  const main = svgs.reduce((a, b) => (+(b.getAttribute('height') || 0) > +(a?.getAttribute('height') || 0) ? b : a), null);
  const labels = [...main.querySelectorAll('g[aria-label="text"] > *')].map((n) => n.textContent);
  return {
    renders: window.__figs.length,
    height: main.getAttribute('height'),
    dots: main.querySelectorAll('g[aria-label="dot"] > *').length,
    arrows: main.querySelectorAll('g[aria-label="arrow"] > *').length,
    labels: labels.length,
    modules: [...new Set(labels.map((l) => l.split('#')[0]))],
    sample: labels.slice(0, 4),
    hasProbe: labels.some((l) => l.endsWith('#probe_viz_cell')),
    links: main.querySelectorAll('a').length
  };
});
console.log('initial', JSON.stringify(await describe()));

await page.evaluate(() => {
  window.__cm2module.variable(true).define('probe_viz_cell', [], function _probe_viz_cell(){return(1)});
});
await page.waitForTimeout(8000);
console.log('after adding probe_viz_cell to cell-map-2', JSON.stringify(await describe()));
await browser.close();
