// A wall of Armour, drawn by the real shipNode, so a change to the art can be
// judged on the thing the design cares about: whether plates abut and whether the
// seams read. Also a Brain in the middle, because "not enough to compete with a
// Brain sitting next to it" is a claim about the pair.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1200, height: 900}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-shipyard))");
await p.waitForTimeout(13000);
const tag = process.argv[2] ?? "before";
await p.evaluate((r) => { (window as any).__armourR = r; }, Number(process.argv[3] ?? 2));
const out = await p.evaluate(() => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
  if (!el) return "no editor";
  const wall: any = {name: "wall", components: [], connections: []};
  const R = (window as any).__armourR ?? 2;
  for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++)
    wall.components.push({type: x === 0 && y === 0 ? "Brain" : "Armour", pos: [x, y]});
  el.editor.load(wall);
  return wall.components.length + " parts";
});
console.log(out);
await p.waitForTimeout(1500);
const zooms = Number(process.argv[4] ?? 0);
for (let i = 0; i < zooms; i++) {
  await p.evaluate(() => {
    const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
    const svg = el.editor.qa.svg(), r = svg.getBoundingClientRect();
    svg.dispatchEvent(new WheelEvent("wheel", {deltaY: -200, bubbles: true, cancelable: true,
      clientX: r.left + r.width / 2, clientY: r.top + r.height / 2}));
  });
  await p.waitForTimeout(200);
}
const svgEl = await p.evaluateHandle(() => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
  return el.editor.qa.svg();
});
await (svgEl as any).asElement().scrollIntoViewIfNeeded();
await p.waitForTimeout(600);
await (svgEl as any).asElement().screenshot({path: `tools/screenshots/armour-${tag}.png`});
console.log("errors:", errs.slice(0, 3));
await b.close();
