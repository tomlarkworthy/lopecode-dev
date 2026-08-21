import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const errs = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-duel))");
await p.waitForTimeout(12000);
const info = await p.evaluate(() => {
  const root = [...document.querySelectorAll("div")].find(e => e.duel);
  const hud = [...document.querySelectorAll("div")].find(e => /\d+\.\d+s \/ \d+s/.test(e.textContent) && e.children.length < 6);
  return {hasDuel: !!root, outcome: root?.duel?.outcome ?? "playing",
          t: +(root?.duel?.world?.t ?? 0).toFixed(1),
          aLive: root?.duel?.a?.live?.length, bLive: root?.duel?.b?.live?.length,
          hud: hud?.textContent?.trim().slice(0, 60),
          svgs: document.querySelectorAll("svg").length,
          selects: [...document.querySelectorAll("select")].map(s => s.options.length),
          groups: [...document.querySelectorAll("optgroup")].map(g => g.label),
          firstOpts: [...(document.querySelector("select")?.options ?? [])].slice(20, 24).map(o => o.text)};
});
console.log(JSON.stringify(info));
await p.waitForTimeout(4000);
await p.screenshot({ path: "tools/screenshots/duel.png" });
console.log("after 4s:", JSON.stringify(await p.evaluate(() => {
  const r = [...document.querySelectorAll("div")].find(e => e.duel);
  return {t: +r.duel.world.t.toFixed(1), outcome: r.duel.outcome, a: r.duel.a.live.length, b: r.duel.b.live.length};
})));
console.log("errors:", errs.slice(0, 5));
await b.close();
