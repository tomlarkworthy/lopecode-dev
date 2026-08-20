// Where is the barrel hinged, and where is the dome? Tom, 2026-08-20: "the turret
// is still not based on the right part". Measured in symbol units against the
// anchor SYMBOL_FOR declares, so the answer is a number and not an impression.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1100, height: 800}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-render#demo))");
await p.waitForTimeout(8000);
console.log(await p.evaluate(() => {
  const out: string[] = [];
  const box = (id: string) => {
    const s = document.getElementById(id) as any;
    if (!s) return id + ": absent";
    const host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    host.setAttribute("viewBox", s.getAttribute("viewBox"));
    host.style.cssText = "position:absolute;left:-9999px;width:400px";
    const u = document.createElementNS("http://www.w3.org/2000/svg", "use");
    u.setAttribute("href", "#" + id);
    host.appendChild(u); document.body.appendChild(host);
    const r = (u as any).getBBox();
    document.body.removeChild(host);
    return `${id.padEnd(18)} vb ${s.getAttribute("viewBox")}  bbox ` +
      [r.x, r.y, r.width, r.height].map((v: number) => v.toFixed(1)).join(", ");
  };
  out.push(box("cp-turret2"));
  out.push(box("cp-turret2-base"));
  out.push(box("cp-turret2-barrel"));
  out.push(box("cp-radar"));
  return out.join("\n");
}));
await b.close();
