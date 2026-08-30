import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("file://"+process.cwd()+"/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-backdrops))");
await p.waitForTimeout(9000);
for (const k of ["facet","ring","banded","cratered","station"]) {
  await p.evaluate((k) => {
    const sel=[...document.querySelectorAll("select")].find(s=>s.options.length===6);
    const f=sel.closest("form");
    f.value=k; f.dispatchEvent(new Event("input",{bubbles:true}));
  }, k);
  await p.waitForTimeout(1300);
  const info = await p.evaluate(() => {
    const boxes=[...document.querySelectorAll("div")].filter(d=>d.style.position==="relative"&&d.querySelector(":scope > svg"));
    const box=boxes[3]; box.setAttribute("data-shot","k");
    return box.lastChild.textContent.replace(/\s+/g," ").trim();
  });
  const el = await p.$('[data-shot="k"]');
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  await el.screenshot({path:`tools/screenshots/bd-kind-${k}.png`});
  console.log(k.padEnd(9), info);
}
console.log("errors:", errs.length?errs.slice(0,4):"none");
await b.close();
