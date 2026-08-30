// The wires, on their own. corepox-shots.ts photographs a mission, where at most
// one connection exists; SEEKER has ten and is the only view that shows what a
// dataflow graph looks like on a hull.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1100, height: 800}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-render#demo))");
await p.waitForTimeout(8000);
const out = process.argv[2] ?? "tools/screenshots/corepox-wires.png";
const el = await p.locator("svg").last();
await el.screenshot({path: out});
console.log(out);
await b.close();
