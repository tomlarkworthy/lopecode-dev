import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
const errs = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-map))");
await p.waitForTimeout(9000);
const reachable = await p.evaluate(() => {
  // the reachable ring is the animated halo; find node ids the panel will accept
  const hits = [...document.querySelectorAll("circle.cpm-node")];
  return hits.map(h => h.dataset.node);
});
// click each until the JUMP button turns live
let jumped = null;
for (const id of reachable) {
  await p.click(`circle.cpm-node[data-node="${id}"]`, { force: true });
  const live = await p.evaluate(() => {
    const j = document.querySelector("[data-act=jump]");
    return j ? j.style.cursor === "pointer" : false;
  });
  if (live) { jumped = id; break; }
}
await p.screenshot({ path: "tools/screenshots/corepox-map-inbook.png" });
const before = await p.evaluate(() => document.querySelector("[data-act=jump]") && document.querySelectorAll("text").length);
await p.click("[data-act=jump]", { force: true });
await p.waitForTimeout(500);
const after = await p.evaluate(() => {
  const here = [...document.querySelectorAll("text")].find(t => t.textContent === "YOU ARE HERE");
  return { movedTo: here ? `${here.getAttribute("x")},${here.getAttribute("y")}` : null,
           hull: document.body.innerText.match(/HULL (\d+)%/)?.[1] };
});
console.log("selected", jumped, "after jump", JSON.stringify(after), "errors", errs.slice(0, 5));
await p.screenshot({ path: "tools/screenshots/corepox-map-inbook-jumped.png" });
await b.close();
