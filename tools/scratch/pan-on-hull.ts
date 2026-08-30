// Where does a drag pan, and where does it not? The camera probe's "drag pans"
// step fails on mission `run` and passes on `birthing`, and the difference between
// those two is whether anything is under the middle of the screen.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1200, height: 900}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-duel-encounter))");
await p.waitForTimeout(14000);
await p.waitForTimeout(1500);
const qa = async () => (await p.evaluateHandle(() => {
  const d: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
  return d.editor.qa.svg();
}) as any).asElement();
const vb = () => p.evaluate(() => {
  const d: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
  const v = d.editor.qa.svg().viewBox.baseVal;
  return [Math.round(v.x), Math.round(v.y)];
});
const el0 = await qa();
await el0.scrollIntoViewIfNeeded();
await p.waitForTimeout(600);
const r = (await el0.boundingBox())!;
// Where the hull actually is on screen, from the board's own tile map.
const hull = await p.evaluate(() => {
  const d: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
  const q = d.editor.qa, s = q.session().player;
  const c = s.comps[0];
  if (!c) return {x: 0, y: 0, n: 0};
  const v = q.tileToView(c.px, c.py);
  const svg = q.svg(), rr = svg.getBoundingClientRect(), b = svg.viewBox.baseVal;
  return {x: rr.left + (v[0] - b.x) / b.width * rr.width,
          y: rr.top + (v[1] - b.y) / b.height * rr.height, n: s.comps.length};
});
const drag = async (x: number, y: number) => {
  const a = await vb();
  await p.mouse.move(x, y); await p.mouse.down();
  await p.mouse.move(x - 180, y, {steps: 8});
  await p.mouse.up(); await p.waitForTimeout(400);
  const c = await vb();
  return Math.abs(c[0] - a[0]);
};
console.log("parts", hull.n, "hull at", Math.round(hull.x), Math.round(hull.y),
            "centre", Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
console.log("drag starting ON a component  panned", await drag(hull.x, hull.y), "units");
console.log("drag starting on empty sky    panned",
            await drag(r.x + r.width * 0.12, r.y + r.height * 0.85), "units");
await b.close();
