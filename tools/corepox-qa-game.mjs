import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1500,height:1100}});
const errs = [];
p.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://"+process.cwd()+"/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /Corepox|core|mission/i.test(document.body.innerText),
  {timeout:60000}).catch(()=>{});
await p.waitForTimeout(8000);
const info = await p.evaluate(() => ({
  text: document.body.innerText.slice(0, 400),
  buttons: [...document.querySelectorAll("button")].map(b => b.textContent.trim()).slice(0, 14),
  svgs: document.querySelectorAll("svg").length,
  canvases: document.querySelectorAll("canvas").length
}));
console.log(JSON.stringify(info, null, 1));
console.log("console errors:", errs.slice(0, 8));
await p.screenshot({path:"tools/screenshots/cp-game.png"});
await b.close();
