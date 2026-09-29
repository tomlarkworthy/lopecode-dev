// Registers @tomlarkworthy/pyodide's run_python into a robocoop-5 page via registerTool and calls it
// through the chat's tool registry (toolsView), not the cell.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext()).newPage();
await page.goto('file://' + resolve(process.argv[2]), { waitUntil: 'load', timeout: 120000 });
const out = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let t = Date.now(); while (!window.__ojs_runtime?.mains && Date.now() - t < 60000) await sleep(200);
  const rt = window.__ojs_runtime;
  const vars = () => [...rt._variables];
  const box = () => vars().find(x => x._name === 'toolsView' && x._value && 'value' in x._value)?._value;
  const t0 = Date.now();
  while (Date.now() - t0 < 60000 && !((box()?.value?.length ?? 0) >= 10)) await sleep(250);
  const before = box().value.map(t => t.id);
  const tools = rt.mains.get('@tomlarkworthy/robocoop-5-srctools');
  const registerTool = await tools.value('registerTool');
  const def = (await importShim('/@tomlarkworthy/pyodide.js?v=4')).default;
  const pyMod = rt.module(def);
  registerTool(await pyMod.value('run_python'));
  await sleep(1000);
  const tool = box().value.find(t => t.id === 'run_python');
  const r = tool ? await tool.execute({ code: 'import numpy; int(numpy.arange(3).sum())', disk: false }, {}) : null;
  return { before: before.includes('run_python'), after: !!tool, output: r && r.output };
});
console.log(JSON.stringify(out));
await b.close();
