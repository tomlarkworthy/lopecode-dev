// Jump to a combat mission and let it run, to see enemies, beams and objectives
// on screen rather than only in the headless harness.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1500,height:1200}});
const errs = [];
p.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://"+process.cwd()+"/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => document.body.innerText.includes("1/9"), {timeout:60000});
await p.waitForTimeout(1500);
const which = process.argv[2] ?? "Aim";
await p.selectOption("select", {label: (await p.evaluate((w) =>
  [...document.querySelector("select").options].find(o => o.text.endsWith(w)).text, which))});
await p.waitForTimeout(1200);
await p.locator('button[title="play"]').first().click();
await p.waitForTimeout(Number(process.argv[3] ?? 12000));
console.log(await p.evaluate(() => document.body.innerText.match(/\d\/9[\s\S]{0,220}/)?.[0]));
console.log("console errors:", errs.slice(0, 8));
await p.screenshot({path:`tools/screenshots/cp-game-${which.toLowerCase().replace(/\s/g,"")}.png`});
await b.close();
