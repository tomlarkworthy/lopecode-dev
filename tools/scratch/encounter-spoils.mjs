import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-map))");
await p.waitForTimeout(14000);
const S0 = await p.evaluate(() => {
  const r = [...document.querySelectorAll("div")].find(e => e.value?.run); const v = r.value;
  return {at: v.at, scrap: v.scrap, hull: v.hull, parts: v.campaign.parts,
          edges: v.run.edges.filter(e => e.from === v.at).map(e => e.to),
          kinds: Object.fromEntries(v.run.nodes.map(n => [n.id, n.kind]))};
});
const target = S0.edges.find(id => !["duel","escort","infiltrate","boss"].includes(S0.kinds[id]));
console.log("before:", JSON.stringify({at: S0.at, scrap: S0.scrap, hull: S0.hull, parts: S0.parts}));
console.log("jumping to", target, S0.kinds[target], "(no battle at this kind)");
await p.click(`[data-node="${target}"]`); await p.waitForTimeout(300);
await p.click('[data-act="jump"]'); await p.waitForTimeout(1500);
await p.getByRole("button", { name: /LAUNCH/ }).click();
await p.waitForTimeout(1500);
await p.screenshot({ path: "tools/screenshots/encounter-spoils.png" });
console.log("spoils panel:", (await p.evaluate(() => document.body.innerText))
  .split("\n").filter(l => /WIN|LOSS|scrap|hull|spoils/i.test(l)).slice(0, 6).join(" | "));
await p.getByRole("button", { name: /back to the map|the run ends|^close$/ }).click();
await p.waitForTimeout(800);
const S1 = await p.evaluate(() => {
  const r = [...document.querySelectorAll("div")].find(e => e.value?.run); const v = r.value;
  return {at: v.at, scrap: v.scrap, hull: v.hull, parts: v.campaign.parts, visited: v.visited, log: v.campaign.log};
});
console.log("after: ", JSON.stringify({at: S1.at, scrap: S1.scrap, hull: S1.hull, parts: S1.parts}));
console.log("log:   ", JSON.stringify(S1.log));
await p.screenshot({ path: "tools/screenshots/encounter-map-after.png" });
console.log("errors:", errs.slice(0, 6));
await b.close();
