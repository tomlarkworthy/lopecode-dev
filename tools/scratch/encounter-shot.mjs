import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
const url = "file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-map))";
await p.goto(url);
await p.waitForTimeout(14000);
const root = p.locator("div").filter({ has: p.locator("[data-node]") }).first();
console.log("map present:", await p.locator("[data-node]").count(), "nodes");

// pick a reachable node, then JUMP
const reach = await p.evaluate(() => {
  const r = [...document.querySelectorAll("div")].find(e => e.value?.run);
  const S = r.value; return {at: S.at, scrap: S.scrap, hull: S.hull,
    edges: S.run.edges.filter(e => e.from === S.at).map(e => e.to),
    kinds: Object.fromEntries(S.run.nodes.map(n => [n.id, n.kind]))};
});
console.log("at", reach.at, "scrap", reach.scrap, "hull", reach.hull, "-> options",
            reach.edges.map(id => `${id}:${reach.kinds[id]}`).join(", "));
const target = reach.edges.find(id => ["duel","escort","infiltrate"].includes(reach.kinds[id])) ?? reach.edges[0];
console.log("chose", target, reach.kinds[target]);
await p.click(`[data-node="${target}"]`);
await p.waitForTimeout(400);
await p.click('[data-act="jump"]');
await p.waitForTimeout(2500);
// Playwright scrolls the page to reach the JUMP button at the bottom of the board;
// put the map back at the top before looking at the layer it opened.
await p.evaluate(() => {  // the pane scrolls, not the window
  for (const e of document.querySelectorAll("*")) if (e.scrollTop) e.scrollTop = 0;
  window.scrollTo(0, 0);
});
await p.screenshot({ path: "tools/screenshots/encounter-refit.png" });
const bench = await p.evaluate(() => {
  const t = document.body.innerText;
  return {hold: /HOLD[\s\S]{0,160}/.exec(t)?.[0].replace(/\n+/g, " ").slice(0, 150),
          launch: !!/LAUNCH/.test(t), editorSvgs: document.querySelectorAll("svg").length};
});
console.log("refit bench:", JSON.stringify(bench));
// launch into the battle
await p.getByRole("button", { name: /LAUNCH/ }).click();
await p.waitForTimeout(3000);
await p.evaluate(() => {  // the pane scrolls, not the window
  for (const e of document.querySelectorAll("*")) if (e.scrollTop) e.scrollTop = 0;
  window.scrollTo(0, 0);
});
await p.screenshot({ path: "tools/screenshots/encounter-battle.png" });
console.log("battle:", await p.evaluate(() => {
  const t = document.body.innerText;
  return {hdr: /battle[\s\S]{0,60}/.exec(t)?.[0].replace(/\n/g, " "),
          hud: /A \d+/.exec(t)?.[0], hint: /WASD[^\n]*/.exec(t)?.[0]};
}));
// drive it
await p.keyboard.down("w"); await p.waitForTimeout(1200); await p.keyboard.up("w");
console.log("after WASD:", await p.evaluate(() => {
  const r = [...document.querySelectorAll("div")].find(e => e.duel);
  const D = r?.duel; if (!D) return "no duel";
  return {t: +D.world.t.toFixed(1), speed: +Math.hypot(D.a.vx, D.a.vy).toFixed(2),
          cmd: JSON.stringify(D.cmd.a), control: D.control.a};
}));
await p.screenshot({ path: "tools/screenshots/encounter-drive.png" });
console.log("errors:", errs.slice(0, 6));
await b.close();
