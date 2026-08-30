import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await p.goto("file://" + process.cwd() + "/tools/scratch/map-preview.html");
await p.waitForTimeout(700);
await p.screenshot({ path: "tools/screenshots/corepox-map.png" });
await b.close();
console.log("shot");
