// How big is the thing the player is supposed to click? "I don't know how to place
// a component" is a report about a target, so measure the target -- which since the
// UI was rebuilt on the shipped flow (2026-08-20) is a GHOST of the real component,
// and only appears after the wrench and a build row. Missions with nothing in stock
// report 0 cells, and that is correct: there is nothing to place.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});

const rows: any[] = [];
for (let i = 0; i < 9; i++) {
  await p.selectOption("select", String(i));
  await p.waitForTimeout(900);
  const wrench = p.locator('button[title="build"]');
  if (await wrench.count()) {
    await wrench.first().click(); await p.waitForTimeout(250);
    const row = p.locator('div[style*="border:1.5px solid #ff6b5a"]');
    if (await row.count()) { await row.first().click(); await p.waitForTimeout(400); }
    else await p.locator("button", {hasText: /CANCEL/}).first().click();
  }
  const r = await p.evaluate(() => {
    // lopepage chrome has its own icon svgs and there is a 0-child 1280x900 one;
    // the battlefield is the only svg with a numeric viewBox and real children
    const svg = [...document.querySelectorAll("svg")].filter(s =>
      s.getAttribute("viewBox") && s.children.length > 2 && s.getBoundingClientRect().width > 200)
      .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0] as SVGSVGElement;
    const box = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const scale = box.width / vb.width;                 // px per viewBox unit
    // dashed envelope cells are the only stroke-dasharray="8 7" rects
    const cells = [...svg.querySelectorAll('rect[stroke-dasharray="7 6"]')]
      .map(e => (e as SVGRectElement).getBoundingClientRect());
    const title = (document.body.innerText.match(/\d\/9\n(.*)/) ?? [,""])[1].trim();
    return {title, w: Math.round(box.width), h: Math.round(box.height),
            span: +(vb.width).toFixed(0), scale,
            n: cells.length,
            px: cells.length ? Math.round(cells[0].width) : 0,
            frac: cells.length ? +(cells[0].width / box.width * 100).toFixed(1) : 0};
  });
  rows.push({i: i + 1, ...r});
}
console.log("mission                 svg px    cells   cell px   % of width");
for (const r of rows)
  console.log(`${String(r.i).padStart(2)}. ${r.title.padEnd(18)} ${String(r.w).padStart(5)}x${r.h}` +
              `  ${String(r.n).padStart(4)}  ${String(r.px).padStart(7)}px  ${String(r.frac).padStart(7)}%`);
await b.close();
