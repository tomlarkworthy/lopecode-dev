// Every component drawn at its anchor on a tile grid, next to its footprint. The
// campaign screenshots show art in a crowd; this shows one part at a time, which is
// what an anchor bug looks like when it is not hiding behind a neighbour.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 2600}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-components))");
await p.waitForTimeout(6000);
await p.screenshot({path: "tools/screenshots/corepox-components.png", fullPage: true});
console.log(await p.evaluate(() => document.body.innerText.slice(0, 300)));
await b.close();
