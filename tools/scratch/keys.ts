import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 900}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-board))");
await p.waitForFunction(() => !!(window as any).__ojs_runtime, {timeout: 60000});
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => [...(window as any).__ojs_runtime.mains.keys()]));
await b.close();
