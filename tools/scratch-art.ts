import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 900, height: 700}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-assets))");
await p.waitForTimeout(6000);
console.log(await p.evaluate(() => {
  const ns = "http://www.w3.org/2000/svg";
  const host = document.createElementNS(ns, "svg");
  host.setAttribute("viewBox", "0 0 400 400"); document.body.appendChild(host);
  const dump = (id: string) => {
    const sym = document.querySelector("#cp-" + id) as SVGSymbolElement;
    if (!sym) return id + ": missing";
    const rows = [...sym.children].map((k, i) => {
      const c = k.cloneNode(true) as SVGGraphicsElement;
      host.appendChild(c); const bb = c.getBBox(); host.removeChild(c);
      return `  ${i} <${k.tagName}> ${bb.x.toFixed(1)},${bb.y.toFixed(1)} ` +
             `${bb.width.toFixed(1)}x${bb.height.toFixed(1)} stroke=${k.getAttribute("stroke") ?? "-"}`;
    });
    return id + ":\n" + rows.join("\n");
  };
  return ["binary", "engine-3", "lazer-2", "radar"].map(dump).join("\n");
}));
await b.close();
