import {chromium} from "playwright";
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:1100}});
const errs=[];
p.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: "+e.message));
await p.goto("file://"+process.cwd()+"/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-components))");
await p.waitForFunction(() => document.body.innerText.includes("Corepox components"), {timeout:45000}).catch(()=>{});
await p.waitForTimeout(6000);
const info = await p.evaluate(() => {
  const svgs=[...document.querySelectorAll("svg")].filter(s=>s.querySelector("rect"));
  return {text: document.body.innerText.slice(0,200), svgs: svgs.length,
          joints: document.querySelectorAll("circle[fill='#5ef2a0']").length,
          buttons: [...document.querySelectorAll("button")].map(b=>b.textContent).slice(0,6)};
});
console.log(JSON.stringify(info,null,1));
console.log("errors:", errs.slice(0,6));
await p.screenshot({path:"tools/screenshots/cp-module.png", fullPage:false});
await b.close();
