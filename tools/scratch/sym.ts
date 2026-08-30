import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 900, height: 380}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-assets))");
await p.waitForTimeout(6000);
const info = await p.evaluate((ids: string[]) => ids.map(id => {
  const el = document.getElementById(id) as any;
  if (!el) return {id, missing: true};
  const vb = el.getAttribute("viewBox");
  return {id, vb, kids: el.children.length, html: el.outerHTML.length};
}), ["cp-orb", "cp-energy-store-2"]);
console.log(info);
// draw them side by side
await p.evaluate((ids: string[]) => {
  const box = document.createElement("div");
  box.id = "probe";
  box.style.cssText = "position:fixed;inset:0;background:#000;z-index:99999;display:flex;gap:20px;padding:20px";
  for (const id of ids) {
    const el = document.getElementById(id) as any;
    if (!el) continue;
    const vb = el.getAttribute("viewBox") ?? "0 0 100 100";
    box.insertAdjacentHTML("beforeend",
      `<div style="color:#8f8;font:12px monospace">${id}<br>${vb}
       <svg width="300" height="300" viewBox="${vb}"><use href="#${id}"/></svg></div>`);
  }
  document.body.append(box);
}, ["cp-orb", "cp-energy-store-2"]);
await p.waitForTimeout(400);
await p.screenshot({path: "tools/screenshots/orb-symbols.png"});
await b.close();
