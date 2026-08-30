import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1500,height:1200}});
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
p.on("console",m=>{if(m.type()==="error")errs.push(m.text().slice(0,200));});
await p.goto("file://"+process.cwd()+"/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-backdrops))");
await p.waitForTimeout(9000);
const r = await p.evaluate(() => {
  const bad=[...document.querySelectorAll(".observablehq--error,.observablehq--inspect.observablehq--error")]
    .map(e=>e.textContent.trim().slice(0,140));
  const svgs=[...document.querySelectorAll("svg")].map(s=>s.querySelectorAll("*").length).filter(n=>n>20);
  return {errors:bad, svgs, forms:document.querySelectorAll("form").length,
          buttons:[...document.querySelectorAll("button")].map(b=>b.textContent).slice(0,30)};
});
console.log("page errors:", errs.length?errs.slice(0,6):"none");
console.log("cell errors:", r.errors.length?r.errors:"none");
console.log("svg element counts:", r.svgs);
console.log("buttons:", r.buttons.join(" | "));
await p.screenshot({path:"tools/screenshots/backdrops-bench.png", fullPage:true});
await b.close();
