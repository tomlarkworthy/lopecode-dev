import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1000}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 300)); });
p.on("pageerror", e => errs.push("pageerror: " + (e.stack ?? e.message).slice(0, 500)));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(9000);
console.log("has qa div:", await p.evaluate(() =>
  [...document.querySelectorAll("div")].filter((d: any) => d.qa).length));
console.log("body text:", (await p.evaluate(() => document.body.innerText)).slice(0, 400));
console.log("---- errors");
for (const e of errs.slice(0, 8)) console.log(e);
await b.close();
