// How a player rotates a part on the turn-9 board: tap it, then press ⟳ ROTATE in
// the anchored verb bar. No mode, no keyboard shortcut.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1000}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-map))");
await p.waitForTimeout(14000);
await p.click('[data-node="n1-1"]'); await p.waitForTimeout(300);
await p.click('[data-act="jump"]'); await p.waitForTimeout(2600);

const dirs = () => p.evaluate(() => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
  return (el.value.components ?? []).map((c: any) => `${c.type}@${c.pos}:${c.dir ?? "up"}`).join(" ");
});
const tap = async (px: number, py: number) => {
  const pt = await p.evaluate(([x, y]: any) => {
    const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
    const q = el.editor.qa, v = q.tileToView(x, y);
    const svg = q.svg(), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    return {x: r.left + (v[0] - vb.x) / vb.width * r.width,
            y: r.top + (v[1] - vb.y) / vb.height * r.height};
  }, [px, py]);
  await p.mouse.click(pt.x, pt.y);
  await p.waitForTimeout(350);
};
console.log("before        ", await dirs());
await tap(0, -1);                                    // the Engine
console.log("verbs offered ", await p.locator("[data-verb]").evaluateAll(
  (ns: any[]) => ns.map(n => n.dataset.verb).join(" ")));
for (let i = 1; i <= 4; i++) {
  await p.click('[data-verb="rotate"]');
  await p.waitForTimeout(300);
  console.log(`press ${i}       `, await dirs());
}
const bx = await p.locator("[data-verb]").first().boundingBox();
if (bx) await p.screenshot({path: "tools/screenshots/verb-rotate.png",
  clip: {x: Math.max(0, bx.x - 220), y: Math.max(0, bx.y - 60), width: 620, height: 300}});
await b.close();
