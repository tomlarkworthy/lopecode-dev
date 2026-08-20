import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1200, height: 900}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(12000);
console.log(JSON.stringify((await p.evaluate(() => document.body.innerText)).slice(0, 400)));
console.log([...new Set(errs)].slice(0, 8).join("\n"));
await b.close();
