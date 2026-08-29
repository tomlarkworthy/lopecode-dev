// Does the refit bench come up on the shared board, and does a drag place a part?
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1500, height: 1200}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 260)); });
p.on("pageerror", e => errs.push("pageerror: " + (e.stack ?? e.message).slice(0, 400)));
const which = process.argv[2] ?? "@tomlarkworthy/corepox-duel-encounter";
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  `#view=R100(S100(${which}))`);
await p.waitForTimeout(11000);
const chip = p.locator("[data-part]").first();
if (await chip.count()) await chip.scrollIntoViewIfNeeded();
await p.waitForTimeout(700);
await p.screenshot({path: `tools/screenshots/bench-${which.split("/")[1]}.png`});
console.log("data-part chips:", await p.locator("[data-part]").count());
console.log("text:", (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ").slice(0, 700));
console.log("---- errors"); for (const e of errs.slice(0, 6)) console.log(e);
await b.close();
