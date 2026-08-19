// Play mission 1 through the real DOM: pick the core, drop it in the envelope,
// press play, and check the mission reports a win.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1500,height:1200}});
const errs = [];
p.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://"+process.cwd()+"/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => [...document.querySelectorAll("button")]
  .some(b => /Brain/.test(b.textContent)), {timeout:60000});
await p.waitForTimeout(1500);

const click = async (re) => {
  const el = await p.locator("button", {hasText: re}).first();
  await el.click(); await p.waitForTimeout(400);
};
await click(/Brain/);
// the build envelope renders as a dashed rect; click its centre
const box = await p.evaluate(() => {
  const r = [...document.querySelectorAll("rect")]
    .find(r => r.getAttribute("stroke-dasharray"));
  if (!r) return null;
  const b = r.getBoundingClientRect();
  return {x: b.x + b.width/2, y: b.y + b.height/2};
});
console.log("envelope cell:", JSON.stringify(box));
if (box) { await p.mouse.click(box.x, box.y); await p.waitForTimeout(600); }
await click(/play/);
await p.waitForTimeout(4000);
const after = await p.evaluate(() => ({
  text: document.body.innerText.match(/\d\/9[\s\S]{0,300}/)?.[0] ?? "",
  buttons: [...document.querySelectorAll("button")].map(b=>b.textContent.trim())
             .filter(t=>t && t.length<24).slice(0,12)
}));
console.log(JSON.stringify(after, null, 1));
console.log("console errors:", errs.slice(0, 8));
await p.screenshot({path:"tools/screenshots/cp-game-play.png"});
await b.close();
