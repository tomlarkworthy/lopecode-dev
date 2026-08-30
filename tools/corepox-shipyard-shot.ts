// The shipyard, driven the way a person drives it: pick a part, click a cell,
// wire two of them. A screenshot alone would not tell you the clicks land, and
// the click->cell map is the piece most likely to be a tile out.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-shipyard))");
await p.waitForFunction(() => document.body.innerText.includes("parts"), {timeout: 60000});
await p.waitForTimeout(1500);

const qa = () => p.evaluateHandle(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-shipyard");
  for (const [k, v] of m._scope) if (k === "viewof shipDesign") return (v as any)._value.qa;
});
const clickTile = async (px: number, py: number) => {
  const h = await qa();
  await p.evaluate((q: any) => q.svg().scrollIntoView({block: "center"}), h);
  await p.waitForTimeout(150);
  const c = await p.evaluate(([q, px, py]: any) => {
    const [vx, vy] = q.tileToView(px, py);
    const svg = q.svg(), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    return {x: r.left + (vx - vb.x) / vb.width * r.width,
            y: r.top + (vy - vb.y) / vb.height * r.height};
  }, [h, px, py] as any);
  await p.mouse.click(c.x, c.y); await p.waitForTimeout(200);
};
const parts = () => p.evaluate(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-shipyard");
  for (const [k, v] of m._scope) if (k === "shipDesign")
    return {c: (v as any)._value.components.length, w: (v as any)._value.connections.length};
});
const before = await parts();
await p.locator("button", {hasText: /^Engine$/}).first().click();
// A cell the board OFFERS -- manualAim's Constant sits at 0,0 and its Brain at
// 1,0, so 0,-1 is free and touching. Clicking a cell it does not offer is
// declined, which is the point of the affordance.
await clickTile(0, -1);
const afterBuild = await parts();

// Wire it. A connector belongs to a CELL, not to an anchor, so the test asks the
// editor where they are rather than assuming the anchor carries them.
await p.locator("button", {hasText: /^connect$/}).first().click();
await p.waitForTimeout(300);
const ports = await p.evaluate((q: any) => q.ports(), await qa());
const out = ports.find((q: any) => q.kind === "out" && q.type === "Constant");
const inn = ports.find((q: any) => q.kind === "in" && q.type === "Engine");
if (!out || !inn) { console.log("FAIL: no Constant out / Engine in to wire", ports); process.exit(1); }
await clickTile(out.px, out.py);
await clickTile(inn.px, inn.py);
const afterWire = await parts();
await p.screenshot({path: "tools/screenshots/corepox-shipyard.png"});
console.log("parts", JSON.stringify(before), "->", JSON.stringify(afterBuild),
            "-> wired", JSON.stringify(afterWire));
console.log("errors:", errs.slice(0, 5));
await b.close();
if (!afterBuild || !before || afterBuild.c !== before.c + 1) {
  console.log("FAIL: clicking a cell did not add a part");
  process.exit(1);
}
if (!afterWire || afterWire.w !== afterBuild.w + 1) {
  console.log("FAIL: clicking an output then an input did not add a wire");
  process.exit(1);
}
console.log("PASS: a click places a part, and out->in wires it");
