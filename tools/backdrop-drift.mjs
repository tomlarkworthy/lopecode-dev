import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1400,height:900}});
await p.goto("file://"+process.cwd()+"/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-backdrops))");
await p.waitForTimeout(9000);
const read = () => p.evaluate(() => {
  const boxes=[...document.querySelectorAll("div")].filter(d=>d.style.position==="relative"&&d.querySelector(":scope > svg"));
  return [...boxes[2].querySelectorAll(":scope > svg > g > g")].map(g=>g.getAttribute("transform"));
});
const t1 = await read(); await p.waitForTimeout(900); const t2 = await read();
console.log("parallax layer transforms t1:", t1);
console.log("                          t2:", t2);
console.log("moved:", JSON.stringify(t1)!==JSON.stringify(t2), "| distinct rates:", new Set(t2).size, "of", t2.length);
await b.close();
