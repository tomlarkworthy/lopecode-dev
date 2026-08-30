// Our traced symbols, each on a tile grid with its anchor crossed, in the same
// layout as the sprite contact sheet built from the APK. Two pictures of the same
// component side by side is the only way to tell "the anchor is wrong" from "the
// trace is a different drawing".
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1500, height: 500}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-components))");
await p.waitForFunction(() => (window as any).__ojs_runtime != null, {timeout: 60000});
await p.waitForTimeout(4000);
const html = await p.evaluate(async () => {
  const rt: any = (window as any).__ojs_runtime;
  const mod = [...rt._modules.values()].find((m: any) =>
    [...m._scope.keys()].includes("SYMBOL_FOR"));
  const get = async (n: string) => await mod._scope.get(n)._promise;
  const SYMBOL_FOR = await get("SYMBOL_FOR"), SYMBOLS = await get("SYMBOLS");
  const sheet = await get("symbolSheet"), TILE = await get("TILE");
  const out: string[] = [];
  for (const [type, [name, ax, ay]] of Object.entries<any>(SYMBOL_FOR)) {
    const [w, h] = SYMBOLS[name];
    const lines: string[] = [];
    for (let k = -6; k <= 6; k++) {
      const x = ax + (k + 0.5) * TILE, y = ay + (k + 0.5) * TILE;
      lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#50dc8c" stroke-opacity=".6"/>`);
      lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#50dc8c" stroke-opacity=".6"/>`);
    }
    const scale = 260 / Math.max(w, h);
    out.push(`<figure><figcaption>${type} ${name} ${w}x${h}</figcaption>
      <svg width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}">
        <rect width="${w}" height="${h}" fill="#12161e"/>
        <use href="#cp-${name}"/>${lines.join("")}
        <path d="M${ax - 14} ${ay}h28M${ax} ${ay - 14}v28" stroke="#ff4040" stroke-width="4"/>
      </svg></figure>`);
  }
  document.body.innerHTML =
    `<style>body{background:#0a0c10;color:#ddd;font:12px monospace;margin:0;display:flex;flex-wrap:wrap;gap:8px}
     figure{margin:0}figcaption{padding:3px}</style>` + out.join("") + sheet.outerHTML;
  (document.querySelector("svg[style]") as any)?.setAttribute("style", "display:none");
  return document.body.scrollHeight;
});
await p.setViewportSize({width: 1500, height: Math.max(500, html)});
await p.screenshot({path: "tools/screenshots/corepox-symbols.png"});
console.log("height", html);
await b.close();
