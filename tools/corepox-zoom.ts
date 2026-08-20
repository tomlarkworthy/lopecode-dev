// Wheel zoom on every board that is built on battlefield, measured rather than
// looked at: the viewBox width before and after a wheel event, on each surface,
// plus the check that matters for the editors -- a tile the board draws must
// still be where the board says it is after a zoom, or every click lands wrong.
import {chromium} from "playwright";

const PAGES: [string, string][] = [
  ["game", "@tomlarkworthy/corepox-game"],
  ["shipyard", "@tomlarkworthy/corepox-shipyard"],
  ["lab", "@tomlarkworthy/corepox-lab"]
];
const b = await chromium.launch();
let bad = 0;
for (const [name, mod] of PAGES) {
  const p = await b.newPage({viewport: {width: 1300, height: 950}});
  const errs: string[] = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + process.cwd() +
    `/lopebooks/notebooks/corepox.html#view=R100(S100(${mod}))`);
  await p.waitForFunction(() => !!document.querySelector("svg[viewBox]"), {timeout: 60000});
  // A mission's intro cutscene covers the board (corepox-game `cutscene`), so a
  // tool that drives the board has to get past it the way a player does.
  const skipIntro = async () => {
    for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
      await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
    }
  };
  await skipIntro();
  await p.waitForTimeout(4000);
  // The first mission starts with an EMPTY ship; pick one that has something on
  // the board so the test also covers the ordinary framed case.
  const sel = p.locator("select").first();
  if (await sel.count()) { await sel.selectOption({index: 3}); await p.waitForTimeout(1200); }
  // the first board with a starfield in it: every battlefield has one, and the
  // component editors in other modules do not
  const box = await p.evaluate(() => {
    const svg = [...document.querySelectorAll("svg")].find(s => s.querySelector("g circle"));
    if (!svg) return null;
    svg.scrollIntoView({block: "center"});
    const r = svg.getBoundingClientRect();
    return {w: svg.viewBox.baseVal.width, x: r.left + r.width / 2, y: r.top + r.height / 2};
  });
  if (!box) { console.log(`${name.padEnd(9)} FAIL: no board found`); bad++; await p.close(); continue; }
  await p.mouse.move(box.x, box.y);
  await p.mouse.wheel(0, -600);                      // in
  await p.waitForTimeout(700);
  const inW = await p.evaluate(() => [...document.querySelectorAll("svg")]
    .find(s => s.querySelector("g circle"))!.viewBox.baseVal.width);
  await p.mouse.wheel(0, 1200);                      // back out past the start
  await p.waitForTimeout(700);
  const outW = await p.evaluate(() => [...document.querySelectorAll("svg")]
    .find(s => s.querySelector("g circle"))!.viewBox.baseVal.width);
  const ok = inW < box.w * 0.95 && outW > inW * 1.5;
  if (!ok || errs.length) bad++;
  console.log(`${name.padEnd(9)} viewBox ${box.w.toFixed(0)} -> in ${inW.toFixed(0)} ` +
    `-> out ${outW.toFixed(0)}   ${ok ? "ok" : "FAIL"}${errs.length ? "  errors: " + errs[0] : ""}`);
  await p.close();
}

// The regression that actually costs you: every editor turns a click into a tile
// through the live viewBox, so a zoom that the click map does not follow puts the
// hit a cell out and nothing says so.
{
  const p = await b.newPage({viewport: {width: 1300, height: 950}});
  await p.goto("file://" + process.cwd() +
    "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-shipyard))");
  await p.waitForFunction(() => document.body.innerText.includes("parts"), {timeout: 60000});
  await p.waitForTimeout(2500);
  const qa = await p.evaluateHandle(() => {
    const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-shipyard");
    for (const [k, v] of m._scope) if (k === "viewof shipDesign") return (v as any)._value.qa;
  });
  await p.evaluate((q: any) => q.svg().scrollIntoView({block: "center"}), qa);
  await p.waitForTimeout(200);
  const mid = await p.evaluate((q: any) => { const r = q.svg().getBoundingClientRect();
    return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }, qa);
  await p.mouse.move(mid.x, mid.y);
  await p.mouse.wheel(0, -500);
  await p.waitForTimeout(700);
  await p.locator("button", {hasText: /^Armour$/}).first().click();
  const c = await p.evaluate((q: any) => {
    const [vx, vy] = q.tileToView(0, -1);
    const svg = q.svg(), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    return {x: r.left + (vx - vb.x) / vb.width * r.width,
            y: r.top + (vy - vb.y) / vb.height * r.height};
  }, qa);
  await p.mouse.click(c.x, c.y);
  await p.waitForTimeout(300);
  const got = await p.evaluate((q: any) => q.ship().comps
    .filter((x: any) => x.type === "Armour").map((x: any) => [x.px, x.py]), qa);
  const hit = got.some((t: number[]) => t[0] === 0 && t[1] === -1);
  console.log(`\nclick after zoom  Armour at ${JSON.stringify(got)}  wanted [0,-1]  ` +
              `${hit ? "ok" : "FAIL"}`);
  if (!hit) bad++;
  await p.close();
}

await b.close();
console.log(bad ? `\n${bad} check(s) failed`
                : `\nall ${PAGES.length} boards zoom, and a click still lands on the tile it aimed at`);
if (bad) process.exit(1);
