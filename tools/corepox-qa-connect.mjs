// Solve ConnectionLite the way a player does: connect mode, click the Constant's
// output connector, click the Engine's input connector, press play, reach the zone.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1500,height:1200}});
const errs = [];
p.on("console", m => { if (m.type()==="error") errs.push(m.text()); else if (m.text().startsWith("CP click")) console.log(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://"+process.cwd()+"/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => document.body.innerText.includes("1/9"), {timeout:60000});
await p.selectOption("select", {label: (await p.evaluate(() =>
  [...document.querySelector("select").options].find(o => o.text.endsWith("Wire")).text))});
await p.evaluate(() => window.CPDEBUG = 1);
await p.waitForTimeout(1200);

const conn = () => p.evaluate(() => [...document.querySelectorAll("circle")]
  .filter(c => /#5ef2a0|#8fd0ff/.test(c.getAttribute("stroke") ?? ""))
  .map(c => { const r = c.getBoundingClientRect();
    return {kind: c.getAttribute("stroke") === "#5ef2a0" ? "out" : "in",
            x: r.x + r.width/2, y: r.y + r.height/2}; }));

let ports = await conn();
console.log("connectors painted:", JSON.stringify(ports));
const out = ports.find(q => q.kind === "out"), inn = ports.find(q => q.kind === "in");
if (!out || !inn) { console.log("MISSING a connector"); await b.close(); process.exit(1); }
await p.mouse.click(out.x, out.y); await p.waitForTimeout(500);
console.log("after 1st click, wireFrom ring:", await p.evaluate(() =>
  document.querySelectorAll('circle[stroke="#f2c14e"]').length));
await p.mouse.click(inn.x, inn.y); await p.waitForTimeout(500);
console.log("wires now:", await p.evaluate(() =>
  document.querySelectorAll('line[stroke*="f2c14e"], path[stroke*="f2c14e"]').length));
console.log("after wiring:", await p.evaluate(() =>
  document.body.innerText.match(/connect [\s\S]{0,60}/)?.[0]));
await p.screenshot({path:"tools/screenshots/cp-game-connect.png"});
await p.locator('button[title="play"]').first().click();
await p.waitForTimeout(12000);
console.log(await p.evaluate(() => document.body.innerText.match(/\d\/9[\s\S]{0,200}/)?.[0]));
console.log("console errors:", errs.slice(0,6));
await p.screenshot({path:"tools/screenshots/cp-game-connect-done.png"});
await b.close();
