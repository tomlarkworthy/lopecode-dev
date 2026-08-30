import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("file://"+process.cwd()+"/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-backdrops))");
await p.waitForTimeout(9000);
const n = await p.evaluate(() => {
  window.__boxes = [...document.querySelectorAll("div")].filter(d =>
    d.style.position === "relative" && d.querySelector(":scope > svg"));
  window.__boxes.forEach((d,i)=>d.setAttribute("data-shot", "box"+i));
  return window.__boxes.map(d => d.querySelector("svg").querySelectorAll("*").length);
});
console.log("preview boxes:", n, "| errors:", errs.length?errs:"none");
const names = ["sky","stars","parallax","body","composite"];
for (let i=0;i<n.length;i++){
  const el = await p.$(`[data-shot="box${i}"]`);
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(250);
  await el.screenshot({path:`tools/screenshots/bd-${names[i]||i}.png`});
}
await b.close();
