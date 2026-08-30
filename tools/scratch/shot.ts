import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1000}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
await p.selectOption("select", String(Number(process.argv[2] ?? 7)));
await p.waitForTimeout(2500);
await p.screenshot({path: process.argv[3] ?? "tools/screenshots/orb.png"});
await b.close();
