// What colour is a wire actually painted? The shot could not separate a
// recoloured clone from art_Binary's own purple circles, so ask the DOM.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1100, height: 800}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-render#demo))");
await p.waitForTimeout(8000);
console.log(await p.evaluate(() => {
  const out: string[] = [];
  const svgs = [...document.querySelectorAll("svg")];
  out.push("svgs: " + svgs.map(s => s.querySelectorAll("path").length).join(","));
  const svg = svgs.sort((a,b)=>b.querySelectorAll("path").length-a.querySelectorAll("path").length)[0];
  const paths = [...svg.querySelectorAll("path")];
  const seen = new Map<string, number>();
  for (const q of paths) {
    const s = getComputedStyle(q).stroke;
    seen.set(s, (seen.get(s) ?? 0) + 1);
  }
  out.push("stroke tally: " + JSON.stringify([...seen]));
  const uses = svg.querySelectorAll("use");
  out.push("use elements: " + uses.length);
  // any group whose transform has the wire signature (rotate + scale + translate -9)
  const gs = [...svg.querySelectorAll("g")].filter(g =>
    (g.getAttribute("transform") ?? "").includes("scale") &&
    (g.getAttribute("transform") ?? "").includes("rotate"));
  out.push("wire-shaped groups: " + gs.length);
  for (const g of gs.slice(0, 4))
    out.push("  " + g.getAttribute("transform") + " kids=" + g.children.length +
      " colors=" + [...g.children].map(k => (k as HTMLElement).style.color || "-").join("|"));
  return out.join("\n");
}));
await b.close();

